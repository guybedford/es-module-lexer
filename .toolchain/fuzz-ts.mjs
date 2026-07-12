// Differential fuzzer for the TypeScript type-only lexing surface.
//
// Oracle: Node's `module.stripTypeScriptTypes` (strip-only mode). For any
// snippet Node accepts as erasable TS, the runtime graph is exactly the imports
// and exports that survive stripping. We parse the stripped JS with
// es-module-lexer to get that ground truth, then parse the original TS with the
// same lexer.
//
// Properties checked on the original parse:
//   1. No crash / no thrown parse error where Node accepted the source.
//   2. Every runtime (`tp === false`) import the lexer reports has a specifier
//      that still exists after stripping (no leaked type-only edge), and every
//      runtime import that survives stripping is reported (no swallowed edge).
//   3. The same subset relationship, both directions, for runtime exports. This
//      catches a declaration skipper that runs past its terminator and eats the
//      following statement, not just a leaked `import(...)` type reference.
//
// Env:
//   FUZZ_ENGINE=asm   run against the asm.js build instead of Wasm.
//   IN_SCOPE=1        drop the forms Node strips but the lexer intentionally
//                     leaves to a full TS transform (value-position annotations)
//                     so every finding is a real in-scope divergence.
//   FORM=<name>       restrict generation to a single FORMS key (debugging).
//   MAX_FINDINGS=<n>  cap the printed findings (default 40).
//   NO_MINIMIZE=1     skip shrinking; print the raw generated source.
//
// Usage: node .toolchain/fuzz-ts.mjs [iterations] [seed]
import { stripTypeScriptTypes } from 'node:module';

const ENGINE = process.env.FUZZ_ENGINE === 'asm'
  ? '../dist/lexer.asm.js'
  : '../dist/lexer.js';
const mod = await import(new URL(ENGINE, import.meta.url).href);
if (mod.init) await mod.init;
const parse = mod.parse;

const IN_SCOPE = process.env.IN_SCOPE === '1';
const ONLY_FORM = process.env.FORM;
const iterations = Number(process.argv[2] ?? 20000);
const maxFindings = Number(process.env.MAX_FINDINGS ?? 40);
const minimize = process.env.NO_MINIMIZE !== '1';
let seed = Number(process.argv[3] ?? 0x1234abcd) >>> 0;
// xorshift32 for reproducible runs.
const rand = () => {
  seed ^= seed << 13; seed >>>= 0;
  seed ^= seed >> 17;
  seed ^= seed << 5; seed >>>= 0;
  return seed / 0xffffffff;
};
const pick = arr => arr[Math.floor(rand() * arr.length)];
const maybe = (p = 0.5) => rand() < p;

const SPEC = ["'m'", "'m2'", '"m3"', "'./x'"];
const NAME = ['A', 'B', 'Foo', 'type', 'from', 'as', 'x', 'y', '_z'];
const WS = ['', ' ', '  ', '\n', '\n ', ' /*c*/ ', '\t', '\n\n', '\n// c\n'];
const BETWEEN_STATEMENTS = ['\n', '\n\n', ' ', ';', ';\n', '\t'];
// Runtime statements dropped in after a TS form. A declaration skipper that
// overshoots its terminator swallows one of these, which the export/import
// oracle then flags. The regex and division cases also pin that the '/' after
// an erased type is still classified with the normal tokenizer rules.
const SENTINELS = [
  () => `export const ${pick(['y', 'runtimeExport', '_z'])} = 1;`,
  () => `export { ${pick(['A', 'B', 'Foo'])} };`,
  () => `export default ${pick(['1', 'x', 'function () {}'])};`,
  () => `import { ${pick(['A', 'B', 'Foo'])} } from 'runtime';`,
  () => `import 'runtime';`,
  () => `const dyn = import('runtime');`,
  () => `const re = /ab+c/g;`,
  () => `const q = a / b / c;`,
  () => `\`template \${x} tail\`;`,
  () => `class C {}`,
];
const w = () => pick(WS);
const requiredWs = () => w() || ' ';

// A string-literal type whose contents include the characters most likely to
// desync an opaque skipper: braces, backticks, quotes, slashes.
function stringLiteralType () {
  return pick([
    "'{'", "'}'", "'`'", '"${"', "'/*'", "'*/'", "'//'", "'a/b'", '"import(\'z\')"',
  ]);
}

function templateType (depth) {
  const one = () => typeExpr(depth);
  return pick([
    () => `\`\${${one()}}\``,
    () => `\`pre\${${one()}}\``,
    () => `\`\${${one()}}post\``,
    () => `\`pre\${${one()}}post\``,
    () => `\`\${${one()}}\${${one()}}\``,
    () => `\`pre\${${one()}}mid\${${one()}}post\``,
    () => `\`\${\`inner\${${one()}}\`}\``,
  ])();
}

// A type expression, biased to bury an import() and to exercise the RHS scanner.
function typeExpr (depth) {
  if (depth <= 0)
    return pick(['A', 'string', 'number', `import(${pick(SPEC)}).T`, 'X.Y.Z', '`plain`', stringLiteralType()]);
  const forms = [
    () => `${typeExpr(depth - 1)}${w()}|${w()}${typeExpr(depth - 1)}`,
    () => `${typeExpr(depth - 1)}${w()}&${w()}${typeExpr(depth - 1)}`,
    () => `keyof${requiredWs()}${typeExpr(depth - 1)}`,
    () => `typeof${requiredWs()}${pick(NAME)}`,
    () => `readonly${requiredWs()}${typeExpr(depth - 1)}[]`,
    () => `unique${requiredWs()}symbol`,
    () => `infer${requiredWs()}${pick(NAME)}`,
    () => `new${requiredWs()}() => ${typeExpr(depth - 1)}`,
    () => `abstract${requiredWs()}new () => ${typeExpr(depth - 1)}`,
    () => `{ ${pick(NAME)}: ${typeExpr(depth - 1)}; m(): ${typeExpr(depth - 1)} }`,
    () => `{ [${pick(NAME)} in ${typeExpr(depth - 1)}]: ${typeExpr(depth - 1)} }`,
    () => `${typeExpr(depth - 1)}[${typeExpr(depth - 1)}]`,
    () => `(${typeExpr(depth - 1)})`,
    () => `${typeExpr(depth - 1)}[]`,
    () => `[${typeExpr(depth - 1)}, ${typeExpr(depth - 1)}]`,
    () => `(${pick(NAME)}: ${typeExpr(depth - 1)}) => ${typeExpr(depth - 1)}`,
    () => `(${w()}) => ${typeExpr(depth - 1)}`,
    () => templateType(depth - 1),
    () => `Array<${typeExpr(depth - 1)}>`,
    () => `${typeExpr(depth - 1)} extends ${typeExpr(depth - 1)} ? ${typeExpr(depth - 1)} : ${typeExpr(depth - 1)}`,
  ];
  return pick(forms)();
}

function typeParams () {
  if (!maybe(0.45)) return '';
  const name = pick(NAME);
  return `<${name}${maybe() ? ` extends ${typeExpr(1)}` : ''}${maybe() ? ` = ${typeExpr(1)}` : ''}>`;
}

function heritage () {
  if (!maybe(0.6)) return '';
  const clause = () => `${pick(['Base', 'Bar', 'Mixin'])}<${typeExpr(1)}>`;
  return ` extends ${clause()}${maybe(0.3) ? `, ${clause()}` : ''}`;
}

function interfaceBody () {
  return pick([
    () => `{ ${pick(NAME)}: ${typeExpr(2)}; m(): ${typeExpr(1)} }`,
    () => `{ /* } */ ${pick(NAME)}: ${typeExpr(2)} }`,
    () => `{ // }\n ${pick(NAME)}: ${typeExpr(2)}\n}`,
    () => `{ ${pick(NAME)}: '{'; m(): ${typeExpr(1)} }`,
    () => `{ ${pick(NAME)}: ${stringLiteralType()}; m<${pick(NAME)}>(): ${typeExpr(1)} }`,
    () => `{ [${pick(NAME)}: string]: ${typeExpr(2)} }`,
  ])();
}

function aliasTerminator () {
  return pick([';', '\n', '\n\n', '\n| ' + typeExpr(1) + ';', '\n& ' + typeExpr(1) + ';', ';\n']);
}

// Out-of-scope statement forms: value-position type annotations. Node strips
// these, but the lexer only erases exported/bare declarations and type-only
// import/export clauses, so their embedded import() types stay visible.
const OUT_OF_SCOPE = new Set(['const-annot']);

const FORMS = {
  'import-type-named': () => `import${requiredWs()}type${requiredWs()}{ ${pick(NAME)}${maybe() ? ` as ${pick(NAME)}` : ''} }${requiredWs()}from ${pick(SPEC)};`,
  'import-type-default': () => `import${requiredWs()}type${requiredWs()}${pick(NAME)} from ${pick(SPEC)};`,
  'import-type-ns': () => `import${requiredWs()}type${requiredWs()}* as ${pick(NAME)} from ${pick(SPEC)};`,
  'import-inline-type': () => `import { ${maybe() ? 'type ' : ''}${pick(NAME)}, ${pick(NAME)} } from ${pick(SPEC)};`,
  'import-type-from': () => `import${requiredWs()}type from${w()}${pick(SPEC)};`,
  'import-type-from-from': () => `import${requiredWs()}type from from ${pick(SPEC)};`,
  'import-default': () => `import ${pick(NAME)} from ${pick(SPEC)};`,
  'import-side-effect': () => `import ${pick(SPEC)};`,
  'export-type-clause': () => `export${requiredWs()}type${requiredWs()}{ ${pick(NAME)}${maybe() ? ` as ${pick(NAME)}` : ''} }${maybe() ? ` from ${pick(SPEC)}` : ''};`,
  'export-inline-type': () => `export { ${maybe() ? 'type ' : ''}${pick(NAME)}, ${pick(NAME)} }${maybe() ? ` from ${pick(SPEC)}` : ''};`,
  'export-type-ns': () => `export${requiredWs()}type${requiredWs()}* as ${pick(NAME)} from ${pick(SPEC)};`,
  'export-type-alias': () => `export${requiredWs()}type${requiredWs()}${pick(NAME)}${typeParams()}${w()}=${w()}${typeExpr(2)}${aliasTerminator()}`,
  'export-interface': () => `export${requiredWs()}interface${requiredWs()}${pick(NAME)}${typeParams()}${heritage()} ${interfaceBody()}`,
  // A bare `type` alias must keep its name on the same line: TS applies ASI to
  // a bare `type\nName`, making it a value expression (unlike `export type`).
  'bare-type': () => `type ${pick(NAME)}${typeParams()}${w()}=${w()}${typeExpr(2)}${aliasTerminator()}`,
  'bare-interface': () => `interface${requiredWs()}${pick(NAME)}${typeParams()}${heritage()} ${interfaceBody()}`,
  'nested-type': () => `function f() { type ${pick(NAME)}${typeParams()}${w()}=${w()}${typeExpr(2)}${aliasTerminator()} }`,
  'nested-interface': () => `if (true) { interface${requiredWs()}${pick(NAME)}${typeParams()}${heritage()} ${interfaceBody()} }`,
  'const-annot': () => `export const ${pick(NAME)}${maybe() ? ': ' + typeExpr(1) : ''} = ${maybe() ? 'import(' + pick(SPEC) + ')' : '1'};`,
  'dynamic-import': () => `const x = import(${pick(SPEC)});`,
  'export-default': () => `export default ${maybe() ? 'import(' + pick(SPEC) + ')' : '1'};`,
};

const FORM_KEYS = ONLY_FORM
  ? [ONLY_FORM]
  : Object.keys(FORMS).filter(k => !(IN_SCOPE && OUT_OF_SCOPE.has(k)));

function stmt () {
  return FORMS[pick(FORM_KEYS)]();
}

function genSource () {
  const n = 1 + Math.floor(rand() * 4);
  let out = '';
  for (let i = 0; i < n; i++) {
    out += stmt() + pick(BETWEEN_STATEMENTS);
    if (maybe(0.5))
      out += pick(SENTINELS)() + pick(BETWEEN_STATEMENTS);
  }
  return out;
}

// Multiset of runtime import specifiers the lexer reports (tp === false, and a
// resolved name only — dynamic import()s with a non-constant specifier have no
// n). Type-only imports are erased, so excluded.
function runtimeImportSpecs (res) {
  const specs = [];
  for (const imp of res[0]) {
    if (imp.tp) continue;
    if (imp.n === undefined) continue;
    specs.push(imp.n);
  }
  return specs.sort();
}

function runtimeExports (res) {
  const names = [];
  for (const exprt of res[1]) {
    if (exprt.tp) continue;
    names.push(exprt.n);
  }
  return names.sort();
}

function multisetSubtract (a, b) {
  // returns items in `a` not covered by `b` (both sorted arrays)
  const left = [...a];
  for (const x of b) {
    const i = left.indexOf(x);
    if (i !== -1) left.splice(i, 1);
  }
  return left;
}

// Classify one source against the oracle. Returns a finding { kind, detail },
// 'agree' when the lexer matches Node, or 'skip' when the source is out of
// scope (Node rejects it, or the stripped output is not parseable here). Shared
// by the fuzz loop and the minimizer so a shrink only accepts a candidate that
// fails the same way.
function classify (src) {
  let stripped;
  try {
    stripped = stripTypeScriptTypes(src, { mode: 'strip' });
  } catch {
    return 'skip'; // non-erasable or invalid TS: out of scope
  }
  let strippedRes, origRes;
  try {
    strippedRes = parse(stripped);
  } catch {
    return 'skip'; // stripped output not parseable: not our concern here
  }
  try {
    origRes = parse(src);
  } catch (error) {
    return { kind: 'crash', detail: `lexer threw on TS that Node accepted: ${error.message}`, stripped };
  }

  const origImports = runtimeImportSpecs(origRes);
  const truthImports = runtimeImportSpecs(strippedRes);
  const leakedImports = multisetSubtract(origImports, truthImports);
  if (leakedImports.length)
    return { kind: 'leaked-import', detail: `runtime imports ${JSON.stringify(leakedImports)} were erased by Node`, stripped };
  const missedImports = multisetSubtract(truthImports, origImports);
  if (missedImports.length)
    return { kind: 'missed-import', detail: `runtime imports ${JSON.stringify(missedImports)} survived stripping but lexer omitted them`, stripped };

  const origExports = runtimeExports(origRes);
  const truthExports = runtimeExports(strippedRes);
  const leakedExports = multisetSubtract(origExports, truthExports);
  if (leakedExports.length)
    return { kind: 'leaked-export', detail: `runtime exports ${JSON.stringify(leakedExports)} were erased by Node`, stripped };
  const missedExports = multisetSubtract(truthExports, origExports);
  if (missedExports.length)
    return { kind: 'missed-export', detail: `runtime exports ${JSON.stringify(missedExports)} survived stripping but lexer omitted them`, stripped };

  return 'agree';
}

// Greedy line/char shrink: keep dropping leading and trailing slices while the
// source still fails with the same finding kind. Cheap and good enough to turn
// a 4-statement soup into a one-line repro.
function shrink (src, kind) {
  let best = src;
  let changed = true;
  while (changed) {
    changed = false;
    // Drop whole statements from either end (split on newlines and ';').
    const parts = best.split(/(?<=[;\n])/);
    for (let i = 0; i < parts.length; i++) {
      for (let j = parts.length; j > i; j--) {
        if (i === 0 && j === parts.length) continue;
        const candidate = parts.slice(i, j).join('');
        if (candidate === best || candidate.length === 0) continue;
        const finding = classify(candidate);
        if (typeof finding === 'object' && finding.kind === kind) {
          best = candidate;
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }
  // Trim a leading/trailing char run while the finding survives.
  changed = true;
  while (changed && best.length > 1) {
    changed = false;
    for (const candidate of [best.slice(1), best.slice(0, -1)]) {
      const finding = classify(candidate);
      if (typeof finding === 'object' && finding.kind === kind) {
        best = candidate;
        changed = true;
        break;
      }
    }
  }
  return best;
}

const findings = new Map(); // key(kind+minimized src) -> { kind, src, detail }
const findingCounts = new Map();
function record (kind, src, detail, stripped) {
  findingCounts.set(kind, (findingCounts.get(kind) ?? 0) + 1);
  const reduced = minimize ? shrink(src, kind) : src;
  const key = kind + '::' + reduced;
  if (!findings.has(key)) {
    const strippedReduced = (() => {
      try {
        return stripTypeScriptTypes(reduced, { mode: 'strip' });
      } catch {
        return stripped;
      }
    })();
    findings.set(key, { kind, src: reduced, detail, stripped: strippedReduced });
  }
}

let checked = 0, skipped = 0;
for (let i = 0; i < iterations; i++) {
  const src = genSource();
  const finding = classify(src);
  if (finding === 'skip') {
    skipped++;
    continue;
  }
  checked++;
  if (finding !== 'agree')
    record(finding.kind, src, finding.detail, finding.stripped);
}

console.log(`checked=${checked} skipped=${skipped} findings=${findings.size}`);
if (findingCounts.size)
  console.log('findingCounts=' + JSON.stringify(Object.fromEntries([...findingCounts.entries()].sort())));
let n = 0;
for (const f of findings.values()) {
  if (n++ >= maxFindings) { console.log(`... (${findings.size - maxFindings} more)`); break; }
  console.log(`\n[${f.kind}] ${JSON.stringify(f.src)}\n   ${f.detail}\n   stripped=${JSON.stringify(f.stripped)}`);
}

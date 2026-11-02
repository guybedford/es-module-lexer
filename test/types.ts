import type {
  Import,
  Export,
} from '../types/lexer.js';
import { parse } from '../types/lexer.js';
import type { ImportType, DynamicImportType } from '../types/lexer.js';
import { parse as minimalParse } from '../types/lexer.minimal.js';
import type {
  ImportSpecifier as MinimalImportSpecifier,
  ExportSpecifier as MinimalExportSpecifier,
} from '../types/lexer.minimal.js';
import { parse as bindingsParse } from 'es-module-lexer/bindings';
import { parse as asmBindingsParse } from 'es-module-lexer/bindings/js';
import type { ImportBinding } from 'es-module-lexer/bindings';

declare const imported: Import;

switch (imported.type) {
  case 'static':
  case 'reexport-star':
    imported.specifier satisfies string;
    imported.attributes;
    imported.typeOnly;
    // @ts-expect-error Only dynamic imports have a dynamic argument start.
    imported.dynamicStart;
    break;
  case 'dynamic':
    imported.specifier;
    imported.dynamicStart;
    imported.phase;
    break;
  case 'import-meta':
    imported.start;
    imported.specifier satisfies null;
    imported.typeOnly satisfies false;
    break;
  default: {
    const exhaustive: never = imported;
    exhaustive;
  }
}

declare const exported: Export;

switch (exported.type) {
  case 'direct':
    exported.localName;
    exported.typeOnly;
    // @ts-expect-error Imported names only exist on reexports.
    exported.importName;
    break;
  case 'reexport':
    exported.importName;
    exported.from satisfies string;
    // @ts-expect-error Local names only exist on direct exports.
    exported.localName;
    break;
  case 'reexport-all':
    exported.from satisfies string;
    // @ts-expect-error Star reexports do not have an exported name.
    exported.name;
    break;
  default: {
    const exhaustive: never = exported;
    exhaustive;
  }
}

declare const minimalImportSpecifier: MinimalImportSpecifier;
minimalImportSpecifier.n;
minimalImportSpecifier.t satisfies ImportType;
if (minimalImportSpecifier.t === 2)
  minimalImportSpecifier.t satisfies DynamicImportType;
// @ts-expect-error 9 is not an import type.
minimalImportSpecifier.t satisfies 9;
// @ts-expect-error Minimal import records keep the v2 shape.
minimalImportSpecifier.specifier;
// @ts-expect-error Minimal import records have no attribute list.
minimalImportSpecifier.at;

declare const minimalExportSpecifier: MinimalExportSpecifier;
minimalExportSpecifier.ln;
// @ts-expect-error Minimal export records keep the v2 shape.
minimalExportSpecifier.t;

// @ts-expect-error Minimal export records omit TypeScript metadata.
minimalExportSpecifier.typeOnly;

// parse is synchronous — no promise in its return type.
const syncImports: ReadonlyArray<Import> = parse('')[0];
syncImports;
// @ts-expect-error parse does not return a promise.
parse('').then;

const minimalSyncImports: ReadonlyArray<MinimalImportSpecifier> = minimalParse('')[0];
minimalSyncImports;

for (const bindingParse of [bindingsParse, asmBindingsParse]) {
  const [imports] = bindingParse("import { a } from 'a'");
  for (const imported of imports) {
    if (imported.type === 'static' || imported.type === 'reexport-star') {
      imported.bindings satisfies ReadonlyArray<ImportBinding>;
      imported.clauseStart satisfies number;
      imported.clauseEnd satisfies number;
    }
    else {
      // @ts-expect-error Only static import records carry bindings.
      imported.bindings;
    }
  }
}
// @ts-expect-error The default parser does not collect bindings.
parse('')[0][0].bindings;

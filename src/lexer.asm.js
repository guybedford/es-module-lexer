// Build-time variant flag. The minimal build (lib/lexer.min.asm.in.js) rewrites
// this to `true`; terser then folds away the full-only getter reads (ip/ess/f/
// ms/attributes/export analysis), matching the stripped LEXER_MIN wasm/asm
// exports.
const MINIMAL = false;

let asm, asmBuffer, allocSize = 2<<19, addr;

const copy = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1 ? function (src, outBuf16) {
  const len = src.length;
  let i = 0;
  while (i < len)
    outBuf16[i] = src.charCodeAt(i++);
} : function (src, outBuf16) {
  const len = src.length;
  let i = 0;
  while (i < len) {
    const ch = src.charCodeAt(i);
    outBuf16[i++] = (ch & 0xff) << 8 | ch >>> 8;
  }
};

// Keyword dictionary, extracted from the fastcomp static memory image at build
// time (see chompfile.toml lib/lexer.asm.in.js) so it stays in sync with the
// contiguous keyword table in lexer.c automatically.
const words = {{WORDS}};

let source, name;
export function parse (_source, _name = '@') {
  source = _source;
  name = _name;
  // 2 bytes per string code point
  // + analysis space (2 bytes per code point, grown on overflow below)
  // + EMCC stack space (2^18)
  const analysisSize = Math.max(2 << 17, source.length * 2);
  const memBound = source.length * 2 + analysisSize + (2 << 17);
  if (memBound > allocSize || !asm) {
    while (memBound > allocSize) allocSize *= 2;
    asmBuffer = new ArrayBuffer(allocSize);
    copy(words, new Uint16Array(asmBuffer, {{OFFSET}}, words.length));
    asm = asmInit(typeof globalThis !== 'undefined' ? globalThis : self, {}, asmBuffer);
    // lexer.c bulk allocates string space + analysis space
    addr = asm.su(allocSize - (2<<17), {{STATIC_TOP}});
    if (!MINIMAL)
      asm.sal(allocSize - (2<<17));
  }
  const len = source.length + 1;
  asm.ses(addr);
  asm.sa(len - 1);

  copy(source, new Uint16Array(asmBuffer, addr, len));

  if (!asm.p()) {
    // -1 is the analysis arena running out: nothing is reported, so double the
    // buffer and lex again rather than truncating the records.
    if (!MINIMAL && asm.e() === -1) {
      allocSize *= 2;
      asm = undefined;
      return parse(_source, _name);
    }
    acornPos = asm.e();
    syntaxError();
  }

  const imports = [], exports = [];
  while (asm.ri()) {
    const s = asm.is(), e = asm.ie(), importType = asm.it(), t = importType & 15;
    const a = asm.ai(), d = asm.id(), ss = asm.ss(), se = asm.se();
    const stringFlags = asm.ip();
    let n;
    if (stringFlags === 1/*SafeString*/)
      n = readString(d === -1 ? s : s + 1, d === -1 ? e : e - 1);
    else if (stringFlags === 3/*SafeString|TemplateRawCR*/)
      n = readString(d === -1 ? s : s + 1, d === -1 ? e : e - 1, true);
    else if (!MINIMAL && d !== -1 && source.charCodeAt(s) === 96/*`*/)
      n = decodeTemplate(s, e);
    let at = null;
    // minimal build drops the parsed attribute list; es-module-shims reads the
    // assertion via source.slice(a, se - 1) instead
    if (!MINIMAL) {
      at = [];
      asm.rsa();
      while (asm.ra()) {
        const aks = asm.aks(), ake = asm.ake(), avs = asm.avs(), ave = asm.ave();
        at.push([decodeIfQuoted(aks, ake), decodeIfQuoted(avs, ave)]);
      }
      at = at.length > 0 ? at : null;
    }
    if (MINIMAL) {
      imports.push({ t, n, s, e, ss, se, d, a, at });
    }
    else if (t === 3/*ImportMeta*/) {
      imports.push({ type: 'import-meta', start: s, end: e, importStart: ss, importEnd: se });
    }
    else if (d !== -1) {
      const phase = t === 5/*DynamicSourcePhase*/ ? 'source' : t === 7/*DynamicDeferPhase*/ ? 'defer' : null;
      imports.push({ type: 'dynamic', specifier: n, phase, start: s, end: e, importStart: ss, importEnd: se, dynamicStart: d, attributes: at, attributesStart: a, probablyTypeOnly: !!(importType & 16) });
    }
    else {
      const phase = t === 4/*StaticSourcePhase*/ ? 'source' : t === 6/*StaticDeferPhase*/ ? 'defer' : null;
      imports.push({ type: t === 8/*StaticReexportStar*/ ? 'reexport-star' : 'static', specifier: n, phase, start: s, end: e, importStart: ss, importEnd: se, attributes: at, attributesStart: a, typeOnly: !!(importType & 16) });
    }
  }
  let exportType;
  while ((exportType = asm.re())) {
    const s = asm.es(), e = asm.ee(), ls = asm.els(), le = asm.ele();
    if (MINIMAL) {
      const ln = ls < 0 ? undefined : decodeIfQuoted(ls, le);
      const n = decodeIfQuoted(s, e);
      exports.push({ s, e, ls, le, n, ln });
      continue;
    }

    const exportType = asm.et(), t = exportType & 3, tp = !!(exportType & 4), ss = asm.ess();
    if (t === 3) {
      const fi = asm.eii();
      exports.push({ type: 'reexport-all', from: imports[fi].specifier, importIndex: fi, start: s, end: e, exportStart: ss, typeOnly: tp });
    }
    else {
      const n = decodeIfQuoted(s, e);
      if (t === 1) {
        const ln = ls < 0 ? undefined : decodeIfQuoted(ls, le);
        exports.push({ type: 'direct', name: n, localName: ln, start: s, end: e, localStart: ls, localEnd: le, exportStart: ss, typeOnly: tp });
      }
      else {
        const fi = asm.eii(), importNameType = asm.eit();
        const im = importNameType === 0
          ? decodeIfQuoted(ls, le)
          : importNameType === 1 ? 'default' : null;
        exports.push({
          type: 'reexport',
          name: n,
          importName: im,
          importNameStart: importNameType === 0 ? ls : -1,
          importNameEnd: importNameType === 0 ? le : -1,
          from: imports[fi].specifier,
          importIndex: fi,
          start: s,
          end: e,
          exportStart: ss,
          typeOnly: tp
        });
      }
    }
  }

  return MINIMAL ? [imports, exports] : [imports, exports, !!asm.f(), !!asm.ms()];

  function decodeIfQuoted (pos, end) {
    const ch = source.charCodeAt(pos);
    if (ch === 34 || ch === 39)
      return readString(pos + 1, end - 1);
    return source.slice(pos, end);
  }
}

/*
 * Ported from Acorn
 *
 * MIT License

 * Copyright (C) 2012-2020 by various contributors (see AUTHORS)

 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:

 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
let acornPos;
const templateLineEndings = /\r\n?/g;
/**
 * @param {number} start Start of the string contents.
 * @param {number} end End of the string contents.
 * @param {boolean} normalizeLineEndings Whether to normalize raw template line endings.
 * @returns {string}
 */
function readString (start, end, normalizeLineEndings = false) {
  const literal = source.slice(start, end);
  let escape = literal.indexOf('\\');
  if (escape === -1)
    return normalizeLineEndings ? literal.replace(templateLineEndings, '\n') : literal;

  let chunk = literal.slice(0, escape);
  let decoded = normalizeLineEndings ? chunk.replace(templateLineEndings, '\n') : chunk;
  for (;;) {
    let index = escape + 1;
    if (index >= literal.length) {
      acornPos = start + index;
      syntaxError();
    }

    const char = literal.charCodeAt(index++);
    switch (char) {
      case 13:
        if (literal.charCodeAt(index) === 10) index++;
        break;
      case 10:
      case 0x2028:
      case 0x2029:
        break;
      case 114: decoded += '\r'; break;
      case 110: decoded += '\n'; break;
      case 116: decoded += '\t'; break;
      case 98: decoded += '\b'; break;
      case 102: decoded += '\f'; break;
      case 118: decoded += '\u000b'; break;
      case 120:
        decoded += String.fromCharCode(readHex(start + index, 2));
        index += 2;
        break;
      case 117: {
        let codePoint;
        if (literal.charCodeAt(index) === 123) {
          const close = literal.indexOf('}', ++index);
          if (close === -1) {
            acornPos = start + index;
            syntaxError();
          }
          codePoint = readHex(start + index, close - index);
          index = close + 1;
        }
        else {
          codePoint = readHex(start + index, 4);
          index += 4;
        }
        if (codePoint > 0x10ffff) {
          acornPos = start + index;
          syntaxError();
        }
        if (codePoint <= 0xffff) {
          decoded += String.fromCharCode(codePoint);
        }
        else {
          codePoint -= 0x10000;
          decoded += String.fromCharCode((codePoint >> 10) + 0xd800, (codePoint & 1023) + 0xdc00);
        }
        break;
      }
      case 48: {
        const next = literal.charCodeAt(index);
        if (next >= 48 && next <= 57) {
          acornPos = start + index;
          syntaxError();
        }
        decoded += '\0';
        break;
      }
      default:
        if (char >= 49 && char <= 57) {
          acornPos = start + index - 1;
          syntaxError();
        }
        decoded += String.fromCharCode(char);
    }

    const nextEscape = literal.indexOf('\\', index);
    if (nextEscape === -1) {
      chunk = literal.slice(index);
      return decoded + (normalizeLineEndings ? chunk.replace(templateLineEndings, '\n') : chunk);
    }
    chunk = literal.slice(index, nextEscape);
    decoded += normalizeLineEndings ? chunk.replace(templateLineEndings, '\n') : chunk;
    escape = nextEscape;
  }
}

// Glob for a lone interpolated-template specifier starting at `s`. The parser
// commits a ${...} span list only for that shape (see lexer.c), so a first rt()
// of false means "not a glob" (a concatenation such as `a${x}` + b, or a nested
// template) and yields undefined. Walking from the opening backtick, each
// top-level ${...} becomes a single "*" and is skipped via its recorded end;
// static runs are copied raw so the three ports agree byte-for-byte. The walk
// ends at the specifier's unescaped closing backtick. Kept identical to the
// wasm build's decodeTemplate (src/lexer.ts).
function decodeTemplate (s, e) {
  asm.rts();
  if (!asm.rt())
    return;
  let out = '', chunkStart = s + 1, index = s + 1, spanEnd = asm.te();
  // `e` bounds the walk defensively; the parser guarantees an unescaped closing
  // backtick within it for a committed glob.
  while (index < e) {
    const ch = source.charCodeAt(index);
    if (ch === 96/*`*/)
      break;
    if (ch === 92/*\*/) {
      index += 2;
      continue;
    }
    if (ch === 42/***/) {
      out += source.slice(chunkStart, index) + '\\*';
      chunkStart = ++index;
      continue;
    }
    if (ch === 36/*$*/ && source.charCodeAt(index + 1) === 123/*{*/ && index + 2 <= spanEnd) {
      out += source.slice(chunkStart, index) + '*';
      index = chunkStart = spanEnd;
      spanEnd = asm.rt() ? asm.te() : -1;
      continue;
    }
    index++;
  }
  return out + source.slice(chunkStart, index);
}

/**
 * @param {number} start Start of the hexadecimal digits.
 * @param {number} length Number of hexadecimal digits.
 * @returns {number}
 */
function readHex (start, length) {
  if (length < 1 || start + length > source.length) {
    acornPos = start;
    syntaxError();
  }

  let value = 0;
  const end = start + length;
  for (let index = start; index < end; index++) {
    const char = source.charCodeAt(index);
    const lower = char | 32;
    const digit = char >= 48 && char <= 57
      ? char - 48
      : lower >= 97 && lower <= 102 ? lower - 87 : -1;
    if (digit === -1) {
      acornPos = index;
      syntaxError();
    }
    value = value * 16 + digit;
  }
  return value;
}

function syntaxError () {
  throw Object.assign(new Error(`Parse error ${name}:${source.slice(0, acornPos).split('\n').length}:${acornPos - source.lastIndexOf('\n', acornPos - 1)}`), { idx: acornPos });
}

// function asmInit () { ... } from lib/lexer.asm.js is concatenated at the end here

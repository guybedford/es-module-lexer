// Build-time variant flag. The minimal build (lib/lexer.min.asm.in.js) rewrites
// this to `true`; terser then folds away the full-only getter reads (ip/ess/f/
// ms/attributes/export analysis), matching the stripped LEXER_MIN wasm/asm
// exports.
const MINIMAL = false;
const EXPORT_CAPTURE_THRESHOLD = 4096;
const MAX_EXPORT_BUCKET_SIZE = 131072;

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

/**
 * @param {string} source
 * @param {number} recordSize
 * @returns {number}
 */
function getAnalysisSize (source, recordSize) {
  const defaultSize = (source.length + 1) * 2;
  if (source.length < 16384)
    return defaultSize;
  const recordCount = 1 +
    countOccurrences(source, ',') +
    countOccurrences(source, 'import') +
    countOccurrences(source, 'export');
  return Math.max(defaultSize, recordCount * recordSize);
}

/**
 * @param {string} source
 * @param {string} token
 * @returns {number}
 */
function countOccurrences (source, token) {
  let count = 0;
  let index = -1;
  while ((index = source.indexOf(token, index + 1)) !== -1)
    count++;
  return count;
}

/**
 * @param {string} source
 * @returns {boolean}
 */
function mayHaveExportClause (source) {
  return source.length >= EXPORT_CAPTURE_THRESHOLD &&
    (source.indexOf('export {') !== -1 || source.indexOf('export{') !== -1);
}

// Keyword dictionary, extracted from the fastcomp static memory image at build
// time (see chompfile.toml lib/lexer.asm.in.js) so it stays in sync with the
// keyword tables in lexer.c automatically.
const words = '{{WORDS}}';

let source, name;
export function parse (_source, _name = '@') {
  source = _source;
  name = _name;
  const collectImportBindings = !MINIMAL && mayHaveExportClause(source);
  // 2 bytes per string code point
  // + analysis space
  // + EMCC stack space (2^18)
  const analysisSize = MINIMAL
    ? 2 << 17
    : Math.max(2 << 17, getAnalysisSize(source, 72) + MAX_EXPORT_BUCKET_SIZE);
  const memBound = source.length * 2 + analysisSize + (2 << 17);
  if (memBound > allocSize || !asm) {
    while (memBound > allocSize) allocSize *= 2;
    asmBuffer = new ArrayBuffer(allocSize);
    copy(words, new Uint16Array(asmBuffer, {{OFFSET}}, words.length));
    asm = asmInit(typeof globalThis !== 'undefined' ? globalThis : self, {}, asmBuffer);
    // lexer.c bulk allocates string space + analysis space
    addr = asm.su(allocSize - (2<<17), {{STATIC_TOP}});
  }
  const len = source.length + 1;
  asm.ses(addr);
  asm.sa(len - 1);
  if (!MINIMAL)
    asm.eac(collectImportBindings);

  copy(source, new Uint16Array(asmBuffer, addr, len));

  if (!asm.p()) {
    acornPos = asm.e();
    syntaxError();
  }

  const imports = [], exports = [];
  while (asm.ri()) {
    const s = asm.is(), e = asm.ie(), a = asm.ai(), d = asm.id(), ss = asm.ss(), se = asm.se(), t = asm.it();
    let n;
    if (asm.ip())
      n = readString(d === -1 ? s : s + 1, source.charCodeAt(d === -1 ? s - 1 : s));
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
    imports.push({ t, n, s, e, ss, se, d, a, at });
  }
  while (asm.re()) {
    const s = asm.es(), e = asm.ee(), ls = asm.els(), le = asm.ele();
    if (MINIMAL) {
      const ln = ls < 0 ? undefined : decodeIfQuoted(ls, le);
      const n = decodeIfQuoted(s, e);
      exports.push({ s, e, ls, le, n, ln });
      continue;
    }

    const t = asm.et(), ss = asm.ess();
    if (t === 3) {
      const fi = asm.eii();
      exports.push({ t, f: imports[fi].n, fi, s, e, ss });
    }
    else {
      const n = decodeIfQuoted(s, e);
      if (t === 1) {
        const ln = ls < 0 ? undefined : decodeIfQuoted(ls, le);
        exports.push({ t, n, ln, s, e, ls, le, ss });
      }
      else {
        const fi = asm.eii(), importNameType = asm.eit();
        const im = importNameType === 0
          ? decodeIfQuoted(ls, le)
          : importNameType === 1 ? 'default' : null;
        exports.push({
          t,
          n,
          im,
          ims: importNameType === 0 ? ls : -1,
          ime: importNameType === 0 ? le : -1,
          f: imports[fi].n,
          fi,
          s,
          e,
          ss
        });
      }
    }
  }

  return MINIMAL ? [imports, exports] : [imports, exports, !!asm.f(), !!asm.ms()];

  function decodeIfQuoted (pos, end) {
    const ch = source.charCodeAt(pos);
    if (ch === 34 || ch === 39)
      return readString(pos + 1, ch);
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
function readString (start, quote) {
  acornPos = start;
  let out = '', chunkStart = acornPos;
  for (;;) {
    if (acornPos >= source.length) syntaxError();
    const ch = source.charCodeAt(acornPos);
    if (ch === quote) break;
    if (ch === 92) { // '\'
      out += source.slice(chunkStart, acornPos);
      out += readEscapedChar();
      chunkStart = acornPos;
    }
    else if (ch === 0x2028 || ch === 0x2029) {
      ++acornPos;
    }
    else {
      if (isBr(ch) && quote !== 96/*`*/) syntaxError();
      ++acornPos;
    }
  }
  out += source.slice(chunkStart, acornPos++);
  return out;
}

// Used to read escaped characters

function readEscapedChar () {
  let ch = source.charCodeAt(++acornPos);
  ++acornPos;
  switch (ch) {
    case 110: return '\n'; // 'n' -> '\n'
    case 114: return '\r'; // 'r' -> '\r'
    case 120: return String.fromCharCode(readHexChar(2)); // 'x'
    case 117: return readCodePointToString(); // 'u'
    case 116: return '\t'; // 't' -> '\t'
    case 98: return '\b'; // 'b' -> '\b'
    case 118: return '\u000b'; // 'v' -> '\u000b'
    case 102: return '\f'; // 'f' -> '\f'
    case 13: if (source.charCodeAt(acornPos) === 10) ++acornPos; // '\r\n'
    case 10: // ' \n'
      return '';
    case 56:
    case 57:
      syntaxError();
    default:
      if (ch >= 48 && ch <= 55) {
        let octalStr = source.substr(acornPos - 1, 3).match(/^[0-7]+/)[0];
        let octal = parseInt(octalStr, 8);
        if (octal > 255) {
          octalStr = octalStr.slice(0, -1);
          octal = parseInt(octalStr, 8);
        }
        acornPos += octalStr.length - 1;
        ch = source.charCodeAt(acornPos);
        if (octalStr !== '0' || ch === 56 || ch === 57)
          syntaxError();
        return String.fromCharCode(octal);
      }
      if (isBr(ch)) {
        // Unicode new line characters after \ get removed from output in both
        // template literals and strings
        return '';
      }
      return String.fromCharCode(ch);
  }
}

// Used to read character escape sequences ('\x', '\u', '\U').

function readHexChar (len) {
  const start = acornPos;
  let total = 0, lastCode = 0;
  for (let i = 0; i < len; ++i, ++acornPos) {
    let code = source.charCodeAt(acornPos), val;

    if (code === 95) {
      if (lastCode === 95 || i === 0) syntaxError();
      lastCode = code;
      continue;
    }

    if (code >= 97) val = code - 97 + 10; // a
    else if (code >= 65) val = code - 65 + 10; // A
    else if (code >= 48 && code <= 57) val = code - 48; // 0-9
    else break;
    if (val >= 16) break;
    lastCode = code;
    total = total * 16 + val;
  }

  if (lastCode === 95 || acornPos - start !== len) syntaxError();

  return total;
}

// Read a string value, interpreting backslash-escapes.

function readCodePointToString () {
  const ch = source.charCodeAt(acornPos);
  let code;
  if (ch === 123) { // '{'
    ++acornPos;
    code = readHexChar(source.indexOf('}', acornPos) - acornPos);
    ++acornPos;
    if (code > 0x10FFFF) syntaxError();
  } else {
    code = readHexChar(4);
  }
  // UTF-16 Decoding
  if (code <= 0xFFFF) return String.fromCharCode(code);
  code -= 0x10000;
  return String.fromCharCode((code >> 10) + 0xD800, (code & 1023) + 0xDC00);
}

function isBr (c) {
  return c === 13/*\r*/ || c === 10/*\n*/;
}

function syntaxError () {
  throw Object.assign(new Error(`Parse error ${name}:${source.slice(0, acornPos).split('\n').length}:${acornPos - source.lastIndexOf('\n', acornPos - 1)}`), { idx: acornPos });
}

// function asmInit () { ... } from lib/lexer.asm.js is concatenated at the end here

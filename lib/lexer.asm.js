let asm, asmBuffer, allocSize = 131072, addr;

const isLE = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;

let source, name;
export function parse (_source, _name = '@') {
  source = _source;
  name = _name;
  if (source.length > allocSize || !asm) {
    while (source.length > allocSize) allocSize *= 2;
    asmBuffer = new ArrayBuffer(allocSize * 4);
    asm = asmInit({ Int8Array, Int16Array, Int32Array, Uint8Array, Uint16Array }, {}, asmBuffer);
    addr = asm.sta(allocSize * 2);
  }
  const len = source.length + 1;
  asm.ses(addr);
  asm.sa(len - 1);

  (isLE ? copyLE : copyBE)(source, new Uint16Array(asmBuffer, addr, len));

  if (!asm.p()) {
    acornPos = asm.e();
    syntaxError();
  }

  const imports = [], exports = [];
  while (asm.ri()) {
    const s = asm.is(), e = asm.ie(), a = asm.ai(), d = asm.id(), ss = asm.ss(), se = asm.se();
    let n;
    if (asm.ip())
      n = readString(d === -1 ? s : s + 1, source.charCodeAt(d === -1 ? s - 1 : s));
    imports.push({ n, s, e, ss, se, d, a });
  }
  while (asm.re()) {
    const start = asm.es(), ch = source.charCodeAt(start);
    exports.push((ch === 34 || ch === 39) ? readString(start + 1, ch) : source.slice(asm.es(), asm.ee()));
  }

  return [imports, exports, !!asm.f()];
}

function copyBE (src, outBuf16) {
  const len = src.length;
  let i = 0;
  while (i < len) {
    const ch = src.charCodeAt(i);
    outBuf16[i++] = (ch & 0xff) << 8 | ch >>> 8;
  }
}

function copyLE (src, outBuf16) {
  const len = src.length;
  let i = 0;
  while (i < len)
    outBuf16[i] = src.charCodeAt(i++);
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
      if (isBr(ch)) syntaxError();
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
  console.log(acornPos);
  throw Object.assign(new Error(`Parse error ${name}:${source.slice(0, acornPos).split('\n').length}:${acornPos - source.lastIndexOf('\n', acornPos - 1)}`), { idx: acornPos });
}

// function asmInit () { ... } from lib/lexer.asm.js is concatenated at the end here
function asmInit(global,env,buffer) {
"use asm";var a=new global.Int8Array(buffer),b=new global.Int16Array(buffer),c=new global.Int32Array(buffer),d=new global.Uint8Array(buffer),e=new global.Uint16Array(buffer),v=992;function z(d){d=d|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0;l=v;v=v+11520|0;j=l+2048|0;a[763]=1;b[377]=0;b[378]=0;b[379]=0;b[380]=-1;c[57]=c[2];a[764]=0;c[56]=0;a[762]=0;c[58]=l+10496;c[59]=l+2304;c[60]=l;a[765]=0;d=(c[3]|0)+-2|0;c[61]=d;f=d+(c[54]<<1)|0;c[62]=f;a:while(1){g=d+2|0;c[61]=g;if(d>>>0>=f>>>0){i=18;break}b:do switch(b[g>>1]|0){case 9:case 10:case 11:case 12:case 13:case 32:break;case 101:{if((((b[379]|0)==0?ca(g)|0:0)?(Q(d+4|0,16,10)|0)==0:0)?(B(),(a[763]|0)==0):0){i=9;break a}else i=17;break}case 105:{if(ca(g)|0?(Q(d+4|0,26,10)|0)==0:0){C();i=17}else i=17;break}case 59:{i=17;break}case 47:switch(b[d+4>>1]|0){case 47:{Y();break b}case 42:{P(1);break b}default:{i=16;break a}}default:{i=16;break a}}while(0);if((i|0)==17){i=0;c[57]=c[61]}d=c[61]|0;f=c[62]|0}if((i|0)==9){d=c[61]|0;c[57]=d;i=19}else if((i|0)==16){a[763]=0;c[61]=d;i=19}else if((i|0)==18)if(!(a[762]|0)){d=g;i=19}else d=0;do if((i|0)==19){c:while(1){f=d+2|0;c[61]=f;h=f;if(d>>>0>=(c[62]|0)>>>0){i=75;break}d:do switch(b[f>>1]|0){case 9:case 10:case 11:case 12:case 13:case 32:break;case 101:{if(((b[379]|0)==0?ca(f)|0:0)?(Q(d+4|0,16,10)|0)==0:0){B();i=74}else i=74;break}case 105:{if(ca(f)|0?(Q(d+4|0,26,10)|0)==0:0){C();i=74}else i=74;break}case 99:{if((ca(f)|0?(Q(d+4|0,36,8)|0)==0:0)?ka(b[d+12>>1]|0)|0:0){a[765]=1;i=74}else i=74;break}case 40:{g=c[57]|0;h=c[59]|0;i=b[379]|0;b[379]=i+1<<16>>16;c[h+((i&65535)<<2)>>2]=g;i=74;break}case 41:{f=b[379]|0;if(!(f<<16>>16)){i=36;break c}f=f+-1<<16>>16;b[379]=f;g=b[378]|0;if(g<<16>>16!=0?(k=c[(c[60]|0)+((g&65535)+-1<<2)>>2]|0,(c[k+20>>2]|0)==(c[(c[59]|0)+((f&65535)<<2)>>2]|0)):0){f=k+4|0;if(!(c[f>>2]|0))c[f>>2]=h;c[k+12>>2]=d+4;b[378]=g+-1<<16>>16;i=74}else i=74;break}case 123:{i=c[57]|0;h=c[51]|0;d=i;do if((b[i>>1]|0)==41&(h|0)!=0?(c[h+4>>2]|0)==(i|0):0){f=c[52]|0;c[51]=f;if(!f){c[47]=0;break}else{c[f+28>>2]=0;break}}while(0);g=b[379]|0;i=g&65535;a[j+i>>0]=a[765]|0;a[765]=0;h=c[59]|0;b[379]=g+1<<16>>16;c[h+(i<<2)>>2]=d;i=74;break}case 125:{d=b[379]|0;if(!(d<<16>>16)){i=49;break c}g=d+-1<<16>>16;b[379]=g;f=b[380]|0;if(d<<16>>16!=f<<16>>16)if(f<<16>>16!=-1&(g&65535)<(f&65535)){i=53;break c}else{i=74;break d}else{h=c[58]|0;i=(b[377]|0)+-1<<16>>16;b[377]=i;b[380]=b[h+((i&65535)<<1)>>1]|0;H();i=74;break d}}case 39:{J(39);i=74;break}case 34:{J(34);i=74;break}case 47:switch(b[d+4>>1]|0){case 47:{Y();break d}case 42:{P(1);break d}default:{f=c[57]|0;g=b[f>>1]|0;e:do if(!(T(g)|0)){switch(g<<16>>16){case 41:if(aa(c[(c[59]|0)+(e[379]<<2)>>2]|0)|0){i=71;break e}else{i=68;break e}case 125:break;default:{i=68;break e}}d=e[379]|0;if(!(O(c[(c[59]|0)+(d<<2)>>2]|0)|0)?(a[j+d>>0]|0)==0:0)i=68;else i=71}else switch(g<<16>>16){case 46:if(((b[f+-2>>1]|0)+-48&65535)<10){i=68;break e}else{i=71;break e}case 43:if((b[f+-2>>1]|0)==43){i=68;break e}else{i=71;break e}case 45:if((b[f+-2>>1]|0)==45){i=68;break e}else{i=71;break e}default:{i=71;break e}}while(0);f:do if((i|0)==68){i=0;if(!(E(f)|0)){switch(g<<16>>16){case 0:{i=71;break f}case 47:break;default:{d=1;break f}}if(!(a[764]|0))d=1;else i=71}else i=71}while(0);if((i|0)==71){N();d=0}a[764]=d;i=74;break d}}case 96:{H();i=74;break}default:i=74}while(0);if((i|0)==74){i=0;c[57]=c[61]}d=c[61]|0}if((i|0)==36){ja();d=0;break}else if((i|0)==49){ja();d=0;break}else if((i|0)==53){ja();d=0;break}else if((i|0)==75){d=(b[380]|0)==-1&(b[379]|0)==0&(a[762]|0)==0;break}}while(0);v=l;return d|0}function B(){var d=0,e=0,f=0,g=0,h=0,i=0;h=c[61]|0;i=h+12|0;c[61]=i;e=I(1)|0;d=c[61]|0;if(!((d|0)==(i|0)?!(S(e)|0):0))g=3;a:do if((g|0)==3){b:do switch(e<<16>>16){case 100:{Z(d,d+14|0);break a}case 97:{c[61]=d+10;I(1)|0;d=c[61]|0;g=6;break}case 102:{g=6;break}case 99:{if((Q(d+2|0,36,8)|0)==0?(f=d+10|0,X(b[f>>1]|0)|0):0){c[61]=f;h=I(1)|0;i=c[61]|0;_(h)|0;Z(i,c[61]|0);c[61]=(c[61]|0)+-2;break a}d=d+4|0;c[61]=d;g=13;break}case 108:case 118:{g=13;break}case 123:{c[61]=d+2;d=I(1)|0;f=c[61]|0;while(1){if(la(d)|0){J(d);d=(c[61]|0)+2|0;c[61]=d}else{_(d)|0;d=c[61]|0}I(1)|0;d=M(f,d)|0;if(d<<16>>16==44){c[61]=(c[61]|0)+2;d=I(1)|0}e=f;f=c[61]|0;if(d<<16>>16==125){g=32;break}if((f|0)==(e|0)){g=29;break}if(f>>>0>(c[62]|0)>>>0){g=31;break}}if((g|0)==29){ja();break a}else if((g|0)==31){ja();break a}else if((g|0)==32){c[61]=f+2;g=34;break b}break}case 42:{c[61]=d+2;I(1)|0;g=c[61]|0;M(g,g)|0;g=34;break}default:{}}while(0);if((g|0)==6){c[61]=d+16;d=I(1)|0;if(d<<16>>16==42){c[61]=(c[61]|0)+2;d=I(1)|0}i=c[61]|0;_(d)|0;Z(i,c[61]|0);c[61]=(c[61]|0)+-2;break}else if((g|0)==13){d=d+4|0;c[61]=d;a[763]=0;c:while(1){c[61]=d+2;i=I(1)|0;d=c[61]|0;switch((_(i)|0)<<16>>16){case 91:case 123:{g=15;break c}default:{}}e=c[61]|0;if((e|0)==(d|0))break a;Z(d,e);switch((I(1)|0)<<16>>16){case 61:{g=19;break c}case 44:break;default:{g=20;break c}}d=c[61]|0}if((g|0)==15){c[61]=(c[61]|0)+-2;break}else if((g|0)==19){c[61]=(c[61]|0)+-2;break}else if((g|0)==20){c[61]=(c[61]|0)+-2;break}}else if((g|0)==34)e=I(1)|0;d=c[61]|0;if(e<<16>>16==102?(Q(d+2|0,52,6)|0)==0:0){c[61]=d+8;D(h,I(1)|0);break}c[61]=d+-2}while(0);return}function C(){var d=0,e=0,f=0,g=0,h=0;h=c[61]|0;e=h+12|0;c[61]=e;a:do switch((I(1)|0)<<16>>16){case 40:{d=c[61]|0;e=c[59]|0;f=b[379]|0;b[379]=f+1<<16>>16;c[e+((f&65535)<<2)>>2]=d;if((b[c[57]>>1]|0)!=46){d=c[61]|0;c[61]=d+2;f=I(1)|0;K(h,c[61]|0,0,d);d=c[51]|0;e=c[60]|0;h=b[378]|0;b[378]=h+1<<16>>16;c[e+((h&65535)<<2)>>2]=d;switch(f<<16>>16){case 39:{J(39);break}case 34:{J(34);break}default:{c[61]=(c[61]|0)+-2;break a}}d=(c[61]|0)+2|0;c[61]=d;switch((I(1)|0)<<16>>16){case 44:{c[61]=(c[61]|0)+2;I(1)|0;f=c[51]|0;c[f+4>>2]=d;h=c[61]|0;c[f+16>>2]=h;a[f+24>>0]=1;c[61]=h+-2;break a}case 41:{b[379]=(b[379]|0)+-1<<16>>16;h=c[51]|0;c[h+4>>2]=d;c[h+12>>2]=(c[61]|0)+2;a[h+24>>0]=1;b[378]=(b[378]|0)+-1<<16>>16;break a}default:{c[61]=(c[61]|0)+-2;break a}}}break}case 46:{c[61]=(c[61]|0)+2;if(((I(1)|0)<<16>>16==109?(d=c[61]|0,(Q(d+2|0,44,6)|0)==0):0)?(b[c[57]>>1]|0)!=46:0)K(h,h,d+8|0,2);break}case 42:case 39:case 34:{g=16;break}case 123:{d=c[61]|0;if(b[379]|0){c[61]=d+-2;break a}while(1){if(d>>>0>=(c[62]|0)>>>0)break;d=I(1)|0;if(!(la(d)|0)){if(d<<16>>16==125){g=31;break}}else J(d);d=(c[61]|0)+2|0;c[61]=d}if((g|0)==31)c[61]=(c[61]|0)+2;I(1)|0;d=c[61]|0;if(Q(d,50,8)|0){ja();break a}c[61]=d+8;d=I(1)|0;if(la(d)|0){D(h,d);break a}else{ja();break a}}default:if((c[61]|0)!=(e|0))g=16}while(0);do if((g|0)==16){if(b[379]|0){c[61]=(c[61]|0)+-2;break}d=c[62]|0;e=c[61]|0;while(1){if(e>>>0>=d>>>0){g=23;break}f=b[e>>1]|0;if(la(f)|0){g=21;break}g=e+2|0;c[61]=g;e=g}if((g|0)==21){D(h,f);break}else if((g|0)==23){ja();break}}while(0);return}function D(a,b){a=a|0;b=b|0;var d=0,e=0;d=(c[61]|0)+2|0;switch(b<<16>>16){case 39:{J(39);e=5;break}case 34:{J(34);e=5;break}default:ja()}do if((e|0)==5){K(a,d,c[61]|0,1);c[61]=(c[61]|0)+2;e=(I(0)|0)<<16>>16==97;b=c[61]|0;if(e?(Q(b+2|0,58,10)|0)==0:0){c[61]=b+12;if((I(1)|0)<<16>>16!=123){c[61]=b;break}a=c[61]|0;d=a;a:while(1){c[61]=d+2;d=I(1)|0;switch(d<<16>>16){case 39:{J(39);c[61]=(c[61]|0)+2;d=I(1)|0;break}case 34:{J(34);c[61]=(c[61]|0)+2;d=I(1)|0;break}default:d=_(d)|0}if(d<<16>>16!=58){e=16;break}c[61]=(c[61]|0)+2;switch((I(1)|0)<<16>>16){case 39:{J(39);break}case 34:{J(34);break}default:{e=20;break a}}c[61]=(c[61]|0)+2;switch((I(1)|0)<<16>>16){case 125:{e=25;break a}case 44:break;default:{e=24;break a}}c[61]=(c[61]|0)+2;if((I(1)|0)<<16>>16==125){e=25;break}d=c[61]|0}if((e|0)==16){c[61]=b;break}else if((e|0)==20){c[61]=b;break}else if((e|0)==24){c[61]=b;break}else if((e|0)==25){e=c[51]|0;c[e+16>>2]=a;c[e+12>>2]=(c[61]|0)+2;break}}c[61]=b+-2}while(0);return}function E(a){a=a|0;a:do switch(b[a>>1]|0){case 100:switch(b[a+-2>>1]|0){case 105:{a=V(a+-4|0,68,2)|0;break a}case 108:{a=V(a+-4|0,72,3)|0;break a}default:{a=0;break a}}case 101:{switch(b[a+-2>>1]|0){case 115:break;case 116:{a=V(a+-4|0,78,4)|0;break a}default:{a=0;break a}}switch(b[a+-4>>1]|0){case 108:{a=W(a+-6|0,101)|0;break a}case 97:{a=W(a+-6|0,99)|0;break a}default:{a=0;break a}}}case 102:{if((b[a+-2>>1]|0)==111?(b[a+-4>>1]|0)==101:0)switch(b[a+-6>>1]|0){case 99:{a=V(a+-8|0,86,6)|0;break a}case 112:{a=V(a+-8|0,98,2)|0;break a}default:{a=0;break a}}else a=0;break}case 110:{a=a+-2|0;if(W(a,105)|0)a=1;else a=V(a,102,5)|0;break}case 111:{a=W(a+-2|0,100)|0;break}case 114:{a=V(a+-2|0,112,7)|0;break}case 116:{a=V(a+-2|0,126,4)|0;break}case 119:switch(b[a+-2>>1]|0){case 101:{a=W(a+-4|0,110)|0;break a}case 111:{a=V(a+-4|0,134,3)|0;break a}default:{a=0;break a}}default:a=0}while(0);return a|0}function H(){var a=0,d=0,e=0;d=c[62]|0;e=c[61]|0;a:while(1){a=e+2|0;if(e>>>0>=d>>>0){d=8;break}switch(b[a>>1]|0){case 96:{d=9;break a}case 36:{if((b[e+4>>1]|0)==123){d=6;break a}break}case 92:{a=e+4|0;break}default:{}}e=a}if((d|0)==6){c[61]=e+4;a=b[380]|0;d=c[58]|0;e=b[377]|0;b[377]=e+1<<16>>16;b[d+((e&65535)<<1)>>1]=a;e=(b[379]|0)+1<<16>>16;b[379]=e;b[380]=e}else if((d|0)==8){c[61]=a;ja()}else if((d|0)==9)c[61]=a;return}function I(a){a=a|0;var d=0,e=0,f=0;e=c[61]|0;a:do{d=b[e>>1]|0;b:do if(d<<16>>16!=47)if(a)if(ka(d)|0)break;else break a;else if(ba(d)|0)break;else break a;else switch(b[e+2>>1]|0){case 47:{Y();break b}case 42:{P(a);break b}default:{d=47;break a}}while(0);f=c[61]|0;e=f+2|0;c[61]=e}while(f>>>0<(c[62]|0)>>>0);return d|0}function J(a){a=a|0;var d=0,e=0,f=0,g=0;g=c[62]|0;d=c[61]|0;while(1){f=d+2|0;if(d>>>0>=g>>>0){d=9;break}e=b[f>>1]|0;if(e<<16>>16==a<<16>>16){d=10;break}if(e<<16>>16==92){e=d+4|0;if((b[e>>1]|0)==13){d=d+6|0;d=(b[d>>1]|0)==10?d:e}else d=e}else if(oa(e)|0){d=9;break}else d=f}if((d|0)==9){c[61]=f;ja()}else if((d|0)==10)c[61]=f;return}function K(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0;g=c[55]|0;c[55]=g+32;h=c[51]|0;c[((h|0)==0?188:h+28|0)>>2]=g;c[52]=h;c[51]=g;c[g+8>>2]=b;if(2==(f|0))b=e;else b=1==(f|0)?e+2|0:0;c[g+12>>2]=b;c[g>>2]=d;c[g+4>>2]=e;c[g+16>>2]=0;c[g+20>>2]=f;a[g+24>>0]=1==(f|0)&1;c[g+28>>2]=0;return}function L(){var a=0,d=0,e=0;e=c[62]|0;d=c[61]|0;a:while(1){a=d+2|0;if(d>>>0>=e>>>0){d=6;break}switch(b[a>>1]|0){case 13:case 10:{d=6;break a}case 93:{d=7;break a}case 92:{a=d+4|0;break}default:{}}d=a}if((d|0)==6){c[61]=a;ja();a=0}else if((d|0)==7){c[61]=a;a=93}return a|0}function M(a,d){a=a|0;d=d|0;var e=0,f=0;e=c[61]|0;f=b[e>>1]|0;if(f<<16>>16==97){c[61]=e+4;e=I(1)|0;a=c[61]|0;if(la(e)|0){J(e);d=(c[61]|0)+2|0;c[61]=d}else{_(e)|0;d=c[61]|0}f=I(1)|0;e=c[61]|0}if((e|0)!=(a|0))Z(a,d);return f|0}function N(){var a=0,d=0,e=0;a:while(1){a=c[61]|0;d=a+2|0;c[61]=d;if(a>>>0>=(c[62]|0)>>>0){e=7;break}switch(b[d>>1]|0){case 13:case 10:{e=7;break a}case 47:break a;case 91:{L()|0;break}case 92:{c[61]=a+4;break}default:{}}}if((e|0)==7)ja();return}function O(a){a=a|0;switch(b[a>>1]|0){case 62:{a=(b[a+-2>>1]|0)==61;break}case 41:case 59:{a=1;break}case 104:{a=V(a+-2|0,160,4)|0;break}case 121:{a=V(a+-2|0,168,6)|0;break}case 101:{a=V(a+-2|0,180,3)|0;break}default:a=0}return a|0}function P(a){a=a|0;var d=0,e=0,f=0,g=0,h=0;g=(c[61]|0)+2|0;c[61]=g;e=c[62]|0;while(1){d=g+2|0;if(g>>>0>=e>>>0)break;f=b[d>>1]|0;if(!a?oa(f)|0:0)break;if(f<<16>>16==42?(b[g+4>>1]|0)==47:0){h=8;break}g=d}if((h|0)==8){c[61]=d;d=g+4|0}c[61]=d;return}function Q(b,c,d){b=b|0;c=c|0;d=d|0;var e=0,f=0;a:do if(!d)b=0;else{while(1){e=a[b>>0]|0;f=a[c>>0]|0;if(e<<24>>24!=f<<24>>24)break;d=d+-1|0;if(!d){b=0;break a}else{b=b+1|0;c=c+1|0}}b=(e&255)-(f&255)|0}while(0);return b|0}function S(a){a=a|0;a:do switch(a<<16>>16){case 38:case 37:case 33:{a=1;break}default:if((a&-8)<<16>>16==40|(a+-58&65535)<6)a=1;else{switch(a<<16>>16){case 91:case 93:case 94:{a=1;break a}default:{}}a=(a+-123&65535)<4}}while(0);return a|0}function T(a){a=a|0;a:do switch(a<<16>>16){case 38:case 37:case 33:break;default:if(!((a+-58&65535)<6|(a+-40&65535)<7&a<<16>>16!=41)){switch(a<<16>>16){case 91:case 94:break a;default:{}}return a<<16>>16!=125&(a+-123&65535)<4|0}}while(0);return 1}function U(a){a=a|0;var d=0,e=0,f=0,g=0;e=v;v=v+16|0;f=e;c[f>>2]=0;c[54]=a;d=c[3]|0;g=d+(a<<1)|0;a=g+2|0;b[g>>1]=0;c[f>>2]=a;c[55]=a;c[47]=0;c[51]=0;c[49]=0;c[48]=0;c[53]=0;c[50]=0;v=e;return d|0}function V(a,d,e){a=a|0;d=d|0;e=e|0;var f=0,g=0;f=a+(0-e<<1)|0;g=f+2|0;a=c[3]|0;if(g>>>0>=a>>>0?(Q(g,d,e<<1)|0)==0:0)if((g|0)==(a|0))a=1;else a=X(b[f>>1]|0)|0;else a=0;return a|0}function W(a,d){a=a|0;d=d|0;var e=0;e=c[3]|0;if(e>>>0<=a>>>0?(b[a>>1]|0)==d<<16>>16:0)if((e|0)==(a|0))e=1;else e=X(b[a+-2>>1]|0)|0;else e=0;return e|0}function X(a){a=a|0;a:do if((a+-9&65535)<5)a=1;else{switch(a<<16>>16){case 32:case 160:{a=1;break a}default:{}}a=a<<16>>16!=46&(S(a)|0)}while(0);return a|0}function Y(){var a=0,d=0,e=0;a=c[62]|0;e=c[61]|0;a:while(1){d=e+2|0;if(e>>>0>=a>>>0)break;switch(b[d>>1]|0){case 13:case 10:break a;default:e=d}}c[61]=d;return}function Z(a,b){a=a|0;b=b|0;var d=0,e=0;d=c[55]|0;c[55]=d+12;e=c[53]|0;c[((e|0)==0?192:e+8|0)>>2]=d;c[53]=d;c[d>>2]=a;c[d+4>>2]=b;c[d+8>>2]=0;return}function _(a){a=a|0;while(1){if(ka(a)|0)break;if(S(a)|0)break;a=(c[61]|0)+2|0;c[61]=a;a=b[a>>1]|0;if(!(a<<16>>16)){a=0;break}}return a|0}function $(){var a=0;a=c[(c[49]|0)+20>>2]|0;switch(a|0){case 1:{a=-1;break}case 2:{a=-2;break}default:a=a-(c[3]|0)>>1}return a|0}function aa(a){a=a|0;if(!(V(a,140,5)|0)?!(V(a,150,3)|0):0)a=V(a,156,2)|0;else a=1;return a|0}function ba(a){a=a|0;switch(a<<16>>16){case 160:case 32:case 12:case 11:case 9:{a=1;break}default:a=0}return a|0}function ca(a){a=a|0;if((c[3]|0)==(a|0))a=1;else a=X(b[a+-2>>1]|0)|0;return a|0}function da(){var a=0;a=c[(c[49]|0)+12>>2]|0;if(!a)a=-1;else a=a-(c[3]|0)>>1;return a|0}function ea(){var a=0;a=c[(c[49]|0)+16>>2]|0;if(!a)a=-1;else a=a-(c[3]|0)>>1;return a|0}function fa(){var a=0;a=c[(c[49]|0)+4>>2]|0;if(!a)a=-1;else a=a-(c[3]|0)>>1;return a|0}function ga(){var a=0;a=c[49]|0;a=c[((a|0)==0?188:a+28|0)>>2]|0;c[49]=a;return (a|0)!=0|0}function ha(){var a=0;a=c[50]|0;a=c[((a|0)==0?192:a+8|0)>>2]|0;c[50]=a;return (a|0)!=0|0}function ia(a){a=a|0;var b=0;b=v;v=v+a|0;v=v+15&-16;return b|0}function ja(){a[762]=1;c[56]=(c[61]|0)-(c[3]|0)>>1;c[61]=(c[62]|0)+2;return}function ka(a){a=a|0;return (a|128)<<16>>16==160|(a+-9&65535)<5|0}function la(a){a=a|0;return a<<16>>16==39|a<<16>>16==34|0}function ma(){return (c[(c[49]|0)+8>>2]|0)-(c[3]|0)>>1|0}function na(){return (c[(c[50]|0)+4>>2]|0)-(c[3]|0)>>1|0}function oa(a){a=a|0;return a<<16>>16==13|a<<16>>16==10|0}function pa(){return (c[c[49]>>2]|0)-(c[3]|0)>>1|0}function qa(){return (c[c[50]>>2]|0)-(c[3]|0)>>1|0}function ra(){return d[(c[49]|0)+24>>0]|0|0}function sa(a){a=a|0;c[3]=a;return}function va(){return (a[763]|0)!=0|0}function za(){return c[56]|0}return{ai:ea,e:za,ee:na,es:qa,f:va,id:$,ie:fa,ip:ra,is:pa,p:z,re:ha,ri:ga,sa:U,se:da,ses:sa,ss:ma,sta:ia}}
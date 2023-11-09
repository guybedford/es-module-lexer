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
const words = 'xportmportlassetaromsyncunctionssertvoyiedelecontininstantybreareturdebuggeawaithrwhileforifcatcfinallels';

let source, name;
export function parse (_source, _name = '@') {
  source = _source;
  name = _name;
  // 2 bytes per string code point
  // + analysis space (2^17)
  // remaining space is EMCC stack space (2^17)
  const memBound = source.length * 2 + (2 << 18);
  if (memBound > allocSize || !asm) {
    while (memBound > allocSize) allocSize *= 2;
    asmBuffer = new ArrayBuffer(allocSize);
    copy(words, new Uint16Array(asmBuffer, 16, words.length));
    asm = asmInit(typeof self !== 'undefined' ? self : global, {}, asmBuffer);
    // lexer.c bulk allocates string space + analysis space
    addr = asm.su(allocSize - (2<<17));
  }
  const len = source.length + 1;
  asm.ses(addr);
  asm.sa(len - 1);

  copy(source, new Uint16Array(asmBuffer, addr, len));

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
    const s = asm.es(), e = asm.ee(), ls = asm.els(), le = asm.ele();
    const ch = source.charCodeAt(s);
    const lch = ls >= 0 ? source.charCodeAt(ls) : -1;
    exports.push({
      s, e, ls, le,
      n: (ch === 34 || ch === 39) ? readString(s + 1, ch) : source.slice(s, e),
      ln: ls < 0 ? undefined : (lch === 34 || lch === 39) ? readString(ls + 1, lch) : source.slice(ls, le),
    });
  }

  return [imports, exports, !!asm.f(), !!asm.ms()];
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
  throw Object.assign(new Error(`Parse error ${name}:${source.slice(0, acornPos).split('\n').length}:${acornPos - source.lastIndexOf('\n', acornPos - 1)}`), { idx: acornPos });
}

// function asmInit () { ... } from lib/lexer.asm.js is concatenated at the end here
function asmInit(global,env,buffer) {
"use asm";var a=new global.Int8Array(buffer),b=new global.Int16Array(buffer),c=new global.Int32Array(buffer),d=new global.Uint8Array(buffer),e=new global.Uint16Array(buffer),v=1024;function z(){var d=0,f=0,g=0,h=0,i=0,j=0,k=0;k=v;v=v+10240|0;a[796]=1;a[795]=0;b[395]=0;b[396]=0;c[67]=c[2];a[797]=0;c[66]=0;a[794]=0;c[68]=k+2048;c[69]=k;a[798]=0;d=(c[3]|0)+-2|0;c[70]=d;f=d+(c[64]<<1)|0;c[71]=f;a:while(1){g=d+2|0;c[70]=g;if(d>>>0>=f>>>0){j=18;break}b:do switch(b[g>>1]|0){case 9:case 10:case 11:case 12:case 13:case 32:break;case 101:{if((((b[396]|0)==0?fa(g)|0:0)?(Q(d+4|0,16,10)|0)==0:0)?(B(),(a[796]|0)==0):0){j=9;break a}else j=17;break}case 105:{if(fa(g)|0?(Q(d+4|0,26,10)|0)==0:0){C();j=17}else j=17;break}case 59:{j=17;break}case 47:switch(b[d+4>>1]|0){case 47:{$();break b}case 42:{P(1);break b}default:{j=16;break a}}default:{j=16;break a}}while(0);if((j|0)==17){j=0;c[67]=c[70]}d=c[70]|0;f=c[71]|0}if((j|0)==9){d=c[70]|0;c[67]=d;j=19}else if((j|0)==16){a[796]=0;c[70]=d;j=19}else if((j|0)==18)if(!(a[794]|0)){d=g;j=19}else d=0;do if((j|0)==19){c:while(1){f=d+2|0;c[70]=f;i=f;if(d>>>0>=(c[71]|0)>>>0){j=82;break}d:do switch(b[f>>1]|0){case 9:case 10:case 11:case 12:case 13:case 32:break;case 101:{if(((b[396]|0)==0?fa(f)|0:0)?(Q(d+4|0,16,10)|0)==0:0){B();j=81}else j=81;break}case 105:{if(fa(f)|0?(Q(d+4|0,26,10)|0)==0:0){C();j=81}else j=81;break}case 99:{if((fa(f)|0?(Q(d+4|0,36,8)|0)==0:0)?pa(b[d+12>>1]|0)|0:0){a[798]=1;j=81}else j=81;break}case 40:{i=c[68]|0;g=b[396]|0;j=g&65535;c[i+(j<<3)>>2]=1;h=c[67]|0;b[396]=g+1<<16>>16;c[i+(j<<3)+4>>2]=h;j=81;break}case 41:{f=b[396]|0;if(!(f<<16>>16)){j=36;break c}j=f+-1<<16>>16;b[396]=j;h=b[395]|0;f=h&65535;if(h<<16>>16!=0?(c[(c[68]|0)+((j&65535)<<3)>>2]|0)==5:0){f=c[(c[69]|0)+(f+-1<<2)>>2]|0;g=f+4|0;if(!(c[g>>2]|0))c[g>>2]=i;c[f+12>>2]=d+4;b[395]=h+-1<<16>>16;j=81}else j=81;break}case 123:{j=c[67]|0;i=c[61]|0;d=j;do if((b[j>>1]|0)==41&(i|0)!=0?(c[i+4>>2]|0)==(j|0):0){f=c[62]|0;c[61]=f;if(!f){c[57]=0;break}else{c[f+28>>2]=0;break}}while(0);i=c[68]|0;h=b[396]|0;j=h&65535;c[i+(j<<3)>>2]=(a[798]|0)==0?2:6;b[396]=h+1<<16>>16;c[i+(j<<3)+4>>2]=d;a[798]=0;j=81;break}case 125:{d=b[396]|0;if(!(d<<16>>16)){j=49;break c}i=c[68]|0;j=d+-1<<16>>16;b[396]=j;if((c[i+((j&65535)<<3)>>2]|0)==4){H();j=81}else j=81;break}case 39:{J(39);j=81;break}case 34:{J(34);j=81;break}case 47:switch(b[d+4>>1]|0){case 47:{$();break d}case 42:{P(1);break d}default:{d=c[67]|0;h=b[d>>1]|0;e:do if(!(T(h)|0)){switch(h<<16>>16){case 41:if(ca(c[(c[68]|0)+(e[396]<<3)+4>>2]|0)|0){j=69;break e}else{j=66;break e}case 125:break;default:{j=66;break e}}f=c[68]|0;g=e[396]|0;if(!(O(c[f+(g<<3)+4>>2]|0)|0)?(c[f+(g<<3)>>2]|0)!=6:0)j=66;else j=69}else switch(h<<16>>16){case 46:if(((b[d+-2>>1]|0)+-48&65535)<10){j=66;break e}else{j=69;break e}case 43:if((b[d+-2>>1]|0)==43){j=66;break e}else{j=69;break e}case 45:if((b[d+-2>>1]|0)==45){j=66;break e}else{j=69;break e}default:{j=69;break e}}while(0);f:do if((j|0)==66){j=0;if(!(E(d)|0)){switch(h<<16>>16){case 0:{j=69;break f}case 47:{if(a[797]|0){j=69;break f}break}default:{}}g=c[3]|0;f=h;do{if(d>>>0<=g>>>0)break;d=d+-2|0;c[67]=d;f=b[d>>1]|0}while(!(_(f)|0));if(da(f)|0){do{if(d>>>0<=g>>>0)break;d=d+-2|0;c[67]=d}while(da(b[d>>1]|0)|0);if(Y(d)|0){N();a[797]=0;j=81;break d}else d=1}else d=1}else j=69}while(0);if((j|0)==69){N();d=0}a[797]=d;j=81;break d}}case 96:{i=c[68]|0;h=b[396]|0;j=h&65535;c[i+(j<<3)+4>>2]=c[67];b[396]=h+1<<16>>16;c[i+(j<<3)>>2]=3;H();j=81;break}default:j=81}while(0);if((j|0)==81){j=0;c[67]=c[70]}d=c[70]|0}if((j|0)==36){oa();d=0;break}else if((j|0)==49){oa();d=0;break}else if((j|0)==82){d=(a[794]|0)==0?(b[395]|b[396])<<16>>16==0:0;break}}while(0);v=k;return d|0}function B(){var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;k=c[70]|0;l=c[63]|0;q=k+12|0;c[70]=q;f=I(1)|0;d=c[70]|0;if(!((d|0)==(q|0)?!(S(f)|0):0))p=3;a:do if((p|0)==3){b:do switch(f<<16>>16){case 123:{c[70]=d+2;d=I(1)|0;e=c[70]|0;while(1){if(qa(d)|0){J(d);d=(c[70]|0)+2|0;c[70]=d}else{aa(d)|0;d=c[70]|0}I(1)|0;d=K(e,d)|0;if(d<<16>>16==44){c[70]=(c[70]|0)+2;d=I(1)|0}if(d<<16>>16==125){p=15;break}q=e;e=c[70]|0;if((e|0)==(q|0)){p=12;break}if(e>>>0>(c[71]|0)>>>0){p=14;break}}if((p|0)==12){oa();break a}else if((p|0)==14){oa();break a}else if((p|0)==15){a[795]=1;c[70]=(c[70]|0)+2;break b}break}case 42:{c[70]=d+2;I(1)|0;q=c[70]|0;K(q,q)|0;break}default:{a[796]=0;switch(f<<16>>16){case 100:{k=d+14|0;c[70]=k;switch((I(1)|0)<<16>>16){case 97:{e=c[70]|0;if((Q(e+2|0,56,8)|0)==0?(h=e+10|0,da(b[h>>1]|0)|0):0){c[70]=h;I(0)|0;p=22}break}case 102:{p=22;break}case 99:{e=c[70]|0;if(((Q(e+2|0,36,8)|0)==0?(g=e+10|0,q=b[g>>1]|0,pa(q)|0|q<<16>>16==123):0)?(c[70]=g,i=I(1)|0,i<<16>>16!=123):0){o=i;p=31}break}default:{}}c:do if((p|0)==22?(j=c[70]|0,(Q(j+2|0,64,14)|0)==0):0){f=j+16|0;e=b[f>>1]|0;if(!(pa(e)|0))switch(e<<16>>16){case 40:case 42:break;default:break c}c[70]=f;e=I(1)|0;if(e<<16>>16==42){c[70]=(c[70]|0)+2;e=I(1)|0}if(e<<16>>16!=40){o=e;p=31}}while(0);if((p|0)==31?(m=c[70]|0,aa(o)|0,n=c[70]|0,n>>>0>m>>>0):0){W(d,k,m,n);c[70]=(c[70]|0)+-2;break a}W(d,k,0,0);c[70]=d+12;break a}case 97:{c[70]=d+10;I(0)|0;d=c[70]|0;p=35;break}case 102:{p=35;break}case 99:{if((Q(d+2|0,36,8)|0)==0?(e=d+10|0,_(b[e>>1]|0)|0):0){c[70]=e;q=I(1)|0;p=c[70]|0;aa(q)|0;q=c[70]|0;W(p,q,p,q);c[70]=(c[70]|0)+-2;break a}d=d+4|0;c[70]=d;break}case 108:case 118:break;default:break a}if((p|0)==35){c[70]=d+16;d=I(1)|0;if(d<<16>>16==42){c[70]=(c[70]|0)+2;d=I(1)|0}p=c[70]|0;aa(d)|0;q=c[70]|0;W(p,q,p,q);c[70]=(c[70]|0)+-2;break a}c[70]=d+6;a[796]=0;f=I(1)|0;d=c[70]|0;f=(aa(f)|0|32)<<16>>16==123;g=c[70]|0;if(f){c[70]=g+2;q=I(1)|0;d=c[70]|0;aa(q)|0}d:while(1){e=c[70]|0;if((e|0)==(d|0))break;W(d,e,d,e);e=I(1)|0;if(f)switch(e<<16>>16){case 93:case 125:break a;default:{}}d=c[70]|0;if(e<<16>>16!=44){p=51;break}c[70]=d+2;e=I(1)|0;d=c[70]|0;switch(e<<16>>16){case 91:case 123:{p=51;break d}default:{}}aa(e)|0}if((p|0)==51)c[70]=d+-2;if(!f)break a;c[70]=g+-2;break a}}while(0);q=(I(1)|0)<<16>>16==102;d=c[70]|0;if(q?(Q(d+2|0,50,6)|0)==0:0){c[70]=d+8;D(k,I(1)|0);d=(l|0)==0?232:l+16|0;while(1){d=c[d>>2]|0;if(!d)break a;c[d+12>>2]=0;c[d+8>>2]=0;d=d+16|0}}c[70]=d+-2}while(0);return}function C(){var d=0,e=0,f=0,g=0,h=0,i=0;h=c[70]|0;d=h+12|0;c[70]=d;a:do switch((I(1)|0)<<16>>16){case 40:{e=c[68]|0;i=b[396]|0;f=i&65535;c[e+(f<<3)>>2]=5;d=c[70]|0;b[396]=i+1<<16>>16;c[e+(f<<3)+4>>2]=d;if((b[c[67]>>1]|0)!=46){c[70]=d+2;i=I(1)|0;L(h,c[70]|0,0,d);e=c[61]|0;f=c[69]|0;h=b[395]|0;b[395]=h+1<<16>>16;c[f+((h&65535)<<2)>>2]=e;switch(i<<16>>16){case 39:{J(39);break}case 34:{J(34);break}default:{c[70]=(c[70]|0)+-2;break a}}d=(c[70]|0)+2|0;c[70]=d;switch((I(1)|0)<<16>>16){case 44:{c[70]=(c[70]|0)+2;I(1)|0;h=c[61]|0;c[h+4>>2]=d;i=c[70]|0;c[h+16>>2]=i;a[h+24>>0]=1;c[70]=i+-2;break a}case 41:{b[396]=(b[396]|0)+-1<<16>>16;i=c[61]|0;c[i+4>>2]=d;c[i+12>>2]=(c[70]|0)+2;a[i+24>>0]=1;b[395]=(b[395]|0)+-1<<16>>16;break a}default:{c[70]=(c[70]|0)+-2;break a}}}break}case 46:{c[70]=(c[70]|0)+2;if((I(1)|0)<<16>>16==109?(e=c[70]|0,(Q(e+2|0,44,6)|0)==0):0){d=c[67]|0;if(!(ea(d)|0)?(b[d>>1]|0)==46:0)break a;L(h,h,e+8|0,2)}break}case 42:case 39:case 34:{g=18;break}case 123:{d=c[70]|0;if(b[396]|0){c[70]=d+-2;break a}while(1){if(d>>>0>=(c[71]|0)>>>0)break;d=I(1)|0;if(!(qa(d)|0)){if(d<<16>>16==125){g=33;break}}else J(d);d=(c[70]|0)+2|0;c[70]=d}if((g|0)==33)c[70]=(c[70]|0)+2;i=(I(1)|0)<<16>>16==102;d=c[70]|0;if(i?Q(d+2|0,50,6)|0:0){oa();break a}c[70]=d+8;d=I(1)|0;if(qa(d)|0){D(h,d);break a}else{oa();break a}}default:if((c[70]|0)==(d|0))c[70]=h+10;else g=18}while(0);do if((g|0)==18){if(b[396]|0){c[70]=(c[70]|0)+-2;break}d=c[71]|0;e=c[70]|0;while(1){if(e>>>0>=d>>>0){g=25;break}f=b[e>>1]|0;if(qa(f)|0){g=23;break}i=e+2|0;c[70]=i;e=i}if((g|0)==23){D(h,f);break}else if((g|0)==25){oa();break}}while(0);return}function D(a,d){a=a|0;d=d|0;var e=0,f=0;e=(c[70]|0)+2|0;switch(d<<16>>16){case 39:{J(39);f=5;break}case 34:{J(34);f=5;break}default:oa()}do if((f|0)==5){L(a,e,c[70]|0,1);c[70]=(c[70]|0)+2;d=I(0)|0;a=d<<16>>16==97;if(a){e=c[70]|0;if(Q(e+2|0,78,10)|0)f=11}else{e=c[70]|0;if(!(((d<<16>>16==119?(b[e+2>>1]|0)==105:0)?(b[e+4>>1]|0)==116:0)?(b[e+6>>1]|0)==104:0))f=11}if((f|0)==11){c[70]=e+-2;break}c[70]=e+((a?6:4)<<1);if((I(1)|0)<<16>>16!=123){c[70]=e;break}a=c[70]|0;d=a;a:while(1){c[70]=d+2;d=I(1)|0;switch(d<<16>>16){case 39:{J(39);c[70]=(c[70]|0)+2;d=I(1)|0;break}case 34:{J(34);c[70]=(c[70]|0)+2;d=I(1)|0;break}default:d=aa(d)|0}if(d<<16>>16!=58){f=20;break}c[70]=(c[70]|0)+2;switch((I(1)|0)<<16>>16){case 39:{J(39);break}case 34:{J(34);break}default:{f=24;break a}}c[70]=(c[70]|0)+2;switch((I(1)|0)<<16>>16){case 125:{f=29;break a}case 44:break;default:{f=28;break a}}c[70]=(c[70]|0)+2;if((I(1)|0)<<16>>16==125){f=29;break}d=c[70]|0}if((f|0)==20){c[70]=e;break}else if((f|0)==24){c[70]=e;break}else if((f|0)==28){c[70]=e;break}else if((f|0)==29){f=c[61]|0;c[f+16>>2]=a;c[f+12>>2]=(c[70]|0)+2;break}}while(0);return}function E(a){a=a|0;a:do switch(b[a>>1]|0){case 100:switch(b[a+-2>>1]|0){case 105:{a=X(a+-4|0,88,2)|0;break a}case 108:{a=X(a+-4|0,92,3)|0;break a}default:{a=0;break a}}case 101:switch(b[a+-2>>1]|0){case 115:switch(b[a+-4>>1]|0){case 108:{a=Z(a+-6|0,101)|0;break a}case 97:{a=Z(a+-6|0,99)|0;break a}default:{a=0;break a}}case 116:{a=X(a+-4|0,98,4)|0;break a}case 117:{a=X(a+-4|0,106,6)|0;break a}default:{a=0;break a}}case 102:{if((b[a+-2>>1]|0)==111?(b[a+-4>>1]|0)==101:0)switch(b[a+-6>>1]|0){case 99:{a=X(a+-8|0,118,6)|0;break a}case 112:{a=X(a+-8|0,130,2)|0;break a}default:{a=0;break a}}else a=0;break}case 107:{a=X(a+-2|0,134,4)|0;break}case 110:{a=a+-2|0;if(Z(a,105)|0)a=1;else a=X(a,142,5)|0;break}case 111:{a=Z(a+-2|0,100)|0;break}case 114:{a=X(a+-2|0,152,7)|0;break}case 116:{a=X(a+-2|0,166,4)|0;break}case 119:switch(b[a+-2>>1]|0){case 101:{a=Z(a+-4|0,110)|0;break a}case 111:{a=X(a+-4|0,174,3)|0;break a}default:{a=0;break a}}default:a=0}while(0);return a|0}function H(){var a=0,d=0,e=0,f=0;d=c[71]|0;e=c[70]|0;a:while(1){a=e+2|0;if(e>>>0>=d>>>0){d=10;break}switch(b[a>>1]|0){case 96:{d=7;break a}case 36:{if((b[e+4>>1]|0)==123){d=6;break a}break}case 92:{a=e+4|0;break}default:{}}e=a}if((d|0)==6){a=e+4|0;c[70]=a;d=c[68]|0;f=b[396]|0;e=f&65535;c[d+(e<<3)>>2]=4;b[396]=f+1<<16>>16;c[d+(e<<3)+4>>2]=a}else if((d|0)==7){c[70]=a;e=c[68]|0;f=(b[396]|0)+-1<<16>>16;b[396]=f;if((c[e+((f&65535)<<3)>>2]|0)!=3)oa()}else if((d|0)==10){c[70]=a;oa()}return}function I(a){a=a|0;var d=0,e=0,f=0;e=c[70]|0;a:do{d=b[e>>1]|0;b:do if(d<<16>>16!=47)if(a)if(pa(d)|0)break;else break a;else if(da(d)|0)break;else break a;else switch(b[e+2>>1]|0){case 47:{$();break b}case 42:{P(a);break b}default:{d=47;break a}}while(0);f=c[70]|0;e=f+2|0;c[70]=e}while(f>>>0<(c[71]|0)>>>0);return d|0}function J(a){a=a|0;var d=0,e=0,f=0,g=0;g=c[71]|0;d=c[70]|0;while(1){f=d+2|0;if(d>>>0>=g>>>0){d=9;break}e=b[f>>1]|0;if(e<<16>>16==a<<16>>16){d=10;break}if(e<<16>>16==92){e=d+4|0;if((b[e>>1]|0)==13){d=d+6|0;d=(b[d>>1]|0)==10?d:e}else d=e}else if(ta(e)|0){d=9;break}else d=f}if((d|0)==9){c[70]=f;oa()}else if((d|0)==10)c[70]=f;return}function K(a,d){a=a|0;d=d|0;var e=0,f=0,g=0,h=0;e=c[70]|0;f=b[e>>1]|0;h=(a|0)==(d|0);g=h?0:a;h=h?0:d;if(f<<16>>16==97){c[70]=e+4;e=I(1)|0;a=c[70]|0;if(qa(e)|0){J(e);d=(c[70]|0)+2|0;c[70]=d}else{aa(e)|0;d=c[70]|0}f=I(1)|0;e=c[70]|0}if((e|0)!=(a|0))W(a,d,g,h);return f|0}function L(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0;g=c[65]|0;c[65]=g+32;h=c[61]|0;c[((h|0)==0?228:h+28|0)>>2]=g;c[62]=h;c[61]=g;c[g+8>>2]=b;if(2==(f|0))b=e;else b=1==(f|0)?e+2|0:0;c[g+12>>2]=b;c[g>>2]=d;c[g+4>>2]=e;c[g+16>>2]=0;c[g+20>>2]=f;a[g+24>>0]=1==(f|0)&1;c[g+28>>2]=0;a[795]=1;return}function M(){var a=0,d=0,e=0;e=c[71]|0;d=c[70]|0;a:while(1){a=d+2|0;if(d>>>0>=e>>>0){d=6;break}switch(b[a>>1]|0){case 13:case 10:{d=6;break a}case 93:{d=7;break a}case 92:{a=d+4|0;break}default:{}}d=a}if((d|0)==6){c[70]=a;oa();a=0}else if((d|0)==7){c[70]=a;a=93}return a|0}function N(){var a=0,d=0,e=0;a:while(1){a=c[70]|0;d=a+2|0;c[70]=d;if(a>>>0>=(c[71]|0)>>>0){e=7;break}switch(b[d>>1]|0){case 13:case 10:{e=7;break a}case 47:break a;case 91:{M()|0;break}case 92:{c[70]=a+4;break}default:{}}}if((e|0)==7)oa();return}function O(a){a=a|0;switch(b[a>>1]|0){case 62:{a=(b[a+-2>>1]|0)==61;break}case 41:case 59:{a=1;break}case 104:{a=X(a+-2|0,200,4)|0;break}case 121:{a=X(a+-2|0,208,6)|0;break}case 101:{a=X(a+-2|0,220,3)|0;break}default:a=0}return a|0}function P(a){a=a|0;var d=0,e=0,f=0,g=0,h=0;g=(c[70]|0)+2|0;c[70]=g;e=c[71]|0;while(1){d=g+2|0;if(g>>>0>=e>>>0)break;f=b[d>>1]|0;if(!a?ta(f)|0:0)break;if(f<<16>>16==42?(b[g+4>>1]|0)==47:0){h=8;break}g=d}if((h|0)==8){c[70]=d;d=g+4|0}c[70]=d;return}function Q(b,c,d){b=b|0;c=c|0;d=d|0;var e=0,f=0;a:do if(!d)b=0;else{while(1){e=a[b>>0]|0;f=a[c>>0]|0;if(e<<24>>24!=f<<24>>24)break;d=d+-1|0;if(!d){b=0;break a}else{b=b+1|0;c=c+1|0}}b=(e&255)-(f&255)|0}while(0);return b|0}function S(a){a=a|0;a:do switch(a<<16>>16){case 38:case 37:case 33:{a=1;break}default:if((a&-8)<<16>>16==40|(a+-58&65535)<6)a=1;else{switch(a<<16>>16){case 91:case 93:case 94:{a=1;break a}default:{}}a=(a+-123&65535)<4}}while(0);return a|0}function T(a){a=a|0;a:do switch(a<<16>>16){case 38:case 37:case 33:break;default:if(!((a+-58&65535)<6|(a+-40&65535)<7&a<<16>>16!=41)){switch(a<<16>>16){case 91:case 94:break a;default:{}}return a<<16>>16!=125&(a+-123&65535)<4|0}}while(0);return 1}function U(a){a=a|0;var c=0;c=b[a>>1]|0;a:do if((c+-9&65535)>=5){switch(c<<16>>16){case 160:case 32:{c=1;break a}default:{}}if(S(c)|0)return c<<16>>16!=46|(ea(a)|0)|0;else c=0}else c=1;while(0);return c|0}function V(a){a=a|0;var d=0,e=0,f=0,g=0;e=v;v=v+16|0;f=e;c[f>>2]=0;c[64]=a;d=c[3]|0;g=d+(a<<1)|0;a=g+2|0;b[g>>1]=0;c[f>>2]=a;c[65]=a;c[57]=0;c[61]=0;c[59]=0;c[58]=0;c[63]=0;c[60]=0;v=e;return d|0}function W(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0;g=c[65]|0;c[65]=g+20;h=c[63]|0;c[((h|0)==0?232:h+16|0)>>2]=g;c[63]=g;c[g>>2]=b;c[g+4>>2]=d;c[g+8>>2]=e;c[g+12>>2]=f;c[g+16>>2]=0;a[795]=1;return}function X(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0;e=a+(0-d<<1)|0;f=e+2|0;a=c[3]|0;if(f>>>0>=a>>>0?(Q(f,b,d<<1)|0)==0:0)if((f|0)==(a|0))a=1;else a=U(e)|0;else a=0;return a|0}function Y(a){a=a|0;switch(b[a>>1]|0){case 107:{a=X(a+-2|0,134,4)|0;break}case 101:{if((b[a+-2>>1]|0)==117)a=X(a+-4|0,106,6)|0;else a=0;break}default:a=0}return a|0}function Z(a,d){a=a|0;d=d|0;var e=0;e=c[3]|0;if(e>>>0<=a>>>0?(b[a>>1]|0)==d<<16>>16:0)if((e|0)==(a|0))e=1;else e=_(b[a+-2>>1]|0)|0;else e=0;return e|0}function _(a){a=a|0;a:do if((a+-9&65535)<5)a=1;else{switch(a<<16>>16){case 32:case 160:{a=1;break a}default:{}}a=a<<16>>16!=46&(S(a)|0)}while(0);return a|0}function $(){var a=0,d=0,e=0;a=c[71]|0;e=c[70]|0;a:while(1){d=e+2|0;if(e>>>0>=a>>>0)break;switch(b[d>>1]|0){case 13:case 10:break a;default:e=d}}c[70]=d;return}function aa(a){a=a|0;while(1){if(pa(a)|0)break;if(S(a)|0)break;a=(c[70]|0)+2|0;c[70]=a;a=b[a>>1]|0;if(!(a<<16>>16)){a=0;break}}return a|0}function ba(){var a=0;a=c[(c[59]|0)+20>>2]|0;switch(a|0){case 1:{a=-1;break}case 2:{a=-2;break}default:a=a-(c[3]|0)>>1}return a|0}function ca(a){a=a|0;if(!(X(a,180,5)|0)?!(X(a,190,3)|0):0)a=X(a,196,2)|0;else a=1;return a|0}function da(a){a=a|0;switch(a<<16>>16){case 160:case 32:case 12:case 11:case 9:{a=1;break}default:a=0}return a|0}function ea(a){a=a|0;if((b[a>>1]|0)==46?(b[a+-2>>1]|0)==46:0)a=(b[a+-4>>1]|0)==46;else a=0;return a|0}function fa(a){a=a|0;if((c[3]|0)==(a|0))a=1;else a=U(a+-2|0)|0;return a|0}function ga(){var a=0;a=c[(c[60]|0)+12>>2]|0;if(!a)a=-1;else a=a-(c[3]|0)>>1;return a|0}function ha(){var a=0;a=c[(c[59]|0)+12>>2]|0;if(!a)a=-1;else a=a-(c[3]|0)>>1;return a|0}function ia(){var a=0;a=c[(c[60]|0)+8>>2]|0;if(!a)a=-1;else a=a-(c[3]|0)>>1;return a|0}function ja(){var a=0;a=c[(c[59]|0)+16>>2]|0;if(!a)a=-1;else a=a-(c[3]|0)>>1;return a|0}function ka(){var a=0;a=c[(c[59]|0)+4>>2]|0;if(!a)a=-1;else a=a-(c[3]|0)>>1;return a|0}function la(){var a=0;a=c[59]|0;a=c[((a|0)==0?228:a+28|0)>>2]|0;c[59]=a;return (a|0)!=0|0}function ma(){var a=0;a=c[60]|0;a=c[((a|0)==0?232:a+16|0)>>2]|0;c[60]=a;return (a|0)!=0|0}function oa(){a[794]=1;c[66]=(c[70]|0)-(c[3]|0)>>1;c[70]=(c[71]|0)+2;return}function pa(a){a=a|0;return (a|128)<<16>>16==160|(a+-9&65535)<5|0}function qa(a){a=a|0;return a<<16>>16==39|a<<16>>16==34|0}function ra(){return (c[(c[59]|0)+8>>2]|0)-(c[3]|0)>>1|0}function sa(){return (c[(c[60]|0)+4>>2]|0)-(c[3]|0)>>1|0}function ta(a){a=a|0;return a<<16>>16==13|a<<16>>16==10|0}function ua(){return (c[c[59]>>2]|0)-(c[3]|0)>>1|0}function va(){return (c[c[60]>>2]|0)-(c[3]|0)>>1|0}function wa(){return d[(c[59]|0)+24>>0]|0|0}function xa(a){a=a|0;c[3]=a;return}function Aa(){return (a[795]|0)!=0|0}function Ba(){return (a[796]|0)!=0|0}function Fa(){return c[66]|0}  function su(a) {
		a = a | 0;
		v = a + 992 + 15 & -16;
		return 992;
	}
	return {
		su,ai:ja,e:Fa,ee:sa,ele:ga,els:ia,es:va,f:Ba,id:ba,ie:ka,ip:wa,is:ua,ms:Aa,p:z,re:ma,ri:la,sa:V,se:ha,ses:xa,ss:ra}}
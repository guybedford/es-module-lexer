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

const words = 'xportmportlassforetaourceeferromsyncunctionssertvoyiedelecontininstantybreareturdebuggeawaithrwhileifcatcfinallels';

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
    const s = asm.is(), e = asm.ie(), a = asm.ai(), d = asm.id(), ss = asm.ss(), se = asm.se(), t = asm.it();
    let n;
    if (asm.ip())
      n = readString(d === -1 ? s : s + 1, source.charCodeAt(d === -1 ? s - 1 : s));
    imports.push({ t, n, s, e, ss, se, d, a });
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
"use asm";var a=new global.Int8Array(buffer),b=new global.Int16Array(buffer),c=new global.Int32Array(buffer),d=new global.Uint8Array(buffer),e=new global.Uint16Array(buffer),v=1040;function z(){var d=0,e=0,f=0,g=0,h=0,i=0,j=0;j=v;v=v+10240|0;a[812]=1;a[811]=0;b[403]=0;b[404]=0;c[71]=c[2];a[813]=0;c[70]=0;a[810]=0;c[72]=j+2048;c[73]=j;a[814]=0;d=(c[3]|0)+-2|0;c[74]=d;e=d+(c[68]<<1)|0;c[75]=e;a:while(1){f=d+2|0;c[74]=f;if(d>>>0>=e>>>0){g=18;break}b:do switch(b[f>>1]|0){case 9:case 10:case 11:case 12:case 13:case 32:break;case 101:{if((((b[404]|0)==0?fa(f)|0:0)?(Q(d+4|0,16,10)|0)==0:0)?(B(),(a[812]|0)==0):0){g=9;break a}else g=17;break}case 105:{if(fa(f)|0?(Q(d+4|0,26,10)|0)==0:0){C();g=17}else g=17;break}case 59:{g=17;break}case 47:switch(b[d+4>>1]|0){case 47:{$();break b}case 42:{P(1);break b}default:{g=16;break a}}default:{g=16;break a}}while(0);if((g|0)==17){g=0;c[71]=c[74]}d=c[74]|0;e=c[75]|0}if((g|0)==9){d=c[74]|0;c[71]=d;g=19}else if((g|0)==16){a[812]=0;c[74]=d;g=19}else if((g|0)==18)if(!(a[810]|0)){d=f;g=19}else d=0;do if((g|0)==19){c:while(1){e=d+2|0;c[74]=e;if(d>>>0>=(c[75]|0)>>>0){g=92;break}d:do switch(b[e>>1]|0){case 9:case 10:case 11:case 12:case 13:case 32:break;case 101:{if(((b[404]|0)==0?fa(e)|0:0)?(Q(d+4|0,16,10)|0)==0:0){B();g=91}else g=91;break}case 105:{if(fa(e)|0?(Q(d+4|0,26,10)|0)==0:0){C();g=91}else g=91;break}case 99:{if((fa(e)|0?(Q(d+4|0,36,8)|0)==0:0)?pa(b[d+12>>1]|0)|0:0){a[814]=1;g=91}else g=91;break}case 40:{f=c[72]|0;d=b[404]|0;g=d&65535;c[f+(g<<3)>>2]=1;e=c[71]|0;b[404]=d+1<<16>>16;c[f+(g<<3)+4>>2]=e;g=91;break}case 41:{e=b[404]|0;if(!(e<<16>>16)){g=36;break c}f=e+-1<<16>>16;b[404]=f;g=b[403]|0;e=g&65535;if(g<<16>>16!=0?(c[(c[72]|0)+((f&65535)<<3)>>2]|0)==5:0){e=c[(c[73]|0)+(e+-1<<2)>>2]|0;f=e+4|0;if(!(c[f>>2]|0))c[f>>2]=(c[71]|0)+2;c[e+12>>2]=d+4;b[403]=g+-1<<16>>16;g=91}else g=91;break}case 123:{g=c[71]|0;f=c[65]|0;d=g;do if((b[g>>1]|0)==41&(f|0)!=0?(c[f+4>>2]|0)==(g|0):0){e=c[66]|0;c[65]=e;if(!e){c[61]=0;break}else{c[e+32>>2]=0;break}}while(0);f=c[72]|0;e=b[404]|0;g=e&65535;c[f+(g<<3)>>2]=(a[814]|0)==0?2:6;b[404]=e+1<<16>>16;c[f+(g<<3)+4>>2]=d;a[814]=0;g=91;break}case 125:{d=b[404]|0;if(!(d<<16>>16)){g=49;break c}f=c[72]|0;g=d+-1<<16>>16;b[404]=g;if((c[f+((g&65535)<<3)>>2]|0)==4){H();g=91}else g=91;break}case 39:{K(39);g=91;break}case 34:{K(34);g=91;break}case 47:switch(b[d+4>>1]|0){case 47:{$();break d}case 42:{P(1);break d}default:{d=c[71]|0;e=b[d>>1]|0;e:do if(!(T(e)|0))if(e<<16>>16==41){f=b[404]|0;if(!(ca(c[(c[72]|0)+((f&65535)<<3)+4>>2]|0)|0))g=65}else g=64;else switch(e<<16>>16){case 46:if(((b[d+-2>>1]|0)+-48&65535)<10){g=64;break e}else break e;case 43:if((b[d+-2>>1]|0)==43){g=64;break e}else break e;case 45:if((b[d+-2>>1]|0)==45){g=64;break e}else break e;default:break e}while(0);if((g|0)==64){f=b[404]|0;g=65}f:do if((g|0)==65){g=0;if(f<<16>>16!=0?(h=c[72]|0,i=(f&65535)+-1|0,e<<16>>16==102?(c[h+(i<<3)>>2]|0)==1:0):0){if((b[d+-2>>1]|0)==111?X(c[h+(i<<3)+4>>2]|0,44,3)|0:0)break}else g=69;if((g|0)==69?(0,e<<16>>16==125):0){g=c[72]|0;f=f&65535;if(O(c[g+(f<<3)+4>>2]|0)|0)break;if((c[g+(f<<3)>>2]|0)==6)break}if(!(E(d)|0)){switch(e<<16>>16){case 0:break f;case 47:{if(a[813]|0)break f;break}default:{}}g=c[67]|0;if((g|0?d>>>0>=(c[g>>2]|0)>>>0:0)?d>>>0<=(c[g+4>>2]|0)>>>0:0){N();a[813]=0;g=91;break d}f=c[3]|0;do{if(d>>>0<=f>>>0)break;d=d+-2|0;c[71]=d;e=b[d>>1]|0}while(!(_(e)|0));if(da(e)|0){do{if(d>>>0<=f>>>0)break;d=d+-2|0;c[71]=d}while(da(b[d>>1]|0)|0);if(Y(d)|0){N();a[813]=0;g=91;break d}}a[813]=1;g=91;break d}}while(0);N();a[813]=0;g=91;break d}}case 96:{f=c[72]|0;e=b[404]|0;g=e&65535;c[f+(g<<3)+4>>2]=c[71];b[404]=e+1<<16>>16;c[f+(g<<3)>>2]=3;H();g=91;break}default:g=91}while(0);if((g|0)==91){g=0;c[71]=c[74]}d=c[74]|0}if((g|0)==36){oa();d=0;break}else if((g|0)==49){oa();d=0;break}else if((g|0)==92){d=(a[810]|0)==0?(b[403]|b[404])<<16>>16==0:0;break}}while(0);v=j;return d|0}function B(){var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;k=c[74]|0;l=c[67]|0;q=k+12|0;c[74]=q;f=I(1)|0;d=c[74]|0;if(!((d|0)==(q|0)?!(S(f)|0):0))p=3;a:do if((p|0)==3){b:do switch(f<<16>>16){case 123:{c[74]=d+2;d=I(1)|0;e=c[74]|0;while(1){if(qa(d)|0){K(d);d=(c[74]|0)+2|0;c[74]=d}else{aa(d)|0;d=c[74]|0}I(1)|0;d=L(e,d)|0;if(d<<16>>16==44){c[74]=(c[74]|0)+2;d=I(1)|0}if(d<<16>>16==125){p=15;break}q=e;e=c[74]|0;if((e|0)==(q|0)){p=12;break}if(e>>>0>(c[75]|0)>>>0){p=14;break}}if((p|0)==12){oa();break a}else if((p|0)==14){oa();break a}else if((p|0)==15){a[811]=1;c[74]=(c[74]|0)+2;break b}break}case 42:{c[74]=d+2;I(1)|0;q=c[74]|0;L(q,q)|0;break}default:{a[812]=0;switch(f<<16>>16){case 100:{k=d+14|0;c[74]=k;switch((I(1)|0)<<16>>16){case 97:{e=c[74]|0;if((Q(e+2|0,80,8)|0)==0?(h=e+10|0,da(b[h>>1]|0)|0):0){c[74]=h;I(0)|0;p=22}break}case 102:{p=22;break}case 99:{e=c[74]|0;if(((Q(e+2|0,36,8)|0)==0?(g=e+10|0,q=b[g>>1]|0,pa(q)|0|q<<16>>16==123):0)?(c[74]=g,i=I(1)|0,i<<16>>16!=123):0){o=i;p=31}break}default:{}}c:do if((p|0)==22?(j=c[74]|0,(Q(j+2|0,88,14)|0)==0):0){f=j+16|0;e=b[f>>1]|0;if(!(pa(e)|0))switch(e<<16>>16){case 40:case 42:break;default:break c}c[74]=f;e=I(1)|0;if(e<<16>>16==42){c[74]=(c[74]|0)+2;e=I(1)|0}if(e<<16>>16!=40){o=e;p=31}}while(0);if((p|0)==31?(m=c[74]|0,aa(o)|0,n=c[74]|0,n>>>0>m>>>0):0){W(d,k,m,n);c[74]=(c[74]|0)+-2;break a}W(d,k,0,0);c[74]=d+12;break a}case 97:{c[74]=d+10;I(0)|0;d=c[74]|0;p=35;break}case 102:{p=35;break}case 99:{if((Q(d+2|0,36,8)|0)==0?(e=d+10|0,_(b[e>>1]|0)|0):0){c[74]=e;q=I(1)|0;p=c[74]|0;aa(q)|0;q=c[74]|0;W(p,q,p,q);c[74]=(c[74]|0)+-2;break a}d=d+4|0;c[74]=d;break}case 108:case 118:break;default:break a}if((p|0)==35){c[74]=d+16;d=I(1)|0;if(d<<16>>16==42){c[74]=(c[74]|0)+2;d=I(1)|0}p=c[74]|0;aa(d)|0;q=c[74]|0;W(p,q,p,q);c[74]=(c[74]|0)+-2;break a}c[74]=d+6;a[812]=0;f=I(1)|0;d=c[74]|0;f=(aa(f)|0|32)<<16>>16==123;g=c[74]|0;if(f){c[74]=g+2;q=I(1)|0;d=c[74]|0;aa(q)|0}d:while(1){e=c[74]|0;if((e|0)==(d|0))break;W(d,e,d,e);e=I(1)|0;if(f)switch(e<<16>>16){case 93:case 125:break a;default:{}}d=c[74]|0;if(e<<16>>16!=44){p=51;break}c[74]=d+2;e=I(1)|0;d=c[74]|0;switch(e<<16>>16){case 91:case 123:{p=51;break d}default:{}}aa(e)|0}if((p|0)==51)c[74]=d+-2;if(!f)break a;c[74]=g+-2;break a}}while(0);q=(I(1)|0)<<16>>16==102;d=c[74]|0;if(q?(Q(d+2|0,74,6)|0)==0:0){c[74]=d+8;D(k,I(1)|0,0);d=(l|0)==0?248:l+16|0;while(1){d=c[d>>2]|0;if(!d)break a;c[d+12>>2]=0;c[d+8>>2]=0;d=d+16|0}}c[74]=d+-2}while(0);return}function C(){var d=0,e=0,f=0,g=0,h=0,i=0,j=0;j=c[74]|0;h=j+12|0;c[74]=h;d=I(1)|0;g=c[74]|0;a:do if(d<<16>>16!=46){if(!(d<<16>>16==115&g>>>0>h>>>0)){if(!(d<<16>>16==100&g>>>0>(j+10|0)>>>0)){g=0;i=28;break}if(Q(g+2|0,66,8)|0){e=g;d=100;g=0;i=59;break}d=g+10|0;if(!(pa(b[d>>1]|0)|0)){e=g;d=100;g=0;i=59;break}c[74]=d;d=I(1)|0;if(d<<16>>16==42){d=42;g=2;i=61;break}c[74]=g;g=0;i=28;break}if((Q(g+2|0,56,10)|0)==0?(f=g+12|0,pa(b[f>>1]|0)|0):0){c[74]=f;d=I(1)|0;e=c[74]|0;if((e|0)!=(f|0)){if(d<<16>>16!=102){g=1;i=28;break}if(Q(e+2|0,74,6)|0){d=102;g=1;i=59;break}if(!(_(b[e+8>>1]|0)|0)){d=102;g=1;i=59;break}}c[74]=g;g=0;i=28}else{e=g;d=115;g=0;i=59}}else{c[74]=g+2;switch((I(1)|0)<<16>>16){case 109:{d=c[74]|0;if(Q(d+2|0,50,6)|0)break a;e=c[71]|0;if(!(ea(e)|0)?(b[e>>1]|0)==46:0)break a;J(j,j,d+8|0,2);break a}case 115:{d=c[74]|0;if(Q(d+2|0,56,10)|0)break a;e=c[71]|0;if(!(ea(e)|0)?(b[e>>1]|0)==46:0)break a;c[74]=d+12;d=I(1)|0;g=1;i=28;break a}case 100:{d=c[74]|0;if(Q(d+2|0,66,8)|0)break a;e=c[71]|0;if(!(ea(e)|0)?(b[e>>1]|0)==46:0)break a;c[74]=d+10;d=I(1)|0;g=2;i=28;break a}default:break a}}while(0);b:do if((i|0)==28){if(d<<16>>16==40){f=c[72]|0;e=b[404]|0;h=e&65535;c[f+(h<<3)>>2]=5;d=c[74]|0;b[404]=e+1<<16>>16;c[f+(h<<3)+4>>2]=d;if((b[c[71]>>1]|0)==46)break;c[74]=d+2;e=I(1)|0;J(j,c[74]|0,0,d);if(!g)d=c[65]|0;else{d=c[65]|0;c[d+28>>2]=(g|0)==1?5:7}h=c[73]|0;j=b[403]|0;b[403]=j+1<<16>>16;c[h+((j&65535)<<2)>>2]=d;switch(e<<16>>16){case 39:{K(39);break}case 34:{K(34);break}default:{c[74]=(c[74]|0)+-2;break b}}d=(c[74]|0)+2|0;c[74]=d;switch((I(1)|0)<<16>>16){case 44:{c[74]=(c[74]|0)+2;I(1)|0;h=c[65]|0;c[h+4>>2]=d;j=c[74]|0;c[h+16>>2]=j;a[h+24>>0]=1;c[74]=j+-2;break b}case 41:{b[404]=(b[404]|0)+-1<<16>>16;j=c[65]|0;c[j+4>>2]=d;c[j+12>>2]=(c[74]|0)+2;a[j+24>>0]=1;b[403]=(b[403]|0)+-1<<16>>16;break b}default:{c[74]=(c[74]|0)+-2;break b}}}if(!((g|0)==0&d<<16>>16==123)){switch(d<<16>>16){case 42:case 39:case 34:{i=61;break b}default:{}}e=c[74]|0;i=59;break}d=c[74]|0;if(b[404]|0){c[74]=d+-2;break}while(1){if(d>>>0>=(c[75]|0)>>>0)break;d=I(1)|0;if(!(qa(d)|0)){if(d<<16>>16==125){i=49;break}}else K(d);d=(c[74]|0)+2|0;c[74]=d}if((i|0)==49)c[74]=(c[74]|0)+2;h=(I(1)|0)<<16>>16==102;d=c[74]|0;if(h?Q(d+2|0,74,6)|0:0){oa();break}c[74]=d+8;d=I(1)|0;if(qa(d)|0){D(j,d,0);break}else{oa();break}}while(0);if((i|0)==59)if((e|0)==(h|0))c[74]=j+10;else i=61;do if((i|0)==61){if(!((d<<16>>16==42|(g|0)!=2)&(b[404]|0)==0)){c[74]=(c[74]|0)+-2;break}d=c[75]|0;e=c[74]|0;while(1){if(e>>>0>=d>>>0){i=68;break}f=b[e>>1]|0;if(qa(f)|0){i=66;break}i=e+2|0;c[74]=i;e=i}if((i|0)==66){D(j,f,g);break}else if((i|0)==68){oa();break}}while(0);return}function D(a,d,e){a=a|0;d=d|0;e=e|0;var f=0,g=0;f=(c[74]|0)+2|0;switch(d<<16>>16){case 39:{K(39);g=5;break}case 34:{K(34);g=5;break}default:oa()}do if((g|0)==5){J(a,f,c[74]|0,1);if((e|0)>0)c[(c[65]|0)+28>>2]=(e|0)==1?4:6;c[74]=(c[74]|0)+2;d=I(0)|0;e=d<<16>>16==97;if(e){f=c[74]|0;if(Q(f+2|0,102,10)|0)g=13}else{f=c[74]|0;if(!(((d<<16>>16==119?(b[f+2>>1]|0)==105:0)?(b[f+4>>1]|0)==116:0)?(b[f+6>>1]|0)==104:0))g=13}if((g|0)==13){c[74]=f+-2;break}c[74]=f+((e?6:4)<<1);if((I(1)|0)<<16>>16!=123){c[74]=f;break}e=c[74]|0;d=e;a:while(1){c[74]=d+2;d=I(1)|0;switch(d<<16>>16){case 39:{K(39);c[74]=(c[74]|0)+2;d=I(1)|0;break}case 34:{K(34);c[74]=(c[74]|0)+2;d=I(1)|0;break}default:d=aa(d)|0}if(d<<16>>16!=58){g=22;break}c[74]=(c[74]|0)+2;switch((I(1)|0)<<16>>16){case 39:{K(39);break}case 34:{K(34);break}default:{g=26;break a}}c[74]=(c[74]|0)+2;switch((I(1)|0)<<16>>16){case 125:{g=31;break a}case 44:break;default:{g=30;break a}}c[74]=(c[74]|0)+2;if((I(1)|0)<<16>>16==125){g=31;break}d=c[74]|0}if((g|0)==22){c[74]=f;break}else if((g|0)==26){c[74]=f;break}else if((g|0)==30){c[74]=f;break}else if((g|0)==31){g=c[65]|0;c[g+16>>2]=e;c[g+12>>2]=(c[74]|0)+2;break}}while(0);return}function E(a){a=a|0;a:do switch(b[a>>1]|0){case 100:switch(b[a+-2>>1]|0){case 105:{a=X(a+-4|0,112,2)|0;break a}case 108:{a=X(a+-4|0,116,3)|0;break a}default:{a=0;break a}}case 101:switch(b[a+-2>>1]|0){case 115:switch(b[a+-4>>1]|0){case 108:{a=Z(a+-6|0,101)|0;break a}case 97:{a=Z(a+-6|0,99)|0;break a}default:{a=0;break a}}case 116:{a=X(a+-4|0,122,4)|0;break a}case 117:{a=X(a+-4|0,130,6)|0;break a}default:{a=0;break a}}case 102:{if((b[a+-2>>1]|0)==111?(b[a+-4>>1]|0)==101:0)switch(b[a+-6>>1]|0){case 99:{a=X(a+-8|0,142,6)|0;break a}case 112:{a=X(a+-8|0,154,2)|0;break a}default:{a=0;break a}}else a=0;break}case 107:{a=X(a+-2|0,158,4)|0;break}case 110:{a=a+-2|0;if(Z(a,105)|0)a=1;else a=X(a,166,5)|0;break}case 111:{a=Z(a+-2|0,100)|0;break}case 114:{a=X(a+-2|0,176,7)|0;break}case 116:{a=X(a+-2|0,190,4)|0;break}case 119:switch(b[a+-2>>1]|0){case 101:{a=Z(a+-4|0,110)|0;break a}case 111:{a=X(a+-4|0,198,3)|0;break a}default:{a=0;break a}}default:a=0}while(0);return a|0}function H(){var a=0,d=0,e=0,f=0;d=c[75]|0;e=c[74]|0;a:while(1){a=e+2|0;if(e>>>0>=d>>>0){d=10;break}switch(b[a>>1]|0){case 96:{d=7;break a}case 36:{if((b[e+4>>1]|0)==123){d=6;break a}break}case 92:{a=e+4|0;break}default:{}}e=a}if((d|0)==6){a=e+4|0;c[74]=a;d=c[72]|0;f=b[404]|0;e=f&65535;c[d+(e<<3)>>2]=4;b[404]=f+1<<16>>16;c[d+(e<<3)+4>>2]=a}else if((d|0)==7){c[74]=a;e=c[72]|0;f=(b[404]|0)+-1<<16>>16;b[404]=f;if((c[e+((f&65535)<<3)>>2]|0)!=3)oa()}else if((d|0)==10){c[74]=a;oa()}return}function I(a){a=a|0;var d=0,e=0,f=0;e=c[74]|0;a:do{d=b[e>>1]|0;b:do if(d<<16>>16!=47)if(a)if(pa(d)|0)break;else break a;else if(da(d)|0)break;else break a;else switch(b[e+2>>1]|0){case 47:{$();break b}case 42:{P(a);break b}default:{d=47;break a}}while(0);f=c[74]|0;e=f+2|0;c[74]=e}while(f>>>0<(c[75]|0)>>>0);return d|0}function J(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0;h=c[69]|0;c[69]=h+36;g=c[65]|0;c[((g|0)==0?244:g+32|0)>>2]=h;c[66]=g;c[65]=h;c[h+8>>2]=b;if(2==(f|0)){b=3;g=e}else{g=1==(f|0);b=g?1:2;g=g?e+2|0:0}c[h+12>>2]=g;c[h+28>>2]=b;c[h>>2]=d;c[h+4>>2]=e;c[h+16>>2]=0;c[h+20>>2]=f;d=1==(f|0);a[h+24>>0]=d&1;c[h+32>>2]=0;if(d|2==(f|0))a[811]=1;return}function K(a){a=a|0;var d=0,e=0,f=0,g=0;g=c[75]|0;d=c[74]|0;while(1){f=d+2|0;if(d>>>0>=g>>>0){d=9;break}e=b[f>>1]|0;if(e<<16>>16==a<<16>>16){d=10;break}if(e<<16>>16==92){e=d+4|0;if((b[e>>1]|0)==13){d=d+6|0;d=(b[d>>1]|0)==10?d:e}else d=e}else if(ta(e)|0){d=9;break}else d=f}if((d|0)==9){c[74]=f;oa()}else if((d|0)==10)c[74]=f;return}function L(a,d){a=a|0;d=d|0;var e=0,f=0,g=0,h=0;e=c[74]|0;f=b[e>>1]|0;h=(a|0)==(d|0);g=h?0:a;h=h?0:d;if(f<<16>>16==97){c[74]=e+4;e=I(1)|0;a=c[74]|0;if(qa(e)|0){K(e);d=(c[74]|0)+2|0;c[74]=d}else{aa(e)|0;d=c[74]|0}f=I(1)|0;e=c[74]|0}if((e|0)!=(a|0))W(a,d,g,h);return f|0}function M(){var a=0,d=0,e=0;e=c[75]|0;d=c[74]|0;a:while(1){a=d+2|0;if(d>>>0>=e>>>0){d=6;break}switch(b[a>>1]|0){case 13:case 10:{d=6;break a}case 93:{d=7;break a}case 92:{a=d+4|0;break}default:{}}d=a}if((d|0)==6){c[74]=a;oa();a=0}else if((d|0)==7){c[74]=a;a=93}return a|0}function N(){var a=0,d=0,e=0;a:while(1){a=c[74]|0;d=a+2|0;c[74]=d;if(a>>>0>=(c[75]|0)>>>0){e=7;break}switch(b[d>>1]|0){case 13:case 10:{e=7;break a}case 47:break a;case 91:{M()|0;break}case 92:{c[74]=a+4;break}default:{}}}if((e|0)==7)oa();return}function O(a){a=a|0;switch(b[a>>1]|0){case 62:{a=(b[a+-2>>1]|0)==61;break}case 41:case 59:{a=1;break}case 104:{a=X(a+-2|0,218,4)|0;break}case 121:{a=X(a+-2|0,226,6)|0;break}case 101:{a=X(a+-2|0,238,3)|0;break}default:a=0}return a|0}function P(a){a=a|0;var d=0,e=0,f=0,g=0,h=0;g=(c[74]|0)+2|0;c[74]=g;e=c[75]|0;while(1){d=g+2|0;if(g>>>0>=e>>>0)break;f=b[d>>1]|0;if(!a?ta(f)|0:0)break;if(f<<16>>16==42?(b[g+4>>1]|0)==47:0){h=8;break}g=d}if((h|0)==8){c[74]=d;d=g+4|0}c[74]=d;return}function Q(b,c,d){b=b|0;c=c|0;d=d|0;var e=0,f=0;a:do if(!d)b=0;else{while(1){e=a[b>>0]|0;f=a[c>>0]|0;if(e<<24>>24!=f<<24>>24)break;d=d+-1|0;if(!d){b=0;break a}else{b=b+1|0;c=c+1|0}}b=(e&255)-(f&255)|0}while(0);return b|0}function S(a){a=a|0;a:do switch(a<<16>>16){case 38:case 37:case 33:{a=1;break}default:if((a&-8)<<16>>16==40|(a+-58&65535)<6)a=1;else{switch(a<<16>>16){case 91:case 93:case 94:{a=1;break a}default:{}}a=(a+-123&65535)<4}}while(0);return a|0}function T(a){a=a|0;a:do switch(a<<16>>16){case 38:case 37:case 33:break;default:if(!((a+-58&65535)<6|(a+-40&65535)<7&a<<16>>16!=41)){switch(a<<16>>16){case 91:case 94:break a;default:{}}return a<<16>>16!=125&(a+-123&65535)<4|0}}while(0);return 1}function U(a){a=a|0;var c=0;c=b[a>>1]|0;a:do if((c+-9&65535)>=5){switch(c<<16>>16){case 160:case 32:{c=1;break a}default:{}}if(S(c)|0)return c<<16>>16!=46|(ea(a)|0)|0;else c=0}else c=1;while(0);return c|0}function V(a){a=a|0;var d=0,e=0,f=0,g=0;e=v;v=v+16|0;f=e;c[f>>2]=0;c[68]=a;d=c[3]|0;g=d+(a<<1)|0;a=g+2|0;b[g>>1]=0;c[f>>2]=a;c[69]=a;c[61]=0;c[65]=0;c[63]=0;c[62]=0;c[67]=0;c[64]=0;v=e;return d|0}function W(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0;g=c[69]|0;c[69]=g+20;h=c[67]|0;c[((h|0)==0?248:h+16|0)>>2]=g;c[67]=g;c[g>>2]=b;c[g+4>>2]=d;c[g+8>>2]=e;c[g+12>>2]=f;c[g+16>>2]=0;a[811]=1;return}function X(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0;e=a+(0-d<<1)|0;f=e+2|0;a=c[3]|0;if(f>>>0>=a>>>0?(Q(f,b,d<<1)|0)==0:0)if((f|0)==(a|0))a=1;else a=U(e)|0;else a=0;return a|0}function Y(a){a=a|0;switch(b[a>>1]|0){case 107:{a=X(a+-2|0,158,4)|0;break}case 101:{if((b[a+-2>>1]|0)==117)a=X(a+-4|0,130,6)|0;else a=0;break}default:a=0}return a|0}function Z(a,d){a=a|0;d=d|0;var e=0;e=c[3]|0;if(e>>>0<=a>>>0?(b[a>>1]|0)==d<<16>>16:0)if((e|0)==(a|0))e=1;else e=_(b[a+-2>>1]|0)|0;else e=0;return e|0}function _(a){a=a|0;a:do if((a+-9&65535)<5)a=1;else{switch(a<<16>>16){case 32:case 160:{a=1;break a}default:{}}a=a<<16>>16!=46&(S(a)|0)}while(0);return a|0}function $(){var a=0,d=0,e=0;a=c[75]|0;e=c[74]|0;a:while(1){d=e+2|0;if(e>>>0>=a>>>0)break;switch(b[d>>1]|0){case 13:case 10:break a;default:e=d}}c[74]=d;return}function aa(a){a=a|0;while(1){if(pa(a)|0)break;if(S(a)|0)break;a=(c[74]|0)+2|0;c[74]=a;a=b[a>>1]|0;if(!(a<<16>>16)){a=0;break}}return a|0}function ba(){var a=0;a=c[(c[63]|0)+20>>2]|0;switch(a|0){case 1:{a=-1;break}case 2:{a=-2;break}default:a=a-(c[3]|0)>>1}return a|0}function ca(a){a=a|0;if(!(X(a,204,5)|0)?!(X(a,44,3)|0):0)a=X(a,214,2)|0;else a=1;return a|0}function da(a){a=a|0;switch(a<<16>>16){case 160:case 32:case 12:case 11:case 9:{a=1;break}default:a=0}return a|0}function ea(a){a=a|0;if((b[a>>1]|0)==46?(b[a+-2>>1]|0)==46:0)a=(b[a+-4>>1]|0)==46;else a=0;return a|0}function fa(a){a=a|0;if((c[3]|0)==(a|0))a=1;else a=U(a+-2|0)|0;return a|0}function ga(){var a=0;a=c[(c[64]|0)+12>>2]|0;if(!a)a=-1;else a=a-(c[3]|0)>>1;return a|0}function ha(){var a=0;a=c[(c[63]|0)+12>>2]|0;if(!a)a=-1;else a=a-(c[3]|0)>>1;return a|0}function ia(){var a=0;a=c[(c[64]|0)+8>>2]|0;if(!a)a=-1;else a=a-(c[3]|0)>>1;return a|0}function ja(){var a=0;a=c[(c[63]|0)+16>>2]|0;if(!a)a=-1;else a=a-(c[3]|0)>>1;return a|0}function ka(){var a=0;a=c[(c[63]|0)+4>>2]|0;if(!a)a=-1;else a=a-(c[3]|0)>>1;return a|0}function la(){var a=0;a=c[63]|0;a=c[((a|0)==0?244:a+32|0)>>2]|0;c[63]=a;return (a|0)!=0|0}function ma(){var a=0;a=c[64]|0;a=c[((a|0)==0?248:a+16|0)>>2]|0;c[64]=a;return (a|0)!=0|0}function oa(){a[810]=1;c[70]=(c[74]|0)-(c[3]|0)>>1;c[74]=(c[75]|0)+2;return}function pa(a){a=a|0;return (a|128)<<16>>16==160|(a+-9&65535)<5|0}function qa(a){a=a|0;return a<<16>>16==39|a<<16>>16==34|0}function ra(){return (c[(c[63]|0)+8>>2]|0)-(c[3]|0)>>1|0}function sa(){return (c[(c[64]|0)+4>>2]|0)-(c[3]|0)>>1|0}function ta(a){a=a|0;return a<<16>>16==13|a<<16>>16==10|0}function ua(){return (c[c[63]>>2]|0)-(c[3]|0)>>1|0}function va(){return (c[c[64]>>2]|0)-(c[3]|0)>>1|0}function wa(){return d[(c[63]|0)+24>>0]|0|0}function xa(a){a=a|0;c[3]=a;return}function ya(){return c[(c[63]|0)+28>>2]|0}function Ba(){return (a[811]|0)!=0|0}function Ca(){return (a[812]|0)!=0|0}function Ga(){return c[70]|0}  function su(a) {
		a = a | 0;
		v = a + 992 + 15 & -16;
		return 992;
	}
	return {
		su,ai:ja,e:Ga,ee:sa,ele:ga,els:ia,es:va,f:Ca,id:ba,ie:ka,ip:wa,is:ua,it:ya,ms:Ba,p:z,re:ma,ri:la,sa:V,se:ha,ses:xa,ss:ra}}
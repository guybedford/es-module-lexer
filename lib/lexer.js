let asm, asmBuffer;

const isLE = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;

let source;
export function parse (_source, name = '@') {
  source = _source;
  if (!asm) {
    asmBuffer = new ArrayBuffer(16777216);
    asm = asmInit({ Int8Array, Int16Array, Int32Array, Uint8Array, Uint16Array }, {}, asmBuffer);
  }
  const len = source.length + 1;

  const savedStack = asm.stackSave();
  const addr = asm.stackAlloc(source.length * 2 * 4);
  asm.setSource(addr);
  asm.sa(len - 1);

  (isLE ? copyLE : copyBE)(source, new Uint16Array(asmBuffer, addr, len));

  if (!asm.parse())
    throw Object.assign(new Error(`Parse error ${name}:${source.slice(0, asm.e()).split('\n').length}:${asm.e() - source.lastIndexOf('\n', asm.e() - 1)}`), { idx: asm.e() });

  const imports = [], exports = [];
  while (asm.ri()) {
    const s = asm.is(), e = asm.ie(), a = asm.ai(), d = asm.id(), ss = asm.ss(), se = asm.se();
    let n;
    if (asm.ip())
      n = readString(d === -1 ? s : s + 1, source.charCodeAt(d === -1 ? s - 1 : s));
    imports.push({ n, s, e, ss, se, d, a });
  }
  while (asm.re()) exports.push(source.slice(asm.es(), asm.ee()));

  asm.stackRestore(savedStack);

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

function asmInit (g,_e,f) {"use asm";var a=new g.Int8Array(f),b=new g.Int16Array(f),c=new g.Int32Array(f),d=new g.Uint8Array(f),e=new g.Uint16Array(f),A=816;function E(d){d=d|0;var f=0,g=0,h=0,i=0,j=0;j=A;A=A+14336|0;i=j;a[589]=1;b[291]=0;b[292]=0;b[293]=-1;c[15]=c[2];a[590]=0;c[14]=0;a[588]=0;c[16]=j+10240;c[17]=j+2048;a[591]=0;d=(c[3]|0)+-2|0;c[18]=d;f=d+(c[12]<<1)|0;c[19]=f;a:while(1){g=d+2|0;c[18]=g;if(d>>>0>=f>>>0){h=18;break}b:do switch(b[g>>1]|0){case 9:case 10:case 11:case 12:case 13:case 32:break;case 101:{if((((b[292]|0)==0?sa(g)|0:0)?ca(d+4|0,120,112,111,114,116)|0:0)?(G(),(a[589]|0)==0):0){h=9;break a}else h=17;break}case 105:{if(sa(g)|0?ca(d+4|0,109,112,111,114,116)|0:0){H();h=17}else h=17;break}case 59:{h=17;break}case 47:switch(b[d+4>>1]|0){case 47:{ka();break b}case 42:{V(1);break b}default:{h=16;break a}}default:{h=16;break a}}while(0);if((h|0)==17){h=0;c[15]=c[18]}d=c[18]|0;f=c[19]|0}if((h|0)==9){d=c[18]|0;c[15]=d;h=19}else if((h|0)==16){a[589]=0;c[18]=d;h=19}else if((h|0)==18)if(!(a[588]|0)){d=g;h=19}else d=0;do if((h|0)==19){c:while(1){f=d+2|0;c[18]=f;g=f;if(d>>>0>=(c[19]|0)>>>0){h=75;break}d:do switch(b[f>>1]|0){case 9:case 10:case 11:case 12:case 13:case 32:break;case 101:{if(((b[292]|0)==0?sa(f)|0:0)?ca(d+4|0,120,112,111,114,116)|0:0){G();h=74}else h=74;break}case 105:{if(sa(f)|0?ca(d+4|0,109,112,111,114,116)|0:0){H();h=74}else h=74;break}case 99:{if((sa(f)|0?ha(d+4|0,108,97,115,115)|0:0)?ya(b[d+12>>1]|0)|0:0){a[591]=1;h=74}else h=74;break}case 40:{f=c[15]|0;g=c[17]|0;h=b[292]|0;b[292]=h+1<<16>>16;c[g+((h&65535)<<2)>>2]=f;h=74;break}case 41:{d=b[292]|0;if(!(d<<16>>16)){h=36;break c}h=d+-1<<16>>16;b[292]=h;d=c[11]|0;if((d|0)!=0?(c[d+20>>2]|0)==(c[(c[17]|0)+((h&65535)<<2)>>2]|0):0){f=d+4|0;if(!(c[f>>2]|0))c[f>>2]=g;c[d+12>>2]=g;c[11]=0;h=74}else h=74;break}case 123:{h=c[15]|0;g=c[8]|0;d=h;do if((b[h>>1]|0)==41&(g|0)!=0?(c[g+4>>2]|0)==(h|0):0){f=c[9]|0;c[8]=f;if(!f){c[4]=0;break}else{c[f+28>>2]=0;break}}while(0);f=b[292]|0;h=f&65535;a[i+h>>0]=a[591]|0;a[591]=0;g=c[17]|0;b[292]=f+1<<16>>16;c[g+(h<<2)>>2]=d;h=74;break}case 125:{d=b[292]|0;if(!(d<<16>>16)){h=49;break c}g=d+-1<<16>>16;b[292]=g;f=b[293]|0;if(d<<16>>16!=f<<16>>16)if(f<<16>>16!=-1&(g&65535)<(f&65535)){h=53;break c}else{h=74;break d}else{g=c[16]|0;h=(b[291]|0)+-1<<16>>16;b[291]=h;b[293]=b[g+((h&65535)<<1)>>1]|0;M();h=74;break d}}case 39:{O();h=74;break}case 34:{P();h=74;break}case 47:switch(b[d+4>>1]|0){case 47:{ka();break d}case 42:{V(1);break d}default:{f=c[15]|0;g=b[f>>1]|0;e:do if(!(Z(g)|0)){switch(g<<16>>16){case 41:if(oa(c[(c[17]|0)+(e[292]<<2)>>2]|0)|0){h=71;break e}else{h=68;break e}case 125:break;default:{h=68;break e}}d=e[292]|0;if(!(T(c[(c[17]|0)+(d<<2)>>2]|0)|0)?(a[i+d>>0]|0)==0:0)h=68;else h=71}else switch(g<<16>>16){case 46:if(((b[f+-2>>1]|0)+-48&65535)<10){h=68;break e}else{h=71;break e}case 43:if((b[f+-2>>1]|0)==43){h=68;break e}else{h=71;break e}case 45:if((b[f+-2>>1]|0)==45){h=68;break e}else{h=71;break e}default:{h=71;break e}}while(0);f:do if((h|0)==68){h=0;if(!(J(f)|0)){switch(g<<16>>16){case 0:{h=71;break f}case 47:break;default:{d=1;break f}}if(!(a[590]|0))d=1;else h=71}else h=71}while(0);if((h|0)==71){U();d=0}a[590]=d;h=74;break d}}case 96:{M();h=74;break}default:h=74}while(0);if((h|0)==74){h=0;c[15]=c[18]}d=c[18]|0}if((h|0)==36){xa();d=0;break}else if((h|0)==49){xa();d=0;break}else if((h|0)==53){xa();d=0;break}else if((h|0)==75){d=(b[293]|0)==-1&(b[292]|0)==0&(a[588]|0)==0;break}}while(0);A=j;return d|0}function G(){var d=0,e=0,f=0,g=0,h=0,i=0;h=c[18]|0;i=h+12|0;c[18]=i;e=N(1)|0;d=c[18]|0;if(!((d|0)==(i|0)?!(Y(e)|0):0))g=3;a:do if((g|0)==3){b:do switch(e<<16>>16){case 100:{ma(d,d+14|0);break a}case 97:{c[18]=d+10;N(1)|0;d=c[18]|0;g=6;break}case 102:{g=6;break}case 99:{if(ha(d+2|0,108,97,115,115)|0?(f=d+10|0,ja(b[f>>1]|0)|0):0){c[18]=f;h=N(1)|0;i=c[18]|0;la(h)|0;ma(i,c[18]|0);c[18]=(c[18]|0)+-2;break a}d=d+4|0;c[18]=d;g=13;break}case 108:case 118:{g=13;break}case 123:{c[18]=d+2;d=N(1)|0;f=c[18]|0;while(1){la(d)|0;d=c[18]|0;N(1)|0;d=aa(f,d)|0;if(d<<16>>16==44){c[18]=(c[18]|0)+2;d=N(1)|0}e=f;f=c[18]|0;if(d<<16>>16==125){g=29;break}if((f|0)==(e|0)){g=26;break}if(f>>>0>(c[19]|0)>>>0){g=28;break}}if((g|0)==26){xa();break a}else if((g|0)==28){xa();break a}else if((g|0)==29){c[18]=f+2;g=31;break b}break}case 42:{c[18]=d+2;N(1)|0;g=c[18]|0;aa(g,g)|0;g=31;break}default:{}}while(0);if((g|0)==6){c[18]=d+16;d=N(1)|0;if(d<<16>>16==42){c[18]=(c[18]|0)+2;d=N(1)|0}i=c[18]|0;la(d)|0;ma(i,c[18]|0);c[18]=(c[18]|0)+-2;break}else if((g|0)==13){d=d+4|0;c[18]=d;a[589]=0;c:while(1){c[18]=d+2;i=N(1)|0;d=c[18]|0;switch((la(i)|0)<<16>>16){case 91:case 123:{g=15;break c}default:{}}e=c[18]|0;if((e|0)==(d|0))break a;ma(d,e);switch((N(1)|0)<<16>>16){case 61:{g=19;break c}case 44:break;default:{g=20;break c}}d=c[18]|0}if((g|0)==15){c[18]=(c[18]|0)+-2;break}else if((g|0)==19){c[18]=(c[18]|0)+-2;break}else if((g|0)==20){c[18]=(c[18]|0)+-2;break}}else if((g|0)==31)e=N(1)|0;d=c[18]|0;if(e<<16>>16==102?na(d+2|0,114,111,109)|0:0){c[18]=d+8;I(h,N(1)|0);break}c[18]=d+-2}while(0);return}function H(){var d=0,e=0,f=0,g=0,h=0;h=c[18]|0;e=h+12|0;c[18]=e;a:do switch((N(1)|0)<<16>>16){case 40:{e=c[17]|0;f=b[292]|0;b[292]=f+1<<16>>16;c[e+((f&65535)<<2)>>2]=h;if((b[c[15]>>1]|0)!=46){Q(h,(c[18]|0)+2|0,0,h);c[11]=c[8];c[18]=(c[18]|0)+2;switch((N(1)|0)<<16>>16){case 39:{O();break}case 34:{P();break}default:{c[18]=(c[18]|0)+-2;break a}}c[18]=(c[18]|0)+2;switch((N(1)|0)<<16>>16){case 44:{h=c[18]|0;c[(c[8]|0)+4>>2]=h;c[18]=h+2;N(1)|0;h=c[18]|0;f=c[8]|0;c[f+16>>2]=h;a[f+24>>0]=1;c[18]=h+-2;break a}case 41:{b[292]=(b[292]|0)+-1<<16>>16;f=c[18]|0;h=c[8]|0;c[h+4>>2]=f;c[h+12>>2]=f;a[h+24>>0]=1;break a}default:{c[18]=(c[18]|0)+-2;break a}}}break}case 46:{c[18]=(c[18]|0)+2;if(((N(1)|0)<<16>>16==109?(d=c[18]|0,na(d+2|0,101,116,97)|0):0)?(b[c[15]>>1]|0)!=46:0)Q(h,h,d+8|0,2);break}case 42:case 123:case 39:case 34:{g=16;break}default:if((c[18]|0)!=(e|0))g=16}while(0);do if((g|0)==16){if(b[292]|0){c[18]=(c[18]|0)+-2;break}d=c[19]|0;e=c[18]|0;b:while(1){if(e>>>0>=d>>>0){g=23;break}f=b[e>>1]|0;switch(f<<16>>16){case 34:case 39:{g=21;break b}default:{}}g=e+2|0;c[18]=g;e=g}if((g|0)==21){I(h,f);break}else if((g|0)==23){xa();break}}while(0);return}function I(a,b){a=a|0;b=b|0;var d=0,e=0;d=(c[18]|0)+2|0;switch(b<<16>>16){case 39:{O();e=5;break}case 34:{P();e=5;break}default:xa()}do if((e|0)==5){Q(a,d,c[18]|0,1);c[18]=(c[18]|0)+2;e=(N(0)|0)<<16>>16==97;b=c[18]|0;if(e?ca(b+2|0,115,115,101,114,116)|0:0){c[18]=b+12;if((N(1)|0)<<16>>16!=123){c[18]=b;break}a=c[18]|0;d=a;a:while(1){c[18]=d+2;d=N(1)|0;switch(d<<16>>16){case 39:{O();c[18]=(c[18]|0)+2;d=N(1)|0;break}case 34:{P();c[18]=(c[18]|0)+2;d=N(1)|0;break}default:d=la(d)|0}if(d<<16>>16!=58){e=16;break}c[18]=(c[18]|0)+2;switch((N(1)|0)<<16>>16){case 39:{O();break}case 34:{P();break}default:{e=20;break a}}c[18]=(c[18]|0)+2;switch((N(1)|0)<<16>>16){case 125:{e=25;break a}case 44:break;default:{e=24;break a}}c[18]=(c[18]|0)+2;if((N(1)|0)<<16>>16==125){e=25;break}d=c[18]|0}if((e|0)==16){c[18]=b;break}else if((e|0)==20){c[18]=b;break}else if((e|0)==24){c[18]=b;break}else if((e|0)==25){e=c[8]|0;c[e+16>>2]=a;c[e+12>>2]=(c[18]|0)+2;break}}c[18]=b+-2}while(0);return}function J(a){a=a|0;a:do switch(b[a>>1]|0){case 100:switch(b[a+-2>>1]|0){case 105:{a=ga(a+-4|0,118,111)|0;break a}case 108:{a=ea(a+-4|0,121,105,101)|0;break a}default:{a=0;break a}}case 101:{switch(b[a+-2>>1]|0){case 115:break;case 116:{a=da(a+-4|0,100,101,108,101)|0;break a}default:{a=0;break a}}switch(b[a+-4>>1]|0){case 108:{a=ia(a+-6|0,101)|0;break a}case 97:{a=ia(a+-6|0,99)|0;break a}default:{a=0;break a}}}case 102:{if((b[a+-2>>1]|0)==111?(b[a+-4>>1]|0)==101:0)switch(b[a+-6>>1]|0){case 99:{a=_(a+-8|0,105,110,115,116,97,110)|0;break a}case 112:{a=ga(a+-8|0,116,121)|0;break a}default:{a=0;break a}}else a=0;break}case 110:{a=a+-2|0;if(ia(a,105)|0)a=1;else a=$(a,114,101,116,117,114)|0;break}case 111:{a=ia(a+-2|0,100)|0;break}case 114:{a=X(a+-2|0,100,101,98,117,103,103,101)|0;break}case 116:{a=da(a+-2|0,97,119,97,105)|0;break}case 119:switch(b[a+-2>>1]|0){case 101:{a=ia(a+-4|0,110)|0;break a}case 111:{a=ea(a+-4|0,116,104,114)|0;break a}default:{a=0;break a}}default:a=0}while(0);return a|0}function M(){var a=0,d=0,e=0;d=c[19]|0;e=c[18]|0;a:while(1){a=e+2|0;if(e>>>0>=d>>>0){d=8;break}switch(b[a>>1]|0){case 96:{d=9;break a}case 36:{if((b[e+4>>1]|0)==123){d=6;break a}break}case 92:{a=e+4|0;break}default:{}}e=a}if((d|0)==6){c[18]=e+4;a=b[293]|0;d=c[16]|0;e=b[291]|0;b[291]=e+1<<16>>16;b[d+((e&65535)<<1)>>1]=a;e=(b[292]|0)+1<<16>>16;b[292]=e;b[293]=e}else if((d|0)==8){c[18]=a;xa()}else if((d|0)==9)c[18]=a;return}function N(a){a=a|0;var d=0,e=0,f=0;e=c[18]|0;a:do{d=b[e>>1]|0;b:do if(d<<16>>16!=47)if(a)if(ya(d)|0)break;else break a;else if(ra(d)|0)break;else break a;else switch(b[e+2>>1]|0){case 47:{ka();break b}case 42:{V(a);break b}default:{d=47;break a}}while(0);f=c[18]|0;e=f+2|0;c[18]=e}while(f>>>0<(c[19]|0)>>>0);return d|0}function O(){var a=0,d=0,e=0,f=0;f=c[19]|0;a=c[18]|0;a:while(1){e=a+2|0;if(a>>>0>=f>>>0){a=8;break}d=b[e>>1]|0;switch(d<<16>>16){case 39:{a=9;break a}case 92:{d=a+4|0;if((b[d>>1]|0)==13){a=a+6|0;a=(b[a>>1]|0)==10?a:d}else a=d;break}default:if(Ca(d)|0){a=8;break a}else a=e}}if((a|0)==8){c[18]=e;xa()}else if((a|0)==9)c[18]=e;return}function P(){var a=0,d=0,e=0,f=0;f=c[19]|0;a=c[18]|0;a:while(1){e=a+2|0;if(a>>>0>=f>>>0){a=8;break}d=b[e>>1]|0;switch(d<<16>>16){case 34:{a=9;break a}case 92:{d=a+4|0;if((b[d>>1]|0)==13){a=a+6|0;a=(b[a>>1]|0)==10?a:d}else a=d;break}default:if(Ca(d)|0){a=8;break a}else a=e}}if((a|0)==8){c[18]=e;xa()}else if((a|0)==9)c[18]=e;return}function Q(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0;g=c[13]|0;c[13]=g+32;h=c[8]|0;c[((h|0)==0?16:h+28|0)>>2]=g;c[9]=h;c[8]=g;c[g+8>>2]=b;do if(2!=(f|0))if(1==(f|0)){c[g+12>>2]=e+2;break}else{c[g+12>>2]=c[3];break}else c[g+12>>2]=e;while(0);c[g>>2]=d;c[g+4>>2]=e;c[g+16>>2]=0;c[g+20>>2]=f;a[g+24>>0]=1==(f|0)&1;c[g+28>>2]=0;return}function R(){var a=0,d=0,e=0;e=c[19]|0;d=c[18]|0;a:while(1){a=d+2|0;if(d>>>0>=e>>>0){d=6;break}switch(b[a>>1]|0){case 13:case 10:{d=6;break a}case 93:{d=7;break a}case 92:{a=d+4|0;break}default:{}}d=a}if((d|0)==6){c[18]=a;xa();a=0}else if((d|0)==7){c[18]=a;a=93}return a|0}function S(a,c,d,e,f,g,h,i){a=a|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;if((((((b[a+12>>1]|0)==i<<16>>16?(b[a+10>>1]|0)==h<<16>>16:0)?(b[a+8>>1]|0)==g<<16>>16:0)?(b[a+6>>1]|0)==f<<16>>16:0)?(b[a+4>>1]|0)==e<<16>>16:0)?(b[a+2>>1]|0)==d<<16>>16:0)c=(b[a>>1]|0)==c<<16>>16;else c=0;return c|0}function T(a){a=a|0;switch(b[a>>1]|0){case 62:{a=(b[a+-2>>1]|0)==61;break}case 41:case 59:{a=1;break}case 104:{a=da(a+-2|0,99,97,116,99)|0;break}case 121:{a=_(a+-2|0,102,105,110,97,108,108)|0;break}case 101:{a=ea(a+-2|0,101,108,115)|0;break}default:a=0}return a|0}function U(){var a=0,d=0,e=0;a:while(1){a=c[18]|0;d=a+2|0;c[18]=d;if(a>>>0>=(c[19]|0)>>>0){e=7;break}switch(b[d>>1]|0){case 13:case 10:{e=7;break a}case 47:break a;case 91:{R()|0;break}case 92:{c[18]=a+4;break}default:{}}}if((e|0)==7)xa();return}function V(a){a=a|0;var d=0,e=0,f=0,g=0,h=0;g=(c[18]|0)+2|0;c[18]=g;e=c[19]|0;while(1){d=g+2|0;if(g>>>0>=e>>>0)break;f=b[d>>1]|0;if(!a?Ca(f)|0:0)break;if(f<<16>>16==42?(b[g+4>>1]|0)==47:0){h=8;break}g=d}if((h|0)==8){c[18]=d;d=g+4|0}c[18]=d;return}function W(a,c,d,e,f,g,h){a=a|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;if(((((b[a+10>>1]|0)==h<<16>>16?(b[a+8>>1]|0)==g<<16>>16:0)?(b[a+6>>1]|0)==f<<16>>16:0)?(b[a+4>>1]|0)==e<<16>>16:0)?(b[a+2>>1]|0)==d<<16>>16:0)c=(b[a>>1]|0)==c<<16>>16;else c=0;return c|0}function X(a,d,e,f,g,h,i,j){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;var k=0,l=0;l=a+-12|0;k=c[3]|0;if(l>>>0>=k>>>0?S(l,d,e,f,g,h,i,j)|0:0)if((l|0)==(k|0))k=1;else k=ja(b[a+-14>>1]|0)|0;else k=0;return k|0}function Y(a){a=a|0;a:do switch(a<<16>>16){case 38:case 37:case 33:{a=1;break}default:if((a&-8)<<16>>16==40|(a+-58&65535)<6)a=1;else{switch(a<<16>>16){case 91:case 93:case 94:{a=1;break a}default:{}}a=(a+-123&65535)<4}}while(0);return a|0}function Z(a){a=a|0;a:do switch(a<<16>>16){case 38:case 37:case 33:break;default:if(!((a+-58&65535)<6|(a+-40&65535)<7&a<<16>>16!=41)){switch(a<<16>>16){case 91:case 94:break a;default:{}}return a<<16>>16!=125&(a+-123&65535)<4|0}}while(0);return 1}function _(a,d,e,f,g,h,i){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;var j=0,k=0;k=a+-10|0;j=c[3]|0;if(k>>>0>=j>>>0?W(k,d,e,f,g,h,i)|0:0)if((k|0)==(j|0))j=1;else j=ja(b[a+-12>>1]|0)|0;else j=0;return j|0}function $(a,d,e,f,g,h){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var i=0,j=0;j=a+-8|0;i=c[3]|0;if(j>>>0>=i>>>0?ca(j,d,e,f,g,h)|0:0)if((j|0)==(i|0))i=1;else i=ja(b[a+-10>>1]|0)|0;else i=0;return i|0}function aa(a,d){a=a|0;d=d|0;var e=0,f=0;e=c[18]|0;f=b[e>>1]|0;if(f<<16>>16==97){c[18]=e+4;d=N(1)|0;a=c[18]|0;la(d)|0;d=c[18]|0;f=N(1)|0;e=c[18]|0}if((e|0)!=(a|0))ma(a,d);return f|0}function ba(a){a=a|0;var d=0,e=0,f=0,g=0;e=A;A=A+16|0;f=e;c[f>>2]=0;c[12]=a;d=c[3]|0;g=d+(a<<1)|0;a=g+2|0;b[g>>1]=0;c[f>>2]=a;c[13]=a;c[4]=0;c[8]=0;c[6]=0;c[5]=0;c[10]=0;c[7]=0;A=e;return d|0}function ca(a,c,d,e,f,g){a=a|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;if((((b[a+8>>1]|0)==g<<16>>16?(b[a+6>>1]|0)==f<<16>>16:0)?(b[a+4>>1]|0)==e<<16>>16:0)?(b[a+2>>1]|0)==d<<16>>16:0)c=(b[a>>1]|0)==c<<16>>16;else c=0;return c|0}function da(a,d,e,f,g){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,i=0;i=a+-6|0;h=c[3]|0;if(i>>>0>=h>>>0?ha(i,d,e,f,g)|0:0)if((i|0)==(h|0))h=1;else h=ja(b[a+-8>>1]|0)|0;else h=0;return h|0}function ea(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0,h=0;h=a+-4|0;g=c[3]|0;if(h>>>0>=g>>>0?na(h,d,e,f)|0:0)if((h|0)==(g|0))g=1;else g=ja(b[a+-6>>1]|0)|0;else g=0;return g|0}function ga(a,d,e){a=a|0;d=d|0;e=e|0;var f=0,g=0;g=a+-2|0;f=c[3]|0;if(g>>>0>=f>>>0?qa(g,d,e)|0:0)if((g|0)==(f|0))f=1;else f=ja(b[a+-4>>1]|0)|0;else f=0;return f|0}function ha(a,c,d,e,f){a=a|0;c=c|0;d=d|0;e=e|0;f=f|0;if(((b[a+6>>1]|0)==f<<16>>16?(b[a+4>>1]|0)==e<<16>>16:0)?(b[a+2>>1]|0)==d<<16>>16:0)c=(b[a>>1]|0)==c<<16>>16;else c=0;return c|0}function ia(a,d){a=a|0;d=d|0;var e=0;e=c[3]|0;if(e>>>0<=a>>>0?(b[a>>1]|0)==d<<16>>16:0)if((e|0)==(a|0))e=1;else e=ja(b[a+-2>>1]|0)|0;else e=0;return e|0}function ja(a){a=a|0;a:do if((a+-9&65535)<5)a=1;else{switch(a<<16>>16){case 32:case 160:{a=1;break a}default:{}}a=a<<16>>16!=46&(Y(a)|0)}while(0);return a|0}function ka(){var a=0,d=0,e=0;a=c[19]|0;e=c[18]|0;a:while(1){d=e+2|0;if(e>>>0>=a>>>0)break;switch(b[d>>1]|0){case 13:case 10:break a;default:e=d}}c[18]=d;return}function la(a){a=a|0;while(1){if(ya(a)|0)break;if(Y(a)|0)break;a=(c[18]|0)+2|0;c[18]=a;a=b[a>>1]|0;if(!(a<<16>>16)){a=0;break}}return a|0}function ma(a,b){a=a|0;b=b|0;var d=0,e=0;d=c[13]|0;c[13]=d+12;e=c[10]|0;c[((e|0)==0?20:e+8|0)>>2]=d;c[10]=d;c[d>>2]=a;c[d+4>>2]=b;c[d+8>>2]=0;return}function na(a,c,d,e){a=a|0;c=c|0;d=d|0;e=e|0;if((b[a+4>>1]|0)==e<<16>>16?(b[a+2>>1]|0)==d<<16>>16:0)c=(b[a>>1]|0)==c<<16>>16;else c=0;return c|0}function oa(a){a=a|0;if(!($(a,119,104,105,108,101)|0)?!(ea(a,102,111,114)|0):0)a=ga(a,105,102)|0;else a=1;return a|0}function pa(){var a=0;a=c[(c[6]|0)+20>>2]|0;switch(a|0){case 1:{a=-1;break}case 2:{a=-2;break}default:a=a-(c[3]|0)>>1}return a|0}function qa(a,c,d){a=a|0;c=c|0;d=d|0;if((b[a+2>>1]|0)==d<<16>>16)c=(b[a>>1]|0)==c<<16>>16;else c=0;return c|0}function ra(a){a=a|0;switch(a<<16>>16){case 160:case 32:case 12:case 11:case 9:{a=1;break}default:a=0}return a|0}function sa(a){a=a|0;if((c[3]|0)==(a|0))a=1;else a=ja(b[a+-2>>1]|0)|0;return a|0}function ta(){var a=0;a=c[(c[6]|0)+16>>2]|0;if(!a)a=-1;else a=a-(c[3]|0)>>1;return a|0}function ua(){var a=0;a=c[6]|0;a=c[((a|0)==0?16:a+28|0)>>2]|0;c[6]=a;return (a|0)!=0|0}function va(){var a=0;a=c[7]|0;a=c[((a|0)==0?20:a+8|0)>>2]|0;c[7]=a;return (a|0)!=0|0}function wa(a){a=a|0;var b=0;b=A;A=A+a|0;A=A+15&-16;return b|0}function xa(){a[588]=1;c[14]=(c[18]|0)-(c[3]|0)>>1;c[18]=(c[19]|0)+2;return}function ya(a){a=a|0;return (a|128)<<16>>16==160|(a+-9&65535)<5|0}function Aa(){return (c[(c[6]|0)+12>>2]|0)-(c[3]|0)>>1|0}function Ba(){return (c[(c[6]|0)+8>>2]|0)-(c[3]|0)>>1|0}function Ca(a){a=a|0;return a<<16>>16==13|a<<16>>16==10|0}function Da(){return (c[(c[6]|0)+4>>2]|0)-(c[3]|0)>>1|0}function Ea(){return (c[(c[7]|0)+4>>2]|0)-(c[3]|0)>>1|0}function Fa(){return (c[c[6]>>2]|0)-(c[3]|0)>>1|0}function Ga(){return (c[c[7]>>2]|0)-(c[3]|0)>>1|0}function Ha(){return d[(c[6]|0)+24>>0]|0|0}function Ia(a){a=a|0;c[3]=a;return}function Ka(a){a=a|0;A=a}function La(){return (a[589]|0)!=0|0}function Na(){return A|0}function Pa(){return c[14]|0}return{ai:ta,e:Pa,ee:Ea,es:Ga,f:La,id:pa,ie:Da,ip:Ha,is:Fa,parse:E,re:va,ri:ua,sa:ba,se:Aa,setSource:Ia,ss:Ba,stackAlloc:wa,stackRestore:Ka,stackSave:Na}}

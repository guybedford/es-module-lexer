
  var bufferView;
  var base64ReverseLookup = new Uint8Array(123/*'z'+1*/);
  for (var i = 25; i >= 0; --i) {
    base64ReverseLookup[48+i] = 52+i; // '0-9'
    base64ReverseLookup[65+i] = i; // 'A-Z'
    base64ReverseLookup[97+i] = 26+i; // 'a-z'
  }
  base64ReverseLookup[43] = 62; // '+'
  base64ReverseLookup[47] = 63; // '/'
  /** @noinline Inlining this function would mean expanding the base64 string 4x times in the source code, which Closure seems to be happy to do. */
  function base64DecodeToExistingUint8Array(uint8Array, offset, b64) {
    var b1, b2, i = 0, j = offset, bLength = b64.length, end = offset + (bLength*3>>2) - (b64[bLength-2] == '=') - (b64[bLength-1] == '=');
    for (; i < bLength; i += 4) {
      b1 = base64ReverseLookup[b64.charCodeAt(i+1)];
      b2 = base64ReverseLookup[b64.charCodeAt(i+2)];
      uint8Array[j++] = base64ReverseLookup[b64.charCodeAt(i)] << 2 | b1 >> 4;
      if (j < end) uint8Array[j++] = b1 << 4 | b2 >> 2;
      if (j < end) uint8Array[j++] = b2 << 6 | base64ReverseLookup[b64.charCodeAt(i+3)];
    }
  }
function initActiveSegments(imports) {
  base64DecodeToExistingUint8Array(bufferView, 1026, "eABwAG8AcgB0AG0AcABvAHIAdABmAG8AcgBlAHQAYQBvAHUAcgBjAGUAcgBvAG0AdQBuAGMAdABpAG8AbgB2AG8AeQBpAGUAZABlAGwAZQBjAG8AbgB0AGkAbgBpAG4AcwB0AGEAbgB0AHkAYgByAGUAYQByAGUAdAB1AHIAZABlAGIAdQBnAGcAZQBhAHcAYQBpAHQAaAByAHcAaABpAGwAZQBpAGYAYwBhAHQAYwBmAGkAbgBhAGwAbABlAGwAcw==");
  base64DecodeToExistingUint8Array(bufferView, 1220, "AQAAAAIAAAAABAAAMDk=");
}
function asmFunc(env) {
 var buffer = new ArrayBuffer(65536);
 var HEAP8 = new Int8Array(buffer);
 var HEAP16 = new Int16Array(buffer);
 var HEAP32 = new Int32Array(buffer);
 var HEAPU8 = new Uint8Array(buffer);
 var HEAPU16 = new Uint16Array(buffer);
 var HEAPU32 = new Uint32Array(buffer);
 var HEAPF32 = new Float32Array(buffer);
 var HEAPF64 = new Float64Array(buffer);
 var Math_imul = Math.imul;
 var Math_fround = Math.fround;
 var Math_abs = Math.abs;
 var Math_clz32 = Math.clz32;
 var Math_min = Math.min;
 var Math_max = Math.max;
 var Math_floor = Math.floor;
 var Math_ceil = Math.ceil;
 var Math_trunc = Math.trunc;
 var Math_sqrt = Math.sqrt;
 var abort = env.abort;
 var nan = NaN;
 var infinity = Infinity;
 var global$0 = 14640;
 var global$1 = 14640;
 function $0($0_1) {
  $0_1 = $0_1 | 0;
  var $1_1 = 0;
  HEAP32[1268 >> 2] = $0_1;
  $1_1 = HEAP32[1232 >> 2] | 0;
  $0_1 = $1_1 + ($0_1 << 1 | 0) | 0;
  HEAP16[$0_1 >> 1] = 0;
  $0_1 = $0_1 + 2 | 0;
  HEAP32[1272 >> 2] = $0_1;
  HEAP32[1276 >> 2] = $0_1;
  HEAP32[1236 >> 2] = 0;
  HEAP32[1252 >> 2] = 0;
  HEAP32[1244 >> 2] = 0;
  HEAP32[1240 >> 2] = 0;
  HEAP32[1260 >> 2] = 0;
  HEAP32[1248 >> 2] = 0;
  return $1_1 | 0;
 }
 
 function $1($0_1, $1_1, $2_1, $3_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  var $4_1 = 0, $5_1 = 0, $6_1 = 0;
  $5_1 = HEAP32[1252 >> 2] | 0;
  $4_1 = HEAP32[1276 >> 2] | 0;
  HEAP32[1252 >> 2] = $4_1;
  HEAP32[1256 >> 2] = $5_1;
  HEAP32[1276 >> 2] = $4_1 + 40 | 0;
  HEAP32[($5_1 ? $5_1 + 36 | 0 : 1236) >> 2] = $4_1;
  $5_1 = HEAP32[1224 >> 2] | 0;
  $6_1 = HEAP32[1220 >> 2] | 0;
  HEAP32[$4_1 >> 2] = $1_1;
  HEAP32[($4_1 + 8 | 0) >> 2] = $0_1;
  $0_1 = ($3_1 | 0) == ($6_1 | 0);
  $1_1 = ($3_1 | 0) == ($5_1 | 0);
  HEAP32[($4_1 + 12 | 0) >> 2] = $1_1 ? $2_1 : $0_1 ? $2_1 + 2 | 0 : 0;
  HEAP32[($4_1 + 20 | 0) >> 2] = $3_1;
  HEAP32[($4_1 + 16 | 0) >> 2] = 0;
  HEAP32[($4_1 + 4 | 0) >> 2] = $2_1;
  HEAP32[($4_1 + 32 | 0) >> 2] = 0;
  HEAP32[($4_1 + 36 | 0) >> 2] = 0;
  HEAP32[($4_1 + 28 | 0) >> 2] = $1_1 ? 3 : $0_1 ? 1 : 2;
  $0_1 = (HEAP32[1220 >> 2] | 0 | 0) == ($3_1 | 0);
  HEAP8[($4_1 + 24 | 0) >> 0] = $0_1;
  label$1 : {
   if (!$0_1) {
    if ((HEAP32[1224 >> 2] | 0 | 0) != ($3_1 | 0)) {
     break label$1
    }
   }
   HEAP8[1280 >> 0] = 1;
  }
 }
 
 function $2($0_1, $1_1, $2_1, $3_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  var $4_1 = 0, $9_1 = 0;
  $4_1 = HEAP32[1260 >> 2] | 0;
  $9_1 = $4_1 ? $4_1 + 16 | 0 : 1240;
  $4_1 = HEAP32[1276 >> 2] | 0;
  HEAP32[$9_1 >> 2] = $4_1;
  HEAP32[1260 >> 2] = $4_1;
  HEAP32[1276 >> 2] = $4_1 + 20 | 0;
  HEAP8[1280 >> 0] = 1;
  HEAP32[($4_1 + 16 | 0) >> 2] = 0;
  HEAP32[($4_1 + 12 | 0) >> 2] = $3_1;
  HEAP32[($4_1 + 8 | 0) >> 2] = $2_1;
  HEAP32[($4_1 + 4 | 0) >> 2] = $1_1;
  HEAP32[$4_1 >> 2] = $0_1;
 }
 
 function $3() {
  return HEAP32[1284 >> 2] | 0 | 0;
 }
 
 function $4() {
  return ((HEAP32[(HEAP32[1244 >> 2] | 0) >> 2] | 0) - (HEAP32[1232 >> 2] | 0) | 0) >> 1 | 0 | 0;
 }
 
 function $5() {
  var $0_1 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0, wasm2js_i32$2 = 0;
  $0_1 = HEAP32[((HEAP32[1244 >> 2] | 0) + 4 | 0) >> 2] | 0;
  return (wasm2js_i32$0 = ($0_1 - (HEAP32[1232 >> 2] | 0) | 0) >> 1 | 0, wasm2js_i32$1 = -1, wasm2js_i32$2 = $0_1, wasm2js_i32$2 ? wasm2js_i32$0 : wasm2js_i32$1) | 0;
 }
 
 function $6() {
  return ((HEAP32[((HEAP32[1244 >> 2] | 0) + 8 | 0) >> 2] | 0) - (HEAP32[1232 >> 2] | 0) | 0) >> 1 | 0 | 0;
 }
 
 function $7() {
  var $0_1 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0, wasm2js_i32$2 = 0;
  $0_1 = HEAP32[((HEAP32[1244 >> 2] | 0) + 12 | 0) >> 2] | 0;
  return (wasm2js_i32$0 = ($0_1 - (HEAP32[1232 >> 2] | 0) | 0) >> 1 | 0, wasm2js_i32$1 = -1, wasm2js_i32$2 = $0_1, wasm2js_i32$2 ? wasm2js_i32$0 : wasm2js_i32$1) | 0;
 }
 
 function $8() {
  return HEAP32[((HEAP32[1244 >> 2] | 0) + 28 | 0) >> 2] | 0 | 0;
 }
 
 function $9() {
  var $0_1 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0, wasm2js_i32$2 = 0;
  $0_1 = HEAP32[((HEAP32[1244 >> 2] | 0) + 16 | 0) >> 2] | 0;
  return (wasm2js_i32$0 = ($0_1 - (HEAP32[1232 >> 2] | 0) | 0) >> 1 | 0, wasm2js_i32$1 = -1, wasm2js_i32$2 = $0_1, wasm2js_i32$2 ? wasm2js_i32$0 : wasm2js_i32$1) | 0;
 }
 
 function $10() {
  var $0_1 = 0;
  $0_1 = HEAP32[((HEAP32[1244 >> 2] | 0) + 20 | 0) >> 2] | 0;
  if (($0_1 | 0) == (HEAP32[1220 >> 2] | 0 | 0)) {
   return -1 | 0
  }
  if ((HEAP32[1224 >> 2] | 0 | 0) == ($0_1 | 0)) {
   return -2 | 0
  }
  return ($0_1 - (HEAP32[1232 >> 2] | 0) | 0) >> 1 | 0 | 0;
 }
 
 function $11() {
  return HEAPU8[((HEAP32[1244 >> 2] | 0) + 24 | 0) >> 0] | 0 | 0;
 }
 
 function $12() {
  return ((HEAP32[(HEAP32[1248 >> 2] | 0) >> 2] | 0) - (HEAP32[1232 >> 2] | 0) | 0) >> 1 | 0 | 0;
 }
 
 function $13() {
  return ((HEAP32[((HEAP32[1248 >> 2] | 0) + 4 | 0) >> 2] | 0) - (HEAP32[1232 >> 2] | 0) | 0) >> 1 | 0 | 0;
 }
 
 function $14() {
  var $0_1 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0, wasm2js_i32$2 = 0;
  $0_1 = HEAP32[((HEAP32[1248 >> 2] | 0) + 8 | 0) >> 2] | 0;
  return (wasm2js_i32$0 = ($0_1 - (HEAP32[1232 >> 2] | 0) | 0) >> 1 | 0, wasm2js_i32$1 = -1, wasm2js_i32$2 = $0_1, wasm2js_i32$2 ? wasm2js_i32$0 : wasm2js_i32$1) | 0;
 }
 
 function $15() {
  var $0_1 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0, wasm2js_i32$2 = 0;
  $0_1 = HEAP32[((HEAP32[1248 >> 2] | 0) + 12 | 0) >> 2] | 0;
  return (wasm2js_i32$0 = ($0_1 - (HEAP32[1232 >> 2] | 0) | 0) >> 1 | 0, wasm2js_i32$1 = -1, wasm2js_i32$2 = $0_1, wasm2js_i32$2 ? wasm2js_i32$0 : wasm2js_i32$1) | 0;
 }
 
 function $16() {
  var $0_1 = 0;
  $0_1 = HEAP32[1244 >> 2] | 0;
  $0_1 = HEAP32[($0_1 ? $0_1 + 36 | 0 : 1236) >> 2] | 0;
  HEAP32[1244 >> 2] = $0_1;
  return ($0_1 | 0) != (0 | 0) | 0;
 }
 
 function $17() {
  var $0_1 = 0;
  $0_1 = HEAP32[1248 >> 2] | 0;
  $0_1 = HEAP32[($0_1 ? $0_1 + 16 | 0 : 1240) >> 2] | 0;
  HEAP32[1248 >> 2] = $0_1;
  return ($0_1 | 0) != (0 | 0) | 0;
 }
 
 function $18() {
  return HEAPU8[1288 >> 0] | 0 | 0;
 }
 
 function $19() {
  return HEAPU8[1280 >> 0] | 0 | 0;
 }
 
 function $20() {
  var $0_1 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0, wasm2js_i32$2 = 0;
  $0_1 = HEAP32[1292 >> 2] | 0;
  $0_1 = HEAP32[(wasm2js_i32$0 = $0_1 + 16 | 0, wasm2js_i32$1 = (HEAP32[1244 >> 2] | 0) + 32 | 0, wasm2js_i32$2 = $0_1, wasm2js_i32$2 ? wasm2js_i32$0 : wasm2js_i32$1) >> 2] | 0;
  HEAP32[1292 >> 2] = $0_1;
  return ($0_1 | 0) != (0 | 0) | 0;
 }
 
 function $21() {
  return ((HEAP32[(HEAP32[1292 >> 2] | 0) >> 2] | 0) - (HEAP32[1232 >> 2] | 0) | 0) >> 1 | 0 | 0;
 }
 
 function $22() {
  return ((HEAP32[((HEAP32[1292 >> 2] | 0) + 4 | 0) >> 2] | 0) - (HEAP32[1232 >> 2] | 0) | 0) >> 1 | 0 | 0;
 }
 
 function $23() {
  return ((HEAP32[((HEAP32[1292 >> 2] | 0) + 8 | 0) >> 2] | 0) - (HEAP32[1232 >> 2] | 0) | 0) >> 1 | 0 | 0;
 }
 
 function $24() {
  return ((HEAP32[((HEAP32[1292 >> 2] | 0) + 12 | 0) >> 2] | 0) - (HEAP32[1232 >> 2] | 0) | 0) >> 1 | 0 | 0;
 }
 
 function $25() {
  HEAP32[1292 >> 2] = 0;
 }
 
 function $26() {
  var $0_1 = 0, $1_1 = 0, $2_1 = 0, $3_1 = 0, $455 = 0, $4_1 = 0, $362 = 0, $429 = 0, $5_1 = 0, $6_1 = 0, i64toi32_i32$0 = 0, $286 = 0, $603 = 0, i64toi32_i32$1 = 0, i64toi32_i32$2 = 0, $7_1 = 0;
  $5_1 = global$0 - 10240 | 0;
  global$0 = $5_1;
  HEAP8[1288 >> 0] = 1;
  HEAP32[1300 >> 2] = HEAP32[1228 >> 2] | 0;
  $0_1 = (HEAP32[1232 >> 2] | 0) - 2 | 0;
  HEAP32[1320 >> 2] = $0_1;
  $2_1 = $0_1 + ((HEAP32[1268 >> 2] | 0) << 1 | 0) | 0;
  HEAP32[1324 >> 2] = $2_1;
  HEAP8[1280 >> 0] = 0;
  HEAP16[1296 >> 1] = 0;
  HEAP16[1298 >> 1] = 0;
  HEAP8[1304 >> 0] = 0;
  HEAP32[1284 >> 2] = 0;
  HEAP8[1264 >> 0] = 0;
  HEAP32[1308 >> 2] = $5_1 + 2048 | 0;
  HEAP32[1312 >> 2] = $5_1;
  HEAP8[1316 >> 0] = 0;
  label$1 : {
   label$2 : {
    label$3 : {
     label$4 : while (1) {
      label$5 : {
       $1_1 = $0_1 + 2 | 0;
       HEAP32[1320 >> 2] = $1_1;
       if ($0_1 >>> 0 >= $2_1 >>> 0) {
        break label$5
       }
       label$6 : {
        $2_1 = HEAPU16[$1_1 >> 1] | 0;
        if (($2_1 - 9 | 0) >>> 0 < 5 >>> 0) {
         break label$6
        }
        label$7 : {
         label$8 : {
          label$9 : {
           switch ($2_1 - 101 | 0 | 0) {
           default:
            if (($2_1 | 0) == (32 | 0)) {
             break label$6
            }
            if (($2_1 | 0) == (47 | 0)) {
             break label$7
            }
            if (($2_1 | 0) == (59 | 0)) {
             break label$8
            }
            break label$3;
           case 0:
            if (HEAPU16[1298 >> 1] | 0) {
             break label$8
            }
            if (!($27($1_1 | 0) | 0)) {
             break label$8
            }
            if ($45($0_1 + 4 | 0 | 0, 1026 | 0, 10 | 0) | 0) {
             break label$8
            }
            $28();
            if (HEAPU8[1288 >> 0] | 0) {
             break label$8
            }
            $0_1 = HEAP32[1320 >> 2] | 0;
            HEAP32[1300 >> 2] = $0_1;
            break label$2;
           case 1:
           case 2:
           case 3:
            break label$3;
           case 4:
            break label$9;
           };
          }
          if (!($27($1_1 | 0) | 0)) {
           break label$8
          }
          if ($45($0_1 + 4 | 0 | 0, 1036 | 0, 10 | 0) | 0) {
           break label$8
          }
          $29();
         }
         HEAP32[1300 >> 2] = HEAP32[1320 >> 2] | 0;
         break label$6;
        }
        $1_1 = HEAPU16[($0_1 + 4 | 0) >> 1] | 0;
        if (($1_1 | 0) != (42 | 0)) {
         if (($1_1 | 0) != (47 | 0)) {
          break label$3
         }
         $30();
         break label$6;
        }
        $31(1 | 0);
       }
       $2_1 = HEAP32[1324 >> 2] | 0;
       $0_1 = HEAP32[1320 >> 2] | 0;
       continue label$4;
      }
      break label$4;
     };
     $2_1 = 0;
     $0_1 = $1_1;
     if (HEAPU8[1264 >> 0] | 0) {
      break label$1
     }
     break label$2;
    }
    HEAP32[1320 >> 2] = $0_1;
    HEAP8[1288 >> 0] = 0;
   }
   label$13 : while (1) {
    $1_1 = $0_1 + 2 | 0;
    HEAP32[1320 >> 2] = $1_1;
    label$14 : {
     label$15 : {
      label$16 : {
       label$17 : {
        label$18 : {
         label$19 : {
          if ((HEAP32[1324 >> 2] | 0) >>> 0 > $0_1 >>> 0) {
           label$21 : {
            label$22 : {
             label$23 : {
              label$24 : {
               label$25 : {
                label$26 : {
                 label$27 : {
                  label$28 : {
                   label$29 : {
                    label$30 : {
                     label$31 : {
                      label$32 : {
                       label$33 : {
                        $2_1 = HEAPU16[$1_1 >> 1] | 0;
                        switch ($2_1 - 32 | 0 | 0) {
                        case 0:
                         break label$14;
                        case 1:
                        case 3:
                        case 4:
                        case 5:
                        case 6:
                        case 10:
                        case 11:
                        case 13:
                        case 14:
                         break label$15;
                        case 15:
                         break label$23;
                        case 2:
                         break label$24;
                        case 7:
                         break label$25;
                        case 9:
                         break label$28;
                        case 12:
                         break label$29;
                        case 8:
                         break label$32;
                        default:
                         break label$33;
                        };
                       }
                       label$34 : {
                        switch ($2_1 - 91 | 0 | 0) {
                        default:
                         if (($2_1 - 9 | 0) >>> 0 < 5 >>> 0) {
                          break label$14
                         }
                         switch ($2_1 - 123 | 0 | 0) {
                         case 2:
                          break label$26;
                         case 0:
                          break label$27;
                         default:
                          break label$15;
                         };
                        case 10:
                         if (HEAPU16[1298 >> 1] | 0) {
                          break label$15
                         }
                         if (!($27($1_1 | 0) | 0)) {
                          break label$15
                         }
                         if ($45($0_1 + 4 | 0 | 0, 1026 | 0, 10 | 0) | 0) {
                          break label$15
                         }
                         $28();
                         break label$15;
                        case 14:
                         if (!($27($1_1 | 0) | 0)) {
                          break label$15
                         }
                         if ($45($0_1 + 4 | 0 | 0, 1036 | 0, 10 | 0) | 0) {
                          break label$15
                         }
                         $29();
                         break label$15;
                        case 1:
                        case 3:
                        case 4:
                        case 6:
                        case 7:
                        case 9:
                        case 11:
                        case 12:
                        case 13:
                         break label$15;
                        case 5:
                         break label$22;
                        case 2:
                         break label$30;
                        case 0:
                         break label$31;
                        case 8:
                         break label$34;
                        };
                       }
                       if (!($27($1_1 | 0) | 0)) {
                        break label$15
                       }
                       i64toi32_i32$0 = HEAPU8[($0_1 + 4 | 0) >> 0] | 0 | ((HEAPU8[($0_1 + 5 | 0) >> 0] | 0) << 8 | 0) | 0 | ((HEAPU8[($0_1 + 6 | 0) >> 0] | 0) << 16 | 0 | ((HEAPU8[($0_1 + 7 | 0) >> 0] | 0) << 24 | 0) | 0) | 0;
                       i64toi32_i32$1 = HEAPU8[($0_1 + 8 | 0) >> 0] | 0 | ((HEAPU8[($0_1 + 9 | 0) >> 0] | 0) << 8 | 0) | 0 | ((HEAPU8[($0_1 + 10 | 0) >> 0] | 0) << 16 | 0 | ((HEAPU8[($0_1 + 11 | 0) >> 0] | 0) << 24 | 0) | 0) | 0;
                       i64toi32_i32$2 = i64toi32_i32$0;
                       i64toi32_i32$0 = 7536755;
                       if ((i64toi32_i32$2 | 0) != (6357100 | 0) | (i64toi32_i32$1 | 0) != (i64toi32_i32$0 | 0) | 0) {
                        break label$15
                       }
                       $0_1 = HEAPU16[($0_1 + 12 | 0) >> 1] | 0;
                       $1_1 = $0_1 - 9 | 0;
                       if ($1_1 >>> 0 > 23 >>> 0 | !((1 << $1_1 | 0) & 8388639 | 0) | 0) {
                        break label$17
                       }
                       break label$16;
                      }
                      $0_1 = HEAPU16[1298 >> 1] | 0;
                      HEAP16[1298 >> 1] = $0_1 + 1 | 0;
                      $0_1 = (HEAP32[1308 >> 2] | 0) + ($0_1 << 3 | 0) | 0;
                      HEAP32[$0_1 >> 2] = 1;
                      HEAP32[($0_1 + 4 | 0) >> 2] = HEAP32[1300 >> 2] | 0;
                      break label$15;
                     }
                     $0_1 = HEAPU16[1298 >> 1] | 0;
                     HEAP16[1298 >> 1] = $0_1 + 1 | 0;
                     $0_1 = (HEAP32[1308 >> 2] | 0) + ($0_1 << 3 | 0) | 0;
                     HEAP32[$0_1 >> 2] = 8;
                     HEAP32[($0_1 + 4 | 0) >> 2] = HEAP32[1300 >> 2] | 0;
                     break label$15;
                    }
                    $0_1 = HEAPU16[1298 >> 1] | 0;
                    if (!$0_1) {
                     break label$18
                    }
                    HEAP16[1298 >> 1] = $0_1 - 1 | 0;
                    break label$15;
                   }
                   $1_1 = HEAPU16[1296 >> 1] | 0;
                   if (!$1_1) {
                    break label$15
                   }
                   $2_1 = HEAPU16[1298 >> 1] | 0;
                   if (!$2_1) {
                    break label$15
                   }
                   if ((HEAP32[(((HEAP32[1308 >> 2] | 0) + ($2_1 << 3 | 0) | 0) - 8 | 0) >> 2] | 0 | 0) != (5 | 0)) {
                    break label$15
                   }
                   $1_1 = HEAP32[(((HEAP32[1312 >> 2] | 0) + ($1_1 << 2 | 0) | 0) - 4 | 0) >> 2] | 0;
                   if (HEAP32[($1_1 + 4 | 0) >> 2] | 0) {
                    break label$15
                   }
                   HEAP32[1320 >> 2] = $0_1 + 4 | 0;
                   HEAP32[($1_1 + 4 | 0) >> 2] = (HEAP32[1300 >> 2] | 0) + 2 | 0;
                   $32(1 | 0) | 0;
                   $0_1 = HEAP32[1320 >> 2] | 0;
                   HEAP32[($1_1 + 16 | 0) >> 2] = $0_1;
                   HEAP32[1320 >> 2] = $0_1 - 2 | 0;
                   break label$15;
                  }
                  $1_1 = HEAPU16[1298 >> 1] | 0;
                  if (!$1_1) {
                   break label$18
                  }
                  $2_1 = $1_1 - 1 | 0;
                  HEAP16[1298 >> 1] = $2_1;
                  $1_1 = HEAPU16[1296 >> 1] | 0;
                  if (!$1_1) {
                   break label$15
                  }
                  if ((HEAP32[((HEAP32[1308 >> 2] | 0) + (($2_1 & 65535 | 0) << 3 | 0) | 0) >> 2] | 0 | 0) != (5 | 0)) {
                   break label$15
                  }
                  $2_1 = HEAP32[(((HEAP32[1312 >> 2] | 0) + ($1_1 << 2 | 0) | 0) - 4 | 0) >> 2] | 0;
                  if (!(HEAP32[($2_1 + 4 | 0) >> 2] | 0)) {
                   HEAP32[($2_1 + 4 | 0) >> 2] = (HEAP32[1300 >> 2] | 0) + 2 | 0
                  }
                  HEAP16[1296 >> 1] = $1_1 - 1 | 0;
                  HEAP32[($2_1 + 12 | 0) >> 2] = $0_1 + 4 | 0;
                  break label$15;
                 }
                 label$39 : {
                  $0_1 = HEAP32[1300 >> 2] | 0;
                  if ((HEAPU16[$0_1 >> 1] | 0 | 0) != (41 | 0)) {
                   break label$39
                  }
                  $1_1 = HEAP32[1252 >> 2] | 0;
                  if (!$1_1) {
                   break label$39
                  }
                  if ((HEAP32[($1_1 + 4 | 0) >> 2] | 0 | 0) != ($0_1 | 0)) {
                   break label$39
                  }
                  $1_1 = HEAP32[1256 >> 2] | 0;
                  HEAP32[1252 >> 2] = $1_1;
                  if ($1_1) {
                   HEAP32[($1_1 + 36 | 0) >> 2] = 0;
                   break label$39;
                  }
                  HEAP32[1236 >> 2] = 0;
                 }
                 $1_1 = HEAPU16[1298 >> 1] | 0;
                 HEAP16[1298 >> 1] = $1_1 + 1 | 0;
                 $1_1 = (HEAP32[1308 >> 2] | 0) + ($1_1 << 3 | 0) | 0;
                 HEAP32[$1_1 >> 2] = HEAPU8[1316 >> 0] | 0 ? 6 : 2;
                 HEAP32[($1_1 + 4 | 0) >> 2] = $0_1;
                 HEAP8[1316 >> 0] = 0;
                 break label$15;
                }
                $0_1 = HEAPU16[1298 >> 1] | 0;
                if (!$0_1) {
                 break label$18
                }
                $0_1 = $0_1 - 1 | 0;
                HEAP16[1298 >> 1] = $0_1;
                if ((HEAP32[((HEAP32[1308 >> 2] | 0) + (($0_1 & 65535 | 0) << 3 | 0) | 0) >> 2] | 0 | 0) == (4 | 0)) {
                 break label$21
                }
                break label$15;
               }
               $33(39 | 0);
               break label$15;
              }
              $33(34 | 0);
              break label$15;
             }
             label$41 : {
              $0_1 = HEAPU16[($0_1 + 4 | 0) >> 1] | 0;
              if (($0_1 | 0) != (42 | 0)) {
               if (($0_1 | 0) != (47 | 0)) {
                break label$41
               }
               $30();
               break label$14;
              }
              $31(1 | 0);
              break label$14;
             }
             label$43 : {
              label$44 : {
               label$45 : {
                label$46 : {
                 label$47 : {
                  $0_1 = HEAP32[1300 >> 2] | 0;
                  $1_1 = HEAPU16[$0_1 >> 1] | 0;
                  $2_1 = $1_1 - 33 | 0;
                  if (($1_1 | 0) != (41 | 0) & (($1_1 - 40 | 0) & 65535 | 0) >>> 0 < 7 >>> 0 | 0 | (($1_1 - 58 | 0) & 65535 | 0) >>> 0 < 6 >>> 0 | 0 | ((1 << $2_1 | 0) & 49 | 0 ? $2_1 >>> 0 <= 5 >>> 0 : 0) | 0) {
                   break label$47
                  }
                  label$48 : {
                   switch ($1_1 - 91 | 0 | 0) {
                   case 0:
                   case 3:
                    break label$47;
                   default:
                    break label$48;
                   };
                  }
                  $286 = ($1_1 | 0) != (125 | 0) & (($1_1 - 123 | 0) & 65535 | 0) >>> 0 < 4 >>> 0 | 0;
                  break label$46;
                 }
                 $286 = 1;
                }
                if ($286) {
                 label$50 : {
                  switch ($1_1 - 43 | 0 | 0) {
                  case 0:
                   if ((HEAPU16[($0_1 - 2 | 0) >> 1] | 0 | 0) == (43 | 0)) {
                    break label$44
                   }
                   break label$19;
                  case 3:
                   break label$45;
                  case 2:
                   break label$50;
                  default:
                   break label$19;
                  };
                 }
                 if ((HEAPU16[($0_1 - 2 | 0) >> 1] | 0 | 0) == (45 | 0)) {
                  break label$44
                 }
                 break label$19;
                }
                if (($1_1 | 0) != (41 | 0)) {
                 break label$44
                }
                $3_1 = 1;
                label$52 : {
                 $2_1 = HEAPU16[1298 >> 1] | 0;
                 $4_1 = HEAP32[(((HEAP32[1308 >> 2] | 0) + ($2_1 << 3 | 0) | 0) + 4 | 0) >> 2] | 0;
                 if ($34($4_1 | 0, 1180 | 0, 5 | 0) | 0) {
                  break label$52
                 }
                 if ($34($4_1 | 0, 1046 | 0, 3 | 0) | 0) {
                  break label$52
                 }
                 $3_1 = $34($4_1 | 0, 1190 | 0, 2 | 0) | 0;
                }
                if (!$3_1) {
                 break label$43
                }
                break label$19;
               }
               if ((((HEAPU16[($0_1 - 2 | 0) >> 1] | 0) - 48 | 0) & 65535 | 0) >>> 0 >= 10 >>> 0) {
                break label$19
               }
              }
              $2_1 = HEAPU16[1298 >> 1] | 0;
             }
             label$53 : {
              label$54 : {
               $2_1 = $2_1 & 65535 | 0;
               if (!$2_1 | ($1_1 | 0) != (102 | 0) | 0) {
                break label$54
               }
               $4_1 = (HEAP32[1308 >> 2] | 0) + (($2_1 - 1 | 0) << 3 | 0) | 0;
               if ((HEAP32[$4_1 >> 2] | 0 | 0) != (1 | 0)) {
                break label$54
               }
               if ((HEAPU16[($0_1 - 2 | 0) >> 1] | 0 | 0) != (111 | 0)) {
                break label$53
               }
               label$55 : {
                $3_1 = $0_1 - 4 | 0;
                $2_1 = HEAPU16[$3_1 >> 1] | 0;
                if (!(($2_1 - 9 | 0) >>> 0 < 5 >>> 0 | ($2_1 | 0) == (32 | 0) | 0 | (($2_1 | 0) == (41 | 0) | ($2_1 | 0) == (93 | 0) | 0) | 0 | ($2_1 | 0) == (160 | 0) | 0)) {
                 $362 = 0;
                 if (($2_1 | 0) != (125 | 0)) {
                  break label$55
                 }
                }
                $6_1 = HEAP32[1232 >> 2] | 0;
                label$57 : {
                 label$58 : while (1) {
                  label$59 : {
                   $2_1 = HEAPU16[$3_1 >> 1] | 0;
                   if ($3_1 >>> 0 <= $6_1 >>> 0) {
                    break label$59
                   }
                   if (($2_1 | 0) == (32 | 0) | ($2_1 - 9 | 0) >>> 0 < 5 >>> 0 | 0 | ($2_1 | 0) == (160 | 0) | 0) {
                    $3_1 = $3_1 - 2 | 0;
                    continue label$58;
                   } else {
                    if (!(($2_1 | 0) == (41 | 0) | ($2_1 | 0) == (93 | 0) | 0) & ($2_1 | 0) != (125 | 0) | 0) {
                     break label$57
                    }
                    $362 = 1;
                    break label$55;
                   }
                  }
                  break label$58;
                 };
                 $362 = 1;
                 if (($2_1 | 0) == (41 | 0) | ($2_1 | 0) == (93 | 0) | 0 | ($2_1 | 0) == (125 | 0) | 0) {
                  break label$55
                 }
                }
                $362 = ($39($2_1 | 0) | 0) ^ 1 | 0;
               }
               if (!$362) {
                break label$53
               }
               if (!($34(HEAP32[($4_1 + 4 | 0) >> 2] | 0 | 0, 1046 | 0, 3 | 0) | 0)) {
                break label$53
               }
               break label$19;
              }
              if (($1_1 | 0) != (125 | 0)) {
               break label$53
              }
              label$62 : {
               $4_1 = 1;
               label$63 : {
                label$64 : {
                 label$65 : {
                  label$66 : {
                   label$67 : {
                    label$68 : {
                     $6_1 = (HEAP32[1308 >> 2] | 0) + ($2_1 << 3 | 0) | 0;
                     $2_1 = HEAP32[($6_1 + 4 | 0) >> 2] | 0;
                     $3_1 = HEAPU16[$2_1 >> 1] | 0;
                     switch ($3_1 - 59 | 0 | 0) {
                     case 0:
                      break label$63;
                     case 1:
                     case 2:
                      break label$64;
                     case 3:
                      break label$67;
                     default:
                      break label$68;
                     };
                    }
                    label$69 : {
                     switch ($3_1 - 101 | 0 | 0) {
                     case 1:
                     case 2:
                      break label$64;
                     case 0:
                      break label$65;
                     case 3:
                      break label$66;
                     default:
                      break label$69;
                     };
                    }
                    if (($3_1 | 0) == (41 | 0)) {
                     break label$63
                    }
                    if (($3_1 | 0) != (121 | 0)) {
                     break label$64
                    }
                    $429 = $34($2_1 - 2 | 0 | 0, 1202 | 0, 6 | 0) | 0;
                    break label$62;
                   }
                   $429 = (HEAPU16[($2_1 - 2 | 0) >> 1] | 0 | 0) == (61 | 0);
                   break label$62;
                  }
                  $429 = $34($2_1 - 2 | 0 | 0, 1194 | 0, 4 | 0) | 0;
                  break label$62;
                 }
                 $429 = $34($2_1 - 2 | 0 | 0, 1214 | 0, 3 | 0) | 0;
                 break label$62;
                }
                $4_1 = 0;
               }
               $429 = $4_1;
              }
              if ($429) {
               break label$19
              }
              if ((HEAP32[$6_1 >> 2] | 0 | 0) == (6 | 0)) {
               break label$19
              }
             }
             label$70 : {
              $2_1 = 0;
              label$71 : {
               label$72 : {
                switch ((HEAPU16[$0_1 >> 1] | 0) - 100 | 0 | 0) {
                case 0:
                 label$81 : {
                  switch ((HEAPU16[($0_1 - 2 | 0) >> 1] | 0) - 105 | 0 | 0) {
                  case 0:
                   $455 = $34($0_1 - 4 | 0 | 0, 1088 | 0, 2 | 0) | 0;
                   break label$70;
                  case 3:
                   break label$81;
                  default:
                   break label$71;
                  };
                 }
                 $455 = $34($0_1 - 4 | 0 | 0, 1092 | 0, 3 | 0) | 0;
                 break label$70;
                case 1:
                 label$83 : {
                  switch ((HEAPU16[($0_1 - 2 | 0) >> 1] | 0) - 115 | 0 | 0) {
                  case 0:
                   $3_1 = HEAPU16[($0_1 - 4 | 0) >> 1] | 0;
                   if (($3_1 | 0) != (97 | 0)) {
                    if (($3_1 | 0) != (108 | 0)) {
                     break label$71
                    }
                    $455 = $40($0_1 - 6 | 0 | 0, 101 | 0) | 0;
                    break label$70;
                   }
                   $455 = $40($0_1 - 6 | 0 | 0, 99 | 0) | 0;
                   break label$70;
                  case 1:
                   $455 = $34($0_1 - 4 | 0 | 0, 1098 | 0, 4 | 0) | 0;
                   break label$70;
                  case 2:
                   break label$83;
                  default:
                   break label$71;
                  };
                 }
                 $455 = $34($0_1 - 4 | 0 | 0, 1106 | 0, 6 | 0) | 0;
                 break label$70;
                case 2:
                 if ((HEAPU16[($0_1 - 2 | 0) >> 1] | 0 | 0) != (111 | 0)) {
                  break label$71
                 }
                 if ((HEAPU16[($0_1 - 4 | 0) >> 1] | 0 | 0) != (101 | 0)) {
                  break label$71
                 }
                 $3_1 = HEAPU16[($0_1 - 6 | 0) >> 1] | 0;
                 if (($3_1 | 0) != (112 | 0)) {
                  if (($3_1 | 0) != (99 | 0)) {
                   break label$71
                  }
                  $455 = $34($0_1 - 8 | 0 | 0, 1118 | 0, 6 | 0) | 0;
                  break label$70;
                 }
                 $455 = $34($0_1 - 8 | 0 | 0, 1130 | 0, 2 | 0) | 0;
                 break label$70;
                case 7:
                 $455 = $34($0_1 - 2 | 0 | 0, 1134 | 0, 4 | 0) | 0;
                 break label$70;
                case 10:
                 $2_1 = 1;
                 $3_1 = $0_1 - 2 | 0;
                 if ($40($3_1 | 0, 105 | 0) | 0) {
                  break label$71
                 }
                 $455 = $34($3_1 | 0, 1142 | 0, 5 | 0) | 0;
                 break label$70;
                case 11:
                 $455 = $40($0_1 - 2 | 0 | 0, 100 | 0) | 0;
                 break label$70;
                case 14:
                 $455 = $34($0_1 - 2 | 0 | 0, 1152 | 0, 7 | 0) | 0;
                 break label$70;
                case 16:
                 $455 = $34($0_1 - 2 | 0 | 0, 1166 | 0, 4 | 0) | 0;
                 break label$70;
                case 19:
                 break label$72;
                default:
                 break label$71;
                };
               }
               $3_1 = HEAPU16[($0_1 - 2 | 0) >> 1] | 0;
               if (($3_1 | 0) != (111 | 0)) {
                if (($3_1 | 0) != (101 | 0)) {
                 break label$71
                }
                $455 = $40($0_1 - 4 | 0 | 0, 110 | 0) | 0;
                break label$70;
               }
               $2_1 = $34($0_1 - 4 | 0 | 0, 1174 | 0, 3 | 0) | 0;
              }
              $455 = $2_1;
             }
             if ($455 | !$1_1 | 0) {
              break label$19
             }
             if (($1_1 | 0) == (47 | 0) & (HEAPU8[1304 >> 0] | 0 | 0) != (0 | 0) | 0) {
              break label$19
             }
             label$89 : {
              $2_1 = HEAP32[1260 >> 2] | 0;
              if (!$2_1) {
               break label$89
              }
              if ($0_1 >>> 0 < (HEAP32[$2_1 >> 2] | 0) >>> 0) {
               break label$89
              }
              if ($0_1 >>> 0 <= (HEAP32[($2_1 + 4 | 0) >> 2] | 0) >>> 0) {
               break label$19
              }
             }
             $0_1 = $0_1 - 2 | 0;
             $2_1 = HEAP32[1232 >> 2] | 0;
             label$90 : {
              label$91 : while (1) {
               $3_1 = $0_1 + 2 | 0;
               if ($3_1 >>> 0 <= $2_1 >>> 0) {
                break label$90
               }
               HEAP32[1300 >> 2] = $0_1;
               $1_1 = HEAPU16[$0_1 >> 1] | 0;
               $0_1 = $0_1 - 2 | 0;
               if (!($35($1_1 | 0) | 0)) {
                continue label$91
               }
               break label$91;
              };
              $3_1 = $0_1 + 2 | 0;
             }
             if ($36($1_1 & 65535 | 0 | 0) | 0) {
              $0_1 = $3_1 - 2 | 0;
              label$93 : {
               label$94 : while (1) {
                $1_1 = $0_1 + 2 | 0;
                if ($1_1 >>> 0 <= $2_1 >>> 0) {
                 break label$93
                }
                HEAP32[1300 >> 2] = $0_1;
                $7_1 = HEAPU16[$0_1 >> 1] | 0;
                $0_1 = $0_1 - 2 | 0;
                if ($36($7_1 | 0) | 0) {
                 continue label$94
                }
                break label$94;
               };
               $1_1 = $0_1 + 2 | 0;
              }
              label$95 : {
               $0_1 = 0;
               label$96 : {
                $2_1 = HEAPU16[$1_1 >> 1] | 0;
                if (($2_1 | 0) != (101 | 0)) {
                 if (($2_1 | 0) != (107 | 0)) {
                  break label$96
                 }
                 $603 = $34($1_1 - 2 | 0 | 0, 1134 | 0, 4 | 0) | 0;
                 break label$95;
                }
                if ((HEAPU16[($1_1 - 2 | 0) >> 1] | 0 | 0) != (117 | 0)) {
                 break label$96
                }
                $0_1 = $34($1_1 - 4 | 0 | 0, 1106 | 0, 6 | 0) | 0;
               }
               $603 = $0_1;
              }
              if ($603) {
               break label$19
              }
             }
             HEAP8[1304 >> 0] = 1;
             break label$15;
            }
            $0_1 = HEAPU16[1298 >> 1] | 0;
            $1_1 = $0_1 << 3 | 0;
            HEAP32[(($1_1 + (HEAP32[1308 >> 2] | 0) | 0) + 4 | 0) >> 2] = HEAP32[1300 >> 2] | 0;
            HEAP16[1298 >> 1] = $0_1 + 1 | 0;
            HEAP32[((HEAP32[1308 >> 2] | 0) + $1_1 | 0) >> 2] = 3;
           }
           $0_1 = HEAP32[1320 >> 2] | 0;
           $2_1 = HEAP32[1324 >> 2] | 0;
           label$98 : {
            label$99 : {
             label$100 : while (1) {
              label$101 : {
               $1_1 = $0_1;
               $0_1 = $0_1 + 2 | 0;
               if ($1_1 >>> 0 >= $2_1 >>> 0) {
                break label$101
               }
               label$102 : {
                label$103 : {
                 label$104 : {
                  $3_1 = HEAPU16[$0_1 >> 1] | 0;
                  switch ($3_1 - 92 | 0 | 0) {
                  case 1:
                  case 2:
                  case 3:
                   continue label$100;
                  case 0:
                   break label$102;
                  case 4:
                   break label$103;
                  default:
                   break label$104;
                  };
                 }
                 if (($3_1 | 0) != (36 | 0)) {
                  continue label$100
                 }
                 if ((HEAPU16[($1_1 + 4 | 0) >> 1] | 0 | 0) != (123 | 0)) {
                  continue label$100
                 }
                 $0_1 = $1_1 + 4 | 0;
                 HEAP32[1320 >> 2] = $0_1;
                 $1_1 = HEAPU16[1298 >> 1] | 0;
                 HEAP16[1298 >> 1] = $1_1 + 1 | 0;
                 $1_1 = (HEAP32[1308 >> 2] | 0) + ($1_1 << 3 | 0) | 0;
                 HEAP32[$1_1 >> 2] = 4;
                 HEAP32[($1_1 + 4 | 0) >> 2] = $0_1;
                 break label$98;
                }
                HEAP32[1320 >> 2] = $0_1;
                $0_1 = (HEAPU16[1298 >> 1] | 0) - 1 | 0;
                HEAP16[1298 >> 1] = $0_1;
                if ((HEAP32[((HEAP32[1308 >> 2] | 0) + (($0_1 & 65535 | 0) << 3 | 0) | 0) >> 2] | 0 | 0) != (3 | 0)) {
                 break label$99
                }
                break label$98;
               }
               $0_1 = $1_1 + 4 | 0;
               continue label$100;
              }
              break label$100;
             };
             HEAP32[1320 >> 2] = $0_1;
            }
            $37();
           }
           break label$15;
          }
          $2_1 = !(HEAPU8[1264 >> 0] | 0 | (HEAPU16[1296 >> 1] | 0 | (HEAPU16[1298 >> 1] | 0) | 0) | 0);
          break label$1;
         }
         label$105 : {
          label$106 : while (1) {
           label$107 : {
            $0_1 = HEAP32[1320 >> 2] | 0;
            $1_1 = $0_1 + 2 | 0;
            HEAP32[1320 >> 2] = $1_1;
            if ($0_1 >>> 0 >= (HEAP32[1324 >> 2] | 0) >>> 0) {
             break label$107
            }
            label$108 : {
             label$109 : {
              label$110 : {
               $1_1 = HEAPU16[$1_1 >> 1] | 0;
               switch ($1_1 - 91 | 0 | 0) {
               case 1:
                break label$108;
               case 0:
                break label$109;
               default:
                break label$110;
               };
              }
              label$111 : {
               switch ($1_1 - 10 | 0 | 0) {
               case 1:
               case 2:
                continue label$106;
               case 0:
               case 3:
                break label$107;
               default:
                break label$111;
               };
              }
              if (($1_1 | 0) != (47 | 0)) {
               continue label$106
              }
              break label$105;
             }
             $0_1 = HEAP32[1320 >> 2] | 0;
             $2_1 = HEAP32[1324 >> 2] | 0;
             label$112 : {
              label$113 : {
               label$114 : while (1) {
                label$115 : {
                 $1_1 = $0_1 + 2 | 0;
                 if ($0_1 >>> 0 >= $2_1 >>> 0) {
                  break label$115
                 }
                 label$116 : {
                  label$117 : {
                   $3_1 = HEAPU16[$1_1 >> 1] | 0;
                   switch ($3_1 - 92 | 0 | 0) {
                   case 1:
                    break label$113;
                   case 0:
                    break label$116;
                   default:
                    break label$117;
                   };
                  }
                  $0_1 = $1_1;
                  switch ($3_1 - 10 | 0 | 0) {
                  case 0:
                  case 3:
                   break label$115;
                  default:
                   continue label$114;
                  };
                 }
                 $0_1 = $0_1 + 4 | 0;
                 continue label$114;
                }
                break label$114;
               };
               HEAP32[1320 >> 2] = $1_1;
               $37();
               break label$112;
              }
              HEAP32[1320 >> 2] = $1_1;
             }
             continue label$106;
            }
            HEAP32[1320 >> 2] = $0_1 + 4 | 0;
            continue label$106;
           }
           break label$106;
          };
          $37();
         }
         HEAP8[1304 >> 0] = 0;
         break label$15;
        }
        $37();
        $2_1 = 0;
        break label$1;
       }
       if (($0_1 | 0) != (160 | 0)) {
        break label$15
       }
      }
      HEAP8[1316 >> 0] = 1;
     }
     HEAP32[1300 >> 2] = HEAP32[1320 >> 2] | 0;
    }
    $0_1 = HEAP32[1320 >> 2] | 0;
    continue label$13;
   };
  }
  global$0 = $5_1 + 10240 | 0;
  return $2_1 | 0;
 }
 
 function $27($0_1) {
  $0_1 = $0_1 | 0;
  if (($0_1 | 0) == (HEAP32[1232 >> 2] | 0 | 0)) {
   return 1 | 0
  }
  return $38($0_1 - 2 | 0 | 0) | 0 | 0;
 }
 
 function $28() {
  var $0_1 = 0, $2_1 = 0, $1_1 = 0, $4_1 = 0, $3_1 = 0, i64toi32_i32$0 = 0, $5_1 = 0, i64toi32_i32$2 = 0, i64toi32_i32$3 = 0, i64toi32_i32$1 = 0, $158 = 0, $55 = 0, $6_1 = 0, $7_1 = 0;
  $3_1 = HEAP32[1320 >> 2] | 0;
  $2_1 = $3_1 + 12 | 0;
  HEAP32[1320 >> 2] = $2_1;
  $4_1 = HEAP32[1260 >> 2] | 0;
  $1_1 = $32(1 | 0) | 0;
  label$1 : {
   label$2 : {
    label$3 : {
     label$4 : {
      label$5 : {
       label$6 : {
        label$7 : {
         label$8 : {
          label$9 : {
           label$10 : {
            $0_1 = HEAP32[1320 >> 2] | 0;
            if (($2_1 | 0) == ($0_1 | 0)) {
             if (!($39($1_1 | 0) | 0)) {
              break label$10
             }
            }
            label$12 : {
             label$13 : {
              label$14 : {
               label$15 : {
                label$16 : {
                 label$17 : {
                  if (($1_1 | 0) != (42 | 0)) {
                   if (($1_1 | 0) != (123 | 0)) {
                    break label$17
                   }
                   HEAP32[1320 >> 2] = $0_1 + 2 | 0;
                   $1_1 = $32(1 | 0) | 0;
                   $0_1 = HEAP32[1320 >> 2] | 0;
                   label$19 : while (1) {
                    label$20 : {
                     $2_1 = $1_1 & 65535 | 0;
                     if (!(($2_1 | 0) == (34 | 0) | ($2_1 | 0) == (39 | 0) | 0)) {
                      $43($2_1 | 0) | 0;
                      $1_1 = HEAP32[1320 >> 2] | 0;
                      break label$20;
                     }
                     $33($2_1 | 0);
                     $1_1 = (HEAP32[1320 >> 2] | 0) + 2 | 0;
                     HEAP32[1320 >> 2] = $1_1;
                    }
                    $32(1 | 0) | 0;
                    $1_1 = $44($0_1 | 0, $1_1 | 0) | 0;
                    if (($1_1 | 0) == (44 | 0)) {
                     HEAP32[1320 >> 2] = (HEAP32[1320 >> 2] | 0) + 2 | 0;
                     $1_1 = $32(1 | 0) | 0;
                    }
                    if (($1_1 | 0) == (125 | 0)) {
                     break label$16
                    }
                    $55 = $0_1;
                    $0_1 = HEAP32[1320 >> 2] | 0;
                    if (($55 | 0) == ($0_1 | 0)) {
                     break label$3
                    }
                    if ($0_1 >>> 0 <= (HEAP32[1324 >> 2] | 0) >>> 0) {
                     continue label$19
                    }
                    break label$19;
                   };
                   break label$3;
                  }
                  HEAP32[1320 >> 2] = $0_1 + 2 | 0;
                  $32(1 | 0) | 0;
                  $0_1 = HEAP32[1320 >> 2] | 0;
                  $44($0_1 | 0, $0_1 | 0) | 0;
                  break label$15;
                 }
                 HEAP8[1288 >> 0] = 0;
                 label$23 : {
                  label$24 : {
                   switch ($1_1 - 97 | 0 | 0) {
                   default:
                    if (($1_1 | 0) == (118 | 0)) {
                     break label$23
                    }
                    break label$10;
                   case 3:
                    $1_1 = $0_1 + 14 | 0;
                    HEAP32[1320 >> 2] = $1_1;
                    label$29 : {
                     switch (($32(1 | 0) | 0) - 97 | 0 | 0) {
                     case 0:
                      $2_1 = HEAP32[1320 >> 2] | 0;
                      i64toi32_i32$2 = $2_1;
                      i64toi32_i32$0 = HEAPU8[($2_1 + 2 | 0) >> 0] | 0 | ((HEAPU8[($2_1 + 3 | 0) >> 0] | 0) << 8 | 0) | 0 | ((HEAPU8[($2_1 + 4 | 0) >> 0] | 0) << 16 | 0 | ((HEAPU8[($2_1 + 5 | 0) >> 0] | 0) << 24 | 0) | 0) | 0;
                      i64toi32_i32$1 = HEAPU8[($2_1 + 6 | 0) >> 0] | 0 | ((HEAPU8[($2_1 + 7 | 0) >> 0] | 0) << 8 | 0) | 0 | ((HEAPU8[($2_1 + 8 | 0) >> 0] | 0) << 16 | 0 | ((HEAPU8[($2_1 + 9 | 0) >> 0] | 0) << 24 | 0) | 0) | 0;
                      i64toi32_i32$2 = i64toi32_i32$0;
                      i64toi32_i32$0 = 6488174;
                      i64toi32_i32$3 = 7929971;
                      if ((i64toi32_i32$2 | 0) != (i64toi32_i32$3 | 0) | (i64toi32_i32$1 | 0) != (i64toi32_i32$0 | 0) | 0) {
                       break label$4
                      }
                      if (!($36(HEAPU16[($2_1 + 10 | 0) >> 1] | 0 | 0) | 0)) {
                       break label$4
                      }
                      HEAP32[1320 >> 2] = $2_1 + 10 | 0;
                      $32(0 | 0) | 0;
                     case 5:
                      $4_1 = HEAP32[1320 >> 2] | 0;
                      if ($45($4_1 + 2 | 0 | 0, 1074 | 0, 14 | 0) | 0) {
                       break label$4
                      }
                      $3_1 = HEAPU16[($4_1 + 16 | 0) >> 1] | 0;
                      $2_1 = $3_1 - 9 | 0;
                      if ($2_1 >>> 0 > 23 >>> 0 | !((1 << $2_1 | 0) & 8388639 | 0) | 0) {
                       break label$7
                      }
                      break label$6;
                     case 2:
                      break label$29;
                     default:
                      break label$4;
                     };
                    }
                    $4_1 = HEAP32[1320 >> 2] | 0;
                    i64toi32_i32$3 = $4_1;
                    i64toi32_i32$2 = HEAPU8[($4_1 + 2 | 0) >> 0] | 0 | ((HEAPU8[($4_1 + 3 | 0) >> 0] | 0) << 8 | 0) | 0 | ((HEAPU8[($4_1 + 4 | 0) >> 0] | 0) << 16 | 0 | ((HEAPU8[($4_1 + 5 | 0) >> 0] | 0) << 24 | 0) | 0) | 0;
                    i64toi32_i32$1 = HEAPU8[($4_1 + 6 | 0) >> 0] | 0 | ((HEAPU8[($4_1 + 7 | 0) >> 0] | 0) << 8 | 0) | 0 | ((HEAPU8[($4_1 + 8 | 0) >> 0] | 0) << 16 | 0 | ((HEAPU8[($4_1 + 9 | 0) >> 0] | 0) << 24 | 0) | 0) | 0;
                    i64toi32_i32$3 = i64toi32_i32$2;
                    i64toi32_i32$2 = 7536755;
                    i64toi32_i32$0 = 6357100;
                    if ((i64toi32_i32$3 | 0) != (i64toi32_i32$0 | 0) | (i64toi32_i32$1 | 0) != (i64toi32_i32$2 | 0) | 0) {
                     break label$4
                    }
                    $3_1 = HEAPU16[($4_1 + 10 | 0) >> 1] | 0;
                    $2_1 = $3_1 - 9 | 0;
                    if ($2_1 >>> 0 <= 23 >>> 0) {
                     break label$14
                    }
                    break label$9;
                   case 0:
                    HEAP32[1320 >> 2] = $0_1 + 10 | 0;
                    $32(0 | 0) | 0;
                    $0_1 = HEAP32[1320 >> 2] | 0;
                   case 5:
                    HEAP32[1320 >> 2] = $0_1 + 16 | 0;
                    $0_1 = $32(1 | 0) | 0;
                    if (($0_1 | 0) == (42 | 0)) {
                     HEAP32[1320 >> 2] = (HEAP32[1320 >> 2] | 0) + 2 | 0;
                     $0_1 = $32(1 | 0) | 0;
                    }
                    break label$2;
                   case 1:
                   case 4:
                   case 6:
                   case 7:
                   case 8:
                   case 9:
                   case 10:
                    break label$10;
                   case 11:
                    break label$23;
                   case 2:
                    break label$24;
                   };
                  }
                  label$33 : {
                   i64toi32_i32$0 = $0_1;
                   i64toi32_i32$3 = HEAPU8[($0_1 + 2 | 0) >> 0] | 0 | ((HEAPU8[($0_1 + 3 | 0) >> 0] | 0) << 8 | 0) | 0 | ((HEAPU8[($0_1 + 4 | 0) >> 0] | 0) << 16 | 0 | ((HEAPU8[($0_1 + 5 | 0) >> 0] | 0) << 24 | 0) | 0) | 0;
                   i64toi32_i32$1 = HEAPU8[($0_1 + 6 | 0) >> 0] | 0 | ((HEAPU8[($0_1 + 7 | 0) >> 0] | 0) << 8 | 0) | 0 | ((HEAPU8[($0_1 + 8 | 0) >> 0] | 0) << 16 | 0 | ((HEAPU8[($0_1 + 9 | 0) >> 0] | 0) << 24 | 0) | 0) | 0;
                   i64toi32_i32$0 = i64toi32_i32$3;
                   i64toi32_i32$3 = 7536755;
                   i64toi32_i32$2 = 6357100;
                   if ((i64toi32_i32$0 | 0) != (i64toi32_i32$2 | 0) | (i64toi32_i32$1 | 0) != (i64toi32_i32$3 | 0) | 0) {
                    break label$33
                   }
                   if (!($35(HEAPU16[($0_1 + 10 | 0) >> 1] | 0 | 0) | 0)) {
                    break label$33
                   }
                   HEAP32[1320 >> 2] = $0_1 + 10 | 0;
                   $0_1 = $32(1 | 0) | 0;
                   break label$2;
                  }
                  $0_1 = $0_1 + 4 | 0;
                  HEAP32[1320 >> 2] = $0_1;
                 }
                 HEAP32[1320 >> 2] = $0_1 + 6 | 0;
                 HEAP8[1288 >> 0] = 0;
                 $6_1 = $32(1 | 0) | 0;
                 $1_1 = HEAP32[1320 >> 2] | 0;
                 $7_1 = $43($6_1 | 0) | 0;
                 $3_1 = HEAP32[1320 >> 2] | 0;
                 $2_1 = $7_1 & 65503 | 0;
                 if (($2_1 | 0) != (91 | 0)) {
                  break label$13
                 }
                 HEAP32[1320 >> 2] = $3_1 + 2 | 0;
                 $5_1 = $32(1 | 0) | 0;
                 $1_1 = HEAP32[1320 >> 2] | 0;
                 $158 = 0;
                 break label$12;
                }
                HEAP8[1280 >> 0] = 1;
                HEAP32[1320 >> 2] = (HEAP32[1320 >> 2] | 0) + 2 | 0;
               }
               $0_1 = $32(1 | 0) | 0;
               $2_1 = HEAP32[1320 >> 2] | 0;
               label$34 : {
                if (($0_1 | 0) != (102 | 0)) {
                 break label$34
                }
                if ($45($2_1 + 2 | 0 | 0, 1068 | 0, 6 | 0) | 0) {
                 break label$34
                }
                HEAP32[1320 >> 2] = $2_1 + 8 | 0;
                $42($3_1 | 0, $32(1 | 0) | 0 | 0, 0 | 0);
                $1_1 = $4_1 ? $4_1 + 16 | 0 : 1240;
                label$35 : while (1) {
                 $0_1 = HEAP32[$1_1 >> 2] | 0;
                 if (!$0_1) {
                  break label$10
                 }
                 i64toi32_i32$1 = $0_1;
                 i64toi32_i32$0 = 0;
                 HEAP32[($0_1 + 8 | 0) >> 2] = 0;
                 HEAP32[($0_1 + 12 | 0) >> 2] = i64toi32_i32$0;
                 $1_1 = $0_1 + 16 | 0;
                 continue label$35;
                };
               }
               HEAP32[1320 >> 2] = $2_1 - 2 | 0;
               break label$10;
              }
              if (!((1 << $2_1 | 0) & 8388639 | 0)) {
               break label$9
              }
              break label$8;
             }
             $158 = 1;
            }
            $0_1 = $158;
            label$36 : while (1) {
             if (!$0_1) {
              $43($5_1 & 65535 | 0 | 0) | 0;
              $0_1 = 1;
              continue label$36;
             }
             label$38 : {
              $0_1 = HEAP32[1320 >> 2] | 0;
              if (($1_1 | 0) != ($0_1 | 0)) {
               $2($1_1 | 0, $0_1 | 0, $1_1 | 0, $0_1 | 0);
               $0_1 = $32(1 | 0) | 0;
               if (($2_1 | 0) == (91 | 0) & ($0_1 | 32 | 0 | 0) == (125 | 0) | 0) {
                break label$10
               }
               $1_1 = HEAP32[1320 >> 2] | 0;
               if (($0_1 | 0) == (44 | 0)) {
                HEAP32[1320 >> 2] = $1_1 + 2 | 0;
                $5_1 = $32(1 | 0) | 0;
                $1_1 = HEAP32[1320 >> 2] | 0;
                if (($5_1 | 32 | 0 | 0) != (123 | 0)) {
                 break label$38
                }
               }
               HEAP32[1320 >> 2] = $1_1 - 2 | 0;
              }
              if (($2_1 | 0) != (91 | 0)) {
               break label$10
              }
              HEAP32[1320 >> 2] = $3_1 - 2 | 0;
              return;
             }
             $0_1 = 0;
             continue label$36;
            };
           }
           return;
          }
          if (($3_1 | 0) == (160 | 0)) {
           break label$8
          }
          if (($3_1 | 0) != (123 | 0)) {
           break label$4
          }
         }
         HEAP32[1320 >> 2] = $4_1 + 10 | 0;
         $5_1 = $32(1 | 0) | 0;
         if (($5_1 | 0) == (123 | 0)) {
          break label$4
         }
         break label$5;
        }
        label$41 : {
         switch ($3_1 - 40 | 0 | 0) {
         case 1:
          break label$4;
         case 0:
         case 2:
          break label$6;
         default:
          break label$41;
         };
        }
        if (($3_1 | 0) != (160 | 0)) {
         break label$4
        }
       }
       HEAP32[1320 >> 2] = $4_1 + 16 | 0;
       $5_1 = $32(1 | 0) | 0;
       if (($5_1 | 0) == (42 | 0)) {
        HEAP32[1320 >> 2] = (HEAP32[1320 >> 2] | 0) + 2 | 0;
        $5_1 = $32(1 | 0) | 0;
       }
       if (($5_1 | 0) == (40 | 0)) {
        break label$4
       }
      }
      $3_1 = HEAP32[1320 >> 2] | 0;
      $43($5_1 | 0) | 0;
      $2_1 = HEAP32[1320 >> 2] | 0;
      if ($2_1 >>> 0 <= $3_1 >>> 0) {
       break label$4
      }
      $2($0_1 | 0, $1_1 | 0, $3_1 | 0, $2_1 | 0);
      break label$1;
     }
     $2($0_1 | 0, $1_1 | 0, 0 | 0, 0 | 0);
     HEAP32[1320 >> 2] = $0_1 + 12 | 0;
     return;
    }
    $37();
    return;
   }
   $2_1 = HEAP32[1320 >> 2] | 0;
   $43($0_1 | 0) | 0;
   $0_1 = HEAP32[1320 >> 2] | 0;
   $2($2_1 | 0, $0_1 | 0, $2_1 | 0, $0_1 | 0);
  }
  HEAP32[1320 >> 2] = (HEAP32[1320 >> 2] | 0) - 2 | 0;
 }
 
 function $29() {
  var $0_1 = 0, $1_1 = 0, $2_1 = 0, $3_1 = 0, $4_1 = 0, $5_1 = 0, $58 = 0, i64toi32_i32$2 = 0, i64toi32_i32$0 = 0, $6_1 = 0, i64toi32_i32$3 = 0, $8_1 = 0, i64toi32_i32$1 = 0, $7_1 = 0, $9_1 = 0, $211 = 0, $10_1 = 0;
  $4_1 = HEAP32[1320 >> 2] | 0;
  $8_1 = $4_1 + 12 | 0;
  HEAP32[1320 >> 2] = $8_1;
  $0_1 = $32(1 | 0) | 0;
  $2_1 = HEAP32[1320 >> 2] | 0;
  label$1 : {
   label$2 : {
    label$3 : {
     label$4 : {
      label$5 : {
       label$6 : {
        label$7 : {
         if (($0_1 | 0) == (46 | 0)) {
          HEAP32[1320 >> 2] = $2_1 + 2 | 0;
          $0_1 = $32(1 | 0) | 0;
          if (($0_1 | 0) != (100 | 0)) {
           if (($0_1 | 0) != (115 | 0)) {
            if (($0_1 | 0) != (109 | 0)) {
             break label$3
            }
            $0_1 = HEAP32[1320 >> 2] | 0;
            if ($45($0_1 + 2 | 0 | 0, 1052 | 0, 6 | 0) | 0) {
             break label$3
            }
            $1_1 = HEAP32[1300 >> 2] | 0;
            if (!($41($1_1 | 0) | 0)) {
             if ((HEAPU16[$1_1 >> 1] | 0 | 0) == (46 | 0)) {
              break label$3
             }
            }
            $1($4_1 | 0, $4_1 | 0, $0_1 + 8 | 0 | 0, HEAP32[1224 >> 2] | 0 | 0);
            return;
           }
           $0_1 = HEAP32[1320 >> 2] | 0;
           if ($45($0_1 + 2 | 0 | 0, 1058 | 0, 10 | 0) | 0) {
            break label$3
           }
           $1_1 = HEAP32[1300 >> 2] | 0;
           if (!($41($1_1 | 0) | 0)) {
            if ((HEAPU16[$1_1 >> 1] | 0 | 0) == (46 | 0)) {
             break label$3
            }
           }
           HEAP32[1320 >> 2] = $0_1 + 12 | 0;
           $6_1 = 1;
           $3_1 = 5;
           $0_1 = $32(1 | 0) | 0;
           $58 = 1;
           break label$7;
          }
          $0_1 = HEAP32[1320 >> 2] | 0;
          i64toi32_i32$2 = $0_1;
          i64toi32_i32$0 = HEAPU8[($0_1 + 2 | 0) >> 0] | 0 | ((HEAPU8[($0_1 + 3 | 0) >> 0] | 0) << 8 | 0) | 0 | ((HEAPU8[($0_1 + 4 | 0) >> 0] | 0) << 16 | 0 | ((HEAPU8[($0_1 + 5 | 0) >> 0] | 0) << 24 | 0) | 0) | 0;
          i64toi32_i32$1 = HEAPU8[($0_1 + 6 | 0) >> 0] | 0 | ((HEAPU8[($0_1 + 7 | 0) >> 0] | 0) << 8 | 0) | 0 | ((HEAPU8[($0_1 + 8 | 0) >> 0] | 0) << 16 | 0 | ((HEAPU8[($0_1 + 9 | 0) >> 0] | 0) << 24 | 0) | 0) | 0;
          i64toi32_i32$2 = i64toi32_i32$0;
          i64toi32_i32$0 = 7471205;
          i64toi32_i32$3 = 6684773;
          if ((i64toi32_i32$2 | 0) != (i64toi32_i32$3 | 0) | (i64toi32_i32$1 | 0) != (i64toi32_i32$0 | 0) | 0) {
           break label$3
          }
          $1_1 = HEAP32[1300 >> 2] | 0;
          if (!($41($1_1 | 0) | 0)) {
           if ((HEAPU16[$1_1 >> 1] | 0 | 0) == (46 | 0)) {
            break label$3
           }
          }
          HEAP32[1320 >> 2] = $0_1 + 10 | 0;
          $3_1 = 7;
          $7_1 = 1;
          $0_1 = $32(1 | 0) | 0;
          $6_1 = 1;
          $58 = 2;
          break label$7;
         }
         label$14 : {
          label$15 : {
           label$16 : {
            label$17 : {
             if (($0_1 | 0) != (115 | 0) | $2_1 >>> 0 <= $8_1 >>> 0 | 0) {
              break label$17
             }
             if ($45($2_1 + 2 | 0 | 0, 1058 | 0, 10 | 0) | 0) {
              break label$17
             }
             $1_1 = HEAPU16[($2_1 + 12 | 0) >> 1] | 0;
             $3_1 = $1_1 - 9 | 0;
             if (((1 << $3_1 | 0) & 8388639 | 0 ? $3_1 >>> 0 <= 23 >>> 0 : 0) | ($1_1 | 0) == (160 | 0) | 0) {
              break label$16
             }
            }
            $3_1 = 7;
            $9_1 = 1;
            if (($0_1 | 0) == (100 | 0)) {
             break label$15
            }
            break label$14;
           }
           $0_1 = $2_1 + 12 | 0;
           HEAP32[1320 >> 2] = $0_1;
           $6_1 = 1;
           $1_1 = $32(1 | 0) | 0;
           $3_1 = HEAP32[1320 >> 2] | 0;
           if (($0_1 | 0) != ($3_1 | 0)) {
            $0_1 = 102;
            if (($1_1 | 0) != (102 | 0)) {
             $3_1 = 5;
             $0_1 = $1_1;
             $58 = 1;
             break label$7;
            }
            $5_1 = 1;
            if ($45($3_1 + 2 | 0 | 0, 1068 | 0, 6 | 0) | 0) {
             break label$6
            }
            if (!($35(HEAPU16[($3_1 + 8 | 0) >> 1] | 0 | 0) | 0)) {
             break label$6
            }
           }
           HEAP32[1320 >> 2] = $2_1;
           $3_1 = 7;
           $9_1 = 1;
           $6_1 = 0;
           $0_1 = $1_1;
           $58 = 0;
           break label$7;
          }
          if ($2_1 >>> 0 <= ($4_1 + 10 | 0) >>> 0) {
           break label$14
          }
          $0_1 = 100;
          label$20 : {
           i64toi32_i32$3 = $2_1;
           i64toi32_i32$2 = HEAPU8[($2_1 + 2 | 0) >> 0] | 0 | ((HEAPU8[($2_1 + 3 | 0) >> 0] | 0) << 8 | 0) | 0 | ((HEAPU8[($2_1 + 4 | 0) >> 0] | 0) << 16 | 0 | ((HEAPU8[($2_1 + 5 | 0) >> 0] | 0) << 24 | 0) | 0) | 0;
           i64toi32_i32$1 = HEAPU8[($2_1 + 6 | 0) >> 0] | 0 | ((HEAPU8[($2_1 + 7 | 0) >> 0] | 0) << 8 | 0) | 0 | ((HEAPU8[($2_1 + 8 | 0) >> 0] | 0) << 16 | 0 | ((HEAPU8[($2_1 + 9 | 0) >> 0] | 0) << 24 | 0) | 0) | 0;
           i64toi32_i32$3 = i64toi32_i32$2;
           i64toi32_i32$2 = 7471205;
           i64toi32_i32$0 = 6684773;
           if ((i64toi32_i32$3 | 0) != (i64toi32_i32$0 | 0) | (i64toi32_i32$1 | 0) != (i64toi32_i32$2 | 0) | 0) {
            break label$20
           }
           $1_1 = HEAPU16[($2_1 + 10 | 0) >> 1] | 0;
           $5_1 = $1_1 - 9 | 0;
           if (!((1 << $5_1 | 0) & 8388639 | 0 ? $5_1 >>> 0 <= 23 >>> 0 : 0)) {
            $5_1 = 0;
            if (($1_1 | 0) != (160 | 0)) {
             break label$20
            }
           }
           HEAP32[1320 >> 2] = $2_1 + 10 | 0;
           $0_1 = 42;
           $7_1 = 1;
           $5_1 = 2;
           $1_1 = $32(1 | 0) | 0;
           if (($1_1 | 0) == (42 | 0)) {
            break label$5
           }
           HEAP32[1320 >> 2] = $2_1;
           $7_1 = 0;
           $0_1 = $1_1;
           $58 = 0;
           break label$7;
          }
          $3_1 = $2_1;
          break label$6;
         }
         $58 = 0;
        }
        $5_1 = $58;
        if (($0_1 | 0) == (40 | 0)) {
         $0_1 = HEAPU16[1298 >> 1] | 0;
         $1_1 = (HEAP32[1308 >> 2] | 0) + ($0_1 << 3 | 0) | 0;
         HEAP32[($1_1 + 4 | 0) >> 2] = HEAP32[1320 >> 2] | 0;
         HEAP16[1298 >> 1] = $0_1 + 1 | 0;
         HEAP32[$1_1 >> 2] = 5;
         if ((HEAPU16[(HEAP32[1300 >> 2] | 0) >> 1] | 0 | 0) == (46 | 0)) {
          break label$3
         }
         $1_1 = HEAP32[1320 >> 2] | 0;
         HEAP32[1320 >> 2] = $1_1 + 2 | 0;
         $0_1 = $32(1 | 0) | 0;
         $1($4_1 | 0, HEAP32[1320 >> 2] | 0 | 0, 0 | 0, $1_1 | 0);
         label$23 : {
          if (!$6_1) {
           $1_1 = HEAP32[1252 >> 2] | 0;
           break label$23;
          }
          $1_1 = HEAP32[1252 >> 2] | 0;
          HEAP32[($1_1 + 28 | 0) >> 2] = $3_1;
         }
         $2_1 = HEAPU16[1296 >> 1] | 0;
         HEAP16[1296 >> 1] = $2_1 + 1 | 0;
         HEAP32[((HEAP32[1312 >> 2] | 0) + ($2_1 << 2 | 0) | 0) >> 2] = $1_1;
         label$25 : {
          if (!(($0_1 | 0) == (34 | 0) | ($0_1 | 0) == (39 | 0) | 0)) {
           if (($0_1 | 0) == (96 | 0)) {
            label$28 : {
             $2_1 = HEAP32[1324 >> 2] | 0;
             $3_1 = HEAP32[1320 >> 2] | 0;
             $0_1 = $3_1;
             label$29 : {
              label$30 : while (1) {
               $1_1 = $0_1;
               if ($2_1 >>> 0 > $0_1 >>> 0) {
                label$32 : {
                 label$33 : {
                  $0_1 = $1_1 + 2 | 0;
                  $4_1 = HEAPU16[$0_1 >> 1] | 0;
                  switch ($4_1 - 92 | 0 | 0) {
                  case 4:
                   break label$29;
                  case 1:
                  case 2:
                  case 3:
                   continue label$30;
                  case 0:
                   break label$33;
                  default:
                   break label$32;
                  };
                 }
                 $0_1 = $1_1 + 4 | 0;
                 continue label$30;
                }
                if (($4_1 | 0) != (36 | 0)) {
                 continue label$30
                }
                if ((HEAPU16[($1_1 + 4 | 0) >> 1] | 0 | 0) != (123 | 0)) {
                 continue label$30
                }
               }
               break label$30;
              };
              HEAP32[1320 >> 2] = $3_1;
              $211 = 0;
              break label$28;
             }
             HEAP32[1320 >> 2] = $0_1;
             $211 = 1;
            }
            if ($211) {
             break label$25
            }
           }
           break label$1;
          }
          $33($0_1 | 0);
         }
         $0_1 = (HEAP32[1320 >> 2] | 0) + 2 | 0;
         HEAP32[1320 >> 2] = $0_1;
         label$34 : {
          switch (($32(1 | 0) | 0) - 41 | 0 | 0) {
          case 3:
           HEAP32[1320 >> 2] = (HEAP32[1320 >> 2] | 0) + 2 | 0;
           $32(1 | 0) | 0;
           $1_1 = HEAP32[1252 >> 2] | 0;
           HEAP32[($1_1 + 4 | 0) >> 2] = $0_1;
           HEAP8[($1_1 + 24 | 0) >> 0] = 1;
           $0_1 = HEAP32[1320 >> 2] | 0;
           HEAP32[($1_1 + 16 | 0) >> 2] = $0_1;
           break label$2;
          case 0:
           $1_1 = HEAP32[1252 >> 2] | 0;
           HEAP32[($1_1 + 4 | 0) >> 2] = $0_1;
           HEAP8[($1_1 + 24 | 0) >> 0] = 1;
           HEAP16[1298 >> 1] = (HEAPU16[1298 >> 1] | 0) - 1 | 0;
           HEAP32[($1_1 + 12 | 0) >> 2] = (HEAP32[1320 >> 2] | 0) + 2 | 0;
           HEAP16[1296 >> 1] = (HEAPU16[1296 >> 1] | 0) - 1 | 0;
           return;
          default:
           break label$34;
          };
         }
         break label$1;
        }
        if (!(!$9_1 | ($0_1 | 0) != (123 | 0) | 0)) {
         $0_1 = HEAP32[1320 >> 2] | 0;
         if (HEAPU16[1298 >> 1] | 0) {
          break label$2
         }
         label$38 : while (1) {
          label$39 : {
           label$40 : {
            if ((HEAP32[1324 >> 2] | 0) >>> 0 > $0_1 >>> 0) {
             $0_1 = $32(1 | 0) | 0;
             if (($0_1 | 0) == (34 | 0) | ($0_1 | 0) == (39 | 0) | 0) {
              break label$40
             }
             if (($0_1 | 0) != (125 | 0)) {
              break label$39
             }
             HEAP32[1320 >> 2] = (HEAP32[1320 >> 2] | 0) + 2 | 0;
            }
            $10_1 = $32(1 | 0) | 0;
            $0_1 = HEAP32[1320 >> 2] | 0;
            if (($10_1 | 0) == (102 | 0)) {
             if ($45($0_1 + 2 | 0 | 0, 1068 | 0, 6 | 0) | 0) {
              break label$4
             }
            }
            HEAP32[1320 >> 2] = $0_1 + 8 | 0;
            $0_1 = $32(1 | 0) | 0;
            if (($0_1 | 0) != (34 | 0) & ($0_1 | 0) != (39 | 0) | 0) {
             break label$4
            }
            $42($4_1 | 0, $0_1 | 0, 0 | 0);
            return;
           }
           $33($0_1 | 0);
          }
          $0_1 = (HEAP32[1320 >> 2] | 0) + 2 | 0;
          HEAP32[1320 >> 2] = $0_1;
          continue label$38;
         };
        }
        label$43 : {
         switch ($0_1 - 39 | 0 | 0) {
         default:
          if (($0_1 | 0) == (34 | 0)) {
           break label$5
          }
          break;
         case 1:
         case 2:
          break label$43;
         case 0:
         case 3:
          break label$5;
         };
        }
        $3_1 = HEAP32[1320 >> 2] | 0;
       }
       if (($3_1 | 0) != ($8_1 | 0)) {
        break label$5
       }
       HEAP32[1320 >> 2] = $4_1 + 10 | 0;
       return;
      }
      if (($0_1 | 0) != (42 | 0) & $7_1 | 0) {
       break label$1
      }
      if (HEAPU16[1298 >> 1] | 0) {
       break label$1
      }
      $0_1 = HEAP32[1320 >> 2] | 0;
      $2_1 = HEAP32[1324 >> 2] | 0;
      label$45 : while (1) {
       if ($0_1 >>> 0 >= $2_1 >>> 0) {
        break label$4
       }
       $1_1 = HEAPU16[$0_1 >> 1] | 0;
       if (($1_1 | 0) != (39 | 0) & ($1_1 | 0) != (34 | 0) | 0) {
        $0_1 = $0_1 + 2 | 0;
        HEAP32[1320 >> 2] = $0_1;
        continue label$45;
       } else {
        $42($4_1 | 0, $1_1 | 0, $5_1 | 0);
        return;
       }
      };
     }
     $37();
    }
    return;
   }
   HEAP32[1320 >> 2] = $0_1 - 2 | 0;
   return;
  }
  HEAP32[1320 >> 2] = (HEAP32[1320 >> 2] | 0) - 2 | 0;
 }
 
 function $30() {
  var $0_1 = 0, $1_1 = 0, $2_1 = 0;
  $1_1 = (HEAP32[1320 >> 2] | 0) + 2 | 0;
  $2_1 = HEAP32[1324 >> 2] | 0;
  label$1 : while (1) {
   label$2 : {
    $0_1 = $1_1;
    if (($0_1 - 2 | 0) >>> 0 >= $2_1 >>> 0) {
     break label$2
    }
    $1_1 = $0_1 + 2 | 0;
    switch ((HEAPU16[$0_1 >> 1] | 0) - 10 | 0 | 0) {
    case 0:
    case 3:
     break label$2;
    default:
     continue label$1;
    };
   }
   break label$1;
  };
  HEAP32[1320 >> 2] = $0_1;
 }
 
 function $31($0_1) {
  $0_1 = $0_1 | 0;
  var $1_1 = 0, $2_1 = 0, $3_1 = 0;
  $1_1 = HEAP32[1320 >> 2] | 0;
  HEAP32[1320 >> 2] = $1_1 + 2 | 0;
  $1_1 = $1_1 + 6 | 0;
  $3_1 = HEAP32[1324 >> 2] | 0;
  label$1 : while (1) {
   label$2 : {
    label$3 : {
     label$4 : {
      if (($1_1 - 4 | 0) >>> 0 >= $3_1 >>> 0) {
       break label$4
      }
      $2_1 = HEAPU16[($1_1 - 2 | 0) >> 1] | 0;
      label$5 : {
       if (!$0_1) {
        if (($2_1 | 0) == (42 | 0)) {
         break label$5
        }
        switch ($2_1 - 10 | 0 | 0) {
        case 0:
        case 3:
         break label$4;
        default:
         break label$2;
        };
       }
       if (($2_1 | 0) != (42 | 0)) {
        break label$2
       }
      }
      if ((HEAPU16[$1_1 >> 1] | 0 | 0) != (47 | 0)) {
       break label$2
      }
      HEAP32[1320 >> 2] = $1_1 - 2 | 0;
      break label$3;
     }
     $1_1 = $1_1 - 2 | 0;
    }
    HEAP32[1320 >> 2] = $1_1;
    return;
   }
   $1_1 = $1_1 + 2 | 0;
   continue label$1;
  };
 }
 
 function $32($0_1) {
  $0_1 = $0_1 | 0;
  var $1_1 = 0, $2_1 = 0, $3_1 = 0;
  $1_1 = HEAP32[1320 >> 2] | 0;
  label$1 : while (1) {
   label$2 : {
    label$3 : {
     $2_1 = HEAPU16[$1_1 >> 1] | 0;
     if (($2_1 | 0) == (47 | 0)) {
      $1_1 = HEAPU16[($1_1 + 2 | 0) >> 1] | 0;
      if (($1_1 | 0) != (42 | 0)) {
       if (($1_1 | 0) != (47 | 0)) {
        break label$2
       }
       $30();
       break label$3;
      }
      $31($0_1 | 0);
      break label$3;
     }
     label$6 : {
      if ($0_1) {
       $1_1 = $2_1 - 9 | 0;
       if ($1_1 >>> 0 > 23 >>> 0 | !((1 << $1_1 | 0) & 8388639 | 0) | 0) {
        break label$6
       }
       break label$3;
      }
      if (!($36($2_1 | 0) | 0)) {
       break label$2
      }
      break label$3;
     }
     if (($2_1 | 0) != (160 | 0)) {
      break label$2
     }
    }
    $3_1 = HEAP32[1320 >> 2] | 0;
    $1_1 = $3_1 + 2 | 0;
    HEAP32[1320 >> 2] = $1_1;
    if ($3_1 >>> 0 < (HEAP32[1324 >> 2] | 0) >>> 0) {
     continue label$1
    }
   }
   break label$1;
  };
  return $2_1 | 0;
 }
 
 function $33($0_1) {
  $0_1 = $0_1 | 0;
  var $1_1 = 0, $2_1 = 0, $3_1 = 0, $4_1 = 0;
  $1_1 = HEAP32[1320 >> 2] | 0;
  $4_1 = HEAP32[1324 >> 2] | 0;
  label$1 : {
   label$2 : while (1) {
    label$3 : {
     $2_1 = $1_1;
     $1_1 = $2_1 + 2 | 0;
     if ($2_1 >>> 0 >= $4_1 >>> 0) {
      break label$3
     }
     $3_1 = HEAPU16[$1_1 >> 1] | 0;
     if (($3_1 | 0) == ($0_1 | 0)) {
      break label$1
     }
     if (($3_1 | 0) != (92 | 0)) {
      switch ($3_1 - 10 | 0 | 0) {
      case 0:
      case 3:
       break label$3;
      default:
       continue label$2;
      }
     }
     $1_1 = $2_1 + 4 | 0;
     if ((HEAPU16[($2_1 + 4 | 0) >> 1] | 0 | 0) != (13 | 0)) {
      continue label$2
     }
     $1_1 = (HEAPU16[($2_1 + 6 | 0) >> 1] | 0 | 0) == (10 | 0) ? $2_1 + 6 | 0 : $1_1;
     continue label$2;
    }
    break label$2;
   };
   HEAP32[1320 >> 2] = $1_1;
   $37();
   return;
  }
  HEAP32[1320 >> 2] = $1_1;
 }
 
 function $34($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $4_1 = 0, $5_1 = 0, $3_1 = 0;
  label$1 : {
   $2_1 = $2_1 << 1 | 0;
   $4_1 = $0_1 - $2_1 | 0;
   $0_1 = $4_1 + 2 | 0;
   $5_1 = HEAP32[1232 >> 2] | 0;
   if ($0_1 >>> 0 < $5_1 >>> 0) {
    break label$1
   }
   if ($45($0_1 | 0, $1_1 | 0, $2_1 | 0) | 0) {
    break label$1
   }
   if (($0_1 | 0) == ($5_1 | 0)) {
    return 1 | 0
   }
   $3_1 = $38($4_1 | 0) | 0;
  }
  return $3_1 | 0;
 }
 
 function $35($0_1) {
  $0_1 = $0_1 | 0;
  var $15_1 = 0;
  if (($0_1 | 128 | 0 | 0) == (160 | 0) | (($0_1 - 9 | 0) & 65535 | 0) >>> 0 < 5 >>> 0 | 0) {
   $15_1 = 1
  } else {
   $15_1 = ($39($0_1 | 0) | 0) & ($0_1 | 0) != (46 | 0) | 0
  }
  return $15_1 | 0;
 }
 
 function $36($0_1) {
  $0_1 = $0_1 | 0;
  var $1_1 = 0;
  $1_1 = $0_1 - 9 | 0;
  if (!(($0_1 | 0) == (160 | 0) | ((1 << $1_1 | 0) & 8388621 | 0 ? $1_1 >>> 0 <= 23 >>> 0 : 0) | 0)) {
   return 0 | 0
  }
  return 1 | 0;
 }
 
 function $37() {
  var $0_1 = 0;
  HEAP8[1264 >> 0] = 1;
  $0_1 = HEAP32[1320 >> 2] | 0;
  HEAP32[1320 >> 2] = (HEAP32[1324 >> 2] | 0) + 2 | 0;
  HEAP32[1284 >> 2] = ($0_1 - (HEAP32[1232 >> 2] | 0) | 0) >> 1 | 0;
 }
 
 function $38($0_1) {
  $0_1 = $0_1 | 0;
  var $1_1 = 0, $2_1 = 0;
  $2_1 = 1;
  label$1 : {
   $1_1 = HEAPU16[$0_1 >> 1] | 0;
   if ((($1_1 - 9 | 0) & 65535 | 0) >>> 0 < 5 >>> 0 | ($1_1 | 128 | 0 | 0) == (160 | 0) | 0) {
    break label$1
   }
   $2_1 = 0;
   if (!($39($1_1 | 0) | 0)) {
    break label$1
   }
   return $41($0_1 | 0) | 0 | ($1_1 | 0) != (46 | 0) | 0 | 0;
  }
  return $2_1 | 0;
 }
 
 function $39($0_1) {
  $0_1 = $0_1 | 0;
  var $1_1 = 0, $2_1 = 0;
  $2_1 = 1;
  label$1 : {
   $1_1 = $0_1 - 33 | 0;
   if (($0_1 & 65528 | 0 | 0) == (40 | 0) | (($0_1 - 58 | 0) & 65535 | 0) >>> 0 < 6 >>> 0 | 0 | ((1 << $1_1 | 0) & 49 | 0 ? $1_1 >>> 0 <= 5 >>> 0 : 0) | 0) {
    break label$1
   }
   $1_1 = $0_1 - 91 | 0;
   if ($1_1 >>> 0 <= 3 >>> 0 & ($1_1 | 0) != (1 | 0) | 0) {
    break label$1
   }
   $2_1 = (($0_1 - 123 | 0) & 65535 | 0) >>> 0 < 4 >>> 0;
  }
  return $2_1 | 0;
 }
 
 function $40($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $3_1 = 0, $2_1 = 0;
  label$1 : {
   $3_1 = HEAP32[1232 >> 2] | 0;
   if ($3_1 >>> 0 > $0_1 >>> 0) {
    break label$1
   }
   if ((HEAPU16[$0_1 >> 1] | 0 | 0) != ($1_1 | 0)) {
    break label$1
   }
   if (($0_1 | 0) == ($3_1 | 0)) {
    return 1 | 0
   }
   $2_1 = $35(HEAPU16[($0_1 - 2 | 0) >> 1] | 0 | 0) | 0;
  }
  return $2_1 | 0;
 }
 
 function $41($0_1) {
  $0_1 = $0_1 | 0;
  var $1_1 = 0;
  label$1 : {
   if ((HEAPU16[$0_1 >> 1] | 0 | 0) != (46 | 0)) {
    break label$1
   }
   if ((HEAPU16[($0_1 - 2 | 0) >> 1] | 0 | 0) != (46 | 0)) {
    break label$1
   }
   $1_1 = (HEAPU16[($0_1 - 4 | 0) >> 1] | 0 | 0) == (46 | 0);
  }
  return $1_1 | 0;
 }
 
 function $42($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $3_1 = 0, $4_1 = 0, $6_1 = 0, $5_1 = 0, $58 = 0, $7_1 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0, wasm2js_i32$2 = 0;
  if (!(($1_1 | 0) == (34 | 0) | ($1_1 | 0) == (39 | 0) | 0)) {
   $37();
   return;
  }
  $3_1 = HEAP32[1320 >> 2] | 0;
  $33($1_1 | 0);
  $1($0_1 | 0, $3_1 + 2 | 0 | 0, HEAP32[1320 >> 2] | 0 | 0, HEAP32[1220 >> 2] | 0 | 0);
  if (($2_1 | 0) > (0 | 0)) {
   HEAP32[((HEAP32[1252 >> 2] | 0) + 28 | 0) >> 2] = ($2_1 | 0) == (1 | 0) ? 4 : 6
  }
  HEAP32[1320 >> 2] = (HEAP32[1320 >> 2] | 0) + 2 | 0;
  $0_1 = $32(0 | 0) | 0;
  $3_1 = HEAP32[1320 >> 2] | 0;
  label$3 : {
   label$4 : {
    if (($0_1 | 0) != (119 | 0)) {
     break label$4
    }
    if ((HEAPU16[($3_1 + 2 | 0) >> 1] | 0 | 0) != (105 | 0)) {
     break label$4
    }
    if ((HEAPU16[($3_1 + 4 | 0) >> 1] | 0 | 0) != (116 | 0)) {
     break label$4
    }
    if ((HEAPU16[($3_1 + 6 | 0) >> 1] | 0 | 0) == (104 | 0)) {
     break label$3
    }
   }
   HEAP32[1320 >> 2] = $3_1 - 2 | 0;
   return;
  }
  HEAP32[1320 >> 2] = $3_1 + 8 | 0;
  label$5 : {
   if (($32(1 | 0) | 0 | 0) != (123 | 0)) {
    break label$5
   }
   $6_1 = HEAP32[1320 >> 2] | 0;
   $4_1 = $6_1;
   $0_1 = 0;
   label$7 : while (1) {
    HEAP32[1320 >> 2] = $4_1 + 2 | 0;
    label$8 : {
     label$9 : {
      label$10 : {
       $1_1 = $32(1 | 0) | 0;
       if (($1_1 | 0) == (39 | 0)) {
        $5_1 = HEAP32[1320 >> 2] | 0;
        $33(39 | 0);
        $58 = (HEAP32[1320 >> 2] | 0) + 2 | 0;
        break label$10;
       }
       $5_1 = HEAP32[1320 >> 2] | 0;
       if (($1_1 | 0) != (34 | 0)) {
        break label$9
       }
       $33(34 | 0);
       $58 = (HEAP32[1320 >> 2] | 0) + 2 | 0;
      }
      $4_1 = $58;
      HEAP32[1320 >> 2] = $4_1;
      $2_1 = $32(1 | 0) | 0;
      break label$8;
     }
     $2_1 = $43($1_1 | 0) | 0;
     $4_1 = HEAP32[1320 >> 2] | 0;
    }
    if (($2_1 | 0) != (58 | 0)) {
     break label$5
    }
    HEAP32[1320 >> 2] = (HEAP32[1320 >> 2] | 0) + 2 | 0;
    $1_1 = $32(1 | 0) | 0;
    if (!(($1_1 | 0) == (34 | 0) | ($1_1 | 0) == (39 | 0) | 0)) {
     break label$5
    }
    $2_1 = HEAP32[1320 >> 2] | 0;
    $33($1_1 | 0);
    $1_1 = HEAP32[1276 >> 2] | 0;
    HEAP32[1276 >> 2] = $1_1 + 20 | 0;
    $7_1 = HEAP32[1320 >> 2] | 0;
    HEAP32[$1_1 >> 2] = $5_1;
    HEAP32[($1_1 + 16 | 0) >> 2] = 0;
    HEAP32[($1_1 + 8 | 0) >> 2] = $2_1;
    HEAP32[($1_1 + 4 | 0) >> 2] = $4_1;
    HEAP32[($1_1 + 12 | 0) >> 2] = $7_1 + 2 | 0;
    HEAP32[1320 >> 2] = (HEAP32[1320 >> 2] | 0) + 2 | 0;
    HEAP32[(wasm2js_i32$0 = $0_1 + 16 | 0, wasm2js_i32$1 = (HEAP32[1252 >> 2] | 0) + 32 | 0, wasm2js_i32$2 = $0_1, wasm2js_i32$2 ? wasm2js_i32$0 : wasm2js_i32$1) >> 2] = $1_1;
    label$14 : {
     $0_1 = $32(1 | 0) | 0;
     if (($0_1 | 0) != (44 | 0)) {
      if (($0_1 | 0) == (125 | 0)) {
       break label$14
      }
      break label$5;
     }
     $4_1 = (HEAP32[1320 >> 2] | 0) + 2 | 0;
     HEAP32[1320 >> 2] = $4_1;
     $0_1 = $1_1;
     continue label$7;
    }
    break label$7;
   };
   $0_1 = HEAP32[1252 >> 2] | 0;
   HEAP32[($0_1 + 16 | 0) >> 2] = $6_1;
   HEAP32[($0_1 + 12 | 0) >> 2] = (HEAP32[1320 >> 2] | 0) + 2 | 0;
   return;
  }
  HEAP32[1320 >> 2] = $3_1;
 }
 
 function $43($0_1) {
  $0_1 = $0_1 | 0;
  var $1_1 = 0, $2_1 = 0;
  label$1 : {
   label$2 : while (1) {
    $2_1 = $0_1 & 65535 | 0;
    $1_1 = $2_1 - 9 | 0;
    if (!(((1 << $1_1 | 0) & 8388639 | 0 ? $1_1 >>> 0 <= 23 >>> 0 : 0) | ($2_1 | 0) == (160 | 0) | 0)) {
     $1_1 = $0_1;
     if ($39($2_1 | 0) | 0) {
      break label$1
     }
     $1_1 = 0;
     $0_1 = HEAP32[1320 >> 2] | 0;
     HEAP32[1320 >> 2] = $0_1 + 2 | 0;
     $0_1 = HEAPU16[($0_1 + 2 | 0) >> 1] | 0;
     if ($0_1) {
      continue label$2
     }
     break label$1;
    }
    break label$2;
   };
   $1_1 = $0_1;
  }
  return $1_1 & 65535 | 0 | 0;
 }
 
 function $44($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $2_1 = 0, $3_1 = 0, $5_1 = 0, $4_1 = 0, $37_1 = 0;
  label$1 : {
   $3_1 = HEAP32[1320 >> 2] | 0;
   $5_1 = HEAPU16[$3_1 >> 1] | 0;
   if (($5_1 | 0) != (97 | 0)) {
    $2_1 = $1_1;
    $4_1 = $0_1;
    break label$1;
   }
   HEAP32[1320 >> 2] = $3_1 + 4 | 0;
   $2_1 = $32(1 | 0) | 0;
   $4_1 = HEAP32[1320 >> 2] | 0;
   label$3 : {
    if (!(($2_1 | 0) == (34 | 0) | ($2_1 | 0) == (39 | 0) | 0)) {
     $43($2_1 | 0) | 0;
     $2_1 = HEAP32[1320 >> 2] | 0;
     break label$3;
    }
    $33($2_1 | 0);
    $2_1 = (HEAP32[1320 >> 2] | 0) + 2 | 0;
    HEAP32[1320 >> 2] = $2_1;
   }
   $5_1 = $32(1 | 0) | 0;
   $3_1 = HEAP32[1320 >> 2] | 0;
  }
  if (($3_1 | 0) != ($4_1 | 0)) {
   $37_1 = $0_1;
   $0_1 = ($0_1 | 0) == ($1_1 | 0);
   $2($4_1 | 0, $2_1 | 0, ($0_1 ? 0 : $37_1) | 0, ($0_1 ? 0 : $1_1) | 0);
  }
  return $5_1 | 0;
 }
 
 function $45($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $4_1 = 0, $5_1 = 0, $3_1 = 0;
  label$1 : {
   if (!$2_1) {
    break label$1
   }
   label$2 : while (1) {
    $4_1 = HEAPU8[$0_1 >> 0] | 0;
    $5_1 = HEAPU8[$1_1 >> 0] | 0;
    if (($4_1 | 0) == ($5_1 | 0)) {
     $1_1 = $1_1 + 1 | 0;
     $0_1 = $0_1 + 1 | 0;
     $2_1 = $2_1 - 1 | 0;
     if ($2_1) {
      continue label$2
     }
     break label$1;
    }
    break label$2;
   };
   $3_1 = $4_1 - $5_1 | 0;
  }
  return $3_1 | 0;
 }
 
 bufferView = HEAPU8;
 initActiveSegments(env);
 function __wasm_memory_size() {
  return buffer.byteLength / 65536 | 0;
 }
 
 function __wasm_memory_grow(pagesToAdd) {
  pagesToAdd = pagesToAdd | 0;
  var oldPages = __wasm_memory_size() | 0;
  var newPages = oldPages + pagesToAdd | 0;
  if ((oldPages < newPages) && (newPages < 65536)) {
   var newBuffer = new ArrayBuffer(Math_imul(newPages, 65536));
   var newHEAP8 = new Int8Array(newBuffer);
   newHEAP8.set(HEAP8);
   HEAP8 = new Int8Array(newBuffer);
   HEAP16 = new Int16Array(newBuffer);
   HEAP32 = new Int32Array(newBuffer);
   HEAPU8 = new Uint8Array(newBuffer);
   HEAPU16 = new Uint16Array(newBuffer);
   HEAPU32 = new Uint32Array(newBuffer);
   HEAPF32 = new Float32Array(newBuffer);
   HEAPF64 = new Float64Array(newBuffer);
   buffer = newBuffer;
   bufferView = HEAPU8;
  }
  return oldPages;
 }
 
 return {
  "memory": Object.create(Object.prototype, {
   "grow": {
    "value": __wasm_memory_grow
   }, 
   "buffer": {
    "get": function () {
     return buffer;
    }
    
   }
  }), 
  "sa": $0, 
  "e": $3, 
  "is": $4, 
  "ie": $5, 
  "ss": $6, 
  "se": $7, 
  "it": $8, 
  "ai": $9, 
  "id": $10, 
  "ip": $11, 
  "es": $12, 
  "ee": $13, 
  "els": $14, 
  "ele": $15, 
  "ri": $16, 
  "re": $17, 
  "f": $18, 
  "ms": $19, 
  "ra": $20, 
  "aks": $21, 
  "ake": $22, 
  "avs": $23, 
  "ave": $24, 
  "rsa": $25, 
  "parse": $26, 
  "__heap_base": {
   get value() {
    return global$1;
   }, 
   set value(_global$1) {
    global$1 = _global$1;
   }
  }
 };
}

var retasmFunc = asmFunc(  { abort: function() { throw new Error('abort'); }
  });

// `retasmFunc` is the wasm2js module instance concatenated above at build time
// (see chompfile.toml `lib/lexer.asm.js`). Its exports mirror the wasm build:
// a WebAssembly.Memory-like `memory` ({ grow, buffer }), `__heap_base`, the
// source allocator `sa`, `parse`, and the analysis readers. wasm2js embeds the
// wasm data section, so there is no keyword dictionary to hand-maintain here.
const asm = retasmFunc;

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

let source, name;
export function parse (_source, _name = '@') {
  source = _source;
  name = _name;
  const len = source.length + 1;

  // 2 bytes per code point plus analysis space (so * 4); grow memory to fit.
  const extraMem = asm.__heap_base.value + len * 4 - asm.memory.buffer.byteLength;
  if (extraMem > 0)
    asm.memory.grow(Math.ceil(extraMem / 65536));

  const addr = asm.sa(len - 1);
  copy(source, new Uint16Array(asm.memory.buffer, addr, len));

  if (!asm.parse()) {
    acornPos = asm.e();
    syntaxError();
  }

  const imports = [], exports = [];
  while (asm.ri()) {
    const s = asm.is(), e = asm.ie(), a = asm.ai(), d = asm.id(), ss = asm.ss(), se = asm.se(), t = asm.it();
    let n;
    if (asm.ip())
      n = readString(d === -1 ? s : s + 1, source.charCodeAt(d === -1 ? s - 1 : s));
    const at = [];
    asm.rsa();
    while (asm.ra()) {
      const aks = asm.aks(), ake = asm.ake(), avs = asm.avs(), ave = asm.ave();
      const attrKey = decodeIfQuoted(aks, ake);
      const attrValue = decodeIfQuoted(avs, ave);
      at.push([attrKey, attrValue]);
    }
    imports.push({ t, n, s, e, ss, se, d, a, at: at.length > 0 ? at : null });
  }
  while (asm.re()) {
    const s = asm.es(), e = asm.ee(), ls = asm.els(), le = asm.ele();
    const n = decodeIfQuoted(s, e);
    const ln = ls < 0 ? undefined : decodeIfQuoted(ls, le);
    exports.push({
      s, e, ls, le,
      n, ln,
    });
  }

  return [imports, exports, !!asm.f(), !!asm.ms()];

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

// The wasm2js module (asmFunc + `var retasmFunc = asmFunc(...)`) is concatenated
// ABOVE this wrapper at build time (chompfile.toml `lib/lexer.asm.js`).

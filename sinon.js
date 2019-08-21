, spy) {
    if (callMap[spy.id] === undefined) {


function checkAdjacentCalls(callMap, spy, index, spies) {
    var calledBeforeNext = true;

    if (index !== spies.length - 1) {
        calledBeforeNext = spy.calledBefore(spies[index + 1]);
    }

    if (hasCallsLeft(callMap, spy) && calledBeforeNext) {
        callMap[spy.id] += 1;
        return true;
    }

    return false;
}

var calledInOrder = function calledInOrder(spies) {
    var callMap = {};
    // eslint-disable-next-line no-underscore-dangle
    var _spies = arguments.length > 1 ? arguments : spies;

    return every(_spies, checkAdjacentCalls.bind(null, callMap));
};

var functionName = function functionName(func) {
    if (!func) {
        return "";
    }

    return (
        func.displayName ||
        func.name ||
        // Use function decomposition as a last resort to get function
        // name. Does not rely on function decomposition to work - if it
        // doesn't debugging will be slightly less informative
        // (i.e. toString will say 'spy' rather than 'myFunc').
        (String(func).match(/function ([^\s(]+)/) || [])[1]
    );
};

var className = function className(value) {
    return (
        (value.constructor && value.constructor.name) ||
        // The next branch is for IE11 support only:
        // Because the name property is not set on the prototype
        // of the Function object, we finally try to grab the
        // name from its definition. This will never be reached
        // in node, so we are not able to test this properly.
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/name
        (typeof value.constructor === "function" &&
            /* istanbul ignore next */
            functionName(value.constructor)) ||
        null
    );
};

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function commonjsRequire () {
	throw new Error('Dynamic requires are not currently supported by rollup-plugin-commonjs');
}

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x.default : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var deprecated = createCommonjsModule(function (module, exports) {

// wrap returns a function that will invoke the supplied function and print a deprecation warning to the console each
// time it is called.
exports.wrap = function(func, msg) {
    var wrapped = function() {
        exports.printWarning(msg);
        return func.apply(this, arguments);
    };
    if (func.prototype) {
        wrapped.prototype = func.prototype;
    }
    return wrapped;
};

// defaultMsg returns a string which can be supplied to `wrap()` to notify the user that a particular part of the
// sinon API has been deprecated.
exports.defaultMsg = function(packageName, funcName) {
    return (
        packageName +
        "." +
        funcName +
        " is deprecated and will be removed from the public API in a future version of " +
        packageName +
        "."
    );
};

exports.printWarning = function(msg) {
    // Watch out for IE7 and below! :(
    /* istanbul ignore next */
    if (typeof console !== "undefined") {
        if (console.info) {
            console.info(msg);
        } else {
            console.log(msg);
        }
    }
};
});
var deprecated_1 = deprecated.wrap;
var deprecated_2 = deprecated.defaultMsg;
var deprecated_3 = deprecated.printWarning;

// This is an `every` implementation that works for all iterables
var every$1 = function every(obj, fn) {
    var pass = true;

    try {
        /* eslint-disable-next-line local-rules/no-prototype-methods */
        obj.forEach(function() {
            if (!fn.apply(this, arguments)) {
                // Throwing an error is the only way to break `forEach`
                throw new Error();
            }
        });
    } catch (e) {
        pass = false;
    }

    return pass;
};

var sort = array.sort;
var slice = array.slice;

function comparator(a, b) {
    // uuid, won't ever be equal
    var aCall = a.getCall(0);
    var bCall = b.getCall(0);
    var aId = (aCall && aCall.callId) || -1;
    var bId = (bCall && bCall.callId) || -1;

    return aId < bId ? -1 : 1;
}

var orderByFirstCall = function orderByFirstCall(spies) {
    return sort(slice(spies), comparator);
};

var _function = copyPrototype(Function.prototype);

var object = copyPrototype(Object.prototype);

var string = copyPrototype(String.prototype);

var prototypes = {
    array: array,
    function: _function,
    object: object,
    string: string
};

var typeDetect = createCommonjsModule(function (module, exports) {
(function (global, factory) {
	module.exports = factory();
}(commonjsGlobal, (function () {
/* !
 * type-detect
 * Copyright(c) 2013 jake luer <jake@alogicalparadox.com>
 * MIT Licensed
 */
var promiseExists = typeof Promise === 'function';

/* eslint-disable no-undef */
var globalObject = typeof self === 'object' ? self : commonjsGlobal; // eslint-disable-line id-blacklist

var symbolExists = typeof Symbol !== 'undefined';
var mapExists = typeof Map !== 'undefined';
var setExists = typeof Set !== 'undefined';
var weakMapExists = typeof WeakMap !== 'undefined';
var weakSetExists = typeof WeakSet !== 'undefined';
var dataViewExists = typeof DataView !== 'undefined';
var symbolIteratorExists = symbolExists && typeof Symbol.iterator !== 'undefined';
var symbolToStringTagExists = symbolExists && typeof Symbol.toStringTag !== 'undefined';
var setEntriesExists = setExists && typeof Set.prototype.entries === 'function';
var mapEntriesExists = mapExists && typeof Map.prototype.entries === 'function';
var setIteratorPrototype = setEntriesExists && Object.getPrototypeOf(new Set().entries());
var mapIteratorPrototype = mapEntriesExists && Object.getPrototypeOf(new Map().entries());
var arrayIteratorExists = symbolIteratorExists && typeof Array.prototype[Symbol.iterator] === 'function';
var arrayIteratorPrototype = arrayIteratorExists && Object.getPrototypeOf([][Symbol.iterator]());
var stringIteratorExists = symbolIteratorExists && typeof String.prototype[Symbol.iterator] === 'function';
var stringIteratorPrototype = stringIteratorExists && Object.getPrototypeOf(''[Symbol.iterator]());
var toStringLeftSliceLength = 8;
var toStringRightSliceLength = -1;
/**
 * ### typeOf (obj)
 *
 * Uses `Object.prototype.toString` to determine the type of an object,
 * normalising behaviour across engine versions & well optimised.
 *
 * @param {Mixed} object
 * @return {String} object type
 * @api public
 */
function typeDetect(obj) {
  /* ! Speed optimisation
   * Pre:
   *   string literal     x 3,039,035 ops/sec ±1.62% (78 runs sampled)
   *   boolean literal    x 1,424,138 ops/sec ±4.54% (75 runs sampled)
   *   number literal     x 1,653,153 ops/sec ±1.91% (82 runs sampled)
   *   undefined          x 9,978,660 ops/sec ±1.92% (75 runs sampled)
   *   function           x 2,556,769 ops/sec ±1.73% (77 runs sampled)
   * Post:
   *   string literal     x 38,564,796 ops/sec ±1.15% (79 runs sampled)
   *   boolean literal    x 31,148,940 ops/sec ±1.10% (79 runs sampled)
   *   number literal     x 32,679,330 ops/sec ±1.90% (78 runs sampled)
   *   undefined          x 32,363,368 ops/sec ±1.07% (82 runs sampled)
   *   function           x 31,296,870 ops/sec ±0.96% (83 runs sampled)
   */
  var typeofObj = typeof obj;
  if (typeofObj !== 'object') {
    return typeofObj;
  }

  /* ! Speed optimisation
   * Pre:
   *   null               x 28,645,765 ops/sec ±1.17% (82 runs sampled)
   * Post:
   *   null               x 36,428,962 ops/sec ±1.37% (84 runs sampled)
   */
  if (obj === null) {
    return 'null';
  }

  /* ! Spec Conformance
   * Test: `Object.prototype.toString.call(window)``
   *  - Node === "[object global]"
   *  - Chrome === "[object global]"
   *  - Firefox === "[object Window]"
   *  - PhantomJS === "[object Window]"
   *  - Safari === "[object Window]"
   *  - IE 11 === "[object Window]"
   *  - IE Edge === "[object Window]"
   * Test: `Object.prototype.toString.call(this)``
   *  - Chrome Worker === "[object global]"
   *  - Firefox Worker === "[object DedicatedWorkerGlobalScope]"
   *  - Safari Worker === "[object DedicatedWorkerGlobalScope]"
   *  - IE 11 Worker === "[object WorkerGlobalScope]"
   *  - IE Edge Worker === "[object WorkerGlobalScope]"
   */
  if (obj === globalObject) {
    return 'global';
  }

  /* ! Speed optimisation
   * Pre:
   *   array literal      x 2,888,352 ops/sec ±0.67% (82 runs sampled)
   * Post:
   *   array literal      x 22,479,650 ops/sec ±0.96% (81 runs sampled)
   */
  if (
    Array.isArray(obj) &&
    (symbolToStringTagExists === false || !(Symbol.toStringTag in obj))
  ) {
    return 'Array';
  }

  // Not caching existence of `window` and related properties due to potential
  // for `window` to be unset before tests in quasi-browser environments.
  if (typeof window === 'object' && window !== null) {
    /* ! Spec Conformance
     * (https://html.spec.whatwg.org/multipage/browsers.html#location)
     * WhatWG HTML$7.7.3 - The `Location` interface
     * Test: `Object.prototype.toString.call(window.location)``
     *  - IE <=11 === "[object Object]"
     *  - IE Edge <=13 === "[object Object]"
     */
    if (typeof window.location === 'object' && obj === window.location) {
      return 'Location';
    }

    /* ! Spec Conformance
     * (https://html.spec.whatwg.org/#document)
     * WhatWG HTML$3.1.1 - The `Document` object
     * Note: Most browsers currently adher to the W3C DOM Level 2 spec
     *       (https://www.w3.org/TR/DOM-Level-2-HTML/html.html#ID-26809268)
     *       which suggests that browsers should use HTMLTableCellElement for
     *       both TD and TH elements. WhatWG separates these.
     *       WhatWG HTML states:
     *         > For historical reasons, Window objects must also have a
     *         > writable, configurable, non-enumerable property named
     *         > HTMLDocument whose value is the Document interface object.
     * Test: `Object.prototype.toString.call(document)``
     *  - Chrome === "[object HTMLDocument]"
     *  - Firefox === "[object HTMLDocument]"
     *  - Safari === "[object HTMLDocument]"
     *  - IE <=10 === "[object Document]"
     *  - IE 11 === "[object HTMLDocument]"
     *  - IE Edge <=13 === "[object HTMLDocument]"
     */
    if (typeof window.document === 'object' && obj === window.document) {
      return 'Document';
    }

    if (typeof window.navigator === 'object') {
      /* ! Spec Conformance
       * (https://html.spec.whatwg.org/multipage/webappapis.html#mimetypearray)
       * WhatWG HTML$8.6.1.5 - Plugins - Interface MimeTypeArray
       * Test: `Object.prototype.toString.call(navigator.mimeTypes)``
       *  - IE <=10 === "[object MSMimeTypesCollection]"
       */
      if (typeof window.navigator.mimeTypes === 'object' &&
          obj === window.navigator.mimeTypes) {
        return 'MimeTypeArray';
      }

      /* ! Spec Conformance
       * (https://html.spec.whatwg.org/multipage/webappapis.html#pluginarray)
       * WhatWG HTML$8.6.1.5 - Plugins - Interface PluginArray
       * Test: `Object.prototype.toString.call(navigator.plugins)``
       *  - IE <=10 === "[object MSPluginsCollection]"
       */
      if (typeof window.navigator.plugins === 'object' &&
          obj === window.navigator.plugins) {
        return 'PluginArray';
      }
    }

    if ((typeof window.HTMLElement === 'function' ||
        typeof window.HTMLElement === 'object') &&
        obj instanceof window.HTMLElement) {
      /* ! Spec Conformance
      * (https://html.spec.whatwg.org/multipage/webappapis.html#pluginarray)
      * WhatWG HTML$4.4.4 - The `blockquote` element - Interface `HTMLQuoteElement`
      * Test: `Object.prototype.toString.call(document.createElement('blockquote'))``
      *  - IE <=10 === "[object HTMLBlockElement]"
      */
      if (obj.tagName === 'BLOCKQUOTE') {
        return 'HTMLQuoteElement';
      }

      /* ! Spec Conformance
       * (https://html.spec.whatwg.org/#htmltabledatacellelement)
       * WhatWG HTML$4.9.9 - The `td` element - Interface `HTMLTableDataCellElement`
       * Note: Most browsers currently adher to the W3C DOM Level 2 spec
       *       (https://www.w3.org/TR/DOM-Level-2-HTML/html.html#ID-82915075)
       *       which suggests that browsers should use HTMLTableCellElement for
       *       both TD and TH elements. WhatWG separates these.
       * Test: Object.prototype.toString.call(document.createElement('td'))
       *  - Chrome === "[object HTMLTableCellElement]"
       *  - Firefox === "[object HTMLTableCellElement]"
       *  - Safari === "[object HTMLTableCellElement]"
       */
      if (obj.tagName === 'TD') {
        return 'HTMLTableDataCellElement';
      }

      /* ! Spec Conformance
       * (https://html.spec.whatwg.org/#htmltableheadercellelement)
       * WhatWG HTML$4.9.9 - The `td` element - Interface `HTMLTableHeaderCellElement`
       * Note: Most browsers currently adher to the W3C DOM Level 2 spec
       *       (https://www.w3.org/TR/DOM-Level-2-HTML/html.html#ID-82915075)
       *       which suggests that browsers should use HTMLTableCellElement for
       *       both TD and TH elements. WhatWG separates these.
       * Test: Object.prototype.toString.call(document.createElement('th'))
       *  - Chrome === "[object HTMLTableCellElement]"
       *  - Firefox === "[object HTMLTableCellElement]"
       *  - Safari === "[object HTMLTableCellElement]"
       */
      if (obj.tagName === 'TH') {
        return 'HTMLTableHeaderCellElement';
      }
    }
  }

  /* ! Speed optimisation
  * Pre:
  *   Float64Array       x 625,644 ops/sec ±1.58% (80 runs sampled)
  *   Float32Array       x 1,279,852 ops/sec ±2.91% (77 runs sampled)
  *   Uint32Array        x 1,178,185 ops/sec ±1.95% (83 runs sampled)
  *   Uint16Array        x 1,008,380 ops/sec ±2.25% (80 runs sampled)
  *   Uint8Array         x 1,128,040 ops/sec ±2.11% (81 runs sampled)
  *   Int32Array         x 1,170,119 ops/sec ±2.88% (80 runs sampled)
  *   Int16Array         x 1,176,348 ops/sec ±5.79% (86 runs sampled)
  *   Int8Array          x 1,058,707 ops/sec ±4.94% (77 runs sampled)
  *   Uint8ClampedArray  x 1,110,633 ops/sec ±4.20% (80 runs sampled)
  * Post:
  *   Float64Array       x 7,105,671 ops/sec ±13.47% (64 runs sampled)
  *   Float32Array       x 5,887,912 ops/sec ±1.46% (82 runs sampled)
  *   Uint32Array        x 6,491,661 ops/sec ±1.76% (79 runs sampled)
  *   Uint16Array        x 6,559,795 ops/sec ±1.67% (82 runs sampled)
  *   Uint8Array         x 6,463,966 ops/sec ±1.43% (85 runs sampled)
  *   Int32Array         x 5,641,841 ops/sec ±3.49% (81 runs sampled)
  *   Int16Array         x 6,583,511 ops/sec ±1.98% (80 runs sampled)
  *   Int8Array          x 6,606,078 ops/sec ±1.74% (81 runs sampled)
  *   Uint8ClampedArray  x 6,602,224 ops/sec ±1.77% (83 runs sampled)
  */
  var stringTag = (symbolToStringTagExists && obj[Symbol.toStringTag]);
  if (typeof stringTag === 'string') {
    return stringTag;
  }

  var objPrototype = Object.getPrototypeOf(obj);
  /* ! Speed optimisation
  * Pre:
  *   regex literal      x 1,772,385 ops/sec ±1.85% (77 runs sampled)
  *   regex constructor  x 2,143,634 ops/sec ±2.46% (78 runs sampled)
  * Post:
  *   regex literal      x 3,928,009 ops/sec ±0.65% (78 runs sampled)
  *   regex constructor  x 3,931,108 ops/sec ±0.58% (84 runs sampled)
  */
  if (objPrototype === RegExp.prototype) {
    return 'RegExp';
  }

  /* ! Speed optimisation
  * Pre:
  *   date               x 2,130,074 ops/sec ±4.42% (68 runs sampled)
  * Post:
  *   date               x 3,953,779 ops/sec ±1.35% (77 runs sampled)
  */
  if (objPrototype === Date.prototype) {
    return 'Date';
  }

  /* ! Spec Conformance
   * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-promise.prototype-@@tostringtag)
   * ES6$25.4.5.4 - Promise.prototype[@@toStringTag] should be "Promise":
   * Test: `Object.prototype.toString.call(Promise.resolve())``
   *  - Chrome <=47 === "[object Object]"
   *  - Edge <=20 === "[object Object]"
   *  - Firefox 29-Latest === "[object Promise]"
   *  - Safari 7.1-Latest === "[object Promise]"
   */
  if (promiseExists && objPrototype === Promise.prototype) {
    return 'Promise';
  }

  /* ! Speed optimisation
  * Pre:
  *   set                x 2,222,186 ops/sec ±1.31% (82 runs sampled)
  * Post:
  *   set                x 4,545,879 ops/sec ±1.13% (83 runs sampled)
  */
  if (setExists && objPrototype === Set.prototype) {
    return 'Set';
  }

  /* ! Speed optimisation
  * Pre:
  *   map                x 2,396,842 ops/sec ±1.59% (81 runs sampled)
  * Post:
  *   map                x 4,183,945 ops/sec ±6.59% (82 runs sampled)
  */
  if (mapExists && objPrototype === Map.prototype) {
    return 'Map';
  }

  /* ! Speed optimisation
  * Pre:
  *   weakset            x 1,323,220 ops/sec ±2.17% (76 runs sampled)
  * Post:
  *   weakset            x 4,237,510 ops/sec ±2.01% (77 runs sampled)
  */
  if (weakSetExists && objPrototype === WeakSet.prototype) {
    return 'WeakSet';
  }

  /* ! Speed optimisation
  * Pre:
  *   weakmap            x 1,500,260 ops/sec ±2.02% (78 runs sampled)
  * Post:
  *   weakmap            x 3,881,384 ops/sec ±1.45% (82 runs sampled)
  */
  if (weakMapExists && objPrototype === WeakMap.prototype) {
    return 'WeakMap';
  }

  /* ! Spec Conformance
   * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-dataview.prototype-@@tostringtag)
   * ES6$24.2.4.21 - DataView.prototype[@@toStringTag] should be "DataView":
   * Test: `Object.prototype.toString.call(new DataView(new ArrayBuffer(1)))``
   *  - Edge <=13 === "[object Object]"
   */
  if (dataViewExists && objPrototype === DataView.prototype) {
    return 'DataView';
  }

  /* ! Spec Conformance
   * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-%mapiteratorprototype%-@@tostringtag)
   * ES6$23.1.5.2.2 - %MapIteratorPrototype%[@@toStringTag] should be "Map Iterator":
   * Test: `Object.prototype.toString.call(new Map().entries())``
   *  - Edge <=13 === "[object Object]"
   */
  if (mapExists && objPrototype === mapIteratorPrototype) {
    return 'Map Iterator';
  }

  /* ! Spec Conformance
   * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-%setiteratorprototype%-@@tostringtag)
   * ES6$23.2.5.2.2 - %SetIteratorPrototype%[@@toStringTag] should be "Set Iterator":
   * Test: `Object.prototype.toString.call(new Set().entries())``
   *  - Edge <=13 === "[object Object]"
   */
  if (setExists && objPrototype === setIteratorPrototype) {
    return 'Set Iterator';
  }

  /* ! Spec Conformance
   * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-%arrayiteratorprototype%-@@tostringtag)
   * ES6$22.1.5.2.2 - %ArrayIteratorPrototype%[@@toStringTag] should be "Array Iterator":
   * Test: `Object.prototype.toString.call([][Symbol.iterator]())``
   *  - Edge <=13 === "[object Object]"
   */
  if (arrayIteratorExists && objPrototype === arrayIteratorPrototype) {
    return 'Array Iterator';
  }

  /* ! Spec Conformance
   * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-%stringiteratorprototype%-@@tostringtag)
   * ES6$21.1.5.2.2 - %StringIteratorPrototype%[@@toStringTag] should be "String Iterator":
   * Test: `Object.prototype.toString.call(''[Symbol.iterator]())``
   *  - Edge <=13 === "[object Object]"
   */
  if (stringIteratorExists && objPrototype === stringIteratorPrototype) {
    return 'String Iterator';
  }

  /* ! Speed optimisation
  * Pre:
  *   object from null   x 2,424,320 ops/sec ±1.67% (76 runs sampled)
  * Post:
  *   object from null   x 5,838,000 ops/sec ±0.99% (84 runs sampled)
  */
  if (objPrototype === null) {
    return 'Object';
  }

  return Object
    .prototype
    .toString
    .call(obj)
    .slice(toStringLeftSliceLength, toStringRightSliceLength);
}

return typeDetect;

})));
});

var typeOf = function typeOf(value) {
    return typeDetect(value).toLowerCase();
};

function valueToString(value) {
    if (value && value.toString) {
        /* eslint-disable-next-line local-rules/no-prototype-methods */
        return value.toString();
    }
    return String(value);
}

var valueToString_1 = valueToString;

var lib = {
    calledInOrder: calledInOrder,
    className: className,
    deprecated: deprecated,
    every: every$1,
    functionName: functionName,
    orderByFirstCall: orderByFirstCall,
    prototypes: prototypes,
    typeOf: typeOf,
    valueToString: valueToString_1
};

var arrayProto = lib.prototypes.array;
var hasOwnProperty = lib.prototypes.object.hasOwnProperty;

var join = arrayProto.join;
var push = arrayProto.push;
var slice$1 = arrayProto.slice;

// Adapted from https://developer.mozilla.org/en/docs/ECMAScript_DontEnum_attribute#JScript_DontEnum_Bug
var hasDontEnumBug = (function() {
    var obj = {
        constructor: function() {
            return "0";
        },
        toString: function() {
            return "1";
        },
        valueOf: function() {
            return "2";
        },
        toLocaleString: function() {
            return "3";
        },
        prototype: function() {
            return "4";
        },
        isPrototypeOf: function() {
            return "5";
        },
        propertyIsEnumerable: function() {
            return "6";
        },
        hasOwnProperty: function() {
            return "7";
        },
        length: function() {
            return "8";
        },
        unique: function() {
            return "9";
        }
    };

    var result = [];
    for (var prop in obj) {
        if (hasOwnProperty(obj, prop)) {
            push(result, obj[prop]());
        }
    }
    return join(result, "") !== "0123456789";
})();

function extendCommon(target, sources, doCopy) {
    var source, i, prop;

    for (i = 0; i < sources.length; i++) {
        source = sources[i];

        for (prop in source) {
            if (hasOwnProperty(source, prop)) {
                doCopy(target, source, prop);
            }
        }

        // Make sure we copy (own) toString method even when in JScript with DontEnum bug
        // See https://developer.mozilla.org/en/docs/ECMAScript_DontEnum_attribute#JScript_DontEnum_Bug
        if (hasDontEnumBug && hasOwnProperty(source, "toString") && source.toString !== target.toString) {
            target.toString = source.toString;
        }
    }

    return target;
}

/** Public: Extend target in place with all (own) properties from sources in-order. Thus, last source will
 *         override properties in previous sources.
 *
 * @arg {Object} target - The Object to extend
 * @arg {Object[]} sources - Objects to copy properties from.
 *
 * @returns {Object} the extended target
 */
var extend = function extend(target /*, sources */) {
    var sources = slice$1(arguments, 1);

    return extendCommon(target, sources, function copyValue(dest, source, prop) {
        dest[prop] = source[prop];
    });
};

/** Public: Extend target in place with all (own) properties from sources in-order. Thus, last source will
 *         override properties in previous sources. Define the properties as non enumerable.
 *
 * @arg {Object} target - The Object to extend
 * @arg {Object[]} sources - Objects to copy properties from.
 *
 * @returns {Object} the extended target
 */
var nonEnum = function extendNonEnum(target /*, sources */) {
    var sources = slice$1(arguments, 1);

    return extendCommon(target, sources, function copyProperty(dest, source, prop) {
        Object.defineProperty(dest, prop, {
            value: source[prop],
            enumerable: false,
            configurable: true,
            writable: true
        });
    });
};
extend.nonEnum = nonEnum;

/* istanbul ignore next : not testing that setTimeout works */
function nextTick(callback) {
    setTimeout(callback, 0);
}

var getNextTick = function getNextTick(process, setImmediate) {
    if (typeof process === "object" && typeof process.nextTick === "function") {
        return process.nextTick;
    }

    if (typeof setImmediate === "function") {
        return setImmediate;
    }

    return nextTick;
};

/* istanbul ignore next */
var root = typeof window !== "undefined" ? window : commonjsGlobal;

var nextTick$1 = getNextTick(root.process, root.setImmediate);

var arrayProto$1 = lib.prototypes.array;
var reduce = arrayProto$1.reduce;

var exportAsyncBehaviors = function exportAsyncBehaviors(behaviorMethods) {
    return reduce(
        Object.keys(behaviorMethods),
        function(acc, method) {
            // need to avoid creating another async versions of the newly added async methods
            if (method.match(/^(callsArg|yields)/) && !method.match(/Async/)) {
                acc[method + "Async"] = function() {
                    var result = behaviorMethods[method].apply(this, arguments);
                    this.callbackAsync = true;
                    return result;
                };
            }
            return acc;
        },
        {}
    );
};

var arrayProto$2 = lib.prototypes.array;

var functionName$1 = lib.functionName;

var valueToString$1 = lib.valueToString;


var concat = arrayProto$2.concat;
var join$1 = arrayProto$2.join;
var reverse = arrayProto$2.reverse;
var slice$2 = arrayProto$2.slice;

var useLeftMostCallback = -1;
var useRightMostCallback = -2;

function getCallback(behavior, args) {
    var callArgAt = behavior.callArgAt;

    if (callArgAt >= 0) {
        return args[callArgAt];
    }

    var argumentList;

    if (callArgAt === useLeftMostCallback) {
        argumentList = args;
    }

    if (callArgAt === useRightMostCallback) {
        argumentList = reverse(slice$2(args));
    }

    var callArgProp = behavior.callArgProp;

    for (var i = 0, l = argumentList.length; i < l; ++i) {
        if (!callArgProp && typeof argumentList[i] === "function") {
            return argumentList[i];
        }

        if (callArgProp && argumentList[i] && typeof argumentList[i][callArgProp] === "function") {
            return argumentList[i][callArgProp];
        }
    }

    return null;
}

function getCallbackError(behavior, func, args) {
    if (behavior.callArgAt < 0) {
        var msg;

        if (behavior.callArgProp) {
            msg =
                functionName$1(behavior.stub) +
                " expected to yield to '" +
                valueToString$1(behavior.callArgProp) +
                "', but no object with such a property was passed.";
        } else {
            msg = functionName$1(behavior.stub) + " expected to yield, but no callback was passed.";
        }

        if (args.length > 0) {
            msg += " Received [" + join$1(args, ", ") + "]";
        }

        return msg;
    }

    return "argument at index " + behavior.callArgAt + " is not a function: " + func;
}

function ensureArgs(name, behavior, args) {
    // map function name to internal property
    //   callsArg => callArgAt
    var property = name.replace(/sArg/, "ArgAt");
    var index = behavior[property];

    if (index >= args.length) {
        throw new TypeError(
            name + " failed: " + (index + 1) + " arguments required but only " + args.length + " present"
        );
    }
}

function callCallback(behavior, args) {
    if (typeof behavior.callArgAt === "number") {
        ensureArgs("callsArg", behavior, args);
        var func = getCallback(behavior, args);

        if (typeof func !== "function") {
            throw new TypeError(getCallbackError(behavior, func, args));
        }

        if (behavior.callbackAsync) {
            nextTick$1(function() {
                func.apply(behavior.callbackContext, behavior.callbackArguments);
            });
        } else {
            return func.apply(behavior.callbackContext, behavior.callbackArguments);
        }
    }

    return undefined;
}

var proto = {
    create: function create(stub) {
        var behavior = extend({}, proto);
        delete behavior.create;
        delete behavior.addBehavior;
        delete behavior.createBehavior;
        behavior.stub = stub;

        if (stub.defaultBehavior && stub.defaultBehavior.promiseLibrary) {
            behavior.promiseLibrary = stub.defaultBehavior.promiseLibrary;
        }

        return behavior;
    },

    isPresent: function isPresent() {
        return (
            typeof this.callArgAt === "number" ||
            this.exception ||
            this.exceptionCreator ||
            typeof this.returnArgAt === "number" ||
            this.returnThis ||
            typeof this.resolveArgAt === "number" ||
            this.resolveThis ||
            typeof this.throwArgAt === "number" ||
            this.fakeFn ||
            this.returnValueDefined
        );
    },

    /*eslint complexity: ["error", 20]*/
    invoke: function invoke(context, args) {
        /*
         * callCallback (conditionally) calls ensureArgs
         *
         * Note: callCallback intentionally happens before
         * everything else and cannot be moved lower
         */
        var returnValue = callCallback(this, args);

        if (this.exception) {
            throw this.exception;
        } else if (this.exceptionCreator) {
            this.exception = this.exceptionCreator();
            this.exceptionCreator = undefined;
            throw this.exception;
        } else if (typeof this.returnArgAt === "number") {
            ensureArgs("returnsArg", this, args);
            return args[this.returnArgAt];
        } else if (this.returnThis) {
            return context;
        } else if (typeof this.throwArgAt === "number") {
            ensureArgs("throwsArg", this, args);
            throw args[this.throwArgAt];
        } else if (this.fakeFn) {
            return this.fakeFn.apply(context, args);
        } else if (typeof this.resolveArgAt === "number") {
            ensureArgs("resolvesArg", this, args);
            return (this.promiseLibrary || Promise).resolve(args[this.resolveArgAt]);
        } else if (this.resolveThis) {
            return (this.promiseLibrary || Promise).resolve(context);
        } else if (this.resolve) {
            return (this.promiseLibrary || Promise).resolve(this.returnValue);
        } else if (this.reject) {
            return (this.promiseLibrary || Promise).reject(this.returnValue);
        } else if (this.callsThrough) {
            var wrappedMethod = this.effectiveWrappedMethod();

            return wrappedMethod.apply(context, args);
        } else if (this.callsThroughWithNew) {
            // Get the original method (assumed to be a constructor in this case)
            var WrappedClass = this.effectiveWrappedMethod();
            // Turn the arguments object into a normal array
            var argsArray = slice$2(args);
            // Call the constructor
            var F = WrappedClass.bind.apply(WrappedClass, concat([null], argsArray));
            return new F();
        } else if (typeof this.returnValue !== "undefined") {
            return this.returnValue;
        } else if (typeof this.callArgAt === "number") {
            return returnValue;
        }

        return this.returnValue;
    },

    effectiveWrappedMethod: function effectiveWrappedMethod() {
        for (var stubb = this.stub; stubb; stubb = stubb.parent) {
            if (stubb.wrappedMethod) {
                return stubb.wrappedMethod;
            }
        }
        throw new Error("Unable to find wrapped method");
    },

    onCall: function onCall(index) {
        return this.stub.onCall(index);
    },

    onFirstCall: function onFirstCall() {
        return this.stub.onFirstCall();
    },

    onSecondCall: function onSecondCall() {
        return this.stub.onSecondCall();
    },

    onThirdCall: function onThirdCall() {
        return this.stub.onThirdCall();
    },

    withArgs: function withArgs(/* arguments */) {
        throw new Error(
            'Defining a stub by invoking "stub.onCall(...).withArgs(...)" ' +
                'is not supported. Use "stub.withArgs(...).onCall(...)" ' +
                "to define sequential behavior for calls with certain arguments."
        );
    }
};

function createBehavior(behaviorMethod) {
    return function() {
        this.defaultBehavior = this.defaultBehavior || proto.create(this);
        this.defaultBehavior[behaviorMethod].apply(this.defaultBehavior, arguments);
        return this;
    };
}

function addBehavior(stub, name, fn) {
    proto[name] = function() {
        fn.apply(this, concat([this], slice$2(arguments)));
        return this.stub || this;
    };

    stub[name] = createBehavior(name);
}

proto.addBehavior = addBehavior;
proto.createBehavior = createBehavior;

var asyncBehaviors = exportAsyncBehaviors(proto);

var behavior = extend.nonEnum({}, proto, asyncBehaviors);

var forEach = lib.prototypes.array.forEach;

function walkInternal(obj, iterator, context, originalObj, seen) {
    var proto, prop;

    if (typeof Object.getOwnPropertyNames !== "function") {
        // We explicitly want to enumerate through all of the prototype's properties
        // in this case, therefore we deliberately leave out an own property check.
        /* eslint-disable-next-line guard-for-in */
        for (prop in obj) {
            iterator.call(context, obj[prop], prop, obj);
        }

        return;
    }

    forEach(Object.getOwnPropertyNames(obj), function(k) {
        if (seen[k] !== true) {
            seen[k] = true;
            var target = typeof Object.getOwnPropertyDescriptor(obj, k).get === "function" ? originalObj : obj;
            iterator.call(context, k, target);
        }
    });

    proto = Object.getPrototypeOf(obj);
    if (proto) {
        walkInternal(proto, iterator, context, originalObj, seen);
    }
}

/* Walks the prototype chain of an object and iterates over every own property
 * name encountered. The iterator is called in the same fashion that Array.prototype.forEach
 * works, where it is passed the value, key, and own object as the 1st, 2nd, and 3rd positional
 * argument, respectively. In cases where Object.getOwnPropertyNames is not available, walk will
 * default to using a simple for..in loop.
 *
 * obj - The object to walk the prototype chain for.
 * iterator - The function to be called on each pass of the walk.
 * context - (Optional) When given, the iterator will be called with this object as the receiver.
 */
var walk = function walk(obj, iterator, context) {
    return walkInternal(obj, iterator, context, obj, {});
};

var getPropertyDescriptor = function getPropertyDescriptor(object, property) {
    var proto = object;
    var descriptor;

    while (proto && !(descriptor = Object.getOwnPropertyDescriptor(proto, property))) {
        proto = Object.getPrototypeOf(proto);
    }
    return descriptor;
};

var hasOwnProperty$1 = lib.prototypes.object.hasOwnProperty;
var push$1 = lib.prototypes.array.push;

function collectMethod(methods, object, prop, propOwner) {
    if (typeof getPropertyDescriptor(propOwner, prop).value === "function" && hasOwnProperty$1(object, prop)) {
        push$1(methods, object[prop]);
    }
}

// This function returns an array of all the own methods on the passed object
function collectOwnMethods(object) {
    var methods = [];

    walk(object, collectMethod.bind(null, methods, object));

    return methods;
}

var collectOwnMethods_1 = collectOwnMethods;

/**
 * Verify if an object is a ECMAScript Module
 *
 * As the exports from a module is immutable we cannot alter the exports
 * using spies or stubs. Let the consumer know this to avoid bug reports
 * on weird error messages.
 *
 * @param {Object} object The object to examine
 *
 * @returns {Boolean} true when the object is a module
 */
var isEsModule = function(object) {
    return (
        object && typeof Symbol !== "undefined" && object[Symbol.toStringTag] === "Module" && Object.isSealed(object)
    );
};

function isPropertyConfigurable(obj, propName) {
    var propertyDescriptor = getPropertyDescriptor(obj, propName);

    return propertyDescriptor ? propertyDescriptor.configurable : true;
}

var isPropertyConfigurable_1 = isPropertyConfigurable;

function isNonExistentOwnProperty(object, property) {
    return object && typeof property !== "undefined" && !(property in object);
}

var isNonExistentOwnProperty_1 = isNonExistentOwnProperty;

function isNaN$1(value) {
    // Unlike global isNaN, this avoids type coercion
    // typeof check avoids IE host object issues, hat tip to
    // lodash
    var val = value; // JsLint thinks value !== value is "weird"
    return typeof value === "number" && value !== val;
}

var isNan = isNaN$1;

/**
 * @name samsam.isNegZero
 * @param Object value
 *
 * Returns ``true`` if ``value`` is ``-0``.
 */
function isNegZero(value) {
    return value === 0 && 1 / value === -Infinity;
}

var isNegZero_1 = isNegZero;

/**
 * @name samsam.equal
 * @param Object obj1
 * @param Object obj2
 *
 * Returns ``true`` if two objects are strictly equal. Compared to
 * ``===`` there are two exceptions:
 *
 *   - NaN is considered equal to NaN
 *   - -0 and +0 are not considered equal
 */
function identical(obj1, obj2) {
    if (obj1 === obj2 || (isNan(obj1) && isNan(obj2))) {
        return obj1 !== 0 || isNegZero_1(obj1) === isNegZero_1(obj2);
    }

    return false;
}

var identical_1 = identical;

var o = Object.prototype;

function getClass(value) {
    // Returns the internal [[Class]] by calling Object.prototype.toString
    // with the provided value as this. Return value is a string, naming the
    // internal class, e.g. "Array"
    return o.toString.call(value).split(/[ \]]/)[1];
}

var getClass_1 = getClass;

/**
 * @name samsam.isArguments
 * @param Object object
 *
 * Returns ``true`` if ``object`` is an ``arguments`` object,
 * ``false`` otherwise.
 */
function isArguments(object) {
    if (getClass_1(object) === "Arguments") {
        return true;
    }
    if (
        typeof object !== "object" ||
        typeof object.length !== "number" ||
        getClass_1(object) === "Array"
    ) {
        return false;
    }
    if (typeof object.callee === "function") {
        return true;
    }
    try {
        object[object.length] = 6;
        delete object[object.length];
    } catch (e) {
        return true;
    }
    return false;
}

var isArguments_1 = isArguments;

var div = typeof document !== "undefined" && document.createElement("div");

/**
 * @name samsam.isElement
 * @param Object object
 *
 * Returns ``true`` if ``object`` is a DOM element node. Unlike
 * Underscore.js/lodash, this function will return ``false`` if ``object``
 * is an *element-like* object, i.e. a regular object with a ``nodeType``
 * property that holds the value ``1``.
 */
function isElement(object) {
    if (!object || object.nodeType !== 1 || !div) {
        return false;
    }
    try {
        object.appendChild(div);
        object.removeChild(div);
    } catch (e) {
        return false;
    }
    return true;
}

var isElement_1 = isElement;

function isSet(val) {
    return (typeof Set !== "undefined" && val instanceof Set) || false;
}

var isSet_1 = isSet;

function isDate(value) {
    return value instanceof Date;
}

var isDate_1 = isDate;

function isMap(value) {
    return typeof Map !== "undefined" && value instanceof Map;
}

var isMap_1 = isMap;

// Returns true when the value is a regular Object and not a specialized Object
//
// This helps speeding up deepEqual cyclic checks
// The premise is that only Objects are stored in the visited array.
// So if this function returns false, we don't have to do the
// expensive operation of searching for the value in the the array of already
// visited objects
function isObject(value) {
    return (
        typeof value === "object" &&
        value !== null &&
        // none of these are collection objects, so we can return false
        !(value instanceof Boolean) &&
        !(value instanceof Date) &&
        !(value instanceof Error) &&
        !(value instanceof Number) &&
        !(value instanceof RegExp) &&
        !(value instanceof String)
    );
}

var isObject_1 = isObject;

function isSubset(s1, s2, compare) {
    var allContained = true;
    s1.forEach(function(v1) {
        var includes = false;
        s2.forEach(function(v2) {
            if (compare(v2, v1)) {
                includes = true;
            }
        });
        allContained = allContained && includes;
    });

    return allContained;
}

var isSubset_1 = isSubset;

var valueToString$2 = lib.valueToString;

var re = /function (\w+)\s*\(/;

function getClassName(value) {
    if (value.constructor && "name" in value.constructor) {
        return value.constructor.name;
    }

    if (typeof value.constructor === "function") {
        var match = valueToString$2(value.constructor).match(re);
        if (match.length > 1) {
            return match[1];
        }
    }

    return null;
}

var getClassName_1 = getClassName;

var valueToString$3 = lib.valueToString;













var every$2 = Array.prototype.every;
var getTime = Date.prototype.getTime;
var hasOwnProperty$2 = Object.prototype.hasOwnProperty;
var indexOf = Array.prototype.indexOf;
var keys = Object.keys;
var getOwnPropertySymbols = Object.getOwnPropertySymbols;

/**
 * @name samsam.deepEqual
 * @param Object actual
 * @param Object expectation
 *
 * Deep equal comparison. Two values are "deep equal" if:
 *
 *   - They are equal, according to samsam.identical
 *   - They are both date objects representing the same time
 *   - They are both arrays containing elements that are all deepEqual
 *   - They are objects with the same set of properties, and each property
 *     in ``actual`` is deepEqual to the corresponding property in ``expectation``
 *
 * Supports cyclic objects.
 */
function deepEqualCyclic(actual, expectation, match) {
    // used for cyclic comparison
    // contain already visited objects
    var actualObjects = [];
    var expectationObjects = [];
    // contain pathes (position in the object structure)
    // of the already visited objects
    // indexes same as in objects arrays
    var actualPaths = [];
    var expectationPaths = [];
    // contains combinations of already compared objects
    // in the manner: { "$1['ref']$2['ref']": true }
    var compared = {};

    // does the recursion for the deep equal check
    return (function deepEqual(
        actualObj,
        expectationObj,
        actualPath,
        expectationPath
    ) {
        // If both are matchers they must be the same instance in order to be
        // considered equal If we didn't do that we would end up running one
        // matcher against the other
        if (match && match.isMatcher(expectationObj)) {
            if (match.isMatcher(actualObj)) {
                return actualObj === expectationObj;
            }
            return expectationObj.test(actualObj);
        }

        var actualType = typeof actualObj;
        var expectationType = typeof expectationObj;

        // == null also matches undefined
        if (
            actualObj === expectationObj ||
            isNan(actualObj) ||
            isNan(expectationObj) ||
            actualObj == null ||
            expectationObj == null ||
            actualType !== "object" ||
            expectationType !== "object"
        ) {
            return identical_1(actualObj, expectationObj);
        }

        // Elements are only equal if identical(expected, actual)
        if (isElement_1(actualObj) || isElement_1(expectationObj)) {
            return false;
        }

        var isActualDate = isDate_1(actualObj);
        var isExpectationDate = isDate_1(expectationObj);
        if (isActualDate || isExpectationDate) {
            if (
                !isActualDate ||
                !isExpectationDate ||
                getTime.call(actualObj) !== getTime.call(expectationObj)
            ) {
                return false;
            }
        }

        if (actualObj instanceof RegExp && expectationObj instanceof RegExp) {
            if (valueToString$3(actualObj) !== valueToString$3(expectationObj)) {
                return false;
            }
        }

        if (actualObj instanceof Error && expectationObj instanceof Error) {
            return actualObj === expectationObj;
        }

        var actualClass = getClass_1(actualObj);
        var expectationClass = getClass_1(expectationObj);
        var actualKeys = keys(actualObj);
        var expectationKeys = keys(expectationObj);
        var actualName = getClassName_1(actualObj);
        var expectationName = getClassName_1(expectationObj);
        var expectationSymbols =
            typeof getOwnPropertySymbols === "function"
                ? getOwnPropertySymbols(expectationObj)
                : [];
        var expectationKeysAndSymbols = expectationKeys.concat(
            expectationSymbols
        );

        if (isArguments_1(actualObj) || isArguments_1(expectationObj)) {
            if (actualObj.length !== expectationObj.length) {
                return false;
            }
        } else {
            if (
                actualType !== expectationType ||
                actualClass !== expectationClass ||
                actualKeys.length !== expectationKeys.length ||
                (actualName &&
                    expectationName &&
                    actualName !== expectationName)
            ) {
                return false;
            }
        }

        if (isSet_1(actualObj) || isSet_1(expectationObj)) {
            if (
                !isSet_1(actualObj) ||
                !isSet_1(expectationObj) ||
                actualObj.size !== expectationObj.size
            ) {
                return false;
            }

            return isSubset_1(actualObj, expectationObj, deepEqual);
        }

        if (isMap_1(actualObj) || isMap_1(expectationObj)) {
            if (
                !isMap_1(actualObj) ||
                !isMap_1(expectationObj) ||
                actualObj.size !== expectationObj.size
            ) {
                return false;
            }

            var mapsDeeplyEqual = true;
            actualObj.forEach(function(value, key) {
                mapsDeeplyEqual =
                    mapsDeeplyEqual &&
                    deepEqualCyclic(value, expectationObj.get(key));
            });

            return mapsDeeplyEqual;
        }

        return every$2.call(expectationKeysAndSymbols, function(key) {
            if (!hasOwnProperty$2.call(actualObj, key)) {
                return false;
            }

            var actualValue = actualObj[key];
            var expectationValue = expectationObj[key];
            var actualObject = isObject_1(actualValue);
            var expectationObject = isObject_1(expectationValue);
            // determines, if the objects were already visited
            // (it's faster to check for isObject first, than to
            // get -1 from getIndex for non objects)
            var actualIndex = actualObject
                ? indexOf.call(actualObjects, actualValue)
                : -1;
            var expectationIndex = expectationObject
                ? indexOf.call(expectationObjects, expectationValue)
                : -1;
            // determines the new paths of the objects
            // - for non cyclic objects the current path will be extended
            //   by current property name
            // - for cyclic objects the stored path is taken
            var newActualPath =
                actualIndex !== -1
                    ? actualPaths[actualIndex]
                    : actualPath + "[" + JSON.stringify(key) + "]";
            var newExpectationPath =
                expectationIndex !== -1
                    ? expectationPaths[expectationIndex]
                    : expectationPath + "[" + JSON.stringify(key) + "]";
            var combinedPath = newActualPath + newExpectationPath;

            // stop recursion if current objects are already compared
            if (compared[combinedPath]) {
                return true;
            }

            // remember the current objects and their paths
            if (actualIndex === -1 && actualObject) {
                actualObjects.push(actualValue);
                actualPaths.push(newActualPath);
            }
            if (expectationIndex === -1 && expectationObject) {
                expectationObjects.push(expectationValue);
                expectationPaths.push(newExpectationPath);
            }

            // remember that the current objects are already compared
            if (actualObject && expectationObject) {
                compared[combinedPath] = true;
            }

            // End of cyclic logic

            // neither actualValue nor expectationValue is a cycle
            // continue with next level
            return deepEqual(
                actualValue,
                expectationValue,
                newActualPath,
                newExpectationPath
            );
        });
    })(actual, expectation, "$1", "$2");
}

deepEqualCyclic.use = function(match) {
    return function(a, b) {
        return deepEqualCyclic(a, b, match);
    };
};

var deepEqual = deepEqualCyclic;

var lodash = createCommonjsModule(function (module, exports) {
(function() {

  /** Used as a safe reference for `undefined` in pre-ES5 environments. */
  var undefined;

  /** Used as the semantic version number. */
  var VERSION = '4.17.14';

  /** Used as the size to enable large array optimizations. */
  var LARGE_ARRAY_SIZE = 200;

  /** Error message constants. */
  var CORE_ERROR_TEXT = 'Unsupported core-js use. Try https://npms.io/search?q=ponyfill.',
      FUNC_ERROR_TEXT = 'Expected a function';

  /** Used to stand-in for `undefined` hash values. */
  var HASH_UNDEFINED = '__lodash_hash_undefined__';

  /** Used as the maximum memoize cache size. */
  var MAX_MEMOIZE_SIZE = 500;

  /** Used as the internal argument placeholder. */
  var PLACEHOLDER = '__lodash_placeholder__';

  /** Used to compose bitmasks for cloning. */
  var CLONE_DEEP_FLAG = 1,
      CLONE_FLAT_FLAG = 2,
      CLONE_SYMBOLS_FLAG = 4;

  /** Used to compose bitmasks for value comparisons. */
  var COMPARE_PARTIAL_FLAG = 1,
      COMPARE_UNORDERED_FLAG = 2;

  /** Used to compose bitmasks for function metadata. */
  var WRAP_BIND_FLAG = 1,
      WRAP_BIND_KEY_FLAG = 2,
      WRAP_CURRY_BOUND_FLAG = 4,
      WRAP_CURRY_FLAG = 8,
      WRAP_CURRY_RIGHT_FLAG = 16,
      WRAP_PARTIAL_FLAG = 32,
      WRAP_PARTIAL_RIGHT_FLAG = 64,
      WRAP_ARY_FLAG = 128,
      WRAP_REARG_FLAG = 256,
      WRAP_FLIP_FLAG = 512;

  /** Used as default options for `_.truncate`. */
  var DEFAULT_TRUNC_LENGTH = 30,
      DEFAULT_TRUNC_OMISSION = '...';

  /** Used to detect hot functions by number of calls within a span of milliseconds. */
  var HOT_COUNT = 800,
      HOT_SPAN = 16;

  /** Used to indicate the type of lazy iteratees. */
  var LAZY_FILTER_FLAG = 1,
      LAZY_MAP_FLAG = 2,
      LAZY_WHILE_FLAG = 3;

  /** Used as references for various `Number` constants. */
  var INFINITY = 1 / 0,
      MAX_SAFE_INTEGER = 9007199254740991,
      MAX_INTEGER = 1.7976931348623157e+308,
      NAN = 0 / 0;

  /** Used as references for the maximum length and index of an array. */
  var MAX_ARRAY_LENGTH = 4294967295,
      MAX_ARRAY_INDEX = MAX_ARRAY_LENGTH - 1,
      HALF_MAX_ARRAY_LENGTH = MAX_ARRAY_LENGTH >>> 1;

  /** Used to associate wrap methods with their bit flags. */
  var wrapFlags = [
    ['ary', WRAP_ARY_FLAG],
    ['bind', WRAP_BIND_FLAG],
    ['bindKey', WRAP_BIND_KEY_FLAG],
    ['curry', WRAP_CURRY_FLAG],
    ['curryRight', WRAP_CURRY_RIGHT_FLAG],
    ['flip', WRAP_FLIP_FLAG],
    ['partial', WRAP_PARTIAL_FLAG],
    ['partialRight', WRAP_PARTIAL_RIGHT_FLAG],
    ['rearg', WRAP_REARG_FLAG]
  ];

  /** `Object#toString` result references. */
  var argsTag = '[object Arguments]',
      arrayTag = '[object Array]',
      asyncTag = '[object AsyncFunction]',
      boolTag = '[object Boolean]',
      dateTag = '[object Date]',
      domExcTag = '[object DOMException]',
      errorTag = '[object Error]',
      funcTag = '[object Function]',
      genTag = '[object GeneratorFunction]',
      mapTag = '[object Map]',
      numberTag = '[object Number]',
      nullTag = '[object Null]',
      objectTag = '[object Object]',
      promiseTag = '[object Promise]',
      proxyTag = '[object Proxy]',
      regexpTag = '[object RegExp]',
      setTag = '[object Set]',
      stringTag = '[object String]',
      symbolTag = '[object Symbol]',
      undefinedTag = '[object Undefined]',
      weakMapTag = '[object WeakMap]',
      weakSetTag = '[object WeakSet]';

  var arrayBufferTag = '[object ArrayBuffer]',
      dataViewTag = '[object DataView]',
      float32Tag = '[object Float32Array]',
      float64Tag = '[object Float64Array]',
      int8Tag = '[object Int8Array]',
      int16Tag = '[object Int16Array]',
      int32Tag = '[object Int32Array]',
      uint8Tag = '[object Uint8Array]',
      uint8ClampedTag = '[object Uint8ClampedArray]',
      uint16Tag = '[object Uint16Array]',
      uint32Tag = '[object Uint32Array]';

  /** Used to match empty string literals in compiled template source. */
  var reEmptyStringLeading = /\b__p \+= '';/g,
      reEmptyStringMiddle = /\b(__p \+=) '' \+/g,
      reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;

  /** Used to match HTML entities and HTML characters. */
  var reEscapedHtml = /&(?:amp|lt|gt|quot|#39);/g,
      reUnescapedHtml = /[&<>"']/g,
      reHasEscapedHtml = RegExp(reEscapedHtml.source),
      reHasUnescapedHtml = RegExp(reUnescapedHtml.source);

  /** Used to match property names within property paths. */
  var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
      reIsPlainProp = /^\w*$/,
      rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;

  /**
   * Used to match `RegExp`
   * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
   */
  var reRegExpChar = /[\\^$.*+?()[\]{}|]/g,
      reHasRegExpChar = RegExp(reRegExpChar.source);

  /** Used to match leading and trailing whitespace. */
  var reTrim = /^\s+|\s+$/g,
      reTrimStart = /^\s+/,
      reTrimEnd = /\s+$/;

  /** Used to match wrap detail comments. */
  var reWrapComment = /\{(?:\n\/\* \[wrapped with .+\] \*\/)?\n?/,
      reWrapDetails = /\{\n\/\* \[wrapped with (.+)\] \*/,
      reSplitDetails = /,? & /;

  /** Used to match words composed of alphanumeric characters. */
  var reAsciiWord = /[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g;

  /** Used to match backslashes in property paths. */
  var reEscapeChar = /\\(\\)?/g;

  /**
   * Used to match
   * [ES template delimiters](http://ecma-international.org/ecma-262/7.0/#sec-template-literal-lexical-components).
   */
  var reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;

  /** Used to match `RegExp` flags from their coerced string values. */
  var reFlags = /\w*$/;

  /** Used to detect bad signed hexadecimal string values. */
  var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

  /** Used to detect binary string values. */
  var reIsBinary = /^0b[01]+$/i;

  /** Used to detect host constructors (Safari). */
  var reIsHostCtor = /^\[object .+?Constructor\]$/;

  /** Used to detect octal string values. */
  var reIsOctal = /^0o[0-7]+$/i;

  /** Used to detect unsigned integer values. */
  var reIsUint = /^(?:0|[1-9]\d*)$/;

  /** Used to match Latin Unicode letters (excluding mathematical operators). */
  var reLatin = /[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g;

  /** Used to ensure capturing order of template delimiters. */
  var reNoMatch = /($^)/;

  /** Used to match unescaped characters in compiled string literals. */
  var reUnescapedString = /['\n\r\u2028\u2029\\]/g;

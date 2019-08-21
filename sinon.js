
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


    withArgs: function withArgs(/* arguments */) {
        throw new Error(
            'Defining a stub by invoking "stub.onCall(...).withArgs(...)" ' +
                'is not supported. Use "stub.withArgs(...).onCall(...)" ' +
                "to define sequential behavior for calls with certain arguments."
        );
    }
};


function addBehavior(stub, name, fn) {
    proto[name] = function() {
        fn.apply(this, concat([this], slice$2(arguments)));
        return this. || ;
    };




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

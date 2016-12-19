(function() {
  var clone, cloneDeep, contains, containsArray, containsObject, defaults, extend, has, identity, includes, intersection, isArray, isBoolean, isDate, isEqual, isEqualArray, isFunction, isNumber, isObjectLike, isPlainObject, isString, isVoid, remove, size, toArray, uniq, unique,
    slice = [].slice;

  identity = function(x) {
    return x;
  };

  isVoid = function(x) {
    return x === null || typeof x === 'undefined';
  };

  isFunction = function(x) {
    return typeof x === 'function';
  };

  isObjectLike = function(x) {
    return !isVoid(x) && typeof x === 'object';
  };

  isString = function(x) {
    return typeof x === 'string';
  };

  isNumber = function(x) {
    return typeof x === 'number';
  };

  isDate = function(x) {
    return x instanceof Date;
  };

  isBoolean = function(x) {
    return x === true || x === false;
  };

  isArray = !Array.isArray ? function(x) {
    return Object.prototype.toString.call(x) === '[object Array]';
  } : Array.isArray;

  extend = function() {
    var into, values;
    into = arguments[0], values = 2 <= arguments.length ? slice.call(arguments, 1) : [];
    return toArray(values || []).reduce((function(acc, value) {
      Object.keys(value).forEach(function(key) {
        if (isVoid(key)) {
          return delete acc[key];
        } else {
          return acc[key] = value[key];
        }
      });
      return acc;
    }), into);
  };

  isEqualArray = function(left, right) {
    return left === right || (!isVoid(left) && !isVoid(right) && isArray(left) === isArray(right) && (!isArray(left) || (left.length === right.length && left.every(function(leftValue, leftIndex) {
      return leftValue === right[leftIndex];
    }))));
  };

  isPlainObject = function(x) {
    return isObjectLike(x) && !isFunction(x) && !isString(x) && !isArray(x);
  };

  clone = function(value) {
    if (isVoid(value)) {
      return null;
    } else if (isArray(value)) {
      return value.map(identity);
    } else if (isString(value)) {
      return value;
    } else if (isDate(value)) {
      return new Date(value);
    } else if (typeof value === 'object') {
      return Object.keys(value).reduce((function(acc, key) {
        acc[key] = value[key];
        return acc;
      }), {});
    } else {
      return value;
    }
  };

  cloneDeep = function(value) {
    if (isVoid(value)) {
      return value;
    } else if (isArray(value)) {
      return value.map(cloneDeep);
    } else if (isString(value)) {
      return value;
    } else if (isDate(value)) {
      return new Date(value);
    } else if (typeof value === 'object') {
      return Object.keys(value).reduce((function(acc, key) {
        acc[key] = cloneDeep(value[key]);
        return acc;
      }), {});
    } else {
      return value;
    }
  };

  toArray = function(x) {
    if (isArray(x)) {
      return x;
    } else if (isString(x)) {
      return x.split('');
    } else if (isObjectLike(x)) {
      return Object.keys(x).map(function(key) {
        return x[key];
      });
    } else {
      return [];
    }
  };

  has = function(obj, value) {
    return obj.hasOwnProperty(value);
  };

  containsArray = function(ns, value) {
    if (isFunction(value)) {
      return ns.some(value);
    } else {
      return ns.indexOf(value) !== -1;
    }
  };

  containsObject = function(into, value) {
    if (isFunction(value)) {
      return Object.keys(into).some(function(key) {
        return value(into[key], key);
      });
    } else {
      return Object.keys(into).some(function(key) {
        return value === into[key];
      });
    }
  };

  contains = function(containsInto, containsValue) {
    if (isArray(containsInto)) {
      return containsArray(containsInto, containsValue);
    } else if (isObjectLike(containsInto)) {
      return containsObject(containsInto, containsValue);
    } else {
      return false;
    }
  };

  unique = function(values) {
    return values.filter(function(value, i) {
      return values.indexOf(value) >= i;
    });
  };

  size = function(value) {
    if (isArray(value) || isString(value)) {
      return value.length;
    } else if (isObjectLike(value)) {
      return Object.keys(value).length;
    } else {
      return 0;
    }
  };

  intersection = function() {
    var head, rest;
    head = arguments[0], rest = 2 <= arguments.length ? slice.call(arguments, 1) : [];
    return unique(head.filter(function(v) {
      return rest.every(function(restContainers) {
        return contains(restContainers, v);
      });
    }));
  };

  defaults = function() {
    var defaultValues, orig;
    orig = arguments[0], defaultValues = 2 <= arguments.length ? slice.call(arguments, 1) : [];
    return defaultValues.reduce((function(acc, value) {
      Object.keys(value).forEach(function(key) {
        if (!acc.hasOwnProperty(key)) {
          return acc[key] = value[key];
        }
      });
      return acc;
    }), orig);
  };

  isEqual = function(left, right) {
    if (isArray(left)) {
      return isEqualArray(left, right);
    } else if (isPlainObject(left)) {
      return isPlainObject(right) && Object.keys(left).length === Object.keys(right).length && Object.keys(left).every(function(key) {
        return isEqual(left[key], right[key]);
      });
    } else {
      return left === right;
    }
  };

  remove = function(ns, n) {
    return ns.splice(ns.indexOf(n), 1);
  };

  includes = contains;

  uniq = unique;

  module.exports = {
    clone: clone,
    cloneDeep: cloneDeep,
    contains: contains,
    defaults: defaults,
    extend: extend,
    has: has,
    identity: identity,
    includes: includes,
    intersection: intersection,
    isArray: isArray,
    isBoolean: isBoolean,
    isDate: isDate,
    isEqual: isEqual,
    isFunction: isFunction,
    isNumber: isNumber,
    isPlainObject: isPlainObject,
    isString: isString,
    remove: remove,
    size: size,
    toArray: toArray,
    unique: unique,
    uniq: uniq
  };

}).call(this);

;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var ChangeManager, _,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

_ = (window._);

ChangeManager = (function() {
  ChangeManager.prototype.THROTTLE = {
    TIMEOUT: 'timeout',
    IMMEDIATE: 'immediate',
    ANIMATION_FRAME: 'animationFrame'
  };

  ChangeManager.prototype.ITERATION_LIMIT = 100;

  function ChangeManager() {
    this.resolve = bind(this.resolve, this);
    this.flush = bind(this.flush, this);
    this.getQueuedChanges = bind(this.getQueuedChanges, this);
    this.queueChanges = bind(this.queueChanges, this);
    this.reset = bind(this.reset, this);
    this.cleanupCycle = bind(this.cleanupCycle, this);
    this.unregisterResolveCallback = bind(this.unregisterResolveCallback, this);
    this.registerResolveCallback = bind(this.registerResolveCallback, this);
    this.unregisterQueueCallback = bind(this.unregisterQueueCallback, this);
    this.registerQueueCallback = bind(this.registerQueueCallback, this);
    this.setThrottle = bind(this.setThrottle, this);
    this.changes = {};
    this.internalChangeQueue = [];
    this.timeout = null;
    this.recursionCount = 0;
    this.setThrottle(this.THROTTLE.TIMEOUT);
    this._activeClearTimeout = null;
    this._queueCallback = null;
    this._resolveCallback = null;
  }

  ChangeManager.prototype.setThrottle = function(throttle) {
    if (!_.contains(this.THROTTLE, throttle)) {
      throw new Error("Throttle option must be set to one of the strategies specified on Scheming.THROTTLE");
    }
    switch (throttle) {
      case this.THROTTLE.TIMEOUT:
        this.setTimeout = (function(_this) {
          return function() {
            return _this.timeout != null ? _this.timeout : _this.timeout = setTimeout(_this.resolve, 0);
          };
        })(this);
        return this.clearTimeout = (function(_this) {
          return function() {
            clearTimeout(_this.timeout);
            return _this.timeout = null;
          };
        })(this);
      case this.THROTTLE.IMMEDIATE:
        if ((typeof setImmediate !== "undefined" && setImmediate !== null) && (typeof clearImmediate !== "undefined" && clearImmediate !== null)) {
          this.setTimeout = (function(_this) {
            return function() {
              return _this.timeout != null ? _this.timeout : _this.timeout = setImmediate(_this.resolve);
            };
          })(this);
          return this.clearTimeout = (function(_this) {
            return function() {
              clearImmediate(_this.timeout);
              return _this.timeout = null;
            };
          })(this);
        } else {
          console.warn("Cannot use strategy IMMEDIATE: `setImmediate` or `clearImmediate` are not available in the current environment.");
          return this.setThrottle(this.THROTTLE.TIMEOUT);
        }
        break;
      case this.THROTTLE.ANIMATION_FRAME:
        if ((typeof requestAnimationFrame !== "undefined" && requestAnimationFrame !== null) && (typeof cancelAnimationFrame !== "undefined" && cancelAnimationFrame !== null)) {
          this.setTimeout = (function(_this) {
            return function() {
              return _this.timeout != null ? _this.timeout : _this.timeout = requestAnimationFrame(_this.resolve);
            };
          })(this);
          return this.clearTimeout = (function(_this) {
            return function() {
              cancelAnimationFrame(_this.timeout);
              return _this.timeout = null;
            };
          })(this);
        } else {
          console.warn("Cannot use strategy ANIMATION_FRAME: `requestAnimationFrame` or `cancelAnimationFrame` are not available in the current environment.");
          return this.setThrottle(this.THROTTLE.TIMEOUT);
        }
    }
  };

  ChangeManager.prototype.setTimeout = function() {
    throw new Error("A throttle strategy must be set.");
  };

  clearTimeout(function() {
    throw new Error("A throttle strategy must be set.");
  });

  ChangeManager.prototype.registerQueueCallback = function(callback) {
    if (!_.isFunction(callback)) {
      throw new Error("Callback must be a function");
    }
    return this._queueCallback = callback;
  };

  ChangeManager.prototype.unregisterQueueCallback = function() {
    return this._queueCallback = null;
  };

  ChangeManager.prototype.registerResolveCallback = function(callback) {
    if (!_.isFunction(callback)) {
      throw new Error("Callback must be a function");
    }
    return this._resolveCallback = callback;
  };

  ChangeManager.prototype.unregisterResolveCallback = function() {
    return this._resolveCallback = null;
  };

  ChangeManager.prototype.cleanupCycle = function() {
    this.changes = {};
    this.internalChangeQueue = [];
    if (typeof this._activeClearTimeout === "function") {
      this._activeClearTimeout();
    }
    return this.recursionCount = 0;
  };

  ChangeManager.prototype.reset = function() {
    this.changes = {};
    this.internalChangeQueue = [];
    if (typeof this._activeClearTimeout === "function") {
      this._activeClearTimeout();
    }
    this.timeout = null;
    this.recursionCount = 0;
    this.setThrottle(this.THROTTLE.TIMEOUT);
    this._queueCallback = null;
    return this._resolveCallback = null;
  };

  ChangeManager.prototype.queueChanges = function(arg, fireWatchers) {
    var base, changedProps, equals, force, id, newVal, oldVal, propName;
    id = arg.id, propName = arg.propName, oldVal = arg.oldVal, newVal = arg.newVal, equals = arg.equals, force = arg.force;
    if (!_.has(this.changes, id)) {
      if ((base = this.changes)[id] == null) {
        base[id] = {
          changedProps: {},
          fireWatchers: fireWatchers
        };
      }
      this.internalChangeQueue.push(id);
    }
    changedProps = this.changes[id].changedProps;
    if (propName) {
      if (_.has(changedProps, propName) && equals(changedProps[propName], newVal)) {
        delete changedProps[propName];
      } else if (force || (!_.has(changedProps, propName) && !equals(oldVal, newVal))) {
        changedProps[propName] = oldVal;
      }
    }
    if (this.timeout == null) {
      if (typeof this._queueCallback === "function") {
        this._queueCallback();
      }
      this.setTimeout();
      return this._activeClearTimeout = this.clearTimeout;
    }
  };

  ChangeManager.prototype.getQueuedChanges = function(arg) {
    var id, propName, ref;
    id = arg.id, propName = arg.propName;
    return (ref = this.changes[id]) != null ? ref.changedProps[propName] : void 0;
  };

  ChangeManager.prototype.flush = function() {
    return this.resolve();
  };

  ChangeManager.prototype.resolve = function() {
    var changedProps, changes, fireWatchers, i, id, internalChanges, len, ref, ref1;
    this.recursionCount++;
    if (this.ITERATION_LIMIT > 0 && this.recursionCount > this.ITERATION_LIMIT) {
      changes = this.changes;
      this.cleanupCycle();
      throw new Error("Aborting change propagation after " + this.ITERATION_LIMIT + " cycles.\nThis is probably indicative of a circular watch. Check the following watches for clues:\n" + (JSON.stringify(changes)));
    }
    internalChanges = _.unique(this.internalChangeQueue);
    this.internalChangeQueue = [];
    for (i = 0, len = internalChanges.length; i < len; i++) {
      id = internalChanges[i];
      ref = this.changes[id], changedProps = ref.changedProps, fireWatchers = ref.fireWatchers;
      fireWatchers(changedProps, 'internal');
    }
    if (this.internalChangeQueue.length) {
      return this.resolve();
    }
    changes = this.changes;
    this.changes = {};
    for (id in changes) {
      ref1 = changes[id], changedProps = ref1.changedProps, fireWatchers = ref1.fireWatchers;
      fireWatchers(changedProps, 'external');
    }
    if (_.size(this.changes) > 0) {
      return this.resolve();
    }
    if (typeof this._resolveCallback === "function") {
      this._resolveCallback();
    }
    return this.cleanupCycle();
  };

  return ChangeManager;

})();

module.exports = new ChangeManager();



},{}],2:[function(require,module,exports){
var _;

_ = window._;

window.Scheming = require('./Scheming');



},{"./Scheming":6}],3:[function(require,module,exports){
var ChangeManager, InstanceFactory, Types, _,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  slice = [].slice;

_ = (window._);

Types = require('./Types');

ChangeManager = require('./ChangeManager');

InstanceFactory = (function() {
  function InstanceFactory() {
    this.create = bind(this.create, this);
    this.uuid = bind(this.uuid, this);
  }

  InstanceFactory.prototype.ARRAY_MUTATORS = ['copyWithin', 'fill', 'push', 'pop', 'reverse', 'shift', 'sort', 'splice', 'unshift'];

  InstanceFactory.prototype.uuid = function() {
    var now;
    now = Date.now();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r;
      r = (now + Math.random() * 16) % 16 | 0;
      now = Math.floor(now / 16);
      return (c === "x" ? r : r & 0x3 | 0x8).toString(16);
    });
  };

  InstanceFactory.prototype.create = function(instance, normalizedSchema, initialState, opts) {
    var _initializing, addWatcher, data, fireWatchers, fn, get, id, propConfig, propName, removeWatcher, seal, set, strict, unwatchers, val, watchForPropagation, watchers;
    _initializing = true;
    data = {};
    watchers = {
      internal: [],
      external: []
    };
    unwatchers = {};
    id = this.uuid();
    strict = opts.strict, seal = opts.seal;
    set = (function(_this) {
      return function(propName, val) {
        var prevVal, ref, setter, type;
        prevVal = data[propName];
        if (!normalizedSchema[propName]) {
          return instance[propName] = val;
        }
        ref = normalizedSchema[propName], type = ref.type, setter = ref.setter;
        if (val != null) {
          if (setter) {
            val = setter.call(instance, val);
          }
          if (!type.identifier(val)) {
            if (strict) {
              throw new Error("Error assigning " + val + " to " + propName + ". Value is not of type " + type.string);
            }
            val = type.parser(val);
          }
          if (type.string === Types.NESTED_TYPES.Array.string) {
            val = type.childParser(val);
            Object.defineProperty(val, '_arrayId', {
              configurable: true,
              value: _this.uuid()
            });
            _.each(_this.ARRAY_MUTATORS, function(method) {
              if ((prevVal != null) && prevVal[method]) {
                delete prevVal[method];
              }
              if (Array.prototype[method] != null) {
                return Object.defineProperty(val, method, {
                  configurable: true,
                  writable: true,
                  value: function() {
                    var clone, ref1, toReturn;
                    clone = _.clone(this);
                    toReturn = (ref1 = Array.prototype[method]).call.apply(ref1, [this].concat(slice.call(arguments)));
                    ChangeManager.queueChanges({
                      id: id,
                      propName: propName,
                      oldVal: clone,
                      newVal: val,
                      equals: type.equals
                    }, fireWatchers);
                    instance[propName] = this;
                    return toReturn;
                  }
                });
              }
            });
          }
        }
        data[propName] = val;
        watchForPropagation(propName, val);
        if (!_initializing) {
          return ChangeManager.queueChanges({
            id: id,
            propName: propName,
            oldVal: prevVal,
            newVal: val,
            equals: type.equals
          }, fireWatchers);
        }
      };
    })(this);
    get = function(propName) {
      var getter, val;
      getter = normalizedSchema[propName].getter;
      val = data[propName];
      if (getter) {
        val = getter.call(instance, val);
      }
      return val;
    };
    addWatcher = function(properties, cb, opts) {
      var j, len, propName, target, watcher;
      if (_.isFunction(properties)) {
        opts = cb;
        cb = properties;
        properties = _.keys(normalizedSchema);
      }
      if (opts == null) {
        opts = {};
      }
      if (opts.internal == null) {
        opts.internal = false;
      }
      target = opts.internal ? 'internal' : 'external';
      if (!_.isFunction(cb)) {
        throw new Error('A watch must be provided with a callback function.');
      }
      if (properties && !_.isArray(properties)) {
        properties = [properties];
      }
      for (j = 0, len = properties.length; j < len; j++) {
        propName = properties[j];
        if (!_.has(normalizedSchema, propName)) {
          throw new Error("Cannot set watch on " + propName + ", property is not defined in schema.");
        }
      }
      watcher = {
        properties: properties,
        cb: cb,
        first: !opts.internal
      };
      watchers[target].push(watcher);
      ChangeManager.queueChanges({
        id: id
      }, fireWatchers);
      return function() {
        return removeWatcher(watcher, target);
      };
    };
    removeWatcher = function(watcher, target) {
      return _.remove(watchers[target], watcher);
    };
    watchForPropagation = function(propName, val) {
      var j, len, ref, type, unwatcher;
      type = normalizedSchema[propName].type;
      if (type.string === Types.NESTED_TYPES.Schema.string) {
        if (typeof unwatchers[propName] === "function") {
          unwatchers[propName]();
        }
        unwatchers[propName] = val != null ? val.watch(function(newVal, oldVal) {
          return ChangeManager.queueChanges({
            id: id,
            propName: propName,
            oldVal: oldVal,
            newVal: newVal,
            equals: type.equals
          }, fireWatchers);
        }, {
          internal: true
        }) : void 0;
      }
      if (type.string === Types.NESTED_TYPES.Array.string && type.childType.string === Types.NESTED_TYPES.Schema.string) {
        ref = unwatchers[propName] || [];
        for (j = 0, len = ref.length; j < len; j++) {
          unwatcher = ref[j];
          if (typeof unwatcher === "function") {
            unwatcher();
          }
        }
        unwatchers[propName] = [];
        return _.each(val, function(schema, i) {
          return unwatchers[propName].push(schema != null ? schema.watch(function(newVal, oldVal) {
            var newArray, oldArray;
            newArray = instance[propName];
            oldArray = ChangeManager.getQueuedChanges({
              id: id,
              propName: propName
            });
            if (oldArray == null) {
              if (oldArray == null) {
                oldArray = _.clone(newArray);
              }
              Object.defineProperty(oldArray, '_arrayId', {
                configurable: true,
                value: newArray._arrayId
              });
            }
            if (oldArray._arrayId === newArray._arrayId) {
              oldArray[i] = oldVal;
              return ChangeManager.queueChanges({
                id: id,
                propName: propName,
                oldVal: oldArray,
                newVal: newArray,
                equals: type.equals,
                force: true
              }, fireWatchers);
            }
          }, {
            internal: true
          }) : void 0);
        });
      }
    };
    fireWatchers = function(queuedChanges, target) {
      var e, getPrevVal, i, j, len, newVals, oldVals, propName, ref, results, shouldFire, triggeringProperties, watcher;
      if (target == null) {
        target = 'external';
      }
      triggeringProperties = _.keys(queuedChanges);
      getPrevVal = function(propName) {
        if (_.has(queuedChanges, propName)) {
          return queuedChanges[propName];
        } else {
          return instance[propName];
        }
      };
      i = 0;
      results = [];
      while ((watcher = watchers[target][i])) {
        i++;
        shouldFire = watcher.first || (_.intersection(triggeringProperties, watcher.properties).length > 0);
        watcher.first = false;
        if (shouldFire) {
          newVals = {};
          oldVals = {};
          ref = watcher.properties;
          for (j = 0, len = ref.length; j < len; j++) {
            propName = ref[j];
            newVals[propName] = instance[propName];
            oldVals[propName] = getPrevVal(propName);
          }
          if (watcher.properties.length === 1) {
            propName = watcher.properties[0];
            newVals = newVals[propName];
            oldVals = oldVals[propName];
          }
          try {
            results.push(watcher.cb(newVals, oldVals));
          } catch (_error) {
            e = _error;
            results.push(console.error(e.stack || e));
          }
        } else {
          results.push(void 0);
        }
      }
      return results;
    };
    Object.defineProperty(instance, 'watch', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: function(properties, cb, opts) {
        return addWatcher(properties, cb, opts);
      }
    });
    Object.defineProperty(instance, '_validating', {
      configurable: false,
      enumerable: false,
      writable: true,
      value: false
    });
    fn = (function(_this) {
      return function(propName, propConfig) {
        var val;
        Object.defineProperty(instance, propName, {
          configurable: false,
          enumerable: true,
          set: function(val) {
            return set(propName, val);
          },
          get: function() {
            return get(propName);
          }
        });
        if (propConfig["default"] !== void 0) {
          val = _.isFunction(propConfig["default"]) ? propConfig["default"]() : propConfig["default"];
          return instance[propName] = val;
        }
      };
    })(this);
    for (propName in normalizedSchema) {
      propConfig = normalizedSchema[propName];
      fn(propName, propConfig);
    }
    if (seal) {
      Object.seal(instance);
    }
    for (propName in initialState) {
      val = initialState[propName];
      instance[propName] = val;
    }
    return _initializing = false;
  };

  return InstanceFactory;

})();

module.exports = new InstanceFactory();



},{"./ChangeManager":1,"./Types":7}],4:[function(require,module,exports){
var InstanceFactory, ModelFactory, Registry, Types, _,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  slice = [].slice;

_ = (window._);

Types = require('./Types');

InstanceFactory = require('./InstanceFactory');

Registry = require('./Registry');

ModelFactory = (function() {
  ModelFactory.prototype.DEFAULT_OPTIONS = {
    seal: false,
    strict: false
  };

  function ModelFactory() {
    this.create = bind(this.create, this);
    this.nameFunction = bind(this.nameFunction, this);
    this.normalizePropertyConfig = bind(this.normalizePropertyConfig, this);
    this.generateName = bind(this.generateName, this);
    this.nameCounter = 0;
  }

  ModelFactory.prototype.generateName = function() {
    return "SchemingModel" + (this.nameCounter++);
  };


  /*
    Normalizes a field declaration on a schema to capture type, default value, setter, getter, and validation.
    Used internally when a schema is created to build a normalized schema definition.
   */

  ModelFactory.prototype.normalizePropertyConfig = function(propConfig, propName) {
    var definition, fn, getter, j, len, required, setter, type, validate;
    if (propName == null) {
      propName = 'field';
    }
    definition = {
      type: null,
      "default": null,
      getter: null,
      setter: null,
      validate: null,
      required: false
    };
    if (!(_.isPlainObject(propConfig) && (propConfig.type != null))) {
      propConfig = {
        type: propConfig
      };
    }
    type = propConfig.type, getter = propConfig.getter, setter = propConfig.setter, validate = propConfig.validate, required = propConfig.required;
    if (type == null) {
      throw new Error("Error resolving " + propName + ". Schema type must be defined.");
    }
    if ((getter != null) && !_.isFunction(getter)) {
      throw new Error("Error resolving " + propName + ". Schema getter must be a function.");
    }
    if ((setter != null) && !_.isFunction(setter)) {
      throw new Error("Error resolving " + propName + ". Schema setter must be a function.");
    }
    if (validate == null) {
      validate = [];
    }
    if (!_.isArray(validate)) {
      validate = [validate];
    }
    for (j = 0, len = validate.length; j < len; j++) {
      fn = validate[j];
      if (!_.isFunction(fn)) {
        throw new Error("Error resolving " + propName + ". Schema validate must be a function or array of functions.");
      }
    }
    definition.type = Types.resolveType(type);
    if (definition.type == null) {
      throw new Error("Error resolving " + propName + ". Unrecognized type " + type);
    }
    definition["default"] = propConfig["default"];
    definition.getter = getter;
    definition.setter = setter;
    definition.validate = validate;
    definition.required = required;
    definition = _.extend({}, propConfig, definition);
    return definition;
  };

  ModelFactory.prototype.nameFunction = function(name, fn) {
    var err, fnStr, renamed;
    fnStr = "return function " + name + "(){return fn.apply(this, arguments)}";
    try {
      renamed = new Function('fn', fnStr)(fn);
    } catch (_error) {
      err = _error;
      throw new Error(name + " is not a valid function name.");
    }
    _.extend(renamed, fn);
    _.extend(renamed.prototype, fn.prototype);
    return renamed;
  };

  ModelFactory.prototype.create = function() {
    var Model, args, factory, name, normalizedSchema, opts, schemaConfig;
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    factory = this;
    if (!_.isString(args[0])) {
      args.unshift(this.generateName());
    }
    name = args[0], schemaConfig = args[1], opts = args[2];
    opts = _.defaults(opts || {}, this.DEFAULT_OPTIONS);
    normalizedSchema = {};
    Model = (function() {
      Model.__schemaId = name;

      Model.defineProperty = function(propName, propConfig) {
        if (!_.isString(propName)) {
          throw new Error("First argument: property name must be a string.");
        }
        if (propConfig == null) {
          throw new Error("Second argument: property configuration is required.");
        }
        return normalizedSchema[propName] = factory.normalizePropertyConfig(propConfig, propName);
      };

      Model.defineProperties = function(config) {
        var k, results, v;
        if (!_.isPlainObject(config)) {
          throw new Error("First argument: properties must be an object.");
        }
        results = [];
        for (k in config) {
          v = config[k];
          results.push(this.defineProperty(k, v));
        }
        return results;
      };

      Model.getProperties = function() {
        return _.cloneDeep(normalizedSchema);
      };

      Model.getProperty = function(propName) {
        return _.cloneDeep(normalizedSchema[propName]);
      };

      Model.eachProperty = function(cb) {
        var propConfig, propName, results;
        if (!_.isFunction(cb)) {
          throw new Error("First argument: callback must be a function.");
        }
        results = [];
        for (propName in normalizedSchema) {
          propConfig = normalizedSchema[propName];
          results.push(cb(propName, _.cloneDeep(propConfig)));
        }
        return results;
      };

      Model.validate = function(instance) {
        var childErrors, e, err, errors, i, j, k, key, l, len, len1, member, pushError, required, requiredMessage, type, v, val, validate, validator, value;
        errors = {};
        if (instance._validating) {
          return null;
        }
        instance._validating = true;
        pushError = function(key, error) {
          var err, j, len;
          if (_.isArray(error)) {
            for (j = 0, len = error.length; j < len; j++) {
              err = error[j];
              return pushError(key, err);
            }
          }
          if (!_.isString(error)) {
            error = 'Validation error occurred.';
          }
          if (errors[key] == null) {
            errors[key] = [];
          }
          return errors[key].push(error);
        };
        for (key in normalizedSchema) {
          value = normalizedSchema[key];
          validate = value.validate, required = value.required;
          val = instance[key];
          if (required && ((val == null) || (_.isString(val) && val.trim().length === 0))) {
            requiredMessage = _.isString(required) ? required : "Field is required.";
            pushError(key, requiredMessage);
          }
          if (val != null) {
            type = normalizedSchema[key].type;
            for (j = 0, len = validate.length; j < len; j++) {
              validator = validate[j];
              err = true;
              try {
                err = validator.call(instance, val);
              } catch (_error) {
                e = _error;
                if (e) {
                  err = e.message;
                }
              }
              if (err !== true) {
                pushError(key, err);
              }
            }
            if (type.string === 'schema') {
              childErrors = type.childType.validate.call(instance, val);
              for (k in childErrors) {
                v = childErrors[k];
                pushError(key + "." + k, v);
              }
            }
            if (type.string === 'array' && type.childType.string === 'schema') {
              for (i = l = 0, len1 = val.length; l < len1; i = ++l) {
                member = val[i];
                childErrors = type.childType.childType.validate.call(instance, member);
                for (k in childErrors) {
                  v = childErrors[k];
                  pushError(key + "[" + i + "]." + k, v);
                }
              }
            }
          }
        }
        instance._validating = false;
        if (_.size(errors) === 0) {
          return null;
        } else {
          return errors;
        }
      };

      function Model(initialState) {
        InstanceFactory.create(this, normalizedSchema, initialState, opts);
      }

      return Model;

    })();
    Model = this.nameFunction(name, Model);
    if (schemaConfig != null) {
      Model.defineProperties(schemaConfig);
    }
    Registry.register(name, Model);
    return Model;
  };

  return ModelFactory;

})();

module.exports = new ModelFactory();



},{"./InstanceFactory":3,"./Registry":5,"./Types":7}],5:[function(require,module,exports){
var Registry,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Registry = (function() {
  function Registry() {
    this.reset = bind(this.reset, this);
    this.get = bind(this.get, this);
    this.register = bind(this.register, this);
    this.schemas = {};
  }

  Registry.prototype.register = function(name, model) {
    if (this.schemas[name]) {
      throw new Error("Naming conflict encountered. Model " + name + " already exists");
    }
    return this.schemas[name] = model;
  };

  Registry.prototype.get = function(name) {
    return this.schemas[name];
  };

  Registry.prototype.reset = function() {
    return this.schemas = {};
  };

  return Registry;

})();

module.exports = new Registry();



},{}],6:[function(require,module,exports){
var ChangeManager, DEFAULT_OPTIONS, InstanceFactory, ModelFactory, NESTED_TYPES, Registry, Scheming, THROTTLE, TYPES, Types, create, flush, get, normalizePropertyConfig, registerQueueCallback, registerResolveCallback, reset, resolveType, setThrottle, unregisterQueueCallback, unregisterResolveCallback, uuid;

Types = require('./Types');

Registry = require('./Registry');

ChangeManager = require('./ChangeManager');

ModelFactory = require('./ModelFactory');

InstanceFactory = require('./InstanceFactory');

TYPES = Types.TYPES, NESTED_TYPES = Types.NESTED_TYPES, resolveType = Types.resolveType;

THROTTLE = ChangeManager.THROTTLE, setThrottle = ChangeManager.setThrottle, registerQueueCallback = ChangeManager.registerQueueCallback, unregisterQueueCallback = ChangeManager.unregisterQueueCallback, registerResolveCallback = ChangeManager.registerResolveCallback, unregisterResolveCallback = ChangeManager.unregisterResolveCallback, flush = ChangeManager.flush;

DEFAULT_OPTIONS = ModelFactory.DEFAULT_OPTIONS, normalizePropertyConfig = ModelFactory.normalizePropertyConfig, create = ModelFactory.create;

uuid = InstanceFactory.uuid;

get = Registry.get, reset = Registry.reset;

reset = function() {
  Registry.reset();
  return ChangeManager.reset();
};

Scheming = {
  TYPES: TYPES,
  NESTED_TYPES: NESTED_TYPES,
  DEFAULT_OPTIONS: DEFAULT_OPTIONS,
  THROTTLE: THROTTLE,
  uuid: uuid,
  get: get,
  reset: reset,
  resolveType: resolveType,
  normalizePropertyConfig: normalizePropertyConfig,
  setThrottle: setThrottle,
  registerQueueCallback: registerQueueCallback,
  unregisterQueueCallback: unregisterQueueCallback,
  registerResolveCallback: registerResolveCallback,
  unregisterResolveCallback: unregisterResolveCallback,
  flush: flush,
  create: create
};

module.exports = Scheming;



},{"./ChangeManager":1,"./InstanceFactory":3,"./ModelFactory":4,"./Registry":5,"./Types":7}],7:[function(require,module,exports){
var Types, _,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

_ = (window._);

Types = (function() {
  function Types() {
    this.resolveType = bind(this.resolveType, this);
    this.resolveSchemaType = bind(this.resolveSchemaType, this);
    this.getPrimitiveTypeOf = bind(this.getPrimitiveTypeOf, this);
  }


  /*
    Scheming exports the default types that it uses for parsing schemas. You can extend with custom types, or
    override the identifier / parser functions of the default types. A custom type should provide:
     - ctor (optional) - Used in schema definitions to declare a type. `Scheming.create name : String`
     - string - Used in schema definitions to declare a type. `Scheming.create name : 'string'`
     - identifier - Function, returns true or false. Determines whether a value needs to be parsed.
     - parser - Function, parses a value into the type.
   */

  Types.prototype.TYPES = {
    String: {
      ctor: String,
      string: 'string',
      identifier: _.isString,
      parser: function(val) {
        return '' + val;
      },
      equals: function(a, b) {
        return a === b;
      }
    },
    Number: {
      ctor: Number,
      string: 'number',
      identifier: _.isNumber,
      parser: parseFloat,
      comparator: function(a, b) {
        return a === b;
      },
      equals: function(a, b) {
        return a === b;
      }
    },
    Integer: {
      string: 'integer',
      identifier: function(val) {
        return _.isNumber(val) && val % 1 === 0;
      },
      parser: parseInt,
      equals: function(a, b) {
        return a === b;
      }
    },
    Date: {
      ctor: Date,
      string: 'date',
      identifier: _.isDate,
      parser: function(val) {
        return new Date(val);
      },
      equals: function(a, b) {
        return (a != null ? a.valueOf() : void 0) === (b != null ? b.valueOf() : void 0);
      }
    },
    Boolean: {
      ctor: Boolean,
      string: 'boolean',
      identifier: _.isBoolean,
      parser: function(val) {
        return !!val;
      },
      equals: function(a, b) {
        return a === b;
      }
    },
    Mixed: {
      ctor: function(val) {
        return val;
      },
      string: '*',
      identifier: function() {
        return true;
      },
      parser: _.identity,
      equals: function(a, b) {
        return a === b;
      }
    }
  };


  /*
    Special type definitions for nested types. Used to identify and parse nested Arrays and Schemas.
    Should not be extended or overridden.
   */

  Types.prototype.NESTED_TYPES = {
    Array: {
      ctor: Array,
      string: 'array',
      identifier: _.isArray,
      parser: _.toArray,
      childType: null,
      childParser: null,
      equals: function(a, b) {
        return _.isEqual(a, b);
      }
    },
    Schema: {
      ctor: Object,
      string: 'schema',
      identifier: null,
      parser: null,
      childType: null,
      equals: function(a, b) {
        return a === b;
      }
    }
  };

  Types.prototype.getPrimitiveTypeOf = function(type) {
    var TYPE, k, ref;
    ref = this.TYPES;
    for (k in ref) {
      TYPE = ref[k];
      if (type === TYPE || (TYPE.ctor && type === TYPE.ctor) || (type != null ? typeof type.toLowerCase === "function" ? type.toLowerCase() : void 0 : void 0) === TYPE.string) {
        return TYPE;
      }
    }
    return null;
  };

  Types.prototype.resolveSchemaType = function(type, childType) {
    type.childType = childType;
    type.identifier = function(val) {
      return val instanceof childType;
    };
    return type.parser = function(val) {
      return new childType(val);
    };
  };

  Types.prototype.resolveType = function(typeDef) {
    var childType, fn, fn1, i, len, ref, type;
    type = this.getPrimitiveTypeOf(typeDef);
    if (type == null) {
      if (_.isArray(typeDef)) {
        type = _.cloneDeep(this.NESTED_TYPES.Array);
        if (typeDef.length) {
          childType = this.resolveType(typeDef[0]);
        }
        if (!childType) {
          throw new Error("Error resolving type of array value " + typeDef);
        }
        type.childType = childType;
        type.childParser = function(val) {
          var index, member;
          for (index in val) {
            member = val[index];
            if (!childType.identifier(member)) {
              val[index] = childType.parser(member);
            }
          }
          return val;
        };

        /*
        - If the type definition is an object `{}`
          - Create a new Schema from the object
          - Treat the field as a nested Schema
          - Set identifier and parser functions immediately
         */
      } else if (_.isPlainObject(typeDef)) {
        type = _.cloneDeep(this.NESTED_TYPES.Schema);
        childType = require('./ModelFactory').create(typeDef);
        this.resolveSchemaType(type, childType);

        /*
        - If the type definition is a reference to a Schema constructor
          - Treat the field as a nested Schema
          - Set identifier and parser functions immediately
         */
      } else if (_.isFunction(typeDef) && typeDef.__schemaId) {
        type = _.cloneDeep(this.NESTED_TYPES.Schema);
        childType = typeDef;
        this.resolveSchemaType(type, childType);

        /*
        - If the type definition is a string that begins with Schema:, such as `'Schema:Car'`
          - It is assumed that the field is a reference to a nested Schema that will be registered with the name Car,
        but may not be registered yet
          - The Schema is not resolved immediately
          - The parser and identifier functions are written as wrappers, so that the first time they are invoked the Schema
        will be looked up at that time via `Scheming.get`, and real identifier and parser are set at that time.
          - If the registered Schema cannot be resolved, throw an error.
         */
      } else if (_.isString(typeDef) && typeDef.slice(0, 7) === 'Schema:') {
        type = _.cloneDeep(this.NESTED_TYPES.Schema);
        childType = typeDef.slice(7);
        ref = ['identifier', 'parser'];
        fn1 = (function(_this) {
          return function(fn) {
            return type[fn] = function(val) {
              childType = require('./Registry').get(childType);
              if (!childType) {
                throw new Error("Error resolving " + typeDef + " on lazy initialization");
              }
              _this.resolveSchemaType(type, childType);
              return type[fn](val);
            };
          };
        })(this);
        for (i = 0, len = ref.length; i < len; i++) {
          fn = ref[i];
          fn1(fn);
        }
      }
    }
    return type || null;
  };

  return Types;

})();

module.exports = new Types();



},{"./ModelFactory":4,"./Registry":5}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9na2xpbnNpbmcvQ29kZS9UaGlyZCBQYXJ0eSBSZXBvcy9zY2hlbWluZy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZ2tsaW5zaW5nL0NvZGUvVGhpcmQgUGFydHkgUmVwb3Mvc2NoZW1pbmcvc3JjL0NoYW5nZU1hbmFnZXIuY29mZmVlIiwiL1VzZXJzL2drbGluc2luZy9Db2RlL1RoaXJkIFBhcnR5IFJlcG9zL3NjaGVtaW5nL3NyYy9FeHBvcnRCcm93c2VyLmNvZmZlZSIsIi9Vc2Vycy9na2xpbnNpbmcvQ29kZS9UaGlyZCBQYXJ0eSBSZXBvcy9zY2hlbWluZy9zcmMvSW5zdGFuY2VGYWN0b3J5LmNvZmZlZSIsIi9Vc2Vycy9na2xpbnNpbmcvQ29kZS9UaGlyZCBQYXJ0eSBSZXBvcy9zY2hlbWluZy9zcmMvTW9kZWxGYWN0b3J5LmNvZmZlZSIsIi9Vc2Vycy9na2xpbnNpbmcvQ29kZS9UaGlyZCBQYXJ0eSBSZXBvcy9zY2hlbWluZy9zcmMvUmVnaXN0cnkuY29mZmVlIiwiL1VzZXJzL2drbGluc2luZy9Db2RlL1RoaXJkIFBhcnR5IFJlcG9zL3NjaGVtaW5nL3NyYy9TY2hlbWluZy5jb2ZmZWUiLCIvVXNlcnMvZ2tsaW5zaW5nL0NvZGUvVGhpcmQgUGFydHkgUmVwb3Mvc2NoZW1pbmcvc3JjL1R5cGVzLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLElBQUEsZ0JBQUE7RUFBQTs7QUFBQSxDQUFBLEdBQUksT0FBQSxDQUFRLFFBQVI7O0FBSUU7MEJBQ0osUUFBQSxHQUNFO0lBQUEsT0FBQSxFQUFVLFNBQVY7SUFDQSxTQUFBLEVBQVksV0FEWjtJQUVBLGVBQUEsRUFBa0IsZ0JBRmxCOzs7MEJBS0YsZUFBQSxHQUFrQjs7RUFFSix1QkFBQTs7Ozs7Ozs7Ozs7O0lBQ1osSUFBQyxD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QUNFLHNCQUFVLElBQUEsS0FBQSxDQUFNLGtCQUFBLEdBQW1CLE9BQW5CLEdBQTJCLHlCQUFqQyxFQURaOztjQUVBLEtBQUMsQ0FBQSxpQkFBRCxDQUFtQixJQUFuQixFQUF5QixTQUF6QjtBQUVBLHFCQUFPLElBQUssQ0FBQSxFQUFBLENBQUwsQ0FBUyxHQUFUO1lBTkU7VUFEVjtRQUFBLENBQUEsQ0FBQSxDQUFBLElBQUE7QUFETCxhQUFBLHFDQUFBOztjQUNNO0FBRE4sU0FIRztPQXBEUDs7QUFrRUEsV0FBTyxJQUFBLElBQVE7RUF0RUg7Ozs7OztBQXdFaEIsTUFBTSxDQUFDLE9BQVAsR0FBcUIsSUFBQSxLQUFBLENBQUEiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXyA9IHJlcXVpcmUgJ2xvZGFzaCdcblxuIyAjIyMgQ2hhbmdlIE1hbmFnZXJcbiMgSW50ZXJuYWwgQ2hhbmdlIE1hbmFnZXIgY2xhc3MsIHJlc3BvbnNpYmxlIGZvciBxdWV1ZWluZyBhbmQgcmVzb2x2aW5nIGNoYW5nZSBldmVudCBwcm9wYWdhdGlvbiBmb3Igd2F0Y2hlc1xuY2xhc3MgQ2hhbmdlTWFuYWdlclxuICBUSFJPVFRMRSA6XG4gICAgVElNRU9VVCA6ICd0aW1lb3V0J1xuICAgIElNTUVESUFURSA6ICdpbW1lZGlhdGUnXG4gICAgQU5JTUFUSU9OX0ZSQU1FIDogJ2FuaW1hdGlvbkZyYW1lJ1xuXG4gICMgQ29uZmlndXJhdGlvbiBmb3IgbGltaXRpbmcgbnVtYmVyIG9mIGl0ZXJhdGlvbnNcbiAgSVRFUkFUSU9OX0xJTUlUIDogMTAwXG5cbiAgY29uc3RydWN0b3IgOiAtPlxuICAgIEBjaGFuZ2VzID0ge31cbiAgICBAaW50ZXJuYWxDaGFuZ2VRdWV1ZSA9IFtdXG4gICAgQHRpbWVvdXQgPSBudWxsXG5cbiAgICBAcmVjdXJzaW9uQ291bnQgPSAwXG5cbiAgICBAc2V0VGhyb3R0bGUgQFRIUk9UVExFLlRJTUVPVVRcbiAgICBAX2FjdGl2ZUNsZWFyVGltZW91dCA9IG51bGxcbiAgICBAX3F1ZXVlQ2FsbGJhY2sgPSBudWxsXG4gICAgQF9yZXNvbHZlQ2FsbGJhY2sgPSBudWxsXG5cbiAgIyAjIyMgc2V0VGhyb3R0bGVcbiAgIyBTZXRzIHRoZSB0aHJvdHRsaW5nIHN0cmF0ZWd5IHRoYXQgU2NoZW1pbmcgdXNlcyBmb3IgcmVzb2x2aW5nIHF1ZXVlZCBjaGFuZ2VzLlxuICBzZXRUaHJvdHRsZSA6ICh0aHJvdHRsZSkgPT5cbiAgICBpZiAhXy5jb250YWlucyBAVEhST1RUTEUsIHRocm90dGxlXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJUaHJvdHRsZSBvcHRpb24gbXVzdCBiZSBzZXQgdG8gb25lIG9mIHRoZSBzdHJhdGVnaWVzIHNwZWNpZmllZCBvbiBTY2hlbWluZy5USFJPVFRMRVwiXG5cbiAgICBzd2l0Y2ggdGhyb3R0bGVcbiAgICAgIHdoZW4gQFRIUk9UVExFLlRJTUVPVVRcbiAgICAgICAgQHNldFRpbWVvdXQgPSA9PlxuICAgICAgICAgIEB0aW1lb3V0ID89IHNldFRpbWVvdXQgQHJlc29sdmUsIDBcbiAgICAgICAgQGNsZWFyVGltZW91dCA9ID0+XG4gICAgICAgICAgY2xlYXJUaW1lb3V0IEB0aW1lb3V0XG4gICAgICAgICAgQHRpbWVvdXQgPSBudWxsXG5cbiAgICAgIHdoZW4gQFRIUk9UVExFLklNTUVESUFURVxuICAgICAgICBpZiBzZXRJbW1lZGlhdGU/ICYmIGNsZWFySW1tZWRpYXRlP1xuICAgICAgICAgIEBzZXRUaW1lb3V0ID0gPT5cbiAgICAgICAgICAgIEB0aW1lb3V0ID89IHNldEltbWVkaWF0ZSBAcmVzb2x2ZVxuICAgICAgICAgIEBjbGVhclRpbWVvdXQgPSA9PlxuICAgICAgICAgICAgY2xlYXJJbW1lZGlhdGUgQHRpbWVvdXRcbiAgICAgICAgICAgIEB0aW1lb3V0ID0gbnVsbFxuICAgICAgICBlbHNlXG4gICAgICAgICAgY29uc29sZS53YXJuIFwiQ2Fubm90IHVzZSBzdHJhdGVneSBJTU1FRElBVEU6IGBzZXRJbW1lZGlhdGVgIG9yIGBjbGVhckltbWVkaWF0ZWAgYXJlIG5vdCBhdmFpbGFibGUgaW4gdGhlIGN1cnJlbnQgZW52aXJvbm1lbnQuXCJcbiAgICAgICAgICBAc2V0VGhyb3R0bGUgQFRIUk9UVExFLlRJTUVPVVRcblxuICAgICAgd2hlbiBAVEhST1RUTEUuQU5JTUFUSU9OX0ZSQU1FXG4gICAgICAgIGlmIHJlcXVlc3RBbmltYXRpb25GcmFtZT8gJiYgY2FuY2VsQW5pbWF0aW9uRnJhbWU/XG4gICAgICAgICAgQHNldFRpbWVvdXQgPSA9PlxuICAgICAgICAgICAgQHRpbWVvdXQgPz0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lIEByZXNvbHZlXG4gICAgICAgICAgQGNsZWFyVGltZW91dCA9ID0+XG4gICAgICAgICAgICBjYW5jZWxBbmltYXRpb25GcmFtZSBAdGltZW91dFxuICAgICAgICAgICAgQHRpbWVvdXQgPSBudWxsXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBjb25zb2xlLndhcm4gXCJDYW5ub3QgdXNlIHN0cmF0ZWd5IEFOSU1BVElPTl9GUkFNRTogYHJlcXVlc3RBbmltYXRpb25GcmFtZWAgb3IgYGNhbmNlbEFuaW1hdGlvbkZyYW1lYCBhcmUgbm90IGF2YWlsYWJsZSBpbiB0aGUgY3VycmVudCBlbnZpcm9ubWVudC5cIlxuICAgICAgICAgIEBzZXRUaHJvdHRsZSBAVEhST1RUTEUuVElNRU9VVFxuXG4gICMgUHVzaCB0aGUgcmVzb2x1dGlvbiBzdGVwIG9udG8gdGhlIGV2ZW50IHF1ZXVlLCBvbmNlIHRoZSB0aHJlYWQgaGFzIGJlZW4gcmVsZWFzZWQgZnJvbVxuICAjIGEgc3luY2hyb25vdXMgYmxvY2sgb2YgY2hhbmdlc1xuICBzZXRUaW1lb3V0IDogLT5cbiAgICB0aHJvdyBuZXcgRXJyb3IgXCJBIHRocm90dGxlIHN0cmF0ZWd5IG11c3QgYmUgc2V0LlwiXG5cbiAgIyBjbGVhciB0aW1lb3V0IHRvIGd1YXJhbnRlZSByZXNvbHZlIGlzIG5vdCBjYWxsZWQgbW9yZSB0aGFuIG9uY2UuXG4gIGNsZWFyVGltZW91dCAtPlxuICAgIHRocm93IG5ldyBFcnJvciBcIkEgdGhyb3R0bGUgc3RyYXRlZ3kgbXVzdCBiZSBzZXQuXCJcblxuICAjICMjIyByZWdpc3RlclF1ZXVlQ2FsbGJhY2tcbiAgIyByZWdpc3RlcnMgYSBjYWxsYmFjayB3aGVuIHRoZSBmaXJzdCBTY2hlbWluZyBjaGFuZ2UgaXMgcXVldWVkIHdpdGggdGhlIGNoYW5nZSBtYW5hZ2VyLiBUaGlzIGlzIHVzZWZ1bCBmb3IgdGVzdHNcbiAgcmVnaXN0ZXJRdWV1ZUNhbGxiYWNrIDogKGNhbGxiYWNrKSA9PlxuICAgIGlmICFfLmlzRnVuY3Rpb24gY2FsbGJhY2tcbiAgICAgIHRocm93IG5ldyBFcnJvciBcIkNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiXG4gICAgQF9xdWV1ZUNhbGxiYWNrID0gY2FsbGJhY2tcblxuICAjICMjIyB1bnJlZ2lzdGVyUXVldWVDYWxsYmFja1xuICAjIHVucmVnaXN0ZXJzIGEgY2FsbGJhY2sgd2hlbiB0aGUgZmlyc3QgU2NoZW1pbmcgY2hhbmdlIGlzIHF1ZXVlZCB3aXRoIHRoZSBjaGFuZ2UgbWFuYWdlci5cbiAgdW5yZWdpc3RlclF1ZXVlQ2FsbGJhY2sgOiA9PlxuICAgIEBfcXVldWVDYWxsYmFjayA9IG51bGxcblxuICAjICMjIyByZWdpc3RlclJlc29sdmVDYWxsYmFja1xuICAjIHJlZ2lzdGVycyBhIGNhbGxiYWNrIHdoZW4gdGhlIGNoYW5nZSBtYW5hZ2VyIGlzIGZpbmlzaGVkIHJlc29sdmluZyBjaGFuZ2VzXG4gIHJlZ2lzdGVyUmVzb2x2ZUNhbGxiYWNrIDogKGNhbGxiYWNrKSA9PlxuICAgIGlmICFfLmlzRnVuY3Rpb24gY2FsbGJhY2tcbiAgICAgIHRocm93IG5ldyBFcnJvciBcIkNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiXG4gICAgQF9yZXNvbHZlQ2FsbGJhY2sgPSBjYWxsYmFja1xuXG4gICMgIyMjIHVucmVnaXN0ZXJSZXNvbHZlQ2FsbGJhY2tcbiAgIyB1bnJlZ2lzdGVycyBhIGNhbGxiYWNrIHdoZW4gdGhlIGNoYW5nZSBtYW5hZ2VyIGlzIGZpbmlzaGVkIHJlc29sdmluZyBjaGFuZ2VzXG4gIHVucmVnaXN0ZXJSZXNvbHZlQ2FsbGJhY2sgOiA9PlxuICAgIEBfcmVzb2x2ZUNhbGxiYWNrID0gbnVsbFxuICAgICMgcmVzZXQgdGhlIHRoZSBjaGFuZ2UgbWFuYWdlciB0byBhIHByaXN0aW5lIHN0YXRlXG5cbiAgY2xlYW51cEN5Y2xlIDogPT5cbiAgICBAY2hhbmdlcyA9IHt9XG4gICAgQGludGVybmFsQ2hhbmdlUXVldWUgPSBbXVxuICAgIEBfYWN0aXZlQ2xlYXJUaW1lb3V0PygpXG4gICAgQHJlY3Vyc2lvbkNvdW50ID0gMFxuXG4gIHJlc2V0IDogPT5cbiAgICBAY2hhbmdlcyA9IHt9XG4gICAgQGludGVybmFsQ2hhbmdlUXVldWUgPSBbXVxuICAgIEBfYWN0aXZlQ2xlYXJUaW1lb3V0PygpXG4gICAgQHRpbWVvdXQgPSBudWxsXG5cbiAgICBAcmVjdXJzaW9uQ291bnQgPSAwXG5cbiAgICBAc2V0VGhyb3R0bGUgQFRIUk9UVExFLlRJTUVPVVRcbiAgICBAX3F1ZXVlQ2FsbGJhY2sgPSBudWxsXG4gICAgQF9yZXNvbHZlQ2FsbGJhY2sgPSBudWxsXG5cbiAgIyBSZWdpc3RlcnMgY2hhbmdlcyB0aGF0IGhhdmUgb2NjdXJyZWQgb24gYW4gaW5zdGFuY2UgYnkgaW5zdGFuY2UgaWQsIGhvbGRpbmcgYSByZWZlcmVuY2UgdG8gdGhlIG9yaWdpbmFsIHZhbHVlXG4gIHF1ZXVlQ2hhbmdlcyA6ICh7aWQsIHByb3BOYW1lLCBvbGRWYWwsIG5ld1ZhbCwgZXF1YWxzLCBmb3JjZX0sIGZpcmVXYXRjaGVycykgPT5cbiAgICAjIGlmIHRoZXJlIGFyZSBubyBjaGFuZ2VzIHlldCBxdWV1ZWQgZm9yIHRoZSBpbnN0YW5jZSwgYWRkIHRvIHRoZSBjaGFuZ2VzIGhhc2ggYnkgaWRcbiAgICBpZiAhXy5oYXMgQGNoYW5nZXMsIGlkXG4gICAgICBAY2hhbmdlc1tpZF0gPz0ge2NoYW5nZWRQcm9wcyA6IHt9LCBmaXJlV2F0Y2hlcnN9XG4gICAgICBAaW50ZXJuYWxDaGFuZ2VRdWV1ZS5wdXNoIGlkXG4gICAge2NoYW5nZWRQcm9wc30gPSBAY2hhbmdlc1tpZF1cblxuICAgIGlmIHByb3BOYW1lXG4gICAgICAjIGlmIHdlIGFyZSBhbHJlYWR5IHRyYWNraW5nIHRoaXMgcHJvcGVydHksIGFuZCBpdCBoYXMgYmVlbiByZXNldCB0byBpdHMgb3JpZ2luYWwgdmFsdWUsIGNsZWFyIGl0IGZyb20gY2hhbmdlc1xuICAgICAgaWYgXy5oYXMoY2hhbmdlZFByb3BzLCBwcm9wTmFtZSkgJiYgZXF1YWxzKGNoYW5nZWRQcm9wc1twcm9wTmFtZV0sIG5ld1ZhbClcbiAgICAgICAgZGVsZXRlIGNoYW5nZWRQcm9wc1twcm9wTmFtZV1cbiAgICAgICAgIyBpZiB3ZSBhcmUgbm90IHRyYWNraW5nIHRoaXMgcHJvcGVydHkgYW5kIGl0IGlzIGJlaW5nIGNoYW5nZWQsIG9yIGlmIGZvcmNlIGlzIGZsYWdnZWQgdHJ1ZSwgYWRkIGl0IHRvIGNoYW5nZXNcbiAgICAgIGVsc2UgaWYgZm9yY2UgfHwgKCFfLmhhcyhjaGFuZ2VkUHJvcHMsIHByb3BOYW1lKSAmJiAhZXF1YWxzKG9sZFZhbCwgbmV3VmFsKSlcbiAgICAgICAgY2hhbmdlZFByb3BzW3Byb3BOYW1lXSA9IG9sZFZhbFxuXG4gICAgIyBDYWxsIHRoZSBxdWV1ZSBjYWxsYmFjayBpZiBhIHRpbWVvdXQgaGFzbid0IGJlZW4gZGVmaW5lZCB5ZXRcbiAgICBpZiAhQHRpbWVvdXQ/XG4gICAgICBAX3F1ZXVlQ2FsbGJhY2s/KClcbiAgICAgIEBzZXRUaW1lb3V0KClcbiAgICAgIEBfYWN0aXZlQ2xlYXJUaW1lb3V0ID0gQGNsZWFyVGltZW91dFxuXG4gICMgZ2V0cyB0aGUgcHJldmlvdXMgc3RhdGUgb2YgYSBxdWV1ZWQgY2hhbmdlXG4gIGdldFF1ZXVlZENoYW5nZXMgOiAoe2lkLCBwcm9wTmFtZX0pID0+XG4gICAgcmV0dXJuIEBjaGFuZ2VzW2lkXT8uY2hhbmdlZFByb3BzW3Byb3BOYW1lXVxuXG4gICMgU3luY2hyb25vdXNseSBjYXVzZSB0aGUgY2hhbmdlIG1hbmFnZXIgcmVzb2x2ZS4gTWF5IGJlIHVzZWQgZm9yIHRlc3RpbmcgdG8gYXZvaWQgYXN5bmNocm9ub3VzIHRlc3RzLFxuICAjIG9yIG1heSBiZSB1c2VkIHRvIGZvcmNlIGNoYW5nZSByZXNvbHV0aW9uIHdpdGhpbiBjbGllbnQgY29kZS5cbiAgZmx1c2ggOiA9PlxuICAgIEByZXNvbHZlKClcblxuICAjIHJlc29sdmVzIHF1ZXVlZCBjaGFuZ2VzLCBmaXJpbmcgd2F0Y2hlcnMgb24gaW5zdGFuY2VzIHRoYXQgaGF2ZSBjaGFuZ2VkXG4gIHJlc29sdmUgOiA9PlxuICAgIEByZWN1cnNpb25Db3VudCsrXG4gICAgIyB0cmFjayBpdGVyYXRpb24gY291bnQgYW5kIHRocm93IGFuIGVycm9yIGFmdGVyIHNvbWUgbGltaXQgdG8gcHJldmVudCBpbmZpbml0ZSBsb29wc1xuICAgIGlmIEBJVEVSQVRJT05fTElNSVQgPiAwICYmIEByZWN1cnNpb25Db3VudCA+IEBJVEVSQVRJT05fTElNSVRcbiAgICAgIGNoYW5nZXMgPSBAY2hhbmdlc1xuICAgICAgQGNsZWFudXBDeWNsZSgpXG4gICAgICAjIFRPRE86IHRyeSB0byBtYWtlIGEgbW9yZSBtZWFuaW5nZnVsIGVycm9yIG1lc3NhZ2UgZnJvbSB0aGUgaW5zdGFuY2VzIChzY2hlbWEgdHlwZSwgcHJvcGVydGllcywgZXRjKVxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwiXCJcIkFib3J0aW5nIGNoYW5nZSBwcm9wYWdhdGlvbiBhZnRlciAje0BJVEVSQVRJT05fTElNSVR9IGN5Y2xlcy5cbiAgICAgICAgVGhpcyBpcyBwcm9iYWJseSBpbmRpY2F0aXZlIG9mIGEgY2lyY3VsYXIgd2F0Y2guIENoZWNrIHRoZSBmb2xsb3dpbmcgd2F0Y2hlcyBmb3IgY2x1ZXM6XG4gICAgICAgICN7SlNPTi5zdHJpbmdpZnkoY2hhbmdlcyl9XCJcIlwiXG5cbiAgICAjIEEgc2luZ2xlIGlkIG1heSBoYXZlIGJlZW4gcHVzaGVkIHRvIHRoZSBjaGFuZ2UgcXVldWUgbWFueSB0aW1lcywgdG8gdGFrZSBhIHVuaXF1ZSBsaXN0IG9mIGlkcy5cbiAgICBpbnRlcm5hbENoYW5nZXMgPSBfLnVuaXF1ZSBAaW50ZXJuYWxDaGFuZ2VRdWV1ZVxuICAgICMgSW1tZWRpYXRlbHkgcmVzZXQgdGhlIHN0YXRlIG9mIHRoZSBjaGFuZ2UgcXVldWVcbiAgICBAaW50ZXJuYWxDaGFuZ2VRdWV1ZSA9IFtdXG5cbiAgICAjIEZpcmUgaW50ZXJuYWwgd2F0Y2hlcnMgb24gYWxsIGluc3RhbmNlcyB0aGF0IGhhdmUgY2hhbmdlZC4gVGhpcyB3aWxsIGNhdXNlIHRoZSBjaGFuZ2UgZXZlbnQgdG8gcHJvcGFnYXRlIHRvXG4gICAgIyBhbnkgcGFyZW50IHNjaGVtYXMsIHdob3NlIGNoYW5nZXMgd2lsbCBwb3B1bGF0ZSBgQGludGVybmFsQ2hhbmdlUXVldWVgXG4gICAgZm9yIGlkIGluIGludGVybmFsQ2hhbmdlc1xuICAgICAge2NoYW5nZWRQcm9wcywgZmlyZVdhdGNoZXJzfSA9IEBjaGFuZ2VzW2lkXVxuICAgICAgZmlyZVdhdGNoZXJzIGNoYW5nZWRQcm9wcywgJ2ludGVybmFsJ1xuICAgICAgIyBpZiBhbnkgbmV3IGludGVybmFsIGNoYW5nZXMgd2VyZSByZWdpc3RlcmVkLCByZWN1cnNpdmVseSBjYWxsIHJlc29sdmUgdG8gY29udGludWUgcHJvcGFnYXRpb25cbiAgICBpZiBAaW50ZXJuYWxDaGFuZ2VRdWV1ZS5sZW5ndGhcbiAgICAgIHJldHVybiBAcmVzb2x2ZSgpXG5cbiAgICAjIE9uY2UgaW50ZXJuYWwgd2F0Y2hlcyBoYXZlIGZpcmVkIHdpdGhvdXQgY2F1c2luZyBhIGNoYW5nZSBvbiBhIHBhcmVudCBzY2hlbWEgaW5zdGFuY2UsIHRoZXJlIGFyZSBubyBtb3JlIGNoYW5nZXNcbiAgICAjIHRvIHByb3BhZ2F0ZS4gQXQgdGhpcyBwb2ludCBhbGwgY2hhbmdlcyBvbiBlYWNoIGluc3RhbmNlIGhhdmUgYmVlbiBhZ2dyZWdhdGVkIGludG8gYSBzaW5nbGUgY2hhbmdlIHNldC4gTm93XG4gICAgIyBmaXJlIGFsbCBleHRlcm5hbCB3YXRjaGVycyBvbiBlYWNoIGluc3RhbmNlLlxuICAgIGNoYW5nZXMgPSBAY2hhbmdlc1xuICAgICMgSW1tZWRpYXRlbHkgcmVzZXQgdGhlIGNoYW5nZSBzZXRcbiAgICBAY2hhbmdlcyA9IHt9XG5cbiAgICAjIEZpcmUgYWxsIGV4dGVybmFsIHdhdGNoZXJzXG4gICAgZm9yIGlkIG9mIGNoYW5nZXNcbiAgICAgIHtjaGFuZ2VkUHJvcHMsIGZpcmVXYXRjaGVyc30gPSBjaGFuZ2VzW2lkXVxuICAgICAgZmlyZVdhdGNoZXJzIGNoYW5nZWRQcm9wcywgJ2V4dGVybmFsJ1xuXG4gICAgICAjIElmIGFueSBleHRlcm5hbCB3YXRjaGVzIGNhdXNlZCBuZXcgY2hhbmdlcyB0byBiZSBxdWV1ZWQsIHJlLXJ1biByZXNvbHZlIHRvIGVuc3VyZSBwcm9wYWdhdGlvblxuICAgIGlmIF8uc2l6ZShAY2hhbmdlcykgPiAwXG4gICAgICByZXR1cm4gQHJlc29sdmUoKVxuXG4gICAgIyBJZiB3ZSBnZXQgaGVyZSwgYWxsIGNoYW5nZXMgaGF2ZSBiZWVuIGZ1bGx5IHByb3BhZ2F0ZWQuIFJlc2V0IGNoYW5nZSBtYW5hZ2VyIHN0YXRlIHRvIHByaXN0aW5lIGp1c3QgZm9yIGV4cGxpY2l0bmVzc1xuICAgIEBfcmVzb2x2ZUNhbGxiYWNrPygpXG4gICAgQGNsZWFudXBDeWNsZSgpXG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IENoYW5nZU1hbmFnZXIoKSIsIl8gPSB3aW5kb3cuX1xuXG53aW5kb3cuU2NoZW1pbmcgPSByZXF1aXJlICcuL1NjaGVtaW5nJ1xuIiwiXyA9IHJlcXVpcmUgJ2xvZGFzaCdcblR5cGVzID0gcmVxdWlyZSAnLi9UeXBlcydcbkNoYW5nZU1hbmFnZXIgPSByZXF1aXJlICcuL0NoYW5nZU1hbmFnZXInXG5cblxuXG5cbmNsYXNzIEluc3RhbmNlRmFjdG9yeVxuICAjIEFzIGxpc3RlZCBieSBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheSNNdXRhdG9yX21ldGhvZHNcbiAgQVJSQVlfTVVUQVRPUlMgOiBbJ2NvcHlXaXRoaW4nLCAnZmlsbCcsICdwdXNoJywgJ3BvcCcsICdyZXZlcnNlJywgJ3NoaWZ0JywgJ3NvcnQnLCAnc3BsaWNlJywgJ3Vuc2hpZnQnXVxuXG4gICMgVXVpZCBnZW5lcmF0b3IgZm9yIGFub255bW91cyBTY2hlbWEgaWRzXG4gIHV1aWQgOiA9PlxuICAgIG5vdyA9IERhdGUubm93KClcbiAgICAneHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4Jy5yZXBsYWNlIC9beHldL2csIChjKSAtPlxuICAgICAgciA9IChub3cgKyBNYXRoLnJhbmRvbSgpICogMTYpICUgMTYgfCAwXG4gICAgICBub3cgPSBNYXRoLmZsb29yIG5vdyAvIDE2XG4gICAgICAoKGlmIGMgaXMgXCJ4XCIgdGhlbiByIGVsc2UgKHIgJiAweDMgfCAweDgpKSkudG9TdHJpbmcgMTZcblxuICAjICMjIEluc3RhbmNlXG4gICMgRmFjdG9yeSBtZXRob2QgdGhhdCBidWlsZHMgYSBNb2RlbCBpbnN0YW5jZVxuICBjcmVhdGUgOiAoaW5zdGFuY2UsIG5vcm1hbGl6ZWRTY2hlbWEsIGluaXRpYWxTdGF0ZSwgb3B0cykgPT5cbiAgICAjIGZsYWcgdG8gaW5kaWNhdGUgaW5pdGlhbGl6aW5nIHN0YXRlIG9mIGluc3RhbmNlXG4gICAgX2luaXRpYWxpemluZyA9IHRydWVcbiAgICAjIGRhdGEgaGFzaCB3cmFwcGVkIGluIGNsb3N1cmUsIGtlZXBzIGFjdHVhbCBkYXRhIG1lbWJlcnMgcHJpdmF0ZVxuICAgIGRhdGEgPSB7fVxuICAgICMgcHJpdmF0ZSB3YXRjaGVycyBhcnJheS4gRXh0ZXJuYWwgd2F0Y2hlcyAtIHRob3NlIHNldCBieSBjb25zdW1pbmcgY2xpZW50IGNvZGUgLSBhcmUgdHJhY2tlZCBzZXBhcmF0ZWx5IGZyb21cbiAgICAjIGludGVybmFsIHdhdGNoZXMgLSB0aG9zZSB0byB3YXRjaCBjaGFuZ2UgcHJvcGFnYXRpb24gb24gbmVzdGVkIHNjaGVtYXNcbiAgICB3YXRjaGVycyA9XG4gICAgICBpbnRlcm5hbCA6IFtdXG4gICAgICBleHRlcm5hbCA6IFtdXG4gICAgIyBUaGUgdW53YXRjaCBmdW5jdGlvbnMgZnJvbSBpbnRlcm5hbCB3YXRjaGVzXG4gICAgdW53YXRjaGVycyA9IHt9XG5cbiAgICAjIFNldCBhbiBpZCBvbiBlYWNoIGluc3RhbmNlIHRoYXQgaXMgbm90IGV4cG9zZWQsIGlzIHVzZWQgaW50ZXJuYWxseSBvbmx5IGZvciBjaGFuZ2UgbWFuYWdlbWVudFxuICAgIGlkID0gQHV1aWQoKVxuXG4gICAge3N0cmljdCwgc2VhbH0gPSBvcHRzXG5cbiAgICAjICMjIyBQcm9wZXJ0eSBTZXR0ZXJcbiAgICBzZXQgPSAocHJvcE5hbWUsIHZhbCkgPT5cbiAgICAgIHByZXZWYWwgPSBkYXRhW3Byb3BOYW1lXVxuXG4gICAgICAjIGlmIHRoZSBwcm9wZXJ0eSBpcyBub3QgYSBwYXJ0IG9mIHRoZSBzY2hlbWEsIHNpbXBseSBzZXQgaXQgb24gdGhlIGluc3RhbmNlLlxuICAgICAgIyBpZiB0aGUgc2VhbCBvcHRpb24gaXMgZW5hYmxlZCB0aGlzIHdpbGwgZmFpbCBzaWxlbnRseSwgb3RoZXJ3aXNlIGl0IHdpbGwgYWxsb3cgZm9yIGFyYml0cmFyeSBwcm9wZXJ0aWVzXG4gICAgICBpZiAhbm9ybWFsaXplZFNjaGVtYVtwcm9wTmFtZV1cbiAgICAgICAgcmV0dXJuIGluc3RhbmNlW3Byb3BOYW1lXSA9IHZhbFxuXG4gICAgICAjIHJldHJpZXZlIHRoZSB0eXBlLCBnZXR0ZXIsIGFuZCBzZXR0ZXIgZnJvbSB0aGUgbm9ybWFsaXplZCBmaWVsZCBjb25maWdcbiAgICAgIHt0eXBlLCBzZXR0ZXJ9ID0gbm9ybWFsaXplZFNjaGVtYVtwcm9wTmFtZV1cblxuICAgICAgIyAtIElmIGEgcHJvcGVydHkgaXMgc2V0IHRvIHVuZGVmaW5lZCwgZG8gbm90IHR5cGUgY2FzdCBvciBydW4gdGhyb3VnaCBzZXR0ZXIuXG4gICAgICAjIFlvdSBzaG91bGQgYWx3YXlzIGJlIGFibGUgdG8gY2xlYXIgYSBwcm9wZXJ0eS5cbiAgICAgIGlmIHZhbD9cbiAgICAgICAgIyAtIElmIGEgc2V0dGVyIGlzIGRlZmluZWQsIHJ1biB0aGUgdmFsdWUgdGhyb3VnaCBzZXR0ZXJcbiAgICAgICAgaWYgc2V0dGVyXG4gICAgICAgICAgdmFsID0gc2V0dGVyLmNhbGwgaW5zdGFuY2UsIHZhbFxuICAgICAgICAjIC0gSWYgdmFsdWUgaXMgbm90IHVuZGVmaW5lZCwgcnVuIHRocm91Z2ggdHlwZSBpZGVudGlmaWVyIHRvIGRldGVybWluZSBpZiBpdCBpcyB0aGUgY29ycmVjdCB0eXBlXG4gICAgICAgIGlmICF0eXBlLmlkZW50aWZpZXIodmFsKVxuICAgICAgICAgICMgICAtIElmIG5vdCBhbmQgc3RyaWN0IG1vZGUgaXMgZW5hYmxlZCwgdGhyb3cgYW4gZXJyb3JcbiAgICAgICAgICBpZiBzdHJpY3QgdGhlbiB0aHJvdyBuZXcgRXJyb3IgXCJFcnJvciBhc3NpZ25pbmcgI3t2YWx9IHRvICN7cHJvcE5hbWV9LiBWYWx1ZSBpcyBub3Qgb2YgdHlwZSAje3R5cGUuc3RyaW5nfVwiXG4gICAgICAgICAgIyAgIC0gT3RoZXJ3aXNlLCB1c2UgcGFyc2VyIHRvIGNhc3QgdG8gdGhlIGNvcnJlY3QgdHlwZVxuICAgICAgICAgIHZhbCA9IHR5cGUucGFyc2VyIHZhbFxuICAgICAgICAjIC0gSWYgdGhlIHByb3BlcnR5IHR5cGUgaXMgb2YgYXJyYXksIHBlcmZvcm0gcGFyc2luZyBvbiBjaGlsZCBtZW1iZXJzLlxuICAgICAgICBpZiB0eXBlLnN0cmluZyA9PSBUeXBlcy5ORVNURURfVFlQRVMuQXJyYXkuc3RyaW5nXG4gICAgICAgICAgdmFsID0gdHlwZS5jaGlsZFBhcnNlciB2YWxcbiAgICAgICAgICAjIEFkZCBhIHVuaXF1ZSBhcnJheUlkIHRvIHNjaGVtaW5nIGFycmF5cyB0byBpZGVudGlmeSB0aGUgc291cmNlIG9mIGNoYW5nZXNcbiAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkgdmFsLCAnX2FycmF5SWQnLFxuICAgICAgICAgICAgY29uZmlndXJhYmxlIDogdHJ1ZVxuICAgICAgICAgICAgdmFsdWUgOiBAdXVpZCgpXG4gICAgICAgICAgIyBPdmVyd3JpdGUgbXV0YXRvciBmdW5jdGlvbnMgb24gdGhpcyBhcnJheSBjYXB0dXJlIGFuZCBxdWV1ZSB0aGUgbXV0YXRpb24uIFRoaXMgZ3VhcmFudGVlc1xuICAgICAgICAgICMgdGhhdCBvdGhlcndpc2UgbXV0YXRpbmcgY2hhbmdlcyBhcmUgcnVuIHRocm91Z2ggdGhlIHNldHRlcnMgYW5kIGNoYW5nZXMgYXJlIGNhcHR1cmVkLlxuICAgICAgICAgIF8uZWFjaCBAQVJSQVlfTVVUQVRPUlMsIChtZXRob2QpIC0+XG4gICAgICAgICAgICBpZiBwcmV2VmFsPyAmJiBwcmV2VmFsW21ldGhvZF1cbiAgICAgICAgICAgICAgZGVsZXRlIHByZXZWYWxbbWV0aG9kXVxuXG4gICAgICAgICAgICBpZiBBcnJheS5wcm90b3R5cGVbbWV0aG9kXT9cbiAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5IHZhbCwgbWV0aG9kLFxuICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZSA6IHRydWVcbiAgICAgICAgICAgICAgICB3cml0YWJsZSA6IHRydWVcbiAgICAgICAgICAgICAgICB2YWx1ZSA6IC0+XG4gICAgICAgICAgICAgICAgICBjbG9uZSA9IF8uY2xvbmUgQFxuICAgICAgICAgICAgICAgICAgdG9SZXR1cm4gPSBBcnJheS5wcm90b3R5cGVbbWV0aG9kXS5jYWxsIEAsIGFyZ3VtZW50cy4uLlxuICAgICAgICAgICAgICAgICAgQ2hhbmdlTWFuYWdlci5xdWV1ZUNoYW5nZXMge2lkLCBwcm9wTmFtZSwgb2xkVmFsIDogY2xvbmUsIG5ld1ZhbCA6IHZhbCwgZXF1YWxzIDogdHlwZS5lcXVhbHN9LCBmaXJlV2F0Y2hlcnNcbiAgICAgICAgICAgICAgICAgIGluc3RhbmNlW3Byb3BOYW1lXSA9IEBcbiAgICAgICAgICAgICAgICAgIHJldHVybiB0b1JldHVyblxuXG5cbiAgICAgICMgLSBBc3NpZ24gdG8gdGhlIGRhdGEgaGFzaFxuICAgICAgZGF0YVtwcm9wTmFtZV0gPSB2YWxcbiAgICAgICMgLSBJZiB0aGUgdmFsdWUgYmVpbmcgYXNzaWduZWQgaXMgb2YgdHlwZSBzY2hlbWEsIHdlIG5lZWQgdG8gbGlzdGVuIGZvciBjaGFuZ2VzIHRvIHByb3BhZ2F0ZVxuICAgICAgd2F0Y2hGb3JQcm9wYWdhdGlvbiBwcm9wTmFtZSwgdmFsXG4gICAgICAjIC0gUXVldWUgdXAgYSBjaGFuZ2UgdG8gZmlyZSwgdW5sZXNzIHlvdSBhcmUgc2V0dGluZyB0aGUgaW5pdGlhbCBzdGF0ZSBvZiB0aGUgaW5zdGFuY2VcbiAgICAgIGlmICFfaW5pdGlhbGl6aW5nXG4gICAgICAgIENoYW5nZU1hbmFnZXIucXVldWVDaGFuZ2VzIHtpZCwgcHJvcE5hbWUsIG9sZFZhbCA6IHByZXZWYWwsIG5ld1ZhbCA6IHZhbCwgZXF1YWxzIDogdHlwZS5lcXVhbHN9LCBmaXJlV2F0Y2hlcnNcblxuICAgICMgIyMjIFByb3BlcnR5IEdldHRlclxuICAgIGdldCA9IChwcm9wTmFtZSkgLT5cbiAgICAgICMgcmV0cmlldmUgdGhlIHR5cGUsIGdldHRlciwgYW5kIHNldHRlciBmcm9tIHRoZSBub3JtYWxpemVkIGZpZWxkIGNvbmZpZ1xuICAgICAge2dldHRlcn0gPSBub3JtYWxpemVkU2NoZW1hW3Byb3BOYW1lXVxuXG4gICAgICAjIC0gUmV0cmlldmUgZGF0YSB2YWx1ZSBmcm9tIHRoZSBoYXNoXG4gICAgICB2YWwgPSBkYXRhW3Byb3BOYW1lXVxuICAgICAgIyAtIElmIGdldHRlciBpcyBkZWZpbmVkLCBydW4gdmFsdWUgdGhyb3VnaCBnZXR0ZXJcbiAgICAgIGlmIGdldHRlclxuICAgICAgICB2YWwgPSBnZXR0ZXIuY2FsbCBpbnN0YW5jZSwgdmFsXG4gICAgICAjIC0gRmluYWxseSwgcmV0dXJuIHRoZSB2YWx1ZVxuICAgICAgcmV0dXJuIHZhbFxuXG4gICAgIyBBZGRzIGEgd2F0Y2hlciB0byB0aGUgaW5zdGFuY2VcbiAgICBhZGRXYXRjaGVyID0gKHByb3BlcnRpZXMsIGNiLCBvcHRzKSAtPlxuICAgICAgIyBwcm9wZXJ0aWVzIGFuZCBvcHRzIGFyZ3VtZW50cyBhcmUgb3B0aW9uYWxcbiAgICAgIGlmIF8uaXNGdW5jdGlvbiBwcm9wZXJ0aWVzXG4gICAgICAgIG9wdHMgPSBjYlxuICAgICAgICBjYiA9IHByb3BlcnRpZXNcbiAgICAgICAgIyBpZiBubyBwcm9wZXJ0aWVzIGFyZSBzcGVjaWZpZWQsIHRoZSB3YXRjaGVyIGlzIHJlZ2lzdGVyZWQgdG8gd2F0Y2ggYWxsIHByb3BlcnRpZXMgb2YgdGhlIG9iamVjdFxuICAgICAgICBwcm9wZXJ0aWVzID0gXy5rZXlzIG5vcm1hbGl6ZWRTY2hlbWFcblxuICAgICAgIyB1bmxlc3Mgc3BlY2lmaWVkLCBhIHdhdGNoIGlzIGFzc3VtZWQgdG8gYmUgZXh0ZXJuYWwuIENsaW5ldCBjb2RlIHNob3VsZCBub3Qgc2V0IHdhdGNoZXMgYXMgaW50ZXJuYWwhXG4gICAgICAjIEJlaGF2aW9yIGlzIHVuZGVmaW5lZC5cbiAgICAgIG9wdHMgPz0ge31cbiAgICAgIG9wdHMuaW50ZXJuYWwgPz0gZmFsc2VcblxuICAgICAgdGFyZ2V0ID0gaWYgb3B0cy5pbnRlcm5hbCB0aGVuICdpbnRlcm5hbCcgZWxzZSAnZXh0ZXJuYWwnXG5cbiAgICAgIGlmICFfLmlzRnVuY3Rpb24gY2JcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yICdBIHdhdGNoIG11c3QgYmUgcHJvdmlkZWQgd2l0aCBhIGNhbGxiYWNrIGZ1bmN0aW9uLidcblxuICAgICAgIyBDYXN0IHRoZSBwcm9wZXJ0aWVzIHRvIGFuIGFycmF5LiBBIHdhdGNoIGNhbiBzdXBwb3J0IG9uZSBvciBtb3JlIHByb3BlcnR5IG5hbWVzLlxuICAgICAgaWYgcHJvcGVydGllcyAmJiAhXy5pc0FycmF5IHByb3BlcnRpZXNcbiAgICAgICAgcHJvcGVydGllcyA9IFtwcm9wZXJ0aWVzXVxuXG4gICAgICAjIFRocm93IGFuIGVycm9yIGlmIGNsaWVudCBjb2RlIGF0dGVtcHRzIHRvIHNldCBhIHdhdGNoIG9uIGEgcHJvcGVydHkgdGhhdCBpcyBub3QgZGVmaW5lZCBhcyBwYXJ0IG9mIHRoZSBzY2hlbWEuXG4gICAgICBmb3IgcHJvcE5hbWUgaW4gcHJvcGVydGllc1xuICAgICAgICBpZiAhXy5oYXMgbm9ybWFsaXplZFNjaGVtYSwgcHJvcE5hbWVcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IgXCJDYW5ub3Qgc2V0IHdhdGNoIG9uICN7cHJvcE5hbWV9LCBwcm9wZXJ0eSBpcyBub3QgZGVmaW5lZCBpbiBzY2hlbWEuXCJcblxuICAgICAgIyBSZWdpc3RlciB0aGUgd2F0Y2hlciBvbiB0aGUgY29ycmVjdCBpbnRlcm5hbCBvciBleHRlcm5hbCB3YXRjaGVycyBhcnJheS4gRmxhZyBuZXcgZXh0ZXJuYWwgd2F0Y2hlcnMgd2l0aCBgZmlyc3RgXG4gICAgICAjIHNvIHRoYXQgdGhleSB3aWxsIGdldCBjYWxsZWQgb24gdGhlIGZpcnN0IGNoYW5nZSBsb29wLCByZWdhcmRsZXNzIG9mIHdoZXRoZXIgdGhlIHdhdGNoIHByb3BlcnRpZXMgaGF2ZSBjaGFuZ2VkLlxuICAgICAgIyBJbnRlcm5hbCB3YXRjaGVycyBkbyBub3QgbmVlZCB0byBiZSBpbnZva2VkIG9uIGZpcnN0IHdhdGNoLlxuICAgICAgd2F0Y2hlciA9IHtwcm9wZXJ0aWVzLCBjYiwgZmlyc3QgOiAhb3B0cy5pbnRlcm5hbH1cbiAgICAgIHdhdGNoZXJzW3RhcmdldF0ucHVzaCB3YXRjaGVyXG5cbiAgICAgICMgUXVldWUgYSBjaGFuZ2UgZXZlbnQgb24gdGhlIGNoYW5nZSBtYW5hZ2VyLlxuICAgICAgQ2hhbmdlTWFuYWdlci5xdWV1ZUNoYW5nZXMge2lkfSwgZmlyZVdhdGNoZXJzXG5cbiAgICAgICMgcmV0dXJuIGFuIHVud2F0Y2ggZnVuY3Rpb25cbiAgICAgIHJldHVybiAtPlxuICAgICAgICByZW1vdmVXYXRjaGVyIHdhdGNoZXIsIHRhcmdldFxuXG4gICAgIyBSZW1vdmUgYSB3YXRjaCBsaXN0ZW5lciBmcm9tIHRoZSBhcHByb3ByYWl0ZSB3YXRjaGVycyBhcnJheVxuICAgIHJlbW92ZVdhdGNoZXIgPSAod2F0Y2hlciwgdGFyZ2V0KSAtPlxuICAgICAgXy5yZW1vdmUgd2F0Y2hlcnNbdGFyZ2V0XSwgd2F0Y2hlclxuXG4gICAgIyBUaGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBvbiB2YWx1ZSBhc3NpZ25tZW50XG4gICAgd2F0Y2hGb3JQcm9wYWdhdGlvbiA9IChwcm9wTmFtZSwgdmFsKSAtPlxuICAgICAge3R5cGV9ID0gbm9ybWFsaXplZFNjaGVtYVtwcm9wTmFtZV1cblxuICAgICAgIyBJZiB0aGUgYXNzaWduZWQgcHJvcGVydHkgaXMgb2YgdHlwZSBzY2hlbWEsIHdlIG5lZWQgdG8gbGlzdGVuIGZvciBjaGFuZ2VzIG9uIHRoZSBjaGlsZCBpbnN0YW5jZSB0byBwcm9wYWdhdGVcbiAgICAgICMgY2hhbmdlcyB0byB0aGlzIGluc3RhbmNlXG4gICAgICBpZiB0eXBlLnN0cmluZyA9PSBUeXBlcy5ORVNURURfVFlQRVMuU2NoZW1hLnN0cmluZ1xuICAgICAgICAjIElmIHRoZXJlIHdhcyBhIHdhdGNoZXIgZnJvbSB0aGUgcHJldmlvdXNseSBhc3NpZ25lZCB2YWx1ZSwgc3RvcCBsaXN0ZW5pbmcuXG4gICAgICAgIHVud2F0Y2hlcnNbcHJvcE5hbWVdPygpXG4gICAgICAgICMgV2F0Y2ggdGhlIG5ldyB2YWx1ZSBmb3IgY2hhbmdlcyBhbmQgcHJvcGFnYXRlIHRoaXMgY2hhbmdlcyB0byB0aGlzIGluc3RhbmNlLiBGbGFnIHRoZSB3YXRjaCBhcyBpbnRlcm5hbC5cbiAgICAgICAgdW53YXRjaGVyc1twcm9wTmFtZV0gPSB2YWw/LndhdGNoIChuZXdWYWwsIG9sZFZhbCktPlxuICAgICAgICAgIENoYW5nZU1hbmFnZXIucXVldWVDaGFuZ2VzIHtpZCwgcHJvcE5hbWUsIG9sZFZhbCwgbmV3VmFsLCBlcXVhbHM6IHR5cGUuZXF1YWxzfSwgZmlyZVdhdGNoZXJzXG4gICAgICAgICwgaW50ZXJuYWwgOiB0cnVlXG5cbiAgICAgICMgSWYgdGhlIGFzc2lnbmVkIHByb3BlcnR5IGlzIGFuIGFycmF5IG9mIHR5cGUgc2NoZW1hLCBzZXQgYSB3YXRjaCBvbiBlYWNoIGFycmF5IG1lbWViZXIuXG4gICAgICBpZiB0eXBlLnN0cmluZyA9PSBUeXBlcy5ORVNURURfVFlQRVMuQXJyYXkuc3RyaW5nIGFuZCB0eXBlLmNoaWxkVHlwZS5zdHJpbmcgPT0gVHlwZXMuTkVTVEVEX1RZUEVTLlNjaGVtYS5zdHJpbmdcbiAgICAgICAgIyBJZiB0aGVyZSB3ZXJlIHdhdGNoZXJzIG9uIHRoZSBwcmV2aW91cyBhcnJheSBtZW1iZXJzLCBjbGVhciB0aG9zZSBsaXN0ZW5lcnMuXG4gICAgICAgIGZvciB1bndhdGNoZXIgaW4gKHVud2F0Y2hlcnNbcHJvcE5hbWVdIHx8IFtdKVxuICAgICAgICAgIHVud2F0Y2hlcj8oKVxuICAgICAgICAjIHJlc2V0IHRoZSB1bndhdGNoZXJzIGFycmF5XG4gICAgICAgIHVud2F0Y2hlcnNbcHJvcE5hbWVdID0gW11cbiAgICAgICAgXy5lYWNoIHZhbCwgKHNjaGVtYSwgaSkgLT5cbiAgICAgICAgICAjIHNldCBhIG5ldyB3YXRjaCBvbiBlYWNoIGFycmF5IG1lbWJlciB0byBwcm9wYWdhdGUgY2hhbmdlcyB0byB0aGlzIGluc3RhbmNlLiBGbGFnIHRoZSB3YXRjaCBhcyBpbnRlcm5hbC5cbiAgICAgICAgICB1bndhdGNoZXJzW3Byb3BOYW1lXS5wdXNoIHNjaGVtYT8ud2F0Y2ggKG5ld1ZhbCwgb2xkVmFsKS0+XG4gICAgICAgICAgICBuZXdBcnJheSA9IGluc3RhbmNlW3Byb3BOYW1lXVxuICAgICAgICAgICAgIyBjaGVjayBpZiB0aGVyZSBpcyBhbHJlYWR5IGEgcXVldWVkIGNoYW5nZSBmb3IgdGhpcyBhcnJheVxuICAgICAgICAgICAgb2xkQXJyYXkgPSBDaGFuZ2VNYW5hZ2VyLmdldFF1ZXVlZENoYW5nZXMge2lkLCBwcm9wTmFtZX1cbiAgICAgICAgICAgICMgaWYgdGhlcmUgaXMgbm90LCBjbG9uZSB0aGUgY3VycmVudCBzdGF0ZSBvZiB0aGUgYXJyYXksIGluY2x1ZGluZyB0aGUgYXJyYXlJZFxuICAgICAgICAgICAgaWYgIW9sZEFycmF5P1xuICAgICAgICAgICAgICBvbGRBcnJheSA/PSBfLmNsb25lIG5ld0FycmF5XG4gICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSBvbGRBcnJheSwgJ19hcnJheUlkJyxcbiAgICAgICAgICAgICAgICBjb25maWd1cmFibGUgOiB0cnVlXG4gICAgICAgICAgICAgICAgdmFsdWUgOiBuZXdBcnJheS5fYXJyYXlJZFxuICAgICAgICAgICAgIyBpZiB0aGUgc291cmNlIG9mIHRoaXMgY2huYWdlIGlzIHRoZSBzYW1lIGFzIHRoZSBhbHJlYWR5IHF1ZXVlZCBhcnJheSwgcHJvcGFnYXRlIHRoZSBjaGFuZ2VcbiAgICAgICAgICAgIGlmIG9sZEFycmF5Ll9hcnJheUlkID09IG5ld0FycmF5Ll9hcnJheUlkXG4gICAgICAgICAgICAgIG9sZEFycmF5W2ldID0gb2xkVmFsXG4gICAgICAgICAgICAgIENoYW5nZU1hbmFnZXIucXVldWVDaGFuZ2VzIHtpZCwgcHJvcE5hbWUsIG9sZFZhbCA6IG9sZEFycmF5LCBuZXdWYWwgOiBuZXdBcnJheSwgZXF1YWxzIDogdHlwZS5lcXVhbHMsIGZvcmNlOiB0cnVlfSwgZmlyZVdhdGNoZXJzXG4gICAgICAgICAgLCBpbnRlcm5hbCA6IHRydWVcblxuICAgICMgR2l2ZW4gYSBjaGFuZ2Ugc2V0LCBmaXJlcyBhbGwgd2F0Y2hlcnMgdGhhdCBhcmUgd2F0Y2hpbmcgb25lIG9yIG1vcmUgb2YgdGhlIGNoYW5nZWQgcHJvcGVydGllc1xuICAgIGZpcmVXYXRjaGVycyA9IChxdWV1ZWRDaGFuZ2VzLCB0YXJnZXQ9J2V4dGVybmFsJykgLT5cbiAgICAgIHRyaWdnZXJpbmdQcm9wZXJ0aWVzID0gXy5rZXlzIHF1ZXVlZENoYW5nZXNcblxuICAgICAgIyBSZXRyaWV2ZXMgdGhlIHByZXZpb3VzIHZhbHVlIGZvciBhIHByb3BlcnR5LCBwdWxsaW5nIGZyb20gcXVldWVkIGNoYW5nZXMgaWYgcHJlc2VudCwgb3RoZXJ3aXNlIHJldHJlaXZpbmdcbiAgICAgICMgY3VycmVudCB2YWx1ZSAtIGkuZS4gbm8gY2hhbmdlLlxuICAgICAgZ2V0UHJldlZhbCA9IChwcm9wTmFtZSkgLT5cbiAgICAgICAgaWYgXy5oYXMgcXVldWVkQ2hhbmdlcywgcHJvcE5hbWVcbiAgICAgICAgICByZXR1cm4gcXVldWVkQ2hhbmdlc1twcm9wTmFtZV1cbiAgICAgICAgZWxzZVxuICAgICAgICAgIHJldHVybiBpbnN0YW5jZVtwcm9wTmFtZV1cblxuICAgICAgIyBmb3IgZWFjaCByZWdpc3RlcmVkIHdhdGNoZXIgLSB1c2UgYSB3aGlsZSBsb29wIHNpbmNlIGZpcmluZyBvbmUgd2F0Y2hlciBjYW4gY2F1c2Ugb3RoZXIgd2F0Y2hlcnMgdG8gYmUgYWRkZWQgb3JcbiAgICAgICMgcmVtb3ZlZFxuICAgICAgaSA9IDBcbiAgICAgICMgVE9ETzogdGhlcmUgaXMgYSBwb3NzaWJsZSBlcnJvciBoZXJlIHdoZXJlIGZpcmluZyBvbmUgd2F0Y2hlciByZW1vdmVzIGFub3RoZXIgd2F0Y2hlciBmcm9tXG4gICAgICAjIHRoZSBhcnJheSAtIHRoZSBpbmRleCB3b3VsZCBiZSBvZmYgYnkgb25lIGFuZCBhIHdhdGNoZXIgY291bGQgYmUgc2tpcHBlZFxuICAgICAgd2hpbGUgKHdhdGNoZXIgPSB3YXRjaGVyc1t0YXJnZXRdW2ldKVxuICAgICAgICBpKytcbiAgICAgICAgIyBUaGF0IHdhdGNoZXIgc2hvdWxkIGZpcmUgaWYgaXQgaXMgbmV3LCBvciBpZiBpdCBpcyB3YXRjaGluZyBvbmUgb3IgbW9yZSBvZiB0aGUgY2hhbmdlZCBwcm9wZXJ0aWVzXG4gICAgICAgIHNob3VsZEZpcmUgPSB3YXRjaGVyLmZpcnN0IHx8IChfLmludGVyc2VjdGlvbih0cmlnZ2VyaW5nUHJvcGVydGllcywgd2F0Y2hlci5wcm9wZXJ0aWVzKS5sZW5ndGggPiAwKVxuICAgICAgICB3YXRjaGVyLmZpcnN0ID0gZmFsc2VcbiAgICAgICAgaWYgc2hvdWxkRmlyZVxuICAgICAgICAgIG5ld1ZhbHMgPSB7fVxuICAgICAgICAgIG9sZFZhbHMgPSB7fVxuXG4gICAgICAgICAgIyBidWlsZCB0aGUgaGFzaCBvZiBuZXcgLyBvbGQgdmFsdWVzXG4gICAgICAgICAgZm9yIHByb3BOYW1lIGluIHdhdGNoZXIucHJvcGVydGllc1xuICAgICAgICAgICAgbmV3VmFsc1twcm9wTmFtZV0gPSBpbnN0YW5jZVtwcm9wTmFtZV1cbiAgICAgICAgICAgIG9sZFZhbHNbcHJvcE5hbWVdID0gZ2V0UHJldlZhbChwcm9wTmFtZSlcblxuICAgICAgICAgICMgaWYgdGhlIHdhdGNoZXIgaXMgc2V0IGFnYWluc3QgYSBzaW5nbGUgcHJvcGVydHksIGludm9rZSB0aGUgY2FsbGJhY2sgd2l0aCB0aGUgcmF3IG5ldyAvIG9sZCB2YWx1ZXNcbiAgICAgICAgICBpZiB3YXRjaGVyLnByb3BlcnRpZXMubGVuZ3RoID09IDFcbiAgICAgICAgICAgIHByb3BOYW1lID0gd2F0Y2hlci5wcm9wZXJ0aWVzWzBdXG4gICAgICAgICAgICBuZXdWYWxzID0gbmV3VmFsc1twcm9wTmFtZV1cbiAgICAgICAgICAgIG9sZFZhbHMgPSBvbGRWYWxzW3Byb3BOYW1lXVxuXG4gICAgICAgICAgdHJ5XG4gICAgICAgICAgICB3YXRjaGVyLmNiIG5ld1ZhbHMsIG9sZFZhbHNcbiAgICAgICAgICBjYXRjaCBlXG4gICAgICAgICAgICAjIFRPRE86IGJyb3dzZXIgc3VwcG9ydD9cbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IgZS5zdGFjayB8fCBlXG5cbiAgICAjICMjIyB3YXRjaFxuICAgICMgV2F0Y2hlcyBhbiBpbnN0YW5jZSBmb3IgY2hhbmdlcyB0byBvbmUgb3IgbW9yZSBwcm9wZXJ0aWVzXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5IGluc3RhbmNlLCAnd2F0Y2gnLFxuICAgICAgY29uZmlndXJhYmxlIDogZmFsc2VcbiAgICAgIGVudW1lcmFibGUgOiBmYWxzZVxuICAgICAgd3JpdGFibGUgOiBmYWxzZVxuICAgICAgdmFsdWUgOiAocHJvcGVydGllcywgY2IsIG9wdHMpIC0+IGFkZFdhdGNoZXIgcHJvcGVydGllcywgY2IsIG9wdHNcblxuICAgICMgRGVmaW5lIGEgdmFsaWRhdGluZyBmbGFnLCB3aGljaCBpcyB1c2VkIHRvIHByZXZlbnQgaW5maW5pdGUgbG9vcHMgb24gdmFsaWRhdGlvbiBvZiBjaXJjdWxhciByZWZlcmVuY2VzXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5IGluc3RhbmNlLCAnX3ZhbGlkYXRpbmcnLFxuICAgICAgY29uZmlndXJhYmxlIDogZmFsc2VcbiAgICAgIGVudW1lcmFibGUgOiBmYWxzZVxuICAgICAgd3JpdGFibGUgOiB0cnVlXG4gICAgICB2YWx1ZSA6IGZhbHNlXG5cbiAgICAjICMjIyBjb25zdHJ1Y3RvclxuICAgICMgZm9yIGVhY2ggcHJvcGVydHkgb2YgdGhlIG5vcm1hbGl6ZWQgc2NoZW1hXG4gICAgZm9yIHByb3BOYW1lLCBwcm9wQ29uZmlnIG9mIG5vcm1hbGl6ZWRTY2hlbWFcbiAgICAgIGRvIChwcm9wTmFtZSwgcHJvcENvbmZpZykgPT5cbiAgICAgICAgIyBkZWZpbmUgYW4gZW51bWVyYWJsZSBwcm9wZXJ0eSBvbiB0aGUgaW5zdGFuY2UgdGhhdCBpcyBub3QgY29uZmlndXJhYmxlXG4gICAgICAgICMgdXNlciBnZXQgYW5kIHNldCB0byBtYW5hZ2UgZ2V0dGVycywgc2V0dGVycywgYW5kIHR5cGUgcGFyc2luZ1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkgaW5zdGFuY2UsIHByb3BOYW1lLFxuICAgICAgICAgIGNvbmZpZ3VyYWJsZSA6IGZhbHNlXG4gICAgICAgICAgZW51bWVyYWJsZSAgIDogdHJ1ZVxuICAgICAgICAjICoqc2V0KipcbiAgICAgICAgICBzZXQgICAgICAgICAgOiAodmFsKSAtPiBzZXQgcHJvcE5hbWUsIHZhbFxuICAgICAgICAjICoqZ2V0KipcbiAgICAgICAgICBnZXQgICAgICAgICAgOiAtPiBnZXQgcHJvcE5hbWVcblxuICAgICAgICAjIE9uY2UgdGhlIHByb3BlcnR5IGlzIGNvbmZpZ3VyZWQsIGFzc2lnbiBhIGRlZmF1bHQgdmFsdWUuIFRoaXMgZW5zdXJlcyB0aGF0IGRlZmF1bHQgdmFsdWVzIGFyZSBzdGlsbFxuICAgICAgICAjIGFmZmVjdGVkIGJ5IHR5cGUgcGFyc2luZyBhbmQgc2V0dGVyc1xuICAgICAgICBpZiBwcm9wQ29uZmlnLmRlZmF1bHQgIT0gdW5kZWZpbmVkXG4gICAgICAgICAgdmFsID0gaWYgXy5pc0Z1bmN0aW9uKHByb3BDb25maWcuZGVmYXVsdCkgdGhlbiBwcm9wQ29uZmlnLmRlZmF1bHQoKSBlbHNlIHByb3BDb25maWcuZGVmYXVsdFxuICAgICAgICAgIGluc3RhbmNlW3Byb3BOYW1lXSA9IHZhbFxuXG4gICAgIyBJZiBzZWFsIG9wdGlvbiBpcyBlbmFibGVkLCBzZWFsIHRoZSBpbnN0YW5jZSwgcHJldmVudGluZyBhZGRpdGlvbiBvZiBvdGhlciBwcm9wZXJ0aWVzIGJlc2lkZXMgdGhvc2UgZXhwbGljaXRseVxuICAgICMgZGVmaW5lZCBieSB0aGUgU2NoZW1hXG4gICAgaWYgc2VhbFxuICAgICAgT2JqZWN0LnNlYWwgaW5zdGFuY2VcblxuICAgICMgc2V0IHRoZSBpbml0aWFsIHN0YXRlIG9mIHRoZSBpbnN0YW5jZSwgdGhlbiBjbGVhciB0aGUgaW5pdGlhbGl6aW5nIGZsYWdcbiAgICBmb3IgcHJvcE5hbWUsIHZhbCBvZiBpbml0aWFsU3RhdGVcbiAgICAgIGluc3RhbmNlW3Byb3BOYW1lXSA9IHZhbFxuXG4gICAgX2luaXRpYWxpemluZyA9IGZhbHNlXG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IEluc3RhbmNlRmFjdG9yeSgpXG4iLCJfID0gcmVxdWlyZSAnbG9kYXNoJ1xuVHlwZXMgPSByZXF1aXJlICcuL1R5cGVzJ1xuSW5zdGFuY2VGYWN0b3J5ID0gcmVxdWlyZSAnLi9JbnN0YW5jZUZhY3RvcnknXG5SZWdpc3RyeSA9IHJlcXVpcmUgJy4vUmVnaXN0cnknXG5cblxuY2xhc3MgTW9kZWxGYWN0b3J5XG5cbiAgIyAjIyMgREVGQVVMVF9PUFRJT05TXG4gICMgRGVmYXVsdCBvcHRpb25zIGZvciBgU2NoZW1hLmNyZWF0ZWBcbiAgREVGQVVMVF9PUFRJT05TIDpcbiAgICBzZWFsICAgOiBmYWxzZVxuICAgIHN0cmljdCA6IGZhbHNlXG5cbiAgY29uc3RydWN0b3IgOiAtPlxuICAgIEBuYW1lQ291bnRlcj0wXG5cbiAgZ2VuZXJhdGVOYW1lIDogPT5cbiAgICByZXR1cm4gXCJTY2hlbWluZ01vZGVsI3tAbmFtZUNvdW50ZXIrK31cIlxuXG4gICMgIyMjIG5vcm1hbGl6ZVByb3BlcnR5Q29uZmlnXG4gICMjI1xuICAgIE5vcm1hbGl6ZXMgYSBmaWVsZCBkZWNsYXJhdGlvbiBvbiBhIHNjaGVtYSB0byBjYXB0dXJlIHR5cGUsIGRlZmF1bHQgdmFsdWUsIHNldHRlciwgZ2V0dGVyLCBhbmQgdmFsaWRhdGlvbi5cbiAgICBVc2VkIGludGVybmFsbHkgd2hlbiBhIHNjaGVtYSBpcyBjcmVhdGVkIHRvIGJ1aWxkIGEgbm9ybWFsaXplZCBzY2hlbWEgZGVmaW5pdGlvbi5cbiAgIyMjXG4gIG5vcm1hbGl6ZVByb3BlcnR5Q29uZmlnIDogKHByb3BDb25maWcsIHByb3BOYW1lID0gJ2ZpZWxkJykgPT5cbiAgICAjIGluaXRpYWxpemUgbm9ybWFsaXplZCBwcm9wZXJ0eSBkZWZpbml0aW9uIHRoYXQgd2Ugd2lsbCByZXR1cm5cbiAgICBkZWZpbml0aW9uID1cbiAgICAgIHR5cGUgICAgICAgOiBudWxsXG4gICAgICBkZWZhdWx0ICAgIDogbnVsbFxuICAgICAgZ2V0dGVyICAgICA6IG51bGxcbiAgICAgIHNldHRlciAgICAgOiBudWxsXG4gICAgICB2YWxpZGF0ZSAgIDogbnVsbFxuICAgICAgcmVxdWlyZWQgICA6IGZhbHNlXG5cbiAgICAjIGlmIHByb3BlcnR5IGNvbmZpZ3VyYXRpb24gaXMgbm90IGFuIG9iamVjdCB3aXRoIGEgdHlwZSBrZXksIGFzc3VtZSB0aGF0XG4gICAgIyB0aGUgY29uZmlndXJhdGlvbiB2YWx1ZSBpcyBqdXN0IHRoZSBwcm9wZXJ0eSB0eXBlXG4gICAgaWYgIShfLmlzUGxhaW5PYmplY3QocHJvcENvbmZpZykgJiYgcHJvcENvbmZpZy50eXBlPylcbiAgICAgIHByb3BDb25maWcgPSB7dHlwZSA6IHByb3BDb25maWd9XG5cbiAgICB7dHlwZSwgZ2V0dGVyLCBzZXR0ZXIsIHZhbGlkYXRlLCByZXF1aXJlZH0gPSBwcm9wQ29uZmlnXG4gICAgIyBUaGlzIGZ1bmN0aW9uIHRocm93cyBlcnJvcnMgb24gYW55IGJhZCBjb25maWd1cmF0aW9uLCBhdHRlbXB0aW5nIHRvIGZhaWwgZmFzdC5cblxuICAgICMgLSBUaHJvdyBhbiBlcnJvciBpZiB0eXBlIGlzIG5vdCBkZWZpbmVkLiBUeXBlIG11c3QgYWx3YXlzIGJlIGV4cGxpY2l0bHkgZGVjbGFyZWQuIFVudHlwZWQgZmllbGRzXG4gICAgIyBtdXN0IGV4cGxpY2l0bHkgZGVjbGFyZWQgYXMgU2NoZW1hLlRZUEVTLk1peGVkXG4gICAgaWYgIXR5cGU/XG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJFcnJvciByZXNvbHZpbmcgI3twcm9wTmFtZX0uIFNjaGVtYSB0eXBlIG11c3QgYmUgZGVmaW5lZC5cIlxuICAgICMgLSBUaHJvdyBhbiBlcnJvciBpZiBnZXR0ZXIgaXMgbm90IGEgZnVuY3Rpb25cbiAgICBpZiBnZXR0ZXI/ICYmICFfLmlzRnVuY3Rpb24gZ2V0dGVyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJFcnJvciByZXNvbHZpbmcgI3twcm9wTmFtZX0uIFNjaGVtYSBnZXR0ZXIgbXVzdCBiZSBhIGZ1bmN0aW9uLlwiXG4gICAgIyAtIFRocm93IGFuIGVycm9yIGlmIHNldHRlciBpcyBub3QgYSBmdW5jdGlvblxuICAgIGlmIHNldHRlcj8gJiYgIV8uaXNGdW5jdGlvbiBzZXR0ZXJcbiAgICAgIHRocm93IG5ldyBFcnJvciBcIkVycm9yIHJlc29sdmluZyAje3Byb3BOYW1lfS4gU2NoZW1hIHNldHRlciBtdXN0IGJlIGEgZnVuY3Rpb24uXCJcblxuICAgIHZhbGlkYXRlID89IFtdXG4gICAgIyAtIElmIHZhbGlkYXRlIGlzIGEgc2luZ2xlIGZ1bmN0aW9uLCB0cmFuc2Zvcm0gdG8gYW4gYXJyYXkgd2l0aCBvbmUgbWVtYmVyXG4gICAgaWYgIV8uaXNBcnJheSh2YWxpZGF0ZSlcbiAgICAgIHZhbGlkYXRlID0gW3ZhbGlkYXRlXVxuICAgICMgLSBDaGVjayB0aGF0IGFsbCB2YWxpZGF0ZSBhcmUgYSBmdW5jdGlvbiwgdGhyb3cgYW4gZXJyb3IgaWYgaXQgaXMgbm90LlxuICAgIGZvciBmbiBpbiB2YWxpZGF0ZVxuICAgICAgaWYgIV8uaXNGdW5jdGlvbiBmblxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IgXCJFcnJvciByZXNvbHZpbmcgI3twcm9wTmFtZX0uIFNjaGVtYSB2YWxpZGF0ZSBtdXN0IGJlIGEgZnVuY3Rpb24gb3IgYXJyYXkgb2YgZnVuY3Rpb25zLlwiXG5cbiAgICAjIC0gUmVzb2x2ZSB0aGUgZGVjbGFyZWQgdHlwZVxuICAgIGRlZmluaXRpb24udHlwZSA9IFR5cGVzLnJlc29sdmVUeXBlIHR5cGVcblxuICAgICMgLSBJZiB0eXBlIGNvdWxkIG5vdCBiZSByZXNvbHZlZCwgdGhyb3cgYW4gZXJyb3JcbiAgICBpZiAhZGVmaW5pdGlvbi50eXBlP1xuICAgICAgdGhyb3cgbmV3IEVycm9yIFwiRXJyb3IgcmVzb2x2aW5nICN7cHJvcE5hbWV9LiBVbnJlY29nbml6ZWQgdHlwZSAje3R5cGV9XCJcblxuICAgICMgYGRlZmF1bHRgIGlzIGEgcmVzZXJ2ZWQgd29yZCwgc28gd2UgY2FuJ3QgZG8gdGhlIG5pY2UgY2xlYW4gZGVuYXR1cmVkIGFzc2lnbm1lbnRcbiAgICBkZWZpbml0aW9uLmRlZmF1bHQgPSBwcm9wQ29uZmlnLmRlZmF1bHRcbiAgICBkZWZpbml0aW9uLmdldHRlciA9IGdldHRlclxuICAgIGRlZmluaXRpb24uc2V0dGVyID0gc2V0dGVyXG4gICAgZGVmaW5pdGlvbi52YWxpZGF0ZSA9IHZhbGlkYXRlXG4gICAgZGVmaW5pdGlvbi5yZXF1aXJlZCA9IHJlcXVpcmVkXG5cbiAgICAjIGFsbG93IGFueSBjdXN0b20gcHJvcGVydGllcyB0byBiZSBleHBvc2VkIG9uIHRoZSBkZWZpbml0aW9uIG9iamVjdFxuICAgIGRlZmluaXRpb24gPSBfLmV4dGVuZCB7fSwgcHJvcENvbmZpZywgZGVmaW5pdGlvblxuXG4gICAgIyBSZXR1cm4gYSB2YWxpZCBwcm9wZXJ0eSBjb25maWd1cmF0aW9uXG4gICAgcmV0dXJuIGRlZmluaXRpb25cblxuICBuYW1lRnVuY3Rpb24gOiAobmFtZSwgZm4pID0+XG4gICAgZm5TdHIgPSBcInJldHVybiBmdW5jdGlvbiAje25hbWV9KCl7cmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyl9XCJcbiAgICB0cnlcbiAgICAgIHJlbmFtZWQgPSBuZXcgRnVuY3Rpb24oJ2ZuJywgZm5TdHIpKGZuKVxuICAgIGNhdGNoIGVyclxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwiI3tuYW1lfSBpcyBub3QgYSB2YWxpZCBmdW5jdGlvbiBuYW1lLlwiXG5cbiAgICBfLmV4dGVuZCByZW5hbWVkLCBmblxuICAgIF8uZXh0ZW5kIHJlbmFtZWQucHJvdG90eXBlLCBmbi5wcm90b3R5cGVcblxuICAgIHJldHVybiByZW5hbWVkXG5cbiAgIyAjIyMgY3JlYXRlXG4gICMgQ3JlYXRlcyBhIG5ldyBTY2hlbWEgY29uc3RydWN0b3JcbiAgY3JlYXRlIDogKGFyZ3MuLi4pID0+XG4gICAgZmFjdG9yeSA9IEBcbiAgICAjIElmIHRoZSBmaXJzdCBhcmd1bWVudCBpcyBhIHN0cmluZywgdGhlbiB0aGUgU2NoZW1hIGlzIGJlaW5nIG5hbWVkICYgcmVnaXN0ZXJlZC4gT3RoZXJ3aXNlLCBpdCBpcyBiZWluZ1xuICAgICMgY3JlYXRlZCBhbm9ueW1vdXNseSwgYW5kIHdlIG5lZWQgdG8gZ2l2ZSBpdCBhIHV1aWQgZm9yIHJlZ2lzdHJhdGlvbi5cbiAgICBpZiAhXy5pc1N0cmluZyhhcmdzWzBdKVxuICAgICAgYXJncy51bnNoaWZ0IEBnZW5lcmF0ZU5hbWUoKVxuXG4gICAgIyBHZXQgbmFtZSwgY29uZmlnLCBhbmQgb3B0aW9ucyBmcm9tIHRoZSBjcmVhdGUgYXJndW1lbnRzXG4gICAgW25hbWUsIHNjaGVtYUNvbmZpZywgb3B0c10gPSBhcmdzXG5cbiAgICAjIFNldCBvcHRpb25zLCBkZWZhdWx0aW5nIHRvIHRoZSBTY2hlbWluZy5ERUZBVUxUX09QVElPTlNcbiAgICBvcHRzID0gXy5kZWZhdWx0cyAob3B0cyB8fCB7fSksIEBERUZBVUxUX09QVElPTlNcblxuICAgICMgTm9ybWFsaXplZCBTY2hlbWEgaXMgY2FwdHVyZWQgaW4gY2xvc3VyZVxuICAgIG5vcm1hbGl6ZWRTY2hlbWEgPSB7fVxuXG4gICAgIyBDcmVhdGUgdGhlIG5ldyBNb2RlbFxuICAgIGNsYXNzIE1vZGVsXG4gICAgICAjIF9fc2NoZW1hSWQgcHJvcGVydHkgcmVmZXJlbmNlcyB0aGUgc2NoZW1hIG5hbWUgYW5kIGlkZW50aWZpZXMgU2NoZW1hIGNvbnN0cnVjdG9ycyBmcm9tIGFueSBvdGhlciBmdW5jdGlvblxuICAgICAgQF9fc2NoZW1hSWQgICAgICAgOiBuYW1lXG5cbiAgICAgICMgIyMjIGRlZmluZVByb3BlcnR5XG4gICAgICAjIERlZmluZXMgYSBwcm9wZXJ0eSBvbiB0aGUgbm9ybWFsaXplZCBzY2hlbWEsIHdoaWNoIGlzIHVzZWQgYXQgdGltZSBvZiBpbnN0YW5jZSBjb25zdHJ1Y3Rpb25cbiAgICAgIEBkZWZpbmVQcm9wZXJ0eSAgIDogKHByb3BOYW1lLCBwcm9wQ29uZmlnKSAtPlxuICAgICAgICBpZiAhXy5pc1N0cmluZyhwcm9wTmFtZSlcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IgXCJGaXJzdCBhcmd1bWVudDogcHJvcGVydHkgbmFtZSBtdXN0IGJlIGEgc3RyaW5nLlwiXG4gICAgICAgIGlmICFwcm9wQ29uZmlnP1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvciBcIlNlY29uZCBhcmd1bWVudDogcHJvcGVydHkgY29uZmlndXJhdGlvbiBpcyByZXF1aXJlZC5cIlxuICAgICAgICBub3JtYWxpemVkU2NoZW1hW3Byb3BOYW1lXSA9IGZhY3Rvcnkubm9ybWFsaXplUHJvcGVydHlDb25maWcocHJvcENvbmZpZywgcHJvcE5hbWUpXG5cbiAgICAgICMgIyMjIGRlZmluZVByb3BlcnRpZXNcbiAgICAgICMgQ29udmVuaWVuY2UgbWV0aG9kIGZvciBkZWZpbmluZyBwcm9wZXJ0aWVzIGluIGJ1bGtcbiAgICAgIEBkZWZpbmVQcm9wZXJ0aWVzIDogKGNvbmZpZykgLT5cbiAgICAgICAgaWYgIV8uaXNQbGFpbk9iamVjdChjb25maWcpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yIFwiRmlyc3QgYXJndW1lbnQ6IHByb3BlcnRpZXMgbXVzdCBiZSBhbiBvYmplY3QuXCJcbiAgICAgICAgZm9yIGssIHYgb2YgY29uZmlnXG4gICAgICAgICAgQGRlZmluZVByb3BlcnR5IGssIHZcblxuICAgICAgIyAjIyMgZ2V0UHJvcGVydGllc1xuICAgICAgIyByZXR1cm5zIGEgY2xvbmUgb2YgdGhlIG5vcm1hbGl6ZWQgU2NoZW1hXG4gICAgICBAZ2V0UHJvcGVydGllcyA6IC0+XG4gICAgICAgIHJldHVybiBfLmNsb25lRGVlcCBub3JtYWxpemVkU2NoZW1hXG5cbiAgICAgICMgIyMjIGdldFByb3BlcnR5XG4gICAgICAjIHJldHVybnMgYSBjbG9uZSBvZiB0aGUgbm9ybWFsaXplZCBTY2hlbWEgcHJvcGVydHlcbiAgICAgIEBnZXRQcm9wZXJ0eSA6IChwcm9wTmFtZSkgLT5cbiAgICAgICAgcmV0dXJuIF8uY2xvbmVEZWVwIG5vcm1hbGl6ZWRTY2hlbWFbcHJvcE5hbWVdXG5cbiAgICAgICMgIyMjIGVhY2hQcm9wZXJ0eVxuICAgICAgIyBJdGVyYXRlcyBvdmVyIGVhY2ggcHJvcGVydHkgbmFtZSBhbmQgY29uZmlndXJhdGlvbiBvZiB0aGUgc2NoZW1hLCBpbnZva2luZyB0aGUgcHJvdmlkZWQgY2FsbGJhY2tcbiAgICAgIEBlYWNoUHJvcGVydHkgOiAoY2IpIC0+XG4gICAgICAgIGlmICFfLmlzRnVuY3Rpb24oY2IpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yIFwiRmlyc3QgYXJndW1lbnQ6IGNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvbi5cIlxuICAgICAgICBmb3IgcHJvcE5hbWUsIHByb3BDb25maWcgb2Ygbm9ybWFsaXplZFNjaGVtYVxuICAgICAgICAgIGNiIHByb3BOYW1lLCBfLmNsb25lRGVlcCBwcm9wQ29uZmlnXG5cbiAgICAgICMgIyMjIHZhbGlkYXRlXG4gICAgICAjIFJ1biB2YWxpZGF0aW9uIG9uIGFuIGluc3RhbmNlIG9mIHRoZSBzY2hlbWFcbiAgICAgIEB2YWxpZGF0ZSA6IChpbnN0YW5jZSkgLT5cbiAgICAgICAgIyBDcmVhdGUgZXJyb3JzIGhhc2ggdGhhdCB3aWxsIGJlIHJldHVybmVkIG9uIGFueSB2YWxpZGF0aW9uIGZhaWx1cmUuXG4gICAgICAgIGVycm9ycyA9IHt9XG5cbiAgICAgICAgIyBGbGFnIHZhbGlkYXRpbmcgc3RhdGUgdG8gcHJldmVudCBpbmZpbml0ZSBsb29wIGluIHRoZSBjYXNlIG9mIGNpcmN1bGFyIHJlZmVyZW5jZXNcbiAgICAgICAgaWYgaW5zdGFuY2UuX3ZhbGlkYXRpbmcgdGhlbiByZXR1cm4gbnVsbFxuICAgICAgICBpbnN0YW5jZS5fdmFsaWRhdGluZyA9IHRydWVcblxuICAgICAgICAjIEZhY3RvcmVkIGNvZGUgdG8gcHVzaCBlcnJvciBtZXNzYWdlcyBvbnRvIHRoZSBlcnJvcnMgaGFzaFxuICAgICAgICBwdXNoRXJyb3IgPSAoa2V5LCBlcnJvcikgLT5cbiAgICAgICAgICBpZiBfLmlzQXJyYXkgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBwdXNoRXJyb3Ioa2V5LCBlcnIpIGZvciBlcnIgaW4gZXJyb3JcbiAgICAgICAgICBpZiAhXy5pc1N0cmluZyBlcnJvclxuICAgICAgICAgICAgZXJyb3IgPSAnVmFsaWRhdGlvbiBlcnJvciBvY2N1cnJlZC4nXG4gICAgICAgICAgZXJyb3JzW2tleV0gPz0gW11cbiAgICAgICAgICBlcnJvcnNba2V5XS5wdXNoIGVycm9yXG5cbiAgICAgICAgIyBBcHBseSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIGZvciBrZXksIHZhbHVlIG9mIG5vcm1hbGl6ZWRTY2hlbWFcbiAgICAgICAgICB7dmFsaWRhdGUsIHJlcXVpcmVkfSA9IHZhbHVlXG5cbiAgICAgICAgICAjIC0gUmV0cmlldmUgdmFsdWUuIFRoaXMgd2lsbCBiZSBhZmZlY3RlZCBieSBnZXR0ZXJzLlxuICAgICAgICAgIHZhbCA9IGluc3RhbmNlW2tleV1cblxuICAgICAgICAgICMgLSBJZiB0aGUgZmllbGQgaXMgcmVxdWlyZWQgYW5kIG5vdCBkZWZpbmVkLCBwdXNoIHRoZSBlcnJvciBhbmQgYmUgZG9uZVxuICAgICAgICAgIGlmIHJlcXVpcmVkICYmICghdmFsPyB8fCAoXy5pc1N0cmluZyh2YWwpICYmIHZhbC50cmltKCkubGVuZ3RoID09IDApKVxuICAgICAgICAgICAgcmVxdWlyZWRNZXNzYWdlID0gaWYgXy5pc1N0cmluZyhyZXF1aXJlZCkgdGhlbiByZXF1aXJlZCBlbHNlIFwiRmllbGQgaXMgcmVxdWlyZWQuXCJcbiAgICAgICAgICAgIHB1c2hFcnJvciBrZXksIHJlcXVpcmVkTWVzc2FnZVxuICAgICAgICAgICMgLSBPbmx5IHJ1biB2YWxpZGF0aW9uIG9uIGZpZWxkcyB0aGF0IGFyZSBkZWZpbmVkXG4gICAgICAgICAgaWYgdmFsP1xuICAgICAgICAgICAge3R5cGV9ID0gbm9ybWFsaXplZFNjaGVtYVtrZXldXG5cbiAgICAgICAgICAgICMgLSBSdW4gZWFjaCB2YWxpZGF0b3Igb24gdGhlIGZpZWxkIHZhbHVlXG4gICAgICAgICAgICBmb3IgdmFsaWRhdG9yIGluIHZhbGlkYXRlXG4gICAgICAgICAgICAgIGVyciA9IHRydWVcbiAgICAgICAgICAgICAgIyAtIEFjY2VwdCBlcnJvciBzdHJpbmdzIHRoYXQgYXJlIHJldHVybmVkLCBvciBlcnJvcnMgdGhhdCBhcmUgdGhyb3duIGR1cmluZyBwcm9jZXNzaW5nXG4gICAgICAgICAgICAgIHRyeVxuICAgICAgICAgICAgICAgIGVyciA9IHZhbGlkYXRvci5jYWxsKGluc3RhbmNlLCB2YWwpXG4gICAgICAgICAgICAgIGNhdGNoIGVcbiAgICAgICAgICAgICAgICBpZiBlIHRoZW4gZXJyID0gZS5tZXNzYWdlXG4gICAgICAgICAgICAgICMgLSBJZiBhbnkgdmFsaWRhdGlvbiBlcnJvcnMgYXJlIGRldGVjdGVkLCBwdXNoIHRoZW1cbiAgICAgICAgICAgICAgaWYgZXJyICE9IHRydWUgdGhlbiBwdXNoRXJyb3Iga2V5LCBlcnJcblxuICAgICAgICAgICAgIyAtIEFkZGl0aW9uYWxseSwgaWYgdGhlIHByb3BlcnR5IGlzIGEgbmVzdGVkIHNjaGVtYSwgcnVuIGl0cyB2YWxpZGF0aW9uXG4gICAgICAgICAgICBpZiB0eXBlLnN0cmluZyA9PSAnc2NoZW1hJ1xuICAgICAgICAgICAgICBjaGlsZEVycm9ycyA9IHR5cGUuY2hpbGRUeXBlLnZhbGlkYXRlLmNhbGwoaW5zdGFuY2UsIHZhbClcbiAgICAgICAgICAgICAgZm9yIGssIHYgb2YgY2hpbGRFcnJvcnNcbiAgICAgICAgICAgICAgICAjICAgLSBUaGUga2V5IG9uIHRoZSBlcnJvcnMgaGFzaCBzaG91bGQgYmUgdGhlIHBhdGggdG8gdGhlIGZpZWxkIHRoYXQgaGFkIGEgdmFsaWRhdGlvbiBlcnJvclxuICAgICAgICAgICAgICAgIHB1c2hFcnJvciBcIiN7a2V5fS4je2t9XCIsIHZcbiAgICAgICAgICAgICMgLSBJZiB0aGUgcHJvcGVydHkgaXMgYW4gYXJyYXkgb2Ygc2NoZW1hcywgcnVuIHZhbGlkYXRpb24gb24gZWFjaCBtZW1iZXIgb2YgdGhlIGFycmF5XG4gICAgICAgICAgICBpZiB0eXBlLnN0cmluZyA9PSAnYXJyYXknICYmIHR5cGUuY2hpbGRUeXBlLnN0cmluZyA9PSAnc2NoZW1hJ1xuICAgICAgICAgICAgICBmb3IgbWVtYmVyLCBpIGluIHZhbFxuICAgICAgICAgICAgICAgIGNoaWxkRXJyb3JzID0gdHlwZS5jaGlsZFR5cGUuY2hpbGRUeXBlLnZhbGlkYXRlLmNhbGwoaW5zdGFuY2UsIG1lbWJlcilcbiAgICAgICAgICAgICAgICBmb3IgaywgdiBvZiBjaGlsZEVycm9yc1xuICAgICAgICAgICAgICAgICAgIyAgIC0gQWdhaW4sIHRoZSBrZXkgb24gdGhlIGVycm9ycyBoYXNoIHNob3VsZCBiZSB0aGUgcGF0aCB0byB0aGUgZmllbGQgdGhhdCBoYWQgYSB2YWxpZGF0aW9uIGVycm9yXG4gICAgICAgICAgICAgICAgICBwdXNoRXJyb3IgXCIje2tleX1bI3tpfV0uI3trfVwiLCB2XG5cbiAgICAgICAgICAjIFVuc2V0IGZsYWcsIGluZGljYXRpbmcgdmFsaWRhdGlvbiBpcyBjb21wbGV0ZVxuICAgICAgICBpbnN0YW5jZS5fdmFsaWRhdGluZyA9IGZhbHNlXG5cbiAgICAgICAgIyBSZXR1cm4gbnVsbCBpZiBubyB2YWxpZGF0aW9uIGVycnJvcnMgb2N1cnJlZFxuICAgICAgICBpZiBfLnNpemUoZXJyb3JzKSA9PSAwXG4gICAgICAgICAgcmV0dXJuIG51bGxcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHJldHVybiBlcnJvcnNcblxuICAgICAgIyAjIyMgY29uc3RydWN0b3JcbiAgICAgICMgQ29uc3RydWN0b3IgdGhhdCBidWlsZHMgaW5zdGFuY2VzIG9mIHRoZSBTY2hlbWFcbiAgICAgIGNvbnN0cnVjdG9yICAgICAgIDogKGluaXRpYWxTdGF0ZSkgLT5cblxuICAgICAgICAjIHR1cm4gYHRoaXNgIGludG8gYSBNb2RlbCBpbnN0YW5jZVxuICAgICAgICBJbnN0YW5jZUZhY3RvcnkuY3JlYXRlKEAsIG5vcm1hbGl6ZWRTY2hlbWEsIGluaXRpYWxTdGF0ZSwgb3B0cylcblxuICAgIE1vZGVsID0gQG5hbWVGdW5jdGlvbiBuYW1lLCBNb2RlbFxuXG4gICAgIyBEZWZpbmUgcHJvcGVydGllcyBvbiB0aGUgU2NoZW1hIGJhc2VkIG9uIHRoZSBzY2hlbWEgY29uZmlndXJhdGlvblxuICAgIGlmIHNjaGVtYUNvbmZpZz8gdGhlbiBNb2RlbC5kZWZpbmVQcm9wZXJ0aWVzIHNjaGVtYUNvbmZpZ1xuXG4gICAgIyBSZWdpc3RlciB0aGUgbmV3IFNjaGVtYSBieSB0aGUgbmFtZSBwcm92aWRlZCBvciBnZW5lcmF0ZWRcbiAgICBSZWdpc3RyeS5yZWdpc3RlciBuYW1lLCBNb2RlbFxuXG4gICAgcmV0dXJuIE1vZGVsXG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IE1vZGVsRmFjdG9yeSgpXG4iLCIjIEludGVybmFsIHJlZ2lzdHJ5IGZvciBzY2hlbWFzIGNyZWF0ZWQgYnkgYFNjaGVtaW5nLmNyZWF0ZWAuIFNjaGVtYXMgYXJlIHJlZ2lzdGVyZWQgYnkgdGhlaXIgbmFtZSwgd2hpY2ggaXMgZWl0aGVyXG4jIHByb3ZpZGVkIGF0IHRpbWUgb2YgY3JlYXRpb24sIG9yIGdlbmVyYXRlZCBhcyBhIHV1aWQuXG5jbGFzcyBSZWdpc3RyeVxuICBjb25zdHJ1Y3RvciA6IC0+XG4gICAgQHNjaGVtYXMgPSB7fVxuXG4gICMgVXNlZCBpbnRlcm5hbGx5IGFzIHBhcnQgb2YgYFNjaGVtaW5nLmNyZWF0ZWAsIGRvIG5vdCBuZWVkIHRvIGV4cG9zZSByZWdpc3RyYXRpb24gb3V0c2lkZSBvZiBTY2hlbWEgY3JlYXRpb24uXG4gIHJlZ2lzdGVyIDogKG5hbWUsIG1vZGVsKSA9PlxuICAgICMgVGhyb3cgYW4gZXJyb3Igb24gbmFtaW5nIGNvbGxpc2lvbnNcbiAgICBpZiBAc2NoZW1hc1tuYW1lXVxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwiTmFtaW5nIGNvbmZsaWN0IGVuY291bnRlcmVkLiBNb2RlbCAje25hbWV9IGFscmVhZHkgZXhpc3RzXCJcbiAgICBAc2NoZW1hc1tuYW1lXSA9IG1vZGVsXG5cbiAgIyAjIyMgZ2V0XG4gICMgUmV0cmlldmVzIGEgc2NoZW1hIGJ5IHJlZ2lzdGVyZWQgbmFtZVxuICBnZXQgOiAobmFtZSkgPT5cbiAgICByZXR1cm4gQHNjaGVtYXNbbmFtZV1cblxuICAjICMjIyByZXNldFxuICAjIFJlc2V0cyB0aGUgc3RhdGUgb2YgdGhlIFNjaGVtYSByZWdpc3RyeS4gTWFpbmx5IGV4cG9zZWQgZm9yIHRlc3RpbmcsIGJ1dCBjb3VsZCBoYXZlIHVzZSBpbiBwcm9kdWN0aW9uLlxuICByZXNldCA6ID0+XG4gICAgQHNjaGVtYXMgPSB7fVxuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBSZWdpc3RyeSgpIiwiVHlwZXMgPSByZXF1aXJlICcuL1R5cGVzJ1xuUmVnaXN0cnkgPSByZXF1aXJlICcuL1JlZ2lzdHJ5J1xuQ2hhbmdlTWFuYWdlciA9IHJlcXVpcmUgJy4vQ2hhbmdlTWFuYWdlcidcbk1vZGVsRmFjdG9yeSA9IHJlcXVpcmUgJy4vTW9kZWxGYWN0b3J5J1xuSW5zdGFuY2VGYWN0b3J5ID0gcmVxdWlyZSAnLi9JbnN0YW5jZUZhY3RvcnknXG5cbntUWVBFUywgTkVTVEVEX1RZUEVTLCByZXNvbHZlVHlwZX0gPSBUeXBlc1xue1RIUk9UVExFLCBzZXRUaHJvdHRsZSwgcmVnaXN0ZXJRdWV1ZUNhbGxiYWNrLCB1bnJlZ2lzdGVyUXVldWVDYWxsYmFjayxcbnJlZ2lzdGVyUmVzb2x2ZUNhbGxiYWNrLCB1bnJlZ2lzdGVyUmVzb2x2ZUNhbGxiYWNrLCBmbHVzaH0gPSBDaGFuZ2VNYW5hZ2VyXG57REVGQVVMVF9PUFRJT05TLCBub3JtYWxpemVQcm9wZXJ0eUNvbmZpZywgY3JlYXRlfSA9IE1vZGVsRmFjdG9yeVxue3V1aWR9ID0gSW5zdGFuY2VGYWN0b3J5XG57Z2V0LCByZXNldH0gPSBSZWdpc3RyeVxuXG5cbnJlc2V0ID0gLT5cbiAgUmVnaXN0cnkucmVzZXQoKVxuICBDaGFuZ2VNYW5hZ2VyLnJlc2V0KClcblxuU2NoZW1pbmcgPSB7XG4gIFRZUEVTLCBORVNURURfVFlQRVMsIERFRkFVTFRfT1BUSU9OUywgVEhST1RUTEUsXG5cbiAgdXVpZCwgZ2V0LCByZXNldCxcblxuICByZXNvbHZlVHlwZSwgbm9ybWFsaXplUHJvcGVydHlDb25maWdcblxuICBzZXRUaHJvdHRsZSwgcmVnaXN0ZXJRdWV1ZUNhbGxiYWNrLCB1bnJlZ2lzdGVyUXVldWVDYWxsYmFjayxcbiAgcmVnaXN0ZXJSZXNvbHZlQ2FsbGJhY2ssIHVucmVnaXN0ZXJSZXNvbHZlQ2FsbGJhY2ssXG5cbiAgZmx1c2gsIGNyZWF0ZVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNjaGVtaW5nIiwiXyA9IHJlcXVpcmUgJ2xvZGFzaCdcblxuY2xhc3MgVHlwZXNcbiAgIyAjIyMgVFlQRVNcbiAgIyMjXG4gICAgU2NoZW1pbmcgZXhwb3J0cyB0aGUgZGVmYXVsdCB0eXBlcyB0aGF0IGl0IHVzZXMgZm9yIHBhcnNpbmcgc2NoZW1hcy4gWW91IGNhbiBleHRlbmQgd2l0aCBjdXN0b20gdHlwZXMsIG9yXG4gICAgb3ZlcnJpZGUgdGhlIGlkZW50aWZpZXIgLyBwYXJzZXIgZnVuY3Rpb25zIG9mIHRoZSBkZWZhdWx0IHR5cGVzLiBBIGN1c3RvbSB0eXBlIHNob3VsZCBwcm92aWRlOlxuICAgICAtIGN0b3IgKG9wdGlvbmFsKSAtIFVzZWQgaW4gc2NoZW1hIGRlZmluaXRpb25zIHRvIGRlY2xhcmUgYSB0eXBlLiBgU2NoZW1pbmcuY3JlYXRlIG5hbWUgOiBTdHJpbmdgXG4gICAgIC0gc3RyaW5nIC0gVXNlZCBpbiBzY2hlbWEgZGVmaW5pdGlvbnMgdG8gZGVjbGFyZSBhIHR5cGUuIGBTY2hlbWluZy5jcmVhdGUgbmFtZSA6ICdzdHJpbmcnYFxuICAgICAtIGlkZW50aWZpZXIgLSBGdW5jdGlvbiwgcmV0dXJucyB0cnVlIG9yIGZhbHNlLiBEZXRlcm1pbmVzIHdoZXRoZXIgYSB2YWx1ZSBuZWVkcyB0byBiZSBwYXJzZWQuXG4gICAgIC0gcGFyc2VyIC0gRnVuY3Rpb24sIHBhcnNlcyBhIHZhbHVlIGludG8gdGhlIHR5cGUuXG4gICMjI1xuICBUWVBFUyA6XG4gICAgU3RyaW5nICA6XG4gICAgICBjdG9yICAgICAgIDogU3RyaW5nXG4gICAgICBzdHJpbmcgICAgIDogJ3N0cmluZydcbiAgICAgIGlkZW50aWZpZXIgOiBfLmlzU3RyaW5nXG4gICAgICBwYXJzZXIgICAgIDogKHZhbCkgLT5cbiAgICAgICAgJycgKyB2YWxcbiAgICAgIGVxdWFscyAgICAgOiAoYSwgYikgLT4gYT09YlxuICAgIE51bWJlciAgOlxuICAgICAgY3RvciAgICAgICA6IE51bWJlclxuICAgICAgc3RyaW5nICAgICA6ICdudW1iZXInXG4gICAgICBpZGVudGlmaWVyIDogXy5pc051bWJlclxuICAgICAgcGFyc2VyICAgICA6IHBhcnNlRmxvYXRcbiAgICAgIGNvbXBhcmF0b3IgOiAoYSwgYikgLT4gYT09YlxuICAgICAgZXF1YWxzICAgICA6IChhLCBiKSAtPiBhPT1iXG4gICAgSW50ZWdlciA6XG4gICAgICBzdHJpbmcgICAgIDogJ2ludGVnZXInXG4gICAgICBpZGVudGlmaWVyIDogKHZhbCkgLT5cbiAgICAgICAgXy5pc051bWJlcih2YWwpICYmIHZhbCAlIDEgPT0gMFxuICAgICAgcGFyc2VyICAgICA6IHBhcnNlSW50XG4gICAgICBlcXVhbHMgICAgIDogKGEsIGIpIC0+IGE9PWJcbiAgICBEYXRlICAgIDpcbiAgICAgIGN0b3IgICAgICAgOiBEYXRlXG4gICAgICBzdHJpbmcgICAgIDogJ2RhdGUnXG4gICAgICBpZGVudGlmaWVyIDogXy5pc0RhdGVcbiAgICAgIHBhcnNlciAgICAgOiAodmFsKSAtPlxuICAgICAgICBuZXcgRGF0ZSB2YWxcbiAgICAgIGVxdWFscyAgICAgOiAoYSwgYikgLT4gYT8udmFsdWVPZigpID09IGI/LnZhbHVlT2YoKVxuICAgIEJvb2xlYW4gOlxuICAgICAgY3RvciAgICAgICA6IEJvb2xlYW5cbiAgICAgIHN0cmluZyAgICAgOiAnYm9vbGVhbidcbiAgICAgIGlkZW50aWZpZXIgOiBfLmlzQm9vbGVhblxuICAgICAgcGFyc2VyICAgICA6ICh2YWwpIC0+XG4gICAgICAgICEhdmFsXG4gICAgICBlcXVhbHMgICAgIDogKGEsIGIpIC0+IGE9PWJcbiAgICBNaXhlZCAgIDpcbiAgICAgIGN0b3IgICAgICAgOiAodmFsKSAtPlxuICAgICAgICB2YWxcbiAgICAgIHN0cmluZyAgICAgOiAnKidcbiAgICAgIGlkZW50aWZpZXIgOiAtPlxuICAgICAgICB0cnVlXG4gICAgICBwYXJzZXIgICAgIDogXy5pZGVudGl0eVxuICAgICAgZXF1YWxzICAgICA6IChhLCBiKSAtPiBhPT1iXG5cbiAgIyAjIyMgTkVTVEVEX1RZUEVTXG4gICMjI1xuICAgIFNwZWNpYWwgdHlwZSBkZWZpbml0aW9ucyBmb3IgbmVzdGVkIHR5cGVzLiBVc2VkIHRvIGlkZW50aWZ5IGFuZCBwYXJzZSBuZXN0ZWQgQXJyYXlzIGFuZCBTY2hlbWFzLlxuICAgIFNob3VsZCBub3QgYmUgZXh0ZW5kZWQgb3Igb3ZlcnJpZGRlbi5cbiAgIyMjXG4gIE5FU1RFRF9UWVBFUyA6XG4gICAgQXJyYXkgIDpcbiAgICAgIGN0b3IgICAgICAgIDogQXJyYXlcbiAgICAgIHN0cmluZyAgICAgIDogJ2FycmF5J1xuICAgICAgaWRlbnRpZmllciAgOiBfLmlzQXJyYXlcbiAgICAgIHBhcnNlciAgICAgIDogXy50b0FycmF5XG4gICAgICBjaGlsZFR5cGUgICA6IG51bGxcbiAgICAgIGNoaWxkUGFyc2VyIDogbnVsbFxuICAgICAgZXF1YWxzICAgICA6IChhLCBiKSAtPiBfLmlzRXF1YWwgYSwgYlxuICAgIFNjaGVtYSA6XG4gICAgICBjdG9yICAgICAgIDogT2JqZWN0XG4gICAgICBzdHJpbmcgICAgIDogJ3NjaGVtYSdcbiAgICAgIGlkZW50aWZpZXIgOiBudWxsXG4gICAgICBwYXJzZXIgICAgIDogbnVsbFxuICAgICAgY2hpbGRUeXBlICA6IG51bGxcbiAgICAgIGVxdWFscyAgICAgOiAoYSwgYikgLT4gYSA9PSBiXG5cblxuICAjIFVzZWQgaW50ZXJuYWxseSB0byByZXNvbHZlIGEgdHlwZSBkZWNsYXJhdGlvbiB0byBpdHMgcHJpbWl0aXZlIHR5cGUuXG4gICMgTWF0Y2hlcyBhIHByaW1pdGl2ZSB0eXBlIGlmIGl0IGlzLi4uXG4gICMgLSBhIHJlZmVyZW5jZSB0byB0aGUgb2JqZWN0IHN0cmFpZ2h0IGZyb20gdGhlIGBTY2hlbWEuVFlQRVNgIG9iamVjdFxuICAjIC0gYSByZWZlcmVuY2UgdG8gdGhlIGBjdG9yYFxuICAjIC0gYSBtYXRjaCB3aXRoIHRoZSB0eXBlIGBzdHJpbmdgIChjYXNlIGluc2Vuc2l0aXZlKVxuICBnZXRQcmltaXRpdmVUeXBlT2YgOiAodHlwZSkgPT5cbiAgICBmb3IgaywgVFlQRSBvZiBAVFlQRVNcbiAgICAgIGlmIHR5cGUgPT0gVFlQRSBvclxuICAgICAgICAgIChUWVBFLmN0b3IgJiYgdHlwZSA9PSBUWVBFLmN0b3IpIG9yXG4gICAgICAgICAgdHlwZT8udG9Mb3dlckNhc2U/KCkgPT0gVFlQRS5zdHJpbmdcblxuICAgICAgICByZXR1cm4gVFlQRVxuXG4gICAgcmV0dXJuIG51bGxcblxuICAjIEZ1bmN0aW9uIHRoYXQgYnVpbGRzIGlkZW50aWZpZXIgYW5kIHBhcnNlciBmb3IgbmVzdGVkIHNjaGVtYSB0eXBlcy4gTmVlZHMgdG8gYmUgZmFjdG9yZWQgb3V0XG4gICMgYmVjYXVzZSBuZXN0ZWQgc2NoZW1hcyBtYXkgYmUgcmVzb2x2ZWQgbGF6aWx5IGF0IGEgbGF0ZXIgdGltZVxuICByZXNvbHZlU2NoZW1hVHlwZSA6ICh0eXBlLCBjaGlsZFR5cGUpID0+XG4gICAgdHlwZS5jaGlsZFR5cGUgPSBjaGlsZFR5cGVcbiAgICB0eXBlLmlkZW50aWZpZXIgPSAodmFsKSAtPlxuICAgICAgcmV0dXJuIHZhbCBpbnN0YW5jZW9mIGNoaWxkVHlwZVxuICAgIHR5cGUucGFyc2VyID0gKHZhbCkgLT5cbiAgICAgIHJldHVybiBuZXcgY2hpbGRUeXBlKHZhbClcblxuICAjICMjIyByZXNvbHZlVHlwZVxuICAjIFJlc29sdmVzIGEgdHlwZSBkZWNsYXJhdGlvbiB0byBhIHByaW1pdGl2ZSBvciBuZXN0ZWQgdHlwZS4gVXNlZCBpbnRlcm5hbGx5IHdoZW4gbm9ybWFsaXppbmcgYSBzY2hlbWEuXG4gIHJlc29sdmVUeXBlIDogKHR5cGVEZWYpID0+XG4gICAgIyAtIEF0dGVtcHQgdG8gcmVzb2x2ZSB0aGUgdHlwZSBkZWNsYXJhdGlvbiB0byBhIHByaW1pdGl2ZSB0eXBlXG4gICAgdHlwZSA9IEBnZXRQcmltaXRpdmVUeXBlT2YgdHlwZURlZlxuXG4gICAgaWYgIXR5cGU/XG4gICAgICAjIC0gSWYgdGhlIHR5cGUgZGVmaW5pdGlvbiBpcyBhbiBhcnJheSBgW11gXG4gICAgICBpZiBfLmlzQXJyYXkgdHlwZURlZlxuICAgICAgICAjICAgLSBTZXQgdGhlIHR5cGUgdG8gYSBjbG9uZSBvZiB0aGUgYXJyYXkgTkVTVEVEX1RZUEVcbiAgICAgICAgdHlwZSA9IF8uY2xvbmVEZWVwIEBORVNURURfVFlQRVMuQXJyYXlcblxuICAgICAgICAjICAgLSBSZWN1cnNlIHRvIHJlc29sdmUgY2hpbGRUeXBlIG9mIGFycmF5IG1lbWJlcnNcbiAgICAgICAgaWYgdHlwZURlZi5sZW5ndGhcbiAgICAgICAgICBjaGlsZFR5cGUgPSBAcmVzb2x2ZVR5cGUodHlwZURlZlswXSlcblxuICAgICAgICAjICAgLSBUaHJvdyBhbiBlcnJvciBpZiB0eXBlIGlzIG5vdCBleHBsaWNpdGx5IGRlY2xhcmVkXG4gICAgICAgIGlmICFjaGlsZFR5cGUgdGhlbiB0aHJvdyBuZXcgRXJyb3IgXCJFcnJvciByZXNvbHZpbmcgdHlwZSBvZiBhcnJheSB2YWx1ZSAje3R5cGVEZWZ9XCJcblxuICAgICAgICB0eXBlLmNoaWxkVHlwZSA9IGNoaWxkVHlwZVxuICAgICAgICAjICAgLSBXcml0ZSBwYXJzZXIgZm9yIGNoaWxkIG1lbWJlcnMgb2YgdGhlIGFycmF5XG4gICAgICAgIHR5cGUuY2hpbGRQYXJzZXIgPSAodmFsKSAtPlxuICAgICAgICAgIGZvciBpbmRleCwgbWVtYmVyIG9mIHZhbFxuICAgICAgICAgICAgaWYgIWNoaWxkVHlwZS5pZGVudGlmaWVyKG1lbWJlcilcbiAgICAgICAgICAgICAgdmFsW2luZGV4XSA9IGNoaWxkVHlwZS5wYXJzZXIobWVtYmVyKVxuXG4gICAgICAgICAgcmV0dXJuIHZhbFxuXG4gICAgICAgICMjI1xuICAgICAgICAtIElmIHRoZSB0eXBlIGRlZmluaXRpb24gaXMgYW4gb2JqZWN0IGB7fWBcbiAgICAgICAgICAtIENyZWF0ZSBhIG5ldyBTY2hlbWEgZnJvbSB0aGUgb2JqZWN0XG4gICAgICAgICAgLSBUcmVhdCB0aGUgZmllbGQgYXMgYSBuZXN0ZWQgU2NoZW1hXG4gICAgICAgICAgLSBTZXQgaWRlbnRpZmllciBhbmQgcGFyc2VyIGZ1bmN0aW9ucyBpbW1lZGlhdGVseVxuICAgICAgICAjIyNcbiAgICAgIGVsc2UgaWYgXy5pc1BsYWluT2JqZWN0IHR5cGVEZWZcbiAgICAgICAgdHlwZSA9IF8uY2xvbmVEZWVwIEBORVNURURfVFlQRVMuU2NoZW1hXG4gICAgICAgIGNoaWxkVHlwZSA9IHJlcXVpcmUoJy4vTW9kZWxGYWN0b3J5JykuY3JlYXRlIHR5cGVEZWZcbiAgICAgICAgQHJlc29sdmVTY2hlbWFUeXBlIHR5cGUsIGNoaWxkVHlwZVxuXG4gICAgICAgICMjI1xuICAgICAgICAtIElmIHRoZSB0eXBlIGRlZmluaXRpb24gaXMgYSByZWZlcmVuY2UgdG8gYSBTY2hlbWEgY29uc3RydWN0b3JcbiAgICAgICAgICAtIFRyZWF0IHRoZSBmaWVsZCBhcyBhIG5lc3RlZCBTY2hlbWFcbiAgICAgICAgICAtIFNldCBpZGVudGlmaWVyIGFuZCBwYXJzZXIgZnVuY3Rpb25zIGltbWVkaWF0ZWx5XG4gICAgICAgICMjI1xuICAgICAgZWxzZSBpZiBfLmlzRnVuY3Rpb24odHlwZURlZikgJiYgdHlwZURlZi5fX3NjaGVtYUlkXG4gICAgICAgIHR5cGUgPSBfLmNsb25lRGVlcCBATkVTVEVEX1RZUEVTLlNjaGVtYVxuICAgICAgICBjaGlsZFR5cGUgPSB0eXBlRGVmXG4gICAgICAgIEByZXNvbHZlU2NoZW1hVHlwZSB0eXBlLCBjaGlsZFR5cGVcblxuICAgICAgICAjIyNcbiAgICAgICAgLSBJZiB0aGUgdHlwZSBkZWZpbml0aW9uIGlzIGEgc3RyaW5nIHRoYXQgYmVnaW5zIHdpdGggU2NoZW1hOiwgc3VjaCBhcyBgJ1NjaGVtYTpDYXInYFxuICAgICAgICAgIC0gSXQgaXMgYXNzdW1lZCB0aGF0IHRoZSBmaWVsZCBpcyBhIHJlZmVyZW5jZSB0byBhIG5lc3RlZCBTY2hlbWEgdGhhdCB3aWxsIGJlIHJlZ2lzdGVyZWQgd2l0aCB0aGUgbmFtZSBDYXIsXG4gICAgICAgIGJ1dCBtYXkgbm90IGJlIHJlZ2lzdGVyZWQgeWV0XG4gICAgICAgICAgLSBUaGUgU2NoZW1hIGlzIG5vdCByZXNvbHZlZCBpbW1lZGlhdGVseVxuICAgICAgICAgIC0gVGhlIHBhcnNlciBhbmQgaWRlbnRpZmllciBmdW5jdGlvbnMgYXJlIHdyaXR0ZW4gYXMgd3JhcHBlcnMsIHNvIHRoYXQgdGhlIGZpcnN0IHRpbWUgdGhleSBhcmUgaW52b2tlZCB0aGUgU2NoZW1hXG4gICAgICAgIHdpbGwgYmUgbG9va2VkIHVwIGF0IHRoYXQgdGltZSB2aWEgYFNjaGVtaW5nLmdldGAsIGFuZCByZWFsIGlkZW50aWZpZXIgYW5kIHBhcnNlciBhcmUgc2V0IGF0IHRoYXQgdGltZS5cbiAgICAgICAgICAtIElmIHRoZSByZWdpc3RlcmVkIFNjaGVtYSBjYW5ub3QgYmUgcmVzb2x2ZWQsIHRocm93IGFuIGVycm9yLlxuICAgICAgICAjIyNcbiAgICAgIGVsc2UgaWYgXy5pc1N0cmluZyh0eXBlRGVmKSAmJiB0eXBlRGVmWy4uLjddID09ICdTY2hlbWE6J1xuICAgICAgICB0eXBlID0gXy5jbG9uZURlZXAgQE5FU1RFRF9UWVBFUy5TY2hlbWFcbiAgICAgICAgY2hpbGRUeXBlID0gdHlwZURlZls3Li5dXG4gICAgICAgIGZvciBmbiBpbiBbJ2lkZW50aWZpZXInLCAncGFyc2VyJ11cbiAgICAgICAgICBkbyAoZm4pID0+XG4gICAgICAgICAgICB0eXBlW2ZuXSA9ICh2YWwpID0+XG4gICAgICAgICAgICAgIGNoaWxkVHlwZSA9IHJlcXVpcmUoJy4vUmVnaXN0cnknKS5nZXQgY2hpbGRUeXBlXG4gICAgICAgICAgICAgIGlmICFjaGlsZFR5cGVcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IgXCJFcnJvciByZXNvbHZpbmcgI3t0eXBlRGVmfSBvbiBsYXp5IGluaXRpYWxpemF0aW9uXCJcbiAgICAgICAgICAgICAgQHJlc29sdmVTY2hlbWFUeXBlIHR5cGUsIGNoaWxkVHlwZVxuXG4gICAgICAgICAgICAgIHJldHVybiB0eXBlW2ZuXSB2YWxcblxuXG4gICAgcmV0dXJuIHR5cGUgfHwgbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBUeXBlcygpXG4iXX0=
;
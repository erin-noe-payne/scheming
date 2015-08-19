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
          if (required && (val == null)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9lcmluLm5vZS1wYXluZS9sb2NhbC9zY2hlbWluZy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZXJpbi5ub2UtcGF5bmUvbG9jYWwvc2NoZW1pbmcvc3JjL0NoYW5nZU1hbmFnZXIuY29mZmVlIiwiL1VzZXJzL2VyaW4ubm9lLXBheW5lL2xvY2FsL3NjaGVtaW5nL3NyYy9FeHBvcnRCcm93c2VyLmNvZmZlZSIsIi9Vc2Vycy9lcmluLm5vZS1wYXluZS9sb2NhbC9zY2hlbWluZy9zcmMvSW5zdGFuY2VGYWN0b3J5LmNvZmZlZSIsIi9Vc2Vycy9lcmluLm5vZS1wYXluZS9sb2NhbC9zY2hlbWluZy9zcmMvTW9kZWxGYWN0b3J5LmNvZmZlZSIsIi9Vc2Vycy9lcmluLm5vZS1wYXluZS9sb2NhbC9zY2hlbWluZy9zcmMvUmVnaXN0cnkuY29mZmVlIiwiL1VzZXJzL2VyaW4ubm9lLXBheW5lL2xvY2FsL3NjaGVtaW5nL3NyYy9TY2hlbWluZy5jb2ZmZWUiLCIvVXNlcnMvZXJpbi5ub2UtcGF5bmUvbG9jYWwvc2NoZW1pbmcvc3JjL1R5cGVzLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLElBQUEsZ0JBQUE7RUFBQTs7QUFBQSxDQUFBLEdBQUksT0FBQSxDQUFRLFFBQVI7O0FBSUU7MEJBQ0osUUFBQSxHQUNFO0lBQUEsT0FBQSxFQUFVLFNBQVY7SUFDQSxTQUFBLEVBQVksV0FEWjtJQUVBLGVBQUEsRUFBa0IsZ0JBRmxCOzs7MEJBS0YsZUFBQSxHQUFrQjs7RUFFSix1QkFBQTs7Ozs7Ozs7Ozs7O0lBQ1osSUFBQyxDQUFBLE9BQUQsR0FBVztJQUNYLElBQUMsQ0FBQSxtQkFBRCxHQUF1QjtJQUN2QixJQUFDLENBQUEsT0FBRCxHQUFXO0lBRVgsSUFBQyxDQUFBLGNBQUQsR0FBa0I7SUFF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TTtBQUROLFNBSEc7T0FwRFA7O0FBa0VBLFdBQU8sSUFBQSxJQUFRO0VBdEVIOzs7Ozs7QUF3RWhCLE1BQU0sQ0FBQyxPQUFQLEdBQXFCLElBQUEsS0FBQSxDQUFBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIl8gPSByZXF1aXJlICdsb2Rhc2gnXG5cbiMgIyMjIENoYW5nZSBNYW5hZ2VyXG4jIEludGVybmFsIENoYW5nZSBNYW5hZ2VyIGNsYXNzLCByZXNwb25zaWJsZSBmb3IgcXVldWVpbmcgYW5kIHJlc29sdmluZyBjaGFuZ2UgZXZlbnQgcHJvcGFnYXRpb24gZm9yIHdhdGNoZXNcbmNsYXNzIENoYW5nZU1hbmFnZXJcbiAgVEhST1RUTEUgOlxuICAgIFRJTUVPVVQgOiAndGltZW91dCdcbiAgICBJTU1FRElBVEUgOiAnaW1tZWRpYXRlJ1xuICAgIEFOSU1BVElPTl9GUkFNRSA6ICdhbmltYXRpb25GcmFtZSdcblxuICAjIENvbmZpZ3VyYXRpb24gZm9yIGxpbWl0aW5nIG51bWJlciBvZiBpdGVyYXRpb25zXG4gIElURVJBVElPTl9MSU1JVCA6IDEwMFxuXG4gIGNvbnN0cnVjdG9yIDogLT5cbiAgICBAY2hhbmdlcyA9IHt9XG4gICAgQGludGVybmFsQ2hhbmdlUXVldWUgPSBbXVxuICAgIEB0aW1lb3V0ID0gbnVsbFxuXG4gICAgQHJlY3Vyc2lvbkNvdW50ID0gMFxuXG4gICAgQHNldFRocm90dGxlIEBUSFJPVFRMRS5USU1FT1VUXG4gICAgQF9hY3RpdmVDbGVhclRpbWVvdXQgPSBudWxsXG4gICAgQF9xdWV1ZUNhbGxiYWNrID0gbnVsbFxuICAgIEBfcmVzb2x2ZUNhbGxiYWNrID0gbnVsbFxuXG4gICMgIyMjIHNldFRocm90dGxlXG4gICMgU2V0cyB0aGUgdGhyb3R0bGluZyBzdHJhdGVneSB0aGF0IFNjaGVtaW5nIHVzZXMgZm9yIHJlc29sdmluZyBxdWV1ZWQgY2hhbmdlcy5cbiAgc2V0VGhyb3R0bGUgOiAodGhyb3R0bGUpID0+XG4gICAgaWYgIV8uY29udGFpbnMgQFRIUk9UVExFLCB0aHJvdHRsZVxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwiVGhyb3R0bGUgb3B0aW9uIG11c3QgYmUgc2V0IHRvIG9uZSBvZiB0aGUgc3RyYXRlZ2llcyBzcGVjaWZpZWQgb24gU2NoZW1pbmcuVEhST1RUTEVcIlxuXG4gICAgc3dpdGNoIHRocm90dGxlXG4gICAgICB3aGVuIEBUSFJPVFRMRS5USU1FT1VUXG4gICAgICAgIEBzZXRUaW1lb3V0ID0gPT5cbiAgICAgICAgICBAdGltZW91dCA/PSBzZXRUaW1lb3V0IEByZXNvbHZlLCAwXG4gICAgICAgIEBjbGVhclRpbWVvdXQgPSA9PlxuICAgICAgICAgIGNsZWFyVGltZW91dCBAdGltZW91dFxuICAgICAgICAgIEB0aW1lb3V0ID0gbnVsbFxuXG4gICAgICB3aGVuIEBUSFJPVFRMRS5JTU1FRElBVEVcbiAgICAgICAgaWYgc2V0SW1tZWRpYXRlPyAmJiBjbGVhckltbWVkaWF0ZT9cbiAgICAgICAgICBAc2V0VGltZW91dCA9ID0+XG4gICAgICAgICAgICBAdGltZW91dCA/PSBzZXRJbW1lZGlhdGUgQHJlc29sdmVcbiAgICAgICAgICBAY2xlYXJUaW1lb3V0ID0gPT5cbiAgICAgICAgICAgIGNsZWFySW1tZWRpYXRlIEB0aW1lb3V0XG4gICAgICAgICAgICBAdGltZW91dCA9IG51bGxcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGNvbnNvbGUud2FybiBcIkNhbm5vdCB1c2Ugc3RyYXRlZ3kgSU1NRURJQVRFOiBgc2V0SW1tZWRpYXRlYCBvciBgY2xlYXJJbW1lZGlhdGVgIGFyZSBub3QgYXZhaWxhYmxlIGluIHRoZSBjdXJyZW50IGVudmlyb25tZW50LlwiXG4gICAgICAgICAgQHNldFRocm90dGxlIEBUSFJPVFRMRS5USU1FT1VUXG5cbiAgICAgIHdoZW4gQFRIUk9UVExFLkFOSU1BVElPTl9GUkFNRVxuICAgICAgICBpZiByZXF1ZXN0QW5pbWF0aW9uRnJhbWU/ICYmIGNhbmNlbEFuaW1hdGlvbkZyYW1lP1xuICAgICAgICAgIEBzZXRUaW1lb3V0ID0gPT5cbiAgICAgICAgICAgIEB0aW1lb3V0ID89IHJlcXVlc3RBbmltYXRpb25GcmFtZSBAcmVzb2x2ZVxuICAgICAgICAgIEBjbGVhclRpbWVvdXQgPSA9PlxuICAgICAgICAgICAgY2FuY2VsQW5pbWF0aW9uRnJhbWUgQHRpbWVvdXRcbiAgICAgICAgICAgIEB0aW1lb3V0ID0gbnVsbFxuICAgICAgICBlbHNlXG4gICAgICAgICAgY29uc29sZS53YXJuIFwiQ2Fubm90IHVzZSBzdHJhdGVneSBBTklNQVRJT05fRlJBTUU6IGByZXF1ZXN0QW5pbWF0aW9uRnJhbWVgIG9yIGBjYW5jZWxBbmltYXRpb25GcmFtZWAgYXJlIG5vdCBhdmFpbGFibGUgaW4gdGhlIGN1cnJlbnQgZW52aXJvbm1lbnQuXCJcbiAgICAgICAgICBAc2V0VGhyb3R0bGUgQFRIUk9UVExFLlRJTUVPVVRcblxuICAjIFB1c2ggdGhlIHJlc29sdXRpb24gc3RlcCBvbnRvIHRoZSBldmVudCBxdWV1ZSwgb25jZSB0aGUgdGhyZWFkIGhhcyBiZWVuIHJlbGVhc2VkIGZyb21cbiAgIyBhIHN5bmNocm9ub3VzIGJsb2NrIG9mIGNoYW5nZXNcbiAgc2V0VGltZW91dCA6IC0+XG4gICAgdGhyb3cgbmV3IEVycm9yIFwiQSB0aHJvdHRsZSBzdHJhdGVneSBtdXN0IGJlIHNldC5cIlxuXG4gICMgY2xlYXIgdGltZW91dCB0byBndWFyYW50ZWUgcmVzb2x2ZSBpcyBub3QgY2FsbGVkIG1vcmUgdGhhbiBvbmNlLlxuICBjbGVhclRpbWVvdXQgLT5cbiAgICB0aHJvdyBuZXcgRXJyb3IgXCJBIHRocm90dGxlIHN0cmF0ZWd5IG11c3QgYmUgc2V0LlwiXG5cbiAgIyAjIyMgcmVnaXN0ZXJRdWV1ZUNhbGxiYWNrXG4gICMgcmVnaXN0ZXJzIGEgY2FsbGJhY2sgd2hlbiB0aGUgZmlyc3QgU2NoZW1pbmcgY2hhbmdlIGlzIHF1ZXVlZCB3aXRoIHRoZSBjaGFuZ2UgbWFuYWdlci4gVGhpcyBpcyB1c2VmdWwgZm9yIHRlc3RzXG4gIHJlZ2lzdGVyUXVldWVDYWxsYmFjayA6IChjYWxsYmFjaykgPT5cbiAgICBpZiAhXy5pc0Z1bmN0aW9uIGNhbGxiYWNrXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJDYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIlxuICAgIEBfcXVldWVDYWxsYmFjayA9IGNhbGxiYWNrXG5cbiAgIyAjIyMgdW5yZWdpc3RlclF1ZXVlQ2FsbGJhY2tcbiAgIyB1bnJlZ2lzdGVycyBhIGNhbGxiYWNrIHdoZW4gdGhlIGZpcnN0IFNjaGVtaW5nIGNoYW5nZSBpcyBxdWV1ZWQgd2l0aCB0aGUgY2hhbmdlIG1hbmFnZXIuXG4gIHVucmVnaXN0ZXJRdWV1ZUNhbGxiYWNrIDogPT5cbiAgICBAX3F1ZXVlQ2FsbGJhY2sgPSBudWxsXG5cbiAgIyAjIyMgcmVnaXN0ZXJSZXNvbHZlQ2FsbGJhY2tcbiAgIyByZWdpc3RlcnMgYSBjYWxsYmFjayB3aGVuIHRoZSBjaGFuZ2UgbWFuYWdlciBpcyBmaW5pc2hlZCByZXNvbHZpbmcgY2hhbmdlc1xuICByZWdpc3RlclJlc29sdmVDYWxsYmFjayA6IChjYWxsYmFjaykgPT5cbiAgICBpZiAhXy5pc0Z1bmN0aW9uIGNhbGxiYWNrXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJDYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIlxuICAgIEBfcmVzb2x2ZUNhbGxiYWNrID0gY2FsbGJhY2tcblxuICAjICMjIyB1bnJlZ2lzdGVyUmVzb2x2ZUNhbGxiYWNrXG4gICMgdW5yZWdpc3RlcnMgYSBjYWxsYmFjayB3aGVuIHRoZSBjaGFuZ2UgbWFuYWdlciBpcyBmaW5pc2hlZCByZXNvbHZpbmcgY2hhbmdlc1xuICB1bnJlZ2lzdGVyUmVzb2x2ZUNhbGxiYWNrIDogPT5cbiAgICBAX3Jlc29sdmVDYWxsYmFjayA9IG51bGxcbiAgICAjIHJlc2V0IHRoZSB0aGUgY2hhbmdlIG1hbmFnZXIgdG8gYSBwcmlzdGluZSBzdGF0ZVxuXG4gIGNsZWFudXBDeWNsZSA6ID0+XG4gICAgQGNoYW5nZXMgPSB7fVxuICAgIEBpbnRlcm5hbENoYW5nZVF1ZXVlID0gW11cbiAgICBAX2FjdGl2ZUNsZWFyVGltZW91dD8oKVxuICAgIEByZWN1cnNpb25Db3VudCA9IDBcblxuICByZXNldCA6ID0+XG4gICAgQGNoYW5nZXMgPSB7fVxuICAgIEBpbnRlcm5hbENoYW5nZVF1ZXVlID0gW11cbiAgICBAX2FjdGl2ZUNsZWFyVGltZW91dD8oKVxuICAgIEB0aW1lb3V0ID0gbnVsbFxuXG4gICAgQHJlY3Vyc2lvbkNvdW50ID0gMFxuXG4gICAgQHNldFRocm90dGxlIEBUSFJPVFRMRS5USU1FT1VUXG4gICAgQF9xdWV1ZUNhbGxiYWNrID0gbnVsbFxuICAgIEBfcmVzb2x2ZUNhbGxiYWNrID0gbnVsbFxuXG4gICMgUmVnaXN0ZXJzIGNoYW5nZXMgdGhhdCBoYXZlIG9jY3VycmVkIG9uIGFuIGluc3RhbmNlIGJ5IGluc3RhbmNlIGlkLCBob2xkaW5nIGEgcmVmZXJlbmNlIHRvIHRoZSBvcmlnaW5hbCB2YWx1ZVxuICBxdWV1ZUNoYW5nZXMgOiAoe2lkLCBwcm9wTmFtZSwgb2xkVmFsLCBuZXdWYWwsIGVxdWFscywgZm9yY2V9LCBmaXJlV2F0Y2hlcnMpID0+XG4gICAgIyBpZiB0aGVyZSBhcmUgbm8gY2hhbmdlcyB5ZXQgcXVldWVkIGZvciB0aGUgaW5zdGFuY2UsIGFkZCB0byB0aGUgY2hhbmdlcyBoYXNoIGJ5IGlkXG4gICAgaWYgIV8uaGFzIEBjaGFuZ2VzLCBpZFxuICAgICAgQGNoYW5nZXNbaWRdID89IHtjaGFuZ2VkUHJvcHMgOiB7fSwgZmlyZVdhdGNoZXJzfVxuICAgICAgQGludGVybmFsQ2hhbmdlUXVldWUucHVzaCBpZFxuICAgIHtjaGFuZ2VkUHJvcHN9ID0gQGNoYW5nZXNbaWRdXG5cbiAgICBpZiBwcm9wTmFtZVxuICAgICAgIyBpZiB3ZSBhcmUgYWxyZWFkeSB0cmFja2luZyB0aGlzIHByb3BlcnR5LCBhbmQgaXQgaGFzIGJlZW4gcmVzZXQgdG8gaXRzIG9yaWdpbmFsIHZhbHVlLCBjbGVhciBpdCBmcm9tIGNoYW5nZXNcbiAgICAgIGlmIF8uaGFzKGNoYW5nZWRQcm9wcywgcHJvcE5hbWUpICYmIGVxdWFscyhjaGFuZ2VkUHJvcHNbcHJvcE5hbWVdLCBuZXdWYWwpXG4gICAgICAgIGRlbGV0ZSBjaGFuZ2VkUHJvcHNbcHJvcE5hbWVdXG4gICAgICAgICMgaWYgd2UgYXJlIG5vdCB0cmFja2luZyB0aGlzIHByb3BlcnR5IGFuZCBpdCBpcyBiZWluZyBjaGFuZ2VkLCBvciBpZiBmb3JjZSBpcyBmbGFnZ2VkIHRydWUsIGFkZCBpdCB0byBjaGFuZ2VzXG4gICAgICBlbHNlIGlmIGZvcmNlIHx8ICghXy5oYXMoY2hhbmdlZFByb3BzLCBwcm9wTmFtZSkgJiYgIWVxdWFscyhvbGRWYWwsIG5ld1ZhbCkpXG4gICAgICAgIGNoYW5nZWRQcm9wc1twcm9wTmFtZV0gPSBvbGRWYWxcblxuICAgICMgQ2FsbCB0aGUgcXVldWUgY2FsbGJhY2sgaWYgYSB0aW1lb3V0IGhhc24ndCBiZWVuIGRlZmluZWQgeWV0XG4gICAgaWYgIUB0aW1lb3V0P1xuICAgICAgQF9xdWV1ZUNhbGxiYWNrPygpXG4gICAgICBAc2V0VGltZW91dCgpXG4gICAgICBAX2FjdGl2ZUNsZWFyVGltZW91dCA9IEBjbGVhclRpbWVvdXRcblxuICAjIGdldHMgdGhlIHByZXZpb3VzIHN0YXRlIG9mIGEgcXVldWVkIGNoYW5nZVxuICBnZXRRdWV1ZWRDaGFuZ2VzIDogKHtpZCwgcHJvcE5hbWV9KSA9PlxuICAgIHJldHVybiBAY2hhbmdlc1tpZF0/LmNoYW5nZWRQcm9wc1twcm9wTmFtZV1cblxuICAjIFN5bmNocm9ub3VzbHkgY2F1c2UgdGhlIGNoYW5nZSBtYW5hZ2VyIHJlc29sdmUuIE1heSBiZSB1c2VkIGZvciB0ZXN0aW5nIHRvIGF2b2lkIGFzeW5jaHJvbm91cyB0ZXN0cyxcbiAgIyBvciBtYXkgYmUgdXNlZCB0byBmb3JjZSBjaGFuZ2UgcmVzb2x1dGlvbiB3aXRoaW4gY2xpZW50IGNvZGUuXG4gIGZsdXNoIDogPT5cbiAgICBAcmVzb2x2ZSgpXG5cbiAgIyByZXNvbHZlcyBxdWV1ZWQgY2hhbmdlcywgZmlyaW5nIHdhdGNoZXJzIG9uIGluc3RhbmNlcyB0aGF0IGhhdmUgY2hhbmdlZFxuICByZXNvbHZlIDogPT5cbiAgICBAcmVjdXJzaW9uQ291bnQrK1xuICAgICMgdHJhY2sgaXRlcmF0aW9uIGNvdW50IGFuZCB0aHJvdyBhbiBlcnJvciBhZnRlciBzb21lIGxpbWl0IHRvIHByZXZlbnQgaW5maW5pdGUgbG9vcHNcbiAgICBpZiBASVRFUkFUSU9OX0xJTUlUID4gMCAmJiBAcmVjdXJzaW9uQ291bnQgPiBASVRFUkFUSU9OX0xJTUlUXG4gICAgICBjaGFuZ2VzID0gQGNoYW5nZXNcbiAgICAgIEBjbGVhbnVwQ3ljbGUoKVxuICAgICAgIyBUT0RPOiB0cnkgdG8gbWFrZSBhIG1vcmUgbWVhbmluZ2Z1bCBlcnJvciBtZXNzYWdlIGZyb20gdGhlIGluc3RhbmNlcyAoc2NoZW1hIHR5cGUsIHByb3BlcnRpZXMsIGV0YylcbiAgICAgIHRocm93IG5ldyBFcnJvciBcIlwiXCJBYm9ydGluZyBjaGFuZ2UgcHJvcGFnYXRpb24gYWZ0ZXIgI3tASVRFUkFUSU9OX0xJTUlUfSBjeWNsZXMuXG4gICAgICAgIFRoaXMgaXMgcHJvYmFibHkgaW5kaWNhdGl2ZSBvZiBhIGNpcmN1bGFyIHdhdGNoLiBDaGVjayB0aGUgZm9sbG93aW5nIHdhdGNoZXMgZm9yIGNsdWVzOlxuICAgICAgICAje0pTT04uc3RyaW5naWZ5KGNoYW5nZXMpfVwiXCJcIlxuXG4gICAgIyBBIHNpbmdsZSBpZCBtYXkgaGF2ZSBiZWVuIHB1c2hlZCB0byB0aGUgY2hhbmdlIHF1ZXVlIG1hbnkgdGltZXMsIHRvIHRha2UgYSB1bmlxdWUgbGlzdCBvZiBpZHMuXG4gICAgaW50ZXJuYWxDaGFuZ2VzID0gXy51bmlxdWUgQGludGVybmFsQ2hhbmdlUXVldWVcbiAgICAjIEltbWVkaWF0ZWx5IHJlc2V0IHRoZSBzdGF0ZSBvZiB0aGUgY2hhbmdlIHF1ZXVlXG4gICAgQGludGVybmFsQ2hhbmdlUXVldWUgPSBbXVxuXG4gICAgIyBGaXJlIGludGVybmFsIHdhdGNoZXJzIG9uIGFsbCBpbnN0YW5jZXMgdGhhdCBoYXZlIGNoYW5nZWQuIFRoaXMgd2lsbCBjYXVzZSB0aGUgY2hhbmdlIGV2ZW50IHRvIHByb3BhZ2F0ZSB0b1xuICAgICMgYW55IHBhcmVudCBzY2hlbWFzLCB3aG9zZSBjaGFuZ2VzIHdpbGwgcG9wdWxhdGUgYEBpbnRlcm5hbENoYW5nZVF1ZXVlYFxuICAgIGZvciBpZCBpbiBpbnRlcm5hbENoYW5nZXNcbiAgICAgIHtjaGFuZ2VkUHJvcHMsIGZpcmVXYXRjaGVyc30gPSBAY2hhbmdlc1tpZF1cbiAgICAgIGZpcmVXYXRjaGVycyBjaGFuZ2VkUHJvcHMsICdpbnRlcm5hbCdcbiAgICAgICMgaWYgYW55IG5ldyBpbnRlcm5hbCBjaGFuZ2VzIHdlcmUgcmVnaXN0ZXJlZCwgcmVjdXJzaXZlbHkgY2FsbCByZXNvbHZlIHRvIGNvbnRpbnVlIHByb3BhZ2F0aW9uXG4gICAgaWYgQGludGVybmFsQ2hhbmdlUXVldWUubGVuZ3RoXG4gICAgICByZXR1cm4gQHJlc29sdmUoKVxuXG4gICAgIyBPbmNlIGludGVybmFsIHdhdGNoZXMgaGF2ZSBmaXJlZCB3aXRob3V0IGNhdXNpbmcgYSBjaGFuZ2Ugb24gYSBwYXJlbnQgc2NoZW1hIGluc3RhbmNlLCB0aGVyZSBhcmUgbm8gbW9yZSBjaGFuZ2VzXG4gICAgIyB0byBwcm9wYWdhdGUuIEF0IHRoaXMgcG9pbnQgYWxsIGNoYW5nZXMgb24gZWFjaCBpbnN0YW5jZSBoYXZlIGJlZW4gYWdncmVnYXRlZCBpbnRvIGEgc2luZ2xlIGNoYW5nZSBzZXQuIE5vd1xuICAgICMgZmlyZSBhbGwgZXh0ZXJuYWwgd2F0Y2hlcnMgb24gZWFjaCBpbnN0YW5jZS5cbiAgICBjaGFuZ2VzID0gQGNoYW5nZXNcbiAgICAjIEltbWVkaWF0ZWx5IHJlc2V0IHRoZSBjaGFuZ2Ugc2V0XG4gICAgQGNoYW5nZXMgPSB7fVxuXG4gICAgIyBGaXJlIGFsbCBleHRlcm5hbCB3YXRjaGVyc1xuICAgIGZvciBpZCBvZiBjaGFuZ2VzXG4gICAgICB7Y2hhbmdlZFByb3BzLCBmaXJlV2F0Y2hlcnN9ID0gY2hhbmdlc1tpZF1cbiAgICAgIGZpcmVXYXRjaGVycyBjaGFuZ2VkUHJvcHMsICdleHRlcm5hbCdcblxuICAgICAgIyBJZiBhbnkgZXh0ZXJuYWwgd2F0Y2hlcyBjYXVzZWQgbmV3IGNoYW5nZXMgdG8gYmUgcXVldWVkLCByZS1ydW4gcmVzb2x2ZSB0byBlbnN1cmUgcHJvcGFnYXRpb25cbiAgICBpZiBfLnNpemUoQGNoYW5nZXMpID4gMFxuICAgICAgcmV0dXJuIEByZXNvbHZlKClcblxuICAgICMgSWYgd2UgZ2V0IGhlcmUsIGFsbCBjaGFuZ2VzIGhhdmUgYmVlbiBmdWxseSBwcm9wYWdhdGVkLiBSZXNldCBjaGFuZ2UgbWFuYWdlciBzdGF0ZSB0byBwcmlzdGluZSBqdXN0IGZvciBleHBsaWNpdG5lc3NcbiAgICBAX3Jlc29sdmVDYWxsYmFjaz8oKVxuICAgIEBjbGVhbnVwQ3ljbGUoKVxuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBDaGFuZ2VNYW5hZ2VyKCkiLCJfID0gd2luZG93Ll9cblxud2luZG93LlNjaGVtaW5nID0gcmVxdWlyZSAnLi9TY2hlbWluZydcbiIsIl8gPSByZXF1aXJlICdsb2Rhc2gnXG5UeXBlcyA9IHJlcXVpcmUgJy4vVHlwZXMnXG5DaGFuZ2VNYW5hZ2VyID0gcmVxdWlyZSAnLi9DaGFuZ2VNYW5hZ2VyJ1xuXG5cblxuXG5jbGFzcyBJbnN0YW5jZUZhY3RvcnlcbiAgIyBBcyBsaXN0ZWQgYnkgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvQXJyYXkjTXV0YXRvcl9tZXRob2RzXG4gIEFSUkFZX01VVEFUT1JTIDogWydjb3B5V2l0aGluJywgJ2ZpbGwnLCAncHVzaCcsICdwb3AnLCAncmV2ZXJzZScsICdzaGlmdCcsICdzb3J0JywgJ3NwbGljZScsICd1bnNoaWZ0J11cblxuICAjIFV1aWQgZ2VuZXJhdG9yIGZvciBhbm9ueW1vdXMgU2NoZW1hIGlkc1xuICB1dWlkIDogPT5cbiAgICBub3cgPSBEYXRlLm5vdygpXG4gICAgJ3h4eHh4eHh4LXh4eHgtNHh4eC15eHh4LXh4eHh4eHh4eHh4eCcucmVwbGFjZSAvW3h5XS9nLCAoYykgLT5cbiAgICAgIHIgPSAobm93ICsgTWF0aC5yYW5kb20oKSAqIDE2KSAlIDE2IHwgMFxuICAgICAgbm93ID0gTWF0aC5mbG9vciBub3cgLyAxNlxuICAgICAgKChpZiBjIGlzIFwieFwiIHRoZW4gciBlbHNlIChyICYgMHgzIHwgMHg4KSkpLnRvU3RyaW5nIDE2XG5cbiAgIyAjIyBJbnN0YW5jZVxuICAjIEZhY3RvcnkgbWV0aG9kIHRoYXQgYnVpbGRzIGEgTW9kZWwgaW5zdGFuY2VcbiAgY3JlYXRlIDogKGluc3RhbmNlLCBub3JtYWxpemVkU2NoZW1hLCBpbml0aWFsU3RhdGUsIG9wdHMpID0+XG4gICAgIyBmbGFnIHRvIGluZGljYXRlIGluaXRpYWxpemluZyBzdGF0ZSBvZiBpbnN0YW5jZVxuICAgIF9pbml0aWFsaXppbmcgPSB0cnVlXG4gICAgIyBkYXRhIGhhc2ggd3JhcHBlZCBpbiBjbG9zdXJlLCBrZWVwcyBhY3R1YWwgZGF0YSBtZW1iZXJzIHByaXZhdGVcbiAgICBkYXRhID0ge31cbiAgICAjIHByaXZhdGUgd2F0Y2hlcnMgYXJyYXkuIEV4dGVybmFsIHdhdGNoZXMgLSB0aG9zZSBzZXQgYnkgY29uc3VtaW5nIGNsaWVudCBjb2RlIC0gYXJlIHRyYWNrZWQgc2VwYXJhdGVseSBmcm9tXG4gICAgIyBpbnRlcm5hbCB3YXRjaGVzIC0gdGhvc2UgdG8gd2F0Y2ggY2hhbmdlIHByb3BhZ2F0aW9uIG9uIG5lc3RlZCBzY2hlbWFzXG4gICAgd2F0Y2hlcnMgPVxuICAgICAgaW50ZXJuYWwgOiBbXVxuICAgICAgZXh0ZXJuYWwgOiBbXVxuICAgICMgVGhlIHVud2F0Y2ggZnVuY3Rpb25zIGZyb20gaW50ZXJuYWwgd2F0Y2hlc1xuICAgIHVud2F0Y2hlcnMgPSB7fVxuXG4gICAgIyBTZXQgYW4gaWQgb24gZWFjaCBpbnN0YW5jZSB0aGF0IGlzIG5vdCBleHBvc2VkLCBpcyB1c2VkIGludGVybmFsbHkgb25seSBmb3IgY2hhbmdlIG1hbmFnZW1lbnRcbiAgICBpZCA9IEB1dWlkKClcblxuICAgIHtzdHJpY3QsIHNlYWx9ID0gb3B0c1xuXG4gICAgIyAjIyMgUHJvcGVydHkgU2V0dGVyXG4gICAgc2V0ID0gKHByb3BOYW1lLCB2YWwpID0+XG4gICAgICBwcmV2VmFsID0gZGF0YVtwcm9wTmFtZV1cblxuICAgICAgIyBpZiB0aGUgcHJvcGVydHkgaXMgbm90IGEgcGFydCBvZiB0aGUgc2NoZW1hLCBzaW1wbHkgc2V0IGl0IG9uIHRoZSBpbnN0YW5jZS5cbiAgICAgICMgaWYgdGhlIHNlYWwgb3B0aW9uIGlzIGVuYWJsZWQgdGhpcyB3aWxsIGZhaWwgc2lsZW50bHksIG90aGVyd2lzZSBpdCB3aWxsIGFsbG93IGZvciBhcmJpdHJhcnkgcHJvcGVydGllc1xuICAgICAgaWYgIW5vcm1hbGl6ZWRTY2hlbWFbcHJvcE5hbWVdXG4gICAgICAgIHJldHVybiBpbnN0YW5jZVtwcm9wTmFtZV0gPSB2YWxcblxuICAgICAgIyByZXRyaWV2ZSB0aGUgdHlwZSwgZ2V0dGVyLCBhbmQgc2V0dGVyIGZyb20gdGhlIG5vcm1hbGl6ZWQgZmllbGQgY29uZmlnXG4gICAgICB7dHlwZSwgc2V0dGVyfSA9IG5vcm1hbGl6ZWRTY2hlbWFbcHJvcE5hbWVdXG5cbiAgICAgICMgLSBJZiBhIHByb3BlcnR5IGlzIHNldCB0byB1bmRlZmluZWQsIGRvIG5vdCB0eXBlIGNhc3Qgb3IgcnVuIHRocm91Z2ggc2V0dGVyLlxuICAgICAgIyBZb3Ugc2hvdWxkIGFsd2F5cyBiZSBhYmxlIHRvIGNsZWFyIGEgcHJvcGVydHkuXG4gICAgICBpZiB2YWw/XG4gICAgICAgICMgLSBJZiBhIHNldHRlciBpcyBkZWZpbmVkLCBydW4gdGhlIHZhbHVlIHRocm91Z2ggc2V0dGVyXG4gICAgICAgIGlmIHNldHRlclxuICAgICAgICAgIHZhbCA9IHNldHRlci5jYWxsIGluc3RhbmNlLCB2YWxcbiAgICAgICAgIyAtIElmIHZhbHVlIGlzIG5vdCB1bmRlZmluZWQsIHJ1biB0aHJvdWdoIHR5cGUgaWRlbnRpZmllciB0byBkZXRlcm1pbmUgaWYgaXQgaXMgdGhlIGNvcnJlY3QgdHlwZVxuICAgICAgICBpZiAhdHlwZS5pZGVudGlmaWVyKHZhbClcbiAgICAgICAgICAjICAgLSBJZiBub3QgYW5kIHN0cmljdCBtb2RlIGlzIGVuYWJsZWQsIHRocm93IGFuIGVycm9yXG4gICAgICAgICAgaWYgc3RyaWN0IHRoZW4gdGhyb3cgbmV3IEVycm9yIFwiRXJyb3IgYXNzaWduaW5nICN7dmFsfSB0byAje3Byb3BOYW1lfS4gVmFsdWUgaXMgbm90IG9mIHR5cGUgI3t0eXBlLnN0cmluZ31cIlxuICAgICAgICAgICMgICAtIE90aGVyd2lzZSwgdXNlIHBhcnNlciB0byBjYXN0IHRvIHRoZSBjb3JyZWN0IHR5cGVcbiAgICAgICAgICB2YWwgPSB0eXBlLnBhcnNlciB2YWxcbiAgICAgICAgIyAtIElmIHRoZSBwcm9wZXJ0eSB0eXBlIGlzIG9mIGFycmF5LCBwZXJmb3JtIHBhcnNpbmcgb24gY2hpbGQgbWVtYmVycy5cbiAgICAgICAgaWYgdHlwZS5zdHJpbmcgPT0gVHlwZXMuTkVTVEVEX1RZUEVTLkFycmF5LnN0cmluZ1xuICAgICAgICAgIHZhbCA9IHR5cGUuY2hpbGRQYXJzZXIgdmFsXG4gICAgICAgICAgIyBBZGQgYSB1bmlxdWUgYXJyYXlJZCB0byBzY2hlbWluZyBhcnJheXMgdG8gaWRlbnRpZnkgdGhlIHNvdXJjZSBvZiBjaGFuZ2VzXG4gICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5IHZhbCwgJ19hcnJheUlkJyxcbiAgICAgICAgICAgIGNvbmZpZ3VyYWJsZSA6IHRydWVcbiAgICAgICAgICAgIHZhbHVlIDogQHV1aWQoKVxuICAgICAgICAgICMgT3ZlcndyaXRlIG11dGF0b3IgZnVuY3Rpb25zIG9uIHRoaXMgYXJyYXkgY2FwdHVyZSBhbmQgcXVldWUgdGhlIG11dGF0aW9uLiBUaGlzIGd1YXJhbnRlZXNcbiAgICAgICAgICAjIHRoYXQgb3RoZXJ3aXNlIG11dGF0aW5nIGNoYW5nZXMgYXJlIHJ1biB0aHJvdWdoIHRoZSBzZXR0ZXJzIGFuZCBjaGFuZ2VzIGFyZSBjYXB0dXJlZC5cbiAgICAgICAgICBfLmVhY2ggQEFSUkFZX01VVEFUT1JTLCAobWV0aG9kKSAtPlxuICAgICAgICAgICAgaWYgcHJldlZhbD8gJiYgcHJldlZhbFttZXRob2RdXG4gICAgICAgICAgICAgIGRlbGV0ZSBwcmV2VmFsW21ldGhvZF1cblxuICAgICAgICAgICAgaWYgQXJyYXkucHJvdG90eXBlW21ldGhvZF0/XG4gICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSB2YWwsIG1ldGhvZCxcbiAgICAgICAgICAgICAgICBjb25maWd1cmFibGUgOiB0cnVlXG4gICAgICAgICAgICAgICAgd3JpdGFibGUgOiB0cnVlXG4gICAgICAgICAgICAgICAgdmFsdWUgOiAtPlxuICAgICAgICAgICAgICAgICAgY2xvbmUgPSBfLmNsb25lIEBcbiAgICAgICAgICAgICAgICAgIHRvUmV0dXJuID0gQXJyYXkucHJvdG90eXBlW21ldGhvZF0uY2FsbCBALCBhcmd1bWVudHMuLi5cbiAgICAgICAgICAgICAgICAgIENoYW5nZU1hbmFnZXIucXVldWVDaGFuZ2VzIHtpZCwgcHJvcE5hbWUsIG9sZFZhbCA6IGNsb25lLCBuZXdWYWwgOiB2YWwsIGVxdWFscyA6IHR5cGUuZXF1YWxzfSwgZmlyZVdhdGNoZXJzXG4gICAgICAgICAgICAgICAgICBpbnN0YW5jZVtwcm9wTmFtZV0gPSBAXG4gICAgICAgICAgICAgICAgICByZXR1cm4gdG9SZXR1cm5cblxuXG4gICAgICAjIC0gQXNzaWduIHRvIHRoZSBkYXRhIGhhc2hcbiAgICAgIGRhdGFbcHJvcE5hbWVdID0gdmFsXG4gICAgICAjIC0gSWYgdGhlIHZhbHVlIGJlaW5nIGFzc2lnbmVkIGlzIG9mIHR5cGUgc2NoZW1hLCB3ZSBuZWVkIHRvIGxpc3RlbiBmb3IgY2hhbmdlcyB0byBwcm9wYWdhdGVcbiAgICAgIHdhdGNoRm9yUHJvcGFnYXRpb24gcHJvcE5hbWUsIHZhbFxuICAgICAgIyAtIFF1ZXVlIHVwIGEgY2hhbmdlIHRvIGZpcmUsIHVubGVzcyB5b3UgYXJlIHNldHRpbmcgdGhlIGluaXRpYWwgc3RhdGUgb2YgdGhlIGluc3RhbmNlXG4gICAgICBpZiAhX2luaXRpYWxpemluZ1xuICAgICAgICBDaGFuZ2VNYW5hZ2VyLnF1ZXVlQ2hhbmdlcyB7aWQsIHByb3BOYW1lLCBvbGRWYWwgOiBwcmV2VmFsLCBuZXdWYWwgOiB2YWwsIGVxdWFscyA6IHR5cGUuZXF1YWxzfSwgZmlyZVdhdGNoZXJzXG5cbiAgICAjICMjIyBQcm9wZXJ0eSBHZXR0ZXJcbiAgICBnZXQgPSAocHJvcE5hbWUpIC0+XG4gICAgICAjIHJldHJpZXZlIHRoZSB0eXBlLCBnZXR0ZXIsIGFuZCBzZXR0ZXIgZnJvbSB0aGUgbm9ybWFsaXplZCBmaWVsZCBjb25maWdcbiAgICAgIHtnZXR0ZXJ9ID0gbm9ybWFsaXplZFNjaGVtYVtwcm9wTmFtZV1cblxuICAgICAgIyAtIFJldHJpZXZlIGRhdGEgdmFsdWUgZnJvbSB0aGUgaGFzaFxuICAgICAgdmFsID0gZGF0YVtwcm9wTmFtZV1cbiAgICAgICMgLSBJZiBnZXR0ZXIgaXMgZGVmaW5lZCwgcnVuIHZhbHVlIHRocm91Z2ggZ2V0dGVyXG4gICAgICBpZiBnZXR0ZXJcbiAgICAgICAgdmFsID0gZ2V0dGVyLmNhbGwgaW5zdGFuY2UsIHZhbFxuICAgICAgIyAtIEZpbmFsbHksIHJldHVybiB0aGUgdmFsdWVcbiAgICAgIHJldHVybiB2YWxcblxuICAgICMgQWRkcyBhIHdhdGNoZXIgdG8gdGhlIGluc3RhbmNlXG4gICAgYWRkV2F0Y2hlciA9IChwcm9wZXJ0aWVzLCBjYiwgb3B0cykgLT5cbiAgICAgICMgcHJvcGVydGllcyBhbmQgb3B0cyBhcmd1bWVudHMgYXJlIG9wdGlvbmFsXG4gICAgICBpZiBfLmlzRnVuY3Rpb24gcHJvcGVydGllc1xuICAgICAgICBvcHRzID0gY2JcbiAgICAgICAgY2IgPSBwcm9wZXJ0aWVzXG4gICAgICAgICMgaWYgbm8gcHJvcGVydGllcyBhcmUgc3BlY2lmaWVkLCB0aGUgd2F0Y2hlciBpcyByZWdpc3RlcmVkIHRvIHdhdGNoIGFsbCBwcm9wZXJ0aWVzIG9mIHRoZSBvYmplY3RcbiAgICAgICAgcHJvcGVydGllcyA9IF8ua2V5cyBub3JtYWxpemVkU2NoZW1hXG5cbiAgICAgICMgdW5sZXNzIHNwZWNpZmllZCwgYSB3YXRjaCBpcyBhc3N1bWVkIHRvIGJlIGV4dGVybmFsLiBDbGluZXQgY29kZSBzaG91bGQgbm90IHNldCB3YXRjaGVzIGFzIGludGVybmFsIVxuICAgICAgIyBCZWhhdmlvciBpcyB1bmRlZmluZWQuXG4gICAgICBvcHRzID89IHt9XG4gICAgICBvcHRzLmludGVybmFsID89IGZhbHNlXG5cbiAgICAgIHRhcmdldCA9IGlmIG9wdHMuaW50ZXJuYWwgdGhlbiAnaW50ZXJuYWwnIGVsc2UgJ2V4dGVybmFsJ1xuXG4gICAgICBpZiAhXy5pc0Z1bmN0aW9uIGNiXG4gICAgICAgIHRocm93IG5ldyBFcnJvciAnQSB3YXRjaCBtdXN0IGJlIHByb3ZpZGVkIHdpdGggYSBjYWxsYmFjayBmdW5jdGlvbi4nXG5cbiAgICAgICMgQ2FzdCB0aGUgcHJvcGVydGllcyB0byBhbiBhcnJheS4gQSB3YXRjaCBjYW4gc3VwcG9ydCBvbmUgb3IgbW9yZSBwcm9wZXJ0eSBuYW1lcy5cbiAgICAgIGlmIHByb3BlcnRpZXMgJiYgIV8uaXNBcnJheSBwcm9wZXJ0aWVzXG4gICAgICAgIHByb3BlcnRpZXMgPSBbcHJvcGVydGllc11cblxuICAgICAgIyBUaHJvdyBhbiBlcnJvciBpZiBjbGllbnQgY29kZSBhdHRlbXB0cyB0byBzZXQgYSB3YXRjaCBvbiBhIHByb3BlcnR5IHRoYXQgaXMgbm90IGRlZmluZWQgYXMgcGFydCBvZiB0aGUgc2NoZW1hLlxuICAgICAgZm9yIHByb3BOYW1lIGluIHByb3BlcnRpZXNcbiAgICAgICAgaWYgIV8uaGFzIG5vcm1hbGl6ZWRTY2hlbWEsIHByb3BOYW1lXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yIFwiQ2Fubm90IHNldCB3YXRjaCBvbiAje3Byb3BOYW1lfSwgcHJvcGVydHkgaXMgbm90IGRlZmluZWQgaW4gc2NoZW1hLlwiXG5cbiAgICAgICMgUmVnaXN0ZXIgdGhlIHdhdGNoZXIgb24gdGhlIGNvcnJlY3QgaW50ZXJuYWwgb3IgZXh0ZXJuYWwgd2F0Y2hlcnMgYXJyYXkuIEZsYWcgbmV3IGV4dGVybmFsIHdhdGNoZXJzIHdpdGggYGZpcnN0YFxuICAgICAgIyBzbyB0aGF0IHRoZXkgd2lsbCBnZXQgY2FsbGVkIG9uIHRoZSBmaXJzdCBjaGFuZ2UgbG9vcCwgcmVnYXJkbGVzcyBvZiB3aGV0aGVyIHRoZSB3YXRjaCBwcm9wZXJ0aWVzIGhhdmUgY2hhbmdlZC5cbiAgICAgICMgSW50ZXJuYWwgd2F0Y2hlcnMgZG8gbm90IG5lZWQgdG8gYmUgaW52b2tlZCBvbiBmaXJzdCB3YXRjaC5cbiAgICAgIHdhdGNoZXIgPSB7cHJvcGVydGllcywgY2IsIGZpcnN0IDogIW9wdHMuaW50ZXJuYWx9XG4gICAgICB3YXRjaGVyc1t0YXJnZXRdLnB1c2ggd2F0Y2hlclxuXG4gICAgICAjIFF1ZXVlIGEgY2hhbmdlIGV2ZW50IG9uIHRoZSBjaGFuZ2UgbWFuYWdlci5cbiAgICAgIENoYW5nZU1hbmFnZXIucXVldWVDaGFuZ2VzIHtpZH0sIGZpcmVXYXRjaGVyc1xuXG4gICAgICAjIHJldHVybiBhbiB1bndhdGNoIGZ1bmN0aW9uXG4gICAgICByZXR1cm4gLT5cbiAgICAgICAgcmVtb3ZlV2F0Y2hlciB3YXRjaGVyLCB0YXJnZXRcblxuICAgICMgUmVtb3ZlIGEgd2F0Y2ggbGlzdGVuZXIgZnJvbSB0aGUgYXBwcm9wcmFpdGUgd2F0Y2hlcnMgYXJyYXlcbiAgICByZW1vdmVXYXRjaGVyID0gKHdhdGNoZXIsIHRhcmdldCkgLT5cbiAgICAgIF8ucmVtb3ZlIHdhdGNoZXJzW3RhcmdldF0sIHdhdGNoZXJcblxuICAgICMgVGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgb24gdmFsdWUgYXNzaWdubWVudFxuICAgIHdhdGNoRm9yUHJvcGFnYXRpb24gPSAocHJvcE5hbWUsIHZhbCkgLT5cbiAgICAgIHt0eXBlfSA9IG5vcm1hbGl6ZWRTY2hlbWFbcHJvcE5hbWVdXG5cbiAgICAgICMgSWYgdGhlIGFzc2lnbmVkIHByb3BlcnR5IGlzIG9mIHR5cGUgc2NoZW1hLCB3ZSBuZWVkIHRvIGxpc3RlbiBmb3IgY2hhbmdlcyBvbiB0aGUgY2hpbGQgaW5zdGFuY2UgdG8gcHJvcGFnYXRlXG4gICAgICAjIGNoYW5nZXMgdG8gdGhpcyBpbnN0YW5jZVxuICAgICAgaWYgdHlwZS5zdHJpbmcgPT0gVHlwZXMuTkVTVEVEX1RZUEVTLlNjaGVtYS5zdHJpbmdcbiAgICAgICAgIyBJZiB0aGVyZSB3YXMgYSB3YXRjaGVyIGZyb20gdGhlIHByZXZpb3VzbHkgYXNzaWduZWQgdmFsdWUsIHN0b3AgbGlzdGVuaW5nLlxuICAgICAgICB1bndhdGNoZXJzW3Byb3BOYW1lXT8oKVxuICAgICAgICAjIFdhdGNoIHRoZSBuZXcgdmFsdWUgZm9yIGNoYW5nZXMgYW5kIHByb3BhZ2F0ZSB0aGlzIGNoYW5nZXMgdG8gdGhpcyBpbnN0YW5jZS4gRmxhZyB0aGUgd2F0Y2ggYXMgaW50ZXJuYWwuXG4gICAgICAgIHVud2F0Y2hlcnNbcHJvcE5hbWVdID0gdmFsPy53YXRjaCAobmV3VmFsLCBvbGRWYWwpLT5cbiAgICAgICAgICBDaGFuZ2VNYW5hZ2VyLnF1ZXVlQ2hhbmdlcyB7aWQsIHByb3BOYW1lLCBvbGRWYWwsIG5ld1ZhbCwgZXF1YWxzOiB0eXBlLmVxdWFsc30sIGZpcmVXYXRjaGVyc1xuICAgICAgICAsIGludGVybmFsIDogdHJ1ZVxuXG4gICAgICAjIElmIHRoZSBhc3NpZ25lZCBwcm9wZXJ0eSBpcyBhbiBhcnJheSBvZiB0eXBlIHNjaGVtYSwgc2V0IGEgd2F0Y2ggb24gZWFjaCBhcnJheSBtZW1lYmVyLlxuICAgICAgaWYgdHlwZS5zdHJpbmcgPT0gVHlwZXMuTkVTVEVEX1RZUEVTLkFycmF5LnN0cmluZyBhbmQgdHlwZS5jaGlsZFR5cGUuc3RyaW5nID09IFR5cGVzLk5FU1RFRF9UWVBFUy5TY2hlbWEuc3RyaW5nXG4gICAgICAgICMgSWYgdGhlcmUgd2VyZSB3YXRjaGVycyBvbiB0aGUgcHJldmlvdXMgYXJyYXkgbWVtYmVycywgY2xlYXIgdGhvc2UgbGlzdGVuZXJzLlxuICAgICAgICBmb3IgdW53YXRjaGVyIGluICh1bndhdGNoZXJzW3Byb3BOYW1lXSB8fCBbXSlcbiAgICAgICAgICB1bndhdGNoZXI/KClcbiAgICAgICAgIyByZXNldCB0aGUgdW53YXRjaGVycyBhcnJheVxuICAgICAgICB1bndhdGNoZXJzW3Byb3BOYW1lXSA9IFtdXG4gICAgICAgIF8uZWFjaCB2YWwsIChzY2hlbWEsIGkpIC0+XG4gICAgICAgICAgIyBzZXQgYSBuZXcgd2F0Y2ggb24gZWFjaCBhcnJheSBtZW1iZXIgdG8gcHJvcGFnYXRlIGNoYW5nZXMgdG8gdGhpcyBpbnN0YW5jZS4gRmxhZyB0aGUgd2F0Y2ggYXMgaW50ZXJuYWwuXG4gICAgICAgICAgdW53YXRjaGVyc1twcm9wTmFtZV0ucHVzaCBzY2hlbWE/LndhdGNoIChuZXdWYWwsIG9sZFZhbCktPlxuICAgICAgICAgICAgbmV3QXJyYXkgPSBpbnN0YW5jZVtwcm9wTmFtZV1cbiAgICAgICAgICAgICMgY2hlY2sgaWYgdGhlcmUgaXMgYWxyZWFkeSBhIHF1ZXVlZCBjaGFuZ2UgZm9yIHRoaXMgYXJyYXlcbiAgICAgICAgICAgIG9sZEFycmF5ID0gQ2hhbmdlTWFuYWdlci5nZXRRdWV1ZWRDaGFuZ2VzIHtpZCwgcHJvcE5hbWV9XG4gICAgICAgICAgICAjIGlmIHRoZXJlIGlzIG5vdCwgY2xvbmUgdGhlIGN1cnJlbnQgc3RhdGUgb2YgdGhlIGFycmF5LCBpbmNsdWRpbmcgdGhlIGFycmF5SWRcbiAgICAgICAgICAgIGlmICFvbGRBcnJheT9cbiAgICAgICAgICAgICAgb2xkQXJyYXkgPz0gXy5jbG9uZSBuZXdBcnJheVxuICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkgb2xkQXJyYXksICdfYXJyYXlJZCcsXG4gICAgICAgICAgICAgICAgY29uZmlndXJhYmxlIDogdHJ1ZVxuICAgICAgICAgICAgICAgIHZhbHVlIDogbmV3QXJyYXkuX2FycmF5SWRcbiAgICAgICAgICAgICMgaWYgdGhlIHNvdXJjZSBvZiB0aGlzIGNobmFnZSBpcyB0aGUgc2FtZSBhcyB0aGUgYWxyZWFkeSBxdWV1ZWQgYXJyYXksIHByb3BhZ2F0ZSB0aGUgY2hhbmdlXG4gICAgICAgICAgICBpZiBvbGRBcnJheS5fYXJyYXlJZCA9PSBuZXdBcnJheS5fYXJyYXlJZFxuICAgICAgICAgICAgICBvbGRBcnJheVtpXSA9IG9sZFZhbFxuICAgICAgICAgICAgICBDaGFuZ2VNYW5hZ2VyLnF1ZXVlQ2hhbmdlcyB7aWQsIHByb3BOYW1lLCBvbGRWYWwgOiBvbGRBcnJheSwgbmV3VmFsIDogbmV3QXJyYXksIGVxdWFscyA6IHR5cGUuZXF1YWxzLCBmb3JjZTogdHJ1ZX0sIGZpcmVXYXRjaGVyc1xuICAgICAgICAgICwgaW50ZXJuYWwgOiB0cnVlXG5cbiAgICAjIEdpdmVuIGEgY2hhbmdlIHNldCwgZmlyZXMgYWxsIHdhdGNoZXJzIHRoYXQgYXJlIHdhdGNoaW5nIG9uZSBvciBtb3JlIG9mIHRoZSBjaGFuZ2VkIHByb3BlcnRpZXNcbiAgICBmaXJlV2F0Y2hlcnMgPSAocXVldWVkQ2hhbmdlcywgdGFyZ2V0PSdleHRlcm5hbCcpIC0+XG4gICAgICB0cmlnZ2VyaW5nUHJvcGVydGllcyA9IF8ua2V5cyBxdWV1ZWRDaGFuZ2VzXG5cbiAgICAgICMgUmV0cmlldmVzIHRoZSBwcmV2aW91cyB2YWx1ZSBmb3IgYSBwcm9wZXJ0eSwgcHVsbGluZyBmcm9tIHF1ZXVlZCBjaGFuZ2VzIGlmIHByZXNlbnQsIG90aGVyd2lzZSByZXRyZWl2aW5nXG4gICAgICAjIGN1cnJlbnQgdmFsdWUgLSBpLmUuIG5vIGNoYW5nZS5cbiAgICAgIGdldFByZXZWYWwgPSAocHJvcE5hbWUpIC0+XG4gICAgICAgIGlmIF8uaGFzIHF1ZXVlZENoYW5nZXMsIHByb3BOYW1lXG4gICAgICAgICAgcmV0dXJuIHF1ZXVlZENoYW5nZXNbcHJvcE5hbWVdXG4gICAgICAgIGVsc2VcbiAgICAgICAgICByZXR1cm4gaW5zdGFuY2VbcHJvcE5hbWVdXG5cbiAgICAgICMgZm9yIGVhY2ggcmVnaXN0ZXJlZCB3YXRjaGVyIC0gdXNlIGEgd2hpbGUgbG9vcCBzaW5jZSBmaXJpbmcgb25lIHdhdGNoZXIgY2FuIGNhdXNlIG90aGVyIHdhdGNoZXJzIHRvIGJlIGFkZGVkIG9yXG4gICAgICAjIHJlbW92ZWRcbiAgICAgIGkgPSAwXG4gICAgICAjIFRPRE86IHRoZXJlIGlzIGEgcG9zc2libGUgZXJyb3IgaGVyZSB3aGVyZSBmaXJpbmcgb25lIHdhdGNoZXIgcmVtb3ZlcyBhbm90aGVyIHdhdGNoZXIgZnJvbVxuICAgICAgIyB0aGUgYXJyYXkgLSB0aGUgaW5kZXggd291bGQgYmUgb2ZmIGJ5IG9uZSBhbmQgYSB3YXRjaGVyIGNvdWxkIGJlIHNraXBwZWRcbiAgICAgIHdoaWxlICh3YXRjaGVyID0gd2F0Y2hlcnNbdGFyZ2V0XVtpXSlcbiAgICAgICAgaSsrXG4gICAgICAgICMgVGhhdCB3YXRjaGVyIHNob3VsZCBmaXJlIGlmIGl0IGlzIG5ldywgb3IgaWYgaXQgaXMgd2F0Y2hpbmcgb25lIG9yIG1vcmUgb2YgdGhlIGNoYW5nZWQgcHJvcGVydGllc1xuICAgICAgICBzaG91bGRGaXJlID0gd2F0Y2hlci5maXJzdCB8fCAoXy5pbnRlcnNlY3Rpb24odHJpZ2dlcmluZ1Byb3BlcnRpZXMsIHdhdGNoZXIucHJvcGVydGllcykubGVuZ3RoID4gMClcbiAgICAgICAgd2F0Y2hlci5maXJzdCA9IGZhbHNlXG4gICAgICAgIGlmIHNob3VsZEZpcmVcbiAgICAgICAgICBuZXdWYWxzID0ge31cbiAgICAgICAgICBvbGRWYWxzID0ge31cblxuICAgICAgICAgICMgYnVpbGQgdGhlIGhhc2ggb2YgbmV3IC8gb2xkIHZhbHVlc1xuICAgICAgICAgIGZvciBwcm9wTmFtZSBpbiB3YXRjaGVyLnByb3BlcnRpZXNcbiAgICAgICAgICAgIG5ld1ZhbHNbcHJvcE5hbWVdID0gaW5zdGFuY2VbcHJvcE5hbWVdXG4gICAgICAgICAgICBvbGRWYWxzW3Byb3BOYW1lXSA9IGdldFByZXZWYWwocHJvcE5hbWUpXG5cbiAgICAgICAgICAjIGlmIHRoZSB3YXRjaGVyIGlzIHNldCBhZ2FpbnN0IGEgc2luZ2xlIHByb3BlcnR5LCBpbnZva2UgdGhlIGNhbGxiYWNrIHdpdGggdGhlIHJhdyBuZXcgLyBvbGQgdmFsdWVzXG4gICAgICAgICAgaWYgd2F0Y2hlci5wcm9wZXJ0aWVzLmxlbmd0aCA9PSAxXG4gICAgICAgICAgICBwcm9wTmFtZSA9IHdhdGNoZXIucHJvcGVydGllc1swXVxuICAgICAgICAgICAgbmV3VmFscyA9IG5ld1ZhbHNbcHJvcE5hbWVdXG4gICAgICAgICAgICBvbGRWYWxzID0gb2xkVmFsc1twcm9wTmFtZV1cblxuICAgICAgICAgIHRyeVxuICAgICAgICAgICAgd2F0Y2hlci5jYiBuZXdWYWxzLCBvbGRWYWxzXG4gICAgICAgICAgY2F0Y2ggZVxuICAgICAgICAgICAgIyBUT0RPOiBicm93c2VyIHN1cHBvcnQ/XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yIGUuc3RhY2sgfHwgZVxuXG4gICAgIyAjIyMgd2F0Y2hcbiAgICAjIFdhdGNoZXMgYW4gaW5zdGFuY2UgZm9yIGNoYW5nZXMgdG8gb25lIG9yIG1vcmUgcHJvcGVydGllc1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSBpbnN0YW5jZSwgJ3dhdGNoJyxcbiAgICAgIGNvbmZpZ3VyYWJsZSA6IGZhbHNlXG4gICAgICBlbnVtZXJhYmxlIDogZmFsc2VcbiAgICAgIHdyaXRhYmxlIDogZmFsc2VcbiAgICAgIHZhbHVlIDogKHByb3BlcnRpZXMsIGNiLCBvcHRzKSAtPiBhZGRXYXRjaGVyIHByb3BlcnRpZXMsIGNiLCBvcHRzXG5cbiAgICAjIERlZmluZSBhIHZhbGlkYXRpbmcgZmxhZywgd2hpY2ggaXMgdXNlZCB0byBwcmV2ZW50IGluZmluaXRlIGxvb3BzIG9uIHZhbGlkYXRpb24gb2YgY2lyY3VsYXIgcmVmZXJlbmNlc1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSBpbnN0YW5jZSwgJ192YWxpZGF0aW5nJyxcbiAgICAgIGNvbmZpZ3VyYWJsZSA6IGZhbHNlXG4gICAgICBlbnVtZXJhYmxlIDogZmFsc2VcbiAgICAgIHdyaXRhYmxlIDogdHJ1ZVxuICAgICAgdmFsdWUgOiBmYWxzZVxuXG4gICAgIyAjIyMgY29uc3RydWN0b3JcbiAgICAjIGZvciBlYWNoIHByb3BlcnR5IG9mIHRoZSBub3JtYWxpemVkIHNjaGVtYVxuICAgIGZvciBwcm9wTmFtZSwgcHJvcENvbmZpZyBvZiBub3JtYWxpemVkU2NoZW1hXG4gICAgICBkbyAocHJvcE5hbWUsIHByb3BDb25maWcpID0+XG4gICAgICAgICMgZGVmaW5lIGFuIGVudW1lcmFibGUgcHJvcGVydHkgb24gdGhlIGluc3RhbmNlIHRoYXQgaXMgbm90IGNvbmZpZ3VyYWJsZVxuICAgICAgICAjIHVzZXIgZ2V0IGFuZCBzZXQgdG8gbWFuYWdlIGdldHRlcnMsIHNldHRlcnMsIGFuZCB0eXBlIHBhcnNpbmdcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5IGluc3RhbmNlLCBwcm9wTmFtZSxcbiAgICAgICAgICBjb25maWd1cmFibGUgOiBmYWxzZVxuICAgICAgICAgIGVudW1lcmFibGUgICA6IHRydWVcbiAgICAgICAgIyAqKnNldCoqXG4gICAgICAgICAgc2V0ICAgICAgICAgIDogKHZhbCkgLT4gc2V0IHByb3BOYW1lLCB2YWxcbiAgICAgICAgIyAqKmdldCoqXG4gICAgICAgICAgZ2V0ICAgICAgICAgIDogLT4gZ2V0IHByb3BOYW1lXG5cbiAgICAgICAgIyBPbmNlIHRoZSBwcm9wZXJ0eSBpcyBjb25maWd1cmVkLCBhc3NpZ24gYSBkZWZhdWx0IHZhbHVlLiBUaGlzIGVuc3VyZXMgdGhhdCBkZWZhdWx0IHZhbHVlcyBhcmUgc3RpbGxcbiAgICAgICAgIyBhZmZlY3RlZCBieSB0eXBlIHBhcnNpbmcgYW5kIHNldHRlcnNcbiAgICAgICAgaWYgcHJvcENvbmZpZy5kZWZhdWx0ICE9IHVuZGVmaW5lZFxuICAgICAgICAgIHZhbCA9IGlmIF8uaXNGdW5jdGlvbihwcm9wQ29uZmlnLmRlZmF1bHQpIHRoZW4gcHJvcENvbmZpZy5kZWZhdWx0KCkgZWxzZSBwcm9wQ29uZmlnLmRlZmF1bHRcbiAgICAgICAgICBpbnN0YW5jZVtwcm9wTmFtZV0gPSB2YWxcblxuICAgICMgSWYgc2VhbCBvcHRpb24gaXMgZW5hYmxlZCwgc2VhbCB0aGUgaW5zdGFuY2UsIHByZXZlbnRpbmcgYWRkaXRpb24gb2Ygb3RoZXIgcHJvcGVydGllcyBiZXNpZGVzIHRob3NlIGV4cGxpY2l0bHlcbiAgICAjIGRlZmluZWQgYnkgdGhlIFNjaGVtYVxuICAgIGlmIHNlYWxcbiAgICAgIE9iamVjdC5zZWFsIGluc3RhbmNlXG5cbiAgICAjIHNldCB0aGUgaW5pdGlhbCBzdGF0ZSBvZiB0aGUgaW5zdGFuY2UsIHRoZW4gY2xlYXIgdGhlIGluaXRpYWxpemluZyBmbGFnXG4gICAgZm9yIHByb3BOYW1lLCB2YWwgb2YgaW5pdGlhbFN0YXRlXG4gICAgICBpbnN0YW5jZVtwcm9wTmFtZV0gPSB2YWxcblxuICAgIF9pbml0aWFsaXppbmcgPSBmYWxzZVxuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBJbnN0YW5jZUZhY3RvcnkoKVxuIiwiXyA9IHJlcXVpcmUgJ2xvZGFzaCdcblR5cGVzID0gcmVxdWlyZSAnLi9UeXBlcydcbkluc3RhbmNlRmFjdG9yeSA9IHJlcXVpcmUgJy4vSW5zdGFuY2VGYWN0b3J5J1xuUmVnaXN0cnkgPSByZXF1aXJlICcuL1JlZ2lzdHJ5J1xuXG5cbmNsYXNzIE1vZGVsRmFjdG9yeVxuXG4gICMgIyMjIERFRkFVTFRfT1BUSU9OU1xuICAjIERlZmF1bHQgb3B0aW9ucyBmb3IgYFNjaGVtYS5jcmVhdGVgXG4gIERFRkFVTFRfT1BUSU9OUyA6XG4gICAgc2VhbCAgIDogZmFsc2VcbiAgICBzdHJpY3QgOiBmYWxzZVxuXG4gIGNvbnN0cnVjdG9yIDogLT5cbiAgICBAbmFtZUNvdW50ZXI9MFxuXG4gIGdlbmVyYXRlTmFtZSA6ID0+XG4gICAgcmV0dXJuIFwiU2NoZW1pbmdNb2RlbCN7QG5hbWVDb3VudGVyKyt9XCJcblxuICAjICMjIyBub3JtYWxpemVQcm9wZXJ0eUNvbmZpZ1xuICAjIyNcbiAgICBOb3JtYWxpemVzIGEgZmllbGQgZGVjbGFyYXRpb24gb24gYSBzY2hlbWEgdG8gY2FwdHVyZSB0eXBlLCBkZWZhdWx0IHZhbHVlLCBzZXR0ZXIsIGdldHRlciwgYW5kIHZhbGlkYXRpb24uXG4gICAgVXNlZCBpbnRlcm5hbGx5IHdoZW4gYSBzY2hlbWEgaXMgY3JlYXRlZCB0byBidWlsZCBhIG5vcm1hbGl6ZWQgc2NoZW1hIGRlZmluaXRpb24uXG4gICMjI1xuICBub3JtYWxpemVQcm9wZXJ0eUNvbmZpZyA6IChwcm9wQ29uZmlnLCBwcm9wTmFtZSA9ICdmaWVsZCcpID0+XG4gICAgIyBpbml0aWFsaXplIG5vcm1hbGl6ZWQgcHJvcGVydHkgZGVmaW5pdGlvbiB0aGF0IHdlIHdpbGwgcmV0dXJuXG4gICAgZGVmaW5pdGlvbiA9XG4gICAgICB0eXBlICAgICAgIDogbnVsbFxuICAgICAgZGVmYXVsdCAgICA6IG51bGxcbiAgICAgIGdldHRlciAgICAgOiBudWxsXG4gICAgICBzZXR0ZXIgICAgIDogbnVsbFxuICAgICAgdmFsaWRhdGUgICA6IG51bGxcbiAgICAgIHJlcXVpcmVkICAgOiBmYWxzZVxuXG4gICAgIyBpZiBwcm9wZXJ0eSBjb25maWd1cmF0aW9uIGlzIG5vdCBhbiBvYmplY3Qgd2l0aCBhIHR5cGUga2V5LCBhc3N1bWUgdGhhdFxuICAgICMgdGhlIGNvbmZpZ3VyYXRpb24gdmFsdWUgaXMganVzdCB0aGUgcHJvcGVydHkgdHlwZVxuICAgIGlmICEoXy5pc1BsYWluT2JqZWN0KHByb3BDb25maWcpICYmIHByb3BDb25maWcudHlwZT8pXG4gICAgICBwcm9wQ29uZmlnID0ge3R5cGUgOiBwcm9wQ29uZmlnfVxuXG4gICAge3R5cGUsIGdldHRlciwgc2V0dGVyLCB2YWxpZGF0ZSwgcmVxdWlyZWR9ID0gcHJvcENvbmZpZ1xuICAgICMgVGhpcyBmdW5jdGlvbiB0aHJvd3MgZXJyb3JzIG9uIGFueSBiYWQgY29uZmlndXJhdGlvbiwgYXR0ZW1wdGluZyB0byBmYWlsIGZhc3QuXG5cbiAgICAjIC0gVGhyb3cgYW4gZXJyb3IgaWYgdHlwZSBpcyBub3QgZGVmaW5lZC4gVHlwZSBtdXN0IGFsd2F5cyBiZSBleHBsaWNpdGx5IGRlY2xhcmVkLiBVbnR5cGVkIGZpZWxkc1xuICAgICMgbXVzdCBleHBsaWNpdGx5IGRlY2xhcmVkIGFzIFNjaGVtYS5UWVBFUy5NaXhlZFxuICAgIGlmICF0eXBlP1xuICAgICAgdGhyb3cgbmV3IEVycm9yIFwiRXJyb3IgcmVzb2x2aW5nICN7cHJvcE5hbWV9LiBTY2hlbWEgdHlwZSBtdXN0IGJlIGRlZmluZWQuXCJcbiAgICAjIC0gVGhyb3cgYW4gZXJyb3IgaWYgZ2V0dGVyIGlzIG5vdCBhIGZ1bmN0aW9uXG4gICAgaWYgZ2V0dGVyPyAmJiAhXy5pc0Z1bmN0aW9uIGdldHRlclxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwiRXJyb3IgcmVzb2x2aW5nICN7cHJvcE5hbWV9LiBTY2hlbWEgZ2V0dGVyIG11c3QgYmUgYSBmdW5jdGlvbi5cIlxuICAgICMgLSBUaHJvdyBhbiBlcnJvciBpZiBzZXR0ZXIgaXMgbm90IGEgZnVuY3Rpb25cbiAgICBpZiBzZXR0ZXI/ICYmICFfLmlzRnVuY3Rpb24gc2V0dGVyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJFcnJvciByZXNvbHZpbmcgI3twcm9wTmFtZX0uIFNjaGVtYSBzZXR0ZXIgbXVzdCBiZSBhIGZ1bmN0aW9uLlwiXG5cbiAgICB2YWxpZGF0ZSA/PSBbXVxuICAgICMgLSBJZiB2YWxpZGF0ZSBpcyBhIHNpbmdsZSBmdW5jdGlvbiwgdHJhbnNmb3JtIHRvIGFuIGFycmF5IHdpdGggb25lIG1lbWJlclxuICAgIGlmICFfLmlzQXJyYXkodmFsaWRhdGUpXG4gICAgICB2YWxpZGF0ZSA9IFt2YWxpZGF0ZV1cbiAgICAjIC0gQ2hlY2sgdGhhdCBhbGwgdmFsaWRhdGUgYXJlIGEgZnVuY3Rpb24sIHRocm93IGFuIGVycm9yIGlmIGl0IGlzIG5vdC5cbiAgICBmb3IgZm4gaW4gdmFsaWRhdGVcbiAgICAgIGlmICFfLmlzRnVuY3Rpb24gZm5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yIFwiRXJyb3IgcmVzb2x2aW5nICN7cHJvcE5hbWV9LiBTY2hlbWEgdmFsaWRhdGUgbXVzdCBiZSBhIGZ1bmN0aW9uIG9yIGFycmF5IG9mIGZ1bmN0aW9ucy5cIlxuXG4gICAgIyAtIFJlc29sdmUgdGhlIGRlY2xhcmVkIHR5cGVcbiAgICBkZWZpbml0aW9uLnR5cGUgPSBUeXBlcy5yZXNvbHZlVHlwZSB0eXBlXG5cbiAgICAjIC0gSWYgdHlwZSBjb3VsZCBub3QgYmUgcmVzb2x2ZWQsIHRocm93IGFuIGVycm9yXG4gICAgaWYgIWRlZmluaXRpb24udHlwZT9cbiAgICAgIHRocm93IG5ldyBFcnJvciBcIkVycm9yIHJlc29sdmluZyAje3Byb3BOYW1lfS4gVW5yZWNvZ25pemVkIHR5cGUgI3t0eXBlfVwiXG5cbiAgICAjIGBkZWZhdWx0YCBpcyBhIHJlc2VydmVkIHdvcmQsIHNvIHdlIGNhbid0IGRvIHRoZSBuaWNlIGNsZWFuIGRlbmF0dXJlZCBhc3NpZ25tZW50XG4gICAgZGVmaW5pdGlvbi5kZWZhdWx0ID0gcHJvcENvbmZpZy5kZWZhdWx0XG4gICAgZGVmaW5pdGlvbi5nZXR0ZXIgPSBnZXR0ZXJcbiAgICBkZWZpbml0aW9uLnNldHRlciA9IHNldHRlclxuICAgIGRlZmluaXRpb24udmFsaWRhdGUgPSB2YWxpZGF0ZVxuICAgIGRlZmluaXRpb24ucmVxdWlyZWQgPSByZXF1aXJlZFxuXG4gICAgIyBhbGxvdyBhbnkgY3VzdG9tIHByb3BlcnRpZXMgdG8gYmUgZXhwb3NlZCBvbiB0aGUgZGVmaW5pdGlvbiBvYmplY3RcbiAgICBkZWZpbml0aW9uID0gXy5leHRlbmQge30sIHByb3BDb25maWcsIGRlZmluaXRpb25cblxuICAgICMgUmV0dXJuIGEgdmFsaWQgcHJvcGVydHkgY29uZmlndXJhdGlvblxuICAgIHJldHVybiBkZWZpbml0aW9uXG5cbiAgbmFtZUZ1bmN0aW9uIDogKG5hbWUsIGZuKSA9PlxuICAgIGZuU3RyID0gXCJyZXR1cm4gZnVuY3Rpb24gI3tuYW1lfSgpe3JldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpfVwiXG4gICAgdHJ5XG4gICAgICByZW5hbWVkID0gbmV3IEZ1bmN0aW9uKCdmbicsIGZuU3RyKShmbilcbiAgICBjYXRjaCBlcnJcbiAgICAgIHRocm93IG5ldyBFcnJvciBcIiN7bmFtZX0gaXMgbm90IGEgdmFsaWQgZnVuY3Rpb24gbmFtZS5cIlxuXG4gICAgXy5leHRlbmQgcmVuYW1lZCwgZm5cbiAgICBfLmV4dGVuZCByZW5hbWVkLnByb3RvdHlwZSwgZm4ucHJvdG90eXBlXG5cbiAgICByZXR1cm4gcmVuYW1lZFxuXG4gICMgIyMjIGNyZWF0ZVxuICAjIENyZWF0ZXMgYSBuZXcgU2NoZW1hIGNvbnN0cnVjdG9yXG4gIGNyZWF0ZSA6IChhcmdzLi4uKSA9PlxuICAgIGZhY3RvcnkgPSBAXG4gICAgIyBJZiB0aGUgZmlyc3QgYXJndW1lbnQgaXMgYSBzdHJpbmcsIHRoZW4gdGhlIFNjaGVtYSBpcyBiZWluZyBuYW1lZCAmIHJlZ2lzdGVyZWQuIE90aGVyd2lzZSwgaXQgaXMgYmVpbmdcbiAgICAjIGNyZWF0ZWQgYW5vbnltb3VzbHksIGFuZCB3ZSBuZWVkIHRvIGdpdmUgaXQgYSB1dWlkIGZvciByZWdpc3RyYXRpb24uXG4gICAgaWYgIV8uaXNTdHJpbmcoYXJnc1swXSlcbiAgICAgIGFyZ3MudW5zaGlmdCBAZ2VuZXJhdGVOYW1lKClcblxuICAgICMgR2V0IG5hbWUsIGNvbmZpZywgYW5kIG9wdGlvbnMgZnJvbSB0aGUgY3JlYXRlIGFyZ3VtZW50c1xuICAgIFtuYW1lLCBzY2hlbWFDb25maWcsIG9wdHNdID0gYXJnc1xuXG4gICAgIyBTZXQgb3B0aW9ucywgZGVmYXVsdGluZyB0byB0aGUgU2NoZW1pbmcuREVGQVVMVF9PUFRJT05TXG4gICAgb3B0cyA9IF8uZGVmYXVsdHMgKG9wdHMgfHwge30pLCBAREVGQVVMVF9PUFRJT05TXG5cbiAgICAjIE5vcm1hbGl6ZWQgU2NoZW1hIGlzIGNhcHR1cmVkIGluIGNsb3N1cmVcbiAgICBub3JtYWxpemVkU2NoZW1hID0ge31cblxuICAgICMgQ3JlYXRlIHRoZSBuZXcgTW9kZWxcbiAgICBjbGFzcyBNb2RlbFxuICAgICAgIyBfX3NjaGVtYUlkIHByb3BlcnR5IHJlZmVyZW5jZXMgdGhlIHNjaGVtYSBuYW1lIGFuZCBpZGVudGlmaWVzIFNjaGVtYSBjb25zdHJ1Y3RvcnMgZnJvbSBhbnkgb3RoZXIgZnVuY3Rpb25cbiAgICAgIEBfX3NjaGVtYUlkICAgICAgIDogbmFtZVxuXG4gICAgICAjICMjIyBkZWZpbmVQcm9wZXJ0eVxuICAgICAgIyBEZWZpbmVzIGEgcHJvcGVydHkgb24gdGhlIG5vcm1hbGl6ZWQgc2NoZW1hLCB3aGljaCBpcyB1c2VkIGF0IHRpbWUgb2YgaW5zdGFuY2UgY29uc3RydWN0aW9uXG4gICAgICBAZGVmaW5lUHJvcGVydHkgICA6IChwcm9wTmFtZSwgcHJvcENvbmZpZykgLT5cbiAgICAgICAgaWYgIV8uaXNTdHJpbmcocHJvcE5hbWUpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yIFwiRmlyc3QgYXJndW1lbnQ6IHByb3BlcnR5IG5hbWUgbXVzdCBiZSBhIHN0cmluZy5cIlxuICAgICAgICBpZiAhcHJvcENvbmZpZz9cbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IgXCJTZWNvbmQgYXJndW1lbnQ6IHByb3BlcnR5IGNvbmZpZ3VyYXRpb24gaXMgcmVxdWlyZWQuXCJcbiAgICAgICAgbm9ybWFsaXplZFNjaGVtYVtwcm9wTmFtZV0gPSBmYWN0b3J5Lm5vcm1hbGl6ZVByb3BlcnR5Q29uZmlnKHByb3BDb25maWcsIHByb3BOYW1lKVxuXG4gICAgICAjICMjIyBkZWZpbmVQcm9wZXJ0aWVzXG4gICAgICAjIENvbnZlbmllbmNlIG1ldGhvZCBmb3IgZGVmaW5pbmcgcHJvcGVydGllcyBpbiBidWxrXG4gICAgICBAZGVmaW5lUHJvcGVydGllcyA6IChjb25maWcpIC0+XG4gICAgICAgIGlmICFfLmlzUGxhaW5PYmplY3QoY29uZmlnKVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvciBcIkZpcnN0IGFyZ3VtZW50OiBwcm9wZXJ0aWVzIG11c3QgYmUgYW4gb2JqZWN0LlwiXG4gICAgICAgIGZvciBrLCB2IG9mIGNvbmZpZ1xuICAgICAgICAgIEBkZWZpbmVQcm9wZXJ0eSBrLCB2XG5cbiAgICAgICMgIyMjIGdldFByb3BlcnRpZXNcbiAgICAgICMgcmV0dXJucyBhIGNsb25lIG9mIHRoZSBub3JtYWxpemVkIFNjaGVtYVxuICAgICAgQGdldFByb3BlcnRpZXMgOiAtPlxuICAgICAgICByZXR1cm4gXy5jbG9uZURlZXAgbm9ybWFsaXplZFNjaGVtYVxuXG4gICAgICAjICMjIyBnZXRQcm9wZXJ0eVxuICAgICAgIyByZXR1cm5zIGEgY2xvbmUgb2YgdGhlIG5vcm1hbGl6ZWQgU2NoZW1hIHByb3BlcnR5XG4gICAgICBAZ2V0UHJvcGVydHkgOiAocHJvcE5hbWUpIC0+XG4gICAgICAgIHJldHVybiBfLmNsb25lRGVlcCBub3JtYWxpemVkU2NoZW1hW3Byb3BOYW1lXVxuXG4gICAgICAjICMjIyBlYWNoUHJvcGVydHlcbiAgICAgICMgSXRlcmF0ZXMgb3ZlciBlYWNoIHByb3BlcnR5IG5hbWUgYW5kIGNvbmZpZ3VyYXRpb24gb2YgdGhlIHNjaGVtYSwgaW52b2tpbmcgdGhlIHByb3ZpZGVkIGNhbGxiYWNrXG4gICAgICBAZWFjaFByb3BlcnR5IDogKGNiKSAtPlxuICAgICAgICBpZiAhXy5pc0Z1bmN0aW9uKGNiKVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvciBcIkZpcnN0IGFyZ3VtZW50OiBjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb24uXCJcbiAgICAgICAgZm9yIHByb3BOYW1lLCBwcm9wQ29uZmlnIG9mIG5vcm1hbGl6ZWRTY2hlbWFcbiAgICAgICAgICBjYiBwcm9wTmFtZSwgXy5jbG9uZURlZXAgcHJvcENvbmZpZ1xuXG4gICAgICAjICMjIyB2YWxpZGF0ZVxuICAgICAgIyBSdW4gdmFsaWRhdGlvbiBvbiBhbiBpbnN0YW5jZSBvZiB0aGUgc2NoZW1hXG4gICAgICBAdmFsaWRhdGUgOiAoaW5zdGFuY2UpIC0+XG4gICAgICAgICMgQ3JlYXRlIGVycm9ycyBoYXNoIHRoYXQgd2lsbCBiZSByZXR1cm5lZCBvbiBhbnkgdmFsaWRhdGlvbiBmYWlsdXJlLlxuICAgICAgICBlcnJvcnMgPSB7fVxuXG4gICAgICAgICMgRmxhZyB2YWxpZGF0aW5nIHN0YXRlIHRvIHByZXZlbnQgaW5maW5pdGUgbG9vcCBpbiB0aGUgY2FzZSBvZiBjaXJjdWxhciByZWZlcmVuY2VzXG4gICAgICAgIGlmIGluc3RhbmNlLl92YWxpZGF0aW5nIHRoZW4gcmV0dXJuIG51bGxcbiAgICAgICAgaW5zdGFuY2UuX3ZhbGlkYXRpbmcgPSB0cnVlXG5cbiAgICAgICAgIyBGYWN0b3JlZCBjb2RlIHRvIHB1c2ggZXJyb3IgbWVzc2FnZXMgb250byB0aGUgZXJyb3JzIGhhc2hcbiAgICAgICAgcHVzaEVycm9yID0gKGtleSwgZXJyb3IpIC0+XG4gICAgICAgICAgaWYgXy5pc0FycmF5IGVycm9yXG4gICAgICAgICAgICByZXR1cm4gcHVzaEVycm9yKGtleSwgZXJyKSBmb3IgZXJyIGluIGVycm9yXG4gICAgICAgICAgaWYgIV8uaXNTdHJpbmcgZXJyb3JcbiAgICAgICAgICAgIGVycm9yID0gJ1ZhbGlkYXRpb24gZXJyb3Igb2NjdXJyZWQuJ1xuICAgICAgICAgIGVycm9yc1trZXldID89IFtdXG4gICAgICAgICAgZXJyb3JzW2tleV0ucHVzaCBlcnJvclxuXG4gICAgICAgICMgQXBwbHkgdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBmb3Iga2V5LCB2YWx1ZSBvZiBub3JtYWxpemVkU2NoZW1hXG4gICAgICAgICAge3ZhbGlkYXRlLCByZXF1aXJlZH0gPSB2YWx1ZVxuXG4gICAgICAgICAgIyAtIFJldHJpZXZlIHZhbHVlLiBUaGlzIHdpbGwgYmUgYWZmZWN0ZWQgYnkgZ2V0dGVycy5cbiAgICAgICAgICB2YWwgPSBpbnN0YW5jZVtrZXldXG5cbiAgICAgICAgICAjIC0gSWYgdGhlIGZpZWxkIGlzIHJlcXVpcmVkIGFuZCBub3QgZGVmaW5lZCwgcHVzaCB0aGUgZXJyb3IgYW5kIGJlIGRvbmVcbiAgICAgICAgICBpZiByZXF1aXJlZCAmJiAhdmFsP1xuICAgICAgICAgICAgcmVxdWlyZWRNZXNzYWdlID0gaWYgXy5pc1N0cmluZyhyZXF1aXJlZCkgdGhlbiByZXF1aXJlZCBlbHNlIFwiRmllbGQgaXMgcmVxdWlyZWQuXCJcbiAgICAgICAgICAgIHB1c2hFcnJvciBrZXksIHJlcXVpcmVkTWVzc2FnZVxuICAgICAgICAgICMgLSBPbmx5IHJ1biB2YWxpZGF0aW9uIG9uIGZpZWxkcyB0aGF0IGFyZSBkZWZpbmVkXG4gICAgICAgICAgaWYgdmFsP1xuICAgICAgICAgICAge3R5cGV9ID0gbm9ybWFsaXplZFNjaGVtYVtrZXldXG5cbiAgICAgICAgICAgICMgLSBSdW4gZWFjaCB2YWxpZGF0b3Igb24gdGhlIGZpZWxkIHZhbHVlXG4gICAgICAgICAgICBmb3IgdmFsaWRhdG9yIGluIHZhbGlkYXRlXG4gICAgICAgICAgICAgIGVyciA9IHRydWVcbiAgICAgICAgICAgICAgIyAtIEFjY2VwdCBlcnJvciBzdHJpbmdzIHRoYXQgYXJlIHJldHVybmVkLCBvciBlcnJvcnMgdGhhdCBhcmUgdGhyb3duIGR1cmluZyBwcm9jZXNzaW5nXG4gICAgICAgICAgICAgIHRyeVxuICAgICAgICAgICAgICAgIGVyciA9IHZhbGlkYXRvci5jYWxsKGluc3RhbmNlLCB2YWwpXG4gICAgICAgICAgICAgIGNhdGNoIGVcbiAgICAgICAgICAgICAgICBpZiBlIHRoZW4gZXJyID0gZS5tZXNzYWdlXG4gICAgICAgICAgICAgICMgLSBJZiBhbnkgdmFsaWRhdGlvbiBlcnJvcnMgYXJlIGRldGVjdGVkLCBwdXNoIHRoZW1cbiAgICAgICAgICAgICAgaWYgZXJyICE9IHRydWUgdGhlbiBwdXNoRXJyb3Iga2V5LCBlcnJcblxuICAgICAgICAgICAgIyAtIEFkZGl0aW9uYWxseSwgaWYgdGhlIHByb3BlcnR5IGlzIGEgbmVzdGVkIHNjaGVtYSwgcnVuIGl0cyB2YWxpZGF0aW9uXG4gICAgICAgICAgICBpZiB0eXBlLnN0cmluZyA9PSAnc2NoZW1hJ1xuICAgICAgICAgICAgICBjaGlsZEVycm9ycyA9IHR5cGUuY2hpbGRUeXBlLnZhbGlkYXRlLmNhbGwoaW5zdGFuY2UsIHZhbClcbiAgICAgICAgICAgICAgZm9yIGssIHYgb2YgY2hpbGRFcnJvcnNcbiAgICAgICAgICAgICAgICAjICAgLSBUaGUga2V5IG9uIHRoZSBlcnJvcnMgaGFzaCBzaG91bGQgYmUgdGhlIHBhdGggdG8gdGhlIGZpZWxkIHRoYXQgaGFkIGEgdmFsaWRhdGlvbiBlcnJvclxuICAgICAgICAgICAgICAgIHB1c2hFcnJvciBcIiN7a2V5fS4je2t9XCIsIHZcbiAgICAgICAgICAgICMgLSBJZiB0aGUgcHJvcGVydHkgaXMgYW4gYXJyYXkgb2Ygc2NoZW1hcywgcnVuIHZhbGlkYXRpb24gb24gZWFjaCBtZW1iZXIgb2YgdGhlIGFycmF5XG4gICAgICAgICAgICBpZiB0eXBlLnN0cmluZyA9PSAnYXJyYXknICYmIHR5cGUuY2hpbGRUeXBlLnN0cmluZyA9PSAnc2NoZW1hJ1xuICAgICAgICAgICAgICBmb3IgbWVtYmVyLCBpIGluIHZhbFxuICAgICAgICAgICAgICAgIGNoaWxkRXJyb3JzID0gdHlwZS5jaGlsZFR5cGUuY2hpbGRUeXBlLnZhbGlkYXRlLmNhbGwoaW5zdGFuY2UsIG1lbWJlcilcbiAgICAgICAgICAgICAgICBmb3IgaywgdiBvZiBjaGlsZEVycm9yc1xuICAgICAgICAgICAgICAgICAgIyAgIC0gQWdhaW4sIHRoZSBrZXkgb24gdGhlIGVycm9ycyBoYXNoIHNob3VsZCBiZSB0aGUgcGF0aCB0byB0aGUgZmllbGQgdGhhdCBoYWQgYSB2YWxpZGF0aW9uIGVycm9yXG4gICAgICAgICAgICAgICAgICBwdXNoRXJyb3IgXCIje2tleX1bI3tpfV0uI3trfVwiLCB2XG5cbiAgICAgICAgICAjIFVuc2V0IGZsYWcsIGluZGljYXRpbmcgdmFsaWRhdGlvbiBpcyBjb21wbGV0ZVxuICAgICAgICBpbnN0YW5jZS5fdmFsaWRhdGluZyA9IGZhbHNlXG5cbiAgICAgICAgIyBSZXR1cm4gbnVsbCBpZiBubyB2YWxpZGF0aW9uIGVycnJvcnMgb2N1cnJlZFxuICAgICAgICBpZiBfLnNpemUoZXJyb3JzKSA9PSAwXG4gICAgICAgICAgcmV0dXJuIG51bGxcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHJldHVybiBlcnJvcnNcblxuICAgICAgIyAjIyMgY29uc3RydWN0b3JcbiAgICAgICMgQ29uc3RydWN0b3IgdGhhdCBidWlsZHMgaW5zdGFuY2VzIG9mIHRoZSBTY2hlbWFcbiAgICAgIGNvbnN0cnVjdG9yICAgICAgIDogKGluaXRpYWxTdGF0ZSkgLT5cblxuICAgICAgICAjIHR1cm4gYHRoaXNgIGludG8gYSBNb2RlbCBpbnN0YW5jZVxuICAgICAgICBJbnN0YW5jZUZhY3RvcnkuY3JlYXRlKEAsIG5vcm1hbGl6ZWRTY2hlbWEsIGluaXRpYWxTdGF0ZSwgb3B0cylcblxuICAgIE1vZGVsID0gQG5hbWVGdW5jdGlvbiBuYW1lLCBNb2RlbFxuXG4gICAgIyBEZWZpbmUgcHJvcGVydGllcyBvbiB0aGUgU2NoZW1hIGJhc2VkIG9uIHRoZSBzY2hlbWEgY29uZmlndXJhdGlvblxuICAgIGlmIHNjaGVtYUNvbmZpZz8gdGhlbiBNb2RlbC5kZWZpbmVQcm9wZXJ0aWVzIHNjaGVtYUNvbmZpZ1xuXG4gICAgIyBSZWdpc3RlciB0aGUgbmV3IFNjaGVtYSBieSB0aGUgbmFtZSBwcm92aWRlZCBvciBnZW5lcmF0ZWRcbiAgICBSZWdpc3RyeS5yZWdpc3RlciBuYW1lLCBNb2RlbFxuXG4gICAgcmV0dXJuIE1vZGVsXG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IE1vZGVsRmFjdG9yeSgpXG4iLCIjIEludGVybmFsIHJlZ2lzdHJ5IGZvciBzY2hlbWFzIGNyZWF0ZWQgYnkgYFNjaGVtaW5nLmNyZWF0ZWAuIFNjaGVtYXMgYXJlIHJlZ2lzdGVyZWQgYnkgdGhlaXIgbmFtZSwgd2hpY2ggaXMgZWl0aGVyXG4jIHByb3ZpZGVkIGF0IHRpbWUgb2YgY3JlYXRpb24sIG9yIGdlbmVyYXRlZCBhcyBhIHV1aWQuXG5jbGFzcyBSZWdpc3RyeVxuICBjb25zdHJ1Y3RvciA6IC0+XG4gICAgQHNjaGVtYXMgPSB7fVxuXG4gICMgVXNlZCBpbnRlcm5hbGx5IGFzIHBhcnQgb2YgYFNjaGVtaW5nLmNyZWF0ZWAsIGRvIG5vdCBuZWVkIHRvIGV4cG9zZSByZWdpc3RyYXRpb24gb3V0c2lkZSBvZiBTY2hlbWEgY3JlYXRpb24uXG4gIHJlZ2lzdGVyIDogKG5hbWUsIG1vZGVsKSA9PlxuICAgICMgVGhyb3cgYW4gZXJyb3Igb24gbmFtaW5nIGNvbGxpc2lvbnNcbiAgICBpZiBAc2NoZW1hc1tuYW1lXVxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwiTmFtaW5nIGNvbmZsaWN0IGVuY291bnRlcmVkLiBNb2RlbCAje25hbWV9IGFscmVhZHkgZXhpc3RzXCJcbiAgICBAc2NoZW1hc1tuYW1lXSA9IG1vZGVsXG5cbiAgIyAjIyMgZ2V0XG4gICMgUmV0cmlldmVzIGEgc2NoZW1hIGJ5IHJlZ2lzdGVyZWQgbmFtZVxuICBnZXQgOiAobmFtZSkgPT5cbiAgICByZXR1cm4gQHNjaGVtYXNbbmFtZV1cblxuICAjICMjIyByZXNldFxuICAjIFJlc2V0cyB0aGUgc3RhdGUgb2YgdGhlIFNjaGVtYSByZWdpc3RyeS4gTWFpbmx5IGV4cG9zZWQgZm9yIHRlc3RpbmcsIGJ1dCBjb3VsZCBoYXZlIHVzZSBpbiBwcm9kdWN0aW9uLlxuICByZXNldCA6ID0+XG4gICAgQHNjaGVtYXMgPSB7fVxuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBSZWdpc3RyeSgpIiwiVHlwZXMgPSByZXF1aXJlICcuL1R5cGVzJ1xuUmVnaXN0cnkgPSByZXF1aXJlICcuL1JlZ2lzdHJ5J1xuQ2hhbmdlTWFuYWdlciA9IHJlcXVpcmUgJy4vQ2hhbmdlTWFuYWdlcidcbk1vZGVsRmFjdG9yeSA9IHJlcXVpcmUgJy4vTW9kZWxGYWN0b3J5J1xuSW5zdGFuY2VGYWN0b3J5ID0gcmVxdWlyZSAnLi9JbnN0YW5jZUZhY3RvcnknXG5cbntUWVBFUywgTkVTVEVEX1RZUEVTLCByZXNvbHZlVHlwZX0gPSBUeXBlc1xue1RIUk9UVExFLCBzZXRUaHJvdHRsZSwgcmVnaXN0ZXJRdWV1ZUNhbGxiYWNrLCB1bnJlZ2lzdGVyUXVldWVDYWxsYmFjayxcbnJlZ2lzdGVyUmVzb2x2ZUNhbGxiYWNrLCB1bnJlZ2lzdGVyUmVzb2x2ZUNhbGxiYWNrLCBmbHVzaH0gPSBDaGFuZ2VNYW5hZ2VyXG57REVGQVVMVF9PUFRJT05TLCBub3JtYWxpemVQcm9wZXJ0eUNvbmZpZywgY3JlYXRlfSA9IE1vZGVsRmFjdG9yeVxue3V1aWR9ID0gSW5zdGFuY2VGYWN0b3J5XG57Z2V0LCByZXNldH0gPSBSZWdpc3RyeVxuXG5cbnJlc2V0ID0gLT5cbiAgUmVnaXN0cnkucmVzZXQoKVxuICBDaGFuZ2VNYW5hZ2VyLnJlc2V0KClcblxuU2NoZW1pbmcgPSB7XG4gIFRZUEVTLCBORVNURURfVFlQRVMsIERFRkFVTFRfT1BUSU9OUywgVEhST1RUTEUsXG5cbiAgdXVpZCwgZ2V0LCByZXNldCxcblxuICByZXNvbHZlVHlwZSwgbm9ybWFsaXplUHJvcGVydHlDb25maWdcblxuICBzZXRUaHJvdHRsZSwgcmVnaXN0ZXJRdWV1ZUNhbGxiYWNrLCB1bnJlZ2lzdGVyUXVldWVDYWxsYmFjayxcbiAgcmVnaXN0ZXJSZXNvbHZlQ2FsbGJhY2ssIHVucmVnaXN0ZXJSZXNvbHZlQ2FsbGJhY2ssXG5cbiAgZmx1c2gsIGNyZWF0ZVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNjaGVtaW5nIiwiXyA9IHJlcXVpcmUgJ2xvZGFzaCdcblxuY2xhc3MgVHlwZXNcbiAgIyAjIyMgVFlQRVNcbiAgIyMjXG4gICAgU2NoZW1pbmcgZXhwb3J0cyB0aGUgZGVmYXVsdCB0eXBlcyB0aGF0IGl0IHVzZXMgZm9yIHBhcnNpbmcgc2NoZW1hcy4gWW91IGNhbiBleHRlbmQgd2l0aCBjdXN0b20gdHlwZXMsIG9yXG4gICAgb3ZlcnJpZGUgdGhlIGlkZW50aWZpZXIgLyBwYXJzZXIgZnVuY3Rpb25zIG9mIHRoZSBkZWZhdWx0IHR5cGVzLiBBIGN1c3RvbSB0eXBlIHNob3VsZCBwcm92aWRlOlxuICAgICAtIGN0b3IgKG9wdGlvbmFsKSAtIFVzZWQgaW4gc2NoZW1hIGRlZmluaXRpb25zIHRvIGRlY2xhcmUgYSB0eXBlLiBgU2NoZW1pbmcuY3JlYXRlIG5hbWUgOiBTdHJpbmdgXG4gICAgIC0gc3RyaW5nIC0gVXNlZCBpbiBzY2hlbWEgZGVmaW5pdGlvbnMgdG8gZGVjbGFyZSBhIHR5cGUuIGBTY2hlbWluZy5jcmVhdGUgbmFtZSA6ICdzdHJpbmcnYFxuICAgICAtIGlkZW50aWZpZXIgLSBGdW5jdGlvbiwgcmV0dXJucyB0cnVlIG9yIGZhbHNlLiBEZXRlcm1pbmVzIHdoZXRoZXIgYSB2YWx1ZSBuZWVkcyB0byBiZSBwYXJzZWQuXG4gICAgIC0gcGFyc2VyIC0gRnVuY3Rpb24sIHBhcnNlcyBhIHZhbHVlIGludG8gdGhlIHR5cGUuXG4gICMjI1xuICBUWVBFUyA6XG4gICAgU3RyaW5nICA6XG4gICAgICBjdG9yICAgICAgIDogU3RyaW5nXG4gICAgICBzdHJpbmcgICAgIDogJ3N0cmluZydcbiAgICAgIGlkZW50aWZpZXIgOiBfLmlzU3RyaW5nXG4gICAgICBwYXJzZXIgICAgIDogKHZhbCkgLT5cbiAgICAgICAgJycgKyB2YWxcbiAgICAgIGVxdWFscyAgICAgOiAoYSwgYikgLT4gYT09YlxuICAgIE51bWJlciAgOlxuICAgICAgY3RvciAgICAgICA6IE51bWJlclxuICAgICAgc3RyaW5nICAgICA6ICdudW1iZXInXG4gICAgICBpZGVudGlmaWVyIDogXy5pc051bWJlclxuICAgICAgcGFyc2VyICAgICA6IHBhcnNlRmxvYXRcbiAgICAgIGNvbXBhcmF0b3IgOiAoYSwgYikgLT4gYT09YlxuICAgICAgZXF1YWxzICAgICA6IChhLCBiKSAtPiBhPT1iXG4gICAgSW50ZWdlciA6XG4gICAgICBzdHJpbmcgICAgIDogJ2ludGVnZXInXG4gICAgICBpZGVudGlmaWVyIDogKHZhbCkgLT5cbiAgICAgICAgXy5pc051bWJlcih2YWwpICYmIHZhbCAlIDEgPT0gMFxuICAgICAgcGFyc2VyICAgICA6IHBhcnNlSW50XG4gICAgICBlcXVhbHMgICAgIDogKGEsIGIpIC0+IGE9PWJcbiAgICBEYXRlICAgIDpcbiAgICAgIGN0b3IgICAgICAgOiBEYXRlXG4gICAgICBzdHJpbmcgICAgIDogJ2RhdGUnXG4gICAgICBpZGVudGlmaWVyIDogXy5pc0RhdGVcbiAgICAgIHBhcnNlciAgICAgOiAodmFsKSAtPlxuICAgICAgICBuZXcgRGF0ZSB2YWxcbiAgICAgIGVxdWFscyAgICAgOiAoYSwgYikgLT4gYT8udmFsdWVPZigpID09IGI/LnZhbHVlT2YoKVxuICAgIEJvb2xlYW4gOlxuICAgICAgY3RvciAgICAgICA6IEJvb2xlYW5cbiAgICAgIHN0cmluZyAgICAgOiAnYm9vbGVhbidcbiAgICAgIGlkZW50aWZpZXIgOiBfLmlzQm9vbGVhblxuICAgICAgcGFyc2VyICAgICA6ICh2YWwpIC0+XG4gICAgICAgICEhdmFsXG4gICAgICBlcXVhbHMgICAgIDogKGEsIGIpIC0+IGE9PWJcbiAgICBNaXhlZCAgIDpcbiAgICAgIGN0b3IgICAgICAgOiAodmFsKSAtPlxuICAgICAgICB2YWxcbiAgICAgIHN0cmluZyAgICAgOiAnKidcbiAgICAgIGlkZW50aWZpZXIgOiAtPlxuICAgICAgICB0cnVlXG4gICAgICBwYXJzZXIgICAgIDogXy5pZGVudGl0eVxuICAgICAgZXF1YWxzICAgICA6IChhLCBiKSAtPiBhPT1iXG5cbiAgIyAjIyMgTkVTVEVEX1RZUEVTXG4gICMjI1xuICAgIFNwZWNpYWwgdHlwZSBkZWZpbml0aW9ucyBmb3IgbmVzdGVkIHR5cGVzLiBVc2VkIHRvIGlkZW50aWZ5IGFuZCBwYXJzZSBuZXN0ZWQgQXJyYXlzIGFuZCBTY2hlbWFzLlxuICAgIFNob3VsZCBub3QgYmUgZXh0ZW5kZWQgb3Igb3ZlcnJpZGRlbi5cbiAgIyMjXG4gIE5FU1RFRF9UWVBFUyA6XG4gICAgQXJyYXkgIDpcbiAgICAgIGN0b3IgICAgICAgIDogQXJyYXlcbiAgICAgIHN0cmluZyAgICAgIDogJ2FycmF5J1xuICAgICAgaWRlbnRpZmllciAgOiBfLmlzQXJyYXlcbiAgICAgIHBhcnNlciAgICAgIDogXy50b0FycmF5XG4gICAgICBjaGlsZFR5cGUgICA6IG51bGxcbiAgICAgIGNoaWxkUGFyc2VyIDogbnVsbFxuICAgICAgZXF1YWxzICAgICA6IChhLCBiKSAtPiBfLmlzRXF1YWwgYSwgYlxuICAgIFNjaGVtYSA6XG4gICAgICBjdG9yICAgICAgIDogT2JqZWN0XG4gICAgICBzdHJpbmcgICAgIDogJ3NjaGVtYSdcbiAgICAgIGlkZW50aWZpZXIgOiBudWxsXG4gICAgICBwYXJzZXIgICAgIDogbnVsbFxuICAgICAgY2hpbGRUeXBlICA6IG51bGxcbiAgICAgIGVxdWFscyAgICAgOiAoYSwgYikgLT4gYSA9PSBiXG5cblxuICAjIFVzZWQgaW50ZXJuYWxseSB0byByZXNvbHZlIGEgdHlwZSBkZWNsYXJhdGlvbiB0byBpdHMgcHJpbWl0aXZlIHR5cGUuXG4gICMgTWF0Y2hlcyBhIHByaW1pdGl2ZSB0eXBlIGlmIGl0IGlzLi4uXG4gICMgLSBhIHJlZmVyZW5jZSB0byB0aGUgb2JqZWN0IHN0cmFpZ2h0IGZyb20gdGhlIGBTY2hlbWEuVFlQRVNgIG9iamVjdFxuICAjIC0gYSByZWZlcmVuY2UgdG8gdGhlIGBjdG9yYFxuICAjIC0gYSBtYXRjaCB3aXRoIHRoZSB0eXBlIGBzdHJpbmdgIChjYXNlIGluc2Vuc2l0aXZlKVxuICBnZXRQcmltaXRpdmVUeXBlT2YgOiAodHlwZSkgPT5cbiAgICBmb3IgaywgVFlQRSBvZiBAVFlQRVNcbiAgICAgIGlmIHR5cGUgPT0gVFlQRSBvclxuICAgICAgICAgIChUWVBFLmN0b3IgJiYgdHlwZSA9PSBUWVBFLmN0b3IpIG9yXG4gICAgICAgICAgdHlwZT8udG9Mb3dlckNhc2U/KCkgPT0gVFlQRS5zdHJpbmdcblxuICAgICAgICByZXR1cm4gVFlQRVxuXG4gICAgcmV0dXJuIG51bGxcblxuICAjIEZ1bmN0aW9uIHRoYXQgYnVpbGRzIGlkZW50aWZpZXIgYW5kIHBhcnNlciBmb3IgbmVzdGVkIHNjaGVtYSB0eXBlcy4gTmVlZHMgdG8gYmUgZmFjdG9yZWQgb3V0XG4gICMgYmVjYXVzZSBuZXN0ZWQgc2NoZW1hcyBtYXkgYmUgcmVzb2x2ZWQgbGF6aWx5IGF0IGEgbGF0ZXIgdGltZVxuICByZXNvbHZlU2NoZW1hVHlwZSA6ICh0eXBlLCBjaGlsZFR5cGUpID0+XG4gICAgdHlwZS5jaGlsZFR5cGUgPSBjaGlsZFR5cGVcbiAgICB0eXBlLmlkZW50aWZpZXIgPSAodmFsKSAtPlxuICAgICAgcmV0dXJuIHZhbCBpbnN0YW5jZW9mIGNoaWxkVHlwZVxuICAgIHR5cGUucGFyc2VyID0gKHZhbCkgLT5cbiAgICAgIHJldHVybiBuZXcgY2hpbGRUeXBlKHZhbClcblxuICAjICMjIyByZXNvbHZlVHlwZVxuICAjIFJlc29sdmVzIGEgdHlwZSBkZWNsYXJhdGlvbiB0byBhIHByaW1pdGl2ZSBvciBuZXN0ZWQgdHlwZS4gVXNlZCBpbnRlcm5hbGx5IHdoZW4gbm9ybWFsaXppbmcgYSBzY2hlbWEuXG4gIHJlc29sdmVUeXBlIDogKHR5cGVEZWYpID0+XG4gICAgIyAtIEF0dGVtcHQgdG8gcmVzb2x2ZSB0aGUgdHlwZSBkZWNsYXJhdGlvbiB0byBhIHByaW1pdGl2ZSB0eXBlXG4gICAgdHlwZSA9IEBnZXRQcmltaXRpdmVUeXBlT2YgdHlwZURlZlxuXG4gICAgaWYgIXR5cGU/XG4gICAgICAjIC0gSWYgdGhlIHR5cGUgZGVmaW5pdGlvbiBpcyBhbiBhcnJheSBgW11gXG4gICAgICBpZiBfLmlzQXJyYXkgdHlwZURlZlxuICAgICAgICAjICAgLSBTZXQgdGhlIHR5cGUgdG8gYSBjbG9uZSBvZiB0aGUgYXJyYXkgTkVTVEVEX1RZUEVcbiAgICAgICAgdHlwZSA9IF8uY2xvbmVEZWVwIEBORVNURURfVFlQRVMuQXJyYXlcblxuICAgICAgICAjICAgLSBSZWN1cnNlIHRvIHJlc29sdmUgY2hpbGRUeXBlIG9mIGFycmF5IG1lbWJlcnNcbiAgICAgICAgaWYgdHlwZURlZi5sZW5ndGhcbiAgICAgICAgICBjaGlsZFR5cGUgPSBAcmVzb2x2ZVR5cGUodHlwZURlZlswXSlcblxuICAgICAgICAjICAgLSBUaHJvdyBhbiBlcnJvciBpZiB0eXBlIGlzIG5vdCBleHBsaWNpdGx5IGRlY2xhcmVkXG4gICAgICAgIGlmICFjaGlsZFR5cGUgdGhlbiB0aHJvdyBuZXcgRXJyb3IgXCJFcnJvciByZXNvbHZpbmcgdHlwZSBvZiBhcnJheSB2YWx1ZSAje3R5cGVEZWZ9XCJcblxuICAgICAgICB0eXBlLmNoaWxkVHlwZSA9IGNoaWxkVHlwZVxuICAgICAgICAjICAgLSBXcml0ZSBwYXJzZXIgZm9yIGNoaWxkIG1lbWJlcnMgb2YgdGhlIGFycmF5XG4gICAgICAgIHR5cGUuY2hpbGRQYXJzZXIgPSAodmFsKSAtPlxuICAgICAgICAgIGZvciBpbmRleCwgbWVtYmVyIG9mIHZhbFxuICAgICAgICAgICAgaWYgIWNoaWxkVHlwZS5pZGVudGlmaWVyKG1lbWJlcilcbiAgICAgICAgICAgICAgdmFsW2luZGV4XSA9IGNoaWxkVHlwZS5wYXJzZXIobWVtYmVyKVxuXG4gICAgICAgICAgcmV0dXJuIHZhbFxuXG4gICAgICAgICMjI1xuICAgICAgICAtIElmIHRoZSB0eXBlIGRlZmluaXRpb24gaXMgYW4gb2JqZWN0IGB7fWBcbiAgICAgICAgICAtIENyZWF0ZSBhIG5ldyBTY2hlbWEgZnJvbSB0aGUgb2JqZWN0XG4gICAgICAgICAgLSBUcmVhdCB0aGUgZmllbGQgYXMgYSBuZXN0ZWQgU2NoZW1hXG4gICAgICAgICAgLSBTZXQgaWRlbnRpZmllciBhbmQgcGFyc2VyIGZ1bmN0aW9ucyBpbW1lZGlhdGVseVxuICAgICAgICAjIyNcbiAgICAgIGVsc2UgaWYgXy5pc1BsYWluT2JqZWN0IHR5cGVEZWZcbiAgICAgICAgdHlwZSA9IF8uY2xvbmVEZWVwIEBORVNURURfVFlQRVMuU2NoZW1hXG4gICAgICAgIGNoaWxkVHlwZSA9IHJlcXVpcmUoJy4vTW9kZWxGYWN0b3J5JykuY3JlYXRlIHR5cGVEZWZcbiAgICAgICAgQHJlc29sdmVTY2hlbWFUeXBlIHR5cGUsIGNoaWxkVHlwZVxuXG4gICAgICAgICMjI1xuICAgICAgICAtIElmIHRoZSB0eXBlIGRlZmluaXRpb24gaXMgYSByZWZlcmVuY2UgdG8gYSBTY2hlbWEgY29uc3RydWN0b3JcbiAgICAgICAgICAtIFRyZWF0IHRoZSBmaWVsZCBhcyBhIG5lc3RlZCBTY2hlbWFcbiAgICAgICAgICAtIFNldCBpZGVudGlmaWVyIGFuZCBwYXJzZXIgZnVuY3Rpb25zIGltbWVkaWF0ZWx5XG4gICAgICAgICMjI1xuICAgICAgZWxzZSBpZiBfLmlzRnVuY3Rpb24odHlwZURlZikgJiYgdHlwZURlZi5fX3NjaGVtYUlkXG4gICAgICAgIHR5cGUgPSBfLmNsb25lRGVlcCBATkVTVEVEX1RZUEVTLlNjaGVtYVxuICAgICAgICBjaGlsZFR5cGUgPSB0eXBlRGVmXG4gICAgICAgIEByZXNvbHZlU2NoZW1hVHlwZSB0eXBlLCBjaGlsZFR5cGVcblxuICAgICAgICAjIyNcbiAgICAgICAgLSBJZiB0aGUgdHlwZSBkZWZpbml0aW9uIGlzIGEgc3RyaW5nIHRoYXQgYmVnaW5zIHdpdGggU2NoZW1hOiwgc3VjaCBhcyBgJ1NjaGVtYTpDYXInYFxuICAgICAgICAgIC0gSXQgaXMgYXNzdW1lZCB0aGF0IHRoZSBmaWVsZCBpcyBhIHJlZmVyZW5jZSB0byBhIG5lc3RlZCBTY2hlbWEgdGhhdCB3aWxsIGJlIHJlZ2lzdGVyZWQgd2l0aCB0aGUgbmFtZSBDYXIsXG4gICAgICAgIGJ1dCBtYXkgbm90IGJlIHJlZ2lzdGVyZWQgeWV0XG4gICAgICAgICAgLSBUaGUgU2NoZW1hIGlzIG5vdCByZXNvbHZlZCBpbW1lZGlhdGVseVxuICAgICAgICAgIC0gVGhlIHBhcnNlciBhbmQgaWRlbnRpZmllciBmdW5jdGlvbnMgYXJlIHdyaXR0ZW4gYXMgd3JhcHBlcnMsIHNvIHRoYXQgdGhlIGZpcnN0IHRpbWUgdGhleSBhcmUgaW52b2tlZCB0aGUgU2NoZW1hXG4gICAgICAgIHdpbGwgYmUgbG9va2VkIHVwIGF0IHRoYXQgdGltZSB2aWEgYFNjaGVtaW5nLmdldGAsIGFuZCByZWFsIGlkZW50aWZpZXIgYW5kIHBhcnNlciBhcmUgc2V0IGF0IHRoYXQgdGltZS5cbiAgICAgICAgICAtIElmIHRoZSByZWdpc3RlcmVkIFNjaGVtYSBjYW5ub3QgYmUgcmVzb2x2ZWQsIHRocm93IGFuIGVycm9yLlxuICAgICAgICAjIyNcbiAgICAgIGVsc2UgaWYgXy5pc1N0cmluZyh0eXBlRGVmKSAmJiB0eXBlRGVmWy4uLjddID09ICdTY2hlbWE6J1xuICAgICAgICB0eXBlID0gXy5jbG9uZURlZXAgQE5FU1RFRF9UWVBFUy5TY2hlbWFcbiAgICAgICAgY2hpbGRUeXBlID0gdHlwZURlZls3Li5dXG4gICAgICAgIGZvciBmbiBpbiBbJ2lkZW50aWZpZXInLCAncGFyc2VyJ11cbiAgICAgICAgICBkbyAoZm4pID0+XG4gICAgICAgICAgICB0eXBlW2ZuXSA9ICh2YWwpID0+XG4gICAgICAgICAgICAgIGNoaWxkVHlwZSA9IHJlcXVpcmUoJy4vUmVnaXN0cnknKS5nZXQgY2hpbGRUeXBlXG4gICAgICAgICAgICAgIGlmICFjaGlsZFR5cGVcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IgXCJFcnJvciByZXNvbHZpbmcgI3t0eXBlRGVmfSBvbiBsYXp5IGluaXRpYWxpemF0aW9uXCJcbiAgICAgICAgICAgICAgQHJlc29sdmVTY2hlbWFUeXBlIHR5cGUsIGNoaWxkVHlwZVxuXG4gICAgICAgICAgICAgIHJldHVybiB0eXBlW2ZuXSB2YWxcblxuXG4gICAgcmV0dXJuIHR5cGUgfHwgbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBUeXBlcygpXG4iXX0=
;
;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var ChangeManager, _,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

_ = require('./utilities');

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



},{"./utilities":8}],2:[function(require,module,exports){
var _;

_ = window._;

window.Scheming = require('./Scheming');



},{"./Scheming":6}],3:[function(require,module,exports){
var ChangeManager, InstanceFactory, Types, _,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  slice = [].slice;

_ = require('./utilities');

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
            (_this.ARRAY_MUTATORS || []).forEach(function(method) {
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
        properties = Object.keys(normalizedSchema);
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
        return (val || []).forEach(function(schema, i) {
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
      triggeringProperties = Object.keys(queuedChanges);
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
          } catch (error) {
            e = error;
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



},{"./ChangeManager":1,"./Types":7,"./utilities":8}],4:[function(require,module,exports){
var InstanceFactory, ModelFactory, Registry, Types, _,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  slice = [].slice;

_ = require('./utilities');

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
    } catch (error1) {
      err = error1;
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
              } catch (error1) {
                e = error1;
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



},{"./InstanceFactory":3,"./Registry":5,"./Types":7,"./utilities":8}],5:[function(require,module,exports){
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

_ = require('./utilities');

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



},{"./ModelFactory":4,"./Registry":5,"./utilities":8}],8:[function(require,module,exports){
var clone, cloneDeep, contains, containsArray, containsObject, defaults, extend, has, identity, intersection, isArray, isBoolean, isDate, isEqual, isEqualArray, isFunction, isNumber, isObjectLike, isPlainObject, isString, isVoid, remove, size, toArray, unique,
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

isArray = function(x) {
  return Array.isArray(x);
};

extend = function() {
  var into, values;
  into = arguments[0], values = 2 <= arguments.length ? slice.call(arguments, 1) : [];
  return values.reduce((function(acc, value) {
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

isPlainObject = _.isPlainObject;

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
    return Object.keys(into).map(function(x) {
      return [x, into[x]];
    }).some(function(kvp) {
      return value(kvp[1], kvp[0]);
    });
  } else {
    return containsObject(into, (function(x) {
      return x === value;
    }));
  }
};

contains = function(containsInto, containsValue) {
  if (isObjectLike(containsInto)) {
    return containsObject(containsInto, containsValue);
  } else {
    return containsArray(containsInto, containsValue);
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
  return head.filter(function(v) {
    return rest.every(function(restContainers) {
      return contains(restContainers, v);
    });
  });
};

defaults = function(orig, defaultValues) {
  return extend({}, defaultValues, orig);
};

isEqual = function(left, right) {
  if (isArray(left)) {
    return isEqualArray(left, right);
  } else if (isPlainObject(left)) {
    return isPlainObject(right) && Object.keys(left).length === Object.keys(right) && Object.keys(left).every(function(key) {
      return left[key] === right[key];
    });
  } else {
    return left === right;
  }
};

remove = function(ns, n) {
  return ns.splice(ns.indexOf(n), 1);
};

module.exports = {
  clone: clone,
  cloneDeep: cloneDeep,
  isObjectLike: isObjectLike,
  identity: identity,
  isString: isString,
  isNumber: isNumber,
  isDate: isDate,
  isBoolean: isBoolean,
  isArray: isArray,
  isEqualArray: isEqualArray,
  isPlainObject: isPlainObject,
  isFunction: isFunction,
  toArray: toArray,
  contains: contains,
  has: has,
  size: size,
  unique: unique,
  intersection: intersection,
  defaults: defaults,
  extend: extend,
  isEqual: isEqual,
  remove: remove
};



},{}]},{},[2])
;

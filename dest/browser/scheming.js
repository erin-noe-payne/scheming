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


},{}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9lcmluLm5vZS1wYXluZS9sb2NhbC9zY2hlbWluZy9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2VyaW4ubm9lLXBheW5lL2xvY2FsL3NjaGVtaW5nL3NyYy9DaGFuZ2VNYW5hZ2VyLmNvZmZlZSIsIi9Vc2Vycy9lcmluLm5vZS1wYXluZS9sb2NhbC9zY2hlbWluZy9zcmMvRXhwb3J0QnJvd3Nlci5jb2ZmZWUiLCIvVXNlcnMvZXJpbi5ub2UtcGF5bmUvbG9jYWwvc2NoZW1pbmcvc3JjL0luc3RhbmNlRmFjdG9yeS5jb2ZmZWUiLCIvVXNlcnMvZXJpbi5ub2UtcGF5bmUvbG9jYWwvc2NoZW1pbmcvc3JjL01vZGVsRmFjdG9yeS5jb2ZmZWUiLCIvVXNlcnMvZXJpbi5ub2UtcGF5bmUvbG9jYWwvc2NoZW1pbmcvc3JjL1JlZ2lzdHJ5LmNvZmZlZSIsIi9Vc2Vycy9lcmluLm5vZS1wYXluZS9sb2NhbC9zY2hlbWluZy9zcmMvU2NoZW1pbmcuY29mZmVlIiwiL1VzZXJzL2VyaW4ubm9lLXBheW5lL2xvY2FsL3NjaGVtaW5nL3NyYy9UeXBlcy5jb2ZmZWUiLCIvVXNlcnMvZXJpbi5ub2UtcGF5bmUvbG9jYWwvc2NoZW1pbmcvc3JjL3V0aWxpdGllcy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBDaGFuZ2VNYW5hZ2VyLCBfLFxuICBiaW5kID0gZnVuY3Rpb24oZm4sIG1lKXsgcmV0dXJuIGZ1bmN0aW9uKCl7IHJldHVybiBmbi5hcHBseShtZSwgYXJndW1lbnRzKTsgfTsgfTtcblxuXyA9IHJlcXVpcmUoJy4vdXRpbGl0aWVzJyk7XG5cbkNoYW5nZU1hbmFnZXIgPSAoZnVuY3Rpb24oKSB7XG4gIENoYW5nZU1hbmFnZXIucHJvdG90eXBlLlRIUk9UVExFID0ge1xuICAgIFRJTUVPVVQ6ICd0aW1lb3V0JyxcbiAgICBJTU1FRElBVEU6ICdpbW1lZGlhdGUnLFxuICAgIEFOSU1BVElPTl9GUkFNRTogJ2FuaW1hdGlvbkZyYW1lJ1xuICB9O1xuXG4gIENoYW5nZU1hbmFnZXIucHJvdG90eXBlLklURVJBVElPTl9MSU1JVCA9IDEwMDtcblxuICBmdW5jdGlvbiBDaGFuZ2VNYW5hZ2VyKCkge1xuICAgIHRoaXMucmVzb2x2ZSA9IGJpbmQodGhpcy5yZXNvbHZlLCB0aGlzKTtcbiAgICB0aGlzLmZsdXNoID0gYmluZCh0aGlzLmZsdXNoLCB0aGlzKTtcbiAgICB0aGlzLmdldFF1ZXVlZENoYW5nZXMgPSBiaW5kKHRoaXMuZ2V0UXVldWVkQ2hhbmdlcywgdGhpcyk7XG4gICAgdGhpcy5xdWV1ZUNoYW5nZXMgPSBiaW5kKHRoaXMucXVldWVDaGFuZ2VzLCB0aGlzKTtcbiAgICB0aGlzLnJlc2V0ID0gYmluZCh0aGlzLnJlc2V0LCB0aGlzKTtcbiAgICB0aGlzLmNsZWFudXBDeWNsZSA9IGJpbmQodGhpcy5jbGVhbnVwQ3ljbGUsIHRoaXMpO1xuICAgIHRoaXMudW5yZWdpc3RlclJlc29sdmVDYWxsYmFjayA9IGJpbmQodGhpcy51bnJlZ2lzdGVyUmVzb2x2ZUNhbGxiYWNrLCB0aGlzKTtcbiAgICB0aGlzLnJlZ2lzdGVyUmVzb2x2ZUNhbGxiYWNrID0gYmluZCh0aGlzLnJlZ2lzdGVyUmVzb2x2ZUNhbGxiYWNrLCB0aGlzKTtcbiAgICB0aGlzLnVucmVnaXN0ZXJRdWV1ZUNhbGxiYWNrID0gYmluZCh0aGlzLnVucmVnaXN0ZXJRdWV1ZUNhbGxiYWNrLCB0aGlzKTtcbiAgICB0aGlzLnJlZ2lzdGVyUXVldWVDYWxsYmFjayA9IGJpbmQodGhpcy5yZWdpc3RlclF1ZXVlQ2FsbGJhY2ssIHRoaXMpO1xuICAgIHRoaXMuc2V0VGhyb3R0bGUgPSBiaW5kKHRoaXMuc2V0VGhyb3R0bGUsIHRoaXMpO1xuICAgIHRoaXMuY2hhbmdlcyA9IHt9O1xuICAgIHRoaXMuaW50ZXJuYWxDaGFuZ2VRdWV1ZSA9IFtdO1xuICAgIHRoaXMudGltZW91dCA9IG51bGw7XG4gICAgdGhpcy5yZWN1cnNpb25Db3VudCA9IDA7XG4gICAgdGhpcy5zZXRUaHJvdHRsZSh0aGlzLlRIUk9UVExFLlRJTUVPVVQpO1xuICAgIHRoaXMuX2FjdGl2ZUNsZWFyVGltZW91dCA9IG51bGw7XG4gICAgdGhpcy5fcXVldWVDYWxsYmFjayA9IG51bGw7XG4gICAgdGhpcy5fcmVzb2x2ZUNhbGxiYWNrID0gbnVsbDtcbiAgfVxuXG4gIENoYW5nZU1hbmFnZXIucHJvdG90eXBlLnNldFRocm90dGxlID0gZnVuY3Rpb24odGhyb3R0bGUpIHtcbiAgICBpZiAoIV8uY29udGFpbnModGhpcy5USFJPVFRMRSwgdGhyb3R0bGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaHJvdHRsZSBvcHRpb24gbXVzdCBiZSBzZXQgdG8gb25lIG9mIHRoZSBzdHJhdGVnaWVzIHNwZWNpZmllZCBvbiBTY2hlbWluZy5USFJPVFRMRVwiKTtcbiAgICB9XG4gICAgc3dpdGNoICh0aHJvdHRsZSkge1xuICAgICAgY2FzZSB0aGlzLlRIUk9UVExFLlRJTUVPVVQ6XG4gICAgICAgIHRoaXMuc2V0VGltZW91dCA9IChmdW5jdGlvbihfdGhpcykge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBfdGhpcy50aW1lb3V0ICE9IG51bGwgPyBfdGhpcy50aW1lb3V0IDogX3RoaXMudGltZW91dCA9IHNldFRpbWVvdXQoX3RoaXMucmVzb2x2ZSwgMCk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfSkodGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzLmNsZWFyVGltZW91dCA9IChmdW5jdGlvbihfdGhpcykge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChfdGhpcy50aW1lb3V0KTtcbiAgICAgICAgICAgIHJldHVybiBfdGhpcy50aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgICB9O1xuICAgICAgICB9KSh0aGlzKTtcbiAgICAgIGNhc2UgdGhpcy5USFJPVFRMRS5JTU1FRElBVEU6XG4gICAgICAgIGlmICgodHlwZW9mIHNldEltbWVkaWF0ZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBzZXRJbW1lZGlhdGUgIT09IG51bGwpICYmICh0eXBlb2YgY2xlYXJJbW1lZGlhdGUgIT09IFwidW5kZWZpbmVkXCIgJiYgY2xlYXJJbW1lZGlhdGUgIT09IG51bGwpKSB7XG4gICAgICAgICAgdGhpcy5zZXRUaW1lb3V0ID0gKGZ1bmN0aW9uKF90aGlzKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIHJldHVybiBfdGhpcy50aW1lb3V0ICE9IG51bGwgPyBfdGhpcy50aW1lb3V0IDogX3RoaXMudGltZW91dCA9IHNldEltbWVkaWF0ZShfdGhpcy5yZXNvbHZlKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfSkodGhpcyk7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuY2xlYXJUaW1lb3V0ID0gKGZ1bmN0aW9uKF90aGlzKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIGNsZWFySW1tZWRpYXRlKF90aGlzLnRpbWVvdXQpO1xuICAgICAgICAgICAgICByZXR1cm4gX3RoaXMudGltZW91dCA9IG51bGw7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH0pKHRoaXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnNvbGUud2FybihcIkNhbm5vdCB1c2Ugc3RyYXRlZ3kgSU1NRURJQVRFOiBgc2V0SW1tZWRpYXRlYCBvciBgY2xlYXJJbW1lZGlhdGVgIGFyZSBub3QgYXZhaWxhYmxlIGluIHRoZSBjdXJyZW50IGVudmlyb25tZW50LlwiKTtcbiAgICAgICAgICByZXR1cm4gdGhpcy5zZXRUaHJvdHRsZSh0aGlzLlRIUk9UVExFLlRJTUVPVVQpO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSB0aGlzLlRIUk9UVExFLkFOSU1BVElPTl9GUkFNRTpcbiAgICAgICAgaWYgKCh0eXBlb2YgcmVxdWVzdEFuaW1hdGlvbkZyYW1lICE9PSBcInVuZGVmaW5lZFwiICYmIHJlcXVlc3RBbmltYXRpb25GcmFtZSAhPT0gbnVsbCkgJiYgKHR5cGVvZiBjYW5jZWxBbmltYXRpb25GcmFtZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBjYW5jZWxBbmltYXRpb25GcmFtZSAhPT0gbnVsbCkpIHtcbiAgICAgICAgICB0aGlzLnNldFRpbWVvdXQgPSAoZnVuY3Rpb24oX3RoaXMpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIF90aGlzLnRpbWVvdXQgIT0gbnVsbCA/IF90aGlzLnRpbWVvdXQgOiBfdGhpcy50aW1lb3V0ID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKF90aGlzLnJlc29sdmUpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9KSh0aGlzKTtcbiAgICAgICAgICByZXR1cm4gdGhpcy5jbGVhclRpbWVvdXQgPSAoZnVuY3Rpb24oX3RoaXMpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgY2FuY2VsQW5pbWF0aW9uRnJhbWUoX3RoaXMudGltZW91dCk7XG4gICAgICAgICAgICAgIHJldHVybiBfdGhpcy50aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfSkodGhpcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKFwiQ2Fubm90IHVzZSBzdHJhdGVneSBBTklNQVRJT05fRlJBTUU6IGByZXF1ZXN0QW5pbWF0aW9uRnJhbWVgIG9yIGBjYW5jZWxBbmltYXRpb25GcmFtZWAgYXJlIG5vdCBhdmFpbGFibGUgaW4gdGhlIGN1cnJlbnQgZW52aXJvbm1lbnQuXCIpO1xuICAgICAgICAgIHJldHVybiB0aGlzLnNldFRocm90dGxlKHRoaXMuVEhST1RUTEUuVElNRU9VVCk7XG4gICAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgQ2hhbmdlTWFuYWdlci5wcm90b3R5cGUuc2V0VGltZW91dCA9IGZ1bmN0aW9uKCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkEgdGhyb3R0bGUgc3RyYXRlZ3kgbXVzdCBiZSBzZXQuXCIpO1xuICB9O1xuXG4gIGNsZWFyVGltZW91dChmdW5jdGlvbigpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJBIHRocm90dGxlIHN0cmF0ZWd5IG11c3QgYmUgc2V0LlwiKTtcbiAgfSk7XG5cbiAgQ2hhbmdlTWFuYWdlci5wcm90b3R5cGUucmVnaXN0ZXJRdWV1ZUNhbGxiYWNrID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICBpZiAoIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3F1ZXVlQ2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgfTtcblxuICBDaGFuZ2VNYW5hZ2VyLnByb3RvdHlwZS51bnJlZ2lzdGVyUXVldWVDYWxsYmFjayA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9xdWV1ZUNhbGxiYWNrID0gbnVsbDtcbiAgfTtcblxuICBDaGFuZ2VNYW5hZ2VyLnByb3RvdHlwZS5yZWdpc3RlclJlc29sdmVDYWxsYmFjayA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgaWYgKCFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9yZXNvbHZlQ2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgfTtcblxuICBDaGFuZ2VNYW5hZ2VyLnByb3RvdHlwZS51bnJlZ2lzdGVyUmVzb2x2ZUNhbGxiYWNrID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Jlc29sdmVDYWxsYmFjayA9IG51bGw7XG4gIH07XG5cbiAgQ2hhbmdlTWFuYWdlci5wcm90b3R5cGUuY2xlYW51cEN5Y2xlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jaGFuZ2VzID0ge307XG4gICAgdGhpcy5pbnRlcm5hbENoYW5nZVF1ZXVlID0gW107XG4gICAgaWYgKHR5cGVvZiB0aGlzLl9hY3RpdmVDbGVhclRpbWVvdXQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgdGhpcy5fYWN0aXZlQ2xlYXJUaW1lb3V0KCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJlY3Vyc2lvbkNvdW50ID0gMDtcbiAgfTtcblxuICBDaGFuZ2VNYW5hZ2VyLnByb3RvdHlwZS5yZXNldCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuY2hhbmdlcyA9IHt9O1xuICAgIHRoaXMuaW50ZXJuYWxDaGFuZ2VRdWV1ZSA9IFtdO1xuICAgIGlmICh0eXBlb2YgdGhpcy5fYWN0aXZlQ2xlYXJUaW1lb3V0ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIHRoaXMuX2FjdGl2ZUNsZWFyVGltZW91dCgpO1xuICAgIH1cbiAgICB0aGlzLnRpbWVvdXQgPSBudWxsO1xuICAgIHRoaXMucmVjdXJzaW9uQ291bnQgPSAwO1xuICAgIHRoaXMuc2V0VGhyb3R0bGUodGhpcy5USFJPVFRMRS5USU1FT1VUKTtcbiAgICB0aGlzLl9xdWV1ZUNhbGxiYWNrID0gbnVsbDtcbiAgICByZXR1cm4gdGhpcy5fcmVzb2x2ZUNhbGxiYWNrID0gbnVsbDtcbiAgfTtcblxuICBDaGFuZ2VNYW5hZ2VyLnByb3RvdHlwZS5xdWV1ZUNoYW5nZXMgPSBmdW5jdGlvbihhcmcsIGZpcmVXYXRjaGVycykge1xuICAgIHZhciBiYXNlLCBjaGFuZ2VkUHJvcHMsIGVxdWFscywgZm9yY2UsIGlkLCBuZXdWYWwsIG9sZFZhbCwgcHJvcE5hbWU7XG4gICAgaWQgPSBhcmcuaWQsIHByb3BOYW1lID0gYXJnLnByb3BOYW1lLCBvbGRWYWwgPSBhcmcub2xkVmFsLCBuZXdWYWwgPSBhcmcubmV3VmFsLCBlcXVhbHMgPSBhcmcuZXF1YWxzLCBmb3JjZSA9IGFyZy5mb3JjZTtcbiAgICBpZiAoIV8uaGFzKHRoaXMuY2hhbmdlcywgaWQpKSB7XG4gICAgICBpZiAoKGJhc2UgPSB0aGlzLmNoYW5nZXMpW2lkXSA9PSBudWxsKSB7XG4gICAgICAgIGJhc2VbaWRdID0ge1xuICAgICAgICAgIGNoYW5nZWRQcm9wczoge30sXG4gICAgICAgICAgZmlyZVdhdGNoZXJzOiBmaXJlV2F0Y2hlcnNcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHRoaXMuaW50ZXJuYWxDaGFuZ2VRdWV1ZS5wdXNoKGlkKTtcbiAgICB9XG4gICAgY2hhbmdlZFByb3BzID0gdGhpcy5jaGFuZ2VzW2lkXS5jaGFuZ2VkUHJvcHM7XG4gICAgaWYgKHByb3BOYW1lKSB7XG4gICAgICBpZiAoXy5oYXMoY2hhbmdlZFByb3BzLCBwcm9wTmFtZSkgJiYgZXF1YWxzKGNoYW5nZWRQcm9wc1twcm9wTmFtZV0sIG5ld1ZhbCkpIHtcbiAgICAgICAgZGVsZXRlIGNoYW5nZWRQcm9wc1twcm9wTmFtZV07XG4gICAgICB9IGVsc2UgaWYgKGZvcmNlIHx8ICghXy5oYXMoY2hhbmdlZFByb3BzLCBwcm9wTmFtZSkgJiYgIWVxdWFscyhvbGRWYWwsIG5ld1ZhbCkpKSB7XG4gICAgICAgIGNoYW5nZWRQcm9wc1twcm9wTmFtZV0gPSBvbGRWYWw7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0aGlzLnRpbWVvdXQgPT0gbnVsbCkge1xuICAgICAgaWYgKHR5cGVvZiB0aGlzLl9xdWV1ZUNhbGxiYWNrID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdGhpcy5fcXVldWVDYWxsYmFjaygpO1xuICAgICAgfVxuICAgICAgdGhpcy5zZXRUaW1lb3V0KCk7XG4gICAgICByZXR1cm4gdGhpcy5fYWN0aXZlQ2xlYXJUaW1lb3V0ID0gdGhpcy5jbGVhclRpbWVvdXQ7XG4gICAgfVxuICB9O1xuXG4gIENoYW5nZU1hbmFnZXIucHJvdG90eXBlLmdldFF1ZXVlZENoYW5nZXMgPSBmdW5jdGlvbihhcmcpIHtcbiAgICB2YXIgaWQsIHByb3BOYW1lLCByZWY7XG4gICAgaWQgPSBhcmcuaWQsIHByb3BOYW1lID0gYXJnLnByb3BOYW1lO1xuICAgIHJldHVybiAocmVmID0gdGhpcy5jaGFuZ2VzW2lkXSkgIT0gbnVsbCA/IHJlZi5jaGFuZ2VkUHJvcHNbcHJvcE5hbWVdIDogdm9pZCAwO1xuICB9O1xuXG4gIENoYW5nZU1hbmFnZXIucHJvdG90eXBlLmZsdXNoID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMucmVzb2x2ZSgpO1xuICB9O1xuXG4gIENoYW5nZU1hbmFnZXIucHJvdG90eXBlLnJlc29sdmUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgY2hhbmdlZFByb3BzLCBjaGFuZ2VzLCBmaXJlV2F0Y2hlcnMsIGksIGlkLCBpbnRlcm5hbENoYW5nZXMsIGxlbiwgcmVmLCByZWYxO1xuICAgIHRoaXMucmVjdXJzaW9uQ291bnQrKztcbiAgICBpZiAodGhpcy5JVEVSQVRJT05fTElNSVQgPiAwICYmIHRoaXMucmVjdXJzaW9uQ291bnQgPiB0aGlzLklURVJBVElPTl9MSU1JVCkge1xuICAgICAgY2hhbmdlcyA9IHRoaXMuY2hhbmdlcztcbiAgICAgIHRoaXMuY2xlYW51cEN5Y2xlKCk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBYm9ydGluZyBjaGFuZ2UgcHJvcGFnYXRpb24gYWZ0ZXIgXCIgKyB0aGlzLklURVJBVElPTl9MSU1JVCArIFwiIGN5Y2xlcy5cXG5UaGlzIGlzIHByb2JhYmx5IGluZGljYXRpdmUgb2YgYSBjaXJjdWxhciB3YXRjaC4gQ2hlY2sgdGhlIGZvbGxvd2luZyB3YXRjaGVzIGZvciBjbHVlczpcXG5cIiArIChKU09OLnN0cmluZ2lmeShjaGFuZ2VzKSkpO1xuICAgIH1cbiAgICBpbnRlcm5hbENoYW5nZXMgPSBfLnVuaXF1ZSh0aGlzLmludGVybmFsQ2hhbmdlUXVldWUpO1xuICAgIHRoaXMuaW50ZXJuYWxDaGFuZ2VRdWV1ZSA9IFtdO1xuICAgIGZvciAoaSA9IDAsIGxlbiA9IGludGVybmFsQ2hhbmdlcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgaWQgPSBpbnRlcm5hbENoYW5nZXNbaV07XG4gICAgICByZWYgPSB0aGlzLmNoYW5nZXNbaWRdLCBjaGFuZ2VkUHJvcHMgPSByZWYuY2hhbmdlZFByb3BzLCBmaXJlV2F0Y2hlcnMgPSByZWYuZmlyZVdhdGNoZXJzO1xuICAgICAgZmlyZVdhdGNoZXJzKGNoYW5nZWRQcm9wcywgJ2ludGVybmFsJyk7XG4gICAgfVxuICAgIGlmICh0aGlzLmludGVybmFsQ2hhbmdlUXVldWUubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gdGhpcy5yZXNvbHZlKCk7XG4gICAgfVxuICAgIGNoYW5nZXMgPSB0aGlzLmNoYW5nZXM7XG4gICAgdGhpcy5jaGFuZ2VzID0ge307XG4gICAgZm9yIChpZCBpbiBjaGFuZ2VzKSB7XG4gICAgICByZWYxID0gY2hhbmdlc1tpZF0sIGNoYW5nZWRQcm9wcyA9IHJlZjEuY2hhbmdlZFByb3BzLCBmaXJlV2F0Y2hlcnMgPSByZWYxLmZpcmVXYXRjaGVycztcbiAgICAgIGZpcmVXYXRjaGVycyhjaGFuZ2VkUHJvcHMsICdleHRlcm5hbCcpO1xuICAgIH1cbiAgICBpZiAoXy5zaXplKHRoaXMuY2hhbmdlcykgPiAwKSB7XG4gICAgICByZXR1cm4gdGhpcy5yZXNvbHZlKCk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgdGhpcy5fcmVzb2x2ZUNhbGxiYWNrID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIHRoaXMuX3Jlc29sdmVDYWxsYmFjaygpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5jbGVhbnVwQ3ljbGUoKTtcbiAgfTtcblxuICByZXR1cm4gQ2hhbmdlTWFuYWdlcjtcblxufSkoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgQ2hhbmdlTWFuYWdlcigpO1xuXG4iLCJ2YXIgXztcblxuXyA9IHdpbmRvdy5fO1xuXG53aW5kb3cuU2NoZW1pbmcgPSByZXF1aXJlKCcuL1NjaGVtaW5nJyk7XG5cbiIsInZhciBDaGFuZ2VNYW5hZ2VyLCBJbnN0YW5jZUZhY3RvcnksIFR5cGVzLCBfLFxuICBiaW5kID0gZnVuY3Rpb24oZm4sIG1lKXsgcmV0dXJuIGZ1bmN0aW9uKCl7IHJldHVybiBmbi5hcHBseShtZSwgYXJndW1lbnRzKTsgfTsgfSxcbiAgc2xpY2UgPSBbXS5zbGljZTtcblxuXyA9IHJlcXVpcmUoJy4vdXRpbGl0aWVzJyk7XG5cblR5cGVzID0gcmVxdWlyZSgnLi9UeXBlcycpO1xuXG5DaGFuZ2VNYW5hZ2VyID0gcmVxdWlyZSgnLi9DaGFuZ2VNYW5hZ2VyJyk7XG5cbkluc3RhbmNlRmFjdG9yeSA9IChmdW5jdGlvbigpIHtcbiAgZnVuY3Rpb24gSW5zdGFuY2VGYWN0b3J5KCkge1xuICAgIHRoaXMuY3JlYXRlID0gYmluZCh0aGlzLmNyZWF0ZSwgdGhpcyk7XG4gICAgdGhpcy51dWlkID0gYmluZCh0aGlzLnV1aWQsIHRoaXMpO1xuICB9XG5cbiAgSW5zdGFuY2VGYWN0b3J5LnByb3RvdHlwZS5BUlJBWV9NVVRBVE9SUyA9IFsnY29weVdpdGhpbicsICdmaWxsJywgJ3B1c2gnLCAncG9wJywgJ3JldmVyc2UnLCAnc2hpZnQnLCAnc29ydCcsICdzcGxpY2UnLCAndW5zaGlmdCddO1xuXG4gIEluc3RhbmNlRmFjdG9yeS5wcm90b3R5cGUudXVpZCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBub3c7XG4gICAgbm93ID0gRGF0ZS5ub3coKTtcbiAgICByZXR1cm4gJ3h4eHh4eHh4LXh4eHgtNHh4eC15eHh4LXh4eHh4eHh4eHh4eCcucmVwbGFjZSgvW3h5XS9nLCBmdW5jdGlvbihjKSB7XG4gICAgICB2YXIgcjtcbiAgICAgIHIgPSAobm93ICsgTWF0aC5yYW5kb20oKSAqIDE2KSAlIDE2IHwgMDtcbiAgICAgIG5vdyA9IE1hdGguZmxvb3Iobm93IC8gMTYpO1xuICAgICAgcmV0dXJuIChjID09PSBcInhcIiA/IHIgOiByICYgMHgzIHwgMHg4KS50b1N0cmluZygxNik7XG4gICAgfSk7XG4gIH07XG5cbiAgSW5zdGFuY2VGYWN0b3J5LnByb3RvdHlwZS5jcmVhdGUgPSBmdW5jdGlvbihpbnN0YW5jZSwgbm9ybWFsaXplZFNjaGVtYSwgaW5pdGlhbFN0YXRlLCBvcHRzKSB7XG4gICAgdmFyIF9pbml0aWFsaXppbmcsIGFkZFdhdGNoZXIsIGRhdGEsIGZpcmVXYXRjaGVycywgZm4sIGdldCwgaWQsIHByb3BDb25maWcsIHByb3BOYW1lLCByZW1vdmVXYXRjaGVyLCBzZWFsLCBzZXQsIHN0cmljdCwgdW53YXRjaGVycywgdmFsLCB3YXRjaEZvclByb3BhZ2F0aW9uLCB3YXRjaGVycztcbiAgICBfaW5pdGlhbGl6aW5nID0gdHJ1ZTtcbiAgICBkYXRhID0ge307XG4gICAgd2F0Y2hlcnMgPSB7XG4gICAgICBpbnRlcm5hbDogW10sXG4gICAgICBleHRlcm5hbDogW11cbiAgICB9O1xuICAgIHVud2F0Y2hlcnMgPSB7fTtcbiAgICBpZCA9IHRoaXMudXVpZCgpO1xuICAgIHN0cmljdCA9IG9wdHMuc3RyaWN0LCBzZWFsID0gb3B0cy5zZWFsO1xuICAgIHNldCA9IChmdW5jdGlvbihfdGhpcykge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKHByb3BOYW1lLCB2YWwpIHtcbiAgICAgICAgdmFyIHByZXZWYWwsIHJlZiwgc2V0dGVyLCB0eXBlO1xuICAgICAgICBwcmV2VmFsID0gZGF0YVtwcm9wTmFtZV07XG4gICAgICAgIGlmICghbm9ybWFsaXplZFNjaGVtYVtwcm9wTmFtZV0pIHtcbiAgICAgICAgICByZXR1cm4gaW5zdGFuY2VbcHJvcE5hbWVdID0gdmFsO1xuICAgICAgICB9XG4gICAgICAgIHJlZiA9IG5vcm1hbGl6ZWRTY2hlbWFbcHJvcE5hbWVdLCB0eXBlID0gcmVmLnR5cGUsIHNldHRlciA9IHJlZi5zZXR0ZXI7XG4gICAgICAgIGlmICh2YWwgIT0gbnVsbCkge1xuICAgICAgICAgIGlmIChzZXR0ZXIpIHtcbiAgICAgICAgICAgIHZhbCA9IHNldHRlci5jYWxsKGluc3RhbmNlLCB2YWwpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIXR5cGUuaWRlbnRpZmllcih2YWwpKSB7XG4gICAgICAgICAgICBpZiAoc3RyaWN0KSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkVycm9yIGFzc2lnbmluZyBcIiArIHZhbCArIFwiIHRvIFwiICsgcHJvcE5hbWUgKyBcIi4gVmFsdWUgaXMgbm90IG9mIHR5cGUgXCIgKyB0eXBlLnN0cmluZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YWwgPSB0eXBlLnBhcnNlcih2YWwpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZS5zdHJpbmcgPT09IFR5cGVzLk5FU1RFRF9UWVBFUy5BcnJheS5zdHJpbmcpIHtcbiAgICAgICAgICAgIHZhbCA9IHR5cGUuY2hpbGRQYXJzZXIodmFsKTtcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh2YWwsICdfYXJyYXlJZCcsIHtcbiAgICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICB2YWx1ZTogX3RoaXMudXVpZCgpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIChfdGhpcy5BUlJBWV9NVVRBVE9SUyB8fCBbXSkuZm9yRWFjaChmdW5jdGlvbihtZXRob2QpIHtcbiAgICAgICAgICAgICAgaWYgKChwcmV2VmFsICE9IG51bGwpICYmIHByZXZWYWxbbWV0aG9kXSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBwcmV2VmFsW21ldGhvZF07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKEFycmF5LnByb3RvdHlwZVttZXRob2RdICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gT2JqZWN0LmRlZmluZVByb3BlcnR5KHZhbCwgbWV0aG9kLCB7XG4gICAgICAgICAgICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNsb25lLCByZWYxLCB0b1JldHVybjtcbiAgICAgICAgICAgICAgICAgICAgY2xvbmUgPSBfLmNsb25lKHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICB0b1JldHVybiA9IChyZWYxID0gQXJyYXkucHJvdG90eXBlW21ldGhvZF0pLmNhbGwuYXBwbHkocmVmMSwgW3RoaXNdLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICAgICAgICAgICAgICAgICAgQ2hhbmdlTWFuYWdlci5xdWV1ZUNoYW5nZXMoe1xuICAgICAgICAgICAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgICAgICAgICAgICBwcm9wTmFtZTogcHJvcE5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgb2xkVmFsOiBjbG9uZSxcbiAgICAgICAgICAgICAgICAgICAgICBuZXdWYWw6IHZhbCxcbiAgICAgICAgICAgICAgICAgICAgICBlcXVhbHM6IHR5cGUuZXF1YWxzXG4gICAgICAgICAgICAgICAgICAgIH0sIGZpcmVXYXRjaGVycyk7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlW3Byb3BOYW1lXSA9IHRoaXM7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0b1JldHVybjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGRhdGFbcHJvcE5hbWVdID0gdmFsO1xuICAgICAgICB3YXRjaEZvclByb3BhZ2F0aW9uKHByb3BOYW1lLCB2YWwpO1xuICAgICAgICBpZiAoIV9pbml0aWFsaXppbmcpIHtcbiAgICAgICAgICByZXR1cm4gQ2hhbmdlTWFuYWdlci5xdWV1ZUNoYW5nZXMoe1xuICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgcHJvcE5hbWU6IHByb3BOYW1lLFxuICAgICAgICAgICAgb2xkVmFsOiBwcmV2VmFsLFxuICAgICAgICAgICAgbmV3VmFsOiB2YWwsXG4gICAgICAgICAgICBlcXVhbHM6IHR5cGUuZXF1YWxzXG4gICAgICAgICAgfSwgZmlyZVdhdGNoZXJzKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9KSh0aGlzKTtcbiAgICBnZXQgPSBmdW5jdGlvbihwcm9wTmFtZSkge1xuICAgICAgdmFyIGdldHRlciwgdmFsO1xuICAgICAgZ2V0dGVyID0gbm9ybWFsaXplZFNjaGVtYVtwcm9wTmFtZV0uZ2V0dGVyO1xuICAgICAgdmFsID0gZGF0YVtwcm9wTmFtZV07XG4gICAgICBpZiAoZ2V0dGVyKSB7XG4gICAgICAgIHZhbCA9IGdldHRlci5jYWxsKGluc3RhbmNlLCB2YWwpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHZhbDtcbiAgICB9O1xuICAgIGFkZFdhdGNoZXIgPSBmdW5jdGlvbihwcm9wZXJ0aWVzLCBjYiwgb3B0cykge1xuICAgICAgdmFyIGosIGxlbiwgcHJvcE5hbWUsIHRhcmdldCwgd2F0Y2hlcjtcbiAgICAgIGlmIChfLmlzRnVuY3Rpb24ocHJvcGVydGllcykpIHtcbiAgICAgICAgb3B0cyA9IGNiO1xuICAgICAgICBjYiA9IHByb3BlcnRpZXM7XG4gICAgICAgIHByb3BlcnRpZXMgPSBPYmplY3Qua2V5cyhub3JtYWxpemVkU2NoZW1hKTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRzID09IG51bGwpIHtcbiAgICAgICAgb3B0cyA9IHt9O1xuICAgICAgfVxuICAgICAgaWYgKG9wdHMuaW50ZXJuYWwgPT0gbnVsbCkge1xuICAgICAgICBvcHRzLmludGVybmFsID0gZmFsc2U7XG4gICAgICB9XG4gICAgICB0YXJnZXQgPSBvcHRzLmludGVybmFsID8gJ2ludGVybmFsJyA6ICdleHRlcm5hbCc7XG4gICAgICBpZiAoIV8uaXNGdW5jdGlvbihjYikpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBIHdhdGNoIG11c3QgYmUgcHJvdmlkZWQgd2l0aCBhIGNhbGxiYWNrIGZ1bmN0aW9uLicpO1xuICAgICAgfVxuICAgICAgaWYgKHByb3BlcnRpZXMgJiYgIV8uaXNBcnJheShwcm9wZXJ0aWVzKSkge1xuICAgICAgICBwcm9wZXJ0aWVzID0gW3Byb3BlcnRpZXNdO1xuICAgICAgfVxuICAgICAgZm9yIChqID0gMCwgbGVuID0gcHJvcGVydGllcy5sZW5ndGg7IGogPCBsZW47IGorKykge1xuICAgICAgICBwcm9wTmFtZSA9IHByb3BlcnRpZXNbal07XG4gICAgICAgIGlmICghXy5oYXMobm9ybWFsaXplZFNjaGVtYSwgcHJvcE5hbWUpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IHNldCB3YXRjaCBvbiBcIiArIHByb3BOYW1lICsgXCIsIHByb3BlcnR5IGlzIG5vdCBkZWZpbmVkIGluIHNjaGVtYS5cIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHdhdGNoZXIgPSB7XG4gICAgICAgIHByb3BlcnRpZXM6IHByb3BlcnRpZXMsXG4gICAgICAgIGNiOiBjYixcbiAgICAgICAgZmlyc3Q6ICFvcHRzLmludGVybmFsXG4gICAgICB9O1xuICAgICAgd2F0Y2hlcnNbdGFyZ2V0XS5wdXNoKHdhdGNoZXIpO1xuICAgICAgQ2hhbmdlTWFuYWdlci5xdWV1ZUNoYW5nZXMoe1xuICAgICAgICBpZDogaWRcbiAgICAgIH0sIGZpcmVXYXRjaGVycyk7XG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiByZW1vdmVXYXRjaGVyKHdhdGNoZXIsIHRhcmdldCk7XG4gICAgICB9O1xuICAgIH07XG4gICAgcmVtb3ZlV2F0Y2hlciA9IGZ1bmN0aW9uKHdhdGNoZXIsIHRhcmdldCkge1xuICAgICAgcmV0dXJuIF8ucmVtb3ZlKHdhdGNoZXJzW3RhcmdldF0sIHdhdGNoZXIpO1xuICAgIH07XG4gICAgd2F0Y2hGb3JQcm9wYWdhdGlvbiA9IGZ1bmN0aW9uKHByb3BOYW1lLCB2YWwpIHtcbiAgICAgIHZhciBqLCBsZW4sIHJlZiwgdHlwZSwgdW53YXRjaGVyO1xuICAgICAgdHlwZSA9IG5vcm1hbGl6ZWRTY2hlbWFbcHJvcE5hbWVdLnR5cGU7XG4gICAgICBpZiAodHlwZS5zdHJpbmcgPT09IFR5cGVzLk5FU1RFRF9UWVBFUy5TY2hlbWEuc3RyaW5nKSB7XG4gICAgICAgIGlmICh0eXBlb2YgdW53YXRjaGVyc1twcm9wTmFtZV0gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgIHVud2F0Y2hlcnNbcHJvcE5hbWVdKCk7XG4gICAgICAgIH1cbiAgICAgICAgdW53YXRjaGVyc1twcm9wTmFtZV0gPSB2YWwgIT0gbnVsbCA/IHZhbC53YXRjaChmdW5jdGlvbihuZXdWYWwsIG9sZFZhbCkge1xuICAgICAgICAgIHJldHVybiBDaGFuZ2VNYW5hZ2VyLnF1ZXVlQ2hhbmdlcyh7XG4gICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICBwcm9wTmFtZTogcHJvcE5hbWUsXG4gICAgICAgICAgICBvbGRWYWw6IG9sZFZhbCxcbiAgICAgICAgICAgIG5ld1ZhbDogbmV3VmFsLFxuICAgICAgICAgICAgZXF1YWxzOiB0eXBlLmVxdWFsc1xuICAgICAgICAgIH0sIGZpcmVXYXRjaGVycyk7XG4gICAgICAgIH0sIHtcbiAgICAgICAgICBpbnRlcm5hbDogdHJ1ZVxuICAgICAgICB9KSA6IHZvaWQgMDtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlLnN0cmluZyA9PT0gVHlwZXMuTkVTVEVEX1RZUEVTLkFycmF5LnN0cmluZyAmJiB0eXBlLmNoaWxkVHlwZS5zdHJpbmcgPT09IFR5cGVzLk5FU1RFRF9UWVBFUy5TY2hlbWEuc3RyaW5nKSB7XG4gICAgICAgIHJlZiA9IHVud2F0Y2hlcnNbcHJvcE5hbWVdIHx8IFtdO1xuICAgICAgICBmb3IgKGogPSAwLCBsZW4gPSByZWYubGVuZ3RoOyBqIDwgbGVuOyBqKyspIHtcbiAgICAgICAgICB1bndhdGNoZXIgPSByZWZbal07XG4gICAgICAgICAgaWYgKHR5cGVvZiB1bndhdGNoZXIgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgdW53YXRjaGVyKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHVud2F0Y2hlcnNbcHJvcE5hbWVdID0gW107XG4gICAgICAgIHJldHVybiAodmFsIHx8IFtdKS5mb3JFYWNoKGZ1bmN0aW9uKHNjaGVtYSwgaSkge1xuICAgICAgICAgIHJldHVybiB1bndhdGNoZXJzW3Byb3BOYW1lXS5wdXNoKHNjaGVtYSAhPSBudWxsID8gc2NoZW1hLndhdGNoKGZ1bmN0aW9uKG5ld1ZhbCwgb2xkVmFsKSB7XG4gICAgICAgICAgICB2YXIgbmV3QXJyYXksIG9sZEFycmF5O1xuICAgICAgICAgICAgbmV3QXJyYXkgPSBpbnN0YW5jZVtwcm9wTmFtZV07XG4gICAgICAgICAgICBvbGRBcnJheSA9IENoYW5nZU1hbmFnZXIuZ2V0UXVldWVkQ2hhbmdlcyh7XG4gICAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgICAgcHJvcE5hbWU6IHByb3BOYW1lXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChvbGRBcnJheSA9PSBudWxsKSB7XG4gICAgICAgICAgICAgIGlmIChvbGRBcnJheSA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgb2xkQXJyYXkgPSBfLmNsb25lKG5ld0FycmF5KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2xkQXJyYXksICdfYXJyYXlJZCcsIHtcbiAgICAgICAgICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgdmFsdWU6IG5ld0FycmF5Ll9hcnJheUlkXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9sZEFycmF5Ll9hcnJheUlkID09PSBuZXdBcnJheS5fYXJyYXlJZCkge1xuICAgICAgICAgICAgICBvbGRBcnJheVtpXSA9IG9sZFZhbDtcbiAgICAgICAgICAgICAgcmV0dXJuIENoYW5nZU1hbmFnZXIucXVldWVDaGFuZ2VzKHtcbiAgICAgICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICAgICAgcHJvcE5hbWU6IHByb3BOYW1lLFxuICAgICAgICAgICAgICAgIG9sZFZhbDogb2xkQXJyYXksXG4gICAgICAgICAgICAgICAgbmV3VmFsOiBuZXdBcnJheSxcbiAgICAgICAgICAgICAgICBlcXVhbHM6IHR5cGUuZXF1YWxzLFxuICAgICAgICAgICAgICAgIGZvcmNlOiB0cnVlXG4gICAgICAgICAgICAgIH0sIGZpcmVXYXRjaGVycyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSwge1xuICAgICAgICAgICAgaW50ZXJuYWw6IHRydWVcbiAgICAgICAgICB9KSA6IHZvaWQgMCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gICAgZmlyZVdhdGNoZXJzID0gZnVuY3Rpb24ocXVldWVkQ2hhbmdlcywgdGFyZ2V0KSB7XG4gICAgICB2YXIgZSwgZ2V0UHJldlZhbCwgaSwgaiwgbGVuLCBuZXdWYWxzLCBvbGRWYWxzLCBwcm9wTmFtZSwgcmVmLCByZXN1bHRzLCBzaG91bGRGaXJlLCB0cmlnZ2VyaW5nUHJvcGVydGllcywgd2F0Y2hlcjtcbiAgICAgIGlmICh0YXJnZXQgPT0gbnVsbCkge1xuICAgICAgICB0YXJnZXQgPSAnZXh0ZXJuYWwnO1xuICAgICAgfVxuICAgICAgdHJpZ2dlcmluZ1Byb3BlcnRpZXMgPSBPYmplY3Qua2V5cyhxdWV1ZWRDaGFuZ2VzKTtcbiAgICAgIGdldFByZXZWYWwgPSBmdW5jdGlvbihwcm9wTmFtZSkge1xuICAgICAgICBpZiAoXy5oYXMocXVldWVkQ2hhbmdlcywgcHJvcE5hbWUpKSB7XG4gICAgICAgICAgcmV0dXJuIHF1ZXVlZENoYW5nZXNbcHJvcE5hbWVdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBpbnN0YW5jZVtwcm9wTmFtZV07XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBpID0gMDtcbiAgICAgIHJlc3VsdHMgPSBbXTtcbiAgICAgIHdoaWxlICgod2F0Y2hlciA9IHdhdGNoZXJzW3RhcmdldF1baV0pKSB7XG4gICAgICAgIGkrKztcbiAgICAgICAgc2hvdWxkRmlyZSA9IHdhdGNoZXIuZmlyc3QgfHwgKF8uaW50ZXJzZWN0aW9uKHRyaWdnZXJpbmdQcm9wZXJ0aWVzLCB3YXRjaGVyLnByb3BlcnRpZXMpLmxlbmd0aCA+IDApO1xuICAgICAgICB3YXRjaGVyLmZpcnN0ID0gZmFsc2U7XG4gICAgICAgIGlmIChzaG91bGRGaXJlKSB7XG4gICAgICAgICAgbmV3VmFscyA9IHt9O1xuICAgICAgICAgIG9sZFZhbHMgPSB7fTtcbiAgICAgICAgICByZWYgPSB3YXRjaGVyLnByb3BlcnRpZXM7XG4gICAgICAgICAgZm9yIChqID0gMCwgbGVuID0gcmVmLmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XG4gICAgICAgICAgICBwcm9wTmFtZSA9IHJlZltqXTtcbiAgICAgICAgICAgIG5ld1ZhbHNbcHJvcE5hbWVdID0gaW5zdGFuY2VbcHJvcE5hbWVdO1xuICAgICAgICAgICAgb2xkVmFsc1twcm9wTmFtZV0gPSBnZXRQcmV2VmFsKHByb3BOYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHdhdGNoZXIucHJvcGVydGllcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIHByb3BOYW1lID0gd2F0Y2hlci5wcm9wZXJ0aWVzWzBdO1xuICAgICAgICAgICAgbmV3VmFscyA9IG5ld1ZhbHNbcHJvcE5hbWVdO1xuICAgICAgICAgICAgb2xkVmFscyA9IG9sZFZhbHNbcHJvcE5hbWVdO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHdhdGNoZXIuY2IobmV3VmFscywgb2xkVmFscykpO1xuICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBlID0gZXJyb3I7XG4gICAgICAgICAgICByZXN1bHRzLnB1c2goY29uc29sZS5lcnJvcihlLnN0YWNrIHx8IGUpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0cy5wdXNoKHZvaWQgMCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHRzO1xuICAgIH07XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGluc3RhbmNlLCAnd2F0Y2gnLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24ocHJvcGVydGllcywgY2IsIG9wdHMpIHtcbiAgICAgICAgcmV0dXJuIGFkZFdhdGNoZXIocHJvcGVydGllcywgY2IsIG9wdHMpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShpbnN0YW5jZSwgJ192YWxpZGF0aW5nJywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICB2YWx1ZTogZmFsc2VcbiAgICB9KTtcbiAgICBmbiA9IChmdW5jdGlvbihfdGhpcykge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKHByb3BOYW1lLCBwcm9wQ29uZmlnKSB7XG4gICAgICAgIHZhciB2YWw7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShpbnN0YW5jZSwgcHJvcE5hbWUsIHtcbiAgICAgICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgICAgIHJldHVybiBzZXQocHJvcE5hbWUsIHZhbCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIGdldChwcm9wTmFtZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHByb3BDb25maWdbXCJkZWZhdWx0XCJdICE9PSB2b2lkIDApIHtcbiAgICAgICAgICB2YWwgPSBfLmlzRnVuY3Rpb24ocHJvcENvbmZpZ1tcImRlZmF1bHRcIl0pID8gcHJvcENvbmZpZ1tcImRlZmF1bHRcIl0oKSA6IHByb3BDb25maWdbXCJkZWZhdWx0XCJdO1xuICAgICAgICAgIHJldHVybiBpbnN0YW5jZVtwcm9wTmFtZV0gPSB2YWw7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfSkodGhpcyk7XG4gICAgZm9yIChwcm9wTmFtZSBpbiBub3JtYWxpemVkU2NoZW1hKSB7XG4gICAgICBwcm9wQ29uZmlnID0gbm9ybWFsaXplZFNjaGVtYVtwcm9wTmFtZV07XG4gICAgICBmbihwcm9wTmFtZSwgcHJvcENvbmZpZyk7XG4gICAgfVxuICAgIGlmIChzZWFsKSB7XG4gICAgICBPYmplY3Quc2VhbChpbnN0YW5jZSk7XG4gICAgfVxuICAgIGZvciAocHJvcE5hbWUgaW4gaW5pdGlhbFN0YXRlKSB7XG4gICAgICB2YWwgPSBpbml0aWFsU3RhdGVbcHJvcE5hbWVdO1xuICAgICAgaW5zdGFuY2VbcHJvcE5hbWVdID0gdmFsO1xuICAgIH1cbiAgICByZXR1cm4gX2luaXRpYWxpemluZyA9IGZhbHNlO1xuICB9O1xuXG4gIHJldHVybiBJbnN0YW5jZUZhY3Rvcnk7XG5cbn0pKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IEluc3RhbmNlRmFjdG9yeSgpO1xuXG4iLCJ2YXIgSW5zdGFuY2VGYWN0b3J5LCBNb2RlbEZhY3RvcnksIFJlZ2lzdHJ5LCBUeXBlcywgXyxcbiAgYmluZCA9IGZ1bmN0aW9uKGZuLCBtZSl7IHJldHVybiBmdW5jdGlvbigpeyByZXR1cm4gZm4uYXBwbHkobWUsIGFyZ3VtZW50cyk7IH07IH0sXG4gIHNsaWNlID0gW10uc2xpY2U7XG5cbl8gPSByZXF1aXJlKCcuL3V0aWxpdGllcycpO1xuXG5UeXBlcyA9IHJlcXVpcmUoJy4vVHlwZXMnKTtcblxuSW5zdGFuY2VGYWN0b3J5ID0gcmVxdWlyZSgnLi9JbnN0YW5jZUZhY3RvcnknKTtcblxuUmVnaXN0cnkgPSByZXF1aXJlKCcuL1JlZ2lzdHJ5Jyk7XG5cbk1vZGVsRmFjdG9yeSA9IChmdW5jdGlvbigpIHtcbiAgTW9kZWxGYWN0b3J5LnByb3RvdHlwZS5ERUZBVUxUX09QVElPTlMgPSB7XG4gICAgc2VhbDogZmFsc2UsXG4gICAgc3RyaWN0OiBmYWxzZVxuICB9O1xuXG4gIGZ1bmN0aW9uIE1vZGVsRmFjdG9yeSgpIHtcbiAgICB0aGlzLmNyZWF0ZSA9IGJpbmQodGhpcy5jcmVhdGUsIHRoaXMpO1xuICAgIHRoaXMubmFtZUZ1bmN0aW9uID0gYmluZCh0aGlzLm5hbWVGdW5jdGlvbiwgdGhpcyk7XG4gICAgdGhpcy5ub3JtYWxpemVQcm9wZXJ0eUNvbmZpZyA9IGJpbmQodGhpcy5ub3JtYWxpemVQcm9wZXJ0eUNvbmZpZywgdGhpcyk7XG4gICAgdGhpcy5nZW5lcmF0ZU5hbWUgPSBiaW5kKHRoaXMuZ2VuZXJhdGVOYW1lLCB0aGlzKTtcbiAgICB0aGlzLm5hbWVDb3VudGVyID0gMDtcbiAgfVxuXG4gIE1vZGVsRmFjdG9yeS5wcm90b3R5cGUuZ2VuZXJhdGVOYW1lID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIFwiU2NoZW1pbmdNb2RlbFwiICsgKHRoaXMubmFtZUNvdW50ZXIrKyk7XG4gIH07XG5cblxuICAvKlxuICAgIE5vcm1hbGl6ZXMgYSBmaWVsZCBkZWNsYXJhdGlvbiBvbiBhIHNjaGVtYSB0byBjYXB0dXJlIHR5cGUsIGRlZmF1bHQgdmFsdWUsIHNldHRlciwgZ2V0dGVyLCBhbmQgdmFsaWRhdGlvbi5cbiAgICBVc2VkIGludGVybmFsbHkgd2hlbiBhIHNjaGVtYSBpcyBjcmVhdGVkIHRvIGJ1aWxkIGEgbm9ybWFsaXplZCBzY2hlbWEgZGVmaW5pdGlvbi5cbiAgICovXG5cbiAgTW9kZWxGYWN0b3J5LnByb3RvdHlwZS5ub3JtYWxpemVQcm9wZXJ0eUNvbmZpZyA9IGZ1bmN0aW9uKHByb3BDb25maWcsIHByb3BOYW1lKSB7XG4gICAgdmFyIGRlZmluaXRpb24sIGZuLCBnZXR0ZXIsIGosIGxlbiwgcmVxdWlyZWQsIHNldHRlciwgdHlwZSwgdmFsaWRhdGU7XG4gICAgaWYgKHByb3BOYW1lID09IG51bGwpIHtcbiAgICAgIHByb3BOYW1lID0gJ2ZpZWxkJztcbiAgICB9XG4gICAgZGVmaW5pdGlvbiA9IHtcbiAgICAgIHR5cGU6IG51bGwsXG4gICAgICBcImRlZmF1bHRcIjogbnVsbCxcbiAgICAgIGdldHRlcjogbnVsbCxcbiAgICAgIHNldHRlcjogbnVsbCxcbiAgICAgIHZhbGlkYXRlOiBudWxsLFxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgfTtcbiAgICBpZiAoIShfLmlzUGxhaW5PYmplY3QocHJvcENvbmZpZykgJiYgKHByb3BDb25maWcudHlwZSAhPSBudWxsKSkpIHtcbiAgICAgIHByb3BDb25maWcgPSB7XG4gICAgICAgIHR5cGU6IHByb3BDb25maWdcbiAgICAgIH07XG4gICAgfVxuICAgIHR5cGUgPSBwcm9wQ29uZmlnLnR5cGUsIGdldHRlciA9IHByb3BDb25maWcuZ2V0dGVyLCBzZXR0ZXIgPSBwcm9wQ29uZmlnLnNldHRlciwgdmFsaWRhdGUgPSBwcm9wQ29uZmlnLnZhbGlkYXRlLCByZXF1aXJlZCA9IHByb3BDb25maWcucmVxdWlyZWQ7XG4gICAgaWYgKHR5cGUgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXJyb3IgcmVzb2x2aW5nIFwiICsgcHJvcE5hbWUgKyBcIi4gU2NoZW1hIHR5cGUgbXVzdCBiZSBkZWZpbmVkLlwiKTtcbiAgICB9XG4gICAgaWYgKChnZXR0ZXIgIT0gbnVsbCkgJiYgIV8uaXNGdW5jdGlvbihnZXR0ZXIpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFcnJvciByZXNvbHZpbmcgXCIgKyBwcm9wTmFtZSArIFwiLiBTY2hlbWEgZ2V0dGVyIG11c3QgYmUgYSBmdW5jdGlvbi5cIik7XG4gICAgfVxuICAgIGlmICgoc2V0dGVyICE9IG51bGwpICYmICFfLmlzRnVuY3Rpb24oc2V0dGVyKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXJyb3IgcmVzb2x2aW5nIFwiICsgcHJvcE5hbWUgKyBcIi4gU2NoZW1hIHNldHRlciBtdXN0IGJlIGEgZnVuY3Rpb24uXCIpO1xuICAgIH1cbiAgICBpZiAodmFsaWRhdGUgPT0gbnVsbCkge1xuICAgICAgdmFsaWRhdGUgPSBbXTtcbiAgICB9XG4gICAgaWYgKCFfLmlzQXJyYXkodmFsaWRhdGUpKSB7XG4gICAgICB2YWxpZGF0ZSA9IFt2YWxpZGF0ZV07XG4gICAgfVxuICAgIGZvciAoaiA9IDAsIGxlbiA9IHZhbGlkYXRlLmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XG4gICAgICBmbiA9IHZhbGlkYXRlW2pdO1xuICAgICAgaWYgKCFfLmlzRnVuY3Rpb24oZm4pKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkVycm9yIHJlc29sdmluZyBcIiArIHByb3BOYW1lICsgXCIuIFNjaGVtYSB2YWxpZGF0ZSBtdXN0IGJlIGEgZnVuY3Rpb24gb3IgYXJyYXkgb2YgZnVuY3Rpb25zLlwiKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZGVmaW5pdGlvbi50eXBlID0gVHlwZXMucmVzb2x2ZVR5cGUodHlwZSk7XG4gICAgaWYgKGRlZmluaXRpb24udHlwZSA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFcnJvciByZXNvbHZpbmcgXCIgKyBwcm9wTmFtZSArIFwiLiBVbnJlY29nbml6ZWQgdHlwZSBcIiArIHR5cGUpO1xuICAgIH1cbiAgICBkZWZpbml0aW9uW1wiZGVmYXVsdFwiXSA9IHByb3BDb25maWdbXCJkZWZhdWx0XCJdO1xuICAgIGRlZmluaXRpb24uZ2V0dGVyID0gZ2V0dGVyO1xuICAgIGRlZmluaXRpb24uc2V0dGVyID0gc2V0dGVyO1xuICAgIGRlZmluaXRpb24udmFsaWRhdGUgPSB2YWxpZGF0ZTtcbiAgICBkZWZpbml0aW9uLnJlcXVpcmVkID0gcmVxdWlyZWQ7XG4gICAgZGVmaW5pdGlvbiA9IF8uZXh0ZW5kKHt9LCBwcm9wQ29uZmlnLCBkZWZpbml0aW9uKTtcbiAgICByZXR1cm4gZGVmaW5pdGlvbjtcbiAgfTtcblxuICBNb2RlbEZhY3RvcnkucHJvdG90eXBlLm5hbWVGdW5jdGlvbiA9IGZ1bmN0aW9uKG5hbWUsIGZuKSB7XG4gICAgdmFyIGVyciwgZm5TdHIsIHJlbmFtZWQ7XG4gICAgZm5TdHIgPSBcInJldHVybiBmdW5jdGlvbiBcIiArIG5hbWUgKyBcIigpe3JldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpfVwiO1xuICAgIHRyeSB7XG4gICAgICByZW5hbWVkID0gbmV3IEZ1bmN0aW9uKCdmbicsIGZuU3RyKShmbik7XG4gICAgfSBjYXRjaCAoZXJyb3IxKSB7XG4gICAgICBlcnIgPSBlcnJvcjE7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IobmFtZSArIFwiIGlzIG5vdCBhIHZhbGlkIGZ1bmN0aW9uIG5hbWUuXCIpO1xuICAgIH1cbiAgICBfLmV4dGVuZChyZW5hbWVkLCBmbik7XG4gICAgXy5leHRlbmQocmVuYW1lZC5wcm90b3R5cGUsIGZuLnByb3RvdHlwZSk7XG4gICAgcmV0dXJuIHJlbmFtZWQ7XG4gIH07XG5cbiAgTW9kZWxGYWN0b3J5LnByb3RvdHlwZS5jcmVhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgTW9kZWwsIGFyZ3MsIGZhY3RvcnksIG5hbWUsIG5vcm1hbGl6ZWRTY2hlbWEsIG9wdHMsIHNjaGVtYUNvbmZpZztcbiAgICBhcmdzID0gMSA8PSBhcmd1bWVudHMubGVuZ3RoID8gc2xpY2UuY2FsbChhcmd1bWVudHMsIDApIDogW107XG4gICAgZmFjdG9yeSA9IHRoaXM7XG4gICAgaWYgKCFfLmlzU3RyaW5nKGFyZ3NbMF0pKSB7XG4gICAgICBhcmdzLnVuc2hpZnQodGhpcy5nZW5lcmF0ZU5hbWUoKSk7XG4gICAgfVxuICAgIG5hbWUgPSBhcmdzWzBdLCBzY2hlbWFDb25maWcgPSBhcmdzWzFdLCBvcHRzID0gYXJnc1syXTtcbiAgICBvcHRzID0gXy5kZWZhdWx0cyhvcHRzIHx8IHt9LCB0aGlzLkRFRkFVTFRfT1BUSU9OUyk7XG4gICAgbm9ybWFsaXplZFNjaGVtYSA9IHt9O1xuICAgIE1vZGVsID0gKGZ1bmN0aW9uKCkge1xuICAgICAgTW9kZWwuX19zY2hlbWFJZCA9IG5hbWU7XG5cbiAgICAgIE1vZGVsLmRlZmluZVByb3BlcnR5ID0gZnVuY3Rpb24ocHJvcE5hbWUsIHByb3BDb25maWcpIHtcbiAgICAgICAgaWYgKCFfLmlzU3RyaW5nKHByb3BOYW1lKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZpcnN0IGFyZ3VtZW50OiBwcm9wZXJ0eSBuYW1lIG11c3QgYmUgYSBzdHJpbmcuXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwcm9wQ29uZmlnID09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTZWNvbmQgYXJndW1lbnQ6IHByb3BlcnR5IGNvbmZpZ3VyYXRpb24gaXMgcmVxdWlyZWQuXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBub3JtYWxpemVkU2NoZW1hW3Byb3BOYW1lXSA9IGZhY3Rvcnkubm9ybWFsaXplUHJvcGVydHlDb25maWcocHJvcENvbmZpZywgcHJvcE5hbWUpO1xuICAgICAgfTtcblxuICAgICAgTW9kZWwuZGVmaW5lUHJvcGVydGllcyA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgICAgICB2YXIgaywgcmVzdWx0cywgdjtcbiAgICAgICAgaWYgKCFfLmlzUGxhaW5PYmplY3QoY29uZmlnKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZpcnN0IGFyZ3VtZW50OiBwcm9wZXJ0aWVzIG11c3QgYmUgYW4gb2JqZWN0LlwiKTtcbiAgICAgICAgfVxuICAgICAgICByZXN1bHRzID0gW107XG4gICAgICAgIGZvciAoayBpbiBjb25maWcpIHtcbiAgICAgICAgICB2ID0gY29uZmlnW2tdO1xuICAgICAgICAgIHJlc3VsdHMucHVzaCh0aGlzLmRlZmluZVByb3BlcnR5KGssIHYpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgIH07XG5cbiAgICAgIE1vZGVsLmdldFByb3BlcnRpZXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIF8uY2xvbmVEZWVwKG5vcm1hbGl6ZWRTY2hlbWEpO1xuICAgICAgfTtcblxuICAgICAgTW9kZWwuZ2V0UHJvcGVydHkgPSBmdW5jdGlvbihwcm9wTmFtZSkge1xuICAgICAgICByZXR1cm4gXy5jbG9uZURlZXAobm9ybWFsaXplZFNjaGVtYVtwcm9wTmFtZV0pO1xuICAgICAgfTtcblxuICAgICAgTW9kZWwuZWFjaFByb3BlcnR5ID0gZnVuY3Rpb24oY2IpIHtcbiAgICAgICAgdmFyIHByb3BDb25maWcsIHByb3BOYW1lLCByZXN1bHRzO1xuICAgICAgICBpZiAoIV8uaXNGdW5jdGlvbihjYikpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGaXJzdCBhcmd1bWVudDogY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uLlwiKTtcbiAgICAgICAgfVxuICAgICAgICByZXN1bHRzID0gW107XG4gICAgICAgIGZvciAocHJvcE5hbWUgaW4gbm9ybWFsaXplZFNjaGVtYSkge1xuICAgICAgICAgIHByb3BDb25maWcgPSBub3JtYWxpemVkU2NoZW1hW3Byb3BOYW1lXTtcbiAgICAgICAgICByZXN1bHRzLnB1c2goY2IocHJvcE5hbWUsIF8uY2xvbmVEZWVwKHByb3BDb25maWcpKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICB9O1xuXG4gICAgICBNb2RlbC52YWxpZGF0ZSA9IGZ1bmN0aW9uKGluc3RhbmNlKSB7XG4gICAgICAgIHZhciBjaGlsZEVycm9ycywgZSwgZXJyLCBlcnJvcnMsIGksIGosIGssIGtleSwgbCwgbGVuLCBsZW4xLCBtZW1iZXIsIHB1c2hFcnJvciwgcmVxdWlyZWQsIHJlcXVpcmVkTWVzc2FnZSwgdHlwZSwgdiwgdmFsLCB2YWxpZGF0ZSwgdmFsaWRhdG9yLCB2YWx1ZTtcbiAgICAgICAgZXJyb3JzID0ge307XG4gICAgICAgIGlmIChpbnN0YW5jZS5fdmFsaWRhdGluZykge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGluc3RhbmNlLl92YWxpZGF0aW5nID0gdHJ1ZTtcbiAgICAgICAgcHVzaEVycm9yID0gZnVuY3Rpb24oa2V5LCBlcnJvcikge1xuICAgICAgICAgIHZhciBlcnIsIGosIGxlbjtcbiAgICAgICAgICBpZiAoXy5pc0FycmF5KGVycm9yKSkge1xuICAgICAgICAgICAgZm9yIChqID0gMCwgbGVuID0gZXJyb3IubGVuZ3RoOyBqIDwgbGVuOyBqKyspIHtcbiAgICAgICAgICAgICAgZXJyID0gZXJyb3Jbal07XG4gICAgICAgICAgICAgIHJldHVybiBwdXNoRXJyb3Ioa2V5LCBlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIV8uaXNTdHJpbmcoZXJyb3IpKSB7XG4gICAgICAgICAgICBlcnJvciA9ICdWYWxpZGF0aW9uIGVycm9yIG9jY3VycmVkLic7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChlcnJvcnNba2V5XSA9PSBudWxsKSB7XG4gICAgICAgICAgICBlcnJvcnNba2V5XSA9IFtdO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gZXJyb3JzW2tleV0ucHVzaChlcnJvcik7XG4gICAgICAgIH07XG4gICAgICAgIGZvciAoa2V5IGluIG5vcm1hbGl6ZWRTY2hlbWEpIHtcbiAgICAgICAgICB2YWx1ZSA9IG5vcm1hbGl6ZWRTY2hlbWFba2V5XTtcbiAgICAgICAgICB2YWxpZGF0ZSA9IHZhbHVlLnZhbGlkYXRlLCByZXF1aXJlZCA9IHZhbHVlLnJlcXVpcmVkO1xuICAgICAgICAgIHZhbCA9IGluc3RhbmNlW2tleV07XG4gICAgICAgICAgaWYgKHJlcXVpcmVkICYmICh2YWwgPT0gbnVsbCkpIHtcbiAgICAgICAgICAgIHJlcXVpcmVkTWVzc2FnZSA9IF8uaXNTdHJpbmcocmVxdWlyZWQpID8gcmVxdWlyZWQgOiBcIkZpZWxkIGlzIHJlcXVpcmVkLlwiO1xuICAgICAgICAgICAgcHVzaEVycm9yKGtleSwgcmVxdWlyZWRNZXNzYWdlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHZhbCAhPSBudWxsKSB7XG4gICAgICAgICAgICB0eXBlID0gbm9ybWFsaXplZFNjaGVtYVtrZXldLnR5cGU7XG4gICAgICAgICAgICBmb3IgKGogPSAwLCBsZW4gPSB2YWxpZGF0ZS5sZW5ndGg7IGogPCBsZW47IGorKykge1xuICAgICAgICAgICAgICB2YWxpZGF0b3IgPSB2YWxpZGF0ZVtqXTtcbiAgICAgICAgICAgICAgZXJyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBlcnIgPSB2YWxpZGF0b3IuY2FsbChpbnN0YW5jZSwgdmFsKTtcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IxKSB7XG4gICAgICAgICAgICAgICAgZSA9IGVycm9yMTtcbiAgICAgICAgICAgICAgICBpZiAoZSkge1xuICAgICAgICAgICAgICAgICAgZXJyID0gZS5tZXNzYWdlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoZXJyICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgcHVzaEVycm9yKGtleSwgZXJyKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGUuc3RyaW5nID09PSAnc2NoZW1hJykge1xuICAgICAgICAgICAgICBjaGlsZEVycm9ycyA9IHR5cGUuY2hpbGRUeXBlLnZhbGlkYXRlLmNhbGwoaW5zdGFuY2UsIHZhbCk7XG4gICAgICAgICAgICAgIGZvciAoayBpbiBjaGlsZEVycm9ycykge1xuICAgICAgICAgICAgICAgIHYgPSBjaGlsZEVycm9yc1trXTtcbiAgICAgICAgICAgICAgICBwdXNoRXJyb3Ioa2V5ICsgXCIuXCIgKyBrLCB2KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGUuc3RyaW5nID09PSAnYXJyYXknICYmIHR5cGUuY2hpbGRUeXBlLnN0cmluZyA9PT0gJ3NjaGVtYScpIHtcbiAgICAgICAgICAgICAgZm9yIChpID0gbCA9IDAsIGxlbjEgPSB2YWwubGVuZ3RoOyBsIDwgbGVuMTsgaSA9ICsrbCkge1xuICAgICAgICAgICAgICAgIG1lbWJlciA9IHZhbFtpXTtcbiAgICAgICAgICAgICAgICBjaGlsZEVycm9ycyA9IHR5cGUuY2hpbGRUeXBlLmNoaWxkVHlwZS52YWxpZGF0ZS5jYWxsKGluc3RhbmNlLCBtZW1iZXIpO1xuICAgICAgICAgICAgICAgIGZvciAoayBpbiBjaGlsZEVycm9ycykge1xuICAgICAgICAgICAgICAgICAgdiA9IGNoaWxkRXJyb3JzW2tdO1xuICAgICAgICAgICAgICAgICAgcHVzaEVycm9yKGtleSArIFwiW1wiICsgaSArIFwiXS5cIiArIGssIHYpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpbnN0YW5jZS5fdmFsaWRhdGluZyA9IGZhbHNlO1xuICAgICAgICBpZiAoXy5zaXplKGVycm9ycykgPT09IDApIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JzO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBmdW5jdGlvbiBNb2RlbChpbml0aWFsU3RhdGUpIHtcbiAgICAgICAgSW5zdGFuY2VGYWN0b3J5LmNyZWF0ZSh0aGlzLCBub3JtYWxpemVkU2NoZW1hLCBpbml0aWFsU3RhdGUsIG9wdHMpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gTW9kZWw7XG5cbiAgICB9KSgpO1xuICAgIE1vZGVsID0gdGhpcy5uYW1lRnVuY3Rpb24obmFtZSwgTW9kZWwpO1xuICAgIGlmIChzY2hlbWFDb25maWcgIT0gbnVsbCkge1xuICAgICAgTW9kZWwuZGVmaW5lUHJvcGVydGllcyhzY2hlbWFDb25maWcpO1xuICAgIH1cbiAgICBSZWdpc3RyeS5yZWdpc3RlcihuYW1lLCBNb2RlbCk7XG4gICAgcmV0dXJuIE1vZGVsO1xuICB9O1xuXG4gIHJldHVybiBNb2RlbEZhY3Rvcnk7XG5cbn0pKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IE1vZGVsRmFjdG9yeSgpO1xuXG4iLCJ2YXIgUmVnaXN0cnksXG4gIGJpbmQgPSBmdW5jdGlvbihmbiwgbWUpeyByZXR1cm4gZnVuY3Rpb24oKXsgcmV0dXJuIGZuLmFwcGx5KG1lLCBhcmd1bWVudHMpOyB9OyB9O1xuXG5SZWdpc3RyeSA9IChmdW5jdGlvbigpIHtcbiAgZnVuY3Rpb24gUmVnaXN0cnkoKSB7XG4gICAgdGhpcy5yZXNldCA9IGJpbmQodGhpcy5yZXNldCwgdGhpcyk7XG4gICAgdGhpcy5nZXQgPSBiaW5kKHRoaXMuZ2V0LCB0aGlzKTtcbiAgICB0aGlzLnJlZ2lzdGVyID0gYmluZCh0aGlzLnJlZ2lzdGVyLCB0aGlzKTtcbiAgICB0aGlzLnNjaGVtYXMgPSB7fTtcbiAgfVxuXG4gIFJlZ2lzdHJ5LnByb3RvdHlwZS5yZWdpc3RlciA9IGZ1bmN0aW9uKG5hbWUsIG1vZGVsKSB7XG4gICAgaWYgKHRoaXMuc2NoZW1hc1tuYW1lXSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTmFtaW5nIGNvbmZsaWN0IGVuY291bnRlcmVkLiBNb2RlbCBcIiArIG5hbWUgKyBcIiBhbHJlYWR5IGV4aXN0c1wiKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuc2NoZW1hc1tuYW1lXSA9IG1vZGVsO1xuICB9O1xuXG4gIFJlZ2lzdHJ5LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuc2NoZW1hc1tuYW1lXTtcbiAgfTtcblxuICBSZWdpc3RyeS5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5zY2hlbWFzID0ge307XG4gIH07XG5cbiAgcmV0dXJuIFJlZ2lzdHJ5O1xuXG59KSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBSZWdpc3RyeSgpO1xuXG4iLCJ2YXIgQ2hhbmdlTWFuYWdlciwgREVGQVVMVF9PUFRJT05TLCBJbnN0YW5jZUZhY3RvcnksIE1vZGVsRmFjdG9yeSwgTkVTVEVEX1RZUEVTLCBSZWdpc3RyeSwgU2NoZW1pbmcsIFRIUk9UVExFLCBUWVBFUywgVHlwZXMsIGNyZWF0ZSwgZmx1c2gsIGdldCwgbm9ybWFsaXplUHJvcGVydHlDb25maWcsIHJlZ2lzdGVyUXVldWVDYWxsYmFjaywgcmVnaXN0ZXJSZXNvbHZlQ2FsbGJhY2ssIHJlc2V0LCByZXNvbHZlVHlwZSwgc2V0VGhyb3R0bGUsIHVucmVnaXN0ZXJRdWV1ZUNhbGxiYWNrLCB1bnJlZ2lzdGVyUmVzb2x2ZUNhbGxiYWNrLCB1dWlkO1xuXG5UeXBlcyA9IHJlcXVpcmUoJy4vVHlwZXMnKTtcblxuUmVnaXN0cnkgPSByZXF1aXJlKCcuL1JlZ2lzdHJ5Jyk7XG5cbkNoYW5nZU1hbmFnZXIgPSByZXF1aXJlKCcuL0NoYW5nZU1hbmFnZXInKTtcblxuTW9kZWxGYWN0b3J5ID0gcmVxdWlyZSgnLi9Nb2RlbEZhY3RvcnknKTtcblxuSW5zdGFuY2VGYWN0b3J5ID0gcmVxdWlyZSgnLi9JbnN0YW5jZUZhY3RvcnknKTtcblxuVFlQRVMgPSBUeXBlcy5UWVBFUywgTkVTVEVEX1RZUEVTID0gVHlwZXMuTkVTVEVEX1RZUEVTLCByZXNvbHZlVHlwZSA9IFR5cGVzLnJlc29sdmVUeXBlO1xuXG5USFJPVFRMRSA9IENoYW5nZU1hbmFnZXIuVEhST1RUTEUsIHNldFRocm90dGxlID0gQ2hhbmdlTWFuYWdlci5zZXRUaHJvdHRsZSwgcmVnaXN0ZXJRdWV1ZUNhbGxiYWNrID0gQ2hhbmdlTWFuYWdlci5yZWdpc3RlclF1ZXVlQ2FsbGJhY2ssIHVucmVnaXN0ZXJRdWV1ZUNhbGxiYWNrID0gQ2hhbmdlTWFuYWdlci51bnJlZ2lzdGVyUXVldWVDYWxsYmFjaywgcmVnaXN0ZXJSZXNvbHZlQ2FsbGJhY2sgPSBDaGFuZ2VNYW5hZ2VyLnJlZ2lzdGVyUmVzb2x2ZUNhbGxiYWNrLCB1bnJlZ2lzdGVyUmVzb2x2ZUNhbGxiYWNrID0gQ2hhbmdlTWFuYWdlci51bnJlZ2lzdGVyUmVzb2x2ZUNhbGxiYWNrLCBmbHVzaCA9IENoYW5nZU1hbmFnZXIuZmx1c2g7XG5cbkRFRkFVTFRfT1BUSU9OUyA9IE1vZGVsRmFjdG9yeS5ERUZBVUxUX09QVElPTlMsIG5vcm1hbGl6ZVByb3BlcnR5Q29uZmlnID0gTW9kZWxGYWN0b3J5Lm5vcm1hbGl6ZVByb3BlcnR5Q29uZmlnLCBjcmVhdGUgPSBNb2RlbEZhY3RvcnkuY3JlYXRlO1xuXG51dWlkID0gSW5zdGFuY2VGYWN0b3J5LnV1aWQ7XG5cbmdldCA9IFJlZ2lzdHJ5LmdldCwgcmVzZXQgPSBSZWdpc3RyeS5yZXNldDtcblxucmVzZXQgPSBmdW5jdGlvbigpIHtcbiAgUmVnaXN0cnkucmVzZXQoKTtcbiAgcmV0dXJuIENoYW5nZU1hbmFnZXIucmVzZXQoKTtcbn07XG5cblNjaGVtaW5nID0ge1xuICBUWVBFUzogVFlQRVMsXG4gIE5FU1RFRF9UWVBFUzogTkVTVEVEX1RZUEVTLFxuICBERUZBVUxUX09QVElPTlM6IERFRkFVTFRfT1BUSU9OUyxcbiAgVEhST1RUTEU6IFRIUk9UVExFLFxuICB1dWlkOiB1dWlkLFxuICBnZXQ6IGdldCxcbiAgcmVzZXQ6IHJlc2V0LFxuICByZXNvbHZlVHlwZTogcmVzb2x2ZVR5cGUsXG4gIG5vcm1hbGl6ZVByb3BlcnR5Q29uZmlnOiBub3JtYWxpemVQcm9wZXJ0eUNvbmZpZyxcbiAgc2V0VGhyb3R0bGU6IHNldFRocm90dGxlLFxuICByZWdpc3RlclF1ZXVlQ2FsbGJhY2s6IHJlZ2lzdGVyUXVldWVDYWxsYmFjayxcbiAgdW5yZWdpc3RlclF1ZXVlQ2FsbGJhY2s6IHVucmVnaXN0ZXJRdWV1ZUNhbGxiYWNrLFxuICByZWdpc3RlclJlc29sdmVDYWxsYmFjazogcmVnaXN0ZXJSZXNvbHZlQ2FsbGJhY2ssXG4gIHVucmVnaXN0ZXJSZXNvbHZlQ2FsbGJhY2s6IHVucmVnaXN0ZXJSZXNvbHZlQ2FsbGJhY2ssXG4gIGZsdXNoOiBmbHVzaCxcbiAgY3JlYXRlOiBjcmVhdGVcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU2NoZW1pbmc7XG5cbiIsInZhciBUeXBlcywgXyxcbiAgYmluZCA9IGZ1bmN0aW9uKGZuLCBtZSl7IHJldHVybiBmdW5jdGlvbigpeyByZXR1cm4gZm4uYXBwbHkobWUsIGFyZ3VtZW50cyk7IH07IH07XG5cbl8gPSByZXF1aXJlKCcuL3V0aWxpdGllcycpO1xuXG5UeXBlcyA9IChmdW5jdGlvbigpIHtcbiAgZnVuY3Rpb24gVHlwZXMoKSB7XG4gICAgdGhpcy5yZXNvbHZlVHlwZSA9IGJpbmQodGhpcy5yZXNvbHZlVHlwZSwgdGhpcyk7XG4gICAgdGhpcy5yZXNvbHZlU2NoZW1hVHlwZSA9IGJpbmQodGhpcy5yZXNvbHZlU2NoZW1hVHlwZSwgdGhpcyk7XG4gICAgdGhpcy5nZXRQcmltaXRpdmVUeXBlT2YgPSBiaW5kKHRoaXMuZ2V0UHJpbWl0aXZlVHlwZU9mLCB0aGlzKTtcbiAgfVxuXG5cbiAgLypcbiAgICBTY2hlbWluZyBleHBvcnRzIHRoZSBkZWZhdWx0IHR5cGVzIHRoYXQgaXQgdXNlcyBmb3IgcGFyc2luZyBzY2hlbWFzLiBZb3UgY2FuIGV4dGVuZCB3aXRoIGN1c3RvbSB0eXBlcywgb3JcbiAgICBvdmVycmlkZSB0aGUgaWRlbnRpZmllciAvIHBhcnNlciBmdW5jdGlvbnMgb2YgdGhlIGRlZmF1bHQgdHlwZXMuIEEgY3VzdG9tIHR5cGUgc2hvdWxkIHByb3ZpZGU6XG4gICAgIC0gY3RvciAob3B0aW9uYWwpIC0gVXNlZCBpbiBzY2hlbWEgZGVmaW5pdGlvbnMgdG8gZGVjbGFyZSBhIHR5cGUuIGBTY2hlbWluZy5jcmVhdGUgbmFtZSA6IFN0cmluZ2BcbiAgICAgLSBzdHJpbmcgLSBVc2VkIGluIHNjaGVtYSBkZWZpbml0aW9ucyB0byBkZWNsYXJlIGEgdHlwZS4gYFNjaGVtaW5nLmNyZWF0ZSBuYW1lIDogJ3N0cmluZydgXG4gICAgIC0gaWRlbnRpZmllciAtIEZ1bmN0aW9uLCByZXR1cm5zIHRydWUgb3IgZmFsc2UuIERldGVybWluZXMgd2hldGhlciBhIHZhbHVlIG5lZWRzIHRvIGJlIHBhcnNlZC5cbiAgICAgLSBwYXJzZXIgLSBGdW5jdGlvbiwgcGFyc2VzIGEgdmFsdWUgaW50byB0aGUgdHlwZS5cbiAgICovXG5cbiAgVHlwZXMucHJvdG90eXBlLlRZUEVTID0ge1xuICAgIFN0cmluZzoge1xuICAgICAgY3RvcjogU3RyaW5nLFxuICAgICAgc3RyaW5nOiAnc3RyaW5nJyxcbiAgICAgIGlkZW50aWZpZXI6IF8uaXNTdHJpbmcsXG4gICAgICBwYXJzZXI6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICByZXR1cm4gJycgKyB2YWw7XG4gICAgICB9LFxuICAgICAgZXF1YWxzOiBmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgIHJldHVybiBhID09PSBiO1xuICAgICAgfVxuICAgIH0sXG4gICAgTnVtYmVyOiB7XG4gICAgICBjdG9yOiBOdW1iZXIsXG4gICAgICBzdHJpbmc6ICdudW1iZXInLFxuICAgICAgaWRlbnRpZmllcjogXy5pc051bWJlcixcbiAgICAgIHBhcnNlcjogcGFyc2VGbG9hdCxcbiAgICAgIGNvbXBhcmF0b3I6IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIGEgPT09IGI7XG4gICAgICB9LFxuICAgICAgZXF1YWxzOiBmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgIHJldHVybiBhID09PSBiO1xuICAgICAgfVxuICAgIH0sXG4gICAgSW50ZWdlcjoge1xuICAgICAgc3RyaW5nOiAnaW50ZWdlcicsXG4gICAgICBpZGVudGlmaWVyOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgcmV0dXJuIF8uaXNOdW1iZXIodmFsKSAmJiB2YWwgJSAxID09PSAwO1xuICAgICAgfSxcbiAgICAgIHBhcnNlcjogcGFyc2VJbnQsXG4gICAgICBlcXVhbHM6IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIGEgPT09IGI7XG4gICAgICB9XG4gICAgfSxcbiAgICBEYXRlOiB7XG4gICAgICBjdG9yOiBEYXRlLFxuICAgICAgc3RyaW5nOiAnZGF0ZScsXG4gICAgICBpZGVudGlmaWVyOiBfLmlzRGF0ZSxcbiAgICAgIHBhcnNlcjogZnVuY3Rpb24odmFsKSB7XG4gICAgICAgIHJldHVybiBuZXcgRGF0ZSh2YWwpO1xuICAgICAgfSxcbiAgICAgIGVxdWFsczogZnVuY3Rpb24oYSwgYikge1xuICAgICAgICByZXR1cm4gKGEgIT0gbnVsbCA/IGEudmFsdWVPZigpIDogdm9pZCAwKSA9PT0gKGIgIT0gbnVsbCA/IGIudmFsdWVPZigpIDogdm9pZCAwKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIEJvb2xlYW46IHtcbiAgICAgIGN0b3I6IEJvb2xlYW4sXG4gICAgICBzdHJpbmc6ICdib29sZWFuJyxcbiAgICAgIGlkZW50aWZpZXI6IF8uaXNCb29sZWFuLFxuICAgICAgcGFyc2VyOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgcmV0dXJuICEhdmFsO1xuICAgICAgfSxcbiAgICAgIGVxdWFsczogZnVuY3Rpb24oYSwgYikge1xuICAgICAgICByZXR1cm4gYSA9PT0gYjtcbiAgICAgIH1cbiAgICB9LFxuICAgIE1peGVkOiB7XG4gICAgICBjdG9yOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgcmV0dXJuIHZhbDtcbiAgICAgIH0sXG4gICAgICBzdHJpbmc6ICcqJyxcbiAgICAgIGlkZW50aWZpZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0sXG4gICAgICBwYXJzZXI6IF8uaWRlbnRpdHksXG4gICAgICBlcXVhbHM6IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIGEgPT09IGI7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG5cbiAgLypcbiAgICBTcGVjaWFsIHR5cGUgZGVmaW5pdGlvbnMgZm9yIG5lc3RlZCB0eXBlcy4gVXNlZCB0byBpZGVudGlmeSBhbmQgcGFyc2UgbmVzdGVkIEFycmF5cyBhbmQgU2NoZW1hcy5cbiAgICBTaG91bGQgbm90IGJlIGV4dGVuZGVkIG9yIG92ZXJyaWRkZW4uXG4gICAqL1xuXG4gIFR5cGVzLnByb3RvdHlwZS5ORVNURURfVFlQRVMgPSB7XG4gICAgQXJyYXk6IHtcbiAgICAgIGN0b3I6IEFycmF5LFxuICAgICAgc3RyaW5nOiAnYXJyYXknLFxuICAgICAgaWRlbnRpZmllcjogXy5pc0FycmF5LFxuICAgICAgcGFyc2VyOiBfLnRvQXJyYXksXG4gICAgICBjaGlsZFR5cGU6IG51bGwsXG4gICAgICBjaGlsZFBhcnNlcjogbnVsbCxcbiAgICAgIGVxdWFsczogZnVuY3Rpb24oYSwgYikge1xuICAgICAgICByZXR1cm4gXy5pc0VxdWFsKGEsIGIpO1xuICAgICAgfVxuICAgIH0sXG4gICAgU2NoZW1hOiB7XG4gICAgICBjdG9yOiBPYmplY3QsXG4gICAgICBzdHJpbmc6ICdzY2hlbWEnLFxuICAgICAgaWRlbnRpZmllcjogbnVsbCxcbiAgICAgIHBhcnNlcjogbnVsbCxcbiAgICAgIGNoaWxkVHlwZTogbnVsbCxcbiAgICAgIGVxdWFsczogZnVuY3Rpb24oYSwgYikge1xuICAgICAgICByZXR1cm4gYSA9PT0gYjtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgVHlwZXMucHJvdG90eXBlLmdldFByaW1pdGl2ZVR5cGVPZiA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICB2YXIgVFlQRSwgaywgcmVmO1xuICAgIHJlZiA9IHRoaXMuVFlQRVM7XG4gICAgZm9yIChrIGluIHJlZikge1xuICAgICAgVFlQRSA9IHJlZltrXTtcbiAgICAgIGlmICh0eXBlID09PSBUWVBFIHx8IChUWVBFLmN0b3IgJiYgdHlwZSA9PT0gVFlQRS5jdG9yKSB8fCAodHlwZSAhPSBudWxsID8gdHlwZW9mIHR5cGUudG9Mb3dlckNhc2UgPT09IFwiZnVuY3Rpb25cIiA/IHR5cGUudG9Mb3dlckNhc2UoKSA6IHZvaWQgMCA6IHZvaWQgMCkgPT09IFRZUEUuc3RyaW5nKSB7XG4gICAgICAgIHJldHVybiBUWVBFO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfTtcblxuICBUeXBlcy5wcm90b3R5cGUucmVzb2x2ZVNjaGVtYVR5cGUgPSBmdW5jdGlvbih0eXBlLCBjaGlsZFR5cGUpIHtcbiAgICB0eXBlLmNoaWxkVHlwZSA9IGNoaWxkVHlwZTtcbiAgICB0eXBlLmlkZW50aWZpZXIgPSBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiB2YWwgaW5zdGFuY2VvZiBjaGlsZFR5cGU7XG4gICAgfTtcbiAgICByZXR1cm4gdHlwZS5wYXJzZXIgPSBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiBuZXcgY2hpbGRUeXBlKHZhbCk7XG4gICAgfTtcbiAgfTtcblxuICBUeXBlcy5wcm90b3R5cGUucmVzb2x2ZVR5cGUgPSBmdW5jdGlvbih0eXBlRGVmKSB7XG4gICAgdmFyIGNoaWxkVHlwZSwgZm4sIGZuMSwgaSwgbGVuLCByZWYsIHR5cGU7XG4gICAgdHlwZSA9IHRoaXMuZ2V0UHJpbWl0aXZlVHlwZU9mKHR5cGVEZWYpO1xuICAgIGlmICh0eXBlID09IG51bGwpIHtcbiAgICAgIGlmIChfLmlzQXJyYXkodHlwZURlZikpIHtcbiAgICAgICAgdHlwZSA9IF8uY2xvbmVEZWVwKHRoaXMuTkVTVEVEX1RZUEVTLkFycmF5KTtcbiAgICAgICAgaWYgKHR5cGVEZWYubGVuZ3RoKSB7XG4gICAgICAgICAgY2hpbGRUeXBlID0gdGhpcy5yZXNvbHZlVHlwZSh0eXBlRGVmWzBdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWNoaWxkVHlwZSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkVycm9yIHJlc29sdmluZyB0eXBlIG9mIGFycmF5IHZhbHVlIFwiICsgdHlwZURlZik7XG4gICAgICAgIH1cbiAgICAgICAgdHlwZS5jaGlsZFR5cGUgPSBjaGlsZFR5cGU7XG4gICAgICAgIHR5cGUuY2hpbGRQYXJzZXIgPSBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgICB2YXIgaW5kZXgsIG1lbWJlcjtcbiAgICAgICAgICBmb3IgKGluZGV4IGluIHZhbCkge1xuICAgICAgICAgICAgbWVtYmVyID0gdmFsW2luZGV4XTtcbiAgICAgICAgICAgIGlmICghY2hpbGRUeXBlLmlkZW50aWZpZXIobWVtYmVyKSkge1xuICAgICAgICAgICAgICB2YWxbaW5kZXhdID0gY2hpbGRUeXBlLnBhcnNlcihtZW1iZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdmFsO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qXG4gICAgICAgIC0gSWYgdGhlIHR5cGUgZGVmaW5pdGlvbiBpcyBhbiBvYmplY3QgYHt9YFxuICAgICAgICAgIC0gQ3JlYXRlIGEgbmV3IFNjaGVtYSBmcm9tIHRoZSBvYmplY3RcbiAgICAgICAgICAtIFRyZWF0IHRoZSBmaWVsZCBhcyBhIG5lc3RlZCBTY2hlbWFcbiAgICAgICAgICAtIFNldCBpZGVudGlmaWVyIGFuZCBwYXJzZXIgZnVuY3Rpb25zIGltbWVkaWF0ZWx5XG4gICAgICAgICAqL1xuICAgICAgfSBlbHNlIGlmIChfLmlzUGxhaW5PYmplY3QodHlwZURlZikpIHtcbiAgICAgICAgdHlwZSA9IF8uY2xvbmVEZWVwKHRoaXMuTkVTVEVEX1RZUEVTLlNjaGVtYSk7XG4gICAgICAgIGNoaWxkVHlwZSA9IHJlcXVpcmUoJy4vTW9kZWxGYWN0b3J5JykuY3JlYXRlKHR5cGVEZWYpO1xuICAgICAgICB0aGlzLnJlc29sdmVTY2hlbWFUeXBlKHR5cGUsIGNoaWxkVHlwZSk7XG5cbiAgICAgICAgLypcbiAgICAgICAgLSBJZiB0aGUgdHlwZSBkZWZpbml0aW9uIGlzIGEgcmVmZXJlbmNlIHRvIGEgU2NoZW1hIGNvbnN0cnVjdG9yXG4gICAgICAgICAgLSBUcmVhdCB0aGUgZmllbGQgYXMgYSBuZXN0ZWQgU2NoZW1hXG4gICAgICAgICAgLSBTZXQgaWRlbnRpZmllciBhbmQgcGFyc2VyIGZ1bmN0aW9ucyBpbW1lZGlhdGVseVxuICAgICAgICAgKi9cbiAgICAgIH0gZWxzZSBpZiAoXy5pc0Z1bmN0aW9uKHR5cGVEZWYpICYmIHR5cGVEZWYuX19zY2hlbWFJZCkge1xuICAgICAgICB0eXBlID0gXy5jbG9uZURlZXAodGhpcy5ORVNURURfVFlQRVMuU2NoZW1hKTtcbiAgICAgICAgY2hpbGRUeXBlID0gdHlwZURlZjtcbiAgICAgICAgdGhpcy5yZXNvbHZlU2NoZW1hVHlwZSh0eXBlLCBjaGlsZFR5cGUpO1xuXG4gICAgICAgIC8qXG4gICAgICAgIC0gSWYgdGhlIHR5cGUgZGVmaW5pdGlvbiBpcyBhIHN0cmluZyB0aGF0IGJlZ2lucyB3aXRoIFNjaGVtYTosIHN1Y2ggYXMgYCdTY2hlbWE6Q2FyJ2BcbiAgICAgICAgICAtIEl0IGlzIGFzc3VtZWQgdGhhdCB0aGUgZmllbGQgaXMgYSByZWZlcmVuY2UgdG8gYSBuZXN0ZWQgU2NoZW1hIHRoYXQgd2lsbCBiZSByZWdpc3RlcmVkIHdpdGggdGhlIG5hbWUgQ2FyLFxuICAgICAgICBidXQgbWF5IG5vdCBiZSByZWdpc3RlcmVkIHlldFxuICAgICAgICAgIC0gVGhlIFNjaGVtYSBpcyBub3QgcmVzb2x2ZWQgaW1tZWRpYXRlbHlcbiAgICAgICAgICAtIFRoZSBwYXJzZXIgYW5kIGlkZW50aWZpZXIgZnVuY3Rpb25zIGFyZSB3cml0dGVuIGFzIHdyYXBwZXJzLCBzbyB0aGF0IHRoZSBmaXJzdCB0aW1lIHRoZXkgYXJlIGludm9rZWQgdGhlIFNjaGVtYVxuICAgICAgICB3aWxsIGJlIGxvb2tlZCB1cCBhdCB0aGF0IHRpbWUgdmlhIGBTY2hlbWluZy5nZXRgLCBhbmQgcmVhbCBpZGVudGlmaWVyIGFuZCBwYXJzZXIgYXJlIHNldCBhdCB0aGF0IHRpbWUuXG4gICAgICAgICAgLSBJZiB0aGUgcmVnaXN0ZXJlZCBTY2hlbWEgY2Fubm90IGJlIHJlc29sdmVkLCB0aHJvdyBhbiBlcnJvci5cbiAgICAgICAgICovXG4gICAgICB9IGVsc2UgaWYgKF8uaXNTdHJpbmcodHlwZURlZikgJiYgdHlwZURlZi5zbGljZSgwLCA3KSA9PT0gJ1NjaGVtYTonKSB7XG4gICAgICAgIHR5cGUgPSBfLmNsb25lRGVlcCh0aGlzLk5FU1RFRF9UWVBFUy5TY2hlbWEpO1xuICAgICAgICBjaGlsZFR5cGUgPSB0eXBlRGVmLnNsaWNlKDcpO1xuICAgICAgICByZWYgPSBbJ2lkZW50aWZpZXInLCAncGFyc2VyJ107XG4gICAgICAgIGZuMSA9IChmdW5jdGlvbihfdGhpcykge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbihmbikge1xuICAgICAgICAgICAgcmV0dXJuIHR5cGVbZm5dID0gZnVuY3Rpb24odmFsKSB7XG4gICAgICAgICAgICAgIGNoaWxkVHlwZSA9IHJlcXVpcmUoJy4vUmVnaXN0cnknKS5nZXQoY2hpbGRUeXBlKTtcbiAgICAgICAgICAgICAgaWYgKCFjaGlsZFR5cGUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFcnJvciByZXNvbHZpbmcgXCIgKyB0eXBlRGVmICsgXCIgb24gbGF6eSBpbml0aWFsaXphdGlvblwiKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBfdGhpcy5yZXNvbHZlU2NoZW1hVHlwZSh0eXBlLCBjaGlsZFR5cGUpO1xuICAgICAgICAgICAgICByZXR1cm4gdHlwZVtmbl0odmFsKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfTtcbiAgICAgICAgfSkodGhpcyk7XG4gICAgICAgIGZvciAoaSA9IDAsIGxlbiA9IHJlZi5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgIGZuID0gcmVmW2ldO1xuICAgICAgICAgIGZuMShmbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHR5cGUgfHwgbnVsbDtcbiAgfTtcblxuICByZXR1cm4gVHlwZXM7XG5cbn0pKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IFR5cGVzKCk7XG5cbiIsInZhciBjbG9uZSwgY2xvbmVEZWVwLCBjb250YWlucywgY29udGFpbnNBcnJheSwgY29udGFpbnNPYmplY3QsIGRlZmF1bHRzLCBleHRlbmQsIGhhcywgaWRlbnRpdHksIGluY2x1ZGVzLCBpbnRlcnNlY3Rpb24sIGlzQXJyYXksIGlzQm9vbGVhbiwgaXNEYXRlLCBpc0VxdWFsLCBpc0VxdWFsQXJyYXksIGlzRnVuY3Rpb24sIGlzTnVtYmVyLCBpc09iamVjdExpa2UsIGlzUGxhaW5PYmplY3QsIGlzU3RyaW5nLCBpc1ZvaWQsIHJlbW92ZSwgc2l6ZSwgdG9BcnJheSwgdW5pcSwgdW5pcXVlLFxuICBzbGljZSA9IFtdLnNsaWNlO1xuXG5pZGVudGl0eSA9IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHg7XG59O1xuXG5pc1ZvaWQgPSBmdW5jdGlvbih4KSB7XG4gIHJldHVybiB4ID09PSBudWxsIHx8IHR5cGVvZiB4ID09PSAndW5kZWZpbmVkJztcbn07XG5cbmlzRnVuY3Rpb24gPSBmdW5jdGlvbih4KSB7XG4gIHJldHVybiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJztcbn07XG5cbmlzT2JqZWN0TGlrZSA9IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuICFpc1ZvaWQoeCkgJiYgdHlwZW9mIHggPT09ICdvYmplY3QnO1xufTtcblxuaXNTdHJpbmcgPSBmdW5jdGlvbih4KSB7XG4gIHJldHVybiB0eXBlb2YgeCA9PT0gJ3N0cmluZyc7XG59O1xuXG5pc051bWJlciA9IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHR5cGVvZiB4ID09PSAnbnVtYmVyJztcbn07XG5cbmlzRGF0ZSA9IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHggaW5zdGFuY2VvZiBEYXRlO1xufTtcblxuaXNCb29sZWFuID0gZnVuY3Rpb24oeCkge1xuICByZXR1cm4geCA9PT0gdHJ1ZSB8fCB4ID09PSBmYWxzZTtcbn07XG5cbmlzQXJyYXkgPSAhQXJyYXkuaXNBcnJheSA/IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4KSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbn0gOiBBcnJheS5pc0FycmF5O1xuXG5leHRlbmQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGludG8sIHZhbHVlcztcbiAgaW50byA9IGFyZ3VtZW50c1swXSwgdmFsdWVzID0gMiA8PSBhcmd1bWVudHMubGVuZ3RoID8gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpIDogW107XG4gIHJldHVybiB0b0FycmF5KHZhbHVlcyB8fCBbXSkucmVkdWNlKChmdW5jdGlvbihhY2MsIHZhbHVlKSB7XG4gICAgT2JqZWN0LmtleXModmFsdWUpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICBpZiAoaXNWb2lkKGtleSkpIHtcbiAgICAgICAgcmV0dXJuIGRlbGV0ZSBhY2Nba2V5XTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBhY2Nba2V5XSA9IHZhbHVlW2tleV07XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGFjYztcbiAgfSksIGludG8pO1xufTtcblxuaXNFcXVhbEFycmF5ID0gZnVuY3Rpb24obGVmdCwgcmlnaHQpIHtcbiAgcmV0dXJuIGxlZnQgPT09IHJpZ2h0IHx8ICghaXNWb2lkKGxlZnQpICYmICFpc1ZvaWQocmlnaHQpICYmIGlzQXJyYXkobGVmdCkgPT09IGlzQXJyYXkocmlnaHQpICYmICghaXNBcnJheShsZWZ0KSB8fCAobGVmdC5sZW5ndGggPT09IHJpZ2h0Lmxlbmd0aCAmJiBsZWZ0LmV2ZXJ5KGZ1bmN0aW9uKGxlZnRWYWx1ZSwgbGVmdEluZGV4KSB7XG4gICAgcmV0dXJuIGxlZnRWYWx1ZSA9PT0gcmlnaHRbbGVmdEluZGV4XTtcbiAgfSkpKSk7XG59O1xuXG5pc1BsYWluT2JqZWN0ID0gZnVuY3Rpb24oeCkge1xuICByZXR1cm4gaXNPYmplY3RMaWtlKHgpICYmICFpc0Z1bmN0aW9uKHgpICYmICFpc1N0cmluZyh4KSAmJiAhaXNBcnJheSh4KTtcbn07XG5cbmNsb25lID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgaWYgKGlzVm9pZCh2YWx1ZSkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfSBlbHNlIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgIHJldHVybiB2YWx1ZS5tYXAoaWRlbnRpdHkpO1xuICB9IGVsc2UgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfSBlbHNlIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgcmV0dXJuIG5ldyBEYXRlKHZhbHVlKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHZhbHVlKS5yZWR1Y2UoKGZ1bmN0aW9uKGFjYywga2V5KSB7XG4gICAgICBhY2Nba2V5XSA9IHZhbHVlW2tleV07XG4gICAgICByZXR1cm4gYWNjO1xuICAgIH0pLCB7fSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG59O1xuXG5jbG9uZURlZXAgPSBmdW5jdGlvbih2YWx1ZSkge1xuICBpZiAoaXNWb2lkKHZhbHVlKSkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfSBlbHNlIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgIHJldHVybiB2YWx1ZS5tYXAoY2xvbmVEZWVwKTtcbiAgfSBlbHNlIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH0gZWxzZSBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgIHJldHVybiBuZXcgRGF0ZSh2YWx1ZSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyh2YWx1ZSkucmVkdWNlKChmdW5jdGlvbihhY2MsIGtleSkge1xuICAgICAgYWNjW2tleV0gPSBjbG9uZURlZXAodmFsdWVba2V5XSk7XG4gICAgICByZXR1cm4gYWNjO1xuICAgIH0pLCB7fSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG59O1xuXG50b0FycmF5ID0gZnVuY3Rpb24oeCkge1xuICBpZiAoaXNBcnJheSh4KSkge1xuICAgIHJldHVybiB4O1xuICB9IGVsc2UgaWYgKGlzU3RyaW5nKHgpKSB7XG4gICAgcmV0dXJuIHguc3BsaXQoJycpO1xuICB9IGVsc2UgaWYgKGlzT2JqZWN0TGlrZSh4KSkge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyh4KS5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4geFtrZXldO1xuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBbXTtcbiAgfVxufTtcblxuaGFzID0gZnVuY3Rpb24ob2JqLCB2YWx1ZSkge1xuICByZXR1cm4gb2JqLmhhc093blByb3BlcnR5KHZhbHVlKTtcbn07XG5cbmNvbnRhaW5zQXJyYXkgPSBmdW5jdGlvbihucywgdmFsdWUpIHtcbiAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgcmV0dXJuIG5zLnNvbWUodmFsdWUpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBucy5pbmRleE9mKHZhbHVlKSAhPT0gLTE7XG4gIH1cbn07XG5cbmNvbnRhaW5zT2JqZWN0ID0gZnVuY3Rpb24oaW50bywgdmFsdWUpIHtcbiAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKGludG8pLnNvbWUoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gdmFsdWUoaW50b1trZXldLCBrZXkpO1xuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhpbnRvKS5zb21lKGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIHZhbHVlID09PSBpbnRvW2tleV07XG4gICAgfSk7XG4gIH1cbn07XG5cbmNvbnRhaW5zID0gZnVuY3Rpb24oY29udGFpbnNJbnRvLCBjb250YWluc1ZhbHVlKSB7XG4gIGlmIChpc0FycmF5KGNvbnRhaW5zSW50bykpIHtcbiAgICByZXR1cm4gY29udGFpbnNBcnJheShjb250YWluc0ludG8sIGNvbnRhaW5zVmFsdWUpO1xuICB9IGVsc2UgaWYgKGlzT2JqZWN0TGlrZShjb250YWluc0ludG8pKSB7XG4gICAgcmV0dXJuIGNvbnRhaW5zT2JqZWN0KGNvbnRhaW5zSW50bywgY29udGFpbnNWYWx1ZSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG51bmlxdWUgPSBmdW5jdGlvbih2YWx1ZXMpIHtcbiAgcmV0dXJuIHZhbHVlcy5maWx0ZXIoZnVuY3Rpb24odmFsdWUsIGkpIHtcbiAgICByZXR1cm4gdmFsdWVzLmluZGV4T2YodmFsdWUpID49IGk7XG4gIH0pO1xufTtcblxuc2l6ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmIChpc0FycmF5KHZhbHVlKSB8fCBpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdmFsdWUubGVuZ3RoO1xuICB9IGVsc2UgaWYgKGlzT2JqZWN0TGlrZSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXModmFsdWUpLmxlbmd0aDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gMDtcbiAgfVxufTtcblxuaW50ZXJzZWN0aW9uID0gZnVuY3Rpb24oKSB7XG4gIHZhciBoZWFkLCByZXN0O1xuICBoZWFkID0gYXJndW1lbnRzWzBdLCByZXN0ID0gMiA8PSBhcmd1bWVudHMubGVuZ3RoID8gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpIDogW107XG4gIHJldHVybiB1bmlxdWUoaGVhZC5maWx0ZXIoZnVuY3Rpb24odikge1xuICAgIHJldHVybiByZXN0LmV2ZXJ5KGZ1bmN0aW9uKHJlc3RDb250YWluZXJzKSB7XG4gICAgICByZXR1cm4gY29udGFpbnMocmVzdENvbnRhaW5lcnMsIHYpO1xuICAgIH0pO1xuICB9KSk7XG59O1xuXG5kZWZhdWx0cyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgZGVmYXVsdFZhbHVlcywgb3JpZztcbiAgb3JpZyA9IGFyZ3VtZW50c1swXSwgZGVmYXVsdFZhbHVlcyA9IDIgPD0gYXJndW1lbnRzLmxlbmd0aCA/IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSA6IFtdO1xuICByZXR1cm4gZGVmYXVsdFZhbHVlcy5yZWR1Y2UoKGZ1bmN0aW9uKGFjYywgdmFsdWUpIHtcbiAgICBPYmplY3Qua2V5cyh2YWx1ZSkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgIGlmICghYWNjLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgcmV0dXJuIGFjY1trZXldID0gdmFsdWVba2V5XTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gYWNjO1xuICB9KSwgb3JpZyk7XG59O1xuXG5pc0VxdWFsID0gZnVuY3Rpb24obGVmdCwgcmlnaHQpIHtcbiAgaWYgKGlzQXJyYXkobGVmdCkpIHtcbiAgICByZXR1cm4gaXNFcXVhbEFycmF5KGxlZnQsIHJpZ2h0KTtcbiAgfSBlbHNlIGlmIChpc1BsYWluT2JqZWN0KGxlZnQpKSB7XG4gICAgcmV0dXJuIGlzUGxhaW5PYmplY3QocmlnaHQpICYmIE9iamVjdC5rZXlzKGxlZnQpLmxlbmd0aCA9PT0gT2JqZWN0LmtleXMocmlnaHQpLmxlbmd0aCAmJiBPYmplY3Qua2V5cyhsZWZ0KS5ldmVyeShmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiBpc0VxdWFsKGxlZnRba2V5XSwgcmlnaHRba2V5XSk7XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGxlZnQgPT09IHJpZ2h0O1xuICB9XG59O1xuXG5yZW1vdmUgPSBmdW5jdGlvbihucywgbikge1xuICByZXR1cm4gbnMuc3BsaWNlKG5zLmluZGV4T2YobiksIDEpO1xufTtcblxuaW5jbHVkZXMgPSBjb250YWlucztcblxudW5pcSA9IHVuaXF1ZTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNsb25lOiBjbG9uZSxcbiAgY2xvbmVEZWVwOiBjbG9uZURlZXAsXG4gIGNvbnRhaW5zOiBjb250YWlucyxcbiAgZGVmYXVsdHM6IGRlZmF1bHRzLFxuICBleHRlbmQ6IGV4dGVuZCxcbiAgaGFzOiBoYXMsXG4gIGlkZW50aXR5OiBpZGVudGl0eSxcbiAgaW5jbHVkZXM6IGluY2x1ZGVzLFxuICBpbnRlcnNlY3Rpb246IGludGVyc2VjdGlvbixcbiAgaXNBcnJheTogaXNBcnJheSxcbiAgaXNCb29sZWFuOiBpc0Jvb2xlYW4sXG4gIGlzRGF0ZTogaXNEYXRlLFxuICBpc0VxdWFsOiBpc0VxdWFsLFxuICBpc0Z1bmN0aW9uOiBpc0Z1bmN0aW9uLFxuICBpc051bWJlcjogaXNOdW1iZXIsXG4gIGlzUGxhaW5PYmplY3Q6IGlzUGxhaW5PYmplY3QsXG4gIGlzU3RyaW5nOiBpc1N0cmluZyxcbiAgcmVtb3ZlOiByZW1vdmUsXG4gIHNpemU6IHNpemUsXG4gIHRvQXJyYXk6IHRvQXJyYXksXG4gIHVuaXF1ZTogdW5pcXVlLFxuICB1bmlxOiB1bmlxXG59O1xuXG4iXX0=
;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qdXN0aW4ubWlsbGVyL1Byb2plY3RzL3NjaGVtaW5nL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9qdXN0aW4ubWlsbGVyL1Byb2plY3RzL3NjaGVtaW5nL3NyYy9DaGFuZ2VNYW5hZ2VyLmNvZmZlZSIsIi9Vc2Vycy9qdXN0aW4ubWlsbGVyL1Byb2plY3RzL3NjaGVtaW5nL3NyYy9FeHBvcnRCcm93c2VyLmNvZmZlZSIsIi9Vc2Vycy9qdXN0aW4ubWlsbGVyL1Byb2plY3RzL3NjaGVtaW5nL3NyYy9JbnN0YW5jZUZhY3RvcnkuY29mZmVlIiwiL1VzZXJzL2p1c3Rpbi5taWxsZXIvUHJvamVjdHMvc2NoZW1pbmcvc3JjL01vZGVsRmFjdG9yeS5jb2ZmZWUiLCIvVXNlcnMvanVzdGluLm1pbGxlci9Qcm9qZWN0cy9zY2hlbWluZy9zcmMvUmVnaXN0cnkuY29mZmVlIiwiL1VzZXJzL2p1c3Rpbi5taWxsZXIvUHJvamVjdHMvc2NoZW1pbmcvc3JjL1NjaGVtaW5nLmNvZmZlZSIsIi9Vc2Vycy9qdXN0aW4ubWlsbGVyL1Byb2plY3RzL3NjaGVtaW5nL3NyYy9UeXBlcy5jb2ZmZWUiLCIvVXNlcnMvanVzdGluLm1pbGxlci9Qcm9qZWN0cy9zY2hlbWluZy9zcmMvdXRpbGl0aWVzLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIENoYW5nZU1hbmFnZXIsIF8sXG4gIGJpbmQgPSBmdW5jdGlvbihmbiwgbWUpeyByZXR1cm4gZnVuY3Rpb24oKXsgcmV0dXJuIGZuLmFwcGx5KG1lLCBhcmd1bWVudHMpOyB9OyB9O1xuXG5fID0gcmVxdWlyZSgnLi91dGlsaXRpZXMnKTtcblxuQ2hhbmdlTWFuYWdlciA9IChmdW5jdGlvbigpIHtcbiAgQ2hhbmdlTWFuYWdlci5wcm90b3R5cGUuVEhST1RUTEUgPSB7XG4gICAgVElNRU9VVDogJ3RpbWVvdXQnLFxuICAgIElNTUVESUFURTogJ2ltbWVkaWF0ZScsXG4gICAgQU5JTUFUSU9OX0ZSQU1FOiAnYW5pbWF0aW9uRnJhbWUnXG4gIH07XG5cbiAgQ2hhbmdlTWFuYWdlci5wcm90b3R5cGUuSVRFUkFUSU9OX0xJTUlUID0gMTAwO1xuXG4gIGZ1bmN0aW9uIENoYW5nZU1hbmFnZXIoKSB7XG4gICAgdGhpcy5yZXNvbHZlID0gYmluZCh0aGlzLnJlc29sdmUsIHRoaXMpO1xuICAgIHRoaXMuZmx1c2ggPSBiaW5kKHRoaXMuZmx1c2gsIHRoaXMpO1xuICAgIHRoaXMuZ2V0UXVldWVkQ2hhbmdlcyA9IGJpbmQodGhpcy5nZXRRdWV1ZWRDaGFuZ2VzLCB0aGlzKTtcbiAgICB0aGlzLnF1ZXVlQ2hhbmdlcyA9IGJpbmQodGhpcy5xdWV1ZUNoYW5nZXMsIHRoaXMpO1xuICAgIHRoaXMucmVzZXQgPSBiaW5kKHRoaXMucmVzZXQsIHRoaXMpO1xuICAgIHRoaXMuY2xlYW51cEN5Y2xlID0gYmluZCh0aGlzLmNsZWFudXBDeWNsZSwgdGhpcyk7XG4gICAgdGhpcy51bnJlZ2lzdGVyUmVzb2x2ZUNhbGxiYWNrID0gYmluZCh0aGlzLnVucmVnaXN0ZXJSZXNvbHZlQ2FsbGJhY2ssIHRoaXMpO1xuICAgIHRoaXMucmVnaXN0ZXJSZXNvbHZlQ2FsbGJhY2sgPSBiaW5kKHRoaXMucmVnaXN0ZXJSZXNvbHZlQ2FsbGJhY2ssIHRoaXMpO1xuICAgIHRoaXMudW5yZWdpc3RlclF1ZXVlQ2FsbGJhY2sgPSBiaW5kKHRoaXMudW5yZWdpc3RlclF1ZXVlQ2FsbGJhY2ssIHRoaXMpO1xuICAgIHRoaXMucmVnaXN0ZXJRdWV1ZUNhbGxiYWNrID0gYmluZCh0aGlzLnJlZ2lzdGVyUXVldWVDYWxsYmFjaywgdGhpcyk7XG4gICAgdGhpcy5zZXRUaHJvdHRsZSA9IGJpbmQodGhpcy5zZXRUaHJvdHRsZSwgdGhpcyk7XG4gICAgdGhpcy5jaGFuZ2VzID0ge307XG4gICAgdGhpcy5pbnRlcm5hbENoYW5nZVF1ZXVlID0gW107XG4gICAgdGhpcy50aW1lb3V0ID0gbnVsbDtcbiAgICB0aGlzLnJlY3Vyc2lvbkNvdW50ID0gMDtcbiAgICB0aGlzLnNldFRocm90dGxlKHRoaXMuVEhST1RUTEUuVElNRU9VVCk7XG4gICAgdGhpcy5fYWN0aXZlQ2xlYXJUaW1lb3V0ID0gbnVsbDtcbiAgICB0aGlzLl9xdWV1ZUNhbGxiYWNrID0gbnVsbDtcbiAgICB0aGlzLl9yZXNvbHZlQ2FsbGJhY2sgPSBudWxsO1xuICB9XG5cbiAgQ2hhbmdlTWFuYWdlci5wcm90b3R5cGUuc2V0VGhyb3R0bGUgPSBmdW5jdGlvbih0aHJvdHRsZSkge1xuICAgIGlmICghXy5jb250YWlucyh0aGlzLlRIUk9UVExFLCB0aHJvdHRsZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlRocm90dGxlIG9wdGlvbiBtdXN0IGJlIHNldCB0byBvbmUgb2YgdGhlIHN0cmF0ZWdpZXMgc3BlY2lmaWVkIG9uIFNjaGVtaW5nLlRIUk9UVExFXCIpO1xuICAgIH1cbiAgICBzd2l0Y2ggKHRocm90dGxlKSB7XG4gICAgICBjYXNlIHRoaXMuVEhST1RUTEUuVElNRU9VVDpcbiAgICAgICAgdGhpcy5zZXRUaW1lb3V0ID0gKGZ1bmN0aW9uKF90aGlzKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIF90aGlzLnRpbWVvdXQgIT0gbnVsbCA/IF90aGlzLnRpbWVvdXQgOiBfdGhpcy50aW1lb3V0ID0gc2V0VGltZW91dChfdGhpcy5yZXNvbHZlLCAwKTtcbiAgICAgICAgICB9O1xuICAgICAgICB9KSh0aGlzKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2xlYXJUaW1lb3V0ID0gKGZ1bmN0aW9uKF90aGlzKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLnRpbWVvdXQpO1xuICAgICAgICAgICAgcmV0dXJuIF90aGlzLnRpbWVvdXQgPSBudWxsO1xuICAgICAgICAgIH07XG4gICAgICAgIH0pKHRoaXMpO1xuICAgICAgY2FzZSB0aGlzLlRIUk9UVExFLklNTUVESUFURTpcbiAgICAgICAgaWYgKCh0eXBlb2Ygc2V0SW1tZWRpYXRlICE9PSBcInVuZGVmaW5lZFwiICYmIHNldEltbWVkaWF0ZSAhPT0gbnVsbCkgJiYgKHR5cGVvZiBjbGVhckltbWVkaWF0ZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBjbGVhckltbWVkaWF0ZSAhPT0gbnVsbCkpIHtcbiAgICAgICAgICB0aGlzLnNldFRpbWVvdXQgPSAoZnVuY3Rpb24oX3RoaXMpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIF90aGlzLnRpbWVvdXQgIT0gbnVsbCA/IF90aGlzLnRpbWVvdXQgOiBfdGhpcy50aW1lb3V0ID0gc2V0SW1tZWRpYXRlKF90aGlzLnJlc29sdmUpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9KSh0aGlzKTtcbiAgICAgICAgICByZXR1cm4gdGhpcy5jbGVhclRpbWVvdXQgPSAoZnVuY3Rpb24oX3RoaXMpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgY2xlYXJJbW1lZGlhdGUoX3RoaXMudGltZW91dCk7XG4gICAgICAgICAgICAgIHJldHVybiBfdGhpcy50aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfSkodGhpcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKFwiQ2Fubm90IHVzZSBzdHJhdGVneSBJTU1FRElBVEU6IGBzZXRJbW1lZGlhdGVgIG9yIGBjbGVhckltbWVkaWF0ZWAgYXJlIG5vdCBhdmFpbGFibGUgaW4gdGhlIGN1cnJlbnQgZW52aXJvbm1lbnQuXCIpO1xuICAgICAgICAgIHJldHVybiB0aGlzLnNldFRocm90dGxlKHRoaXMuVEhST1RUTEUuVElNRU9VVCk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIHRoaXMuVEhST1RUTEUuQU5JTUFUSU9OX0ZSQU1FOlxuICAgICAgICBpZiAoKHR5cGVvZiByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgIT09IFwidW5kZWZpbmVkXCIgJiYgcmVxdWVzdEFuaW1hdGlvbkZyYW1lICE9PSBudWxsKSAmJiAodHlwZW9mIGNhbmNlbEFuaW1hdGlvbkZyYW1lICE9PSBcInVuZGVmaW5lZFwiICYmIGNhbmNlbEFuaW1hdGlvbkZyYW1lICE9PSBudWxsKSkge1xuICAgICAgICAgIHRoaXMuc2V0VGltZW91dCA9IChmdW5jdGlvbihfdGhpcykge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICByZXR1cm4gX3RoaXMudGltZW91dCAhPSBudWxsID8gX3RoaXMudGltZW91dCA6IF90aGlzLnRpbWVvdXQgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoX3RoaXMucmVzb2x2ZSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH0pKHRoaXMpO1xuICAgICAgICAgIHJldHVybiB0aGlzLmNsZWFyVGltZW91dCA9IChmdW5jdGlvbihfdGhpcykge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBjYW5jZWxBbmltYXRpb25GcmFtZShfdGhpcy50aW1lb3V0KTtcbiAgICAgICAgICAgICAgcmV0dXJuIF90aGlzLnRpbWVvdXQgPSBudWxsO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9KSh0aGlzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oXCJDYW5ub3QgdXNlIHN0cmF0ZWd5IEFOSU1BVElPTl9GUkFNRTogYHJlcXVlc3RBbmltYXRpb25GcmFtZWAgb3IgYGNhbmNlbEFuaW1hdGlvbkZyYW1lYCBhcmUgbm90IGF2YWlsYWJsZSBpbiB0aGUgY3VycmVudCBlbnZpcm9ubWVudC5cIik7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuc2V0VGhyb3R0bGUodGhpcy5USFJPVFRMRS5USU1FT1VUKTtcbiAgICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBDaGFuZ2VNYW5hZ2VyLnByb3RvdHlwZS5zZXRUaW1lb3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQSB0aHJvdHRsZSBzdHJhdGVneSBtdXN0IGJlIHNldC5cIik7XG4gIH07XG5cbiAgY2xlYXJUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkEgdGhyb3R0bGUgc3RyYXRlZ3kgbXVzdCBiZSBzZXQuXCIpO1xuICB9KTtcblxuICBDaGFuZ2VNYW5hZ2VyLnByb3RvdHlwZS5yZWdpc3RlclF1ZXVlQ2FsbGJhY2sgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIGlmICghXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcXVldWVDYWxsYmFjayA9IGNhbGxiYWNrO1xuICB9O1xuXG4gIENoYW5nZU1hbmFnZXIucHJvdG90eXBlLnVucmVnaXN0ZXJRdWV1ZUNhbGxiYWNrID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3F1ZXVlQ2FsbGJhY2sgPSBudWxsO1xuICB9O1xuXG4gIENoYW5nZU1hbmFnZXIucHJvdG90eXBlLnJlZ2lzdGVyUmVzb2x2ZUNhbGxiYWNrID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICBpZiAoIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3Jlc29sdmVDYWxsYmFjayA9IGNhbGxiYWNrO1xuICB9O1xuXG4gIENoYW5nZU1hbmFnZXIucHJvdG90eXBlLnVucmVnaXN0ZXJSZXNvbHZlQ2FsbGJhY2sgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fcmVzb2x2ZUNhbGxiYWNrID0gbnVsbDtcbiAgfTtcblxuICBDaGFuZ2VNYW5hZ2VyLnByb3RvdHlwZS5jbGVhbnVwQ3ljbGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmNoYW5nZXMgPSB7fTtcbiAgICB0aGlzLmludGVybmFsQ2hhbmdlUXVldWUgPSBbXTtcbiAgICBpZiAodHlwZW9mIHRoaXMuX2FjdGl2ZUNsZWFyVGltZW91dCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICB0aGlzLl9hY3RpdmVDbGVhclRpbWVvdXQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucmVjdXJzaW9uQ291bnQgPSAwO1xuICB9O1xuXG4gIENoYW5nZU1hbmFnZXIucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jaGFuZ2VzID0ge307XG4gICAgdGhpcy5pbnRlcm5hbENoYW5nZVF1ZXVlID0gW107XG4gICAgaWYgKHR5cGVvZiB0aGlzLl9hY3RpdmVDbGVhclRpbWVvdXQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgdGhpcy5fYWN0aXZlQ2xlYXJUaW1lb3V0KCk7XG4gICAgfVxuICAgIHRoaXMudGltZW91dCA9IG51bGw7XG4gICAgdGhpcy5yZWN1cnNpb25Db3VudCA9IDA7XG4gICAgdGhpcy5zZXRUaHJvdHRsZSh0aGlzLlRIUk9UVExFLlRJTUVPVVQpO1xuICAgIHRoaXMuX3F1ZXVlQ2FsbGJhY2sgPSBudWxsO1xuICAgIHJldHVybiB0aGlzLl9yZXNvbHZlQ2FsbGJhY2sgPSBudWxsO1xuICB9O1xuXG4gIENoYW5nZU1hbmFnZXIucHJvdG90eXBlLnF1ZXVlQ2hhbmdlcyA9IGZ1bmN0aW9uKGFyZywgZmlyZVdhdGNoZXJzKSB7XG4gICAgdmFyIGJhc2UsIGNoYW5nZWRQcm9wcywgZXF1YWxzLCBmb3JjZSwgaWQsIG5ld1ZhbCwgb2xkVmFsLCBwcm9wTmFtZTtcbiAgICBpZCA9IGFyZy5pZCwgcHJvcE5hbWUgPSBhcmcucHJvcE5hbWUsIG9sZFZhbCA9IGFyZy5vbGRWYWwsIG5ld1ZhbCA9IGFyZy5uZXdWYWwsIGVxdWFscyA9IGFyZy5lcXVhbHMsIGZvcmNlID0gYXJnLmZvcmNlO1xuICAgIGlmICghXy5oYXModGhpcy5jaGFuZ2VzLCBpZCkpIHtcbiAgICAgIGlmICgoYmFzZSA9IHRoaXMuY2hhbmdlcylbaWRdID09IG51bGwpIHtcbiAgICAgICAgYmFzZVtpZF0gPSB7XG4gICAgICAgICAgY2hhbmdlZFByb3BzOiB7fSxcbiAgICAgICAgICBmaXJlV2F0Y2hlcnM6IGZpcmVXYXRjaGVyc1xuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgdGhpcy5pbnRlcm5hbENoYW5nZVF1ZXVlLnB1c2goaWQpO1xuICAgIH1cbiAgICBjaGFuZ2VkUHJvcHMgPSB0aGlzLmNoYW5nZXNbaWRdLmNoYW5nZWRQcm9wcztcbiAgICBpZiAocHJvcE5hbWUpIHtcbiAgICAgIGlmIChfLmhhcyhjaGFuZ2VkUHJvcHMsIHByb3BOYW1lKSAmJiBlcXVhbHMoY2hhbmdlZFByb3BzW3Byb3BOYW1lXSwgbmV3VmFsKSkge1xuICAgICAgICBkZWxldGUgY2hhbmdlZFByb3BzW3Byb3BOYW1lXTtcbiAgICAgIH0gZWxzZSBpZiAoZm9yY2UgfHwgKCFfLmhhcyhjaGFuZ2VkUHJvcHMsIHByb3BOYW1lKSAmJiAhZXF1YWxzKG9sZFZhbCwgbmV3VmFsKSkpIHtcbiAgICAgICAgY2hhbmdlZFByb3BzW3Byb3BOYW1lXSA9IG9sZFZhbDtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRoaXMudGltZW91dCA9PSBudWxsKSB7XG4gICAgICBpZiAodHlwZW9mIHRoaXMuX3F1ZXVlQ2FsbGJhY2sgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICB0aGlzLl9xdWV1ZUNhbGxiYWNrKCk7XG4gICAgICB9XG4gICAgICB0aGlzLnNldFRpbWVvdXQoKTtcbiAgICAgIHJldHVybiB0aGlzLl9hY3RpdmVDbGVhclRpbWVvdXQgPSB0aGlzLmNsZWFyVGltZW91dDtcbiAgICB9XG4gIH07XG5cbiAgQ2hhbmdlTWFuYWdlci5wcm90b3R5cGUuZ2V0UXVldWVkQ2hhbmdlcyA9IGZ1bmN0aW9uKGFyZykge1xuICAgIHZhciBpZCwgcHJvcE5hbWUsIHJlZjtcbiAgICBpZCA9IGFyZy5pZCwgcHJvcE5hbWUgPSBhcmcucHJvcE5hbWU7XG4gICAgcmV0dXJuIChyZWYgPSB0aGlzLmNoYW5nZXNbaWRdKSAhPSBudWxsID8gcmVmLmNoYW5nZWRQcm9wc1twcm9wTmFtZV0gOiB2b2lkIDA7XG4gIH07XG5cbiAgQ2hhbmdlTWFuYWdlci5wcm90b3R5cGUuZmx1c2ggPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5yZXNvbHZlKCk7XG4gIH07XG5cbiAgQ2hhbmdlTWFuYWdlci5wcm90b3R5cGUucmVzb2x2ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBjaGFuZ2VkUHJvcHMsIGNoYW5nZXMsIGZpcmVXYXRjaGVycywgaSwgaWQsIGludGVybmFsQ2hhbmdlcywgbGVuLCByZWYsIHJlZjE7XG4gICAgdGhpcy5yZWN1cnNpb25Db3VudCsrO1xuICAgIGlmICh0aGlzLklURVJBVElPTl9MSU1JVCA+IDAgJiYgdGhpcy5yZWN1cnNpb25Db3VudCA+IHRoaXMuSVRFUkFUSU9OX0xJTUlUKSB7XG4gICAgICBjaGFuZ2VzID0gdGhpcy5jaGFuZ2VzO1xuICAgICAgdGhpcy5jbGVhbnVwQ3ljbGUoKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkFib3J0aW5nIGNoYW5nZSBwcm9wYWdhdGlvbiBhZnRlciBcIiArIHRoaXMuSVRFUkFUSU9OX0xJTUlUICsgXCIgY3ljbGVzLlxcblRoaXMgaXMgcHJvYmFibHkgaW5kaWNhdGl2ZSBvZiBhIGNpcmN1bGFyIHdhdGNoLiBDaGVjayB0aGUgZm9sbG93aW5nIHdhdGNoZXMgZm9yIGNsdWVzOlxcblwiICsgKEpTT04uc3RyaW5naWZ5KGNoYW5nZXMpKSk7XG4gICAgfVxuICAgIGludGVybmFsQ2hhbmdlcyA9IF8udW5pcXVlKHRoaXMuaW50ZXJuYWxDaGFuZ2VRdWV1ZSk7XG4gICAgdGhpcy5pbnRlcm5hbENoYW5nZVF1ZXVlID0gW107XG4gICAgZm9yIChpID0gMCwgbGVuID0gaW50ZXJuYWxDaGFuZ2VzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBpZCA9IGludGVybmFsQ2hhbmdlc1tpXTtcbiAgICAgIHJlZiA9IHRoaXMuY2hhbmdlc1tpZF0sIGNoYW5nZWRQcm9wcyA9IHJlZi5jaGFuZ2VkUHJvcHMsIGZpcmVXYXRjaGVycyA9IHJlZi5maXJlV2F0Y2hlcnM7XG4gICAgICBmaXJlV2F0Y2hlcnMoY2hhbmdlZFByb3BzLCAnaW50ZXJuYWwnKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuaW50ZXJuYWxDaGFuZ2VRdWV1ZS5sZW5ndGgpIHtcbiAgICAgIHJldHVybiB0aGlzLnJlc29sdmUoKTtcbiAgICB9XG4gICAgY2hhbmdlcyA9IHRoaXMuY2hhbmdlcztcbiAgICB0aGlzLmNoYW5nZXMgPSB7fTtcbiAgICBmb3IgKGlkIGluIGNoYW5nZXMpIHtcbiAgICAgIHJlZjEgPSBjaGFuZ2VzW2lkXSwgY2hhbmdlZFByb3BzID0gcmVmMS5jaGFuZ2VkUHJvcHMsIGZpcmVXYXRjaGVycyA9IHJlZjEuZmlyZVdhdGNoZXJzO1xuICAgICAgZmlyZVdhdGNoZXJzKGNoYW5nZWRQcm9wcywgJ2V4dGVybmFsJyk7XG4gICAgfVxuICAgIGlmIChfLnNpemUodGhpcy5jaGFuZ2VzKSA+IDApIHtcbiAgICAgIHJldHVybiB0aGlzLnJlc29sdmUoKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiB0aGlzLl9yZXNvbHZlQ2FsbGJhY2sgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgdGhpcy5fcmVzb2x2ZUNhbGxiYWNrKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmNsZWFudXBDeWNsZSgpO1xuICB9O1xuXG4gIHJldHVybiBDaGFuZ2VNYW5hZ2VyO1xuXG59KSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBDaGFuZ2VNYW5hZ2VyKCk7XG5cbiIsInZhciBfO1xuXG5fID0gd2luZG93Ll87XG5cbndpbmRvdy5TY2hlbWluZyA9IHJlcXVpcmUoJy4vU2NoZW1pbmcnKTtcblxuIiwidmFyIENoYW5nZU1hbmFnZXIsIEluc3RhbmNlRmFjdG9yeSwgVHlwZXMsIF8sXG4gIGJpbmQgPSBmdW5jdGlvbihmbiwgbWUpeyByZXR1cm4gZnVuY3Rpb24oKXsgcmV0dXJuIGZuLmFwcGx5KG1lLCBhcmd1bWVudHMpOyB9OyB9LFxuICBzbGljZSA9IFtdLnNsaWNlO1xuXG5fID0gcmVxdWlyZSgnLi91dGlsaXRpZXMnKTtcblxuVHlwZXMgPSByZXF1aXJlKCcuL1R5cGVzJyk7XG5cbkNoYW5nZU1hbmFnZXIgPSByZXF1aXJlKCcuL0NoYW5nZU1hbmFnZXInKTtcblxuSW5zdGFuY2VGYWN0b3J5ID0gKGZ1bmN0aW9uKCkge1xuICBmdW5jdGlvbiBJbnN0YW5jZUZhY3RvcnkoKSB7XG4gICAgdGhpcy5jcmVhdGUgPSBiaW5kKHRoaXMuY3JlYXRlLCB0aGlzKTtcbiAgICB0aGlzLnV1aWQgPSBiaW5kKHRoaXMudXVpZCwgdGhpcyk7XG4gIH1cblxuICBJbnN0YW5jZUZhY3RvcnkucHJvdG90eXBlLkFSUkFZX01VVEFUT1JTID0gWydjb3B5V2l0aGluJywgJ2ZpbGwnLCAncHVzaCcsICdwb3AnLCAncmV2ZXJzZScsICdzaGlmdCcsICdzb3J0JywgJ3NwbGljZScsICd1bnNoaWZ0J107XG5cbiAgSW5zdGFuY2VGYWN0b3J5LnByb3RvdHlwZS51dWlkID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5vdztcbiAgICBub3cgPSBEYXRlLm5vdygpO1xuICAgIHJldHVybiAneHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4Jy5yZXBsYWNlKC9beHldL2csIGZ1bmN0aW9uKGMpIHtcbiAgICAgIHZhciByO1xuICAgICAgciA9IChub3cgKyBNYXRoLnJhbmRvbSgpICogMTYpICUgMTYgfCAwO1xuICAgICAgbm93ID0gTWF0aC5mbG9vcihub3cgLyAxNik7XG4gICAgICByZXR1cm4gKGMgPT09IFwieFwiID8gciA6IHIgJiAweDMgfCAweDgpLnRvU3RyaW5nKDE2KTtcbiAgICB9KTtcbiAgfTtcblxuICBJbnN0YW5jZUZhY3RvcnkucHJvdG90eXBlLmNyZWF0ZSA9IGZ1bmN0aW9uKGluc3RhbmNlLCBub3JtYWxpemVkU2NoZW1hLCBpbml0aWFsU3RhdGUsIG9wdHMpIHtcbiAgICB2YXIgX2luaXRpYWxpemluZywgYWRkV2F0Y2hlciwgZGF0YSwgZmlyZVdhdGNoZXJzLCBmbiwgZ2V0LCBpZCwgcHJvcENvbmZpZywgcHJvcE5hbWUsIHJlbW92ZVdhdGNoZXIsIHNlYWwsIHNldCwgc3RyaWN0LCB1bndhdGNoZXJzLCB2YWwsIHdhdGNoRm9yUHJvcGFnYXRpb24sIHdhdGNoZXJzO1xuICAgIF9pbml0aWFsaXppbmcgPSB0cnVlO1xuICAgIGRhdGEgPSB7fTtcbiAgICB3YXRjaGVycyA9IHtcbiAgICAgIGludGVybmFsOiBbXSxcbiAgICAgIGV4dGVybmFsOiBbXVxuICAgIH07XG4gICAgdW53YXRjaGVycyA9IHt9O1xuICAgIGlkID0gdGhpcy51dWlkKCk7XG4gICAgc3RyaWN0ID0gb3B0cy5zdHJpY3QsIHNlYWwgPSBvcHRzLnNlYWw7XG4gICAgc2V0ID0gKGZ1bmN0aW9uKF90aGlzKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24ocHJvcE5hbWUsIHZhbCkge1xuICAgICAgICB2YXIgcHJldlZhbCwgcmVmLCBzZXR0ZXIsIHR5cGU7XG4gICAgICAgIHByZXZWYWwgPSBkYXRhW3Byb3BOYW1lXTtcbiAgICAgICAgaWYgKCFub3JtYWxpemVkU2NoZW1hW3Byb3BOYW1lXSkge1xuICAgICAgICAgIHJldHVybiBpbnN0YW5jZVtwcm9wTmFtZV0gPSB2YWw7XG4gICAgICAgIH1cbiAgICAgICAgcmVmID0gbm9ybWFsaXplZFNjaGVtYVtwcm9wTmFtZV0sIHR5cGUgPSByZWYudHlwZSwgc2V0dGVyID0gcmVmLnNldHRlcjtcbiAgICAgICAgaWYgKHZhbCAhPSBudWxsKSB7XG4gICAgICAgICAgaWYgKHNldHRlcikge1xuICAgICAgICAgICAgdmFsID0gc2V0dGVyLmNhbGwoaW5zdGFuY2UsIHZhbCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghdHlwZS5pZGVudGlmaWVyKHZhbCkpIHtcbiAgICAgICAgICAgIGlmIChzdHJpY3QpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXJyb3IgYXNzaWduaW5nIFwiICsgdmFsICsgXCIgdG8gXCIgKyBwcm9wTmFtZSArIFwiLiBWYWx1ZSBpcyBub3Qgb2YgdHlwZSBcIiArIHR5cGUuc3RyaW5nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhbCA9IHR5cGUucGFyc2VyKHZhbCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlLnN0cmluZyA9PT0gVHlwZXMuTkVTVEVEX1RZUEVTLkFycmF5LnN0cmluZykge1xuICAgICAgICAgICAgdmFsID0gdHlwZS5jaGlsZFBhcnNlcih2YWwpO1xuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHZhbCwgJ19hcnJheUlkJywge1xuICAgICAgICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICAgICAgICAgIHZhbHVlOiBfdGhpcy51dWlkKClcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgKF90aGlzLkFSUkFZX01VVEFUT1JTIHx8IFtdKS5mb3JFYWNoKGZ1bmN0aW9uKG1ldGhvZCkge1xuICAgICAgICAgICAgICBpZiAoKHByZXZWYWwgIT0gbnVsbCkgJiYgcHJldlZhbFttZXRob2RdKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHByZXZWYWxbbWV0aG9kXTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoQXJyYXkucHJvdG90eXBlW21ldGhvZF0gIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBPYmplY3QuZGVmaW5lUHJvcGVydHkodmFsLCBtZXRob2QsIHtcbiAgICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgdmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY2xvbmUsIHJlZjEsIHRvUmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICBjbG9uZSA9IF8uY2xvbmUodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIHRvUmV0dXJuID0gKHJlZjEgPSBBcnJheS5wcm90b3R5cGVbbWV0aG9kXSkuY2FsbC5hcHBseShyZWYxLCBbdGhpc10uY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICAgICAgICAgICAgICAgICAgICBDaGFuZ2VNYW5hZ2VyLnF1ZXVlQ2hhbmdlcyh7XG4gICAgICAgICAgICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgICAgICAgICAgIHByb3BOYW1lOiBwcm9wTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICBvbGRWYWw6IGNsb25lLFxuICAgICAgICAgICAgICAgICAgICAgIG5ld1ZhbDogdmFsLFxuICAgICAgICAgICAgICAgICAgICAgIGVxdWFsczogdHlwZS5lcXVhbHNcbiAgICAgICAgICAgICAgICAgICAgfSwgZmlyZVdhdGNoZXJzKTtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2VbcHJvcE5hbWVdID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRvUmV0dXJuO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZGF0YVtwcm9wTmFtZV0gPSB2YWw7XG4gICAgICAgIHdhdGNoRm9yUHJvcGFnYXRpb24ocHJvcE5hbWUsIHZhbCk7XG4gICAgICAgIGlmICghX2luaXRpYWxpemluZykge1xuICAgICAgICAgIHJldHVybiBDaGFuZ2VNYW5hZ2VyLnF1ZXVlQ2hhbmdlcyh7XG4gICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICBwcm9wTmFtZTogcHJvcE5hbWUsXG4gICAgICAgICAgICBvbGRWYWw6IHByZXZWYWwsXG4gICAgICAgICAgICBuZXdWYWw6IHZhbCxcbiAgICAgICAgICAgIGVxdWFsczogdHlwZS5lcXVhbHNcbiAgICAgICAgICB9LCBmaXJlV2F0Y2hlcnMpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0pKHRoaXMpO1xuICAgIGdldCA9IGZ1bmN0aW9uKHByb3BOYW1lKSB7XG4gICAgICB2YXIgZ2V0dGVyLCB2YWw7XG4gICAgICBnZXR0ZXIgPSBub3JtYWxpemVkU2NoZW1hW3Byb3BOYW1lXS5nZXR0ZXI7XG4gICAgICB2YWwgPSBkYXRhW3Byb3BOYW1lXTtcbiAgICAgIGlmIChnZXR0ZXIpIHtcbiAgICAgICAgdmFsID0gZ2V0dGVyLmNhbGwoaW5zdGFuY2UsIHZhbCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdmFsO1xuICAgIH07XG4gICAgYWRkV2F0Y2hlciA9IGZ1bmN0aW9uKHByb3BlcnRpZXMsIGNiLCBvcHRzKSB7XG4gICAgICB2YXIgaiwgbGVuLCBwcm9wTmFtZSwgdGFyZ2V0LCB3YXRjaGVyO1xuICAgICAgaWYgKF8uaXNGdW5jdGlvbihwcm9wZXJ0aWVzKSkge1xuICAgICAgICBvcHRzID0gY2I7XG4gICAgICAgIGNiID0gcHJvcGVydGllcztcbiAgICAgICAgcHJvcGVydGllcyA9IE9iamVjdC5rZXlzKG5vcm1hbGl6ZWRTY2hlbWEpO1xuICAgICAgfVxuICAgICAgaWYgKG9wdHMgPT0gbnVsbCkge1xuICAgICAgICBvcHRzID0ge307XG4gICAgICB9XG4gICAgICBpZiAob3B0cy5pbnRlcm5hbCA9PSBudWxsKSB7XG4gICAgICAgIG9wdHMuaW50ZXJuYWwgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHRhcmdldCA9IG9wdHMuaW50ZXJuYWwgPyAnaW50ZXJuYWwnIDogJ2V4dGVybmFsJztcbiAgICAgIGlmICghXy5pc0Z1bmN0aW9uKGNiKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Egd2F0Y2ggbXVzdCBiZSBwcm92aWRlZCB3aXRoIGEgY2FsbGJhY2sgZnVuY3Rpb24uJyk7XG4gICAgICB9XG4gICAgICBpZiAocHJvcGVydGllcyAmJiAhXy5pc0FycmF5KHByb3BlcnRpZXMpKSB7XG4gICAgICAgIHByb3BlcnRpZXMgPSBbcHJvcGVydGllc107XG4gICAgICB9XG4gICAgICBmb3IgKGogPSAwLCBsZW4gPSBwcm9wZXJ0aWVzLmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XG4gICAgICAgIHByb3BOYW1lID0gcHJvcGVydGllc1tqXTtcbiAgICAgICAgaWYgKCFfLmhhcyhub3JtYWxpemVkU2NoZW1hLCBwcm9wTmFtZSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3Qgc2V0IHdhdGNoIG9uIFwiICsgcHJvcE5hbWUgKyBcIiwgcHJvcGVydHkgaXMgbm90IGRlZmluZWQgaW4gc2NoZW1hLlwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgd2F0Y2hlciA9IHtcbiAgICAgICAgcHJvcGVydGllczogcHJvcGVydGllcyxcbiAgICAgICAgY2I6IGNiLFxuICAgICAgICBmaXJzdDogIW9wdHMuaW50ZXJuYWxcbiAgICAgIH07XG4gICAgICB3YXRjaGVyc1t0YXJnZXRdLnB1c2god2F0Y2hlcik7XG4gICAgICBDaGFuZ2VNYW5hZ2VyLnF1ZXVlQ2hhbmdlcyh7XG4gICAgICAgIGlkOiBpZFxuICAgICAgfSwgZmlyZVdhdGNoZXJzKTtcbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHJlbW92ZVdhdGNoZXIod2F0Y2hlciwgdGFyZ2V0KTtcbiAgICAgIH07XG4gICAgfTtcbiAgICByZW1vdmVXYXRjaGVyID0gZnVuY3Rpb24od2F0Y2hlciwgdGFyZ2V0KSB7XG4gICAgICByZXR1cm4gXy5yZW1vdmUod2F0Y2hlcnNbdGFyZ2V0XSwgd2F0Y2hlcik7XG4gICAgfTtcbiAgICB3YXRjaEZvclByb3BhZ2F0aW9uID0gZnVuY3Rpb24ocHJvcE5hbWUsIHZhbCkge1xuICAgICAgdmFyIGosIGxlbiwgcmVmLCB0eXBlLCB1bndhdGNoZXI7XG4gICAgICB0eXBlID0gbm9ybWFsaXplZFNjaGVtYVtwcm9wTmFtZV0udHlwZTtcbiAgICAgIGlmICh0eXBlLnN0cmluZyA9PT0gVHlwZXMuTkVTVEVEX1RZUEVTLlNjaGVtYS5zdHJpbmcpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB1bndhdGNoZXJzW3Byb3BOYW1lXSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgdW53YXRjaGVyc1twcm9wTmFtZV0oKTtcbiAgICAgICAgfVxuICAgICAgICB1bndhdGNoZXJzW3Byb3BOYW1lXSA9IHZhbCAhPSBudWxsID8gdmFsLndhdGNoKGZ1bmN0aW9uKG5ld1ZhbCwgb2xkVmFsKSB7XG4gICAgICAgICAgcmV0dXJuIENoYW5nZU1hbmFnZXIucXVldWVDaGFuZ2VzKHtcbiAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgIHByb3BOYW1lOiBwcm9wTmFtZSxcbiAgICAgICAgICAgIG9sZFZhbDogb2xkVmFsLFxuICAgICAgICAgICAgbmV3VmFsOiBuZXdWYWwsXG4gICAgICAgICAgICBlcXVhbHM6IHR5cGUuZXF1YWxzXG4gICAgICAgICAgfSwgZmlyZVdhdGNoZXJzKTtcbiAgICAgICAgfSwge1xuICAgICAgICAgIGludGVybmFsOiB0cnVlXG4gICAgICAgIH0pIDogdm9pZCAwO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGUuc3RyaW5nID09PSBUeXBlcy5ORVNURURfVFlQRVMuQXJyYXkuc3RyaW5nICYmIHR5cGUuY2hpbGRUeXBlLnN0cmluZyA9PT0gVHlwZXMuTkVTVEVEX1RZUEVTLlNjaGVtYS5zdHJpbmcpIHtcbiAgICAgICAgcmVmID0gdW53YXRjaGVyc1twcm9wTmFtZV0gfHwgW107XG4gICAgICAgIGZvciAoaiA9IDAsIGxlbiA9IHJlZi5sZW5ndGg7IGogPCBsZW47IGorKykge1xuICAgICAgICAgIHVud2F0Y2hlciA9IHJlZltqXTtcbiAgICAgICAgICBpZiAodHlwZW9mIHVud2F0Y2hlciA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICB1bndhdGNoZXIoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdW53YXRjaGVyc1twcm9wTmFtZV0gPSBbXTtcbiAgICAgICAgcmV0dXJuICh2YWwgfHwgW10pLmZvckVhY2goZnVuY3Rpb24oc2NoZW1hLCBpKSB7XG4gICAgICAgICAgcmV0dXJuIHVud2F0Y2hlcnNbcHJvcE5hbWVdLnB1c2goc2NoZW1hICE9IG51bGwgPyBzY2hlbWEud2F0Y2goZnVuY3Rpb24obmV3VmFsLCBvbGRWYWwpIHtcbiAgICAgICAgICAgIHZhciBuZXdBcnJheSwgb2xkQXJyYXk7XG4gICAgICAgICAgICBuZXdBcnJheSA9IGluc3RhbmNlW3Byb3BOYW1lXTtcbiAgICAgICAgICAgIG9sZEFycmF5ID0gQ2hhbmdlTWFuYWdlci5nZXRRdWV1ZWRDaGFuZ2VzKHtcbiAgICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgICBwcm9wTmFtZTogcHJvcE5hbWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKG9sZEFycmF5ID09IG51bGwpIHtcbiAgICAgICAgICAgICAgaWYgKG9sZEFycmF5ID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBvbGRBcnJheSA9IF8uY2xvbmUobmV3QXJyYXkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvbGRBcnJheSwgJ19hcnJheUlkJywge1xuICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogbmV3QXJyYXkuX2FycmF5SWRcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob2xkQXJyYXkuX2FycmF5SWQgPT09IG5ld0FycmF5Ll9hcnJheUlkKSB7XG4gICAgICAgICAgICAgIG9sZEFycmF5W2ldID0gb2xkVmFsO1xuICAgICAgICAgICAgICByZXR1cm4gQ2hhbmdlTWFuYWdlci5xdWV1ZUNoYW5nZXMoe1xuICAgICAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgICAgICBwcm9wTmFtZTogcHJvcE5hbWUsXG4gICAgICAgICAgICAgICAgb2xkVmFsOiBvbGRBcnJheSxcbiAgICAgICAgICAgICAgICBuZXdWYWw6IG5ld0FycmF5LFxuICAgICAgICAgICAgICAgIGVxdWFsczogdHlwZS5lcXVhbHMsXG4gICAgICAgICAgICAgICAgZm9yY2U6IHRydWVcbiAgICAgICAgICAgICAgfSwgZmlyZVdhdGNoZXJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LCB7XG4gICAgICAgICAgICBpbnRlcm5hbDogdHJ1ZVxuICAgICAgICAgIH0pIDogdm9pZCAwKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgICBmaXJlV2F0Y2hlcnMgPSBmdW5jdGlvbihxdWV1ZWRDaGFuZ2VzLCB0YXJnZXQpIHtcbiAgICAgIHZhciBlLCBnZXRQcmV2VmFsLCBpLCBqLCBsZW4sIG5ld1ZhbHMsIG9sZFZhbHMsIHByb3BOYW1lLCByZWYsIHJlc3VsdHMsIHNob3VsZEZpcmUsIHRyaWdnZXJpbmdQcm9wZXJ0aWVzLCB3YXRjaGVyO1xuICAgICAgaWYgKHRhcmdldCA9PSBudWxsKSB7XG4gICAgICAgIHRhcmdldCA9ICdleHRlcm5hbCc7XG4gICAgICB9XG4gICAgICB0cmlnZ2VyaW5nUHJvcGVydGllcyA9IE9iamVjdC5rZXlzKHF1ZXVlZENoYW5nZXMpO1xuICAgICAgZ2V0UHJldlZhbCA9IGZ1bmN0aW9uKHByb3BOYW1lKSB7XG4gICAgICAgIGlmIChfLmhhcyhxdWV1ZWRDaGFuZ2VzLCBwcm9wTmFtZSkpIHtcbiAgICAgICAgICByZXR1cm4gcXVldWVkQ2hhbmdlc1twcm9wTmFtZV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIGluc3RhbmNlW3Byb3BOYW1lXTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGkgPSAwO1xuICAgICAgcmVzdWx0cyA9IFtdO1xuICAgICAgd2hpbGUgKCh3YXRjaGVyID0gd2F0Y2hlcnNbdGFyZ2V0XVtpXSkpIHtcbiAgICAgICAgaSsrO1xuICAgICAgICBzaG91bGRGaXJlID0gd2F0Y2hlci5maXJzdCB8fCAoXy5pbnRlcnNlY3Rpb24odHJpZ2dlcmluZ1Byb3BlcnRpZXMsIHdhdGNoZXIucHJvcGVydGllcykubGVuZ3RoID4gMCk7XG4gICAgICAgIHdhdGNoZXIuZmlyc3QgPSBmYWxzZTtcbiAgICAgICAgaWYgKHNob3VsZEZpcmUpIHtcbiAgICAgICAgICBuZXdWYWxzID0ge307XG4gICAgICAgICAgb2xkVmFscyA9IHt9O1xuICAgICAgICAgIHJlZiA9IHdhdGNoZXIucHJvcGVydGllcztcbiAgICAgICAgICBmb3IgKGogPSAwLCBsZW4gPSByZWYubGVuZ3RoOyBqIDwgbGVuOyBqKyspIHtcbiAgICAgICAgICAgIHByb3BOYW1lID0gcmVmW2pdO1xuICAgICAgICAgICAgbmV3VmFsc1twcm9wTmFtZV0gPSBpbnN0YW5jZVtwcm9wTmFtZV07XG4gICAgICAgICAgICBvbGRWYWxzW3Byb3BOYW1lXSA9IGdldFByZXZWYWwocHJvcE5hbWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAod2F0Y2hlci5wcm9wZXJ0aWVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgcHJvcE5hbWUgPSB3YXRjaGVyLnByb3BlcnRpZXNbMF07XG4gICAgICAgICAgICBuZXdWYWxzID0gbmV3VmFsc1twcm9wTmFtZV07XG4gICAgICAgICAgICBvbGRWYWxzID0gb2xkVmFsc1twcm9wTmFtZV07XG4gICAgICAgICAgfVxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXN1bHRzLnB1c2god2F0Y2hlci5jYihuZXdWYWxzLCBvbGRWYWxzKSk7XG4gICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGUgPSBlcnJvcjtcbiAgICAgICAgICAgIHJlc3VsdHMucHVzaChjb25zb2xlLmVycm9yKGUuc3RhY2sgfHwgZSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHRzLnB1c2godm9pZCAwKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgfTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoaW5zdGFuY2UsICd3YXRjaCcsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBmdW5jdGlvbihwcm9wZXJ0aWVzLCBjYiwgb3B0cykge1xuICAgICAgICByZXR1cm4gYWRkV2F0Y2hlcihwcm9wZXJ0aWVzLCBjYiwgb3B0cyk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGluc3RhbmNlLCAnX3ZhbGlkYXRpbmcnLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgIHZhbHVlOiBmYWxzZVxuICAgIH0pO1xuICAgIGZuID0gKGZ1bmN0aW9uKF90aGlzKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24ocHJvcE5hbWUsIHByb3BDb25maWcpIHtcbiAgICAgICAgdmFyIHZhbDtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGluc3RhbmNlLCBwcm9wTmFtZSwge1xuICAgICAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICAgICAgcmV0dXJuIHNldChwcm9wTmFtZSwgdmFsKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0KHByb3BOYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAocHJvcENvbmZpZ1tcImRlZmF1bHRcIl0gIT09IHZvaWQgMCkge1xuICAgICAgICAgIHZhbCA9IF8uaXNGdW5jdGlvbihwcm9wQ29uZmlnW1wiZGVmYXVsdFwiXSkgPyBwcm9wQ29uZmlnW1wiZGVmYXVsdFwiXSgpIDogcHJvcENvbmZpZ1tcImRlZmF1bHRcIl07XG4gICAgICAgICAgcmV0dXJuIGluc3RhbmNlW3Byb3BOYW1lXSA9IHZhbDtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9KSh0aGlzKTtcbiAgICBmb3IgKHByb3BOYW1lIGluIG5vcm1hbGl6ZWRTY2hlbWEpIHtcbiAgICAgIHByb3BDb25maWcgPSBub3JtYWxpemVkU2NoZW1hW3Byb3BOYW1lXTtcbiAgICAgIGZuKHByb3BOYW1lLCBwcm9wQ29uZmlnKTtcbiAgICB9XG4gICAgaWYgKHNlYWwpIHtcbiAgICAgIE9iamVjdC5zZWFsKGluc3RhbmNlKTtcbiAgICB9XG4gICAgZm9yIChwcm9wTmFtZSBpbiBpbml0aWFsU3RhdGUpIHtcbiAgICAgIHZhbCA9IGluaXRpYWxTdGF0ZVtwcm9wTmFtZV07XG4gICAgICBpbnN0YW5jZVtwcm9wTmFtZV0gPSB2YWw7XG4gICAgfVxuICAgIHJldHVybiBfaW5pdGlhbGl6aW5nID0gZmFsc2U7XG4gIH07XG5cbiAgcmV0dXJuIEluc3RhbmNlRmFjdG9yeTtcblxufSkoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgSW5zdGFuY2VGYWN0b3J5KCk7XG5cbiIsInZhciBJbnN0YW5jZUZhY3RvcnksIE1vZGVsRmFjdG9yeSwgUmVnaXN0cnksIFR5cGVzLCBfLFxuICBiaW5kID0gZnVuY3Rpb24oZm4sIG1lKXsgcmV0dXJuIGZ1bmN0aW9uKCl7IHJldHVybiBmbi5hcHBseShtZSwgYXJndW1lbnRzKTsgfTsgfSxcbiAgc2xpY2UgPSBbXS5zbGljZTtcblxuXyA9IHJlcXVpcmUoJy4vdXRpbGl0aWVzJyk7XG5cblR5cGVzID0gcmVxdWlyZSgnLi9UeXBlcycpO1xuXG5JbnN0YW5jZUZhY3RvcnkgPSByZXF1aXJlKCcuL0luc3RhbmNlRmFjdG9yeScpO1xuXG5SZWdpc3RyeSA9IHJlcXVpcmUoJy4vUmVnaXN0cnknKTtcblxuTW9kZWxGYWN0b3J5ID0gKGZ1bmN0aW9uKCkge1xuICBNb2RlbEZhY3RvcnkucHJvdG90eXBlLkRFRkFVTFRfT1BUSU9OUyA9IHtcbiAgICBzZWFsOiBmYWxzZSxcbiAgICBzdHJpY3Q6IGZhbHNlXG4gIH07XG5cbiAgZnVuY3Rpb24gTW9kZWxGYWN0b3J5KCkge1xuICAgIHRoaXMuY3JlYXRlID0gYmluZCh0aGlzLmNyZWF0ZSwgdGhpcyk7XG4gICAgdGhpcy5uYW1lRnVuY3Rpb24gPSBiaW5kKHRoaXMubmFtZUZ1bmN0aW9uLCB0aGlzKTtcbiAgICB0aGlzLm5vcm1hbGl6ZVByb3BlcnR5Q29uZmlnID0gYmluZCh0aGlzLm5vcm1hbGl6ZVByb3BlcnR5Q29uZmlnLCB0aGlzKTtcbiAgICB0aGlzLmdlbmVyYXRlTmFtZSA9IGJpbmQodGhpcy5nZW5lcmF0ZU5hbWUsIHRoaXMpO1xuICAgIHRoaXMubmFtZUNvdW50ZXIgPSAwO1xuICB9XG5cbiAgTW9kZWxGYWN0b3J5LnByb3RvdHlwZS5nZW5lcmF0ZU5hbWUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gXCJTY2hlbWluZ01vZGVsXCIgKyAodGhpcy5uYW1lQ291bnRlcisrKTtcbiAgfTtcblxuXG4gIC8qXG4gICAgTm9ybWFsaXplcyBhIGZpZWxkIGRlY2xhcmF0aW9uIG9uIGEgc2NoZW1hIHRvIGNhcHR1cmUgdHlwZSwgZGVmYXVsdCB2YWx1ZSwgc2V0dGVyLCBnZXR0ZXIsIGFuZCB2YWxpZGF0aW9uLlxuICAgIFVzZWQgaW50ZXJuYWxseSB3aGVuIGEgc2NoZW1hIGlzIGNyZWF0ZWQgdG8gYnVpbGQgYSBub3JtYWxpemVkIHNjaGVtYSBkZWZpbml0aW9uLlxuICAgKi9cblxuICBNb2RlbEZhY3RvcnkucHJvdG90eXBlLm5vcm1hbGl6ZVByb3BlcnR5Q29uZmlnID0gZnVuY3Rpb24ocHJvcENvbmZpZywgcHJvcE5hbWUpIHtcbiAgICB2YXIgZGVmaW5pdGlvbiwgZm4sIGdldHRlciwgaiwgbGVuLCByZXF1aXJlZCwgc2V0dGVyLCB0eXBlLCB2YWxpZGF0ZTtcbiAgICBpZiAocHJvcE5hbWUgPT0gbnVsbCkge1xuICAgICAgcHJvcE5hbWUgPSAnZmllbGQnO1xuICAgIH1cbiAgICBkZWZpbml0aW9uID0ge1xuICAgICAgdHlwZTogbnVsbCxcbiAgICAgIFwiZGVmYXVsdFwiOiBudWxsLFxuICAgICAgZ2V0dGVyOiBudWxsLFxuICAgICAgc2V0dGVyOiBudWxsLFxuICAgICAgdmFsaWRhdGU6IG51bGwsXG4gICAgICByZXF1aXJlZDogZmFsc2VcbiAgICB9O1xuICAgIGlmICghKF8uaXNQbGFpbk9iamVjdChwcm9wQ29uZmlnKSAmJiAocHJvcENvbmZpZy50eXBlICE9IG51bGwpKSkge1xuICAgICAgcHJvcENvbmZpZyA9IHtcbiAgICAgICAgdHlwZTogcHJvcENvbmZpZ1xuICAgICAgfTtcbiAgICB9XG4gICAgdHlwZSA9IHByb3BDb25maWcudHlwZSwgZ2V0dGVyID0gcHJvcENvbmZpZy5nZXR0ZXIsIHNldHRlciA9IHByb3BDb25maWcuc2V0dGVyLCB2YWxpZGF0ZSA9IHByb3BDb25maWcudmFsaWRhdGUsIHJlcXVpcmVkID0gcHJvcENvbmZpZy5yZXF1aXJlZDtcbiAgICBpZiAodHlwZSA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFcnJvciByZXNvbHZpbmcgXCIgKyBwcm9wTmFtZSArIFwiLiBTY2hlbWEgdHlwZSBtdXN0IGJlIGRlZmluZWQuXCIpO1xuICAgIH1cbiAgICBpZiAoKGdldHRlciAhPSBudWxsKSAmJiAhXy5pc0Z1bmN0aW9uKGdldHRlcikpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkVycm9yIHJlc29sdmluZyBcIiArIHByb3BOYW1lICsgXCIuIFNjaGVtYSBnZXR0ZXIgbXVzdCBiZSBhIGZ1bmN0aW9uLlwiKTtcbiAgICB9XG4gICAgaWYgKChzZXR0ZXIgIT0gbnVsbCkgJiYgIV8uaXNGdW5jdGlvbihzZXR0ZXIpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFcnJvciByZXNvbHZpbmcgXCIgKyBwcm9wTmFtZSArIFwiLiBTY2hlbWEgc2V0dGVyIG11c3QgYmUgYSBmdW5jdGlvbi5cIik7XG4gICAgfVxuICAgIGlmICh2YWxpZGF0ZSA9PSBudWxsKSB7XG4gICAgICB2YWxpZGF0ZSA9IFtdO1xuICAgIH1cbiAgICBpZiAoIV8uaXNBcnJheSh2YWxpZGF0ZSkpIHtcbiAgICAgIHZhbGlkYXRlID0gW3ZhbGlkYXRlXTtcbiAgICB9XG4gICAgZm9yIChqID0gMCwgbGVuID0gdmFsaWRhdGUubGVuZ3RoOyBqIDwgbGVuOyBqKyspIHtcbiAgICAgIGZuID0gdmFsaWRhdGVbal07XG4gICAgICBpZiAoIV8uaXNGdW5jdGlvbihmbikpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXJyb3IgcmVzb2x2aW5nIFwiICsgcHJvcE5hbWUgKyBcIi4gU2NoZW1hIHZhbGlkYXRlIG11c3QgYmUgYSBmdW5jdGlvbiBvciBhcnJheSBvZiBmdW5jdGlvbnMuXCIpO1xuICAgICAgfVxuICAgIH1cbiAgICBkZWZpbml0aW9uLnR5cGUgPSBUeXBlcy5yZXNvbHZlVHlwZSh0eXBlKTtcbiAgICBpZiAoZGVmaW5pdGlvbi50eXBlID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkVycm9yIHJlc29sdmluZyBcIiArIHByb3BOYW1lICsgXCIuIFVucmVjb2duaXplZCB0eXBlIFwiICsgdHlwZSk7XG4gICAgfVxuICAgIGRlZmluaXRpb25bXCJkZWZhdWx0XCJdID0gcHJvcENvbmZpZ1tcImRlZmF1bHRcIl07XG4gICAgZGVmaW5pdGlvbi5nZXR0ZXIgPSBnZXR0ZXI7XG4gICAgZGVmaW5pdGlvbi5zZXR0ZXIgPSBzZXR0ZXI7XG4gICAgZGVmaW5pdGlvbi52YWxpZGF0ZSA9IHZhbGlkYXRlO1xuICAgIGRlZmluaXRpb24ucmVxdWlyZWQgPSByZXF1aXJlZDtcbiAgICBkZWZpbml0aW9uID0gXy5leHRlbmQoe30sIHByb3BDb25maWcsIGRlZmluaXRpb24pO1xuICAgIHJldHVybiBkZWZpbml0aW9uO1xuICB9O1xuXG4gIE1vZGVsRmFjdG9yeS5wcm90b3R5cGUubmFtZUZ1bmN0aW9uID0gZnVuY3Rpb24obmFtZSwgZm4pIHtcbiAgICB2YXIgZXJyLCBmblN0ciwgcmVuYW1lZDtcbiAgICBmblN0ciA9IFwicmV0dXJuIGZ1bmN0aW9uIFwiICsgbmFtZSArIFwiKCl7cmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyl9XCI7XG4gICAgdHJ5IHtcbiAgICAgIHJlbmFtZWQgPSBuZXcgRnVuY3Rpb24oJ2ZuJywgZm5TdHIpKGZuKTtcbiAgICB9IGNhdGNoIChlcnJvcjEpIHtcbiAgICAgIGVyciA9IGVycm9yMTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihuYW1lICsgXCIgaXMgbm90IGEgdmFsaWQgZnVuY3Rpb24gbmFtZS5cIik7XG4gICAgfVxuICAgIF8uZXh0ZW5kKHJlbmFtZWQsIGZuKTtcbiAgICBfLmV4dGVuZChyZW5hbWVkLnByb3RvdHlwZSwgZm4ucHJvdG90eXBlKTtcbiAgICByZXR1cm4gcmVuYW1lZDtcbiAgfTtcblxuICBNb2RlbEZhY3RvcnkucHJvdG90eXBlLmNyZWF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBNb2RlbCwgYXJncywgZmFjdG9yeSwgbmFtZSwgbm9ybWFsaXplZFNjaGVtYSwgb3B0cywgc2NoZW1hQ29uZmlnO1xuICAgIGFyZ3MgPSAxIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBzbGljZS5jYWxsKGFyZ3VtZW50cywgMCkgOiBbXTtcbiAgICBmYWN0b3J5ID0gdGhpcztcbiAgICBpZiAoIV8uaXNTdHJpbmcoYXJnc1swXSkpIHtcbiAgICAgIGFyZ3MudW5zaGlmdCh0aGlzLmdlbmVyYXRlTmFtZSgpKTtcbiAgICB9XG4gICAgbmFtZSA9IGFyZ3NbMF0sIHNjaGVtYUNvbmZpZyA9IGFyZ3NbMV0sIG9wdHMgPSBhcmdzWzJdO1xuICAgIG9wdHMgPSBfLmRlZmF1bHRzKG9wdHMgfHwge30sIHRoaXMuREVGQVVMVF9PUFRJT05TKTtcbiAgICBub3JtYWxpemVkU2NoZW1hID0ge307XG4gICAgTW9kZWwgPSAoZnVuY3Rpb24oKSB7XG4gICAgICBNb2RlbC5fX3NjaGVtYUlkID0gbmFtZTtcblxuICAgICAgTW9kZWwuZGVmaW5lUHJvcGVydHkgPSBmdW5jdGlvbihwcm9wTmFtZSwgcHJvcENvbmZpZykge1xuICAgICAgICBpZiAoIV8uaXNTdHJpbmcocHJvcE5hbWUpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmlyc3QgYXJndW1lbnQ6IHByb3BlcnR5IG5hbWUgbXVzdCBiZSBhIHN0cmluZy5cIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByb3BDb25maWcgPT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNlY29uZCBhcmd1bWVudDogcHJvcGVydHkgY29uZmlndXJhdGlvbiBpcyByZXF1aXJlZC5cIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5vcm1hbGl6ZWRTY2hlbWFbcHJvcE5hbWVdID0gZmFjdG9yeS5ub3JtYWxpemVQcm9wZXJ0eUNvbmZpZyhwcm9wQ29uZmlnLCBwcm9wTmFtZSk7XG4gICAgICB9O1xuXG4gICAgICBNb2RlbC5kZWZpbmVQcm9wZXJ0aWVzID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgICAgIHZhciBrLCByZXN1bHRzLCB2O1xuICAgICAgICBpZiAoIV8uaXNQbGFpbk9iamVjdChjb25maWcpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmlyc3QgYXJndW1lbnQ6IHByb3BlcnRpZXMgbXVzdCBiZSBhbiBvYmplY3QuXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgZm9yIChrIGluIGNvbmZpZykge1xuICAgICAgICAgIHYgPSBjb25maWdba107XG4gICAgICAgICAgcmVzdWx0cy5wdXNoKHRoaXMuZGVmaW5lUHJvcGVydHkoaywgdikpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgfTtcblxuICAgICAgTW9kZWwuZ2V0UHJvcGVydGllcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gXy5jbG9uZURlZXAobm9ybWFsaXplZFNjaGVtYSk7XG4gICAgICB9O1xuXG4gICAgICBNb2RlbC5nZXRQcm9wZXJ0eSA9IGZ1bmN0aW9uKHByb3BOYW1lKSB7XG4gICAgICAgIHJldHVybiBfLmNsb25lRGVlcChub3JtYWxpemVkU2NoZW1hW3Byb3BOYW1lXSk7XG4gICAgICB9O1xuXG4gICAgICBNb2RlbC5lYWNoUHJvcGVydHkgPSBmdW5jdGlvbihjYikge1xuICAgICAgICB2YXIgcHJvcENvbmZpZywgcHJvcE5hbWUsIHJlc3VsdHM7XG4gICAgICAgIGlmICghXy5pc0Z1bmN0aW9uKGNiKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZpcnN0IGFyZ3VtZW50OiBjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb24uXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgZm9yIChwcm9wTmFtZSBpbiBub3JtYWxpemVkU2NoZW1hKSB7XG4gICAgICAgICAgcHJvcENvbmZpZyA9IG5vcm1hbGl6ZWRTY2hlbWFbcHJvcE5hbWVdO1xuICAgICAgICAgIHJlc3VsdHMucHVzaChjYihwcm9wTmFtZSwgXy5jbG9uZURlZXAocHJvcENvbmZpZykpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgIH07XG5cbiAgICAgIE1vZGVsLnZhbGlkYXRlID0gZnVuY3Rpb24oaW5zdGFuY2UpIHtcbiAgICAgICAgdmFyIGNoaWxkRXJyb3JzLCBlLCBlcnIsIGVycm9ycywgaSwgaiwgaywga2V5LCBsLCBsZW4sIGxlbjEsIG1lbWJlciwgcHVzaEVycm9yLCByZXF1aXJlZCwgcmVxdWlyZWRNZXNzYWdlLCB0eXBlLCB2LCB2YWwsIHZhbGlkYXRlLCB2YWxpZGF0b3IsIHZhbHVlO1xuICAgICAgICBlcnJvcnMgPSB7fTtcbiAgICAgICAgaWYgKGluc3RhbmNlLl92YWxpZGF0aW5nKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgaW5zdGFuY2UuX3ZhbGlkYXRpbmcgPSB0cnVlO1xuICAgICAgICBwdXNoRXJyb3IgPSBmdW5jdGlvbihrZXksIGVycm9yKSB7XG4gICAgICAgICAgdmFyIGVyciwgaiwgbGVuO1xuICAgICAgICAgIGlmIChfLmlzQXJyYXkoZXJyb3IpKSB7XG4gICAgICAgICAgICBmb3IgKGogPSAwLCBsZW4gPSBlcnJvci5sZW5ndGg7IGogPCBsZW47IGorKykge1xuICAgICAgICAgICAgICBlcnIgPSBlcnJvcltqXTtcbiAgICAgICAgICAgICAgcmV0dXJuIHB1c2hFcnJvcihrZXksIGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghXy5pc1N0cmluZyhlcnJvcikpIHtcbiAgICAgICAgICAgIGVycm9yID0gJ1ZhbGlkYXRpb24gZXJyb3Igb2NjdXJyZWQuJztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGVycm9yc1trZXldID09IG51bGwpIHtcbiAgICAgICAgICAgIGVycm9yc1trZXldID0gW107XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBlcnJvcnNba2V5XS5wdXNoKGVycm9yKTtcbiAgICAgICAgfTtcbiAgICAgICAgZm9yIChrZXkgaW4gbm9ybWFsaXplZFNjaGVtYSkge1xuICAgICAgICAgIHZhbHVlID0gbm9ybWFsaXplZFNjaGVtYVtrZXldO1xuICAgICAgICAgIHZhbGlkYXRlID0gdmFsdWUudmFsaWRhdGUsIHJlcXVpcmVkID0gdmFsdWUucmVxdWlyZWQ7XG4gICAgICAgICAgdmFsID0gaW5zdGFuY2Vba2V5XTtcbiAgICAgICAgICBpZiAocmVxdWlyZWQgJiYgKHZhbCA9PSBudWxsKSkge1xuICAgICAgICAgICAgcmVxdWlyZWRNZXNzYWdlID0gXy5pc1N0cmluZyhyZXF1aXJlZCkgPyByZXF1aXJlZCA6IFwiRmllbGQgaXMgcmVxdWlyZWQuXCI7XG4gICAgICAgICAgICBwdXNoRXJyb3Ioa2V5LCByZXF1aXJlZE1lc3NhZ2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodmFsICE9IG51bGwpIHtcbiAgICAgICAgICAgIHR5cGUgPSBub3JtYWxpemVkU2NoZW1hW2tleV0udHlwZTtcbiAgICAgICAgICAgIGZvciAoaiA9IDAsIGxlbiA9IHZhbGlkYXRlLmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XG4gICAgICAgICAgICAgIHZhbGlkYXRvciA9IHZhbGlkYXRlW2pdO1xuICAgICAgICAgICAgICBlcnIgPSB0cnVlO1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGVyciA9IHZhbGlkYXRvci5jYWxsKGluc3RhbmNlLCB2YWwpO1xuICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcjEpIHtcbiAgICAgICAgICAgICAgICBlID0gZXJyb3IxO1xuICAgICAgICAgICAgICAgIGlmIChlKSB7XG4gICAgICAgICAgICAgICAgICBlcnIgPSBlLm1lc3NhZ2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChlcnIgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBwdXNoRXJyb3Ioa2V5LCBlcnIpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZS5zdHJpbmcgPT09ICdzY2hlbWEnKSB7XG4gICAgICAgICAgICAgIGNoaWxkRXJyb3JzID0gdHlwZS5jaGlsZFR5cGUudmFsaWRhdGUuY2FsbChpbnN0YW5jZSwgdmFsKTtcbiAgICAgICAgICAgICAgZm9yIChrIGluIGNoaWxkRXJyb3JzKSB7XG4gICAgICAgICAgICAgICAgdiA9IGNoaWxkRXJyb3JzW2tdO1xuICAgICAgICAgICAgICAgIHB1c2hFcnJvcihrZXkgKyBcIi5cIiArIGssIHYpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZS5zdHJpbmcgPT09ICdhcnJheScgJiYgdHlwZS5jaGlsZFR5cGUuc3RyaW5nID09PSAnc2NoZW1hJykge1xuICAgICAgICAgICAgICBmb3IgKGkgPSBsID0gMCwgbGVuMSA9IHZhbC5sZW5ndGg7IGwgPCBsZW4xOyBpID0gKytsKSB7XG4gICAgICAgICAgICAgICAgbWVtYmVyID0gdmFsW2ldO1xuICAgICAgICAgICAgICAgIGNoaWxkRXJyb3JzID0gdHlwZS5jaGlsZFR5cGUuY2hpbGRUeXBlLnZhbGlkYXRlLmNhbGwoaW5zdGFuY2UsIG1lbWJlcik7XG4gICAgICAgICAgICAgICAgZm9yIChrIGluIGNoaWxkRXJyb3JzKSB7XG4gICAgICAgICAgICAgICAgICB2ID0gY2hpbGRFcnJvcnNba107XG4gICAgICAgICAgICAgICAgICBwdXNoRXJyb3Ioa2V5ICsgXCJbXCIgKyBpICsgXCJdLlwiICsgaywgdik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGluc3RhbmNlLl92YWxpZGF0aW5nID0gZmFsc2U7XG4gICAgICAgIGlmIChfLnNpemUoZXJyb3JzKSA9PT0gMCkge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBlcnJvcnM7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGZ1bmN0aW9uIE1vZGVsKGluaXRpYWxTdGF0ZSkge1xuICAgICAgICBJbnN0YW5jZUZhY3RvcnkuY3JlYXRlKHRoaXMsIG5vcm1hbGl6ZWRTY2hlbWEsIGluaXRpYWxTdGF0ZSwgb3B0cyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBNb2RlbDtcblxuICAgIH0pKCk7XG4gICAgTW9kZWwgPSB0aGlzLm5hbWVGdW5jdGlvbihuYW1lLCBNb2RlbCk7XG4gICAgaWYgKHNjaGVtYUNvbmZpZyAhPSBudWxsKSB7XG4gICAgICBNb2RlbC5kZWZpbmVQcm9wZXJ0aWVzKHNjaGVtYUNvbmZpZyk7XG4gICAgfVxuICAgIFJlZ2lzdHJ5LnJlZ2lzdGVyKG5hbWUsIE1vZGVsKTtcbiAgICByZXR1cm4gTW9kZWw7XG4gIH07XG5cbiAgcmV0dXJuIE1vZGVsRmFjdG9yeTtcblxufSkoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgTW9kZWxGYWN0b3J5KCk7XG5cbiIsInZhciBSZWdpc3RyeSxcbiAgYmluZCA9IGZ1bmN0aW9uKGZuLCBtZSl7IHJldHVybiBmdW5jdGlvbigpeyByZXR1cm4gZm4uYXBwbHkobWUsIGFyZ3VtZW50cyk7IH07IH07XG5cblJlZ2lzdHJ5ID0gKGZ1bmN0aW9uKCkge1xuICBmdW5jdGlvbiBSZWdpc3RyeSgpIHtcbiAgICB0aGlzLnJlc2V0ID0gYmluZCh0aGlzLnJlc2V0LCB0aGlzKTtcbiAgICB0aGlzLmdldCA9IGJpbmQodGhpcy5nZXQsIHRoaXMpO1xuICAgIHRoaXMucmVnaXN0ZXIgPSBiaW5kKHRoaXMucmVnaXN0ZXIsIHRoaXMpO1xuICAgIHRoaXMuc2NoZW1hcyA9IHt9O1xuICB9XG5cbiAgUmVnaXN0cnkucHJvdG90eXBlLnJlZ2lzdGVyID0gZnVuY3Rpb24obmFtZSwgbW9kZWwpIHtcbiAgICBpZiAodGhpcy5zY2hlbWFzW25hbWVdKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJOYW1pbmcgY29uZmxpY3QgZW5jb3VudGVyZWQuIE1vZGVsIFwiICsgbmFtZSArIFwiIGFscmVhZHkgZXhpc3RzXCIpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5zY2hlbWFzW25hbWVdID0gbW9kZWw7XG4gIH07XG5cbiAgUmVnaXN0cnkucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5zY2hlbWFzW25hbWVdO1xuICB9O1xuXG4gIFJlZ2lzdHJ5LnByb3RvdHlwZS5yZXNldCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnNjaGVtYXMgPSB7fTtcbiAgfTtcblxuICByZXR1cm4gUmVnaXN0cnk7XG5cbn0pKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IFJlZ2lzdHJ5KCk7XG5cbiIsInZhciBDaGFuZ2VNYW5hZ2VyLCBERUZBVUxUX09QVElPTlMsIEluc3RhbmNlRmFjdG9yeSwgTW9kZWxGYWN0b3J5LCBORVNURURfVFlQRVMsIFJlZ2lzdHJ5LCBTY2hlbWluZywgVEhST1RUTEUsIFRZUEVTLCBUeXBlcywgY3JlYXRlLCBmbHVzaCwgZ2V0LCBub3JtYWxpemVQcm9wZXJ0eUNvbmZpZywgcmVnaXN0ZXJRdWV1ZUNhbGxiYWNrLCByZWdpc3RlclJlc29sdmVDYWxsYmFjaywgcmVzZXQsIHJlc29sdmVUeXBlLCBzZXRUaHJvdHRsZSwgdW5yZWdpc3RlclF1ZXVlQ2FsbGJhY2ssIHVucmVnaXN0ZXJSZXNvbHZlQ2FsbGJhY2ssIHV1aWQ7XG5cblR5cGVzID0gcmVxdWlyZSgnLi9UeXBlcycpO1xuXG5SZWdpc3RyeSA9IHJlcXVpcmUoJy4vUmVnaXN0cnknKTtcblxuQ2hhbmdlTWFuYWdlciA9IHJlcXVpcmUoJy4vQ2hhbmdlTWFuYWdlcicpO1xuXG5Nb2RlbEZhY3RvcnkgPSByZXF1aXJlKCcuL01vZGVsRmFjdG9yeScpO1xuXG5JbnN0YW5jZUZhY3RvcnkgPSByZXF1aXJlKCcuL0luc3RhbmNlRmFjdG9yeScpO1xuXG5UWVBFUyA9IFR5cGVzLlRZUEVTLCBORVNURURfVFlQRVMgPSBUeXBlcy5ORVNURURfVFlQRVMsIHJlc29sdmVUeXBlID0gVHlwZXMucmVzb2x2ZVR5cGU7XG5cblRIUk9UVExFID0gQ2hhbmdlTWFuYWdlci5USFJPVFRMRSwgc2V0VGhyb3R0bGUgPSBDaGFuZ2VNYW5hZ2VyLnNldFRocm90dGxlLCByZWdpc3RlclF1ZXVlQ2FsbGJhY2sgPSBDaGFuZ2VNYW5hZ2VyLnJlZ2lzdGVyUXVldWVDYWxsYmFjaywgdW5yZWdpc3RlclF1ZXVlQ2FsbGJhY2sgPSBDaGFuZ2VNYW5hZ2VyLnVucmVnaXN0ZXJRdWV1ZUNhbGxiYWNrLCByZWdpc3RlclJlc29sdmVDYWxsYmFjayA9IENoYW5nZU1hbmFnZXIucmVnaXN0ZXJSZXNvbHZlQ2FsbGJhY2ssIHVucmVnaXN0ZXJSZXNvbHZlQ2FsbGJhY2sgPSBDaGFuZ2VNYW5hZ2VyLnVucmVnaXN0ZXJSZXNvbHZlQ2FsbGJhY2ssIGZsdXNoID0gQ2hhbmdlTWFuYWdlci5mbHVzaDtcblxuREVGQVVMVF9PUFRJT05TID0gTW9kZWxGYWN0b3J5LkRFRkFVTFRfT1BUSU9OUywgbm9ybWFsaXplUHJvcGVydHlDb25maWcgPSBNb2RlbEZhY3Rvcnkubm9ybWFsaXplUHJvcGVydHlDb25maWcsIGNyZWF0ZSA9IE1vZGVsRmFjdG9yeS5jcmVhdGU7XG5cbnV1aWQgPSBJbnN0YW5jZUZhY3RvcnkudXVpZDtcblxuZ2V0ID0gUmVnaXN0cnkuZ2V0LCByZXNldCA9IFJlZ2lzdHJ5LnJlc2V0O1xuXG5yZXNldCA9IGZ1bmN0aW9uKCkge1xuICBSZWdpc3RyeS5yZXNldCgpO1xuICByZXR1cm4gQ2hhbmdlTWFuYWdlci5yZXNldCgpO1xufTtcblxuU2NoZW1pbmcgPSB7XG4gIFRZUEVTOiBUWVBFUyxcbiAgTkVTVEVEX1RZUEVTOiBORVNURURfVFlQRVMsXG4gIERFRkFVTFRfT1BUSU9OUzogREVGQVVMVF9PUFRJT05TLFxuICBUSFJPVFRMRTogVEhST1RUTEUsXG4gIHV1aWQ6IHV1aWQsXG4gIGdldDogZ2V0LFxuICByZXNldDogcmVzZXQsXG4gIHJlc29sdmVUeXBlOiByZXNvbHZlVHlwZSxcbiAgbm9ybWFsaXplUHJvcGVydHlDb25maWc6IG5vcm1hbGl6ZVByb3BlcnR5Q29uZmlnLFxuICBzZXRUaHJvdHRsZTogc2V0VGhyb3R0bGUsXG4gIHJlZ2lzdGVyUXVldWVDYWxsYmFjazogcmVnaXN0ZXJRdWV1ZUNhbGxiYWNrLFxuICB1bnJlZ2lzdGVyUXVldWVDYWxsYmFjazogdW5yZWdpc3RlclF1ZXVlQ2FsbGJhY2ssXG4gIHJlZ2lzdGVyUmVzb2x2ZUNhbGxiYWNrOiByZWdpc3RlclJlc29sdmVDYWxsYmFjayxcbiAgdW5yZWdpc3RlclJlc29sdmVDYWxsYmFjazogdW5yZWdpc3RlclJlc29sdmVDYWxsYmFjayxcbiAgZmx1c2g6IGZsdXNoLFxuICBjcmVhdGU6IGNyZWF0ZVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTY2hlbWluZztcblxuIiwidmFyIFR5cGVzLCBfLFxuICBiaW5kID0gZnVuY3Rpb24oZm4sIG1lKXsgcmV0dXJuIGZ1bmN0aW9uKCl7IHJldHVybiBmbi5hcHBseShtZSwgYXJndW1lbnRzKTsgfTsgfTtcblxuXyA9IHJlcXVpcmUoJy4vdXRpbGl0aWVzJyk7XG5cblR5cGVzID0gKGZ1bmN0aW9uKCkge1xuICBmdW5jdGlvbiBUeXBlcygpIHtcbiAgICB0aGlzLnJlc29sdmVUeXBlID0gYmluZCh0aGlzLnJlc29sdmVUeXBlLCB0aGlzKTtcbiAgICB0aGlzLnJlc29sdmVTY2hlbWFUeXBlID0gYmluZCh0aGlzLnJlc29sdmVTY2hlbWFUeXBlLCB0aGlzKTtcbiAgICB0aGlzLmdldFByaW1pdGl2ZVR5cGVPZiA9IGJpbmQodGhpcy5nZXRQcmltaXRpdmVUeXBlT2YsIHRoaXMpO1xuICB9XG5cblxuICAvKlxuICAgIFNjaGVtaW5nIGV4cG9ydHMgdGhlIGRlZmF1bHQgdHlwZXMgdGhhdCBpdCB1c2VzIGZvciBwYXJzaW5nIHNjaGVtYXMuIFlvdSBjYW4gZXh0ZW5kIHdpdGggY3VzdG9tIHR5cGVzLCBvclxuICAgIG92ZXJyaWRlIHRoZSBpZGVudGlmaWVyIC8gcGFyc2VyIGZ1bmN0aW9ucyBvZiB0aGUgZGVmYXVsdCB0eXBlcy4gQSBjdXN0b20gdHlwZSBzaG91bGQgcHJvdmlkZTpcbiAgICAgLSBjdG9yIChvcHRpb25hbCkgLSBVc2VkIGluIHNjaGVtYSBkZWZpbml0aW9ucyB0byBkZWNsYXJlIGEgdHlwZS4gYFNjaGVtaW5nLmNyZWF0ZSBuYW1lIDogU3RyaW5nYFxuICAgICAtIHN0cmluZyAtIFVzZWQgaW4gc2NoZW1hIGRlZmluaXRpb25zIHRvIGRlY2xhcmUgYSB0eXBlLiBgU2NoZW1pbmcuY3JlYXRlIG5hbWUgOiAnc3RyaW5nJ2BcbiAgICAgLSBpZGVudGlmaWVyIC0gRnVuY3Rpb24sIHJldHVybnMgdHJ1ZSBvciBmYWxzZS4gRGV0ZXJtaW5lcyB3aGV0aGVyIGEgdmFsdWUgbmVlZHMgdG8gYmUgcGFyc2VkLlxuICAgICAtIHBhcnNlciAtIEZ1bmN0aW9uLCBwYXJzZXMgYSB2YWx1ZSBpbnRvIHRoZSB0eXBlLlxuICAgKi9cblxuICBUeXBlcy5wcm90b3R5cGUuVFlQRVMgPSB7XG4gICAgU3RyaW5nOiB7XG4gICAgICBjdG9yOiBTdHJpbmcsXG4gICAgICBzdHJpbmc6ICdzdHJpbmcnLFxuICAgICAgaWRlbnRpZmllcjogXy5pc1N0cmluZyxcbiAgICAgIHBhcnNlcjogZnVuY3Rpb24odmFsKSB7XG4gICAgICAgIHJldHVybiAnJyArIHZhbDtcbiAgICAgIH0sXG4gICAgICBlcXVhbHM6IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIGEgPT09IGI7XG4gICAgICB9XG4gICAgfSxcbiAgICBOdW1iZXI6IHtcbiAgICAgIGN0b3I6IE51bWJlcixcbiAgICAgIHN0cmluZzogJ251bWJlcicsXG4gICAgICBpZGVudGlmaWVyOiBfLmlzTnVtYmVyLFxuICAgICAgcGFyc2VyOiBwYXJzZUZsb2F0LFxuICAgICAgY29tcGFyYXRvcjogZnVuY3Rpb24oYSwgYikge1xuICAgICAgICByZXR1cm4gYSA9PT0gYjtcbiAgICAgIH0sXG4gICAgICBlcXVhbHM6IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIGEgPT09IGI7XG4gICAgICB9XG4gICAgfSxcbiAgICBJbnRlZ2VyOiB7XG4gICAgICBzdHJpbmc6ICdpbnRlZ2VyJyxcbiAgICAgIGlkZW50aWZpZXI6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICByZXR1cm4gXy5pc051bWJlcih2YWwpICYmIHZhbCAlIDEgPT09IDA7XG4gICAgICB9LFxuICAgICAgcGFyc2VyOiBwYXJzZUludCxcbiAgICAgIGVxdWFsczogZnVuY3Rpb24oYSwgYikge1xuICAgICAgICByZXR1cm4gYSA9PT0gYjtcbiAgICAgIH1cbiAgICB9LFxuICAgIERhdGU6IHtcbiAgICAgIGN0b3I6IERhdGUsXG4gICAgICBzdHJpbmc6ICdkYXRlJyxcbiAgICAgIGlkZW50aWZpZXI6IF8uaXNEYXRlLFxuICAgICAgcGFyc2VyOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBEYXRlKHZhbCk7XG4gICAgICB9LFxuICAgICAgZXF1YWxzOiBmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgIHJldHVybiAoYSAhPSBudWxsID8gYS52YWx1ZU9mKCkgOiB2b2lkIDApID09PSAoYiAhPSBudWxsID8gYi52YWx1ZU9mKCkgOiB2b2lkIDApO1xuICAgICAgfVxuICAgIH0sXG4gICAgQm9vbGVhbjoge1xuICAgICAgY3RvcjogQm9vbGVhbixcbiAgICAgIHN0cmluZzogJ2Jvb2xlYW4nLFxuICAgICAgaWRlbnRpZmllcjogXy5pc0Jvb2xlYW4sXG4gICAgICBwYXJzZXI6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICByZXR1cm4gISF2YWw7XG4gICAgICB9LFxuICAgICAgZXF1YWxzOiBmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgIHJldHVybiBhID09PSBiO1xuICAgICAgfVxuICAgIH0sXG4gICAgTWl4ZWQ6IHtcbiAgICAgIGN0b3I6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICByZXR1cm4gdmFsO1xuICAgICAgfSxcbiAgICAgIHN0cmluZzogJyonLFxuICAgICAgaWRlbnRpZmllcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSxcbiAgICAgIHBhcnNlcjogXy5pZGVudGl0eSxcbiAgICAgIGVxdWFsczogZnVuY3Rpb24oYSwgYikge1xuICAgICAgICByZXR1cm4gYSA9PT0gYjtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cblxuICAvKlxuICAgIFNwZWNpYWwgdHlwZSBkZWZpbml0aW9ucyBmb3IgbmVzdGVkIHR5cGVzLiBVc2VkIHRvIGlkZW50aWZ5IGFuZCBwYXJzZSBuZXN0ZWQgQXJyYXlzIGFuZCBTY2hlbWFzLlxuICAgIFNob3VsZCBub3QgYmUgZXh0ZW5kZWQgb3Igb3ZlcnJpZGRlbi5cbiAgICovXG5cbiAgVHlwZXMucHJvdG90eXBlLk5FU1RFRF9UWVBFUyA9IHtcbiAgICBBcnJheToge1xuICAgICAgY3RvcjogQXJyYXksXG4gICAgICBzdHJpbmc6ICdhcnJheScsXG4gICAgICBpZGVudGlmaWVyOiBfLmlzQXJyYXksXG4gICAgICBwYXJzZXI6IF8udG9BcnJheSxcbiAgICAgIGNoaWxkVHlwZTogbnVsbCxcbiAgICAgIGNoaWxkUGFyc2VyOiBudWxsLFxuICAgICAgZXF1YWxzOiBmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgIHJldHVybiBfLmlzRXF1YWwoYSwgYik7XG4gICAgICB9XG4gICAgfSxcbiAgICBTY2hlbWE6IHtcbiAgICAgIGN0b3I6IE9iamVjdCxcbiAgICAgIHN0cmluZzogJ3NjaGVtYScsXG4gICAgICBpZGVudGlmaWVyOiBudWxsLFxuICAgICAgcGFyc2VyOiBudWxsLFxuICAgICAgY2hpbGRUeXBlOiBudWxsLFxuICAgICAgZXF1YWxzOiBmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgIHJldHVybiBhID09PSBiO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBUeXBlcy5wcm90b3R5cGUuZ2V0UHJpbWl0aXZlVHlwZU9mID0gZnVuY3Rpb24odHlwZSkge1xuICAgIHZhciBUWVBFLCBrLCByZWY7XG4gICAgcmVmID0gdGhpcy5UWVBFUztcbiAgICBmb3IgKGsgaW4gcmVmKSB7XG4gICAgICBUWVBFID0gcmVmW2tdO1xuICAgICAgaWYgKHR5cGUgPT09IFRZUEUgfHwgKFRZUEUuY3RvciAmJiB0eXBlID09PSBUWVBFLmN0b3IpIHx8ICh0eXBlICE9IG51bGwgPyB0eXBlb2YgdHlwZS50b0xvd2VyQ2FzZSA9PT0gXCJmdW5jdGlvblwiID8gdHlwZS50b0xvd2VyQ2FzZSgpIDogdm9pZCAwIDogdm9pZCAwKSA9PT0gVFlQRS5zdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIFRZUEU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9O1xuXG4gIFR5cGVzLnByb3RvdHlwZS5yZXNvbHZlU2NoZW1hVHlwZSA9IGZ1bmN0aW9uKHR5cGUsIGNoaWxkVHlwZSkge1xuICAgIHR5cGUuY2hpbGRUeXBlID0gY2hpbGRUeXBlO1xuICAgIHR5cGUuaWRlbnRpZmllciA9IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIHZhbCBpbnN0YW5jZW9mIGNoaWxkVHlwZTtcbiAgICB9O1xuICAgIHJldHVybiB0eXBlLnBhcnNlciA9IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIG5ldyBjaGlsZFR5cGUodmFsKTtcbiAgICB9O1xuICB9O1xuXG4gIFR5cGVzLnByb3RvdHlwZS5yZXNvbHZlVHlwZSA9IGZ1bmN0aW9uKHR5cGVEZWYpIHtcbiAgICB2YXIgY2hpbGRUeXBlLCBmbiwgZm4xLCBpLCBsZW4sIHJlZiwgdHlwZTtcbiAgICB0eXBlID0gdGhpcy5nZXRQcmltaXRpdmVUeXBlT2YodHlwZURlZik7XG4gICAgaWYgKHR5cGUgPT0gbnVsbCkge1xuICAgICAgaWYgKF8uaXNBcnJheSh0eXBlRGVmKSkge1xuICAgICAgICB0eXBlID0gXy5jbG9uZURlZXAodGhpcy5ORVNURURfVFlQRVMuQXJyYXkpO1xuICAgICAgICBpZiAodHlwZURlZi5sZW5ndGgpIHtcbiAgICAgICAgICBjaGlsZFR5cGUgPSB0aGlzLnJlc29sdmVUeXBlKHR5cGVEZWZbMF0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICghY2hpbGRUeXBlKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXJyb3IgcmVzb2x2aW5nIHR5cGUgb2YgYXJyYXkgdmFsdWUgXCIgKyB0eXBlRGVmKTtcbiAgICAgICAgfVxuICAgICAgICB0eXBlLmNoaWxkVHlwZSA9IGNoaWxkVHlwZTtcbiAgICAgICAgdHlwZS5jaGlsZFBhcnNlciA9IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICAgIHZhciBpbmRleCwgbWVtYmVyO1xuICAgICAgICAgIGZvciAoaW5kZXggaW4gdmFsKSB7XG4gICAgICAgICAgICBtZW1iZXIgPSB2YWxbaW5kZXhdO1xuICAgICAgICAgICAgaWYgKCFjaGlsZFR5cGUuaWRlbnRpZmllcihtZW1iZXIpKSB7XG4gICAgICAgICAgICAgIHZhbFtpbmRleF0gPSBjaGlsZFR5cGUucGFyc2VyKG1lbWJlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB2YWw7XG4gICAgICAgIH07XG5cbiAgICAgICAgLypcbiAgICAgICAgLSBJZiB0aGUgdHlwZSBkZWZpbml0aW9uIGlzIGFuIG9iamVjdCBge31gXG4gICAgICAgICAgLSBDcmVhdGUgYSBuZXcgU2NoZW1hIGZyb20gdGhlIG9iamVjdFxuICAgICAgICAgIC0gVHJlYXQgdGhlIGZpZWxkIGFzIGEgbmVzdGVkIFNjaGVtYVxuICAgICAgICAgIC0gU2V0IGlkZW50aWZpZXIgYW5kIHBhcnNlciBmdW5jdGlvbnMgaW1tZWRpYXRlbHlcbiAgICAgICAgICovXG4gICAgICB9IGVsc2UgaWYgKF8uaXNQbGFpbk9iamVjdCh0eXBlRGVmKSkge1xuICAgICAgICB0eXBlID0gXy5jbG9uZURlZXAodGhpcy5ORVNURURfVFlQRVMuU2NoZW1hKTtcbiAgICAgICAgY2hpbGRUeXBlID0gcmVxdWlyZSgnLi9Nb2RlbEZhY3RvcnknKS5jcmVhdGUodHlwZURlZik7XG4gICAgICAgIHRoaXMucmVzb2x2ZVNjaGVtYVR5cGUodHlwZSwgY2hpbGRUeXBlKTtcblxuICAgICAgICAvKlxuICAgICAgICAtIElmIHRoZSB0eXBlIGRlZmluaXRpb24gaXMgYSByZWZlcmVuY2UgdG8gYSBTY2hlbWEgY29uc3RydWN0b3JcbiAgICAgICAgICAtIFRyZWF0IHRoZSBmaWVsZCBhcyBhIG5lc3RlZCBTY2hlbWFcbiAgICAgICAgICAtIFNldCBpZGVudGlmaWVyIGFuZCBwYXJzZXIgZnVuY3Rpb25zIGltbWVkaWF0ZWx5XG4gICAgICAgICAqL1xuICAgICAgfSBlbHNlIGlmIChfLmlzRnVuY3Rpb24odHlwZURlZikgJiYgdHlwZURlZi5fX3NjaGVtYUlkKSB7XG4gICAgICAgIHR5cGUgPSBfLmNsb25lRGVlcCh0aGlzLk5FU1RFRF9UWVBFUy5TY2hlbWEpO1xuICAgICAgICBjaGlsZFR5cGUgPSB0eXBlRGVmO1xuICAgICAgICB0aGlzLnJlc29sdmVTY2hlbWFUeXBlKHR5cGUsIGNoaWxkVHlwZSk7XG5cbiAgICAgICAgLypcbiAgICAgICAgLSBJZiB0aGUgdHlwZSBkZWZpbml0aW9uIGlzIGEgc3RyaW5nIHRoYXQgYmVnaW5zIHdpdGggU2NoZW1hOiwgc3VjaCBhcyBgJ1NjaGVtYTpDYXInYFxuICAgICAgICAgIC0gSXQgaXMgYXNzdW1lZCB0aGF0IHRoZSBmaWVsZCBpcyBhIHJlZmVyZW5jZSB0byBhIG5lc3RlZCBTY2hlbWEgdGhhdCB3aWxsIGJlIHJlZ2lzdGVyZWQgd2l0aCB0aGUgbmFtZSBDYXIsXG4gICAgICAgIGJ1dCBtYXkgbm90IGJlIHJlZ2lzdGVyZWQgeWV0XG4gICAgICAgICAgLSBUaGUgU2NoZW1hIGlzIG5vdCByZXNvbHZlZCBpbW1lZGlhdGVseVxuICAgICAgICAgIC0gVGhlIHBhcnNlciBhbmQgaWRlbnRpZmllciBmdW5jdGlvbnMgYXJlIHdyaXR0ZW4gYXMgd3JhcHBlcnMsIHNvIHRoYXQgdGhlIGZpcnN0IHRpbWUgdGhleSBhcmUgaW52b2tlZCB0aGUgU2NoZW1hXG4gICAgICAgIHdpbGwgYmUgbG9va2VkIHVwIGF0IHRoYXQgdGltZSB2aWEgYFNjaGVtaW5nLmdldGAsIGFuZCByZWFsIGlkZW50aWZpZXIgYW5kIHBhcnNlciBhcmUgc2V0IGF0IHRoYXQgdGltZS5cbiAgICAgICAgICAtIElmIHRoZSByZWdpc3RlcmVkIFNjaGVtYSBjYW5ub3QgYmUgcmVzb2x2ZWQsIHRocm93IGFuIGVycm9yLlxuICAgICAgICAgKi9cbiAgICAgIH0gZWxzZSBpZiAoXy5pc1N0cmluZyh0eXBlRGVmKSAmJiB0eXBlRGVmLnNsaWNlKDAsIDcpID09PSAnU2NoZW1hOicpIHtcbiAgICAgICAgdHlwZSA9IF8uY2xvbmVEZWVwKHRoaXMuTkVTVEVEX1RZUEVTLlNjaGVtYSk7XG4gICAgICAgIGNoaWxkVHlwZSA9IHR5cGVEZWYuc2xpY2UoNyk7XG4gICAgICAgIHJlZiA9IFsnaWRlbnRpZmllcicsICdwYXJzZXInXTtcbiAgICAgICAgZm4xID0gKGZ1bmN0aW9uKF90aGlzKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGZuKSB7XG4gICAgICAgICAgICByZXR1cm4gdHlwZVtmbl0gPSBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgICAgICAgY2hpbGRUeXBlID0gcmVxdWlyZSgnLi9SZWdpc3RyeScpLmdldChjaGlsZFR5cGUpO1xuICAgICAgICAgICAgICBpZiAoIWNoaWxkVHlwZSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkVycm9yIHJlc29sdmluZyBcIiArIHR5cGVEZWYgKyBcIiBvbiBsYXp5IGluaXRpYWxpemF0aW9uXCIpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIF90aGlzLnJlc29sdmVTY2hlbWFUeXBlKHR5cGUsIGNoaWxkVHlwZSk7XG4gICAgICAgICAgICAgIHJldHVybiB0eXBlW2ZuXSh2YWwpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9O1xuICAgICAgICB9KSh0aGlzKTtcbiAgICAgICAgZm9yIChpID0gMCwgbGVuID0gcmVmLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgZm4gPSByZWZbaV07XG4gICAgICAgICAgZm4xKGZuKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHlwZSB8fCBudWxsO1xuICB9O1xuXG4gIHJldHVybiBUeXBlcztcblxufSkoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgVHlwZXMoKTtcblxuIiwidmFyIGNsb25lLCBjbG9uZURlZXAsIGNvbnRhaW5zLCBjb250YWluc0FycmF5LCBjb250YWluc09iamVjdCwgZGVmYXVsdHMsIGV4dGVuZCwgaGFzLCBpZGVudGl0eSwgaW5jbHVkZXMsIGludGVyc2VjdGlvbiwgaXNBcnJheSwgaXNCb29sZWFuLCBpc0RhdGUsIGlzRXF1YWwsIGlzRXF1YWxBcnJheSwgaXNGdW5jdGlvbiwgaXNOdW1iZXIsIGlzT2JqZWN0TGlrZSwgaXNQbGFpbk9iamVjdCwgaXNTdHJpbmcsIGlzVm9pZCwgcmVtb3ZlLCBzaXplLCB0b0FycmF5LCB1bmlxLCB1bmlxdWUsXG4gIHNsaWNlID0gW10uc2xpY2U7XG5cbmlkZW50aXR5ID0gZnVuY3Rpb24oeCkge1xuICByZXR1cm4geDtcbn07XG5cbmlzVm9pZCA9IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHggPT09IG51bGwgfHwgdHlwZW9mIHggPT09ICd1bmRlZmluZWQnO1xufTtcblxuaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nO1xufTtcblxuaXNPYmplY3RMaWtlID0gZnVuY3Rpb24oeCkge1xuICByZXR1cm4gIWlzVm9pZCh4KSAmJiB0eXBlb2YgeCA9PT0gJ29iamVjdCc7XG59O1xuXG5pc1N0cmluZyA9IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHR5cGVvZiB4ID09PSAnc3RyaW5nJztcbn07XG5cbmlzTnVtYmVyID0gZnVuY3Rpb24oeCkge1xuICByZXR1cm4gdHlwZW9mIHggPT09ICdudW1iZXInO1xufTtcblxuaXNEYXRlID0gZnVuY3Rpb24oeCkge1xuICByZXR1cm4geCBpbnN0YW5jZW9mIERhdGU7XG59O1xuXG5pc0Jvb2xlYW4gPSBmdW5jdGlvbih4KSB7XG4gIHJldHVybiB4ID09PSB0cnVlIHx8IHggPT09IGZhbHNlO1xufTtcblxuaXNBcnJheSA9ICFBcnJheS5pc0FycmF5ID8gZnVuY3Rpb24oeCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHgpID09PSAnW29iamVjdCBBcnJheV0nO1xufSA6IEFycmF5LmlzQXJyYXk7XG5cbmV4dGVuZCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgaW50bywgdmFsdWVzO1xuICBpbnRvID0gYXJndW1lbnRzWzBdLCB2YWx1ZXMgPSAyIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkgOiBbXTtcbiAgcmV0dXJuIHRvQXJyYXkodmFsdWVzIHx8IFtdKS5yZWR1Y2UoKGZ1bmN0aW9uKGFjYywgdmFsdWUpIHtcbiAgICBPYmplY3Qua2V5cyh2YWx1ZSkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgIGlmIChpc1ZvaWQoa2V5KSkge1xuICAgICAgICByZXR1cm4gZGVsZXRlIGFjY1trZXldO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGFjY1trZXldID0gdmFsdWVba2V5XTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gYWNjO1xuICB9KSwgaW50byk7XG59O1xuXG5pc0VxdWFsQXJyYXkgPSBmdW5jdGlvbihsZWZ0LCByaWdodCkge1xuICByZXR1cm4gbGVmdCA9PT0gcmlnaHQgfHwgKCFpc1ZvaWQobGVmdCkgJiYgIWlzVm9pZChyaWdodCkgJiYgaXNBcnJheShsZWZ0KSA9PT0gaXNBcnJheShyaWdodCkgJiYgKCFpc0FycmF5KGxlZnQpIHx8IChsZWZ0Lmxlbmd0aCA9PT0gcmlnaHQubGVuZ3RoICYmIGxlZnQuZXZlcnkoZnVuY3Rpb24obGVmdFZhbHVlLCBsZWZ0SW5kZXgpIHtcbiAgICByZXR1cm4gbGVmdFZhbHVlID09PSByaWdodFtsZWZ0SW5kZXhdO1xuICB9KSkpKTtcbn07XG5cbmlzUGxhaW5PYmplY3QgPSBmdW5jdGlvbih4KSB7XG4gIHJldHVybiBpc09iamVjdExpa2UoeCkgJiYgIWlzRnVuY3Rpb24oeCkgJiYgIWlzU3RyaW5nKHgpICYmICFpc0FycmF5KHgpO1xufTtcblxuY2xvbmUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICBpZiAoaXNWb2lkKHZhbHVlKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9IGVsc2UgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgcmV0dXJuIHZhbHVlLm1hcChpZGVudGl0eSk7XG4gIH0gZWxzZSBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9IGVsc2UgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gbmV3IERhdGUodmFsdWUpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXModmFsdWUpLnJlZHVjZSgoZnVuY3Rpb24oYWNjLCBrZXkpIHtcbiAgICAgIGFjY1trZXldID0gdmFsdWVba2V5XTtcbiAgICAgIHJldHVybiBhY2M7XG4gICAgfSksIHt9KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbn07XG5cbmNsb25lRGVlcCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmIChpc1ZvaWQodmFsdWUpKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9IGVsc2UgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgcmV0dXJuIHZhbHVlLm1hcChjbG9uZURlZXApO1xuICB9IGVsc2UgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfSBlbHNlIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgcmV0dXJuIG5ldyBEYXRlKHZhbHVlKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHZhbHVlKS5yZWR1Y2UoKGZ1bmN0aW9uKGFjYywga2V5KSB7XG4gICAgICBhY2Nba2V5XSA9IGNsb25lRGVlcCh2YWx1ZVtrZXldKTtcbiAgICAgIHJldHVybiBhY2M7XG4gICAgfSksIHt9KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbn07XG5cbnRvQXJyYXkgPSBmdW5jdGlvbih4KSB7XG4gIGlmIChpc0FycmF5KHgpKSB7XG4gICAgcmV0dXJuIHg7XG4gIH0gZWxzZSBpZiAoaXNTdHJpbmcoeCkpIHtcbiAgICByZXR1cm4geC5zcGxpdCgnJyk7XG4gIH0gZWxzZSBpZiAoaXNPYmplY3RMaWtlKHgpKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHgpLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiB4W2tleV07XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG59O1xuXG5oYXMgPSBmdW5jdGlvbihvYmosIHZhbHVlKSB7XG4gIHJldHVybiBvYmouaGFzT3duUHJvcGVydHkodmFsdWUpO1xufTtcblxuY29udGFpbnNBcnJheSA9IGZ1bmN0aW9uKG5zLCB2YWx1ZSkge1xuICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICByZXR1cm4gbnMuc29tZSh2YWx1ZSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG5zLmluZGV4T2YodmFsdWUpICE9PSAtMTtcbiAgfVxufTtcblxuY29udGFpbnNPYmplY3QgPSBmdW5jdGlvbihpbnRvLCB2YWx1ZSkge1xuICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoaW50bykuc29tZShmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiB2YWx1ZShpbnRvW2tleV0sIGtleSk7XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKGludG8pLnNvbWUoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gdmFsdWUgPT09IGludG9ba2V5XTtcbiAgICB9KTtcbiAgfVxufTtcblxuY29udGFpbnMgPSBmdW5jdGlvbihjb250YWluc0ludG8sIGNvbnRhaW5zVmFsdWUpIHtcbiAgaWYgKGlzQXJyYXkoY29udGFpbnNJbnRvKSkge1xuICAgIHJldHVybiBjb250YWluc0FycmF5KGNvbnRhaW5zSW50bywgY29udGFpbnNWYWx1ZSk7XG4gIH0gZWxzZSBpZiAoaXNPYmplY3RMaWtlKGNvbnRhaW5zSW50bykpIHtcbiAgICByZXR1cm4gY29udGFpbnNPYmplY3QoY29udGFpbnNJbnRvLCBjb250YWluc1ZhbHVlKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn07XG5cbnVuaXF1ZSA9IGZ1bmN0aW9uKHZhbHVlcykge1xuICByZXR1cm4gdmFsdWVzLmZpbHRlcihmdW5jdGlvbih2YWx1ZSwgaSkge1xuICAgIHJldHVybiB2YWx1ZXMuaW5kZXhPZih2YWx1ZSkgPj0gaTtcbiAgfSk7XG59O1xuXG5zaXplID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgaWYgKGlzQXJyYXkodmFsdWUpIHx8IGlzU3RyaW5nKHZhbHVlKSkge1xuICAgIHJldHVybiB2YWx1ZS5sZW5ndGg7XG4gIH0gZWxzZSBpZiAoaXNPYmplY3RMaWtlKHZhbHVlKSkge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyh2YWx1ZSkubGVuZ3RoO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAwO1xuICB9XG59O1xuXG5pbnRlcnNlY3Rpb24gPSBmdW5jdGlvbigpIHtcbiAgdmFyIGhlYWQsIHJlc3Q7XG4gIGhlYWQgPSBhcmd1bWVudHNbMF0sIHJlc3QgPSAyIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkgOiBbXTtcbiAgcmV0dXJuIHVuaXF1ZShoZWFkLmZpbHRlcihmdW5jdGlvbih2KSB7XG4gICAgcmV0dXJuIHJlc3QuZXZlcnkoZnVuY3Rpb24ocmVzdENvbnRhaW5lcnMpIHtcbiAgICAgIHJldHVybiBjb250YWlucyhyZXN0Q29udGFpbmVycywgdik7XG4gICAgfSk7XG4gIH0pKTtcbn07XG5cbmRlZmF1bHRzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBkZWZhdWx0VmFsdWVzLCBvcmlnO1xuICBvcmlnID0gYXJndW1lbnRzWzBdLCBkZWZhdWx0VmFsdWVzID0gMiA8PSBhcmd1bWVudHMubGVuZ3RoID8gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpIDogW107XG4gIHJldHVybiBkZWZhdWx0VmFsdWVzLnJlZHVjZSgoZnVuY3Rpb24oYWNjLCB2YWx1ZSkge1xuICAgIE9iamVjdC5rZXlzKHZhbHVlKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgaWYgKCFhY2MuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICByZXR1cm4gYWNjW2tleV0gPSB2YWx1ZVtrZXldO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBhY2M7XG4gIH0pLCBvcmlnKTtcbn07XG5cbmlzRXF1YWwgPSBmdW5jdGlvbihsZWZ0LCByaWdodCkge1xuICBpZiAoaXNBcnJheShsZWZ0KSkge1xuICAgIHJldHVybiBpc0VxdWFsQXJyYXkobGVmdCwgcmlnaHQpO1xuICB9IGVsc2UgaWYgKGlzUGxhaW5PYmplY3QobGVmdCkpIHtcbiAgICByZXR1cm4gaXNQbGFpbk9iamVjdChyaWdodCkgJiYgT2JqZWN0LmtleXMobGVmdCkubGVuZ3RoID09PSBPYmplY3Qua2V5cyhyaWdodCkubGVuZ3RoICYmIE9iamVjdC5rZXlzKGxlZnQpLmV2ZXJ5KGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIGlzRXF1YWwobGVmdFtrZXldLCByaWdodFtrZXldKTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbGVmdCA9PT0gcmlnaHQ7XG4gIH1cbn07XG5cbnJlbW92ZSA9IGZ1bmN0aW9uKG5zLCBuKSB7XG4gIHJldHVybiBucy5zcGxpY2UobnMuaW5kZXhPZihuKSwgMSk7XG59O1xuXG5pbmNsdWRlcyA9IGNvbnRhaW5zO1xuXG51bmlxID0gdW5pcXVlO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgY2xvbmU6IGNsb25lLFxuICBjbG9uZURlZXA6IGNsb25lRGVlcCxcbiAgY29udGFpbnM6IGNvbnRhaW5zLFxuICBkZWZhdWx0czogZGVmYXVsdHMsXG4gIGV4dGVuZDogZXh0ZW5kLFxuICBoYXM6IGhhcyxcbiAgaWRlbnRpdHk6IGlkZW50aXR5LFxuICBpbmNsdWRlczogaW5jbHVkZXMsXG4gIGludGVyc2VjdGlvbjogaW50ZXJzZWN0aW9uLFxuICBpc0FycmF5OiBpc0FycmF5LFxuICBpc0Jvb2xlYW46IGlzQm9vbGVhbixcbiAgaXNEYXRlOiBpc0RhdGUsXG4gIGlzRXF1YWw6IGlzRXF1YWwsXG4gIGlzRnVuY3Rpb246IGlzRnVuY3Rpb24sXG4gIGlzTnVtYmVyOiBpc051bWJlcixcbiAgaXNQbGFpbk9iamVjdDogaXNQbGFpbk9iamVjdCxcbiAgaXNTdHJpbmc6IGlzU3RyaW5nLFxuICByZW1vdmU6IHJlbW92ZSxcbiAgc2l6ZTogc2l6ZSxcbiAgdG9BcnJheTogdG9BcnJheSxcbiAgdW5pcXVlOiB1bmlxdWUsXG4gIHVuaXE6IHVuaXFcbn07XG5cbiJdfQ==
;
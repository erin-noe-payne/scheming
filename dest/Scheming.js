(function() {
  var ARRAY_MUTATORS, ChangeManager, DEFAULT_OPTIONS, NESTED_TYPES, Scheming, THROTTLE, TYPES, _, _queueCallback, _resolveCallback, _throttle, addToRegistry, cm, getPrimitiveTypeOf, instanceFactory, isNode, registry, root, schemaFactory, uuid,
    slice = [].slice,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  root = this;

  isNode = typeof exports !== 'undefined' && typeof module !== 'undefined' && module.exports;

  if (isNode) {
    _ = require('lodash');
  } else {
    _ = window._;
  }

  uuid = function() {
    var now;
    now = Date.now();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r;
      r = (now + Math.random() * 16) % 16 | 0;
      now = Math.floor(now / 16);
      return (c === "x" ? r : r & 0x3 | 0x8).toString(16);
    });
  };

  DEFAULT_OPTIONS = {
    seal: false,
    strict: false
  };


  /*
    Scheming exports the default types that it uses for parsing schemas. You can extend with custom types, or
    override the identifier / parser functions of the default types. A custom type should provide:
     - ctor (optional) - Used in schema definitions to declare a type. `Scheming.create name : String`
     - string - Used in schema definitions to declare a type. `Scheming.create name : 'string'`
     - identifier - Function, returns true or false. Determines whether a value needs to be parsed.
     - parser - Function, parses a value into the type.
   */

  TYPES = {
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

  NESTED_TYPES = {
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

  THROTTLE = {
    TIMEOUT: 'timeout',
    IMMEDIATE: 'immediate',
    ANIMATION_FRAME: 'animationFrame'
  };

  _throttle = THROTTLE.TIMEOUT;

  _queueCallback = null;

  _resolveCallback = null;

  ARRAY_MUTATORS = ['copyWithin', 'fill', 'push', 'pop', 'reverse', 'shift', 'sort', 'splice', 'unshift'];

  getPrimitiveTypeOf = function(type) {
    var TYPE, k;
    for (k in TYPES) {
      TYPE = TYPES[k];
      if (type === TYPE || (TYPE.ctor && type === TYPE.ctor) || (type != null ? typeof type.toLowerCase === "function" ? type.toLowerCase() : void 0 : void 0) === TYPE.string) {
        return TYPE;
      }
    }
    return null;
  };

  Scheming = {
    uuid: uuid,
    TYPES: TYPES,
    NESTED_TYPES: NESTED_TYPES,
    DEFAULT_OPTIONS: DEFAULT_OPTIONS,
    THROTTLE: THROTTLE
  };

  Scheming.setThrottle = function(throttle) {
    if (!_.contains(THROTTLE, throttle)) {
      throw new Error("Throttle option must be set to one of the strategies specified on Scheming.THROTTLE");
    }
    switch (throttle) {
      case THROTTLE.TIMEOUT:
        return _throttle = THROTTLE.TIMEOUT;
      case THROTTLE.IMMEDIATE:
        if ((typeof setImmediate !== "undefined" && setImmediate !== null) && (typeof clearImmediate !== "undefined" && clearImmediate !== null)) {
          return _throttle = THROTTLE.IMMEDIATE;
        } else {
          return console.warn("Cannot use strategy IMMEDIATE: `setImmediate` or `clearImmediate` are not available in the current environment.");
        }
        break;
      case THROTTLE.ANIMATION_FRAME:
        if ((typeof requestAnimationFrame !== "undefined" && requestAnimationFrame !== null) && (typeof cancelAnimationFrame !== "undefined" && cancelAnimationFrame !== null)) {
          return _throttle = THROTTLE.ANIMATION_FRAME;
        } else {
          return console.warn("Cannot use strategy ANIMATION_FRAME: `requestAnimationFrame` or `cancelAnimationFrame` are not available in the current environment.");
        }
    }
  };

  Scheming.registerQueueCallback = function(callback) {
    if (!_.isFunction(callback)) {
      throw new Error("Callback must be a funtion");
    }
    return _queueCallback = callback;
  };

  Scheming.unregisterQueueCallback = function(callback) {
    return _queueCallback = null;
  };

  Scheming.registerResolveCallback = function(callback) {
    if (!_.isFunction(callback)) {
      throw new Error("Callback must be a funtion");
    }
    return _resolveCallback = callback;
  };

  Scheming.unregisterResolveCallback = function(callback) {
    return _resolveCallback = null;
  };

  Scheming.resolveType = function(typeDef) {
    var childType, fn, fn1, j, len, ref, resolveSchemaType, type;
    type = getPrimitiveTypeOf(typeDef);
    if (type == null) {
      if (_.isArray(typeDef)) {
        type = _.cloneDeep(NESTED_TYPES.Array);
        if (typeDef.length) {
          childType = Scheming.resolveType(typeDef[0]);
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
      }
      resolveSchemaType = function(type, childType) {
        type.childType = childType;
        type.identifier = function(val) {
          return val instanceof childType;
        };
        return type.parser = function(val) {
          return new childType(val);
        };
      };

      /*
      - If the type definition is an object `{}`
        - Create a new Schema from the object
        - Treat the field as a nested Schema
        - Set identifier and parser functions immediately
       */
      if (_.isPlainObject(typeDef)) {
        type = _.cloneDeep(NESTED_TYPES.Schema);
        childType = Scheming.create(typeDef);
        resolveSchemaType(type, childType);
      }

      /*
      - If the type definition is a reference to a Schema constructor
        - Treat the field as a nested Schema
        - Set identifier and parser functions immediately
       */
      if (_.isFunction(typeDef) && typeDef.__schemaId) {
        type = _.cloneDeep(NESTED_TYPES.Schema);
        childType = typeDef;
        resolveSchemaType(type, childType);
      }

      /*
      - If the type definition is a string that begins with Schema:, such as `'Schema:Car'`
        - It is assumed that the field is a reference to a nested Schema that will be registered with the name Car,
      but may not be registered yet
        - The Schema is not resolved immediately
        - The parser and identifier functions are written as wrappers, so that the first time they are invoked the Schema
      will be looked up at that time via `Scheming.get`, and real identifier and parser are set at that time.
        - If the registered Schema cannot be resolved, throw an error.
       */
      if (_.isString(typeDef) && typeDef.slice(0, 7) === 'Schema:') {
        type = _.cloneDeep(NESTED_TYPES.Schema);
        childType = typeDef.slice(7);
        ref = ['identifier', 'parser'];
        fn1 = function(fn) {
          return type[fn] = function(val) {
            childType = Scheming.get(childType);
            if (!childType) {
              throw new Error("Error resolving " + typeDef + " on lazy initialization");
            }
            resolveSchemaType(type, childType);
            return type[fn](val);
          };
        };
        for (j = 0, len = ref.length; j < len; j++) {
          fn = ref[j];
          fn1(fn);
        }
      }
    }
    return type || null;
  };


  /*
    Normalizes a field declaration on a schema to capture type, default value, setter, getter, and validation.
    Used internally when a schema is created to build a normalized schema definition.
   */

  Scheming.normalizePropertyConfig = function(propConfig, propName) {
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
    definition.type = Scheming.resolveType(type);
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

  registry = {};

  addToRegistry = function(key, value) {
    if (registry[key]) {
      throw new Error("Naming conflict encountered. Schema " + key + " already exists");
    }
    return registry[key] = value;
  };

  Scheming.get = function(name) {
    return registry[name];
  };

  Scheming.reset = function() {
    registry = {};
    _queueCallback = null;
    return _resolveCallback = null;
  };

  Scheming.create = function() {
    var Schema, args, name, opts, schemaConfig;
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    if (!_.isString(args[0])) {
      args.unshift(uuid());
    }
    name = args[0], schemaConfig = args[1], opts = args[2];
    opts = _.defaults(opts || {}, DEFAULT_OPTIONS);
    Schema = schemaFactory(name, opts);
    Schema.defineProperties(schemaConfig);
    addToRegistry(name, Schema);
    return Schema;
  };

  schemaFactory = function(name, opts) {
    var Schema, normalizedSchema;
    normalizedSchema = {};
    return Schema = (function() {
      Schema.__schemaId = name;

      Schema.defineProperty = function(propName, propConfig) {
        return normalizedSchema[propName] = Scheming.normalizePropertyConfig(propConfig, propName);
      };

      Schema.defineProperties = function(config) {
        var k, results, v;
        results = [];
        for (k in config) {
          v = config[k];
          results.push(this.defineProperty(k, v));
        }
        return results;
      };

      Schema.getProperties = function() {
        return _.cloneDeep(normalizedSchema);
      };

      Schema.getProperty = function(propName) {
        return _.cloneDeep(normalizedSchema[propName]);
      };

      Schema.eachProperty = function(cb) {
        var propConfig, propName, results;
        results = [];
        for (propName in normalizedSchema) {
          propConfig = normalizedSchema[propName];
          results.push(cb(propName, _.cloneDeep(propConfig)));
        }
        return results;
      };

      Schema.validate = function(instance) {
        var childErrors, e, err, errors, i, j, k, key, l, len, len1, member, pushError, required, requiredMessage, type, v, val, validate, validator, value;
        errors = {};
        if (instance._validating) {
          return null;
        }
        instance._validating = true;
        pushError = function(key, err) {
          var e, j, len;
          if (_.isArray(err)) {
            for (j = 0, len = err.length; j < len; j++) {
              e = err[j];
              return pushError(key, e);
            }
          }
          if (!_.isString(err)) {
            err = 'Validation error occurred.';
          }
          if (errors[key] == null) {
            errors[key] = [];
          }
          return errors[key].push(err);
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

      function Schema(initialState) {
        instanceFactory(this, normalizedSchema, initialState, opts);
      }

      return Schema;

    })();
  };

  ChangeManager = (function() {
    function ChangeManager() {
      this.resolve = bind(this.resolve, this);
      this.changes = {};
      this.internalChangeQueue = [];
      this.timeout = null;
      this.recursionCount = 0;
    }

    ChangeManager.prototype.reset = function() {
      this.changes = {};
      this.internalChangeQueue = [];
      if (this.timeout != null) {
        if (typeof _resolveCallback === "function") {
          _resolveCallback();
        }
      }
      this.timeout = null;
      return this.recursionCount = 0;
    };

    ChangeManager.prototype.queueChanges = function(arg, fireWatchers) {
      var base, changedProps, equals, id, newVal, oldVal, propName;
      id = arg.id, propName = arg.propName, oldVal = arg.oldVal, newVal = arg.newVal, equals = arg.equals;
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
        } else if (!_.has(changedProps, propName) && !equals(oldVal, newVal)) {
          changedProps[propName] = oldVal;
        }
      }
      if (this.timeout == null) {
        if (typeof _queueCallback === "function") {
          _queueCallback();
        }
      }
      switch (_throttle) {
        case THROTTLE.TIMEOUT:
          if (this.timeout == null) {
            this.timeout = setTimeout(this.resolve, 0);
          }
          break;
        case THROTTLE.IMMEDIATE:
          if (this.timeout == null) {
            this.timeout = setImmediate(this.resolve);
          }
          break;
        case THROTTLE.ANIMATION_FRAME:
          if (this.timeout == null) {
            this.timeout = requestAnimationFrame(this.resolve);
          }
      }
      return this._throttle = _throttle;
    };

    ChangeManager.prototype.resolve = function() {
      var changedProps, changes, fireWatchers, id, internalChanges, j, len, ref, ref1;
      this.recursionCount++;
      if (Scheming.ITERATION_LIMIT > 0 && this.recursionCount > Scheming.ITERATION_LIMIT) {
        changes = this.changes;
        this.reset();
        throw new Error("Aborting change propagation after " + Scheming.ITERATION_LIMIT + " cycles.\nThis is probably indicative of a circular watch. Check the following watches for clues:\n" + (JSON.stringify(changes)));
      }
      switch (this._throttle) {
        case THROTTLE.TIMEOUT:
          clearTimeout(this.timeout);
          break;
        case THROTTLE.IMMEDIATE:
          clearImmediate(this.timeout);
          break;
        case THROTTLE.ANIMATION_FRAME:
          cancelAnimationFrame(this.timeout);
      }
      internalChanges = _.unique(this.internalChangeQueue);
      this.internalChangeQueue = [];
      for (j = 0, len = internalChanges.length; j < len; j++) {
        id = internalChanges[j];
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
      return this.reset();
    };

    return ChangeManager;

  })();

  cm = new ChangeManager;

  Scheming.ITERATION_LIMIT = 100;

  Scheming._flush = function() {
    console.warn("`_flush` is being deprecated in favor of `flush`. Please switch usage over to the public method as `_flush` will be removed in a future release.");
    return cm.resolve();
  };

  Scheming.flush = function() {
    return cm.resolve();
  };

  instanceFactory = function(instance, normalizedSchema, initialState, opts) {
    var _initializing, addWatcher, data, fireWatchers, fn1, get, id, propConfig, propName, removeWatcher, seal, set, strict, unwatchers, val, watchForPropagation, watchers;
    _initializing = true;
    data = {};
    watchers = {
      internal: [],
      external: []
    };
    unwatchers = {};
    id = uuid();
    strict = opts.strict, seal = opts.seal;
    set = function(propName, val) {
      var prevVal, ref, setter, type;
      prevVal = data[propName];
      if (!normalizedSchema[propName]) {
        return instance[propName] = val;
      }
      ref = normalizedSchema[propName], type = ref.type, setter = ref.setter;
      if (val != null) {
        if (!type.identifier(val)) {
          if (strict) {
            throw new Error("Error assigning " + val + " to " + propName + ". Value is not of type " + type.string);
          }
          val = type.parser(val);
        }
        if (type.string === NESTED_TYPES.Array.string) {
          val = type.childParser(val);
          _.each(ARRAY_MUTATORS, function(method) {
            if (Array.prototype[method] != null) {
              return Object.defineProperty(val, method, {
                configurable: true,
                value: function() {
                  var clone, ref1;
                  clone = _.clone(this);
                  (ref1 = Array.prototype[method]).call.apply(ref1, [clone].concat(slice.call(arguments)));
                  return instance[propName] = clone;
                }
              });
            }
          });
        }
        if (setter) {
          val = setter.call(instance, val);
        }
      }
      data[propName] = val;
      watchForPropagation(propName, val);
      if (!_initializing) {
        return cm.queueChanges({
          id: id,
          propName: propName,
          oldVal: prevVal,
          newVal: val,
          equals: type.equals
        }, fireWatchers);
      }
    };
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
      cm.queueChanges({
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
      var j, len, oldArray, ref, type, unwatcher;
      type = normalizedSchema[propName].type;
      if (type.string === NESTED_TYPES.Schema.string) {
        if (typeof unwatchers[propName] === "function") {
          unwatchers[propName]();
        }
        unwatchers[propName] = val != null ? val.watch(function(newVal, oldVal) {
          return cm.queueChanges({
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
      if (type.string === NESTED_TYPES.Array.string && type.childType.string === NESTED_TYPES.Schema.string) {
        ref = unwatchers[propName] || [];
        for (j = 0, len = ref.length; j < len; j++) {
          unwatcher = ref[j];
          if (typeof unwatcher === "function") {
            unwatcher();
          }
        }
        unwatchers[propName] = [];
        oldArray = _.cloneDeep(val);
        return _.each(val, function(schema, i) {
          return unwatchers[propName].push(schema != null ? schema.watch(function(newVal, oldVal) {
            var newArray;
            newArray = instance[propName];
            oldArray[i] = oldVal;
            return cm.queueChanges({
              id: id,
              propName: propName,
              oldVal: oldArray,
              newVal: newArray,
              equals: type.equals
            }, fireWatchers);
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
    fn1 = (function(_this) {
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
      fn1(propName, propConfig);
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

  if (isNode) {
    module.exports = Scheming;
  } else {
    root.Scheming = Scheming;
  }

}).call(this);

//# sourceMappingURL=Scheming.js.map
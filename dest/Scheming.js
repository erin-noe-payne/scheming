(function() {
  var DEFAULT_OPTIONS, NESTED_TYPES, Scheming, TYPES, addToRegistry, getPrimitiveTypeOf, instanceFactory, isNode, registry, root, schemaFactory, uuid, _,
    __slice = [].slice;

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
      return (c === "x" ? r : r & 0x7 | 0x8).toString(16);
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
        return a.valueOf() === b.valueOf();
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
    DEFAULT_OPTIONS: DEFAULT_OPTIONS
  };

  Scheming.resolveType = function(typeDef) {
    var childType, fn, resolveSchemaType, type, _fn, _i, _len, _ref;
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
        _ref = ['identifier', 'parser'];
        _fn = function(fn) {
          return type[fn] = function(val) {
            childType = Scheming.get(childType);
            if (!childType) {
              throw new Error("Error resolving " + typeDef + " on lazy initialization");
            }
            resolveSchemaType(type, childType);
            return type[fn](val);
          };
        };
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          fn = _ref[_i];
          _fn(fn);
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
    var definition, fn, getter, required, setter, type, validate, _i, _len;
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
    for (_i = 0, _len = validate.length; _i < _len; _i++) {
      fn = validate[_i];
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
    return registry = {};
  };

  Scheming.create = function() {
    var Schema, args, name, opts, schemaConfig;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
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
        var k, v, _results;
        _results = [];
        for (k in config) {
          v = config[k];
          _results.push(this.defineProperty(k, v));
        }
        return _results;
      };

      Schema.getProperties = function() {
        return _.cloneDeep(normalizedSchema);
      };

      Schema.getProperty = function(propName) {
        return _.cloneDeep(normalizedSchema[propName]);
      };

      Schema.eachProperty = function(cb) {
        var propConfig, propName, _results;
        _results = [];
        for (propName in normalizedSchema) {
          propConfig = normalizedSchema[propName];
          _results.push(cb(propName, _.cloneDeep(propConfig)));
        }
        return _results;
      };

      Schema.validate = function(instance) {
        var childErrors, e, err, errors, i, k, key, member, pushError, required, type, v, val, validate, validator, value, _i, _j, _len, _len1;
        errors = {};
        if (instance._validating) {
          return null;
        }
        instance._validating = true;
        pushError = function(key, err) {
          var e, _i, _len;
          if (_.isArray(err)) {
            for (_i = 0, _len = err.length; _i < _len; _i++) {
              e = err[_i];
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
            pushError(key, "Field is required.");
          }
          if (val != null) {
            type = normalizedSchema[key].type;
            for (_i = 0, _len = validate.length; _i < _len; _i++) {
              validator = validate[_i];
              err = true;
              try {
                err = validator(val);
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
              childErrors = type.childType.validate(val);
              for (k in childErrors) {
                v = childErrors[k];
                pushError("" + key + "." + k, v);
              }
            }
            if (type.string === 'array' && type.childType.string === 'schema') {
              for (i = _j = 0, _len1 = val.length; _j < _len1; i = ++_j) {
                member = val[i];
                childErrors = type.childType.childType.validate(member);
                for (k in childErrors) {
                  v = childErrors[k];
                  pushError("" + key + "[" + i + "]." + k, v);
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

      Schema.watch = function(instance, properties, cb) {
        return instance._addWatcher(properties, cb);
      };

      function Schema(model) {
        instanceFactory(this, normalizedSchema, opts);
        this.set(model);
      }

      return Schema;

    })();
  };

  instanceFactory = function(instance, normalizedSchema, opts) {
    var data, propConfig, propName, seal, strict, _fn;
    data = {};
    strict = opts.strict, seal = opts.seal;
    Object.defineProperty(instance, 'set', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: function(propName, val) {
        var kvp, prevVal, prevVals, setter, type, _ref;
        prevVals = {};
        kvp = {};
        if (arguments.length === 2) {
          kvp[propName] = val;
        } else {
          kvp = propName;
        }
        for (propName in kvp) {
          val = kvp[propName];
          prevVal = data[propName];
          if (!normalizedSchema[propName]) {
            return instance[propName] = val;
          }
          _ref = normalizedSchema[propName], type = _ref.type, setter = _ref.setter;
          if (val === void 0) {
            data[propName] = val;
          } else {
            if (!type.identifier(val)) {
              if (strict) {
                throw new Error("Error assigning " + val + " to " + propName + ". Value is not of type " + type.string);
              }
              val = type.parser(val);
            }
            if (type.string === NESTED_TYPES.Array.string) {
              val = type.childParser(val);
            }
            if (setter) {
              val = setter(val);
            }
            data[propName] = val;
            if (!type.equals(prevVal, val)) {
              prevVals[propName] = prevVal;
            }
          }
        }
        return this._fireWatchers(prevVals);
      }
    });
    Object.defineProperty(instance, 'get', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: function(propName) {
        var getter, type, val, _ref;
        _ref = normalizedSchema[propName], type = _ref.type, getter = _ref.getter;
        val = data[propName];
        if (val === void 0) {
          return val;
        }
        if (type.string !== 'schema') {
          val = _.clone(val);
        }
        if (getter) {
          val = getter(val);
        }
        return val;
      }
    });
    Object.defineProperty(instance, '_validating', {
      configurable: false,
      enumerable: false,
      writable: true,
      value: false
    });
    Object.defineProperty(instance, '_watchers', {
      configurable: false,
      enumerable: false,
      writable: true,
      value: []
    });
    Object.defineProperty(instance, '_addWatcher', {
      configurable: false,
      enumerable: false,
      writable: true,
      value: function(properties, cb) {
        var newVals, propName, watcher, _i, _len;
        if (_.isFunction(properties)) {
          cb = properties;
          properties = _.keys(normalizedSchema);
        }
        if (!_.isFunction(cb)) {
          throw new Error('A watch must be provided with a callback function.');
        }
        if (properties && !_.isArray(properties)) {
          properties = [properties];
        }
        newVals = {};
        for (_i = 0, _len = properties.length; _i < _len; _i++) {
          propName = properties[_i];
          if (!_.has(normalizedSchema, propName)) {
            throw new Error("Cannot set watch on " + propName + ", property is not defined in schema.");
          }
          newVals[propName] = instance[propName];
        }
        if (properties.length === 1) {
          newVals = newVals[propName];
        }
        cb(newVals, newVals);
        watcher = {
          properties: properties,
          cb: cb
        };
        instance._watchers.push(watcher);
        return function() {
          return instance._removeWatcher(watcher);
        };
      }
    });
    Object.defineProperty(instance, '_removeWatcher', {
      configurable: false,
      enumerable: false,
      writable: true,
      value: function(watcher) {
        return _.remove(instance._watchers, watcher);
      }
    });
    Object.defineProperty(instance, '_fireWatchers', {
      configurable: false,
      enumerable: false,
      writable: true,
      value: function(prevVals) {
        var cached, getCurrentVal, getPrevVal, newVals, oldVals, propName, shouldFire, triggeringProperties, watcher, _i, _j, _len, _len1, _ref, _ref1, _results;
        triggeringProperties = _.keys(prevVals);
        cached = {};
        getCurrentVal = function(propName) {
          var val;
          if (cached[propName]) {
            return cached[propName];
          } else {
            val = instance[propName];
            cached[propName] = val;
            return val;
          }
        };
        getPrevVal = function(propName) {
          if (_.has(prevVals, propName)) {
            return prevVals[propName];
          } else {
            return getCurrentVal(propName);
          }
        };
        _ref = instance._watchers;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          watcher = _ref[_i];
          shouldFire = _.intersection(triggeringProperties, watcher.properties).length > 0;
          if (shouldFire) {
            newVals = {};
            oldVals = {};
            _ref1 = watcher.properties;
            for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
              propName = _ref1[_j];
              newVals[propName] = getCurrentVal(propName);
              oldVals[propName] = getPrevVal(propName);
            }
            if (watcher.properties.length === 1) {
              propName = watcher.properties[0];
              newVals = newVals[propName];
              oldVals = oldVals[propName];
            }
            _results.push(watcher.cb(newVals, oldVals));
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      }
    });
    _fn = (function(_this) {
      return function(propName, propConfig) {
        Object.defineProperty(instance, propName, {
          configurable: false,
          enumerable: true,
          set: function(val) {
            return instance.set(propName, val);
          },
          get: function() {
            return instance.get(propName);
          }
        });
        if (propConfig["default"] !== void 0) {
          return instance[propName] = (typeof propConfig["default"] === "function" ? propConfig["default"]() : void 0) || propConfig["default"];
        }
      };
    })(this);
    for (propName in normalizedSchema) {
      propConfig = normalizedSchema[propName];
      _fn(propName, propConfig);
    }
    if (seal) {
      return Object.seal(instance);
    }
  };

  if (isNode) {
    module.exports = Scheming;
  } else {
    root.Scheming = Scheming;
  }

}).call(this);

//# sourceMappingURL=Scheming.js.map
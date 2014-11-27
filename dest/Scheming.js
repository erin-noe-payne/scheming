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
      }
    },
    Number: {
      ctor: Number,
      string: 'number',
      identifier: _.isNumber,
      parser: parseFloat
    },
    Integer: {
      string: 'integer',
      identifier: function(val) {
        return _.isNumber(val) && val % 1 === 0;
      },
      parser: parseInt
    },
    Date: {
      ctor: Date,
      string: 'date',
      identifier: _.isDate,
      parser: function(val) {
        return new Date(val);
      }
    },
    Boolean: {
      ctor: Boolean,
      string: 'boolean',
      identifier: _.isBoolean,
      parser: function(val) {
        return !!val;
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
      parser: _.identity
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
      childParser: null
    },
    Schema: {
      ctor: Object,
      string: 'schema',
      identifier: null,
      parser: null,
      childType: null
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
      validators: null,
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
    definition.validators = validate;
    definition.required = required;
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

      function Schema(model) {
        var key, value;
        instanceFactory(this, normalizedSchema, opts);
        for (key in model) {
          value = model[key];
          this[key] = value;
        }
      }

      return Schema;

    })();
  };

  instanceFactory = function(instance, normalizedSchema, opts) {
    var data, propConfig, propName, seal, strict, _fn;
    data = {};
    strict = opts.strict, seal = opts.seal;
    _fn = (function(_this) {
      return function(propName, propConfig) {
        var getter, setter, type;
        type = propConfig.type, getter = propConfig.getter, setter = propConfig.setter;
        Object.defineProperty(instance, propName, {
          configurable: false,
          enumerable: true,
          set: function(val) {
            if (val === void 0) {
              return data[propName] = val;
            }
            if (!type.identifier(val)) {
              if (strict) {
                throw new Error("Error assigning " + val + " to " + propName + ". Value is not of type " + type.string);
              }
              val = type.parser(val);
            }
            if (setter) {
              val = setter(val);
            }
            return data[propName] = val;
          },
          get: function() {
            var val;
            val = data[propName];
            if (val === void 0) {
              return val;
            }
            if (getter) {
              val = getter(val);
            }
            if (type.string === NESTED_TYPES.Array.string) {
              val = type.childParser(val);
            }
            return val;
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
    Object.defineProperty(instance, '_validating', {
      writable: true,
      value: false
    });
    instance.validate = function() {
      var childErrors, e, err, errors, i, k, key, member, pushError, required, type, v, val, validator, validators, value, _i, _j, _len, _len1;
      errors = {};
      if (this._validating) {
        return null;
      }
      this._validating = true;
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
        validators = value.validators, required = value.required;
        val = this[key];
        if (required && (val == null)) {
          pushError(key, "Field is required.");
        }
        if (val != null) {
          type = normalizedSchema[key].type;
          for (_i = 0, _len = validators.length; _i < _len; _i++) {
            validator = validators[_i];
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
            childErrors = val.validate();
            for (k in childErrors) {
              v = childErrors[k];
              pushError("" + key + "." + k, v);
            }
          }
          if (type.string === 'array' && type.childType.string === 'schema') {
            for (i = _j = 0, _len1 = val.length; _j < _len1; i = ++_j) {
              member = val[i];
              childErrors = member.validate();
              for (k in childErrors) {
                v = childErrors[k];
                pushError("" + key + "[" + i + "]." + k, v);
              }
            }
          }
        }
      }
      this._validating = false;
      if (_.size(errors) === 0) {
        return null;
      } else {
        return errors;
      }
    };
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
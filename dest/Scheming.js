(function() {
  var NESTED_TYPES, RESERVED_PROPERTIES, Scheming, TYPES, addToRegistry, getPrimitiveTypeOf, isNode, registry, root, uuid, _,
    __slice = [].slice;

  root = this;

  isNode = typeof exports !== 'undefined' && typeof module !== 'undefined' && module.exports;

  if (isNode) {
    _ = require('lodash');
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

  RESERVED_PROPERTIES = {
    validate: 'validate'
  };


  /*
      *# TYPES
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
    Float: {
      string: 'float',
      identifier: _.isNumber,
      parser: parseFloat
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
    TYPES: TYPES,
    NESTED_TYPES: NESTED_TYPES,
    RESERVED_PROPERTIES: RESERVED_PROPERTIES
  };


  /*
     *# resolveType
    Resolves a type declaration to a type. This function is used internally when normalizing a schema,
    and goes through the following steps:
   */

  Scheming.resolveType = function(typeDef) {
    var childType, fn, resolveSchemaType, type, _fn, _i, _len, _ref;
    type = getPrimitiveTypeOf(typeDef);
    if (type == null) {

      /*
      - If the type definition is an array `[]`
        - Resolve the type of the array's children, defaulting to a Mixed type
        - Set identifier and parser rules for the child type
       */
      if (_.isArray(typeDef)) {
        type = _.cloneDeep(NESTED_TYPES.Array);
        childType = TYPES.Mixed;
        if (typeDef.length) {
          childType = Scheming.resolveType(typeDef[0]);
          if (!childType) {
            throw new Error("Error resolving " + typeDef);
          }
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
        - Set identifier and parser functions
       */
      if (_.isPlainObject(typeDef)) {
        type = _.cloneDeep(NESTED_TYPES.Schema);
        childType = Scheming.create(typeDef);
        resolveSchemaType(type, childType);
      }

      /*
      - If the type definition is a reference to a Schema constructor
        - Treat the field as a nested Schema
        - Set identifier and parser functions
       */
      if (_.isFunction(typeDef) && typeDef.__skemaId) {
        type = _.cloneDeep(NESTED_TYPES.Schema);
        childType = typeDef;
        resolveSchemaType(type, childType);
      }

      /*
      - If the type definition is a string that begins with Schema:, such as `'Schema:Car'`
        - It is assumed that the field is a reference to a nested Schema that will be registered with the name Car,
      but may not be registered yet
        - The Schema is not resolved immediately
        - The parser and identifier functions are written so that the first time they are invoked, the Schema will be
      looked up at that time via `Scheming.get`
        - Set the identifier and parser functions based on the resolved schema
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
     *# normalizeProperty
    `Scheming.normalizeProperty(config, [fieldName])`
    Normalizes a field declaration on a schema to capture type, default value, setter, getter, and validation.
    Used internally when a schema is created to build a normalized schema definition.
    - config *object* - The field configuration. If the config value is anything other than an object with a type key,
    its value will be treated as the type argument, and all other keys will be given their default values.
    Accepts the following keys.
      - config.type *type identifier* - An identifier value that is passed to the `resolveType` method. Should resolve to
    a valid type primitive or nested type.
      - config.default * - The default value to assign at construction.
      - config.getter *function* - A getter function that will be executed on the value before retrieval. Receives the
    raw value as input, and should return the modified value.
      - config.setter *function* - A setter function that will be executed on the value before assignment. Receives the
    raw value as input (after type parser), and should return the modified value.
      - config.validate *function* or *[function]* - One or more validation functions. Validation functions are executed
    on defined property values of an instance when the `.validate()` method is invoked. See validation documentation for
    further details. Values received by validators are already processed by the getter function.
      - config.required *boolean* - True if the field is required. Will return a validation error when the `.validate()`
    method is executed on an instance if it is not defined.
    - fieldName *string* - Optional field name for clearer messaging in the case of config errors.
  
    **Examples**
    ```
    // All of the below create a field with a type of string
    Schema.normalizeProperty String
  
    Scheming.normalizeProperty type : 'string'
  
    Scheming.normalizeProperty type : Scheming.TYPES.String
  
    // Defines a field with type of array of string
    Scheming.normalizeProperty type : [String]
  
    // Defines a field with a nested Schema type
    Scheming.normalizeProperty {name : String, age : Number}
  
    Scheming.normalizeProperty type : {name : String, age : Number}
  
    // Defines a field with all properties
    Scheming.normalizeProperty
      type : Number
      default : 2
      getter : (val) -> val * 2
      setter : (val) -> val * 2
      validate : (val) -> val % 2 == 0
      required : true
    ```
   */

  Scheming.normalizeProperty = function(config, fieldName) {
    var definition, fn, getter, required, setter, type, validate, _i, _len;
    if (fieldName == null) {
      fieldName = 'field';
    }
    definition = {
      type: null,
      "default": null,
      getter: null,
      setter: null,
      validators: null,
      required: false
    };
    if (!(_.isPlainObject(config) && (config.type != null))) {
      config = {
        type: config
      };
    }
    type = config.type, getter = config.getter, setter = config.setter, validate = config.validate, required = config.required;
    if (type == null) {
      throw new Error("Error resolving " + fieldName + ". Schema type must be defined.");
    }
    if ((getter != null) && !_.isFunction(getter)) {
      throw new Error("Error resolving " + fieldName + ". Schema getter must be a function.");
    }
    if ((setter != null) && !_.isFunction(setter)) {
      throw new Error("Error resolving " + fieldName + ". Schema setter must be a function.");
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
        throw new Error("Error resolving " + fieldName + ". Schema validate must be a function or array of functions.");
      }
    }
    definition.type = Scheming.resolveType(type);
    if (definition.type == null) {
      throw new Error("Error resolving " + fieldName + ". Unrecognized type " + type);
    }
    definition["default"] = config["default"];
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


  /*
     *# create
    `Scheming.create([name], schemaConfig, [opts])`
    - name *string* *optional* - Assigns a name to the schema for internal registration. If no name is provided
    the schema will be registered with a uuid. Naming a schema is necessary if you want to retrieve your schema later
    using `Scheming.get`, or to use lazy-loaded Schema types using the `'Schema:Name'` syntax.
    - schemaConfig *object* - An object that defines the schema. Keys represent property names, values define the property
    configuration. At a minimum, a property should provide its type. Property configuration can also include getter
    and setter functions, a default value, one or more validation functions, and a required flag. Each key / value pair
    is passed to the `normalizeProperty` function.
    - opts * object* *optional* - Schema options.
      - seal *boolean=false* - Indicates whether instances of the Schema should be run through `Object.seal`, disabling the
    ability to attach arbitrary properties not defined by the Schema.
      - strict *boolean=false* - Indicates whether type coercion should be allowed. By default, assigned values are
    parsed by their type parser if they fail the identifier check. If strict is true, assignment will instead throw an
    error if an assigned value does not match the property type.
   */

  Scheming.create = function() {
    var Schema, args, name, normalizedSchema, opts, schemaConfig, seal, strict;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    if (!_.isString(args[0])) {
      args.unshift(uuid());
    }
    name = args[0], schemaConfig = args[1], opts = args[2];
    if (opts == null) {
      opts = {};
    }
    seal = opts.seal, strict = opts.strict;
    normalizedSchema = {};
    Schema = (function() {
      Schema.__skemaId = name;

      Schema.defineProperties = function(config) {
        var k, v, _results;
        _results = [];
        for (k in config) {
          v = config[k];
          _results.push(this.defineProperty(k, v));
        }
        return _results;
      };

      Schema.defineProperty = function(fieldName, config) {
        return normalizedSchema[fieldName] = Scheming.normalizeProperty(config, fieldName);
      };

      function Schema(model) {
        var data, fieldName, key, typeDefinition, value, _fn;
        data = {};
        Object.defineProperty(this, '__skemaId', {
          enumerable: false,
          configurable: false,
          writable: false,
          value: Schema.__skemaId
        });
        _fn = (function(_this) {
          return function(fieldName, typeDefinition) {
            var getter, setter, type;
            type = typeDefinition.type, getter = typeDefinition.getter, setter = typeDefinition.setter;
            Object.defineProperty(_this, fieldName, {
              configurable: true,
              enumerable: true,
              get: function() {
                var val;
                val = data[fieldName];
                if (val === void 0) {
                  return val;
                }
                if (type.string === NESTED_TYPES.Array.string) {
                  val = type.childParser(val);
                }
                if (getter) {
                  val = getter(val);
                }
                return val;
              },
              set: function(val) {
                if (!type.identifier(val)) {
                  if (strict) {
                    throw new Error("Error assigning " + val + " to " + fieldName + ". Value is not of type " + type.string);
                  }
                  val = type.parser(val);
                }
                if (setter) {
                  val = setter(val);
                }
                return data[fieldName] = val;
              }
            });
            if (typeDefinition["default"] === !void 0) {
              return _this[fieldName] = typeDefinition["default"];
            }
          };
        })(this);
        for (fieldName in normalizedSchema) {
          typeDefinition = normalizedSchema[fieldName];
          _fn(fieldName, typeDefinition);
        }
        for (key in model) {
          value = model[key];
          this[key] = value;
        }
        if (seal) {
          Object.seal(this);
        }
        this.validate = function() {
          var childErrors, e, err, errors, i, k, member, pushError, required, type, v, val, validator, validators, _i, _j, _len, _len1;
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
      }

      return Schema;

    })();
    Schema.defineProperties(schemaConfig);
    addToRegistry(name, Schema);
    return Schema;
  };

  if (isNode) {
    module.exports = Scheming;
  } else {
    root.Scheming = Scheming;
  }

}).call(this);

//# sourceMappingURL=Scheming.js.map
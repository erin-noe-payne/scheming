(function() {
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

}).call(this);

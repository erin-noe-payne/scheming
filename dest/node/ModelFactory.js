(function() {
  var InstanceFactory, ModelFactory, Registry, Types, _,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    slice = [].slice;

  _ = require('lodash');

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

}).call(this);

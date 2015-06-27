_ = require 'lodash'
Types = require './Types'
InstanceFactory = require './InstanceFactory'
Registry = require './Registry'


class ModelFactory

  # ### DEFAULT_OPTIONS
  # Default options for `Schema.create`
  DEFAULT_OPTIONS :
    seal   : false
    strict : false

  constructor : ->
    @nameCounter=0

  generateName : =>
    return "SchemingModel#{@nameCounter++}"

  # ### normalizePropertyConfig
  ###
    Normalizes a field declaration on a schema to capture type, default value, setter, getter, and validation.
    Used internally when a schema is created to build a normalized schema definition.
  ###
  normalizePropertyConfig : (propConfig, propName = 'field') =>
    # initialize normalized property definition that we will return
    definition =
      type       : null
      default    : null
      getter     : null
      setter     : null
      validate   : null
      required   : false

    # if property configuration is not an object with a type key, assume that
    # the configuration value is just the property type
    if !(_.isPlainObject(propConfig) && propConfig.type?)
      propConfig = {type : propConfig}

    {type, getter, setter, validate, required} = propConfig
    # This function throws errors on any bad configuration, attempting to fail fast.

    # - Throw an error if type is not defined. Type must always be explicitly declared. Untyped fields
    # must explicitly declared as Schema.TYPES.Mixed
    if !type?
      throw new Error "Error resolving #{propName}. Schema type must be defined."
    # - Throw an error if getter is not a function
    if getter? && !_.isFunction getter
      throw new Error "Error resolving #{propName}. Schema getter must be a function."
    # - Throw an error if setter is not a function
    if setter? && !_.isFunction setter
      throw new Error "Error resolving #{propName}. Schema setter must be a function."

    validate ?= []
    # - If validate is a single function, transform to an array with one member
    if !_.isArray(validate)
      validate = [validate]
    # - Check that all validate are a function, throw an error if it is not.
    for fn in validate
      if !_.isFunction fn
        throw new Error "Error resolving #{propName}. Schema validate must be a function or array of functions."

    # - Resolve the declared type
    definition.type = Types.resolveType type

    # - If type could not be resolved, throw an error
    if !definition.type?
      throw new Error "Error resolving #{propName}. Unrecognized type #{type}"

    # `default` is a reserved word, so we can't do the nice clean denatured assignment
    definition.default = propConfig.default
    definition.getter = getter
    definition.setter = setter
    definition.validate = validate
    definition.required = required

    # allow any custom properties to be exposed on the definition object
    definition = _.extend {}, propConfig, definition

    # Return a valid property configuration
    return definition

  nameFunction : (name, fn) =>
    fnStr = "return function #{name}(){return fn.apply(this, arguments)}"
    try
      renamed = new Function('fn', fnStr)(fn)
    catch err
      throw new Error "#{name} is not a valid function name."

    _.extend renamed, fn
    _.extend renamed.prototype, fn.prototype

    return renamed

  # ### create
  # Creates a new Schema constructor
  create : (args...) =>
    factory = @
    # If the first argument is a string, then the Schema is being named & registered. Otherwise, it is being
    # created anonymously, and we need to give it a uuid for registration.
    if !_.isString(args[0])
      args.unshift @generateName()

    # Get name, config, and options from the create arguments
    [name, schemaConfig, opts] = args

    # Set options, defaulting to the Scheming.DEFAULT_OPTIONS
    opts = _.defaults (opts || {}), @DEFAULT_OPTIONS

    # Normalized Schema is captured in closure
    normalizedSchema = {}

    # Create the new Model
    class Model
      # __schemaId property references the schema name and identifies Schema constructors from any other function
      @__schemaId       : name

      # ### defineProperty
      # Defines a property on the normalized schema, which is used at time of instance construction
      @defineProperty   : (propName, propConfig) ->
        if !_.isString(propName)
          throw new Error "First argument: property name must be a string."
        if !propConfig?
          throw new Error "Second argument: property configuration is required."
        normalizedSchema[propName] = factory.normalizePropertyConfig(propConfig, propName)

      # ### defineProperties
      # Convenience method for defining properties in bulk
      @defineProperties : (config) ->
        if !_.isPlainObject(config)
          throw new Error "First argument: properties must be an object."
        for k, v of config
          @defineProperty k, v

      # ### getProperties
      # returns a clone of the normalized Schema
      @getProperties : ->
        return _.cloneDeep normalizedSchema

      # ### getProperty
      # returns a clone of the normalized Schema property
      @getProperty : (propName) ->
        return _.cloneDeep normalizedSchema[propName]

      # ### eachProperty
      # Iterates over each property name and configuration of the schema, invoking the provided callback
      @eachProperty : (cb) ->
        if !_.isFunction(cb)
          throw new Error "First argument: callback must be a function."
        for propName, propConfig of normalizedSchema
          cb propName, _.cloneDeep propConfig

      # ### validate
      # Run validation on an instance of the schema
      @validate : (instance) ->
        # Create errors hash that will be returned on any validation failure.
        errors = {}

        # Flag validating state to prevent infinite loop in the case of circular references
        if instance._validating then return null
        instance._validating = true

        # Factored code to push error messages onto the errors hash
        pushError = (key, error) ->
          if _.isArray error
            return pushError(key, err) for err in error
          if !_.isString error
            error = 'Validation error occurred.'
          errors[key] ?= []
          errors[key].push error

        # Apply validation rules
        for key, value of normalizedSchema
          {validate, required} = value

          # - Retrieve value. This will be affected by getters.
          val = instance[key]

          # - If the field is required and not defined, push the error and be done
          if required && !val?
            requiredMessage = if _.isString(required) then required else "Field is required."
            pushError key, requiredMessage
          # - Only run validation on fields that are defined
          if val?
            {type} = normalizedSchema[key]

            # - Run each validator on the field value
            for validator in validate
              err = true
              # - Accept error strings that are returned, or errors that are thrown during processing
              try
                err = validator.call(instance, val)
              catch e
                if e then err = e.message
              # - If any validation errors are detected, push them
              if err != true then pushError key, err

            # - Additionally, if the property is a nested schema, run its validation
            if type.string == 'schema'
              childErrors = type.childType.validate.call(instance, val)
              for k, v of childErrors
                #   - The key on the errors hash should be the path to the field that had a validation error
                pushError "#{key}.#{k}", v
            # - If the property is an array of schemas, run validation on each member of the array
            if type.string == 'array' && type.childType.string == 'schema'
              for member, i in val
                childErrors = type.childType.childType.validate.call(instance, member)
                for k, v of childErrors
                  #   - Again, the key on the errors hash should be the path to the field that had a validation error
                  pushError "#{key}[#{i}].#{k}", v

          # Unset flag, indicating validation is complete
        instance._validating = false

        # Return null if no validation errrors ocurred
        if _.size(errors) == 0
          return null
        else
          return errors

      # ### constructor
      # Constructor that builds instances of the Schema
      constructor       : (initialState) ->

        # turn `this` into a Model instance
        InstanceFactory.create(@, normalizedSchema, initialState, opts)

    Model = @nameFunction name, Model

    # Define properties on the Schema based on the schema configuration
    if schemaConfig? then Model.defineProperties schemaConfig

    # Register the new Schema by the name provided or generated
    Registry.register name, Model

    return Model

module.exports = new ModelFactory()

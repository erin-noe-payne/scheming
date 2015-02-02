# # Annotated Source

# Support node.js or browser environments
root = @

isNode = typeof exports != 'undefined' && typeof module != 'undefined' && module.exports

# Depends on lodash
if isNode
  _ = require 'lodash'
else
  _ = window._

# Uuid generator for anonymous Schema ids
uuid = ->
  now = Date.now()
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace /[xy]/g, (c) ->
    r = (now + Math.random() * 16) % 16 | 0
    now = Math.floor now / 16
    ((if c is "x" then r else (r & 0x3 | 0x8))).toString 16

# ## Scheming

# ### DEFAULT_OPTIONS
# Default options for `Schema.create`
DEFAULT_OPTIONS =
  seal   : false
  strict : false

# ### TYPES
###
  Scheming exports the default types that it uses for parsing schemas. You can extend with custom types, or
  override the identifier / parser functions of the default types. A custom type should provide:
   - ctor (optional) - Used in schema definitions to declare a type. `Scheming.create name : String`
   - string - Used in schema definitions to declare a type. `Scheming.create name : 'string'`
   - identifier - Function, returns true or false. Determines whether a value needs to be parsed.
   - parser - Function, parses a value into the type.
###
TYPES =
  String  :
    ctor       : String
    string     : 'string'
    identifier : _.isString
    parser     : (val) ->
      '' + val
    equals     : (a, b) -> a==b
  Number  :
    ctor       : Number
    string     : 'number'
    identifier : _.isNumber
    parser     : parseFloat
    comparator : (a, b) -> a==b
    equals     : (a, b) -> a==b
  Integer :
    string     : 'integer'
    identifier : (val) ->
      _.isNumber(val) && val % 1 == 0
    parser     : parseInt
    equals     : (a, b) -> a==b
  Date    :
    ctor       : Date
    string     : 'date'
    identifier : _.isDate
    parser     : (val) ->
      new Date val
    equals     : (a, b) -> a?.valueOf() == b?.valueOf()
  Boolean :
    ctor       : Boolean
    string     : 'boolean'
    identifier : _.isBoolean
    parser     : (val) ->
      !!val
    equals     : (a, b) -> a==b
  Mixed   :
    ctor       : (val) ->
      val
    string     : '*'
    identifier : ->
      true
    parser     : _.identity
    equals     : (a, b) -> a==b

# ### NESTED_TYPES
###
  Special type definitions for nested types. Used to identify and parse nested Arrays and Schemas.
  Should not be extended or overridden.
###
NESTED_TYPES =
  Array  :
    ctor        : Array
    string      : 'array'
    identifier  : _.isArray
    parser      : _.toArray
    childType   : null
    childParser : null
    equals     : (a, b) -> _.isEqual a, b
  Schema :
    ctor       : Object
    string     : 'schema'
    identifier : null
    parser     : null
    childType  : null
    equals     : (a, b) -> a == b


# Used internally to resolve a type declaration to its primitive type.
# Matches a primitive type if it is...
# - a reference to the object straight from the `Schema.TYPES` object
# - a reference to the `ctor`
# - a match with the type `string` (case insensitive)
getPrimitiveTypeOf = (type) ->
  for k, TYPE of TYPES
    if type == TYPE or
        (TYPE.ctor && type == TYPE.ctor) or
        type?.toLowerCase?() == TYPE.string

      return TYPE

  return null

# Expose TYPES and DEFAULT_OPTIONS for extension and overriding
Scheming = {uuid, TYPES, NESTED_TYPES, DEFAULT_OPTIONS}

# ### resolveType
# Resolves a type declaration to a primitive or nested type. Used internally when normalizing a schema.
Scheming.resolveType = (typeDef) ->
  # - Attempt to resolve the type declaration to a primitive type
  type = getPrimitiveTypeOf typeDef

  if !type?
    # - If the type definition is an array `[]`
    if _.isArray typeDef
      #   - Set the type to a clone of the array NESTED_TYPE
      type = _.cloneDeep NESTED_TYPES.Array

      #   - Recurse to resolve childType of array members
      if typeDef.length
        childType = Scheming.resolveType(typeDef[0])

      #   - Throw an error if type is not explicitly declared
      if !childType then throw new Error "Error resolving type of array value #{typeDef}"

      type.childType = childType
      #   - Write parser for child members of the array
      type.childParser = (val) ->
        for index, member of val
          if !childType.identifier(member)
            val[index] = childType.parser(member)

        return val

    # Function that builds identifier and parser for nested schema types. Needs to be factored out
    # because nested schemas may be resolved lazily at a later time
    resolveSchemaType = (type, childType) ->
      type.childType = childType
      type.identifier = (val) ->
        return val instanceof childType
      type.parser = (val) ->
        return new childType(val)

    ###
    - If the type definition is an object `{}`
      - Create a new Schema from the object
      - Treat the field as a nested Schema
      - Set identifier and parser functions immediately
    ###
    if _.isPlainObject typeDef
      type = _.cloneDeep NESTED_TYPES.Schema
      childType = Scheming.create typeDef
      resolveSchemaType type, childType

    ###
    - If the type definition is a reference to a Schema constructor
      - Treat the field as a nested Schema
      - Set identifier and parser functions immediately
    ###
    if _.isFunction(typeDef) && typeDef.__schemaId
      type = _.cloneDeep NESTED_TYPES.Schema
      childType = typeDef
      resolveSchemaType type, childType

    ###
    - If the type definition is a string that begins with Schema:, such as `'Schema:Car'`
      - It is assumed that the field is a reference to a nested Schema that will be registered with the name Car,
    but may not be registered yet
      - The Schema is not resolved immediately
      - The parser and identifier functions are written as wrappers, so that the first time they are invoked the Schema
    will be looked up at that time via `Scheming.get`, and real identifier and parser are set at that time.
      - If the registered Schema cannot be resolved, throw an error.
    ###
    if _.isString(typeDef) && typeDef[...7] == 'Schema:'
      type = _.cloneDeep NESTED_TYPES.Schema
      childType = typeDef[7..]
      for fn in ['identifier', 'parser']
        do (fn) ->
          type[fn] = (val) ->
            childType = Scheming.get childType
            if !childType
              throw new Error "Error resolving #{typeDef} on lazy initialization"
            resolveSchemaType type, childType

            return type[fn] val

  return type || null

# ### normalizePropertyConfig
###
  Normalizes a field declaration on a schema to capture type, default value, setter, getter, and validation.
  Used internally when a schema is created to build a normalized schema definition.
###
Scheming.normalizePropertyConfig = (propConfig, propName = 'field') ->
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
  definition.type = Scheming.resolveType type

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

# Internal registry for schemas created by `Scheming.create`. Schemas are registered by their name, which is either
# provided at time of creation, or generated as a uuid.
registry = {}

# Used internally as part of `Scheming.create`, do not need to expose registration outside of Schema creation.
addToRegistry = (key, value) ->
  # Throw an error on naming collisions
  if registry[key]
    throw new Error "Naming conflict encountered. Schema #{key} already exists"
  registry[key] = value

# ### get
# Retrieves a schema by registered name
Scheming.get = (name) ->
  return registry[name]

# ### reset
# Resets the state of the Schema registry. Mainly exposed for testing, but could have use in production.
Scheming.reset = ->
  registry = {}

# ### create
# Creates a new Schema constructor
Scheming.create = (args...) ->
  # If the first argument is a string, then the Schema is being named & registered. Otherwise, it is being
  # created anonymously, and we need to give it a uuid for registration.
  if !_.isString(args[0])
    args.unshift uuid()

  # Get name, config, and options from the create arguments
  [name, schemaConfig, opts] = args

  # Set options, defaulting to the Scheming.DEFAULT_OPTIONS
  opts = _.defaults (opts || {}), DEFAULT_OPTIONS

  # Build a new Schema
  Schema = schemaFactory(name, opts)

  # Define properties on the Schema based on the schema configuration
  Schema.defineProperties schemaConfig

  # Register the new Schema by the name provided or generated
  addToRegistry name, Schema

  return Schema

# ## Schema
# Factory method that builds Schema constructors
schemaFactory = (name, opts) ->
  # Normalized Schema is captured in closure
  normalizedSchema = {}

  class Schema
    # __schemaId property references the schema name and identifies Schema constructors from any other function
    @__schemaId       : name

    # ### defineProperty
    # Defines a property on the normalized schema, which is used at time of instance construction
    @defineProperty   : (propName, propConfig) ->
      normalizedSchema[propName] = Scheming.normalizePropertyConfig(propConfig, propName)

    # ### defineProperties
    # Convenience method for defining properties in bulk
    @defineProperties : (config) ->
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
      pushError = (key, err) ->
        if _.isArray err
          return pushError(key, e) for e in err
        if !_.isString err
          err = 'Validation error occurred.'
        errors[key] ?= []
        errors[key].push err

      # Apply validation rules
      for key, value of normalizedSchema
        {validate, required} = value

        # - Retrieve value. This will be affected by getters.
        val = instance[key]

        # - If the field is required and not defined, push the error and be done
        if required && !val?
          pushError key, "Field is required."
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

      # Return null if no validation errros ocurred
      if _.size(errors) == 0
        return null
      else
        return errors

    # ### constructor
    # Constructor that builds instances of the Schema
    constructor       : (model) ->

      # turn `this` into a Schema instance
      instanceFactory(@, normalizedSchema, opts)

      # Finally, initialize the instance with the model passed to the constructor
      for propName, value of model
        @[propName] = value

# ### Change Manager
# Internal Change Manager class, responsible for queueing and resolving change event propagation for watches
class ChangeManager

  constructor : ->
    @changes = {}
    @internalChangeQueue = []
    @timeout = null

    @recursionCount = 0

  # reset the the change manager to a pristine state
  reset : ->
    @changes = {}
    @internalChangeQueue = []
    @timeout = null

    @recursionCount = 0

  # Registers changes that have occurred on an instance by instance id, holding a reference to the original value
  queueChanges : (id, propName, oldVal, fireWatchers) ->
    # if there are no changes yet queued for the insance, add to the changes hash by id
    if !_.has @changes, id
      @changes[id] ?= {changedProps : {}, fireWatchers}
      @internalChangeQueue.push id
    {changedProps} = @changes[id]

    # for each changed property, track the original value of the property if it has not already been captured.
    if propName && !_.has changedProps, propName
      changedProps[propName] = oldVal
      @internalChangeQueue.push id

    # set a timeout of zero to push the resolution step onto the event queue, once the thread has been released from
    # a synchronous block of changes
    @timeout ?= setTimeout @resolve, 0

  # resolves queued changes, firing watchers on instances that have changed
  resolve : =>
    @recursionCount++
    # track iteration count and throw an error after some limit to prevent infinite loops
    if Scheming.ITERATION_LIMIT > 0 && @recursionCount > Scheming.ITERATION_LIMIT
      changes = @changes
      @reset()
      # TODO: try to make a more meaningful error message from the instances (schema type, properties, etc)
      throw new Error """Aborting change propagation after #{Scheming.ITERATION_LIMIT} cycles.
        This is probably indicative of a circular watch. Check the following watches for clues:
        #{JSON.stringify(changes)}"""

    # clear timeout to guarantee resolve is not called more than once.
    clearTimeout @timeout

    # A single id may have been pushed to the change queue many times, to take a unique list of ids.
    internalChanges = _.unique @internalChangeQueue
    # Immediately reset the state of the change queue
    @internalChangeQueue = []

    # Fire internal watchers on all instances that have changed. This will cause the change event to propagate to
    # any parent schemas, whose changes will populate `@internalChangeQueue`
    for id in internalChanges
      {changedProps, fireWatchers} = @changes[id]
      fireWatchers changedProps, 'internal'
    # if any new internal changes were registered, recursively call resolve to continue propagation
    if @internalChangeQueue.length
      @resolve()

    # Once internal watches have fired without causing a change on a parent schema instance, there are no more changes
    # to propagate. At this point all changes on each instance have been aggregated into a single change set. Now
    # fire all external watchers on each instance.
    changes = @changes
    # Immediately reset the change set
    @changes = {}

    # Fire all external watchers
    for id of changes
      {changedProps, fireWatchers} = changes[id]
      fireWatchers changedProps, 'external'

    # If any external watches caused new changes to be queued, re-run resolve to ensure propagation
    if _.size(@changes) > 0
      @resolve()

    # If we get here, all changes have been fully propagated. Reset change manager state to pristine just for explicitnessgit st
    @reset()

# set up global change manager that will be consumed by all schema instances
cm = new ChangeManager

# Configuration for limiting number of iterations
Scheming.ITERATION_LIMIT = 100

# Synchronously cause the change manager resolve. Should be used for testing ONLY, to avoid having to write
# asynchronous tests.
Scheming._flush = ->
  cm.resolve()

# ## Instance
# Factory method that builds accepts an object and turns it into a Schema instance
instanceFactory = (instance, normalizedSchema, opts)->
  # data hash wrapped in closure, keeps actual data members private
  data = {}
  # private watchers array. External watches - those set by consuming client code - are tracked separately from
  # internal watches - those to watch change propagation on nested schemas
  watchers =
    internal : []
    external : []
  # The unwatch functions from internal watches
  unwatchers = {}

  # Set an id on each instance that is not exposed, is used internally only for change management
  id = uuid()

  {strict, seal} = opts

  # ### Property Setter
  set = (propName, val) ->
    prevVal = data[propName]

    # if the property is not a part of the schema, simply set it on the instance.
    # if the seal option is enabled this will fail silently, otherwise it will allow for arbitrary properties
    if !normalizedSchema[propName]
      return instance[propName] = val

    # retrieve the type, getter, and setter from the normalized field config
    {type, setter} = normalizedSchema[propName]

    # - If a property is set to undefined, do not type cast or run through setter.
    # You should always be able to clear a property.
    if val != undefined
      # - If value is not undefined, run through type identifier to determine if it is the correct type
      if !type.identifier(val)
        #   - If not and strict mode is enabled, throw an error
        if strict then throw new Error "Error assigning #{val} to #{propName}. Value is not of type #{type.string}"
        #   - Otherwise, use parser to cast to the correct type
        val = type.parser val
      # - If the property type is of array, perform parsing on child members.
      if type.string == NESTED_TYPES.Array.string
        val = type.childParser val
      # - If a setter is defined, run the value through setter
      if setter
        val = setter val

    # - Check if the value has changed; if so...
    if !type.equals prevVal, val
      # - Assign to the data hash
      data[propName] = val
      # - If the value being assigned is of type schema, we need to listen for changes to propagate
      watchForPropagation propName, val
      # - Queue up a change to fire
      cm.queueChanges id, propName, prevVal, fireWatchers

  # ### Property Getter
  get = (propName) ->
    # retrieve the type, getter, and setter from the normalized field config
    {getter} = normalizedSchema[propName]

    # - Retrieve data value from the hash
    val = data[propName]
    # - If value is not defined, immediately return it.
    if val is undefined
      return val
    # - If getter is defined, run value through getter
    if getter
      val = getter val
    # - Finally, return the value
    return val

  # Adds a watcher to the instance
  addWatcher = (properties, cb, opts) ->
    # properties and opts arguments are optional
    if _.isFunction properties
      opts = cb
      cb = properties
      # if no properties are specified, the watcher is registered to watch all properties of the object
      properties = _.keys normalizedSchema

    # unless specified, a watch is assumed to be external. Clinet code should not set watches as internal!
    # Behavior is undefined.
    opts ?= {}
    opts.internal ?= false

    target = if opts.internal then 'internal' else 'external'

    if !_.isFunction cb
      throw new Error 'A watch must be provided with a callback function.'

    # Cast the properties to an array. A watch can support one or more property names.
    if properties && !_.isArray properties
      properties = [properties]

    # Throw an error if client code attempts to set a watch on a property that is not defined as part of the schema.
    for propName in properties
      if !_.has normalizedSchema, propName
        throw new Error "Cannot set watch on #{propName}, property is not defined in schema."

    # Register the watcher on the correct internal or external watchers array. Flag new watchers with `first` so that
    # they will get called on the first change loop, regardless of whether the watch properties have changed.
    watcher = {properties, cb, first : true}
    watchers[target].push watcher

    # Queue a change event on the change manager.
    cm.queueChanges id, null, null, fireWatchers

    # return an unwatch function
    return ->
      removeWatcher watcher, target

  # Remove a watch listener from the appropraite watchers array
  removeWatcher = (watcher, target) ->
    _.remove watchers[target], watcher

  # This function is called on value assignment
  watchForPropagation = (propName, val) ->
    {type} = normalizedSchema[propName]

    # If the assigned property is of type schema, we need to listen for changes on the child instance to propagate
    # changes to this instance
    if type.string == NESTED_TYPES.Schema.string
      # If there was a watcher from the previously assigned value, stop listening.
      unwatchers[propName]?()
      # Watch the new value for changes and propagate this changes to this instance. Flag the watch as internal.
      unwatchers[propName] = val?.watch (newVal, oldVal)->
        cm.queueChanges id, propName, oldVal, fireWatchers

      , internal : true

    # If the assigned property is an array of type schema, set a watch on each array memeber.
    if type.string == NESTED_TYPES.Array.string and type.childType.string == NESTED_TYPES.Schema.string
      # If there were watchers on the previous array members, clear those listeners.
      for unwatcher in (unwatchers[propName] || [])
        unwatcher?()
      # reset the unwatchers array
      unwatchers[propName] = []
      # set a new watch on each array member to propagate changes to this instance. Flag the watch as internal.
      _.each val, (schema, i) ->
        unwatchers[propName].push schema?.watch (newVal, oldVal)->
          oldArray = _.cloneDeep instance[propName]
          oldArray[i] = oldVal
          cm.queueChanges id, propName, oldArray, fireWatchers
        , internal : true

  # Given a change set, fires all watchers that are watching one or more of the changed properties
  fireWatchers = (queuedChanges, target='external') ->
    triggeringProperties = _.keys queuedChanges

    # Retrieves the previous value for a property, pulling from queued changes if present, otherwise retreiving
    # current value - i.e. no change.
    getPrevVal = (propName) ->
      if _.has queuedChanges, propName
        return queuedChanges[propName]
      else
        return instance[propName]

    # for each registered watcher - use a while loop since firing one watcher can cause other watchers to be added or
    # removed
    i = 0
    while (watcher = watchers[target][i])
      i++
      # That watcher should fire if it is new, or if it is watching one or more of the changed properties
      shouldFire = watcher.first || (_.intersection(triggeringProperties, watcher.properties).length > 0)
      watcher.first = false
      if shouldFire
        newVals = {}
        oldVals = {}

        # build the hash of new / old values
        for propName in watcher.properties
          newVals[propName] = instance[propName]
          oldVals[propName] = getPrevVal(propName)

        # if the watcher is set against a single property, invoke the callback with the raw new / old values
        if watcher.properties.length == 1
          propName = watcher.properties[0]
          newVals = newVals[propName]
          oldVals = oldVals[propName]

        try
          watcher.cb newVals, oldVals
        catch e
          # TODO: browser support?
          console.error e.stack || e

  # ### watch
  # Watches an instance for changes to one or more properties
  Object.defineProperty instance, 'watch',
    configurable : false
    enumerable : false
    writable : false
    value : (properties, cb, opts) -> addWatcher properties, cb, opts

  # Define a validating flag, which is used to prevent infinite loops on validation of circular references
  Object.defineProperty instance, '_validating',
    configurable : false
    enumerable : false
    writable : true
    value : false

  # ### constructor
  # for each property of the normalized schema
  for propName, propConfig of normalizedSchema
    do (propName, propConfig) =>
      # define an enumerable property on the instance that is not configurable
      # user get and set to manage getters, setters, and type parsing
      Object.defineProperty instance, propName,
        configurable : false
        enumerable   : true
        # **set**
        set          : (val) -> set propName, val
        # **get**
        get          : -> get propName

      # Once the property is configured, assign a default value. This ensures that default values are still
      # affected by type parsing and setters
      if propConfig.default != undefined
        val = if _.isFunction(propConfig.default) then propConfig.default() else propConfig.default
        instance[propName] = val

  # If seal option is enabled, seal the instance, preventing addition of other properties besides those explicitly
  # defined by the Schema
  if seal
    Object.seal instance

# All done. Export onto the correct root.
if isNode
  module.exports = Scheming
else
  root.Scheming = Scheming
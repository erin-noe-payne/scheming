# # Scheming

# Support node.js or browser environments
root = @

isNode = typeof exports != 'undefined' && typeof module != 'undefined' && module.exports

if isNode
  _ = require 'lodash'

# Uuid generator for anonymous Schema ids
uuid = ->
  now = Date.now()
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace /[xy]/g, (c) ->
    r = (now + Math.random() * 16) % 16 | 0
    now = Math.floor now / 16
    ((if c is "x" then r else (r & 0x7 | 0x8))).toString 16

DEFAULT_OPTIONS =
  seal : false
  strict : false

RESERVED_PROPERTIES =
  validate : 'validate'

###
   ## TYPES
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
  Number  :
    ctor       : Number
    string     : 'number'
    identifier : _.isNumber
    parser     : parseFloat
  Integer :
    string     : 'integer'
    identifier : (val) ->
      _.isNumber(val) && val % 1 == 0
    parser     : parseInt
  Float   :
    string     : 'float'
    identifier : _.isNumber
    parser     : parseFloat
  Date    :
    ctor       : Date
    string     : 'date'
    identifier : _.isDate
    parser     : (val) ->
      new Date val
  Boolean :
    ctor       : Boolean
    string     : 'boolean'
    identifier : _.isBoolean
    parser     : (val) ->
      !!val
  Mixed   :
    ctor       : (val) ->
      val
    string     : '*'
    identifier : ->
      true
    parser     : _.identity

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
  Schema :
    ctor       : Object
    string     : 'schema'
    identifier : null
    parser     : null
    childType  : null

# Used internally to resolve a type declaration to its primitive type.
getPrimitiveTypeOf = (type) ->
  for k, TYPE of TYPES
    if type == TYPE or
        (TYPE.ctor && type == TYPE.ctor) or
        type?.toLowerCase?() == TYPE.string

      return TYPE

  return null

Scheming = {TYPES, NESTED_TYPES, RESERVED_PROPERTIES, DEFAULT_OPTIONS}

###
  ## resolveType
  Resolves a type declaration to a type. This function is used internally when normalizing a schema,
  and goes through the following steps:
###
Scheming.resolveType = (typeDef) ->
  #- Attempt to resolve the type declaration to a primitive type
  type = getPrimitiveTypeOf typeDef

  if !type?
    ###
    - If the type definition is an array `[]`
      - Resolve the type of the array's children, defaulting to a Mixed type
      - Set identifier and parser rules for the child type
    ###
    if _.isArray typeDef
      type = _.cloneDeep NESTED_TYPES.Array
      childType = TYPES.Mixed

      if typeDef.length
        childType = Scheming.resolveType(typeDef[0])
        if !childType then throw new Error "Error resolving #{typeDef}"

      type.childType = childType
      type.childParser = (val) ->
        for index, member of val
          if !childType.identifier(member)
            val[index] = childType.parser(member)

        return val

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
      - Set identifier and parser functions
    ###
    if _.isPlainObject typeDef
      type = _.cloneDeep NESTED_TYPES.Schema
      childType = Scheming.create typeDef
      resolveSchemaType type, childType

    ###
    - If the type definition is a reference to a Schema constructor
      - Treat the field as a nested Schema
      - Set identifier and parser functions
    ###
    if _.isFunction(typeDef) && typeDef.__skemaId
      type = _.cloneDeep NESTED_TYPES.Schema
      childType = typeDef
      resolveSchemaType type, childType

    ###
    - If the type definition is a string that begins with Schema:, such as `'Schema:Car'`
      - It is assumed that the field is a reference to a nested Schema that will be registered with the name Car,
    but may not be registered yet
      - The Schema is not resolved immediately
      - The parser and identifier functions are written so that the first time they are invoked, the Schema will be
    looked up at that time via `Scheming.get`
      - Set the identifier and parser functions based on the resolved schema
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

###
  ## normalizeProperty
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
###
Scheming.normalizeProperty = (config, fieldName='field') ->
  definition =
    type       : null
    default    : null
    getter     : null
    setter     : null
    validators : null
    required   : false

  if !(_.isPlainObject(config) && config.type?)
    config = {type : config}

  {type, getter, setter, validate, required} = config

  if !type?
    throw new Error "Error resolving #{fieldName}. Schema type must be defined."
  if getter? && !_.isFunction getter
    throw new Error "Error resolving #{fieldName}. Schema getter must be a function."
  if setter? && !_.isFunction setter
    throw new Error "Error resolving #{fieldName}. Schema setter must be a function."

  validate ?= []
  if !_.isArray(validate)
    validate = [validate]
  for fn in validate
    if !_.isFunction fn
      throw new Error "Error resolving #{fieldName}. Schema validate must be a function or array of functions."

  definition.type = Scheming.resolveType type

  if !definition.type?
    throw new Error "Error resolving #{fieldName}. Unrecognized type #{type}"

  definition.default = config.default
  definition.getter = getter
  definition.setter = setter
  definition.validators = validate
  definition.required = required

  return definition

# Internal registry for schemas created by `Scheming.create`. Schemas are registered by their name, which is either
# provided at time of creation, or generated as a uuid.
registry = {}

addToRegistry = (key, value) ->
  if registry[key]
    throw new Error "Naming conflict encountered. Schema #{key} already exists"
  registry[key] = value

# Retrieves a schema by registered name
Scheming.get = (name) ->
  return registry[name]

# Resets the state of the Schema registry
Scheming.reset = ->
  registry = {}

###
  ## create
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
###
Scheming.create = (args...) ->
  if !_.isString(args[0])
    args.unshift uuid()

  [name, schemaConfig, opts] = args

  opts = _.defaults (opts || {}), DEFAULT_OPTIONS
  {seal, strict} = opts

  normalizedSchema = {}

  class Schema
    @__skemaId : name

    @defineProperties : (config) ->
      for k, v of config
        @defineProperty k, v

    @defineProperty : (fieldName, config) ->
      normalizedSchema[fieldName] = Scheming.normalizeProperty(config, fieldName)

    constructor : (model) ->
      data = {}

      Object.defineProperty @, '__skemaId',
        enumerable   : false
        configurable : false
        writable     : false
        value        : Schema.__skemaId

      for fieldName, typeDefinition of normalizedSchema
        do (fieldName, typeDefinition) =>
          {type, getter, setter} = typeDefinition

          Object.defineProperty @, fieldName,
            configurable : true
            enumerable   : true
            get          : ->
              val = data[fieldName]
              if val is undefined
                return val
              if type.string == NESTED_TYPES.Array.string
                val = type.childParser val
              if getter
                val = getter val
              return val
            set          : (val) ->
              if !type.identifier(val)
                if strict then throw new Error "Error assigning #{val} to #{fieldName}. Value is not of type #{type.string}"
                val = type.parser val
              if setter
                val = setter val
              data[fieldName] = val

          if typeDefinition.default is not undefined
            @[fieldName] = typeDefinition.default

      if seal
        Object.seal @

      for key, value of model
        @[key] = value

      @validate = () ->
        errors = {}
        # prevents infinite loops in circular references
        if @_validating then return null
        @_validating = true

        pushError = (key, err) ->
          if _.isArray err
            return pushError(key, e) for e in err
          if !_.isString err
            err = 'Validation error occurred.'
          errors[key] ?= []
          errors[key].push err

        # apply validation rules
        for key, value of normalizedSchema

            {validators, required} = value

            val = @[key]

            if required && !val?
              pushError key, "Field is required."
            if val?
              {type} = normalizedSchema[key]

              for validator in validators
                err = true
                try
                  err = validator(val)
                catch e
                  if e then err = e.message
                if err != true then pushError key, err

              if type.string == 'schema'
                childErrors = val.validate()
                for k, v of childErrors
                  pushError "#{key}.#{k}", v
              if type.string == 'array' && type.childType.string == 'schema'
                for member, i in val
                  childErrors = member.validate()
                  for k, v of childErrors
                    pushError "#{key}[#{i}].#{k}", v

        @_validating = false

        if _.size(errors) == 0
          return null
        else
          return errors

  Schema.defineProperties schemaConfig

  addToRegistry name, Schema

  return Schema

if isNode
  module.exports = Scheming
else
  root.Scheming = Scheming
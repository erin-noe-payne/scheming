_ = require './utilities'

class Types
  # ### TYPES
  ###
    Scheming exports the default types that it uses for parsing schemas. You can extend with custom types, or
    override the identifier / parser functions of the default types. A custom type should provide:
     - ctor (optional) - Used in schema definitions to declare a type. `Scheming.create name : String`
     - string - Used in schema definitions to declare a type. `Scheming.create name : 'string'`
     - identifier - Function, returns true or false. Determines whether a value needs to be parsed.
     - parser - Function, parses a value into the type.
  ###
  TYPES :
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
  NESTED_TYPES :
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
  getPrimitiveTypeOf : (type) =>
    for k, TYPE of @TYPES
      if type == TYPE or
          (TYPE.ctor && type == TYPE.ctor) or
          type?.toLowerCase?() == TYPE.string

        return TYPE

    return null

  # Function that builds identifier and parser for nested schema types. Needs to be factored out
  # because nested schemas may be resolved lazily at a later time
  resolveSchemaType : (type, childType) =>
    type.childType = childType
    type.identifier = (val) ->
      return val instanceof childType
    type.parser = (val) ->
      return new childType(val)

  # ### resolveType
  # Resolves a type declaration to a primitive or nested type. Used internally when normalizing a schema.
  resolveType : (typeDef) =>
    # - Attempt to resolve the type declaration to a primitive type
    type = @getPrimitiveTypeOf typeDef

    if !type?
      # - If the type definition is an array `[]`
      if _.isArray typeDef
        #   - Set the type to a clone of the array NESTED_TYPE
        type = _.cloneDeep @NESTED_TYPES.Array

        #   - Recurse to resolve childType of array members
        if typeDef.length
          childType = @resolveType(typeDef[0])

        #   - Throw an error if type is not explicitly declared
        if !childType then throw new Error "Error resolving type of array value #{typeDef}"

        type.childType = childType
        #   - Write parser for child members of the array
        type.childParser = (val) ->
          for index, member of val
            if !childType.identifier(member)
              val[index] = childType.parser(member)

          return val

        ###
        - If the type definition is an object `{}`
          - Create a new Schema from the object
          - Treat the field as a nested Schema
          - Set identifier and parser functions immediately
        ###
      else if _.isPlainObject typeDef
        type = _.cloneDeep @NESTED_TYPES.Schema
        childType = require('./ModelFactory').create typeDef
        @resolveSchemaType type, childType

        ###
        - If the type definition is a reference to a Schema constructor
          - Treat the field as a nested Schema
          - Set identifier and parser functions immediately
        ###
      else if _.isFunction(typeDef) && typeDef.__schemaId
        type = _.cloneDeep @NESTED_TYPES.Schema
        childType = typeDef
        @resolveSchemaType type, childType

        ###
        - If the type definition is a string that begins with Schema:, such as `'Schema:Car'`
          - It is assumed that the field is a reference to a nested Schema that will be registered with the name Car,
        but may not be registered yet
          - The Schema is not resolved immediately
          - The parser and identifier functions are written as wrappers, so that the first time they are invoked the Schema
        will be looked up at that time via `Scheming.get`, and real identifier and parser are set at that time.
          - If the registered Schema cannot be resolved, throw an error.
        ###
      else if _.isString(typeDef) && typeDef[...7] == 'Schema:'
        type = _.cloneDeep @NESTED_TYPES.Schema
        childType = typeDef[7..]
        for fn in ['identifier', 'parser']
          do (fn) =>
            type[fn] = (val) =>
              childType = require('./Registry').get childType
              if !childType
                throw new Error "Error resolving #{typeDef} on lazy initialization"
              @resolveSchemaType type, childType

              return type[fn] val


    return type || null

module.exports = new Types()

root = @

isNode = typeof exports != 'undefined' && typeof module != 'undefined' && module.exports


if isNode
  _ = require 'lodash'

TYPES =
  String :
    constructor : String
    string : 'string'
    identifier : _.isString
  Number :
    constructor : Number
    string : 'number'
    identifier : _.isNumber
  Date :
    constructor : Date
    string : 'date'
    identifier : _.isDate
  Array :
    constructor : Array
    string : 'array'
    identifier : _.isArray
  Object :
    constructor : Object
    string : 'object'
    identifier : _.isObject
  Boolean :
    constructor : Boolean
    string : 'boolean'
    identifier : _.isBoolean


###


  opts:
    strict

###
Skema = (_schema, _opts) ->
  normalizedSchema = {}
  opts = {}

  normalize = (key, value) ->
    definition =
      type       : null
      default    : null
      getter     : null
      setter     : null
      validators : null

    type = null
    if _.isObject(value) && value.type
      type = value.type
    else
      type = value
      value = {type}

    for TYPE in TYPES
      if  type == TYPE.constructor or
          type?.toLowerCase() == TYPE.string or
          TYPE.identifier type

        definition.type = TYPE
        break




    normalizedSchema[key] = definition


  normalize(key, value) for key, value of _schema


  ctr = (model) ->


  ctr.defineProperty = (key, value) ->


  return ctr


class Skema
  constructor : (schema) ->
    if !(@ instanceof Skema)
      return new Skea arguments...

    for key, value of schema
      @defineProperty key, value

  defineProperty : (key, value) ->
    Object.defineProperty()


if isNode
  module.exports = Skema
else
  root.Skema = Skema
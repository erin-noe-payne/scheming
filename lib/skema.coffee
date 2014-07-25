root = @

isNode = typeof exports != 'undefined' && typeof module != 'undefined' && module.exports


if isNode
  _ = require 'lodash'

TYPES =
  String  :
    constructor : String
    string      : 'string'
    identifier  : _.isString
    parser      : (val) ->
      '' + val
  Number  :
    constructor : Number
    string      : 'number'
    identifier  : _.isNumber
    parser      : parseFloat
  Date    :
    constructor : Date
    string      : 'date'
    identifier  : _.isDate
    parser      : (val) ->
      new Date val
  Boolean :
    constructor : Boolean
    string      : 'boolean'
    identifier  : _.isBoolean
    parser      : (val) ->
      !!val
  Array   :
    constructor : Array
    string      : 'array'
    identifier  : _.isArray
  Object  :
    constructor : Object
    string      : 'object'
    identifier  : _.isPlainObject
  Mixed   :
    string     : '*'
    identifier : ->
      true

###


  opts:
    strict

###
Skema = {}

Skema.TYPES = TYPES

Skema.create = (_schema, _opts) ->
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

    if !_.isPlainObject(value) || _.contains TYPES, value
      value = {type : value}

    {type, getter, setter, validate, required} = value

    if !type?
      throw new Error "Schema type must be provided for key #{key}."
    if getter? && !_.isFunction getter
      throw new Error "Schema getter must be a function for key #{key}."
    if setter? && !_.isFunction setter
      throw new Error "Schema setter must be a function for key #{key}."
    if validate?
      if !_.isArray(validate)
        validate = [validate]
      for fn in validate
        if !_.isFunction fn
          throw new Error "Schema validate must be a function or array of functions for key #{key}."

    for k, TYPE of TYPES
      if type == TYPE or
         type == TYPE.constructor or
         type.toLowerCase?() == TYPE.string

        definition.type = TYPE
        break

    if !definition.type?
      throw new Error "Unrecognized type #{type}"

    if !validate?
      validate = []

    if required?
      validate.push (val) ->
        if !val?
          throw new Error "Field #{key} is required."

    definition.default = value.default
    definition.getter = getter
    definition.setter = setter
    definition.validators = validate

    normalizedSchema[key] = definition

  normalize(key, value) for key, value of _schema

  class Schema
    constructor : (model) ->
      data = {}

      for key, value of normalizedSchema
        do (key, value) =>
          {type, getter, setter, validators} = value
          data[key] = value.default

          Object.defineProperty @, key,
            configurable : true
            enumerable   : true
            get          : ->
              val = data[key]
              if getter
                val = getterval
              return val
            set          : (val) ->
              if setter
                val = setter val
              for validator in validators
                validator(val)
              if !type.identifier(val) && type.parser?
                val = type.parser val
              data[key] = val

      for key, value of model
        @[key] = value

  return Schema

if isNode
  module.exports = Skema
else
  root.Skema = Skema
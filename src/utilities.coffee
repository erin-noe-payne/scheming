identity = (x) -> x
isVoid = (x) ->
  x == null || typeof x == 'undefined'
isFunction = (x) -> typeof x == 'function'
isObjectLike = (x) -> !isVoid(x) && typeof x == 'object'
isString = (x) -> typeof x == 'string'
isNumber = (x) -> typeof x == 'number'
isDate = (x) -> x instanceof Date
isBoolean = (x) -> x == true || x == false
isArray =
  if !Array.isArray
    (x) -> Object.prototype.toString.call(x) == '[object Array]'
  else
    Array.isArray
extend = (into, values...) ->
  toArray(values || []).reduce(
    ((acc, value) ->
      Object.keys(value).forEach((key) ->
        if isVoid(key)
          delete acc[key]
        else 
          acc[key] = value[key]
      )
      return acc;
    ),
    into
  )

isEqualArray = (left, right) ->
  left == right ||
  (
    !isVoid(left) &&
    !isVoid(right) &&
    isArray(left) == isArray(right) &&
    (
      !isArray(left) ||
      (
        left.length == right.length &&
        left.every((leftValue, leftIndex) -> leftValue == right[leftIndex])
      )
    )
  )

isPlainObject = (x) ->
  isObjectLike(x) && !isFunction(x) && !isString(x) && !isArray(x)

clone = (value) ->
  if isVoid(value) then null
  else if isArray(value) then value.map(identity)
  else if isString(value) then value
  else if isDate(value) then new Date(value)
  else if typeof value == 'object'
    Object.keys(value).reduce(
      (
        (acc, key) ->
          acc[key] = value[key]
          return acc
      ),
      {}
    )
  else value

cloneDeep = (value) ->
  if isVoid(value) then value
  else if isArray(value) then value.map(cloneDeep)
  else if isString(value) then value
  else if isDate(value) then new Date(value)
  else if typeof value == 'object'
    Object.keys(value).reduce(
      (
        (acc, key) ->
          acc[key] = cloneDeep value[key]
          return acc
      ),
      {}
    )
  else value

toArray = (x) ->
  if isArray(x) then x
  else if isString(x) then x.split('')
  else if isObjectLike(x) then Object.keys(x).map((key) -> x[key])
  else []

has = (obj, value) -> obj.hasOwnProperty(value)

containsArray = (ns, value) ->
  if isFunction(value)
    ns.some(value)
  else 
    ns.indexOf(value) != -1

containsObject = (into, value) ->
  if isFunction(value) 
    Object.keys(into)
    .some((key) ->
      value(into[key], key)
    )
  else
    Object.keys(into)
      .some((key) -> value == into[key])

contains = (containsInto, containsValue) ->
  if isArray(containsInto)
    containsArray(containsInto, containsValue)
  else if isObjectLike(containsInto)
    containsObject(containsInto, containsValue)
  else
    false

unique = (values) ->
  values.filter((value, i) -> values.indexOf(value) >= i)

  
size = (value) ->
  if isArray(value) || isString(value) then value.length
  else if isObjectLike(value) then Object.keys(value).length
  else 0

intersection = (head, rest...) ->
  unique head.filter((v) -> 
    rest.every((restContainers) -> contains(restContainers, v))
  )

defaults = (orig, defaultValues...) ->
  defaultValues.reduce(
    ((acc, value) ->
      Object.keys(value).forEach((key) ->
        if !acc.hasOwnProperty(key)
          acc[key] = value[key]        
      )
      return acc;
    ),
    orig
  )

isEqual = (left, right) ->
  if isArray(left)
    isEqualArray(left, right)
  else if isPlainObject(left)
    isPlainObject(right) &&
    Object.keys(left).length == Object.keys(right).length &&
    Object.keys(left).every((key) -> isEqual(left[key], right[key]))
  else
    left == right

remove = (ns, n) ->
  ns.splice(ns.indexOf(n), 1)

includes = contains
uniq = unique

module.exports = {
  clone,
  cloneDeep,
  contains,
  defaults,
  extend,
  has,
  identity,
  includes,
  intersection,
  isArray,
  isBoolean,
  isDate,
  isEqual,
  isFunction,
  isNumber,
  isPlainObject,
  isString,
  remove,
  size,
  toArray,
  unique,
  uniq,
}
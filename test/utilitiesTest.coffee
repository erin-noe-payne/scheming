jsc = require('jsverify')
_ = require('lodash')
utilities = require('../src/utilities')
assertDeepEqualWithFunction = (functionName) -> (args...) ->
  if !_.isFunction _[functionName]
    throw new TypeError "Expecting that lodash has function #{functionName}"
  if !_.isFunction utilities[functionName]
    throw new TypeError "Expecting that utilities has function #{functionName}"
  if _.isEqual(_[functionName](args...), utilities[functionName](args...))
    true
  else
    throw new TypeError("Given (#{args.map(JSON.stringify).join(', ')}) -> (#{JSON.stringify(_[functionName](args...))}, #{JSON.stringify(utilities[functionName](args...))}) for utility function #{functionName}")

compose = (a, b) -> (c) -> a(b(c))
arrayToArgumentTypeFor = (fn) -> (x) -> (->
  fn(arguments)
)(x...)

describe 'Utilities that replace lodash for function of', ->
  describe 'isNumber', ->
    jsc.property 'works the same as lodash', 'json', assertDeepEqualWithFunction 'isNumber' 

  describe 'clone', ->
    jsc.property 'works the same as lodash, returns a new reference', 'dict json', (a) ->      
      _.clone(a) != utilities.clone(a) && 
      utilities.clone(a) != a

    
    jsc.property 'works the same as lodash, returns as shallow same value', 'dict json', (testValue) ->
      a = _.clone testValue
      b = utilities.clone testValue

      Object.keys(a).length == Object.keys(b).length &&
        Object.keys(a)
          .every((key) -> a[key] == b[key])

  describe 'cloneDeep', ->
    jsc.property 'works the same as lodash, returns new reference', 'dict json', (a) ->      
      _.cloneDeep(a) != utilities.cloneDeep(a) && 
      utilities.cloneDeep(a) != a

    
    jsc.property 'works the same as lodash, returns new reference', 'dict dict number', (testValue) ->
      a = _.cloneDeep testValue
      b = utilities.cloneDeep testValue

      Object.keys(a).length == Object.keys(b).length &&
        Object.keys(a)
          .every((key) -> a[key] != b[key])   

    
    jsc.property 'works the same as lodash', 'dict dict json', assertDeepEqualWithFunction 'cloneDeep'

  describe 'identity', ->
    jsc.property 'works the same as lodash', 'json', assertDeepEqualWithFunction 'isNumber'
  
  describe 'isString', ->
    jsc.property 'works the same as lodash', 'json', assertDeepEqualWithFunction 'isString'
  
  describe 'isNumber', ->
    jsc.property 'works the same as lodash', 'json', assertDeepEqualWithFunction 'isNumber'
  
  describe 'isDate', ->
    jsc.property 'works the same as lodash', 'json', assertDeepEqualWithFunction 'isDate'
    jsc.property 'works the same as lodash', 'datetime', assertDeepEqualWithFunction 'isDate'

  describe 'isBoolean', ->
    jsc.property 'works the same as lodash', 'json', assertDeepEqualWithFunction 'isBoolean'
    jsc.property 'works the same as lodash', 'bool', assertDeepEqualWithFunction 'isBoolean'
  
  describe 'isArray', ->
    jsc.property 'works the same as lodash', 'json', assertDeepEqualWithFunction 'isArray'
    jsc.property 'works the same as lodash', 'array json', assertDeepEqualWithFunction 'isArray'
  
  describe 'isEqual', ->
    jsc.property 'works the same as lodash', 'json', assertDeepEqualWithFunction 'isEqual'
    jsc.property 'works the same as lodash', 'array json', assertDeepEqualWithFunction 'isEqual'
    jsc.property 'works the same as lodash', 'dict json', assertDeepEqualWithFunction 'isEqual'

  
  describe 'isPlainObject', ->
    jsc.property 'works the same as lodash', 'json', assertDeepEqualWithFunction 'isPlainObject'
  
  describe 'isFunction', ->
    jsc.property 'works the same as lodash', 'json', assertDeepEqualWithFunction 'isFunction'
    jsc.property 'works the same as lodash', 'fn', assertDeepEqualWithFunction 'isFunction'
  
  describe 'toArray', ->
    jsc.property 'works the same as lodash', 'json', assertDeepEqualWithFunction 'toArray'    
    jsc.property 'works the same as lodash, given argument', 'array json', arrayToArgumentTypeFor assertDeepEqualWithFunction 'toArray'

  describe 'includes', ->
    jsc.property 'works the same as lodash', 'array json', 'json',  assertDeepEqualWithFunction 'includes'    
    jsc.property 'works the same as lodash, given array with guarenteed value contains other value', 'array json', 'json',  (_testValues, randomValue) ->
      testValues = [randomValue].concat(_testValues)       
      (assertDeepEqualWithFunction 'includes')(testValues, randomValue)

  
  describe 'has', ->
    jsc.property 'works the same as lodash', 'dict bool', 'string', assertDeepEqualWithFunction 'has' 

    jsc.property 'works the same as lodash, given object going in has key', 'dict bool', 'string', (testValue, key) ->
      testValue[key] = true
      (assertDeepEqualWithFunction 'has')(testValue, key)

  describe 'size', ->
    assertFn = assertDeepEqualWithFunction 'size'
    jsc.property 'works the same as lodash', 'json', assertDeepEqualWithFunction 'size' 
    jsc.property 'works the same as lodash', 'array json', assertDeepEqualWithFunction 'size'       
    jsc.property 'works the same as lodash', 'string', assertDeepEqualWithFunction 'size' 
    jsc.property 'works the same as lodash', 'dict json', assertDeepEqualWithFunction 'size' 
    jsc.property 'works the same as lodash, given argument type', 'array json', arrayToArgumentTypeFor assertDeepEqualWithFunction 'size'
  
  describe 'unique', ->
    jsc.property 'works the same as lodash', 'array number', assertDeepEqualWithFunction 'uniq'
    jsc.property 'works the same as lodash', 'array json', assertDeepEqualWithFunction 'uniq'
  
  describe 'intersection', ->
    jsc.property 'works the same as lodash', 'array json', 'array json', assertDeepEqualWithFunction 'intersection'
    
  
  describe 'defaults', ->
    jsc.property 'works same as lodash, given each has a cloned values (mutation) 2 arity', 'dict json', 'dict json', (a, b) ->
      _.isEqual _.defaults(_.cloneDeep(a), b), utilities.defaults(_.cloneDeep(a), b)

    jsc.property 'works same as lodash, given each has a cloned values (mutation) 3 arity', 'dict json', 'dict json', 'dict json', (a, b, c) ->
      _.isEqual _.defaults(_.cloneDeep(a), b, c), utilities.defaults(_.cloneDeep(a), b, c)

    
    jsc.property 'works same as lodash, mutation of original, given each has a cloned values (mutation)', 'dict json', 'dict json', (a, b) ->
      leftDict = _.cloneDeep(a)
      rightDict = _.cloneDeep(a)
      utilities.defaults(rightDict, b)
      _.defaults(leftDict, b)
      _.isEqual leftDict, rightDict
      
  describe 'extend', ->
    jsc.property 'works same as lodash, given each has a cloned values (mutation) 2 arity', 'dict json', 'dict json', (a, b) ->
      _.isEqual _.extend(_.cloneDeep(a), b), utilities.extend(_.cloneDeep(a), b)

    jsc.property 'works same as lodash, given each has a cloned values (mutation) 3 arity', 'dict json', 'dict json', 'dict json', (a, b, c) ->
      _.isEqual _.extend(_.cloneDeep(a), b, c), utilities.extend(_.cloneDeep(a), b, c)

    
    jsc.property 'works same as lodash, mutation of original value, given each has a cloned values (mutation)', 'dict json', 'dict json', (a, b) ->
      leftDict = _.cloneDeep(a)
      rightDict = _.cloneDeep(a)
      utilities.extend(rightDict, b)
      _.extend(leftDict, b)
      _.isEqual leftDict, rightDict

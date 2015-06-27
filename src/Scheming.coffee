Types = require './Types'
Registry = require './Registry'
ChangeManager = require './ChangeManager'
ModelFactory = require './ModelFactory'
InstanceFactory = require './InstanceFactory'

{TYPES, NESTED_TYPES, resolveType} = Types
{THROTTLE, setThrottle, registerQueueCallback, unregisterQueueCallback,
registerResolveCallback, unregisterResolveCallback, flush} = ChangeManager
{DEFAULT_OPTIONS, normalizePropertyConfig, create} = ModelFactory
{uuid} = InstanceFactory
{get, reset} = Registry


reset = ->
  Registry.reset()
  ChangeManager.reset()

Scheming = {
  TYPES, NESTED_TYPES, DEFAULT_OPTIONS, THROTTLE,

  uuid, get, reset,

  resolveType, normalizePropertyConfig

  setThrottle, registerQueueCallback, unregisterQueueCallback,
  registerResolveCallback, unregisterResolveCallback,

  flush, create
}

module.exports = Scheming
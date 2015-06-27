(function() {
  var ChangeManager, DEFAULT_OPTIONS, InstanceFactory, ModelFactory, NESTED_TYPES, Registry, Scheming, THROTTLE, TYPES, Types, create, flush, get, normalizePropertyConfig, registerQueueCallback, registerResolveCallback, reset, resolveType, setThrottle, unregisterQueueCallback, unregisterResolveCallback, uuid;

  Types = require('./Types');

  Registry = require('./Registry');

  ChangeManager = require('./ChangeManager');

  ModelFactory = require('./ModelFactory');

  InstanceFactory = require('./InstanceFactory');

  TYPES = Types.TYPES, NESTED_TYPES = Types.NESTED_TYPES, resolveType = Types.resolveType;

  THROTTLE = ChangeManager.THROTTLE, setThrottle = ChangeManager.setThrottle, registerQueueCallback = ChangeManager.registerQueueCallback, unregisterQueueCallback = ChangeManager.unregisterQueueCallback, registerResolveCallback = ChangeManager.registerResolveCallback, unregisterResolveCallback = ChangeManager.unregisterResolveCallback, flush = ChangeManager.flush;

  DEFAULT_OPTIONS = ModelFactory.DEFAULT_OPTIONS, normalizePropertyConfig = ModelFactory.normalizePropertyConfig, create = ModelFactory.create;

  uuid = InstanceFactory.uuid;

  get = Registry.get, reset = Registry.reset;

  reset = function() {
    Registry.reset();
    return ChangeManager.reset();
  };

  Scheming = {
    TYPES: TYPES,
    NESTED_TYPES: NESTED_TYPES,
    DEFAULT_OPTIONS: DEFAULT_OPTIONS,
    THROTTLE: THROTTLE,
    uuid: uuid,
    get: get,
    reset: reset,
    resolveType: resolveType,
    normalizePropertyConfig: normalizePropertyConfig,
    setThrottle: setThrottle,
    registerQueueCallback: registerQueueCallback,
    unregisterQueueCallback: unregisterQueueCallback,
    registerResolveCallback: registerResolveCallback,
    unregisterResolveCallback: unregisterResolveCallback,
    flush: flush,
    create: create
  };

  module.exports = Scheming;

}).call(this);

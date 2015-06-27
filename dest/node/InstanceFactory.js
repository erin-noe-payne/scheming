(function() {
  var ChangeManager, InstanceFactory, Types, _,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    slice = [].slice;

  _ = require('lodash');

  Types = require('./Types');

  ChangeManager = require('./ChangeManager');

  InstanceFactory = (function() {
    function InstanceFactory() {
      this.create = bind(this.create, this);
      this.uuid = bind(this.uuid, this);
    }

    InstanceFactory.prototype.ARRAY_MUTATORS = ['copyWithin', 'fill', 'push', 'pop', 'reverse', 'shift', 'sort', 'splice', 'unshift'];

    InstanceFactory.prototype.uuid = function() {
      var now;
      now = Date.now();
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r;
        r = (now + Math.random() * 16) % 16 | 0;
        now = Math.floor(now / 16);
        return (c === "x" ? r : r & 0x3 | 0x8).toString(16);
      });
    };

    InstanceFactory.prototype.create = function(instance, normalizedSchema, initialState, opts) {
      var _initializing, addWatcher, data, fireWatchers, fn, get, id, propConfig, propName, removeWatcher, seal, set, strict, unwatchers, val, watchForPropagation, watchers;
      _initializing = true;
      data = {};
      watchers = {
        internal: [],
        external: []
      };
      unwatchers = {};
      id = this.uuid();
      strict = opts.strict, seal = opts.seal;
      set = (function(_this) {
        return function(propName, val) {
          var prevVal, ref, setter, type;
          prevVal = data[propName];
          if (!normalizedSchema[propName]) {
            return instance[propName] = val;
          }
          ref = normalizedSchema[propName], type = ref.type, setter = ref.setter;
          if (val != null) {
            if (setter) {
              val = setter.call(instance, val);
            }
            if (!type.identifier(val)) {
              if (strict) {
                throw new Error("Error assigning " + val + " to " + propName + ". Value is not of type " + type.string);
              }
              val = type.parser(val);
            }
            if (type.string === Types.NESTED_TYPES.Array.string) {
              val = type.childParser(val);
              Object.defineProperty(val, '_arrayId', {
                configurable: true,
                value: _this.uuid()
              });
              _.each(_this.ARRAY_MUTATORS, function(method) {
                if ((prevVal != null) && prevVal[method]) {
                  delete prevVal[method];
                }
                if (Array.prototype[method] != null) {
                  return Object.defineProperty(val, method, {
                    configurable: true,
                    writable: true,
                    value: function() {
                      var clone, ref1, toReturn;
                      clone = _.clone(this);
                      toReturn = (ref1 = Array.prototype[method]).call.apply(ref1, [this].concat(slice.call(arguments)));
                      ChangeManager.queueChanges({
                        id: id,
                        propName: propName,
                        oldVal: clone,
                        newVal: val,
                        equals: type.equals
                      }, fireWatchers);
                      instance[propName] = this;
                      return toReturn;
                    }
                  });
                }
              });
            }
          }
          data[propName] = val;
          watchForPropagation(propName, val);
          if (!_initializing) {
            return ChangeManager.queueChanges({
              id: id,
              propName: propName,
              oldVal: prevVal,
              newVal: val,
              equals: type.equals
            }, fireWatchers);
          }
        };
      })(this);
      get = function(propName) {
        var getter, val;
        getter = normalizedSchema[propName].getter;
        val = data[propName];
        if (getter) {
          val = getter.call(instance, val);
        }
        return val;
      };
      addWatcher = function(properties, cb, opts) {
        var j, len, propName, target, watcher;
        if (_.isFunction(properties)) {
          opts = cb;
          cb = properties;
          properties = _.keys(normalizedSchema);
        }
        if (opts == null) {
          opts = {};
        }
        if (opts.internal == null) {
          opts.internal = false;
        }
        target = opts.internal ? 'internal' : 'external';
        if (!_.isFunction(cb)) {
          throw new Error('A watch must be provided with a callback function.');
        }
        if (properties && !_.isArray(properties)) {
          properties = [properties];
        }
        for (j = 0, len = properties.length; j < len; j++) {
          propName = properties[j];
          if (!_.has(normalizedSchema, propName)) {
            throw new Error("Cannot set watch on " + propName + ", property is not defined in schema.");
          }
        }
        watcher = {
          properties: properties,
          cb: cb,
          first: !opts.internal
        };
        watchers[target].push(watcher);
        ChangeManager.queueChanges({
          id: id
        }, fireWatchers);
        return function() {
          return removeWatcher(watcher, target);
        };
      };
      removeWatcher = function(watcher, target) {
        return _.remove(watchers[target], watcher);
      };
      watchForPropagation = function(propName, val) {
        var j, len, ref, type, unwatcher;
        type = normalizedSchema[propName].type;
        if (type.string === Types.NESTED_TYPES.Schema.string) {
          if (typeof unwatchers[propName] === "function") {
            unwatchers[propName]();
          }
          unwatchers[propName] = val != null ? val.watch(function(newVal, oldVal) {
            return ChangeManager.queueChanges({
              id: id,
              propName: propName,
              oldVal: oldVal,
              newVal: newVal,
              equals: type.equals
            }, fireWatchers);
          }, {
            internal: true
          }) : void 0;
        }
        if (type.string === Types.NESTED_TYPES.Array.string && type.childType.string === Types.NESTED_TYPES.Schema.string) {
          ref = unwatchers[propName] || [];
          for (j = 0, len = ref.length; j < len; j++) {
            unwatcher = ref[j];
            if (typeof unwatcher === "function") {
              unwatcher();
            }
          }
          unwatchers[propName] = [];
          return _.each(val, function(schema, i) {
            return unwatchers[propName].push(schema != null ? schema.watch(function(newVal, oldVal) {
              var newArray, oldArray;
              newArray = instance[propName];
              oldArray = ChangeManager.getQueuedChanges({
                id: id,
                propName: propName
              });
              if (oldArray == null) {
                if (oldArray == null) {
                  oldArray = _.clone(newArray);
                }
                Object.defineProperty(oldArray, '_arrayId', {
                  configurable: true,
                  value: newArray._arrayId
                });
              }
              if (oldArray._arrayId === newArray._arrayId) {
                oldArray[i] = oldVal;
                return ChangeManager.queueChanges({
                  id: id,
                  propName: propName,
                  oldVal: oldArray,
                  newVal: newArray,
                  equals: type.equals,
                  force: true
                }, fireWatchers);
              }
            }, {
              internal: true
            }) : void 0);
          });
        }
      };
      fireWatchers = function(queuedChanges, target) {
        var e, getPrevVal, i, j, len, newVals, oldVals, propName, ref, results, shouldFire, triggeringProperties, watcher;
        if (target == null) {
          target = 'external';
        }
        triggeringProperties = _.keys(queuedChanges);
        getPrevVal = function(propName) {
          if (_.has(queuedChanges, propName)) {
            return queuedChanges[propName];
          } else {
            return instance[propName];
          }
        };
        i = 0;
        results = [];
        while ((watcher = watchers[target][i])) {
          i++;
          shouldFire = watcher.first || (_.intersection(triggeringProperties, watcher.properties).length > 0);
          watcher.first = false;
          if (shouldFire) {
            newVals = {};
            oldVals = {};
            ref = watcher.properties;
            for (j = 0, len = ref.length; j < len; j++) {
              propName = ref[j];
              newVals[propName] = instance[propName];
              oldVals[propName] = getPrevVal(propName);
            }
            if (watcher.properties.length === 1) {
              propName = watcher.properties[0];
              newVals = newVals[propName];
              oldVals = oldVals[propName];
            }
            try {
              results.push(watcher.cb(newVals, oldVals));
            } catch (_error) {
              e = _error;
              results.push(console.error(e.stack || e));
            }
          } else {
            results.push(void 0);
          }
        }
        return results;
      };
      Object.defineProperty(instance, 'watch', {
        configurable: false,
        enumerable: false,
        writable: false,
        value: function(properties, cb, opts) {
          return addWatcher(properties, cb, opts);
        }
      });
      Object.defineProperty(instance, '_validating', {
        configurable: false,
        enumerable: false,
        writable: true,
        value: false
      });
      fn = (function(_this) {
        return function(propName, propConfig) {
          var val;
          Object.defineProperty(instance, propName, {
            configurable: false,
            enumerable: true,
            set: function(val) {
              return set(propName, val);
            },
            get: function() {
              return get(propName);
            }
          });
          if (propConfig["default"] !== void 0) {
            val = _.isFunction(propConfig["default"]) ? propConfig["default"]() : propConfig["default"];
            return instance[propName] = val;
          }
        };
      })(this);
      for (propName in normalizedSchema) {
        propConfig = normalizedSchema[propName];
        fn(propName, propConfig);
      }
      if (seal) {
        Object.seal(instance);
      }
      for (propName in initialState) {
        val = initialState[propName];
        instance[propName] = val;
      }
      return _initializing = false;
    };

    return InstanceFactory;

  })();

  module.exports = new InstanceFactory();

}).call(this);

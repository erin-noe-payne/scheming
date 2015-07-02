(function() {
  var ChangeManager, _,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  _ = require('lodash');

  ChangeManager = (function() {
    ChangeManager.prototype.THROTTLE = {
      TIMEOUT: 'timeout',
      IMMEDIATE: 'immediate',
      ANIMATION_FRAME: 'animationFrame'
    };

    ChangeManager.prototype.ITERATION_LIMIT = 100;

    function ChangeManager() {
      this.resolve = bind(this.resolve, this);
      this.flush = bind(this.flush, this);
      this.getQueuedChanges = bind(this.getQueuedChanges, this);
      this.queueChanges = bind(this.queueChanges, this);
      this.reset = bind(this.reset, this);
      this.cleanupCycle = bind(this.cleanupCycle, this);
      this.unregisterResolveCallback = bind(this.unregisterResolveCallback, this);
      this.registerResolveCallback = bind(this.registerResolveCallback, this);
      this.unregisterQueueCallback = bind(this.unregisterQueueCallback, this);
      this.registerQueueCallback = bind(this.registerQueueCallback, this);
      this.setThrottle = bind(this.setThrottle, this);
      this.changes = {};
      this.internalChangeQueue = [];
      this.timeout = null;
      this.recursionCount = 0;
      this.setThrottle(this.THROTTLE.TIMEOUT);
      this._activeClearTimeout = null;
      this._queueCallback = null;
      this._resolveCallback = null;
    }

    ChangeManager.prototype.setThrottle = function(throttle) {
      if (!_.contains(this.THROTTLE, throttle)) {
        throw new Error("Throttle option must be set to one of the strategies specified on Scheming.THROTTLE");
      }
      switch (throttle) {
        case this.THROTTLE.TIMEOUT:
          this.setTimeout = (function(_this) {
            return function() {
              return _this.timeout != null ? _this.timeout : _this.timeout = setTimeout(_this.resolve, 0);
            };
          })(this);
          return this.clearTimeout = (function(_this) {
            return function() {
              clearTimeout(_this.timeout);
              return _this.timeout = null;
            };
          })(this);
        case this.THROTTLE.IMMEDIATE:
          if ((typeof setImmediate !== "undefined" && setImmediate !== null) && (typeof clearImmediate !== "undefined" && clearImmediate !== null)) {
            this.setTimeout = (function(_this) {
              return function() {
                return _this.timeout != null ? _this.timeout : _this.timeout = setImmediate(_this.resolve);
              };
            })(this);
            return this.clearTimeout = (function(_this) {
              return function() {
                clearImmediate(_this.timeout);
                return _this.timeout = null;
              };
            })(this);
          } else {
            console.warn("Cannot use strategy IMMEDIATE: `setImmediate` or `clearImmediate` are not available in the current environment.");
            return this.setThrottle(this.THROTTLE.TIMEOUT);
          }
          break;
        case this.THROTTLE.ANIMATION_FRAME:
          if ((typeof requestAnimationFrame !== "undefined" && requestAnimationFrame !== null) && (typeof cancelAnimationFrame !== "undefined" && cancelAnimationFrame !== null)) {
            this.setTimeout = (function(_this) {
              return function() {
                return _this.timeout != null ? _this.timeout : _this.timeout = requestAnimationFrame(_this.resolve);
              };
            })(this);
            return this.clearTimeout = (function(_this) {
              return function() {
                cancelAnimationFrame(_this.timeout);
                return _this.timeout = null;
              };
            })(this);
          } else {
            console.warn("Cannot use strategy ANIMATION_FRAME: `requestAnimationFrame` or `cancelAnimationFrame` are not available in the current environment.");
            return this.setThrottle(this.THROTTLE.TIMEOUT);
          }
      }
    };

    ChangeManager.prototype.setTimeout = function() {
      throw new Error("A throttle strategy must be set.");
    };

    clearTimeout(function() {
      throw new Error("A throttle strategy must be set.");
    });

    ChangeManager.prototype.registerQueueCallback = function(callback) {
      if (!_.isFunction(callback)) {
        throw new Error("Callback must be a function");
      }
      return this._queueCallback = callback;
    };

    ChangeManager.prototype.unregisterQueueCallback = function() {
      return this._queueCallback = null;
    };

    ChangeManager.prototype.registerResolveCallback = function(callback) {
      if (!_.isFunction(callback)) {
        throw new Error("Callback must be a function");
      }
      return this._resolveCallback = callback;
    };

    ChangeManager.prototype.unregisterResolveCallback = function() {
      return this._resolveCallback = null;
    };

    ChangeManager.prototype.cleanupCycle = function() {
      this.changes = {};
      this.internalChangeQueue = [];
      if (typeof this._activeClearTimeout === "function") {
        this._activeClearTimeout();
      }
      return this.recursionCount = 0;
    };

    ChangeManager.prototype.reset = function() {
      this.changes = {};
      this.internalChangeQueue = [];
      if (typeof this._activeClearTimeout === "function") {
        this._activeClearTimeout();
      }
      this.timeout = null;
      this.recursionCount = 0;
      this.setThrottle(this.THROTTLE.TIMEOUT);
      this._queueCallback = null;
      return this._resolveCallback = null;
    };

    ChangeManager.prototype.queueChanges = function(arg, fireWatchers) {
      var base, changedProps, equals, force, id, newVal, oldVal, propName;
      id = arg.id, propName = arg.propName, oldVal = arg.oldVal, newVal = arg.newVal, equals = arg.equals, force = arg.force;
      if (!_.has(this.changes, id)) {
        if ((base = this.changes)[id] == null) {
          base[id] = {
            changedProps: {},
            fireWatchers: fireWatchers
          };
        }
        this.internalChangeQueue.push(id);
      }
      changedProps = this.changes[id].changedProps;
      if (propName) {
        if (_.has(changedProps, propName) && equals(changedProps[propName], newVal)) {
          delete changedProps[propName];
        } else if (force || (!_.has(changedProps, propName) && !equals(oldVal, newVal))) {
          changedProps[propName] = oldVal;
        }
      }
      if (this.timeout == null) {
        if (typeof this._queueCallback === "function") {
          this._queueCallback();
        }
        this.setTimeout();
        return this._activeClearTimeout = this.clearTimeout;
      }
    };

    ChangeManager.prototype.getQueuedChanges = function(arg) {
      var id, propName, ref;
      id = arg.id, propName = arg.propName;
      return (ref = this.changes[id]) != null ? ref.changedProps[propName] : void 0;
    };

    ChangeManager.prototype.flush = function() {
      return this.resolve();
    };

    ChangeManager.prototype.resolve = function() {
      var changedProps, changes, fireWatchers, i, id, internalChanges, len, ref, ref1;
      this.recursionCount++;
      if (this.ITERATION_LIMIT > 0 && this.recursionCount > this.ITERATION_LIMIT) {
        changes = this.changes;
        this.cleanupCycle();
        throw new Error("Aborting change propagation after " + this.ITERATION_LIMIT + " cycles.\nThis is probably indicative of a circular watch. Check the following watches for clues:\n" + (JSON.stringify(changes)));
      }
      internalChanges = _.unique(this.internalChangeQueue);
      this.internalChangeQueue = [];
      for (i = 0, len = internalChanges.length; i < len; i++) {
        id = internalChanges[i];
        ref = this.changes[id], changedProps = ref.changedProps, fireWatchers = ref.fireWatchers;
        fireWatchers(changedProps, 'internal');
      }
      if (this.internalChangeQueue.length) {
        return this.resolve();
      }
      changes = this.changes;
      this.changes = {};
      for (id in changes) {
        ref1 = changes[id], changedProps = ref1.changedProps, fireWatchers = ref1.fireWatchers;
        fireWatchers(changedProps, 'external');
      }
      if (_.size(this.changes) > 0) {
        return this.resolve();
      }
      if (typeof this._resolveCallback === "function") {
        this._resolveCallback();
      }
      return this.cleanupCycle();
    };

    return ChangeManager;

  })();

  module.exports = new ChangeManager();

}).call(this);

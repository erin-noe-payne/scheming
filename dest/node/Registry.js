(function() {
  var Registry,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Registry = (function() {
    function Registry() {
      this.reset = bind(this.reset, this);
      this.get = bind(this.get, this);
      this.register = bind(this.register, this);
      this.schemas = {};
    }

    Registry.prototype.register = function(name, model) {
      if (this.schemas[name]) {
        throw new Error("Naming conflict encountered. Model " + name + " already exists");
      }
      return this.schemas[name] = model;
    };

    Registry.prototype.get = function(name) {
      return this.schemas[name];
    };

    Registry.prototype.reset = function() {
      return this.schemas = {};
    };

    return Registry;

  })();

  module.exports = new Registry();

}).call(this);

_ = require './utilities'
Types = require './Types'
ChangeManager = require './ChangeManager'




class InstanceFactory
  # As listed by https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array#Mutator_methods
  ARRAY_MUTATORS : ['copyWithin', 'fill', 'push', 'pop', 'reverse', 'shift', 'sort', 'splice', 'unshift']

  # Uuid generator for anonymous Schema ids
  uuid : =>
    now = Date.now()
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace /[xy]/g, (c) ->
      r = (now + Math.random() * 16) % 16 | 0
      now = Math.floor now / 16
      ((if c is "x" then r else (r & 0x3 | 0x8))).toString 16

  # ## Instance
  # Factory method that builds a Model instance
  create : (instance, normalizedSchema, initialState, opts) =>
    # flag to indicate initializing state of instance
    _initializing = true
    # data hash wrapped in closure, keeps actual data members private
    data = {}
    # private watchers array. External watches - those set by consuming client code - are tracked separately from
    # internal watches - those to watch change propagation on nested schemas
    watchers =
      internal : []
      external : []
    # The unwatch functions from internal watches
    unwatchers = {}

    # Set an id on each instance that is not exposed, is used internally only for change management
    id = @uuid()

    {strict, seal} = opts

    # ### Property Setter
    set = (propName, val) =>
      prevVal = data[propName]

      # if the property is not a part of the schema, simply set it on the instance.
      # if the seal option is enabled this will fail silently, otherwise it will allow for arbitrary properties
      if !normalizedSchema[propName]
        return instance[propName] = val

      # retrieve the type, getter, and setter from the normalized field config
      {type, setter} = normalizedSchema[propName]

      # - If a property is set to undefined, do not type cast or run through setter.
      # You should always be able to clear a property.
      if val?
        # - If a setter is defined, run the value through setter
        if setter
          val = setter.call instance, val
        # - If value is not undefined, run through type identifier to determine if it is the correct type
        if !type.identifier(val)
          #   - If not and strict mode is enabled, throw an error
          if strict then throw new Error "Error assigning #{val} to #{propName}. Value is not of type #{type.string}"
          #   - Otherwise, use parser to cast to the correct type
          val = type.parser val
        # - If the property type is of array, perform parsing on child members.
        if type.string == Types.NESTED_TYPES.Array.string
          val = type.childParser val
          # Add a unique arrayId to scheming arrays to identify the source of changes
          Object.defineProperty val, '_arrayId',
            configurable : true
            value : @uuid()
          # Overwrite mutator functions on this array capture and queue the mutation. This guarantees
          # that otherwise mutating changes are run through the setters and changes are captured.
          (@ARRAY_MUTATORS || []).forEach (method) ->
            if prevVal? && prevVal[method]
              delete prevVal[method]

            if Array.prototype[method]?
              Object.defineProperty val, method,
                configurable : true
                writable : true
                value : ->
                  clone = _.clone @
                  toReturn = Array.prototype[method].call @, arguments...
                  ChangeManager.queueChanges {id, propName, oldVal : clone, newVal : val, equals : type.equals}, fireWatchers
                  instance[propName] = @
                  return toReturn


      # - Assign to the data hash
      data[propName] = val
      # - If the value being assigned is of type schema, we need to listen for changes to propagate
      watchForPropagation propName, val
      # - Queue up a change to fire, unless you are setting the initial state of the instance
      if !_initializing
        ChangeManager.queueChanges {id, propName, oldVal : prevVal, newVal : val, equals : type.equals}, fireWatchers

    # ### Property Getter
    get = (propName) ->
      # retrieve the type, getter, and setter from the normalized field config
      {getter} = normalizedSchema[propName]

      # - Retrieve data value from the hash
      val = data[propName]
      # - If getter is defined, run value through getter
      if getter
        val = getter.call instance, val
      # - Finally, return the value
      return val

    # Adds a watcher to the instance
    addWatcher = (properties, cb, opts) ->
      # properties and opts arguments are optional
      if _.isFunction properties
        opts = cb
        cb = properties
        # if no properties are specified, the watcher is registered to watch all properties of the object
        properties = Object.keys normalizedSchema

      # unless specified, a watch is assumed to be external. Clinet code should not set watches as internal!
      # Behavior is undefined.
      opts ?= {}
      opts.internal ?= false

      target = if opts.internal then 'internal' else 'external'

      if !_.isFunction cb
        throw new Error 'A watch must be provided with a callback function.'

      # Cast the properties to an array. A watch can support one or more property names.
      if properties && !_.isArray properties
        properties = [properties]

      # Throw an error if client code attempts to set a watch on a property that is not defined as part of the schema.
      for propName in properties
        if !_.has normalizedSchema, propName
          throw new Error "Cannot set watch on #{propName}, property is not defined in schema."

      # Register the watcher on the correct internal or external watchers array. Flag new external watchers with `first`
      # so that they will get called on the first change loop, regardless of whether the watch properties have changed.
      # Internal watchers do not need to be invoked on first watch.
      watcher = {properties, cb, first : !opts.internal}
      watchers[target].push watcher

      # Queue a change event on the change manager.
      ChangeManager.queueChanges {id}, fireWatchers

      # return an unwatch function
      return ->
        removeWatcher watcher, target

    # Remove a watch listener from the appropraite watchers array
    removeWatcher = (watcher, target) ->
      _.remove watchers[target], watcher#watchers[target].filter (x) => x != watcher

    # This function is called on value assignment
    watchForPropagation = (propName, val) ->
      {type} = normalizedSchema[propName]

      # If the assigned property is of type schema, we need to listen for changes on the child instance to propagate
      # changes to this instance
      if type.string == Types.NESTED_TYPES.Schema.string
        # If there was a watcher from the previously assigned value, stop listening.
        unwatchers[propName]?()
        # Watch the new value for changes and propagate this changes to this instance. Flag the watch as internal.
        unwatchers[propName] = val?.watch (newVal, oldVal)->
          ChangeManager.queueChanges {id, propName, oldVal, newVal, equals: type.equals}, fireWatchers
        , internal : true

      # If the assigned property is an array of type schema, set a watch on each array memeber.
      if type.string == Types.NESTED_TYPES.Array.string and type.childType.string == Types.NESTED_TYPES.Schema.string
        # If there were watchers on the previous array members, clear those listeners.
        for unwatcher in (unwatchers[propName] || [])
          unwatcher?()
        # reset the unwatchers array
        unwatchers[propName] = []
        (val || []).forEach (schema, i) ->
          # set a new watch on each array member to propagate changes to this instance. Flag the watch as internal.
          unwatchers[propName].push schema?.watch (newVal, oldVal)->
            newArray = instance[propName]
            # check if there is already a queued change for this array
            oldArray = ChangeManager.getQueuedChanges {id, propName}
            # if there is not, clone the current state of the array, including the arrayId
            if !oldArray?
              oldArray ?= _.clone newArray
              Object.defineProperty oldArray, '_arrayId',
                configurable : true
                value : newArray._arrayId
            # if the source of this chnage is the same as the already queued array, propagate the change
            if oldArray._arrayId == newArray._arrayId
              oldArray[i] = oldVal
              ChangeManager.queueChanges {id, propName, oldVal : oldArray, newVal : newArray, equals : type.equals, force: true}, fireWatchers
          , internal : true

    # Given a change set, fires all watchers that are watching one or more of the changed properties
    fireWatchers = (queuedChanges, target='external') ->
      triggeringProperties = Object.keys queuedChanges

      # Retrieves the previous value for a property, pulling from queued changes if present, otherwise retreiving
      # current value - i.e. no change.
      getPrevVal = (propName) ->
        if _.has queuedChanges, propName
          return queuedChanges[propName]
        else
          return instance[propName]

      # for each registered watcher - use a while loop since firing one watcher can cause other watchers to be added or
      # removed
      i = 0
      # TODO: there is a possible error here where firing one watcher removes another watcher from
      # the array - the index would be off by one and a watcher could be skipped
      while (watcher = watchers[target][i])
        i++
        # That watcher should fire if it is new, or if it is watching one or more of the changed properties
        shouldFire = watcher.first || (_.intersection(triggeringProperties, watcher.properties).length > 0)
        watcher.first = false
        if shouldFire
          newVals = {}
          oldVals = {}

          # build the hash of new / old values
          for propName in watcher.properties
            newVals[propName] = instance[propName]
            oldVals[propName] = getPrevVal(propName)

          # if the watcher is set against a single property, invoke the callback with the raw new / old values
          if watcher.properties.length == 1
            propName = watcher.properties[0]
            newVals = newVals[propName]
            oldVals = oldVals[propName]

          try
            watcher.cb newVals, oldVals
          catch e
            # TODO: browser support?
            console.error e.stack || e

    # ### watch
    # Watches an instance for changes to one or more properties
    Object.defineProperty instance, 'watch',
      configurable : false
      enumerable : false
      writable : false
      value : (properties, cb, opts) -> addWatcher properties, cb, opts

    # Define a validating flag, which is used to prevent infinite loops on validation of circular references
    Object.defineProperty instance, '_validating',
      configurable : false
      enumerable : false
      writable : true
      value : false

    # ### constructor
    # for each property of the normalized schema
    for propName, propConfig of normalizedSchema
      do (propName, propConfig) =>
        # define an enumerable property on the instance that is not configurable
        # user get and set to manage getters, setters, and type parsing
        Object.defineProperty instance, propName,
          configurable : false
          enumerable   : true
        # **set**
          set          : (val) -> set propName, val
        # **get**
          get          : -> get propName

        # Once the property is configured, assign a default value. This ensures that default values are still
        # affected by type parsing and setters
        if propConfig.default != undefined
          val = if _.isFunction(propConfig.default) then propConfig.default() else propConfig.default
          instance[propName] = val

    # If seal option is enabled, seal the instance, preventing addition of other properties besides those explicitly
    # defined by the Schema
    if seal
      Object.seal instance

    # set the initial state of the instance, then clear the initializing flag
    for propName, val of initialState
      instance[propName] = val

    _initializing = false

module.exports = new InstanceFactory()

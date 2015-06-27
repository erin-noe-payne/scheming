_ = require 'lodash'

# ### Change Manager
# Internal Change Manager class, responsible for queueing and resolving change event propagation for watches
class ChangeManager
  THROTTLE :
    TIMEOUT : 'timeout'
    IMMEDIATE : 'immediate'
    ANIMATION_FRAME : 'animationFrame'

  # Configuration for limiting number of iterations
  ITERATION_LIMIT : 100

  constructor : ->
    @changes = {}
    @internalChangeQueue = []
    @timeout = null

    @recursionCount = 0

    @setThrottle @THROTTLE.TIMEOUT
    @_activeClearTimeout = null
    @_queueCallback = null
    @_resolveCallback = null

  # ### setThrottle
  # Sets the throttling strategy that Scheming uses for resolving queued changes.
  setThrottle : (throttle) =>
    if !_.contains @THROTTLE, throttle
      throw new Error "Throttle option must be set to one of the strategies specified on Scheming.THROTTLE"

    switch throttle
      when @THROTTLE.TIMEOUT
        @setTimeout = =>
          @timeout ?= setTimeout @resolve, 0
        @clearTimeout = =>
          clearTimeout @timeout
          @timeout = null

      when @THROTTLE.IMMEDIATE
        if setImmediate? && clearImmediate?
          @setTimeout = =>
            @timeout ?= setImmediate @resolve
          @clearTimeout = =>
            clearImmediate @timeout
            @timeout = null
        else
          console.warn "Cannot use strategy IMMEDIATE: `setImmediate` or `clearImmediate` are not available in the current environment."
          @setThrottle @THROTTLE.TIMEOUT

      when @THROTTLE.ANIMATION_FRAME
        if requestAnimationFrame? && cancelAnimationFrame?
          @setTimeout = =>
            @timeout ?= requestAnimationFrame @resolve
          @clearTimeout = =>
            cancelAnimationFrame @timeout
            @timeout = null
        else
          console.warn "Cannot use strategy ANIMATION_FRAME: `requestAnimationFrame` or `cancelAnimationFrame` are not available in the current environment."
          @setThrottle @THROTTLE.TIMEOUT

  # Push the resolution step onto the event queue, once the thread has been released from
  # a synchronous block of changes
  setTimeout : ->
    throw new Error "A throttle strategy must be set."

  # clear timeout to guarantee resolve is not called more than once.
  clearTimeout ->
    throw new Error "A throttle strategy must be set."

  # ### registerQueueCallback
  # registers a callback when the first Scheming change is queued with the change manager. This is useful for tests
  registerQueueCallback : (callback) =>
    if !_.isFunction callback
      throw new Error "Callback must be a function"
    @_queueCallback = callback

  # ### unregisterQueueCallback
  # unregisters a callback when the first Scheming change is queued with the change manager.
  unregisterQueueCallback : =>
    @_queueCallback = null

  # ### registerResolveCallback
  # registers a callback when the change manager is finished resolving changes
  registerResolveCallback : (callback) =>
    if !_.isFunction callback
      throw new Error "Callback must be a function"
    @_resolveCallback = callback

  # ### unregisterResolveCallback
  # unregisters a callback when the change manager is finished resolving changes
  unregisterResolveCallback : =>
    @_resolveCallback = null
    # reset the the change manager to a pristine state

  cleanupCycle : =>
    @changes = {}
    @internalChangeQueue = []
    @_activeClearTimeout?()
    @recursionCount = 0

  reset : =>
    @changes = {}
    @internalChangeQueue = []
    @_activeClearTimeout?()
    @timeout = null

    @recursionCount = 0

    @setThrottle @THROTTLE.TIMEOUT
    @_queueCallback = null
    @_resolveCallback = null

  # Registers changes that have occurred on an instance by instance id, holding a reference to the original value
  queueChanges : ({id, propName, oldVal, newVal, equals, force}, fireWatchers) =>
    # if there are no changes yet queued for the instance, add to the changes hash by id
    if !_.has @changes, id
      @changes[id] ?= {changedProps : {}, fireWatchers}
      @internalChangeQueue.push id
    {changedProps} = @changes[id]

    if propName
      # if we are already tracking this property, and it has been reset to its original value, clear it from changes
      if _.has(changedProps, propName) && equals(changedProps[propName], newVal)
        delete changedProps[propName]
        # if we are not tracking this property and it is being changed, or if force is flagged true, add it to changes
      else if force || (!_.has(changedProps, propName) && !equals(oldVal, newVal))
        changedProps[propName] = oldVal

    # Call the queue callback if a timeout hasn't been defined yet
    if !@timeout?
      @_queueCallback?()
      @setTimeout()
      @_activeClearTimeout = @clearTimeout

  # gets the previous state of a queued change
  getQueuedChanges : ({id, propName}) =>
    return @changes[id]?.changedProps[propName]

  # Synchronously cause the change manager resolve. May be used for testing to avoid asynchronous tests,
  # or may be used to force change resolution within client code.
  flush : =>
    @resolve()

  # resolves queued changes, firing watchers on instances that have changed
  resolve : =>
    @recursionCount++
    # track iteration count and throw an error after some limit to prevent infinite loops
    if @ITERATION_LIMIT > 0 && @recursionCount > @ITERATION_LIMIT
      changes = @changes
      @cleanupCycle()
      # TODO: try to make a more meaningful error message from the instances (schema type, properties, etc)
      throw new Error """Aborting change propagation after #{@ITERATION_LIMIT} cycles.
        This is probably indicative of a circular watch. Check the following watches for clues:
        #{JSON.stringify(changes)}"""

    @clearTimeout()

    # A single id may have been pushed to the change queue many times, to take a unique list of ids.
    internalChanges = _.unique @internalChangeQueue
    # Immediately reset the state of the change queue
    @internalChangeQueue = []

    # Fire internal watchers on all instances that have changed. This will cause the change event to propagate to
    # any parent schemas, whose changes will populate `@internalChangeQueue`
    for id in internalChanges
      {changedProps, fireWatchers} = @changes[id]
      fireWatchers changedProps, 'internal'
      # if any new internal changes were registered, recursively call resolve to continue propagation
    if @internalChangeQueue.length
      return @resolve()

    # Once internal watches have fired without causing a change on a parent schema instance, there are no more changes
    # to propagate. At this point all changes on each instance have been aggregated into a single change set. Now
    # fire all external watchers on each instance.
    changes = @changes
    # Immediately reset the change set
    @changes = {}

    # Fire all external watchers
    for id of changes
      {changedProps, fireWatchers} = changes[id]
      fireWatchers changedProps, 'external'

      # If any external watches caused new changes to be queued, re-run resolve to ensure propagation
    if _.size(@changes) > 0
      return @resolve()

    # If we get here, all changes have been fully propagated. Reset change manager state to pristine just for explicitness
    @_resolveCallback?()
    @cleanupCycle()

module.exports = new ChangeManager()
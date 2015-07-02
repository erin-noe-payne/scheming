{expect} = chai

ChangeManager = require '../src/ChangeManager'

describe 'ChangeManager', ->
  describe 'throttling strategies', ->
    beforeEach ->
      sinon.spy console, 'warn'

    afterEach ->
      ChangeManager.setThrottle ChangeManager.THROTTLE.TIMEOUT
      console.warn.restore()

    it 'should throw an error if you set an invalid throttle', ->
      badThrottle = ->
        ChangeManager.setThrottle 'asdf'

      expect(badThrottle).to.throw 'Throttle option must be set to one of the strategies specified'

    _.each ChangeManager.THROTTLE, (throttle) ->
      it "should accept THROTTLE.#{throttle}", ->
        ChangeManager.setThrottle throttle

    it 'should warn if the IMMEDIATE strategy is not available', ->
      {setImmediate, clearImmediate} = global
      global.setImmediate = undefined
      global.clearImmediate = undefined

      ChangeManager.setThrottle ChangeManager.THROTTLE.IMMEDIATE

      expect(console.warn).to.have.been.called

      global.setImmediate = setImmediate
      global.clearImmediate = clearImmediate

    it 'should warn if the ANIMATION_FRAME strategy is not available', ->
      {requestAnimationFrame, cancelAnimationFrame} = global
      global.requestAnimationFrame = undefined
      global.cancelAnimationFrame = undefined

      ChangeManager.setThrottle ChangeManager.THROTTLE.ANIMATION_FRAME

      expect(console.warn).to.have.been.called

      global.requestAnimationFrame = requestAnimationFrame
      global.cancelAnimationFrame = cancelAnimationFrame

    it 'should clear timeout when flushing with the TIMEOUT strategy', ->
      sinon.spy global, 'setTimeout'
      sinon.spy global, 'clearTimeout'

      ChangeManager.setThrottle ChangeManager.THROTTLE.TIMEOUT

      ChangeManager.queueChanges {}, ->

      expect(global.setTimeout).to.have.been.called

      ChangeManager.flush()

      expect(global.clearTimeout).to.have.been.called

      global.setTimeout.restore()
      global.clearTimeout.restore()

    it 'should clear immediate when flushing with the IMMEDIATE strategy', ->
      sinon.spy global, 'setImmediate'
      sinon.spy global, 'clearImmediate'

      ChangeManager.setThrottle ChangeManager.THROTTLE.IMMEDIATE

      ChangeManager.queueChanges {}, ->

      expect(global.setImmediate).to.have.been.called

      ChangeManager.flush()

      expect(global.clearImmediate).to.have.been.called

      global.setImmediate.restore()
      global.clearImmediate.restore()

    it 'should cancel animation frame when flushing with the ANIMATION_FRAME strategy', ->
      global.requestAnimationFrame = sinon.spy()
      global.cancelAnimationFrame = sinon.spy()

      ChangeManager.setThrottle ChangeManager.THROTTLE.ANIMATION_FRAME

      ChangeManager.queueChanges {}, ->

      expect(global.requestAnimationFrame).to.have.been.called

      ChangeManager.flush()

      expect(global.cancelAnimationFrame).to.have.been.called

    it 'should flush using the correct cancellation method even if the strategy is changed mid-cycle', ->
      sinon.spy global, 'setImmediate'
      sinon.spy global, 'clearImmediate'

      ChangeManager.setThrottle ChangeManager.THROTTLE.IMMEDIATE

      ChangeManager.queueChanges {}, ->

      expect(global.setImmediate).to.have.been.called
      ChangeManager.setThrottle ChangeManager.THROTTLE.TIMEOUT

      ChangeManager.flush()

      expect(global.clearImmediate).to.have.been.called

      global.setImmediate.restore()
      global.clearImmediate.restore()

  describe 'queueing and resolve callbacks', ->
    queueCallback = null
    resolveCallback = null

    beforeEach ->
      queueCallback = sinon.stub()
      ChangeManager.registerQueueCallback queueCallback

    afterEach ->
      ChangeManager.reset()

    it 'should not call queue callback before data changes', ->
      expect(queueCallback).to.not.have.been.called

    it 'should not call resolve callback before data changes', ->
      resolveCallback = sinon.stub()
      ChangeManager.registerResolveCallback resolveCallback
      expect(resolveCallback).to.not.have.been.called

    it 'should call queue callback when data changes', ->
      ChangeManager.queueChanges {}, ->
      expect(queueCallback).to.have.been.calledOnce

    it 'should call queue callback only once', ->
      ChangeManager.queueChanges {}, ->
      ChangeManager.queueChanges {}, ->
      expect(queueCallback).to.have.been.calledOnce

    it 'should call queue callback only once with cascading changes', ->
      ChangeManager.queueChanges {}, ->
        ChangeManager.queueChanges {}, ->

      ChangeManager.flush()
      expect(queueCallback).to.have.been.calledOnce

    it 'should call the resolve callback when data changes', (done) ->
      ChangeManager.registerResolveCallback done
      ChangeManager.queueChanges {}, ->

    it 'should call the resolve callback only once', (done) ->
      ChangeManager.registerResolveCallback done
      ChangeManager.queueChanges {}, ->
      ChangeManager.queueChanges {}, ->

    it 'should call the resolve callback only once with cascading changes', (done) ->
      ChangeManager.registerResolveCallback done
      ChangeManager.queueChanges {}, ->
        ChangeManager.queueChanges {}, ->

    it 'should allow for deregistering of queue callback', ->
      ChangeManager.unregisterQueueCallback queueCallback
      ChangeManager.queueChanges {}, ->
      expect(queueCallback).to.not.have.been.called

    it 'should allow for deregistering of resolve callback', ->
      resolveCallback = sinon.stub()
      ChangeManager.registerResolveCallback resolveCallback
      ChangeManager.unregisterResolveCallback resolveCallback
      ChangeManager.queueChanges {}, ->
      ChangeManager.flush()
      expect(resolveCallback).to.not.have.been.called

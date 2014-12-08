{expect} = chai

describe 'Schema watch', ->
  Person = null
  lisa = null
  unwatchers = null
  watcher = null

  beforeEach ->
    Person = Scheming.create 'Person',
      name            : String
      age             : Number
      favoriteNumbers : [Number]
      mother          : 'Schema:Person'
      friends         : ['Schema:Person']

    lisa = new Person()

    unwatchers = []

    watcher = sinon.spy()

  afterEach ->
    lisa._flushWatches()
    Scheming.reset()

    unwatch() for unwatch in unwatchers

  describe 'watching single properties', ->
    it 'should take a property name, an instance, and a watch callback', ->
      unwatchers.push lisa.watch 'name', (name) ->

    it 'should fire watches asynchronously when the thread of execution is released', (done) ->
      a = null
      watcher = (newVal, oldVal)->
        expect(a).to.equal 5
        expect(newVal).to.equal 'lisa'
        expect(oldVal).to.equal undefined
        done()

      lisa.name = 'lisa'
      unwatchers.push lisa.watch 'name', watcher
      a = 5

    it 'should allow the use of _flushWatches to mock async calls', ->
      a = null
      watcher = (newVal, oldVal)->
        expect(a).to.equal 5
        expect(newVal).to.equal 'lisa'
        expect(oldVal).to.equal undefined

      lisa.name = 'lisa'
      unwatchers.push lisa.watch 'name', watcher
      a = 5

      lisa._flushWatches()

    it 'should immediately invoke the watch callback with the current value', ->
      lisa.name = 'lisa'

      unwatchers.push lisa.watch 'name', watcher
      lisa._flushWatches()

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith 'lisa'

    it 'should fire the watch each time the value changes', ->
      lisa.name = 'lisa'

      unwatchers.push lisa.watch 'name', watcher

      lisa.name = 'LISA!'

      lisa._flushWatches()

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith 'LISA!'

    it 'should not fire the watch if the value is set but is not changed', ->
      lisa.name = 'lisa'
      unwatchers.push lisa.watch 'name', watcher
      lisa._flushWatches()
      watcher.reset()

      lisa.name = 'lisa'
      lisa._flushWatches()

      expect(watcher).to.not.have.been.called

    it 'should return an unwatch function', ->
      lisa.name = 'lisa'

      unwatch = lisa.watch 'name', watcher
      unwatchers.push unwatch

      expect(unwatch).to.be.a 'function'

    it 'should not fire the watch once the unwatch has been invoked', ->
      lisa.name = 'lisa'

      unwatch = lisa.watch 'name', watcher
      unwatchers.push unwatch
      lisa._flushWatches()
      expect(watcher).to.have.been.called
      watcher.reset()

      expect(watcher).not.to.have.been.called
      unwatch()

      lisa.name = 'LISA!'
      lisa._flushWatches()

      expect(watcher).not.to.have.been.called

    it 'should not cause an error to invoke the unwatch more than once', ->
      lisa.name = 'lisa'

      unwatch = lisa.watch 'name', watcher
      unwatchers.push unwatch
      lisa._flushWatches()

      unwatch()
      expect(unwatch).to.not.throw 'Error'

    it 'should fire a watch on changes to arrays', ->
      lisa.favoriteNumbers = [1, 2, 3]
      lisa.watch 'favoriteNumbers', watcher

      lisa.favoriteNumbers = lisa.favoriteNumbers.concat [4, 5]

      lisa._flushWatches()

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith [1,2,3,4,5], undefined

    it 'should fire a watch only once per synchronous block of changes, with the most recent value, and the original previous value', ->
      lisa.watch 'name', watcher

      lisa.name = 'lisa'
      lisa.name = 'LiSa'
      lisa.name = 'LISA!'

      lisa._flushWatches()

      expect(watcher).to.have.been.calledOnce
      expect(watcher).to.have.been.calledWith 'LISA!', undefined

  describe 'watching multiple properties', ->
    it 'should accept multiple properties in an array', ->
      unwatchers.push lisa.watch ['name', 'age'], (name, age) ->

    it 'should immediately invoke the watch callback with each of the current values', ->
      lisa.name = 'lisa'
      lisa.age = 7

      unwatchers.push lisa.watch ['name', 'age'], watcher

      lisa._flushWatches()

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith {name : 'lisa', age : 7}, {name : undefined, age : undefined}

    it 'should aggregate each synchronous block of property changes', ->
      unwatchers.push lisa.watch ['name', 'age'], watcher
      lisa.name = 'lisa'
      lisa.age = 7

      lisa.name = 'LISA!'

      lisa._flushWatches()

      expect(watcher).to.have.been.calledOnce
      expect(watcher).to.have.been.calledWith {name : 'LISA!', age : 7}, {name : undefined, age : undefined}

      watcher.reset()

      lisa.age = 8
      lisa._flushWatches()

      expect(watcher).to.have.been.calledOnce
      expect(watcher).to.have.been.calledWith {name : 'LISA!', age : 8}, {name : 'LISA!', age : 7}

    it 'should not fire the watch if any of the values is set but not changed', ->
      lisa.name = 'lisa'
      lisa.age = 7

      unwatchers.push lisa.watch ['name', 'age'], watcher
      lisa._flushWatches()
      watcher.reset()

      lisa.name = 'lisa'
      lisa.age = 7
      lisa._flushWatches()

      expect(watcher).to.not.have.been.called

  describe 'watching objects', ->
    it 'should accept a watch with no specified properties', ->
      unwatchers.push lisa.watch ->

    it 'should fire the watch when any property of the object changes', ->
      unwatchers.push lisa.watch watcher

      lisa.name = 'lisa'
      lisa.age = 7
      lisa._flushWatches()

      expect(watcher).to.have.been.calledOnce

    it 'should return all properties of object on a watch', ->
      unwatchers.push lisa.watch watcher
      lisa.name = 'lisa'
      lisa._flushWatches()

      expect(watcher).to.have.been.calledWith {
        age             : undefined
        favoriteNumbers : undefined
        friends         : undefined
        mother          : undefined
        name            : "lisa"
      }, {
        age             : undefined
        favoriteNumbers : undefined
        friends         : undefined
        mother          : undefined
        name            : undefined
      }

  describe 'multiple watches', ->
    it 'should fire only relevant watches when a property changes', ->
      w1 = sinon.spy()
      w2 = sinon.spy()
      w3 = sinon.spy()

      unwatchers.push lisa.watch ['name'], w1
      unwatchers.push lisa.watch ['age'], w2
      unwatchers.push lisa.watch w3

      lisa.name = 'lisa'
      lisa._flushWatches()

      expect(w1).to.have.been.calledOnce
      expect(w1).to.have.been.calledWith 'lisa', undefined
      expect(w2).to.not.have.been.called
      expect(w3).to.have.been.calledOnce
      expect(w3).to.have.been.calledWith {
        age             : undefined
        favoriteNumbers : undefined
        friends         : undefined
        mother          : undefined
        name            : "lisa"
      }, {
        age             : undefined
        favoriteNumbers : undefined
        friends         : undefined
        mother          : undefined
        name            : undefined
      }

    it 'should continue to fire other watches when one watch is unlistened', ->
      w1 = sinon.spy()
      w2 = sinon.spy()
      w3 = sinon.spy()

      unwatchers.push lisa.watch ['name'], w1
      unwatchers.push lisa.watch ['age'], w2
      uw3 = lisa.watch w3
      unwatchers.push uw3

      uw3()

      lisa.name = 'lisa'
      lisa._flushWatches()

      expect(w1).to.have.been.calledOnce
      expect(w1).to.have.been.calledWith 'lisa', undefined
      expect(w2).to.not.have.been.called
      expect(w3).to.not.have.been.called

  describe 'error conditions', ->
    it 'should throw an error if no callback is provided for a watch', ->
      noCb = ->
        lisa.watch 'name'

      noCbOrProps = ->
        lisa.watch()

      expect(noCb).to.throw 'A watch must be provided with a callback function'
      expect(noCbOrProps).to.throw 'A watch must be provided with a callback function'

    it 'should throw an error if single property is specified that is not part of the schema', ->
      badProp = ->
        lisa.watch 'face', ->

      expect(badProp).to.throw 'Cannot set watch on face'

    it 'should throw an error if one of multiple properties is not part of the schema', ->
      badProp = ->
        lisa.watch ['name', 'age', 'face'], ->

      expect(badProp).to.throw 'Cannot set watch on face'

  describe 'nested schemas and propagation', ->
    bart = null
    marge = null
    homer = null

    beforeEach ->
      bart = new Person()
      marge = new Person()
      homer = new Person()

    it 'should fire a watch when a nested schema reference changes', ->
      lisa.watch ['mother'], watcher

      lisa.mother = marge
      lisa._flushWatches()

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith marge, undefined

    it 'should propagate changes on a nested schema to the parent schema', ->
      lisa.watch ['mother'], watcher

      lisa.mother = marge

      marge.name = 'marge'

      marge._flushWatches()
      lisa._flushWatches()

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith {
        name            : 'marge'
        age             : undefined
        favoriteNumbers : undefined
        mother          : undefined
        friends         : undefined
      }, undefined

      watcher.reset()

      marge.age = 45
      marge.favoriteNumbers = [1, 2, 3]

      marge._flushWatches()
      lisa._flushWatches()

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith {
        name            : 'marge'
        age             : 45
        favoriteNumbers : [1, 2, 3]
        mother          : undefined
        friends         : undefined
      }, {
        name            : 'marge'
        age             : undefined
        favoriteNumbers : undefined
        mother          : undefined
        friends         : undefined
      }

    it.only 'should propagate changes on a nested schema to the parent schema', (done) ->
      console.log '-----'

      console.log '---> assign marge name, age, favorite numbers'
      marge.name = 'marge'
      marge.age = 45
      marge.favoriteNumbers = [1, 2, 3]

      console.log '---> set watch'
      lisa.watch ['mother'], ->
        console.log '<--- DONE'
        done()

      console.log '---> assign lisa name, mother'
      lisa.name = 'lisa'
      lisa.mother = marge



      console.log '---> finish set'

    it 'should propagate changes on a nested schema in an array to the parent schema', (done) ->
      console.log '---------'
      lisa.watch 'friends', (newVal, oldVal) ->
        console.trace()
        console.log JSON.stringify newVal
        done()

      lisa.friends = [marge, bart, homer]

      marge.name = 'marge'

#      expect(watcher).to.have.been.calledOnce
#      expect(watcher).to.have.been.calledWith [{
#        name            : 'marge'
#        age             : undefined
#        favoriteNumbers : undefined
#        mother          : undefined
#        friends         : undefined
#      }, {
#        name            : undefined
#        age             : undefined
#        favoriteNumbers : undefined
#        mother          : undefined
#        friends         : undefined
#      }, {
#        name            : undefined
#        age             : undefined
#        favoriteNumbers : undefined
#        mother          : undefined
#        friends         : undefined
#      }], undefined

    it 'should not cause an infinite loop if a change fires on a circular reference', ->
      lisa.friends = [bart]
      bart.friends = [lisa]

      lisa.watch watcher

      bart.name = 'bart'
      lisa.name = 'lisa'


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
    Scheming._flush()
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

    it 'should allow the use of _flush to mock async calls', ->
      a = null
      watcher = (newVal, oldVal)->
        expect(a).to.equal 5
        expect(newVal).to.equal 'lisa'
        expect(oldVal).to.equal undefined

      lisa.name = 'lisa'
      unwatchers.push lisa.watch 'name', watcher
      a = 5

      Scheming._flush()

    it 'should immediately invoke the watch callback with the current value', ->
      lisa.name = 'lisa'

      unwatchers.push lisa.watch 'name', watcher
      Scheming._flush()

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith 'lisa'

    it 'should immediately invoke a callback from a watch even if no changes are queued', ->
      lisa.watch 'name', watcher
      Scheming._flush()

      expect(watcher).to.have.been.called

    it 'should reflect the construction as a change', ->
      lisa = new Person name : 'lisa'
      lisa.watch 'name', watcher
      Scheming._flush()

      expect(watcher).to.have.been.calledOnce
      expect(watcher).to.have.been.calledWith 'lisa', undefined

    it 'should fire the watch each time the value changes', ->
      lisa.name = 'lisa'

      unwatchers.push lisa.watch 'name', watcher

      lisa.name = 'LISA!'

      Scheming._flush()

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith 'LISA!'

    it 'should not fire the watch if the value is set but is not changed', ->
      lisa.name = 'lisa'
      unwatchers.push lisa.watch 'name', watcher
      Scheming._flush()
      watcher.reset()

      lisa.name = 'lisa'
      Scheming._flush()

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
      Scheming._flush()
      expect(watcher).to.have.been.called
      watcher.reset()

      expect(watcher).not.to.have.been.called
      unwatch()

      lisa.name = 'LISA!'
      Scheming._flush()

      expect(watcher).not.to.have.been.called

    it 'should not cause an error to invoke the unwatch more than once', ->
      lisa.name = 'lisa'

      unwatch = lisa.watch 'name', watcher
      unwatchers.push unwatch
      Scheming._flush()

      unwatch()
      expect(unwatch).to.not.throw 'Error'

    it 'should fire a watch on changes to arrays', ->
      lisa.favoriteNumbers = [1, 2, 3]
      lisa.watch 'favoriteNumbers', watcher

      lisa.favoriteNumbers = lisa.favoriteNumbers.concat [4, 5]

      Scheming._flush()

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith [1,2,3,4,5], undefined

    it 'should fire a watch when an array value changes to empty', ->
      lisa.favoriteNumbers = [1, 2, 3]
      lisa.watch 'favoriteNumbers', watcher

      Scheming._flush()

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith [1,2,3], undefined
      watcher.reset()

      lisa.favoriteNumbers = []

      Scheming._flush()

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith [], [1,2,3]

    it 'should fire a watch only once per synchronous block of changes, with the most recent value, and the original previous value', ->
      lisa.watch 'name', watcher

      lisa.name = 'lisa'
      lisa.name = 'LiSa'
      lisa.name = 'LISA!'

      Scheming._flush()

      expect(watcher).to.have.been.calledOnce
      expect(watcher).to.have.been.calledWith 'LISA!', undefined

    it 'should fire a watch if a new watch is set in the same block as a watched property changes', ->
      unwatch = lisa.watch 'name', watcher
      lisa.name = 'lisa'

      Scheming._flush()

      expect(watcher).to.have.been.calledOnce
      expect(watcher).to.have.been.calledWith 'lisa', undefined
      watcher.reset()

      otherWatcher = sinon.spy()

      lisa.name = 'LISA'
      unwatch()
      lisa.watch 'name', otherWatcher

      Scheming._flush()

      expect(otherWatcher).to.have.beenCalled

    it 'should fire a watch if a value has undefined assigned', ->
      lisa.watch 'name', watcher
      lisa.name = 'lisa'

      Scheming._flush()
      watcher.reset()

      lisa.name = undefined
      Scheming._flush()
      expect(watcher).to.have.been.calledOnce
      expect(watcher).to.have.been.calledWith undefined, 'lisa'

  describe 'watching multiple properties', ->
    it 'should accept multiple properties in an array', ->
      unwatchers.push lisa.watch ['name', 'age'], (name, age) ->

    it 'should immediately invoke the watch callback with each of the current values', ->
      lisa.name = 'lisa'
      lisa.age = 7

      unwatchers.push lisa.watch ['name', 'age'], watcher

      Scheming._flush()

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith {name : 'lisa', age : 7}, {name : undefined, age : undefined}

    it 'should aggregate each synchronous block of property changes', ->
      unwatchers.push lisa.watch ['name', 'age'], watcher
      lisa.name = 'lisa'
      lisa.age = 7

      lisa.name = 'LISA!'

      Scheming._flush()

      expect(watcher).to.have.been.calledOnce
      expect(watcher).to.have.been.calledWith {name : 'LISA!', age : 7}, {name : undefined, age : undefined}

      watcher.reset()

      lisa.age = 8
      Scheming._flush()

      expect(watcher).to.have.been.calledOnce
      expect(watcher).to.have.been.calledWith {name : 'LISA!', age : 8}, {name : 'LISA!', age : 7}

    it 'should not fire the watch if any of the values is set but not changed', ->
      lisa.name = 'lisa'
      lisa.age = 7

      unwatchers.push lisa.watch ['name', 'age'], watcher
      Scheming._flush()
      watcher.reset()

      lisa.name = 'lisa'
      lisa.age = 7
      Scheming._flush()

      expect(watcher).to.not.have.been.called

  describe 'watching objects', ->
    it 'should accept a watch with no specified properties', ->
      unwatchers.push lisa.watch ->

    it 'should fire the watch when any property of the object changes', ->
      unwatchers.push lisa.watch watcher

      lisa.name = 'lisa'
      lisa.age = 7
      Scheming._flush()

      expect(watcher).to.have.been.calledOnce

    it 'should return all properties of object on a watch', ->
      unwatchers.push lisa.watch watcher
      lisa.name = 'lisa'
      Scheming._flush()

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

      Scheming._flush()
      w1.reset()
      w2.reset()
      w3.reset()

      lisa.name = 'lisa'
      Scheming._flush()

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

      Scheming._flush()
      w1.reset()
      w2.reset()
      w3.reset()

      uw3()

      lisa.name = 'lisa'
      Scheming._flush()

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
      marge = new Person()
      homer = new Person()
      bart = new Person()

    it 'should fire a watch when a nested schema reference changes', ->
      lisa.watch ['mother'], watcher

      lisa.mother = marge
      Scheming._flush()

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith marge, undefined

    it 'should propagate changes on a nested schema to the parent schema', ->
      watcher = sinon.spy (newVal, oldVal)->

      lisa.watch ['mother'], watcher

      lisa.mother = marge

      marge.name = 'marge'

      Scheming._flush()

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith marge, undefined

      watcher.reset()

      marge.age = 45
      marge.favoriteNumbers = [1, 2, 3]

      Scheming._flush()

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith marge, {
        name            : 'marge'
        age             : undefined
        favoriteNumbers : undefined
        mother          : undefined
        friends         : undefined
      }

    it 'simple test case', (done) ->
      marge.name = 'marge'
      marge.age = 45
      marge.favoriteNumbers = [1, 2, 3]

      lisa.watch ['mother'], (newVal, oldVal) ->
        done()

      lisa.name = 'lisa'
      lisa.mother = marge


    it 'should not care about order', (done) ->
      lisa.watch ['mother'], ->
        done()

      marge.name = 'marge'
      marge.age = 45
      marge.favoriteNumbers = [1, 2, 3]

      lisa.name = 'lisa'
      lisa.mother = marge

    it 'should fire a watch on setup of a nested schema in an array to the parent schema', ->
      lisa.watch 'friends', watcher
      lisa.friends = [marge, bart, homer]

      Scheming._flush()

      expect(watcher).to.have.been.calledOnce
      expect(watcher).to.have.been.calledWith [marge, bart, homer], undefined

    it 'should propagate changes on a nested schema in an array to the parent schema', ->
      lisa.watch 'friends', watcher
      lisa.friends = [marge, bart, homer]

      Scheming._flush()
      watcher.reset()

      clones = [
        _.clone marge
        _.clone bart
        _.clone homer
      ]

      marge.name = 'marge'
      Scheming._flush()

      expect(watcher).to.have.been.calledOnce
      expect(watcher).to.have.been.calledWith [marge, bart, homer], clones

    it 'should not cause an infinite loop if a change fires on a circular reference', (done) ->
      lisa.friends = [bart]
      bart.friends = [lisa]

      lisa.watch ->
        done()

      bart.name = 'bart'
      lisa.name = 'lisa'

    it 'should propagate deeply nested events', ->
      spies = (sinon.spy() for n in [0...4])

      [wLisa, wMarge, wHomer, wBart] = spies

      lisa.watch wLisa
      marge.watch wMarge
      homer.watch wHomer
      bart.watch 'name', wBart

      lisa.mother = marge
      marge.mother = homer
      homer.mother = bart

      Scheming._flush()
      for spy, i in spies
        expect(spy).to.have.been.calledOnce
        spy.reset()

      bart.name = 'bart'
      Scheming._flush()
      for spy, i in spies
        expect(spy).to.have.been.calledOnce

    it 'should propagate without losing changes queued from external watches', ->
      i = 0

      lisa.watch 'name', ->
        marge.name = i++
      marge.watch 'name', watcher

      Scheming._flush()

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith '0', undefined

      watcher.reset()

      lisa.name = 'LISA!!'
      Scheming._flush()

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith '1', '0'

    it 'should propagate inter-dependant internal and external watches', ->
      i = 0;
      # I want an external change that causes an internal change
      bart.watch ->
        marge.name = i++

      lisa.mother = marge
      lisa.watch watcher

      Scheming._flush()
      watcher.reset()

      bart.name = 'BART'
      Scheming._flush()

      expect(watcher).to.have.been.called

    it 'should throw an error if external watches create an infinite loop', ->
      i = 0

      lisa.watch 'name', ->
        marge.name = i++

      marge.watch 'name', ->
        lisa.name = i++

      expect(Scheming._flush).to.throw 'Aborting change propagation'

    it 'should still work if a watcher throws an error', ->
      lisa.watch 'name', ->
        throw new Error('OH GOD')

      lisa.watch 'name', watcher

      Scheming._flush()
      expect(watcher).to.have.been.called

{expect} = chai

describe 'Schema watch', ->
  Person = null
  lisa = null
  unwatchers = null
  watcher = null

  log = (args...) ->
    console.log args...

  beforeEach ->
    log '**** BEFOREEACH 1 ****'
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
    log '**** AFTEREACH ****'
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

    it 'should fire a watch only once per synchronous block of changes, with the most recent value, and the original previous value', ->
      lisa.watch 'name', watcher

      lisa.name = 'lisa'
      lisa.name = 'LiSa'
      lisa.name = 'LISA!'

      Scheming._flush()

      expect(watcher).to.have.been.calledOnce
      expect(watcher).to.have.been.calledWith 'LISA!', undefined

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
      log '**** BEFOREEACH 2 ****'
      bart = new Person()
      marge = new Person()
      homer = new Person()

    it 'should fire a watch when a nested schema reference changes', ->
      lisa.watch ['mother'], watcher

      lisa.mother = marge
      Scheming._flush()

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith marge, undefined

    it 'should propagate changes on a nested schema to the parent schema', ->
      watcher = sinon.spy (newVal, oldVal)->
        log ''

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
      log '**** TEST BODY ****'

      log '---> assign marge name, age, favorite numbers'
      marge.name = 'marge'
      marge.age = 45
      marge.favoriteNumbers = [1, 2, 3]

      log '---> set watch'
      lisa.watch ['mother'], (newVal, oldVal) ->
        log newVal
        log oldVal
        log '<--- DONE'
        done()

      log '---> assign lisa name, mother'
      lisa.name = 'lisa'
      lisa.mother = marge

      log '---> finish set'

    it 'should not care about order but it does!', (done) ->
      log '-----'

      log '---> set watch'
      lisa.watch ['mother'], ->
        log '<--- DONE'
        done()

      log '---> assign marge name, age, favorite numbers'
      marge.name = 'marge'
      marge.age = 45
      marge.favoriteNumbers = [1, 2, 3]

      log '---> assign lisa name, mother'
      lisa.name = 'lisa'
      lisa.mother = marge

      log '---> finish set'

    it 'should propagate changes on a nested schema in an array to the parent schema', ->
      log '---------'
      lisa.watch 'friends', watcher
      lisa.friends = [marge, bart, homer]

      marge.name = 'marge'

      Scheming._flush()

      expect(watcher).to.have.been.calledOnce
      expect(watcher).to.have.been.calledWith [marge, bart, homer], undefined

    it 'should not cause an infinite loop if a change fires on a circular reference', (done) ->
      lisa.friends = [bart]
      bart.friends = [lisa]

      lisa.watch ->
        done()

      bart.name = 'bart'
      lisa.name = 'lisa'

    it.only 'should propagate deeply nested events', ->
      spies = (sinon.spy() for n in [0...4])

      [wLisa, wMarge, wHomer, wBart] = spies

      lisa.watch wLisa
      marge.watch wMarge
      homer.watch wHomer
      bart.watch 'name', wBart

      lisa.mother = marge
      marge.mother = homer
      homer.mother = bart

      log 'FIRSTFLUSH'
      Scheming._flush()
      for spy, i in spies
        expect(spy).to.have.been.calledOnce
        spy.reset()

      bart.name = 'bart'
      log 'SECONDFLUSH'
      Scheming._flush()
      for spy, i in spies
        console.log i, spy.callCount
#        expect(spy).to.have.been.calledOnce

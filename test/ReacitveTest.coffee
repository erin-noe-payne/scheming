{expect} = chai

describe.only 'Schema watch', ->
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
    Scheming.reset()

    unwatch() for unwatch in unwatchers

  describe 'watching single properties', ->
    it 'should take a property name, an instance, and a watch callback', ->
      unwatchers.push Person.watch lisa, 'name', (name) ->

    it 'should immediately invoke the watch callback with the current value', ->
      lisa.name = 'lisa'

      unwatchers.push Person.watch lisa, 'name', watcher

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith 'lisa'

    it 'should fire the watch each time the value changes', ->
      lisa.name = 'lisa'

      unwatchers.push Person.watch lisa, 'name', watcher

      watcher.reset()

      lisa.name = 'LISA!'

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith 'LISA!'

    it 'should not fire the watch if the value is set but is not changed', ->
      lisa.name = 'lisa'

      unwatchers.push Person.watch lisa, 'name', watcher

      watcher.reset()

      lisa.name = 'lisa'

      expect(watcher).to.not.have.been.called

    it 'should return an unwatch function', ->
      lisa.name = 'lisa'

      unwatch = Person.watch lisa, 'name', watcher
      unwatchers.push unwatch

      watcher.reset()

      expect(unwatch).to.be.a 'function'

    it 'should not fire the watch once the unwatch has been invoked', ->
      lisa.name = 'lisa'

      unwatch = Person.watch lisa, 'name', watcher
      unwatchers.push unwatch

      watcher.reset()
      expect(watcher).not.to.have.been.called

      unwatch()

      lisa.name = 'LISA!'

      expect(watcher).not.to.have.been.called

    it 'should not cause an error to invoke the unwatch more than once', ->
      lisa.name = 'lisa'

      unwatch = Person.watch lisa, 'name', watcher
      unwatchers.push unwatch

      watcher.reset()

      unwatch()
      expect(unwatch).to.not.throw 'Error'

    it 'should fire a watch on changes to arrays', ->
      lisa.favoriteNumbers = [1, 2, 3]
      Person.watch lisa, 'favoriteNumbers', watcher

      lisa.favoriteNumbers = lisa.favoriteNumbers.concat [4, 5]

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith [1,2,3,4,5], [1,2,3]

    it 'should not pass references to the actual array', ->
      lisa.favoriteNumbers = [1, 2, 3]
      Person.watch lisa, 'favoriteNumbers', watcher

      newVal = [1,2,3,4,5]
      lisa.favoriteNumbers = [1,2,3,4,5]

      passedArray = watcher.firstCall.args[0]
      expect(passedArray).to.not.equal newVal

  describe 'watching multiple properties', ->
    it 'should accept multiple properties in an array', ->
      unwatchers.push Person.watch lisa, ['name', 'age'], (name, age) ->

    it 'should immediately invoke the watch callback with each of the current values as a separate argument', ->
      lisa.name = 'lisa'
      lisa.age = 7

      unwatchers.push Person.watch lisa, ['name', 'age'], watcher

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith {name : 'lisa', age : 7}, {name : 'lisa', age : 7}

    it 'should fire the watch each time any one of the properties change', ->
      lisa.name = 'lisa'
      lisa.age = 7

      unwatchers.push Person.watch lisa, ['name', 'age'], watcher

      watcher.reset()

      lisa.name = 'LISA!'

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith {name : 'LISA!', age : 7}, {name : 'lisa', age : 7}

      watcher.reset()

      lisa.age = 8

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith {name : 'LISA!', age : 8}, {name : 'LISA!', age : 7}

    it 'should not fire the watch if any of the values is set but not changed', ->
      lisa.name = 'lisa'
      lisa.age = 7

      unwatchers.push Person.watch lisa, ['name', 'age'], watcher

      watcher.reset()

      lisa.name = 'lisa'
      lisa.age = 7

      expect(watcher).to.not.have.been.called

    it 'should fire a watch once per assignment', ->
      unwatchers.push Person.watch lisa, ['name', 'age'], watcher

      watcher.reset()

      lisa.name = 'lisa'
      lisa.age = 7

      expect(watcher).to.have.been.calledTwice

    it 'should fire a watch once per `set`', ->
      unwatchers.push Person.watch lisa, ['name', 'age'], watcher

      watcher.reset()

      lisa.set
        name : 'lisa'
        age  : 7

      expect(watcher).to.have.been.calledOnce

  describe 'watching objects', ->
    it 'should accept a watch with no specified properties', ->
      unwatchers.push Person.watch lisa, ->

    it 'should fire the watch when any property of the object changes', ->
      unwatchers.push Person.watch lisa, watcher

      lisa.name = 'lisa'
      lisa.age = 7

      expect(watcher).to.have.been.calledThrice

    it 'should return all properties of object on a watch', ->
      unwatchers.push Person.watch lisa, watcher
      watcher.reset()

      lisa.name = 'lisa'

      expect(watcher).to.have.been.calledWith {
        age             : undefined
        favoriteNumbers : undefined
        friends         : undefined
        mother          : undefined
        name            : "lisa"
      }

  describe 'multiple watches', ->
    it 'should fire only relevant watches when a property changes', ->
      w1 = sinon.spy()
      w2 = sinon.spy()
      w3 = sinon.spy()

      unwatchers.push Person.watch lisa, ['name'], w1
      unwatchers.push Person.watch lisa, ['age'], w2
      unwatchers.push Person.watch lisa, w3

      w1.reset()
      w2.reset()
      w3.reset()

      lisa.name = 'lisa'

      expect(w1).to.have.been.called
      expect(w1).to.have.been.calledWith 'lisa', undefined
      expect(w2).to.not.have.been.called
      expect(w3).to.have.been.called

    it 'should continue to fire other watches when one watch is unlistened', ->
      w1 = sinon.spy()
      w2 = sinon.spy()
      w3 = sinon.spy()

      unwatchers.push Person.watch lisa, ['name'], w1
      unwatchers.push Person.watch lisa, ['age'], w2
      uw3 = Person.watch lisa, w3
      unwatchers.push uw3

      w1.reset()
      w2.reset()
      w3.reset()
      uw3()

      lisa.name = 'lisa'

      expect(w1).to.have.been.calledOnce
      expect(w1).to.have.been.calledWith 'lisa', undefined
      expect(w2).to.not.have.been.called
      expect(w3).to.not.have.been.called

  describe 'error conditions', ->
    it 'should throw an error if no callback is provided for a watch', ->
      noCb = ->
        Person.watch lisa, 'name'

      noCbOrProps = ->
        Person.watch lisa

      expect(noCb).to.throw 'A watch must be provided with a callback function'
      expect(noCbOrProps).to.throw 'A watch must be provided with a callback function'

    it 'should throw an error if single property is specified that is not part of the schema', ->
      badProp = ->
        Person.watch lisa, 'face', ->

      expect(badProp).to.throw 'Cannot set watch on face'

    it 'should throw an error if one of multiple properties is not part of the schema', ->
      badProp = ->
        Person.watch lisa, ['name', 'age', 'face'], ->

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
      Person.watch lisa, ['mother'], watcher
      watcher.reset()

      lisa.mother = marge

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith marge, undefined

    it 'should propagate changes on a nested schema to the parent schema', ->
      Person.watch lisa, ['mother'], watcher

      lisa.mother = marge
      watcher.reset()

      marge.name = 'marge'

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith {
        name            : 'marge'
        age             : undefined
        favoriteNumbers : undefined
        mother          : undefined
        friends         : undefined
      }, {
        name            : undefined
        age             : undefined
        favoriteNumbers : undefined
        mother          : undefined
        friends         : undefined
      }

    it 'should propagate changes on a nested schema in an array to the parent schema', ->
      Person.watch lisa, watcher

      lisa.friends = [marge, bart, homer]
      watcher.reset()

      marge.name = 'marge'

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith [{
        name            : 'marge'
        age             : undefined
        favoriteNumbers : undefined
        mother          : undefined
        friends         : undefined
      }, {
        name            : undefined
        age             : undefined
        favoriteNumbers : undefined
        mother          : undefined
        friends         : undefined
      }, {
        name            : undefined
        age             : undefined
        favoriteNumbers : undefined
        mother          : undefined
        friends         : undefined
      }], [{
        name            : undefined
        age             : undefined
        favoriteNumbers : undefined
        mother          : undefined
        friends         : undefined
      }, {
        name            : undefined
        age             : undefined
        favoriteNumbers : undefined
        mother          : undefined
        friends         : undefined
      }, {
        name            : undefined
        age             : undefined
        favoriteNumbers : undefined
        mother          : undefined
        friends         : undefined
      }]

    it 'should not cause an infinite loop if a change fires on a circular reference', ->
      lisa.friends = [bart]
      bart.friends = [lisa]

      Person.watch lisa, watcher

      bart.name = 'bart'
      lisa.name = 'lisa'


{expect} = chai

describe.only 'Schema watch', ->

  Person = null
  lisa = null
  unwatchers = null

  beforeEach ->
    Person = Scheming.create 'Person',
      name : String
      age : Number
      favoriteNumbers : [Number]
      mother : 'Schema:Person'
      friends : ['Schema:Person']

    lisa = new Person()

    unwatchers = []

  afterEach ->
    Scheming.reset()

    unwatch() for unwatch in unwatchers

  describe 'watching single properties', ->

    it 'should take a property name, an instance, and a watch callback', ->
      unwatchers.push Person.watch lisa, 'name', (name) ->

    it 'should immediately invoke the watch callback with the current value', ->
      lisa.name = 'lisa'

      watcher = sinon.spy()

      unwatchers.push Person.watch lisa, 'name', watcher

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith 'lisa'

    it 'should fire the watch each time the value changes', ->
      lisa.name = 'lisa'

      watcher = sinon.spy()

      unwatchers.push Person.watch lisa, 'name', watcher

      watcher.reset()

      lisa.name = 'LISA!'

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith 'LISA!'

    it 'should not fire the watch if the value is set but is not changed', ->
      lisa.name = 'lisa'

      watcher = sinon.spy()

      unwatchers.push Person.watch lisa, 'name', watcher

      watcher.reset()

      lisa.name = 'lisa'

      expect(watcher).to.not.have.been.called

    it 'should return an unwatch function', ->
      lisa.name = 'lisa'

      watcher = sinon.spy()

      unwatch = Person.watch lisa, 'name', watcher
      unwatchers.push unwatch

      watcher.reset()

      expect(unwatch).to.be.a 'function'

    it 'should not fire the watch once the unwatch has been invoked', ->
      lisa.name = 'lisa'

      watcher = sinon.spy()

      unwatch = Person.watch lisa, 'name', watcher
      unwatchers.push unwatch

      watcher.reset()

      unwatch()

      lisa.name = 'LISA!'

      expect(unwatch).not.to.have.been.called

    it 'should not cause an error to invoke the unwatch more than once', ->
      lisa.name = 'lisa'

      watcher = sinon.spy()

      unwatch = Person.watch lisa, 'name', watcher
      unwatchers.push unwatch

      watcher.reset()

      unwatch()
      expect(unwatch).to.not.throw 'Error'

  describe 'watching multiple properties', ->
    it 'should accept multiple properties in an array', ->
      unwatchers.push Person.watch lisa, ['name', 'age'], (name, age) ->

    it 'should immediately invoke the watch callback with each of the current values as a separate argument', ->
      lisa.name = 'lisa'
      lisa.age = 7

      watcher = sinon.spy()

      unwatchers.push Person.watch lisa, ['name', 'age'], watcher

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith 'lisa', 7

    it 'should fire the watch each time any one of the properties change', ->
      lisa.name = 'lisa'
      lisa.age = 7

      watcher = sinon.spy()

      unwatchers.push Person.watch lisa, ['name', 'age'], watcher

      watcher.reset()

      lisa.name = 'LISA!'

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith 'LISA!', 7

      watcher.reset()

      lisa.age = 8

      expect(watcher).to.have.been.called
      expect(watcher).to.have.been.calledWith 'LISA!', 8

    it 'should not fire the watch if any of the values is set but not changed', ->
      lisa.name = 'lisa'
      lisa.age = 7

      watcher = sinon.spy()

      unwatchers.push Person.watch lisa, ['name', 'age'], watcher

      watcher.reset()

      lisa.name = 'lisa'
      lisa.age = 7

      expect(watcher).to.not.have.been.called

  describe 'watching objects', ->
    it 'should accept a watch with no specified properties', ->
      unwatchers.push Person.watch lisa, ->

  describe 'error conditions', ->
    it 'should throw an error if no callback is provided for a watch'
    it 'should throw an error if single property is specified that is not part of the schema'
    it 'should throw an error if one of multiple properties is not part of the schema'

  describe 'propagation', ->




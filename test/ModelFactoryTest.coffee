{expect} = chai

Types = Registry = ModelFactory = InstanceFactory = null

describe 'ModelFactory', ->

  beforeEach ->
    Types = sinon.stub require '../src/Types'
    Registry = sinon.stub require '../src/Registry'
    InstanceFactory = sinon.stub require '../src/InstanceFactory'
    ModelFactory = proxyquire '../src/ModelFactory', {Types, Registry, InstanceFactory}

  afterEach ->
    sinon.restore(Types)
    sinon.restore(Registry)
    sinon.restore(InstanceFactory)

  describe 'normalizePropertyConfig', ->
    resolveType = null
    mockType = {}

    beforeEach ->
      Types.resolveType.returns mockType

    it 'should, if it receives an object with a type key, pass the type key to resolveType', ->
      ModelFactory.normalizePropertyConfig {type : 'integer'}, 'age'

      expect(Types.resolveType).to.have.been.called
      expect(Types.resolveType).to.have.been.calledWith 'integer'

    it 'should, if it receives an object without a type key, pass the entire object to resolveType', ->
      object = {name : 'String', age : 'Number'}
      ModelFactory.normalizePropertyConfig object, 'owner'

      expect(Types.resolveType).to.have.been.called
      expect(Types.resolveType).to.have.been.calledWith object

    it 'should pass TYPE references to resolveType', ->
      ModelFactory.normalizePropertyConfig Scheming.TYPES.String, 'name'

      expect(Types.resolveType).to.have.been.called
      expect(Types.resolveType).to.have.been.calledWith Scheming.TYPES.String

    it 'should pass type strings to resolveType', ->
      ModelFactory.normalizePropertyConfig 'number', 'name'

      expect(Types.resolveType).to.have.been.called
      expect(Types.resolveType).to.have.been.calledWith 'number'

    it 'should pass type constructors to resolveType', ->
      ModelFactory.normalizePropertyConfig Date, 'name'

      expect(Types.resolveType).to.have.been.called
      expect(Types.resolveType).to.have.been.calledWith Date

    it 'should return a normalized definition with all property config options explicitly defined', ->
      definition = ModelFactory.normalizePropertyConfig {type : String}, 'name'

      expect(definition).to.have.ownProperty 'type'
      expect(definition).to.have.ownProperty 'default'
      expect(definition).to.have.ownProperty 'getter'
      expect(definition).to.have.ownProperty 'setter'
      expect(definition).to.have.ownProperty 'validate'
      expect(definition).to.have.ownProperty 'required'

    it 'should allow extension of the property config with arbitrary keys', ->
      definition = ModelFactory.normalizePropertyConfig {
        type       : String
        columnName : 'NameId'
      }, 'name'

      expect(definition).to.have.ownProperty 'columnName'
      expect(definition.columnName).to.equal 'NameId'

    it 'should throw an error if the type cannot be resolved', ->
      invokeWithNoType = ->
        ModelFactory.normalizePropertyConfig(undefined, 'name')

      expect(invokeWithNoType).to.throw 'Schema type must be defined'

    it 'should throw an error getter is defined and not a function', ->
      invokeWithStringGetter = ->
        ModelFactory.normalizePropertyConfig({type : 'string', getter : 'asdf'}, 'name')

      expect(invokeWithStringGetter).to.throw 'Schema getter must be a function'

    it 'should throw an error setter is defined and not a function', ->
      invokeWithStringSetter = ->
        ModelFactory.normalizePropertyConfig({type : 'string', setter : 'asdf'}, 'name')

      expect(invokeWithStringSetter).to.throw 'Schema setter must be a function'

    it 'should throw an error if a single validator is not a function', ->
      invokeWithStringValidate = ->
        ModelFactory.normalizePropertyConfig({type : 'string', validate : 'asdf'}, 'name')

      expect(invokeWithStringValidate).to.throw 'Schema validate must be a function'

    it 'should throw an error if any validator is not a function', ->
      invokeWithStringValidate = ->
        ModelFactory.normalizePropertyConfig({type : 'string', validate : [(->), 'asdf', (->)]}, 'name')

      expect(invokeWithStringValidate).to.throw 'Schema validate must be a function'

  describe 'create', ->

    it 'should return a Model constructor', ->
      Model = ModelFactory.create()
      expect(Model).to.be.a('function')
      expect(Model.__schemaId).to.exist

    it 'should register the Model by name', ->
      Model = ModelFactory.create 'Car'

      expect(Registry.register).to.have.been.calledOnce
      expect(Registry.register).to.have.been.calledWith 'Car', Model

    it 'should name the Model constructor', ->
      Car = ModelFactory.create 'Car'

      expect(Car.name).to.equal 'Car'

    it 'should throw an error if the name is not a valid function name', ->
      expect( -> ModelFactory.create '1-2-3').to.throw "1-2-3 is not a valid function name."

    it 'should generate a name if it is not provided', ->
      Model = ModelFactory.create()

      expect(Model.name).to.exist
      expect(Model.name).to.be.a('string')

    it 'should generate unique names for each unnamed model', ->
      Model1 = ModelFactory.create()
      Model2 = ModelFactory.create()

      expect(Model1.name).to.not.equal(Model2.name)

    it 'should defineProperties on the model based on the provided schema', ->
      sinon.stub ModelFactory, 'normalizePropertyConfig'
      ModelFactory.normalizePropertyConfig.returns {hello: 'world'}

      Person = ModelFactory.create 'Person', {name : String, age : Number}

      expect(Person.getProperties()).to.eql {name : {hello: 'world'}, age : {hello : 'world'}}

      ModelFactory.normalizePropertyConfig.restore()

  describe 'Models', ->
    Model = null

    beforeEach ->
      Model = ModelFactory.create()
      sinon.stub ModelFactory, 'normalizePropertyConfig'

    afterEach ->
      sinon.restore ModelFactory

    describe 'defineProperty', ->
      it 'should throw an error if a property name is not provided', ->
        expect(-> Model.defineProperty()).to.throw "First argument: property name must be a string."

      it 'should throw an error if the property name is not a string', ->
        expect(-> Model.defineProperty({})).to.throw "First argument: property name must be a string."

      it 'should throw an error if a property configuration is not provided', ->
        expect(-> Model.defineProperty('a')).to.throw "Second argument: property configuration is required."

      it 'should normalize the property configuration', ->
        config = {}
        Model.defineProperty 'name', config

        expect(ModelFactory.normalizePropertyConfig).to.have.been.calledOnce
        expect(ModelFactory.normalizePropertyConfig).to.have.been.calledWith config

    describe 'defineProperties', ->
      it 'should throw an error if input is not provided', ->
        expect( -> Model.defineProperties()).to.throw "First argument: properties must be an object."

      it 'should throw an error if input is not an object', ->
        expect( -> Model.defineProperties('!!!')).to.throw "First argument: properties must be an object."

      it 'should invoke defineProperty for each key value pair of input', ->
        sinon.spy Model, 'defineProperty'

        properties =
          a : {}
          b : String

        Model.defineProperties(properties)

        expect(Model.defineProperty).to.have.been.calledTwice
        expect(Model.defineProperty).to.have.been.calledWith 'a', {}
        expect(Model.defineProperty).to.have.been.calledWith 'b', String

        Model.defineProperty.restore()

    describe 'getProperties', ->
      it 'should return an empty object if no properties are defined', ->
        expect(Model.getProperties()).to.eql {}

      it 'should return the Model\'s normalized schema', ->
        ModelFactory.normalizePropertyConfig.returns {hello:'world'}

        Model.defineProperties {name : String, age : Number}

        expect(Model.getProperties()).to.eql
          name : {hello:'world'}
          age : {hello:'world'}

      it 'should defensively copy the schema to protect from mutations', ->
        ModelFactory.normalizePropertyConfig.returns {hello:'world'}
        Model.defineProperties {name : String, age : Number}

        expect(Model.getProperties()).to.not.equal Model.getProperties()

    describe 'getProperty', ->
      it 'should return undefined if the property name is not defined', ->
        expect(Model.getProperty('name')).to.be.undefined

      it 'should return Model\'s normalize schema property', ->
        ModelFactory.normalizePropertyConfig.returns {hello:'world'}
        Model.defineProperty 'name', String

        expect(Model.getProperty('name')).to.eql {hello:'world'}

      it 'should defensively copy the schema to protect from mutation', ->
        ModelFactory.normalizePropertyConfig.returns {hello:'world'}
        Model.defineProperty 'name', String

        expect(Model.getProperty('name')).to.not.equal Model.getProperty('name')

    describe 'eachProperty', ->
      cb = null

      beforeEach ->
        cb = sinon.spy()

      it 'should throw an error if a callback is not provided', ->
        expect(-> Model.eachProperty()).to.throw "First argument: callback must be a function."

      it 'should throw an error if the callback is not a function', ->
        expect(-> Model.eachProperty('hi')).to.throw "First argument: callback must be a function."

      it 'should invoke the callback zero times if there are no defined properties', ->
        Model.eachProperty(cb)

        expect(cb).to.not.have.been.called

      it 'should invoke the callback with each property name and normalized schema property', ->
        ModelFactory.normalizePropertyConfig.returns {hello:'world'}
        Model.defineProperties {name : String, age : Number}

        Model.eachProperty(cb)

        expect(cb).to.have.been.calledTwice
        expect(cb).to.have.been.calledWith 'name', {hello: 'world'}
        expect(cb).to.have.been.calledWith 'age', {hello: 'world'}


      it 'should defensively copy the schema to protect from mutation', ->
        ModelFactory.normalizePropertyConfig.returns {hello:'world'}
        Model.defineProperties {name : String, age : Number}

        Model.eachProperty (propName, propConfig) ->
          expect(propConfig).to.not.equal Model.getProperty(propName)

    describe 'constructor', ->
      it 'should invoke InstanceFactory.create', ->
        schema =
          name : String
          age : Number
        state =
          name : 'lisa'
          age : 7
        opts =
          seal : true
          strict : false
        Person = ModelFactory.create 'Person', schema, opts
        p = new Person state

        expect(InstanceFactory.create).to.have.been.calledOnce
        expect(InstanceFactory.create).to.have.been.calledWith p, Person.getProperties(), state, opts

      it 'uses default options if none are given', ->
        schema =
          name : String
          age : Number
        state =
          name : 'lisa'
          age : 7

        Person = ModelFactory.create 'Person', schema
        p = new Person state

        expect(InstanceFactory.create).to.have.been.calledOnce
        expect(InstanceFactory.create).to.have.been.calledWith p, Person.getProperties(), state, {strict : false, seal : false}

      it 'merges provided options with defaults', ->
        schema =
          name : String
          age : Number
        state =
          name : 'lisa'
          age : 7
        opts = seal : true

        Person = ModelFactory.create 'Person', schema, opts
        p = new Person state

        expect(InstanceFactory.create).to.have.been.calledOnce
        expect(InstanceFactory.create).to.have.been.calledWith p, Person.getProperties(), state, {strict : false, seal : true}

      it 'respects overrides to default options', ->
        ModelFactory.DEFAULT_OPTIONS = strict : true, seal : true

        schema =
          name : String
          age : Number
        state =
          name : 'lisa'
          age : 7

        Person = ModelFactory.create 'Person', schema
        p = new Person state

        expect(InstanceFactory.create).to.have.been.calledOnce
        expect(InstanceFactory.create).to.have.been.calledWith p, Person.getProperties(), state, {strict : true, seal : true}

Skema = require '../lib/skema'
sinon = require 'sinon'
chai = require 'chai'
sinonChai = require 'sinon-chai'
_ = require 'lodash'

chai.use sinonChai

{expect} = chai

describe 'Skema', ->

  afterEach ->
    Skema.reset()

  describe 'TYPES', ->
    describe 'identifiers', -> #TODO
      identifierIo =
        String  : [
          {input : 'asdf', output : true}
          {input : '1', output : true}
          {input : 1, output : false}
          {input : 1.5, output : false}
          {input : new Date('9/14/86'), output : false}
          {input : false, output : false}
          {input : null, output : false}
          {input : undefined, output : false}
        ]
        Number  : [
          {input : 'asdf', output : false}
          {input : '1', output : false}
          {input : 1, output : true}
          {input : 1.5, output : true}
          {input : new Date('9/14/86'), output : false}
          {input : false, output : false}
          {input : null, output : false}
          {input : undefined, output : false}
        ]
        Integer : [
          {input : 'asdf', output : false}
          {input : '1', output : false}
          {input : 1, output : true}
          {input : 1.5, output : false}
          {input : new Date('9/14/86'), output : false}
          {input : false, output : false}
          {input : null, output : false}
          {input : undefined, output : false}
        ]
        Float   : [
          {input : 'asdf', output : false}
          {input : '1', output : false}
          {input : 1, output : true}
          {input : 1.5, output : true}
          {input : new Date('9/14/86'), output : false}
          {input : false, output : false}
          {input : null, output : false}
          {input : undefined, output : false}
        ]
        Date    : [
          {input : 'asdf', output : false}
          {input : '1', output : false}
          {input : 1, output : false}
          {input : 1.5, output : false}
          {input : new Date('9/14/86'), output : true}
          {input : false, output : false}
          {input : null, output : false}
          {input : undefined, output : false}
        ]
        Boolean : [
          {input : 'asdf', output : false}
          {input : '1', output : false}
          {input : 1, output : false}
          {input : 1.5, output : false}
          {input : new Date('9/14/86'), output : false}
          {input : false, output : true}
          {input : true, output : true}
          {input : null, output : false}
          {input : undefined, output : false}
        ]
        Mixed   : [
          {input : 'asdf', output : true}
          {input : '1', output : true}
          {input : 1, output : true}
          {input : 1.5, output : true}
          {input : new Date('9/14/86'), output : true}
          {input : false, output : true}
          {input : null, output : true}
          {input : undefined, output : true}
        ]

      for type, ioArgs of identifierIo
        describe "#{type}", ->
          for io, index in ioArgs
              {input, output} = io
              do (type, input, output) ->
                it "should correctly identify #{input}", ->
                  {identifier} = Skema.TYPES[type]

                  expect(identifier(input)).to.eql output

    describe 'parsers', ->
      parserIo =
        String  : [
          {input : 'asdf', output : 'asdf'}
          {input : 1, output : '1'}
          {input : 1.5, output : '1.5'}
          {input : new Date('9/14/86'), output : (new Date('9/14/86')).toString()}
          {input : false, output : 'false'}
          {input : null, output : 'null'}
          {input : undefined, output : 'undefined'}
        ]
        Number  : [
          {input : 'asdf', output : NaN}
          {input : 1, output : 1}
          {input : 1.5, output : 1.5}
          {input : new Date('9/14/86'), output : NaN}
          {input : false, output : NaN}
          {input : null, output : NaN}
          {input : undefined, output : NaN}
        ]
        Integer : [
          {input : 'asdf', output : NaN}
          {input : 1, output : 1}
          {input : 1.5, output : 1}
          {input : new Date('9/14/86'), output : NaN}
          {input : false, output : NaN}
          {input : null, output : NaN}
          {input : undefined, output : NaN}
        ]
        Float   : [
          {input : 'asdf', output : NaN}
          {input : 1, output : 1}
          {input : 1.5, output : 1.5}
          {input : new Date('9/14/86'), output : NaN}
          {input : false, output : NaN}
          {input : null, output : NaN}
          {input : undefined, output : NaN}
        ]
        Date    : [
          {input : 'asdf', output : new Date('asdf')}
          {input : 0, output : new Date(0)}
          {input : 1, output : new Date(1)}
          {input : 1.5, output : new Date(1.5)}
          {input : new Date('9/14/86'), output : new Date('9/14/86')}
          {input : false, output : new Date(false)}
          {input : null, output : new Date(null)}
          {input : undefined, output : new Date(undefined)}
        ]
        Boolean : [
          {input : 'asdf', output : true}
          {input : 0, output : false}
          {input : 1, output : true}
          {input : 1.5, output : true}
          {input : new Date('9/14/86'), output : true}
          {input : false, output : false}
          {input : null, output : false}
          {input : undefined, output : false}
        ]
        Mixed   : [
          {input : 'asdf', output : 'asdf'}
          {input : 0, output : 0}
          {input : 1, output : 1}
          {input : 1.5, output : 1.5}
          {input : new Date('9/14/86'), output : new Date('9/14/86')}
          {input : false, output : false}
          {input : null, output : null}
          {input : undefined, output : undefined}
        ]

      for type, ioArgs of parserIo
        describe "#{type}", ->
          for io, index in ioArgs
              {input, output} = io
              do (type, input, output) ->
                it "should parse #{input}", ->
                  {parser} = Skema.TYPES[type]

                  expect(parser(input)).to.eql output

      describe 'Arrays', ->
        ArrayIo = [
          {input : [], output : []}
          {input : [1, '2', null], output : [1, '2', null]}
          {input : 1, output : []}
          {input : new Date(), output : []}
          {input : {}, output : []}
          {input : null, output : []}
          {input : false, output : []}
          {input : undefined, output : []}
          {input : NaN, output : []}
        ]

        for io, index in ArrayIo
          {input, output} = io
          do (input, output) ->
            it "should parse #{input}", ->
              {parser} = Skema.NESTED_TYPES.Array

              expect(parser(input)).to.eql output

  describe 'resolveType', ->
    describe 'resolution', ->
      describe 'with primitive types', ->
        for k, type of Skema.TYPES
          do (k, type) ->
            it "should resolve #{type.string} TYPES reference", ->
              expect(Skema.resolveType type).to.equal type

            if type.ctor
              it "should resolve #{type.string} ctor", ->
                expect(Skema.resolveType type.ctor).to.equal type

            it "should resolve #{type.string} string", ->
              expect(Skema.resolveType type.string).to.equal type

        it 'should return null for an undefined TYPE reference', ->
          expect(Skema.resolveType Skema.TYPES.Custom).to.be.null

        it 'should return null for unrecognized type string', ->
          expect(Skema.resolveType 'notReal').to.be.null

        it 'should return null for unrecognized type constructor', ->
          ctor = ->

          expect(Skema.resolveType ctor).to.be.null

        it 'should return null for undefined value', ->
          expect(Skema.resolveType undefined).to.be.null

      describe 'with arrays', ->
        for k, type of Skema.TYPES
          do (k, type) ->
            it "should resolve #{type.string} TYPES reference", ->
              array = [type]
              resolved = Skema.resolveType array
              expect(resolved.string).to.equal 'array'
              expect(resolved.childType).to.equal type

            if type.ctor
              it "should resolve #{type.string} ctor", ->
                array = [type.ctor]
                resolved = Skema.resolveType array
                expect(resolved.string).to.equal 'array'
                expect(resolved.childType).to.equal type

            it "should resolve #{type.string} string", ->
              array = [type.string]
              resolved = Skema.resolveType array
              expect(resolved.string).to.equal 'array'
              expect(resolved.childType).to.equal type

      describe 'with Schemas', ->
        it 'should pass an object type to Skema.create', ->
          createSpy = sinon.stub Skema, 'create'
          mockctor = ->

          createSpy.returns mockctor

          obj = {}

          resolved = Skema.resolveType(obj)
          expect(createSpy).to.have.been.called
          expect(createSpy).to.have.been.calledWith obj

          expect(resolved.childType).to.equal mockctor

          createSpy.restore()

        it 'should use a Schema instance as its childType', ->
          ctr = Skema.create()

          resolved = Skema.resolveType ctr

          expect(resolved.childType).to.equal ctr

        it 'should treat Schema: string as a lazy-load schema', ->
          resolved = Skema.resolveType 'Schema:Car'

          expect(resolved.childType).not.to.exist

        it 'should resolve a lazy-load schema the first time identifier is invoked', ->
          sinon.stub Skema, 'get'
          Car = Skema.create()
          Skema.get.returns Car

          resolved = Skema.resolveType 'Schema:Car'

          resolved.identifier({})

          expect(Skema.get).to.have.been.called
          expect(Skema.get).to.have.been.calledWith 'Car'

          expect(resolved.childType).to.equal Car

          Skema.get.restore()

        it 'should resolve a lazy-load schema the first time parser is invoked', ->
          sinon.stub Skema, 'get'
          Car = Skema.create()
          Skema.get.returns Car

          resolved = Skema.resolveType 'Schema:Car'

          resolved.parser({})

          expect(Skema.get).to.have.been.called
          expect(Skema.get).to.have.been.calledWith 'Car'

          expect(resolved.childType).to.equal Car

          Skema.get.restore()

        it 'should throw an error if the specified Schema does not exist at time of lazy resolution', ->
          sinon.stub Skema, 'get'
          Skema.get.returns null

          resolved = Skema.resolveType 'Schema:Car'

          expect(resolved.parser).to.throw 'Error resolving Schema:Car'

          Skema.get.restore()

        it 'should correctly return true from identifier function on first invocation', ->
          resolved = Skema.resolveType 'Schema:Car'

          Car = Skema.create 'Car'
          car = new Car()

          expect(resolved.identifier(car)).to.be.true

        it 'should correctly return false from identifier function on first invocation', ->
          resolved = Skema.resolveType 'Schema:Car'

          Car = Skema.create 'Car'

          expect(resolved.identifier({})).to.be.false

        it 'should correctly apply parser on first invocation', ->
          resolved = Skema.resolveType 'Schema:Car'

          Car = Skema.create 'Car'

          expect(resolved.parser({})).to.be.instanceOf Car

      describe 'extensibility', ->

        describe 'custom types', ->
          customClass = null

          beforeEach ->
            customClass = class Custom

            Skema.TYPES.Custom =
              ctor : customClass
              string : 'custom'
              identifier : ->
              parser : ->

            sinon.stub Skema.TYPES.Custom, 'identifier'
            sinon.stub Skema.TYPES.Custom, 'parser'


          afterEach ->
            delete Skema.TYPES.Custom

          it 'should allow a custom type by reference', ->
            expect(Skema.resolveType Skema.TYPES.Custom).to.equal Skema.TYPES.Custom

          it 'should allow a custom type by constructor', ->
            expect(Skema.resolveType customClass).to.equal Skema.TYPES.Custom

          it 'should allow a custom type by string', ->
            expect(Skema.resolveType 'custom').to.equal Skema.TYPES.Custom

        describe 'overriding', ->

          it 'should support overriding of TYPE identifiers', ->
            {identifier} = Skema.TYPES.String
            newIdentifier = -> true
            Skema.TYPES.String.identifier = newIdentifier

            resolvedType = Skema.resolveType 'string'

            expect(resolvedType.identifier).to.equal newIdentifier

            Skema.TYPES.String.identifier = identifier

          it 'should support overriding of TYPE parsers', ->
            {parser} = Skema.TYPES.String
            newParser = -> true
            Skema.TYPES.String.parser = newParser

            resolvedType = Skema.resolveType 'string'

            expect(resolvedType.parser).to.equal newParser

            Skema.TYPES.String.parser = parser

  describe 'normalizeProperty', ->
    resolveType = null
    mockType = {}

    beforeEach ->
      resolveType = sinon.stub Skema, 'resolveType'
      resolveType.returns mockType

    afterEach ->
      resolveType.restore()

    it 'should, if it receives an object with a type key, pass the type key to resolveType', ->
      Skema.normalizeProperty {type : 'integer'}, 'age'

      expect(resolveType).to.have.been.called
      expect(resolveType).to.have.been.calledWith 'integer'

    it 'should, if it receives an object without a type key, pass the entire object to resolveType', ->
      object = {name : 'String', age : 'Number'}
      Skema.normalizeProperty object, 'owner'

      expect(resolveType).to.have.been.called
      expect(resolveType).to.have.been.calledWith object

    it 'should pass TYPE references to resolveType', ->
      Skema.normalizeProperty Skema.TYPES.String, 'name'

      expect(resolveType).to.have.been.called
      expect(resolveType).to.have.been.calledWith Skema.TYPES.String

    it 'should pass type strings to resolveType', ->
      Skema.normalizeProperty 'number', 'name'

      expect(resolveType).to.have.been.called
      expect(resolveType).to.have.been.calledWith 'number'

    it 'should pass type constructors to resolveType', ->
      Skema.normalizeProperty Date, 'name'

      expect(resolveType).to.have.been.called
      expect(resolveType).to.have.been.calledWith Date

    it 'should throw an error if the type cannot be resolved', ->
      invokeWithNoType = ->
        Skema.normalizeProperty(undefined, 'name')

      expect(invokeWithNoType).to.throw 'Schema type must be defined'

    it 'should throw an error getter is defined and not a function', ->
      invokeWithStringGetter = ->
        Skema.normalizeProperty({type : 'string', getter : 'asdf'}, 'name')

      expect(invokeWithStringGetter).to.throw 'Schema getter must be a function'

    it 'should throw an error setter is defined and not a function', ->
      invokeWithStringSetter = ->
        Skema.normalizeProperty({type : 'string', setter : 'asdf'}, 'name')

      expect(invokeWithStringSetter).to.throw 'Schema setter must be a function'

    it 'should throw an error if a single validator is not a function', ->
      invokeWithStringValidate = ->
        Skema.normalizeProperty({type : 'string', validate : 'asdf'}, 'name')

      expect(invokeWithStringValidate).to.throw 'Schema validate must be a function'

    it 'should throw an error if any validator is not a function', ->
      invokeWithStringValidate = ->
        Skema.normalizeProperty({type : 'string', validate : [(->), 'asdf', (->)]}, 'name')

      expect(invokeWithStringValidate).to.throw 'Schema validate must be a function'

  describe 'create', ->
    it 'should return a constructor function', ->
      Schema = Skema.create()

      expect(Schema).to.be.a.function

    it 'should invoke normalizeProperty on each key / value pair in the schema config', ->
      normalizeProperty = sinon.spy Skema, 'normalizeProperty'

      schema =
        name     : 'string'
        age      :
          type     : Number
          required : true
        birthday : Date

      Skema.create schema

      for k, v of schema
        expect(normalizeProperty).to.have.been.calledWith v, k

      normalizeProperty.restore()

  describe 'Schema', ->
    describe 'defineProperty', ->
      it 'should invoke Skema.normalizeProperty', ->
        sinon.spy Skema, 'normalizeProperty'

        Schema = Skema.create()
        config = { type : 'string', getter : -> true }
        Schema.defineProperty 'name', config

        expect(Skema.normalizeProperty).to.have.been.called
        expect(Skema.normalizeProperty).to.have.been.calledWith config, 'name'

        Skema.normalizeProperty.restore()

      it 'should extend the Schema with the new property', ->
        Schema = Skema.create()
        Schema.defineProperty 'age',
          type : 'integer'
          setter : (val) -> return val+1
          getter : (val) -> return val * 2

        a = new Schema()
        a.age = 7
        expect(a.age).to.equal 16

    describe 'defineProperties', ->
      it 'should invoke defineProperty for each key value pair', ->
        Schema = Skema.create()
        sinon.stub Schema, 'defineProperty'

        config = { type : 'string', getter : -> true }
        Schema.defineProperties {a : 'integer', b : config}

        expect(Schema.defineProperty).to.have.been.calledTwice
        expect(Schema.defineProperty).to.have.been.calledWith 'a', 'integer'
        expect(Schema.defineProperty).to.have.been.calledWith 'b', config

        Schema.defineProperty.restore()

    describe 'property', ->
      describe 'assignment', ->
        describe 'of primitive types', ->
          setter = null

          beforeEach ->
            setter = sinon.stub().returns 5
            sinon.stub Skema.TYPES.Integer, 'identifier'
            sinon.stub Skema.TYPES.Integer, 'parser'
            Skema.TYPES.Integer.parser.returns 5

          afterEach ->
            Skema.TYPES.Integer.identifier.restore()
            Skema.TYPES.Integer.parser.restore()

          it 'should invoke setter if provided', ->
            Schema = Skema.create
              age :
                type : 'integer'
                setter : setter

            a = new Schema()
            a.age = 5

            expect(setter).to.have.been.called
            expect(setter).to.have.been.calledWith 5

          it 'should not invoke type parser if identifier returns true', ->
            Skema.TYPES.Integer.identifier.returns true

            Schema = Skema.create
              age :
                type : 'integer'

            a = new Schema()
            a.age = 5

            expect(Skema.TYPES.Integer.parser).to.not.have.been.called

          it 'should invoke type parser if identifier returns false', ->
            Skema.TYPES.Integer.identifier.returns false

            Schema = Skema.create
              age :
                type : 'integer'

            a = new Schema()
            a.age = 5.5

            expect(Skema.TYPES.Integer.parser).to.have.been.called
            expect(Skema.TYPES.Integer.parser).to.have.been.calledWith 5.5

          it 'should pass results from parser into setter', ->
            Skema.TYPES.Integer.identifier.returns false
            Skema.TYPES.Integer.parser.returns 5

            Schema = Skema.create
              age :
                type : 'integer'
                setter : setter

            a = new Schema()
            a.age = 5.5

            expect(Skema.TYPES.Integer.parser).to.have.been.called
            expect(Skema.TYPES.Integer.parser).to.have.been.calledWith 5.5
            expect(Skema.TYPES.Integer.parser).to.have.returned 5

            expect(setter).to.have.been.called
            expect(setter).to.have.been.calledWith 5

          it 'should treat assignment at time of construction the same as assignment', ->
            Skema.TYPES.Integer.identifier.returns false

            Schema = Skema.create
              age :
                type : 'integer'
                setter : setter

            a = new Schema({age : 5.5})

            expect(Skema.TYPES.Integer.parser).to.have.been.called
            expect(Skema.TYPES.Integer.parser).to.have.been.calledWith 5.5
            expect(Skema.TYPES.Integer.parser).to.have.returned 5

            expect(setter).to.have.been.called
            expect(setter).to.have.been.calledWith 5

        describe 'of nested Schemas', ->
          Person = null

          beforeEach ->
            Person = Skema.create()
            Person = sinon.spy Person

            Person.defineProperties
              name : String
              age : Number
              mother : {type: Person, default : null}

          it 'invokes constructor on assignment of a plain object', ->
            Lisa = new Person
              name : 'Sarah'
              age : 8

            expect(Person).to.have.been.calledOnce
            Person.reset()

            Lisa.mother = {name : 'Marge', age : 34}

            expect(Person).to.have.been.calledOnce
            expect(Person).to.have.been.calledWith {name : 'Marge', age : 34}
            Person.reset()

            Lisa.mother.mother =
              name : 'Jacqueline'
              age : 80
              mother :
                name : 'Alvarine'
                age  : 102

            expect(Person).to.have.been.calledTwice
            expect(Person).to.have.been.calledWith {name : 'Jacqueline', age : 80, mother: {name : 'Alvarine', age : 102}}
            expect(Person).to.have.been.calledWith {name : 'Alvarine', age : 102}

          it 'does not invoke constructor if assigned object is already instance of correct Schema', ->
            Lisa = new Person
              name : 'Sarah'
              age : 8

            expect(Person).to.have.been.calledOnce

            Marge = new Person
              name : 'Marge'
              age : 34

            Person.reset()

            Lisa.mother = Marge
            expect(Person).not.to.have.been.called

          it 'does invoke constructor if assigned object is instance of a different Schema', ->
            Car = Skema.create
              make : String
              model : String

            Lisa = new Person
                name : 'Sarah'
                age : 8

            civic = new Car
              make : 'honda'
              model : 'civic'

            Person.reset()

            Lisa.mother = civic

            expect(Person).to.have.been.called
            expect(Person).to.have.been.calledWith civic

      describe 'retrieval', ->
        describe 'of primitive types', ->
          it 'should return the assigned value', ->
            Schema = Skema.create
              age :
                type : 'integer'

            a = new Schema {age : 5}

            expect(a.age).to.equal 5

          it 'should return the assigned value, accounting for parser', ->
            Schema = Skema.create
              age :
                type : 'integer'

            a = new Schema {age : 5.5}

            expect(a.age).to.equal 5

          it 'should return the assigned value, accounting for setter', ->
            Schema = Skema.create
              age :
                type : 'integer'
                setter : (val) -> val * 2

            a = new Schema {age : 5}

            expect(a.age).to.equal 10

          it 'should return the assigned value, accounting for parser, then setter', ->
            Schema = Skema.create
              age :
                type : 'integer'
                setter : (val) -> val * 2

            a = new Schema {age : 5.5}

            expect(a.age).to.equal 10

          it 'should return the assigned value, accounting for the getter', ->
            Schema = Skema.create
              age :
                type : 'integer'
                setter : (val) -> val * 2
                getter : (val) -> val - 2

            a = new Schema {age : 5.5}

            expect(a.age).to.equal 8

        describe 'of Arrays', ->
          it 'should parse child elements of arrays', ->
            Schema = Skema.create
              ages : [Skema.TYPES.Integer]

            a = new Schema()

            a.ages = [1, 3.0, '2.5', null]

            expect(a.ages).to.eql [1, 3, 2, NaN]

          it 'should not be thrown off by mutations', ->
            Schema = Skema.create
              ages : [Skema.TYPES.Integer]

            a = new Schema()

            a.ages = ['2.5']
            a.ages.push null
            a.ages.unshift 1
            a.ages.splice 1, 0, 3.0
            expect(a.ages).to.eql [1, 3, 2, NaN]

    describe 'circular definitions', ->

      it 'should allow two Schemas to reference one another', ->
        Person = Skema.create 'Person',
          name : String
          cars : ['Schema:Car']

        Car = Skema.create 'Car',
          model : String
          owner : 'Schema:Person'

        bob = new Person
          name : 'Bob'

        bob.cars = [
          {model : 'Civic', owner : bob}
          {model : '4runner', owner : bob}
        ]

        expect(bob).to.be.instanceOf Person
        expect(bob.cars[0]).to.be.instanceOf Car

    describe 'validation', ->

      describe 'required', ->
        it 'should do stuff', ->
          Person = Skema.create
            name : {type : String, required : true}
            age : {type : Number, required : true}

          Lisa = new Person name:'Lisa'

          Lisa.validate()


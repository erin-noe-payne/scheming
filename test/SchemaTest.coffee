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
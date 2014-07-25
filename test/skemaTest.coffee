Skema = require '../lib/skema'
{expect} = require 'chai'

describe 'Skema', ->
  describe 'create', ->
    it 'is a function', ->
      expect(Skema.create).to.be.a 'function'

    it 'returns a constructor', ->
      ctr = Skema.create()
      expect(ctr).to.be.a 'function'

    describe 'types', ->
      Person = null

      describe 'String', ->

        it 'should respect TYPE reference', ->
          Person = Skema.create
            name : Skema.TYPES.String

        it 'should respect String constructor', ->
          Person = Skema.create
            name : String

        it 'should respect `string`', ->
          Person = Skema.create
            name : 'string'

        afterEach ->
          instance = new Person name : 'Bob'

          expect(instance.name).to.be.a 'string'
          expect(instance.name).to.equal 'Bob'

      describe 'Number', ->

        it 'should respect TYPE reference', ->
          Person = Skema.create
            age : Skema.TYPES.Number

        it 'should respect Number constructor', ->
          Person = Skema.create
            age : Number

        it 'should respect `number`', ->
          Person = Skema.create
            age : 'number'

        afterEach ->
          instance = new Person age : 7

          expect(instance.age).to.be.a 'number'
          expect(instance.age).to.equal 7

      describe 'Date', ->

        it 'should respect TYPE reference', ->
          Person = Skema.create
            dob : Skema.TYPES.Date

        it 'should respect Date constructor', ->
          Person = Skema.create
            dob : Date

        it 'should respect `date`', ->
          Person = Skema.create
            dob : 'date'

        afterEach ->
          instance = new Person dob : '9/14/86'

          expect(instance.dob).to.be.a 'date'
          expect(instance.dob).to.eql new Date('9/14/86')

      describe 'Boolean', ->
        it 'should respect TYPE reference', ->
          Person = Skema.create
            awesome : Skema.TYPES.Boolean

        it 'should respect Boolean constructor', ->
          Person = Skema.create
            awesome : Boolean

        it 'should respect `boolean`', ->
          Person = Skema.create
            awesome : 'boolean'

        afterEach ->
          instance = new Person awesome : true

          expect(instance.awesome).to.be.a 'boolean'
          expect(instance.awesome).to.eql true

      describe 'Mixed', ->
        it 'should respect TYPE reference', ->
          Person = Skema.create
            thing1 : Skema.TYPES.Mixed
            thing2 : Skema.TYPES.Mixed

        it 'should respect `*`', ->
          Person = Skema.create
            thing1 : '*'
            thing2 : '*'

        afterEach ->
          instance = new Person
            thing1 : 'asdf!'
            thing2 : 19

          expect(instance.thing1).to.be.a 'string'
          expect(instance.thing1).to.equal 'asdf!'
          expect(instance.thing2).to.be.a 'number'
          expect(instance.thing2).to.equal 19

      describe 'Array', ->
      describe 'Object', ->
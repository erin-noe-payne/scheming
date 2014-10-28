Scheming = require './Scheming'
sinon = require 'sinon'
chai = require 'chai'
sinonChai = require 'sinon-chai'
_ = require 'lodash'

chai.use sinonChai

{expect} = chai

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
                {identifier} = Scheming.TYPES[type]

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
                {parser} = Scheming.TYPES[type]

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
              {parser} = Scheming.NESTED_TYPES.Array

              expect(parser(input)).to.eql output

describe 'resolveType', ->
  afterEach ->
    Scheming.reset()

  describe 'resolution', ->
    describe 'with primitive types', ->
      for k, type of Scheming.TYPES
        do (k, type) ->
          it "should resolve #{type.string} TYPES reference", ->
            expect(Scheming.resolveType type).to.equal type

          if type.ctor
            it "should resolve #{type.string} ctor", ->
              expect(Scheming.resolveType type.ctor).to.equal type

          it "should resolve #{type.string} string", ->
            expect(Scheming.resolveType type.string).to.equal type

      it 'should return null for an undefined TYPE reference', ->
        expect(Scheming.resolveType Scheming.TYPES.Custom).to.be.null

      it 'should return null for unrecognized type string', ->
        expect(Scheming.resolveType 'notReal').to.be.null

      it 'should return null for unrecognized type constructor', ->
        ctor = ->

        expect(Scheming.resolveType ctor).to.be.null

      it 'should return null for undefined value', ->
        expect(Scheming.resolveType undefined).to.be.null

    describe 'with arrays', ->
      for k, type of Scheming.TYPES
        do (k, type) ->
          it "should resolve #{type.string} TYPES reference", ->
            array = [type]
            resolved = Scheming.resolveType array
            expect(resolved.string).to.equal 'array'
            expect(resolved.childType).to.equal type

          if type.ctor
            it "should resolve #{type.string} ctor", ->
              array = [type.ctor]
              resolved = Scheming.resolveType array
              expect(resolved.string).to.equal 'array'
              expect(resolved.childType).to.equal type

          it "should resolve #{type.string} string", ->
            array = [type.string]
            resolved = Scheming.resolveType array
            expect(resolved.string).to.equal 'array'
            expect(resolved.childType).to.equal type

    describe 'with Schemas', ->
      it 'should pass an object type to Scheming.create', ->
        createSpy = sinon.stub Scheming, 'create'
        mockctor = ->

        createSpy.returns mockctor

        obj = {}

        resolved = Scheming.resolveType(obj)
        expect(createSpy).to.have.been.called
        expect(createSpy).to.have.been.calledWith obj

        expect(resolved.childType).to.equal mockctor

        createSpy.restore()

      it 'should use a Schema instance as its childType', ->
        ctr = Scheming.create()

        resolved = Scheming.resolveType ctr

        expect(resolved.childType).to.equal ctr

      it 'should treat Schema: string as a lazy-load schema', ->
        resolved = Scheming.resolveType 'Schema:Car'

        expect(resolved.childType).not.to.exist

      it 'should resolve a lazy-load schema the first time identifier is invoked', ->
        sinon.stub Scheming, 'get'
        Car = Scheming.create()
        Scheming.get.returns Car

        resolved = Scheming.resolveType 'Schema:Car'

        resolved.identifier({})

        expect(Scheming.get).to.have.been.called
        expect(Scheming.get).to.have.been.calledWith 'Car'

        expect(resolved.childType).to.equal Car

        Scheming.get.restore()

      it 'should resolve a lazy-load schema the first time parser is invoked', ->
        sinon.stub Scheming, 'get'
        Car = Scheming.create()
        Scheming.get.returns Car

        resolved = Scheming.resolveType 'Schema:Car'

        resolved.parser({})

        expect(Scheming.get).to.have.been.called
        expect(Scheming.get).to.have.been.calledWith 'Car'

        expect(resolved.childType).to.equal Car

        Scheming.get.restore()

      it 'should throw an error if the specified Schema does not exist at time of lazy resolution', ->
        sinon.stub Scheming, 'get'
        Scheming.get.returns null

        resolved = Scheming.resolveType 'Schema:Car'

        expect(resolved.parser).to.throw 'Error resolving Schema:Car'

        Scheming.get.restore()

      it 'should correctly return true from identifier function on first invocation', ->
        resolved = Scheming.resolveType 'Schema:Car'

        Car = Scheming.create 'Car'
        car = new Car()

        expect(resolved.identifier(car)).to.be.true

      it 'should correctly return false from identifier function on first invocation', ->
        resolved = Scheming.resolveType 'Schema:Car'

        Car = Scheming.create 'Car'

        expect(resolved.identifier({})).to.be.false

      it 'should correctly apply parser on first invocation', ->
        resolved = Scheming.resolveType 'Schema:Car'

        Car = Scheming.create 'Car'

        expect(resolved.parser({})).to.be.instanceOf Car

    describe 'extensibility', ->

      describe 'custom types', ->
        customClass = null

        beforeEach ->
          customClass = class Custom

          Scheming.TYPES.Custom =
            ctor : customClass
            string : 'custom'
            identifier : ->
            parser : ->

          sinon.stub Scheming.TYPES.Custom, 'identifier'
          sinon.stub Scheming.TYPES.Custom, 'parser'


        afterEach ->
          delete Scheming.TYPES.Custom

        it 'should allow a custom type by reference', ->
          expect(Scheming.resolveType Scheming.TYPES.Custom).to.equal Scheming.TYPES.Custom

        it 'should allow a custom type by constructor', ->
          expect(Scheming.resolveType customClass).to.equal Scheming.TYPES.Custom

        it 'should allow a custom type by string', ->
          expect(Scheming.resolveType 'custom').to.equal Scheming.TYPES.Custom

      describe 'overriding', ->

        it 'should support overriding of TYPE identifiers', ->
          {identifier} = Scheming.TYPES.String
          newIdentifier = -> true
          Scheming.TYPES.String.identifier = newIdentifier

          resolvedType = Scheming.resolveType 'string'

          expect(resolvedType.identifier).to.equal newIdentifier

          Scheming.TYPES.String.identifier = identifier

        it 'should support overriding of TYPE parsers', ->
          {parser} = Scheming.TYPES.String
          newParser = -> true
          Scheming.TYPES.String.parser = newParser

          resolvedType = Scheming.resolveType 'string'

          expect(resolvedType.parser).to.equal newParser

          Scheming.TYPES.String.parser = parser

describe 'normalizeProperty', ->
  resolveType = null
  mockType = {}

  beforeEach ->
    resolveType = sinon.stub Scheming, 'resolveType'
    resolveType.returns mockType

  afterEach ->
    resolveType.restore()

  it 'should, if it receives an object with a type key, pass the type key to resolveType', ->
    Scheming.normalizeProperty {type : 'integer'}, 'age'

    expect(resolveType).to.have.been.called
    expect(resolveType).to.have.been.calledWith 'integer'

  it 'should, if it receives an object without a type key, pass the entire object to resolveType', ->
    object = {name : 'String', age : 'Number'}
    Scheming.normalizeProperty object, 'owner'

    expect(resolveType).to.have.been.called
    expect(resolveType).to.have.been.calledWith object

  it 'should pass TYPE references to resolveType', ->
    Scheming.normalizeProperty Scheming.TYPES.String, 'name'

    expect(resolveType).to.have.been.called
    expect(resolveType).to.have.been.calledWith Scheming.TYPES.String

  it 'should pass type strings to resolveType', ->
    Scheming.normalizeProperty 'number', 'name'

    expect(resolveType).to.have.been.called
    expect(resolveType).to.have.been.calledWith 'number'

  it 'should pass type constructors to resolveType', ->
    Scheming.normalizeProperty Date, 'name'

    expect(resolveType).to.have.been.called
    expect(resolveType).to.have.been.calledWith Date

  it 'should throw an error if the type cannot be resolved', ->
    invokeWithNoType = ->
      Scheming.normalizeProperty(undefined, 'name')

    expect(invokeWithNoType).to.throw 'Schema type must be defined'

  it 'should throw an error getter is defined and not a function', ->
    invokeWithStringGetter = ->
      Scheming.normalizeProperty({type : 'string', getter : 'asdf'}, 'name')

    expect(invokeWithStringGetter).to.throw 'Schema getter must be a function'

  it 'should throw an error setter is defined and not a function', ->
    invokeWithStringSetter = ->
      Scheming.normalizeProperty({type : 'string', setter : 'asdf'}, 'name')

    expect(invokeWithStringSetter).to.throw 'Schema setter must be a function'

  it 'should throw an error if a single validator is not a function', ->
    invokeWithStringValidate = ->
      Scheming.normalizeProperty({type : 'string', validate : 'asdf'}, 'name')

    expect(invokeWithStringValidate).to.throw 'Schema validate must be a function'

  it 'should throw an error if any validator is not a function', ->
    invokeWithStringValidate = ->
      Scheming.normalizeProperty({type : 'string', validate : [(->), 'asdf', (->)]}, 'name')

    expect(invokeWithStringValidate).to.throw 'Schema validate must be a function'
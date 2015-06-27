_ = require 'lodash'
{expect} = chai

Registry = ModelFactory = Types = null

describe 'Types', ->
  beforeEach ->
    Registry = sinon.stub require '../src/Registry'
    ModelFactory = sinon.stub require '../src/ModelFactory'
    Types = proxyquire '../src/Types', {Registry, ModelFactory}

  afterEach ->
    sinon.restore(Registry)
    sinon.restore(ModelFactory)

  describe 'TYPES', ->
    describe 'identifiers', ->
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
                {identifier} = Types.TYPES[type]

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
                {parser} = Types.TYPES[type]

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
              {parser} = Types.NESTED_TYPES.Array

              expect(parser(input)).to.eql output

  describe 'resolveType', ->
    describe 'with primitive types', ->
      for k in ['String', 'Number', 'Integer', 'Date', 'Boolean', 'Mixed']
        do (k) ->
          it "should resolve #{k} TYPES reference", ->
            type = Types.TYPES[k]
            expect(Types.resolveType type).to.equal type


          it "should resolve #{k} ctor", ->
            type = Types.TYPES[k]
            if type.ctor
              expect(Types.resolveType type.ctor).to.equal type

          it "should resolve #{k} string", ->
            type = Types.TYPES[k]
            expect(Types.resolveType type.string).to.equal type

      it 'should return null for an undefined TYPE reference', ->
        expect(Types.resolveType Types.TYPES.Custom).to.be.null

      it 'should return null for unrecognized type string', ->
        expect(Types.resolveType 'notReal').to.be.null

      it 'should return null for unrecognized type constructor', ->
        ctor = ->

        expect(Types.resolveType ctor).to.be.null

      it 'should return null for undefined value', ->
        expect(Types.resolveType undefined).to.be.null

    describe 'with arrays', ->
      for k in ['String', 'Number', 'Integer', 'Date', 'Boolean', 'Mixed']
        do (k) ->
          it "should resolve #{k} TYPES reference", ->
            type = Types.TYPES[k]
            array = [type]
            resolved = Types.resolveType array
            expect(resolved.string).to.equal 'array'
            expect(resolved.childType).to.equal type


          it "should resolve #{k} ctor", ->
            type = Types.TYPES[k]
            if type.ctor
              array = [type.ctor]
              resolved = Types.resolveType array
              expect(resolved.string).to.equal 'array'
              expect(resolved.childType).to.equal type

          it "should resolve #{k} string", ->
            type = Types.TYPES[k]
            array = [type.string]
            resolved = Types.resolveType array
            expect(resolved.string).to.equal 'array'
            expect(resolved.childType).to.equal type

      it 'should throw an error if the array does not have a type', ->
        doResolve = -> Types.resolveType []

        expect(doResolve).to.throw 'Error resolving type'


    describe 'with Schemas', ->
      mockModel = null

      beforeEach ->
        mockModel = ->
        mockModel.__schemaId = 1

      it 'should pass an object type to ModelFactory.create', ->
        ModelFactory.create.returns mockModel

        obj = {}

        resolved = Types.resolveType(obj)
        expect(ModelFactory.create).to.have.been.called
        expect(ModelFactory.create).to.have.been.calledWith obj

        expect(resolved.childType).to.equal mockModel

      it 'should use a Schema instance as its childType', ->
        resolved = Types.resolveType mockModel

        expect(resolved.childType).to.equal mockModel

      it 'should treat Schema: string as a lazy-load schema', ->
        resolved = Types.resolveType 'Schema:Car'

        expect(resolved.childType).not.to.exist

      it 'should resolve a lazy-load schema the first time identifier is invoked', ->
        Registry.get.returns mockModel

        resolved = Types.resolveType 'Schema:Car'

        resolved.identifier({})

        expect(Registry.get).to.have.been.called
        expect(Registry.get).to.have.been.calledWith 'Car'

        expect(resolved.childType).to.equal mockModel

      it 'should resolve a lazy-load schema the first time parser is invoked', ->
        Registry.get.returns mockModel

        resolved = Types.resolveType 'Schema:Car'

        resolved.parser({})

        expect(Registry.get).to.have.been.called
        expect(Registry.get).to.have.been.calledWith 'Car'

        expect(resolved.childType).to.equal mockModel

      it 'should throw an error if the specified Schema does not exist at time of lazy resolution', ->
        Registry.get.returns null

        resolved = Types.resolveType 'Schema:Car'

        expect(resolved.parser).to.throw 'Error resolving Schema:Car'

      it 'should correctly return true from identifier function on first invocation', ->
        Registry.get.returns mockModel

        resolved = Types.resolveType 'Schema:Car'

        instance = new mockModel()

        expect(resolved.identifier(instance)).to.be.true

      it 'should correctly return false from identifier function on first invocation', ->
        Registry.get.returns mockModel

        resolved = Types.resolveType 'Schema:Car'

        expect(resolved.identifier({})).to.be.false

      it 'should correctly apply parser on first invocation', ->
        Registry.get.returns mockModel

        resolved = Types.resolveType 'Schema:Car'

        expect(resolved.parser({})).to.be.instanceOf mockModel

    describe 'extensibility', ->
      describe 'custom types', ->
        customClass = null

        beforeEach ->
          customClass = class Custom

          Types.TYPES.Custom =
            ctor       : customClass
            string     : 'custom'
            identifier : ->
            parser     : ->

          sinon.stub Types.TYPES.Custom, 'identifier'
          sinon.stub Types.TYPES.Custom, 'parser'


        afterEach ->
          delete Types.TYPES.Custom

        it 'should allow a custom type by reference', ->
          expect(Types.resolveType Types.TYPES.Custom).to.equal Types.TYPES.Custom

        it 'should allow a custom type by constructor', ->
          expect(Types.resolveType customClass).to.equal Types.TYPES.Custom

        it 'should allow a custom type by string', ->
          expect(Types.resolveType 'custom').to.equal Types.TYPES.Custom

      describe 'overriding', ->
        it 'should support overriding of TYPE identifiers', ->
          {identifier} = Types.TYPES.String
          newIdentifier = -> true
          Types.TYPES.String.identifier = newIdentifier

          resolvedType = Types.resolveType 'string'

          expect(resolvedType.identifier).to.equal newIdentifier

          Types.TYPES.String.identifier = identifier

        it 'should support overriding of TYPE parsers', ->
          {parser} = Types.TYPES.String
          newParser = -> true
          Types.TYPES.String.parser = newParser

          resolvedType = Types.resolveType 'string'

          expect(resolvedType.parser).to.equal newParser

          Types.TYPES.String.parser = parser


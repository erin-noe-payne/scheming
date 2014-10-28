Scheming = require './Scheming'
sinon = require 'sinon'
chai = require 'chai'
sinonChai = require 'sinon-chai'
_ = require 'lodash'

chai.use sinonChai

{expect} = chai

describe 'Validation', ->
  afterEach ->
    Scheming.reset()

  it 'should return null if there are no fields', ->
    Person = Scheming.create()

    lisa = new Person()

    expect(lisa.validate()).to.be.null

  it 'should return null if there are no validation rules', ->
    Person = Scheming.create
      name : String
      age : Number

    lisa = new Person()

    expect(lisa.validate()).to.be.null

  it 'should return null if a field is required and defined', ->
    Person = Scheming.create
      name : {type: String, required : true}
      age : Number

    lisa = new Person name : 'lisa'

    expect(lisa.validate()).to.be.null

  it 'should return null if a field has one validation rules that it passes', ->
    Person = Scheming.create
      name : {type: String, validate :  -> true}
      age : Number

    lisa = new Person name : 'lisa'

    expect(lisa.validate()).to.be.null

  it 'should return null if a field has many validation rules that it passes', ->
    rules = [
      -> true
      (v) -> v[0] == 'n'
      (v) -> v[v.length-1] == 'e'
    ]

    Person = Scheming.create
      name : {type: String, validate :  -> true}
      age : Number

    lisa = new Person name : 'lisa'

    expect(lisa.validate()).to.be.null

  it 'should return null if a field that is not required is undefined but would otherwise fail validation', ->
    Person = Scheming.create
      name : {type: String, validate :  -> 'ERROR'}
      age : Number

    lisa = new Person()

    expect(lisa.validate()).to.be.null

  it 'should return null if a nested schema passes validation', ->
    Person = Scheming.create
      name : {type: String, required: true, validate :  -> true}
      car :
        make : {type : String, required : true}
        model : {type : String, validate : (v) -> v[0] =='c'}

    lisa = new Person
      name : 'lisa'
      car :
        make : 'honda'
        model : 'civic'

    expect(lisa.validate()).to.be.null

  it 'should return null if an array of nested schema passes validation', ->
    Person = Scheming.create
      name : {type: String, required: true, validate :  -> true}
      cars : [
        make : {type : String, required : true}
        model : {type : String, validate : (v) -> v[0] =='c'}
      ]

    lisa = new Person
      name : 'lisa'
      cars : [
        {make : 'honda', model : 'civic'}
        {make : 'toyota', model : 'corolla'}
      ]

    expect(lisa.validate()).to.be.null

  it 'should return an object if there are validation errors', ->
    Person = Scheming.create
      name : {type : String, required : true}

    lisa = new Person()

    expect(lisa.validate()).to.be.an 'object'

  it 'should return an array of error messages on each key for which there is a validation error', ->
    Person = Scheming.create
      name : {type : String, required : true}

    lisa = new Person()

    errors = lisa.validate()
    expect(errors.name).to.exist
    expect(errors.name).to.be.an 'array'

  it 'should not give an error key for fields that passed validation, even when some validation errors occurred', ->
    Person = Scheming.create
      name : {type : String, required : true}
      age : {type : Number, required : true}

    lisa = new Person
      name : 'lisa'

    errors = lisa.validate()
    expect(errors.name).to.not.exist
    expect(errors.age).to.exist
    expect(errors.age).to.be.an 'array'

  it 'should not run a field through other validation rules if it failed the `required` validation', ->
    validator = sinon.spy -> return true

    Person = Scheming.create
      name : {type : String, required : true, validate : validator}

    lisa = new Person()

    lisa.validate()

    expect(validator).to.not.have.been.called

  it 'should return all error messages produced from validators that failed, in the order provided', ->
    Person = Scheming.create
      name : {type : String, required : true, validate : [
        -> 'One'
        -> 'Two'
        -> 'Three'
      ]
      }

    lisa = new Person name : 'lisa'

    errors = lisa.validate()

    expect(errors.name).to.eql ['One', 'Two', 'Three']

  it 'should catch errors thrown by a validator and treat them as returned error messages', ->
    Person = Scheming.create
      name : {type : String, required : true, validate : [
        -> 'One'
        -> throw new Error('Two')
        -> 'Three'
      ]
      }

    lisa = new Person name : 'lisa'

    errors = lisa.validate()

    expect(errors.name).to.eql ['One', 'Two', 'Three']

  it 'should return a generic failure message if the validation rule returns a falsey value', ->
    Person = Scheming.create
      name : {type : String, required : true, validate : [
        -> false
        -> null
        -> undefined
      ]
      }

    lisa = new Person name : 'lisa'

    errors = lisa.validate()

    expect(errors.name).to.eql ['Validation error occurred.', 'Validation error occurred.', 'Validation error occurred.']

  it 'should not invoke validation on nested schemas if they are undefined', ->
    validator = sinon.spy -> 'Validation error'

    Person = Scheming.create
      name : {type: String, required: true, validate :  -> true}
      car :
        make : {type : String, required : true}
        model : {type : String, validate : validator}

    lisa = new Person name : 'lisa'

    errors = lisa.validate()

    expect(errors).to.be.null

    expect(validator).to.not.have.been.called

  it 'should invoke validation on nested schemas if they are defined', ->
    validator = sinon.spy -> 'Validation error'

    Person = Scheming.create
      name : {type: String, required: true, validate :  -> true}
      car :
        make : {type : String, required : true}
        model : {type : String, validate : validator}

    lisa = new Person
      name : 'lisa'
      car :
        make : 'honda'
        model : 'civic'

    errors = lisa.validate()

    expect(validator).to.have.been.called
    expect(validator).to.have.been.calledWith 'civic'

  it 'should use nested path keys on error messaging', ->
    Person = Scheming.create
      name : {type: String, required: true, validate :  -> true}
      car :
        make : {type : String, required : true}
        model : {type : String, validate : -> 'Error!'}

    lisa = new Person
      name : 'lisa'
      car : model : 'asdf'

    errors = lisa.validate()

    expect(errors['car.make']).to.exist
    expect(errors['car.model']).to.exist

  it 'should not fall into an infinite loop on validation of circular references', ->
    Person = Scheming.create 'Person',
      name : {type: String, required: true, validate :  -> true}
      car :
        make : {type : String, required : true}
        model : {type : String, validate : -> 'Error!'}
        owner : 'Schema:Person'

    lisa = new Person
      name : 'lisa'
    lisa.car =
      model : 'asdf'
      owner : lisa

    errors = lisa.validate()

    expect(errors['car.make']).to.exist
    expect(errors['car.model']).to.exist

    expect(_.size(errors)).to.equal 2


  it 'should invoke validation on arrays of nested schemas', ->
    validator = sinon.spy -> true

    Person = Scheming.create
      name : {type: String, required: true, validate :  -> true}
      cars : [
        make : {type : String, required : true}
        model : {type : String, required : true, validate : validator}
      ]

    lisa = new Person name : lisa
    lisa.cars = [
      {make : 'honda', model : 'civic'}
      {make : 'toyota', model : 'corolla'}
    ]

    errors = lisa.validate()

    expect(validator).to.have.been.calledTwice
    expect(validator).to.have.been.calledWith 'civic'
    expect(validator).to.have.been.calledWith 'corolla'

    expect(errors).to.be.null

  it 'should use nested path keys and indexes on array error messaging', ->
    validator = -> 'Error'

    Person = Scheming.create
      name : {type: String, required: true, validate :  -> true}
      cars : [
        make : {type : String, required : true}
        model : {type : String, required : true, validate : validator}
      ]

    lisa = new Person name : 'lisa'
    lisa.cars = [
      {model : 'civic'}
      {model : 'corolla'}
    ]

    errors = lisa.validate()

    expect(_.size(errors)).to.equal 4
    expect(errors['cars[0].make']).to.exist
    expect(errors['cars[0].model']).to.exist
    expect(errors['cars[1].make']).to.exist
    expect(errors['cars[1].model']).to.exist

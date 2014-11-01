{expect} = chai

describe 'Reactive variables', ->
  afterEach ->
    Scheming.reset()

  it 'asdf', ->
    class A
      constructor : ->
        return @

    class B
      constructor : ->

    a = new A()
    console.log a instanceof A
    console.log a instanceof B

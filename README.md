# Scheming!

Define powerful object schemas in javascript. Includes default values, getters, setters, validators, type checking or coercion. Builds reactive objects which you can watch for changes. Written to be extensible and customizable. Works on the browser or the server.

So what does it look like?

```
Scheming = require('Scheming')

User = Scheming.create 'User',
  name :
    type : String
    required : true
  email :
    type : String,
    required : true
    validate : (val) ->
      if val.match('@')
        return true
      else
        return 'An email address must have an @ symbol!'
  birthday : Date
  password :
    type : String
    setter : (val) ->
      return md5(val)

Group = Scheming.create 'Group',
  name : String
  dateCreated : {type : Date, default : -> Date.now()}
  users : [User]

jane = new User
  email : 'jane.gmail.com'
  birthday : '9/14/86'
  password : 'p@$$w0rd!'

console.log Person.validate jane
# {name : 'Field is required.', email: 'An email address must have an @ symbol!'}

jane.name = 'jane'
jane.email = 'jane@gmail.com'

console.log Person.validate jane
# null

```

# API Docs

## Scheming

### Scheming.TYPES

Defines the primitive types that can be assigned to a field in a schema definition. Each type defines a string name, an identifier, and a parser. A type may also optionally provide a constructor reference. For detailed reference, see [the TYPE definitions in source](http://autoric.github.io/scheming/Scheming.html#types). Note the Mixed type, which is effectively untyped, and will allow for any value to be assigned.

Below are the default types and the ways that you can reference them when defining a schema:
- String `Scheming.TYPES.String` `'string'` `String`
- Number `Scheming.TYPES.Number` `'number'` `Number`
- Integer `Scheming.TYPES.Integer` `'integer'`
- Date `Scheming.TYPES.Date` `'date'` `Date`
- Boolean `Scheming.TYPES.Boolean` `'boolean'` `Boolean`
- Mixed `Scheming.TYPES.Mixed` `'*'`

For example, the following are equivalent:
```
Scheming.create {name : Scheming.TYPES.String}
Scheming.create {name : 'string'}
Scheming.create {name : String}
```

#### Custom types

You can extend the Scheming TYPES object to add support for custom types. For example:
```
Scheming.TYPES.Symbol =
  constructor : Symbol
  string : 'symbol'
  identifier : (val) ->
    typeof val == "symbol"
  parser : (val) ->
    Symbol(val)

# I can now declare Schemas with my new type
Scheming.create {name : Symbol}
```

#### Custom parsing and identifiers

In addition to declaring new types, you can modify the currently existing types. For example, say you don't like dealing with javascript Date objects, and would rather use with moment.js.
```
Scheming.TYPES.Date.identifier = moment.isMoment
Scheming.TYPES.Date.parser = moment

Person = Scheming.create birthday : Date

bill = new Person {birthday : '9/14/86'}

bill.birthday.format "YYYY MM DD"
# "1986 09 14"
# Bill's birthday is a momentjs object, and has the format method!
```

### Scheming.NESTED_TYPES

In addition to the 'primitive' types defined in Scheming.TYPES, Schemas also support arrays values and nested schemas. Anywhere you can provide a type declaration, you can use the following nested types. This section assumes some knowledge of property configuration syntax. Take a look at the [Schema.defineProperty](#schemadefineproperty) docs.

#### Arrays

For any schema you can declare a property whose type is an array of values.

Simple arrays:
```
BlogPost = Scheming.create
  comments : [String] # an array of strings
  miscellaneous : ['*'] # an untyped array
  
post = new BlogPost()
post.comments = ['Hello', 'World']
post.miscellaneous = ['Stuff', 2, null, {}]x
```

Arrays with validation, defaults, etc. Here is a blog post which requires 2 or more comments to be valid. Note that the configuration is being applied to the array itself, not to the members of the array.
```
BlogPost = Scheming.create
  comments : 
    type : [String]
    default : []
    required : true
    validate : (comments) ->
      return comments.length >= 2
```

#### Explicit Schemas

Any Schema can have a property whose type is another nested schema. This can be used to create any depth of nesting, or to create circular type definitions. In all cases, a Schema constructor is a valid type definition. When a value is a assigned to a property whose type is Schema, if it is not already an instance of that Schema, it value will be run through the Schema constructor as part of parsing.

Simple nested schemas:
```
Car = Schema.create
  make : String
  model : String
  
Person = Schema.create
  name : String
  car : Car
  
mark = new Person {name : 'mark'}

# Explicit construction and assignment
# At the time of assignment, civic is already an instance of Car
# so the Car constructor will not be invoked a second time
civic = new Car {make : 'honda', model : 'civic'}
mark.car = civic 

# Implicit construction
# At the time of assignment, the value is a plain object. Therefore 
# the object is passed to the Car  constructor (or in strict mode, 
# an error is thrown)
mark.car = {make : 'toyota', model : 'corolla'}
mark.car instanceof Car # true
```

This is fine for one-way type references. However, it is easy to conceive of data models with circular type references. What do we do in this case? The simple solution is to create both schemas first, then define their properties afterwards, so that the Schema references are valid.

Simple circular type references:
```
Person = Schema.create()
Car = Schema.create()
  
Person.defineProperties
  name : String
  car : Car
  
Car.defineProperties
  make : String
  model : String
  owner : Person
```

This model still presents a problem. What if my schemas are declared in different files? What if I don't want to juggle references, or be careful about the order in which schemas are declared? This is where lazy initialization comes in. When you create a Schema, you have the option to name it. See the docs on [Scheming.create](#schemingcreate) and [Scheming.get](#schemingget) to understand how to name and retrieve named schemas.

If you have registered a named schema, you can create a type reference to that schema using the syntax `'Schema:Name'`. Scheming will accept this as a valid type reference without evaluating immediately or throwing errors. The Schema reference will not be retrieved until the first time the identifier or parser is invoked. So as long as you have declared all of your schemas before you start creating instances, you don't have to worry about  it. Note that lazy initialization will throw an error if the Schema reference does not exist at the time of initialization.

Lazy initialization:
```
# I am registering the Schema with the name 'Person'
Person = Schema.create 'Person', 
  name : String
  car : 'Schema:Car'
  
# This would throw an error, because 'Schema:Car' does not resolve to a registered Schema
bill = new Person
  name : 'Bill'
  car : {make : 'honda', model : 'civic'}
    
# Now I am creating and registering the 'Car' Schema
Car = Schema.create 'Car', 
  make : String
  model : String
  # This reference is using the registered name of the Schema 'Person'
  owner : 'Schema:Person'
  
# Success!
bill = new Person
  name : 'Bill'
  car : {make : 'honda', model : 'civic'}
```

#### Implicit Schemas

What we have seen so far is the ability to explicitly create Schemas and reference them as types. While this is extremely powerful, sometimes you just want to declare nested objects on your Schema. When you do this, new anonymous Schemas are implicitly created and assigned as the type.
 
 In the example below, we create a blog post that has some flat properties, and creates two implicit schemas. The first is the author property, the second is the comments property. Each of these cause an anonymous schema to be created, and any assignment to that value will run the assigned object through the corresponding Schema constructor

```
Blog = Scheming.create
  title : String
  content : String
  posted : Date
  author : 
    name : String
    age : Number
  comments : [{
    text : String
    posted : Date
  }]
```

Note one subtlety: the syntax for [Complex Configuration](#complex-configuration) and implicit schemas is basically the same. In both cases you are using property names and nested objects. Scheming determines whether to treat a nested object as property configuration or a nested schema based on the presence of the `type` key. This effectively makes `type` a reserved word for implicit Schemas.

```
# Oops! In the example below, author is not a nested schema. 
# It is a property with a primitive type of string.
Blog = Scheming.create
  author : 
    name : String
    age : Number
    type : String
```

### Scheming.DEFAULT_OPTIONS

The default options used when Scheming.create is invoked. If you prefer for all schemas to be created with the seal or strict options set to true, you can modify the default options. See the options on [Scheming.create](#schemingcreate) for details.

### Scheming.get(name)

Retrieves a schema that has been built using [Scheming.create](#schemingcreate).

- returns **[Schema](#schema)**

### Scheming.create([name], schema, [opts])

Creates a new [Schema](#schema) constructor.

- name **string** *optional* If provided, registers the scheme with the given name. This must be defined if you wish to retrieve the schema later using the [Scheming.get] (#schemingget) method. It is also necessary for lazy initialization of nested Schema types.
- schema **object** A configuration which defines your new schema. Each key represents a supported field, each value a property configuration. See [Schema.defineProperty](#schemingdefineproperty) for full specification.
- opts **object** *optional* Allows for some additional configuration of your Schema. All options default to false, but the default values can be modified via [Scheming.defaultOptions](#schemingdefaultoptions).
  - opts.seal **boolean** If true, instances of the schema object are sealed. That is, you will not be able to attach arbitrary values to the objects not explicitly defined in the schema.
  ```
  Person = Scheming.create {name : String}, {seal : true}

  bill = new Person {name : 'bill', age : 19}
  bill.home = 'Colorado'
  bill.name # 'bill'
  bill.age  # undefined
  bill.home # undefined
  ```
  - opts.strict **boolean** If true, when values are assigned to an instance of the schema object, they will not be type coerced. Instead, assignment will throw an error if the assigned value does not match the expected type. This allows for strict typing checking at runtime.
  ```
  Person = Scheming.create {age : Number}, {strict : true}

  bill = new Person()
  bill.age = 9   # success
  bill.age = '9' # Error : Error assigning '9' to age. Value is not of type number.
  ```
- returns **[Schema](#schema)**

## Schema

The constructor function returned by [Scheming.create](#schemingcreate). Constructs objects based on the property definitions outlined in the schema. When you invoke the constructor, you can pass a model with initial values to be applied to the instance.

- returns **[Instance](#instance)**

```
Person = Scheming.create
  name : String
  age : Number
  
lisa = new Person
  name : 'lisa'
  age : 8
```

### Schema.defineProperty(property, configuration)

Defines properties on your Schema. This is where you specify properties and their expected type, define default values, getters, setters, and validators.

- property **string** The property name.
- configuration **object** or **TYPE** The property configuration. This object determines how the property is configured, and can get a bit complicated.

#### Simple type configuration

If you do not need any of the other features, you can simply provide a type. You can reference the primitive types in any of the ways outlined in [Schema.TYPES](#schematypes)

```
Schema.create 'Person'
    name : String
    age : Number
    birthday : Date
```

### Complex configuration

For more complex field configuration, pass a configuration object. The configuration object supports the following keys, outlined below:

```
Schema.create
  age :
    type : Number
    default : 2
    getter : (val) -> val * 2
    setter : (val) -> val * 2
    validate : (val) -> val % 2 == 0
    required : true
```

- type **TYPE** A valid type reference as outlined in [Schema.TYPES](#schematypes)
- default **value** or **function** Specifies the default value a field should take if it is not defined in the constructor. If a function, the function is executed and the return value is set as the default.
- getter **function** A getter function that is invoked on the data value before retrieval. Takes the original value as input, the returned value is returned on retrieval. Getter functions are invoked with the `this` context of the instance, and can be used to define virtual fields.
- setter **function** A setter function that is invoked on the data before assignment. Setters are executed AFTER type checking and parsing, so the value your setter receive is guaranteed to be of the correct type. Parsers are not invoked again after the setter is invoked - so if your setter returns a value that breaks the typing, that's on you. Setter functions are not invoked if the value assigned is null or undefined. Setter functions are invoked with the `this` context of the instance.
- validate **function** or **Array of functions** Validator functions, which are invoked when you run validation on a schema instance. Validators take the value as an input, and should return true if validation passes. They should return a string or throw an error indicating the error if validation occurs. If a validator returns any value that is not `true` or a string, validation will fail with a generic error message. See [Schema.validate](#schemavalidate) for details on how validation works. Validation functions are invoked with the `this` context of the instance.
- required **boolean** A special validator that indicates whether the field is required.

### Schema.defineProperties(properties)

A convenience method for defining Schema properties in bulk.

- properties **object** An object whose key value pairs are passed to [Schema.defineProperty](#sschemadefineproperty)

### Schema.validate(instance)

Validates an instance of the schema and all child schema instances. Checks for required fields and runs all validators. Validators are not run on fields which are not defined.

- returns errors **object** An object with any validation errors, where each key is the path that failed validation, and each value is an array of error messages. If validation passes, will return `null`.

#### Validation success

If validation succeeds (including if no validators are defined), `validate()` returns null

```
Person = Scheming.create {name : String}
      
bill = new Person {name : 'bill}

errors = Person.validate bill # null
```

#### Validation failure messages

A validator function should return true if it passes. Any other return value will be treated as validation failure. If a validator returns a string, that string will be treated as the failure message. If a validator throws an error at any point, the `error.message` property will be treated as the failure message. Otherwise, the validation will fail with a generic error message.

If multiple validators are defined, all will be run against the value. The errors object will return error messages for all validators that failed.

```
Person = Scheming.create 
  name : 
    type : String
    validate : [
      -> return "Error number one"
      -> throw new Error "Error number two"
      -> return true
      -> return false
    ]
    
bill = new Person()

errors = Person.validate bill
# returns null, because bill object does not have a name defined, and name is not required

bill.name = 'bill'
errors = Person.validate bill
# {name : ["Error number one", "Error number two", "Validation error occurred."]}
```

#### Required and Validators

The `required` configuration is a special validator that checks if the value is defined. If required validation fails, other validators will not be run. This means that validators are guaranteed to receive a value, and do not need to do null checking.

```
Person = Scheming.create 
  name : 
    type : String
    required : true
    validate : [
      -> return "Error number one"
      -> throw new Error "Error number two"
      -> return true
      -> return false
    ]
    
bill = new Person()

errors = Person.validate bill
# {name : ["Field is required."]}

```

### Schema.extend()
 TODO! The goal is to support extensible Schema functions so you can implement custom persistence methods. Something like that...

## Instance

The object instance returned by newing up a [Schema](#schema) constructor. 

### Instance.watch([properties], listener)

Watches a schmea instance for changes. The registered listenenr function will fire asynchronously each time one or more of the specified properties change.

**IMPORTANT** Watchers and change detection depend on the `set` functionality of `Object.defineProperty`. This means that changes made by mutating a value (such as array splicing) will not be detected, and may result in memory leaks or unexpected behavior. As a best practice, only manipulate schema instance data via assignment with the `=` operator, and do not use mutators.

- properties [optional] **String** || **[String]** Specifies the properties to watch on the instance. Accepts a string representing a single property or an array of strings representing one or more properties. If no properties are specified, the entire object will be watched for a change on any property. Will throw an error if any property being watched is not declared as part of the Schema.
- listener **Function** *function(newVal, oldVal)* The listener function that will be called each time the watched properties change.
  - Listener functions are called asynchronously with a setTimeout of 0. If multiple changes are made to an instance in a synchronous block of code, the listener will not be called for each change. It will be called once, with all changes aggregated.
  - A listener function is always called when the watch is set, even if there were no changes to the watched properties.
  - Listener functions are invoked with the current and previous values of the watched properties. If a watch is set against a single property, newVal and oldVal will be the new and previous values. If the watch is set against multiple properties, newVal and oldVal will be objects whose key / value pairs represent the watcher property names and their respective values.
  - In the case of a watch against the entire object, newVal and oldVal will represent the current and previous state of all properties of the object. However. Note that newVal is NOT a reference to the instance object, it is a plain object whose key / value pairs represent the current state of the instance.
  - Watches are "deep". This means changes to nested schemas are propagated up to the parent elements.


#### Examples

For all examples, we will use the following schema. For more examples, see the tests.
```
Person = Scheming.create 'Person',
  name : String
  age : Number
  mother : 'Schema:Person'
  friends : ['Schema:Person']

lisa = new Person()
```

**Watching a single property**

When a watch is set, it will always be called with the current value, even if no changes were made to the object.
```
lisa.watch 'name', (newVal, oldVal) ->
  # will be called when the event queue clears
  newVal == undefined
  oldVal == undefined
```

Synchronous changes will be reflected when the watcher fires.
```
lisa.name = 'lisa'
lisa.watch 'name', (newVal, oldVal) ->
  newVal == 'lisa'
  oldVal == undefined
```

Multiple synchronous changes are rolled up
```
lisa.watch 'name', (newVal, oldVal) ->
  # this listener is called once
  newVal == 'lisa'
  oldVal == undefined

lisa.name = 'a'
lisa.name = 'b'
lisa.name = 'lisa'
```

**Watching multiple properties**
```
lisa.watch ['name', 'age'], (newVal, oldVal) ->
  # newVal == {name : 'lisa', age : 7}
  # oldVal == {name : undefined, age : undefined}

lisa.name = 'lisa'
lisa.age = 7
```

# Changelog

## v1.0.0

  - Initial release







 

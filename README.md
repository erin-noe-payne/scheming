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

console.log jane.validate()
# {name : 'Field is required.', email: 'An email address must have an @ symbol!'}

jane.name = 'jane'
jane.email = 'jane@gmail.com'

console.log jane.validate
# null

```

# API Docs

## Scheming.TYPES

Defines the primitive types that can be assigned to a field in a schema definition. Each type defines a string name, an identifier, and a parser. A type may also optionally provide a constructor reference. For detailed reference, see [the TYPE definitions in source](http://autoric.github.io/scheming/Scheming.html#types)

Scheming ships with the following types.
- String `Scheming.TYPES.String` `'string'` `String`
- Number `Scheming.TYPES.Number` `'number'` `Number`
- Integer `Scheming.TYPES.Integer` `'integer'`
- Date `Scheming.TYPES.Date` `'date'` `Date`
- Boolean `Scheming.TYPES.Boolean` `'boolean'` `Boolean`
- Mixed `Scheming.TYPES.Mixed` `'*'`

For example, the following are equivalent:
```
Scheming.create name : Scheming.TYPES.String
Scheming.create name : 'string'
Scheming.create name : String

```

### Custom types

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
Scheming.create name : Symbol
```

### Custom parsing and identifiers

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

## Scheming.DEFAULT_OPTIONS

The default options used when Scheming.create is invoked. If you prefer for all schemas to be created with the seal or strict options set to true, you can modify the default options.

## Scheming.create
`Scheming.create([name], schema, [opts])`

Creates a new [Schema](#Schema) constructor.

## Schema
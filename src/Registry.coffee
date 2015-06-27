# Internal registry for schemas created by `Scheming.create`. Schemas are registered by their name, which is either
# provided at time of creation, or generated as a uuid.
class Registry
  constructor : ->
    @schemas = {}

  # Used internally as part of `Scheming.create`, do not need to expose registration outside of Schema creation.
  register : (name, model) =>
    # Throw an error on naming collisions
    if @schemas[name]
      throw new Error "Naming conflict encountered. Model #{name} already exists"
    @schemas[name] = model

  # ### get
  # Retrieves a schema by registered name
  get : (name) =>
    return @schemas[name]

  # ### reset
  # Resets the state of the Schema registry. Mainly exposed for testing, but could have use in production.
  reset : =>
    @schemas = {}

module.exports = new Registry()
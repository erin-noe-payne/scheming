Scheming = require '../src/Scheming'
sinon = require 'sinon'
chai = require 'chai'
sinonChai = require 'sinon-chai'
_ = require 'lodash'

chai.use sinonChai

global.Scheming = Scheming
global.chai = chai
global.sinon = sinon
global._ = _
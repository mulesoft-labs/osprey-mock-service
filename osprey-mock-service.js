var Negotiator = require('negotiator')
var resources = require('osprey-resources')
var osprey = require('osprey')

/**
 * Export the mock server.
 */
module.exports = ospreyMockServer
module.exports.createServer = createServer
module.exports.createServerFromBaseUri = createServerFromBaseUri
module.exports.loadFile = loadFile

/**
 * Default network delay duration ms
 */
var DEFAULT_DELAY = 1400

/**
 * Options reference variable
 */
var args

/**
 * Create an Osprey server instance.
 *
 * @param  {Object}   raml
 * @return {Function}
 */
function ospreyMockServer (raml) {
  return resources(raml.resources, handler)
}

/**
 * Create a server with Osprey and the mock service.
 *
 * @param  {Object}   raml
 * @param  {Object}   options
 * @return {Function}
 */
function createServer (raml, options) {
  var app = osprey.Router()

  app.use(osprey.server(raml, options))
  app.use(ospreyMockServer(raml))
  app.use(osprey.errorHandler())

  return app
}

/**
 * Create a mock service using the base uri path.
 *
 * @param  {Object}   raml
 * @param  {Object}   options
 * @return {Function}
 */
function createServerFromBaseUri (raml, options) {
  var app = osprey.Router()
  var path = (raml.baseUri || '').replace(/^(\w+:)?\/\/[^\/]+/, '') || '/'

  app.use(path, raml.baseUriParameters, createServer(raml, options))

  return app
}

/**
 * Create a mock service from a filename.
 *
 * @param  {String}   filename
 * @param  {Object}   options
 * @return {Function}
 */
function loadFile (filename, options) {
  args = options
  return require('raml-parser')
    .loadFile(filename)
    .then(function (raml) {
      return createServerFromBaseUri(raml, options)
    })
}

/**
 * Create a RAML example method handler.
 *
 * @param  {Object}   method
 * @return {Function}
 */
function handler (method) {
  var statusCode = getStatusCode(method)
  var response = (method.responses || {})[statusCode] || {}
  var bodies = response.body || {}
  var headers = {}
  var types = Object.keys(bodies)

  // Set up the default response headers.
  Object.keys(response.headers || {}).forEach(function (key) {
    var value = response.headers[key]

    if (value && value.default) {
      headers[key] = value.default
    }
  })

  return function (req, res) {
    var negotiator = new Negotiator(req)
    var type = negotiator.mediaType(types)
    var body = bodies[type]

    res.statusCode = statusCode
    setHeaders(res, headers)

    if (type) {
      res.setHeader('Content-Type', type)
    }

    simulateDelay(function () {
      if (body && body.example) {
        res.write(body.example)
      }
      res.end()
    })
  }
}

/**
 * Get an appropriate HTTP response code.
 *
 * @param  {Object} method
 * @return {Number}
 */
function getStatusCode (method) {
  return Object.keys(method.responses || {})[0] || 200
}

/**
 * Set a map of headers on the response.
 *
 * @param {HTTP.Response} res
 * @param {Object}        headers
 */
function setHeaders (res, headers) {
  Object.keys(headers).forEach(function (key) {
    res.setHeader(key, headers[key])
  })
}

/**
 * Simulate Delayed response
 *
 * @param  {Function} fn
 */
function simulateDelay (fn) {
  if (!args.delay) {
    return fn()
  }
  var delay = typeof args.delay === 'number' ? args.delay : DEFAULT_DELAY
  setTimeout(fn, delay)
}

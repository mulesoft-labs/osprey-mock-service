var router = require('osprey-router')
var Negotiator = require('negotiator')

/**
 * Export the mock server.
 */
module.exports = ospreyMockServer
module.exports.createServer = createServer

/**
 * Create an Osprey server instance.
 *
 * @param  {Object}   raml
 * @return {Function}
 */
function ospreyMockServer (raml) {
  var app = router()

  app.use(createResources(raml.resources))

  return app
}

/**
 * Create a server with Osprey and the mock service.
 *
 * @param  {Object}   raml
 * @param  {Object}   options
 * @return {Function}
 */
function createServer (raml, options) {
  var app = router()
  var osprey = require('osprey')

  app.use(osprey.createServer(raml, options))
  app.use(ospreyMockServer(raml))

  return app
}

/**
 * Create handlers for RAML resources.
 *
 * @param  {Object}   resources
 * @return {Function}
 */
function createResources (resources) {
  var app = router()

  resources.forEach(function (resource) {
    var path = resource.relativeUri
    var params = resource.uriParameters

    app.use(path, params, createResource(resource))
  })

  return app
}

/**
 * Create response handlers for a RAML resource.
 *
 * @param  {Object}   resource
 * @return {Function}
 */
function createResource (resource) {
  var app = router()
  var methods = resource.methods
  var resources = resource.resources

  if (methods) {
    methods.forEach(function (method) {
      app[method.method]('/', handler(method))
    })
  }

  if (resources) {
    app.use(createResources(resources))
  }

  return app
}

/**
 * Create a RAML example method handler.
 *
 * @param  {Object}   method
 * @return {Function}
 */
function handler (method) {
  var statusCode = getStatusCode(method)
  var response = method.responses[statusCode] || {}
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

      if (body && body.example) {
        res.write(body.example)
      }
    }

    res.end()
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

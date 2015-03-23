var is = require('type-is')
var router = require('osprey-router')
var _raml

/**
 * Export the mock server.
 */
module.exports = ospreyMockServer

/**
 * Create an Osprey server instance.
 *
 * @param  {Object}   raml
 * @return {Function}
 */
function ospreyMockServer (raml) {
  var app = router()

  _raml = raml

  app.use(createResources(raml.resources))

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
    var type = getType(types)
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

/**
 * Get the correct response type.
 *
 * @param  {String} contentType
 * @param  {Array}  types
 * @return {String}
 */
function getType (types) {
  for (var i = 0; i < types.length; i++) {
    var type = types[i]

    if (_raml.mediaType === type) {
      return type
    }
  }
}

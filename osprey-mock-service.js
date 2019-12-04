const Negotiator = require('negotiator')
const ospreyResources = require('osprey-resources')
const osprey = require('osprey')

/**
 * Export the mock server.
 */
module.exports = ospreyMockServer
module.exports.createServer = createServer
module.exports.createServerFromBaseUri = createServerFromBaseUri
module.exports.loadFile = loadFile

/**
 * Create an Osprey server instance.
 *
 * @param  {webapi-parser.WebApiDocument} model
 * @return {Function}
 */
function ospreyMockServer (model) {
  return ospreyResources(model.endPoints, mockHandler)
}

/**
 * Create a server with Osprey and the mock service.
 *
 * @param  {webapi-parser.WebApiDocument} model
 * @param  {Object} options
 * @return {Function}
 */
function createServer (model, options) {
  const app = osprey.Router()

  app.use(osprey.server(model, options))
  app.use(ospreyMockServer(model))
  app.use(osprey.errorHandler())

  return app
}

/**
 * Create a mock service using the base uri path.
 *
 * @param  {webapi-parser.WebApiDocument} model
 * @param  {Object} options
 * @return {Function}
 */
function createServerFromBaseUri (model, options) {
  const app = osprey.Router()

  const serverEl = model.encodes.servers[0]
  const baseUri = (serverEl && serverEl.uri.option) || ''
  const path = baseUri.replace(/^(\w+:)?\/\/[^/]+/, '') || '/'

  const baseUriParameters = (serverEl && serverEl.variables) || []
  app.use(path, baseUriParameters, createServer(model, options))

  return app
}

/**
 * Create a mock service from a filename.
 *
 * @param  {String} fpath
 * @param  {Object} options
 * @return {Function}
 */
async function loadFile (fpath, options) {
  const wap = require('webapi-parser')

  options = options || {}
  fpath = fpath.startsWith('file:') ? fpath : `file://${fpath}`
  const model = await wap.raml10.parse(`file://${fpath}`)
  const resolved = await wap.raml10.resolve(model)

  return createServerFromBaseUri(resolved, options)
}

/**
 * Returns either a random example from examples or the single example.
 *
 * @param {Object} obj
 */
function getSingleExample (obj) {
  if (obj.examples) {
    const randomIndex = Math.floor(Math.random() * obj.examples.length)
    return obj.examples[randomIndex].value || obj.examples[randomIndex]
  } else {
    return obj.example
  }
}

/**
 * Create a RAML example method handler.
 *
 * @param  {Object}   method
 * @return {Function}
 */
function mockHandler (method) {
  const statusCode = getStatusCode(method)
  const response = (method.responses || {})[statusCode] || {}
  const bodies = response.body || {}
  const headers = {}
  const types = Object.keys(bodies)

  // Set up the default response headers.
  if (response.headers) {
    Object.keys(response.headers).forEach(function (headerName) {
      const header = response.headers[headerName]
      if (header.default) {
        headers[header.name] = header.default
      } else if (header.example || header.examples) {
        const example = getSingleExample(header)
        headers[header.name] = example
      }
    })
  }

  return function (req, res) {
    const negotiator = new Negotiator(req)
    let type = negotiator.mediaType(types)
    if (req.params && (req.params.mediaTypeExtension || req.params.ext)) {
      let ext = req.params.mediaTypeExtension || req.params.ext
      ext = ext.slice(1)
      type = 'application/' + ext
    }
    const body = bodies[type] || {}

    let propertiesExample
    if (body && body.properties) {
      propertiesExample = Object.keys(body.properties)
        .reduce(function (example, property) {
          if (body.properties[property].example) {
            example[property] = body.properties[property].example
          }
          return example
        }, {})
    }
    res.statusCode = statusCode
    setHeaders(res, headers)

    if (type) {
      res.setHeader('Content-Type', type)
      let example = body.example

      // Parse body.examples
      if (Array.isArray(body.examples)) {
        body.examples = body.examples.map(function (ex) {
          if (ex.structuredValue) {
            return ex.structuredValue
          } else {
            return ex
          }
        })
        example = getSingleExample(body)
      }

      if (example) {
        res.write(typeof example !== 'string'
          ? JSON.stringify(example)
          : example)
      } else if (propertiesExample) {
        res.write(typeof propertiesExample === 'object'
          ? JSON.stringify(propertiesExample)
          : propertiesExample)
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

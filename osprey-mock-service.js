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
  return ospreyResources(model.encodes.endPoints, mockHandler)
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
  const baseUri = (serverEl && serverEl.url.option) || ''
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
  const wap = require('webapi-parser').WebApiParser
  fpath = fpath.startsWith('file:') ? fpath : `file://${fpath}`
  let model, resolved
  try {
    model = await wap.raml10.parse(fpath)
    resolved = await wap.raml10.resolve(model)
  } catch (e) {
    model = await wap.raml08.parse(fpath)
    resolved = await wap.raml08.resolve(model)
  }
  return createServerFromBaseUri(resolved, options || {})
}

/**
 * Returns either a random example from examples or the single example.
 *
 * @param {webapi-parser.Parameter|Payload} element
 */
function getSingleExample (element) {
  return (
    element.schema.examples &&
    element.schema.examples[0].value.option)
}

/**
 * Create a RAML example method handler.
 *
 * @param  {webapi-parser.Operation} method
 * @return {Function}
 */
function mockHandler (method) {
  const response = method.responses && method.responses[0]
  const statusCode = response
    ? parseInt(response.statusCode.value())
    : 200

  // Set up the default response headers.
  const headers = {}
  if (response && response.headers) {
    response.headers.forEach(header => {
      const defaultVal = (
        header.schema.defaultValueStr &&
        header.schema.defaultValueStr.option)
      const example = getSingleExample(header)
      if (defaultVal) {
        headers[header.name.value()] = defaultVal
      } else if (example) {
        headers[header.name.value()] = example
      }
    })
  }

  const bodies = {}
  response.payloads.forEach(pl => {
    bodies[pl.mediaType.value()] = pl
  })
  const types = Object.keys(bodies)

  return function (req, res) {
    const negotiator = new Negotiator(req)
    let type = negotiator.mediaType(types)
    if (req.params && (req.params.mediaTypeExtension || req.params.ext)) {
      let ext = req.params.mediaTypeExtension || req.params.ext
      ext = ext.slice(1)
      type = 'application/' + ext
    }
    const body = bodies[type] || {}

    const propertiesExample = {}
    if (body && body.schema && body.schema.properties) {
      body.schema.properties.forEach(prop => {
        const exampleEl = prop.range.examples && prop.range.examples[0]
        const exampleVal = exampleEl && exampleEl.value.option
        if (exampleVal) {
          propertiesExample[prop.name.value()] = exampleVal
        }
      })
    }
    res.statusCode = statusCode
    setHeaders(res, headers)

    if (type) {
      res.setHeader('Content-Type', type)
      const example = getSingleExample(body)

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

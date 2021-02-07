const Negotiator = require('negotiator')
const ospreyResources = require('osprey-resources')
const osprey = require('osprey')
const ramlSanitize = require('raml-sanitize')()

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
 * Returns a single example of the body.
 *
 * @param {webapi-parser.AnyShape} schema
 */
function getSchemaExample (schema) {
  const exNode = schema.examples && schema.examples[0]
  if (!exNode) {
    return
  }
  const exValue = exNode.value.option && exNode.value.option.trim()
  const isJson = exValue && exValue.startsWith('{')
  const isXml = exValue && exValue.startsWith('<')
  const isStructured = !!exNode.structuredValue
  if (!isStructured || isJson || isXml) {
    return exValue
  }
  return extractDataNodeValue(exNode.structuredValue)
}

/**
 * Returns value of raw header, if included in request.
 *
 * @param {HTTP.Request} req
 * @param {String} header
 * @return {String}
 */
function getRawHeaderValue (req, header) {
  for (var i = 0; i < req.rawHeaders.length; i += 2) {
    if (req.rawHeaders[i] === header) {
      if (i + 1 < req.rawHeaders.length) {
        return req.rawHeaders[i + 1]
      }
    }
  }
}

/**
 * Extracts data from DataNode subclass instance.
 *
 * @param {webapi-parser.DataNode} dNode
 */
function extractDataNodeValue (dNode) {
  // ScalarNode
  if (dNode.dataType !== undefined) {
    return dNode.value.option
  }
  // ArrayNode
  if (dNode.members !== undefined) {
    return dNode.members.map(extractDataNodeValue)
  }
  // ObjectNode
  if (dNode.properties !== undefined) {
    const data = {}
    Object.keys(dNode.properties).forEach(name => {
      data[name] = extractDataNodeValue(dNode.properties[name])
    })
    if (Object.keys(data).length > 0) {
      return data
    }
  }
}

/**
 * Returns a single example of the header.
 *
 * @param {webapi-parser.Parameter} header
 */
function getHeaderExample (header) {
  const example = (
    header.schema.examples &&
    header.schema.examples[0] &&
    header.schema.examples[0].value.option)
  return example ? example.trim() : undefined
}

/**
 * Create a RAML example method handler.
 *
 * @param  {webapi-parser.Operation} method
 * @return {Function}
 */
function mockHandler (method) {
  const mockMethod = method

  return function (req, res) {
    const resourceMethod = req.method + ' ' + req.resourcePath
    const preferredResponses = getRawHeaderValue(req, 'Mock-Preferred-Responses')
    const preferredResponse = preferredResponses
      ? JSON.parse(preferredResponses)[resourceMethod]
      : null

    var response = null
    var statusCode = null
    if (mockMethod.responses && mockMethod.responses.length > 0) {
      if (preferredResponse) {
        mockMethod.responses.forEach(mockResponse => {
          const mockStatusCode = parseInt(mockResponse.statusCode)
          if (mockStatusCode === preferredResponse) {
            response = mockResponse
            statusCode = mockStatusCode
          }
        })
        if (!response) {
          response = mockMethod.responses[0]
          statusCode = preferredResponse
        }
      }
      if (!response) {
        response = mockMethod.responses[0]
        statusCode = mockMethod.responses[0].statusCode
      }
    }
    if (!response && preferredResponse) {
      statusCode = preferredResponse
    } else if (!response) {
      statusCode = 200
    }

    // Set up the default response headers.
    const headers = {}
    if (response && response.headers) {
      response.headers.forEach(header => {
        const defaultVal = (
          header.schema.defaultValueStr &&
          header.schema.defaultValueStr.option)
        const example = getHeaderExample(header)
        if (defaultVal) {
          headers[header.name.value()] = defaultVal
        } else if (example) {
          headers[header.name.value()] = example
        }
      })
    }

    const bodies = {}
    if (response) {
      response.payloads.forEach(pl => {
        bodies[pl.mediaType.value()] = pl
      })
    }
    const types = Object.keys(bodies)

    const negotiator = new Negotiator(req)
    let type = negotiator.mediaType(types)
    if (req.params && (req.params.mediaTypeExtension || req.params.ext)) {
      let ext = req.params.mediaTypeExtension || req.params.ext
      ext = ext.slice(1)
      type = 'application/' + ext
    }
    const body = bodies[type] || {}

    res.statusCode = statusCode
    setHeaders(res, headers)

    if (type) {
      res.setHeader('Content-Type', type)
      const example = getSchemaExample(body.schema)
      const sanitizer = ramlSanitize(body.schema.properties)
      const sanitize = (obj) => typeof obj === 'object' ? sanitizer(obj) : obj

      if (example) {
        res.write(typeof example !== 'string'
          ? JSON.stringify(sanitize(example))
          : example)
      } else {
        let propertiesExample
        if (body && body.schema && body.schema.properties) {
          propertiesExample = {}
          body.schema.properties.forEach(prop => {
            const exampleVal = getSchemaExample(prop.range)
            if (exampleVal) {
              propertiesExample[prop.name.value()] = exampleVal
            }
          })
        }
        if (propertiesExample) {
          res.write(typeof propertiesExample === 'object'
            ? JSON.stringify(sanitize(propertiesExample))
            : propertiesExample)
        }
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

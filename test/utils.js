/* Helps using popsicle-server with popsicle version 12+.
 *
 * Inspired by popsicle 12.0+ code.
 */
function makeFetcher (app) {
  var compose = require('throwback').compose
  var Request = require('servie').Request
  var popsicle = require('popsicle')
  var popsicleServer = require('popsicle-server')

  // Set response text to "body" property to mimic popsicle v10
  // response interface.

  function responseBodyMiddleware (req, next) {
    return next().then(res => {
      return res.text().then(body => {
        res.body = body
        return res
      })
    })
  }

  var popsicleServerMiddleware = popsicleServer(app)
  var middleware = compose([
    responseBodyMiddleware,
    popsicleServerMiddleware,
    popsicle.middleware
  ])

  return {
    fetch: popsicle.toFetch(middleware, Request)
  }
}

module.exports.makeFetcher = makeFetcher

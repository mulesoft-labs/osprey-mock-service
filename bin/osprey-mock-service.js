#!/usr/bin/env node

var http = require('http')
var finalhandler = require('finalhandler')
var mock = require('../')
var Router = require('osprey').Router
var morgan = require('morgan')

var argv = require('yargs')
  .usage(
    'Generate an API mock server from a RAML definition.\n\n' +
    'Usage: $0 -f [file] -p [port number] --cors --simulate-delay'
  )
  .demand(['f', 'p'])
  .describe('f', 'Path to the RAML definition')
  .describe('p', 'Port number to bind the proxy')
  .describe('cors', 'Enable CORS with the API')
  .describe('simulate-delay', 'Simulate slow network condition. Default 1400ms')
  .argv

var options = {
  cors: !!argv.cors,
  delay: argv.simulateDelay
}

mock.loadFile(argv.f, options)
  .then(function (app) {
    var router = new Router()

    // Log API requests.
    router.use(morgan('combined'))
    router.use(app)

    var server = http.createServer(function (req, res) {
      router(req, res, finalhandler(req, res))
    })

    server.listen(argv.p, function () {
      console.log('Mock service running at http://localhost:' + server.address().port)
    })
  })
  .catch(function (err) {
    console.log(err && err.stack || err.message)
    process.exit(1)
  })

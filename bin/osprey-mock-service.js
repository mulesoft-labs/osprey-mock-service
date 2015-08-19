#!/usr/bin/env node

var http = require('http')
var finalhandler = require('finalhandler')
var mock = require('../')

var argv = require('yargs')
  .usage(
    'Generate an API mock server from a RAML definition.\n\n' +
    'Usage: $0 -f [file] -p [port number] --cors'
  )
  .demand(['f', 'p'])
  .describe('f', 'Path to the RAML definition')
  .describe('p', 'Port number to bind the proxy')
  .describe('cors', 'Enable CORS with the API')
  .argv

var options = {
  cors: !!argv.cors
}

mock.loadFile(argv.f, options)
  .then(function (app) {
    var server = http.createServer(function (req, res) {
      app(req, res, finalhandler(req, res))
    })

    server.listen(argv.p)

    console.log('Mock service running at http://localhost:' + server.address().port)
  })
  .catch(function (err) {
    console.log(err && err.stack || err.message)
    process.exit(1)
  })

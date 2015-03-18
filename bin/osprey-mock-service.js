#!/usr/bin/env node

var osprey = require('osprey')
var parser = require('raml-parser')
var finalhandler = require('finalhandler')
var http = require('http')
var mock = require('../')

var argv = require('yargs')
  .usage(
    'Generate an API mock server from a RAML definition.\n\n' +
    'Usage: $0 -f [file] -p [port number]'
  )
  .demand(['f', 'p'])
  .describe('f', 'Path to the RAML definition')
  .describe('p', 'Port number to bind the proxy')
  .describe('docs', 'Serve documentation from a path')
  .argv

parser.loadFile(argv.f)
  .then(function (raml) {
    var app = osprey.createServer(raml, {
      documentationPath: argv.docs
    })

    app.use(mock(raml))

    var server = http.createServer(function (req, res) {
      app(req, res, finalhandler(req, res))
    })

    server.listen(argv.p)

    console.log('Mock service is now listening on port ' + server.address().port)
  })
  .catch(function (err) {
    console.log(err && err.stack || err.message)
    process.exit(1)
  })

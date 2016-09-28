var mockService = require('../bin/osprey-mock-service')
var express = require('express')
var parser = require('raml-1-parser')
var path = require('path')
var osprey = require('osprey')

var app = express()

parser.loadFile(path.join(__dirname, '/api.raml'))
   .then(function (raml) {
     app.use(osprey.createServer(raml))
     app.use(mockService(raml))
     app.listen(3000)
   })

var mockService = require('../bin/osprey-mock-service')
var express = require('express')
var parser = require('raml-1-parser')

var app = express()

parser.loadFile(__dirname + '/api.raml')
    .then(function (raml) {
        app.use(osprey.createServer(raml))
        app.use(mockService(raml))
        app.listen(3000)
    })
var mockService = require('../osprey-mock-service')
var express = require('express')
var path = require('path')

var app

mockService.loadFile(path.join(__dirname, 'api.raml'))
  .then(function (mockApp) {
    app = express()
    app.use(mockApp)
    app.listen(3000)
  })

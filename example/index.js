const express = require('express')
const path = require('path')

const mockService = require('../osprey-mock-service')

let app

mockService.loadFile(path.join(__dirname, 'api.raml'))
  .then(function (mockApp) {
    app = express()
    app.use(mockApp)
    app.listen(3000)
  })

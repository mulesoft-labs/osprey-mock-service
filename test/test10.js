/* global describe, it, beforeEach */

var expect = require('chai').expect
var mockService = require('../')
var popsicle = require('popsicle')
var server = require('popsicle-server')
var finalhandler = require('finalhandler')
var httpes = require('http')
var path = require('path')

describe('osprey mock service v1.0', function () {
  var http

  beforeEach(function () {
    return mockService.loadFile(path.join(__dirname, '/fixtures/example10.raml'), { server: { cors: true, compression: true } })
      .then(function (raml) {
        http = httpes.createServer(function (req, res) {
          return raml(req, res, finalhandler(req, res))
        })
      })
  })

  describe('routes', function () {
    it('should expose a function', function () {
      expect(mockService).to.be.a('function')
    })

    it('headers', function () {
      return popsicle.default(
        {
          method: 'POST',
          url: '/api/organization',
          headers: {
            'Content-type': 'application/json',
            'Location': 'World'
          }
        }
      )
      .use(server(http))
      .then(function (res) {
        expect(res.rawHeaders).to.contain('Location')
      })
    })

    it('should respond with example parameter', function () {
      return popsicle.default(
        {
          method: 'GET',
          url: '/api/organization',
          headers: {
            'Authorization': 'Bearer 1234'
          }
        }
      )
      .use(server(http))
      .then(function (res) {
        expect(JSON.parse(res.body)[0].name).to.deep.equal('success')
        expect(res.status).to.equal(200)
      })
    })

    it('should reject undefined route', function () {
      return popsicle.default('/api/unknown')
        .use(server(http))
        .then(function (res) {
          expect(res.status).to.equal(404)
        })
    })

    it('should have empty body when no example parameter available', function () {
      return popsicle.default('/api/noexample')
        .use(server(http))
        .then(function (res) {
          expect(res.status).to.equal(200)
          expect(res.body).to.be.empty
        })
    })
  })
})

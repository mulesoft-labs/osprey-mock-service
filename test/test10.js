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
    this.timeout(3000)
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

    it('should respond with example parameter', function () {
      return popsicle.default(
        {
          method: 'GET',
          url: '/api/test'
        }
      )
        .use(server(http))
        .then(function (res) {
          expect(JSON.parse(res.body)).to.deep.equal({success: true})
          expect(res.status).to.equal(200)
        })
    })

    it('should respond with nested example parameter', function () {
      return popsicle.default(
        {
          method: 'GET',
          url: '/api/nested'
        }
      )
        .use(server(http))
        .then(function (res) {
          expect(JSON.parse(res.body)).to.deep.equal({nested: {success: true}})
          expect(res.status).to.equal(200)
        })
    })

    it('should respond with a boolean body', function () {
      return popsicle.default(
        {
          method: 'GET',
          url: '/api/boolean'
        }
      )
        .use(server(http))
        .then(function (res) {
          expect(JSON.parse(res.body)).to.equal(true)
          expect(res.status).to.equal(200)
        })
    })

    it('should respond with multiple examples', function () {
      return popsicle.default(
        {
          method: 'GET',
          url: '/api/examples'
        }
      )
        .use(server(http))
        .then(function (res) {
          var match = /example./.test(JSON.parse(res.body).name)
          expect(match).to.equal(true)
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

    it('should have empty body when there are no example property', function () {
      return popsicle.default('/api/noexample')
        .use(server(http))
        .then(function (res) {
          expect(res.status).to.equal(200)
          expect(res.body).to.equal('')
        })
    })

    it('should return a header \'foo\' equal to the \'default\' value \'test\' instead of the \'example\' value', function () {
      return popsicle.default(
        {
          method: 'GET',
          url: '/api/headersdefaultbeforeexample'
        }
      )
        .use(server(http))
        .then(function (res) {
          expect(res.headers.foo).to.equal('test')
        })
    })

    it('should return a header \'foo\' equal to the \'default\' value \'test\'', function () {
      return popsicle.default(
        {
          method: 'GET',
          url: '/api/headersdefault'
        }
      )
        .use(server(http))
        .then(function (res) {
          expect(res.headers.foo).to.equal('test')
        })
    })

    it('should return a header \'foo\' equal to the \'example\' value \'bar\'', function () {
      return popsicle.default(
        {
          method: 'GET',
          url: '/api/headersexample'
        }
      )
        .use(server(http))
        .then(function (res) {
          expect(res.headers.foo).to.equal('bar')
        })
    })

    it('should return a header \'foo\' equal to any of the \'examples\' value defined', function () {
      return popsicle.default(
        {
          method: 'GET',
          url: '/api/headersexamples'
        }
      )
        .use(server(http))
        .then(function (res) {
          expect(res.headers.foo).to.be.oneOf(['bar', 'foo', 'random', 'another'])
        })
    })

    it('should default to document\'s mediatype', function () {
      return popsicle.default(
        {
          method: 'GET',
          url: '/api/defaultmediatype'
        }
      )
        .use(server(http))
        .then(function (res) {
          expect(JSON.parse(res.body))
            .to.deep.equal({stringProperty: 'foo', numberProperty: 23})
        })
    })

    it('should respect mediaTypeExtensions', function () {
      return popsicle.default(
        {
          method: 'GET',
          url: '/api/mediatypeextension.xml'
        }
      )
        .use(server(http))
        .then(function (res) {
          expect(res.body).to.contain('<resource>', '<stringProperty>', '<numberProperty>')
        })
    })

    it('should respect ext', function () {
      return popsicle.default(
        {
          method: 'GET',
          url: '/api/ext.json'
        }
      )
        .use(server(http))
        .then(function (res) {
          expect(JSON.parse(res.body))
            .to.deep.equal({stringProperty: 'foo', numberProperty: 23})
        })
    })

    it('should return property-level examples from type.', function () {
      return popsicle.default(
        {
          method: 'GET',
          url: '/api/user'
        }
      )
        .use(server(http))
        .then(function (res) {
          expect(JSON.parse(res.body).name).to.equal('Kendrick')
        })
    })
  })
})

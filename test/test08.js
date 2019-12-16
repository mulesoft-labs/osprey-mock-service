/* global describe, it, before */

const expect = require('chai').expect
const mockService = require('../')
const httpLib = require('http')
const path = require('path')
const finalhandler = require('finalhandler')
const makeFetcher = require('./utils').makeFetcher

describe('osprey mock service v0.8', function () {
  let app

  before(async function () {
    this.timeout(3000)
    const createdApp = await mockService.loadFile(
      path.join(__dirname, '/fixtures/example08.raml'),
      { server: { cors: true, compression: true } }
    )
    app = httpLib.createServer(function (req, res) {
      return createdApp(req, res, finalhandler(req, res))
    })
  })

  describe('routes', function () {
    it('should expose a function', function () {
      expect(mockService).to.be.a('function')
    })

    it('should respond with example parameter', function () {
      return makeFetcher(app).fetch('/api/test', {
        method: 'GET'
      })
        .then(function (res) {
          console.log(res.body)
          expect(res.status).to.equal(200)
          expect(JSON.parse(res.body)).to.deep.equal({ success: true })
        })
    })

    it('should reject undefined route', function () {
      return makeFetcher(app).fetch('/api/unknown', {
        method: 'GET'
      })
        .then(function (res) {
          expect(res.status).to.equal(404)
        })
    })

    it('should have empty body when there are no example property', function () {
      return makeFetcher(app).fetch('/api/noexample', {
        method: 'GET'
      })
        .then(function (res) {
          expect(res.status).to.equal(200)
          expect(res.body).to.equal('')
        })
    })

    it('should respect mediaTypeExtensions (application/json)', function () {
      return makeFetcher(app).fetch('/api/mediatypeextension.json', {
        method: 'GET'
      })
        .then(function (res) {
          expect(JSON.parse(res.body)).to.deep.equal({ foo: 'bar' })
        })
    })

    it('should respect mediaTypeExtensions (application/xml)', function () {
      return makeFetcher(app).fetch('/api/mediatypeextension.xml', {
        method: 'GET'
      })
        .then(function (res) {
          expect(res.body).to.contain('<resource>', '<stringProperty>', '<numberProperty>')
        })
    })
  })
})

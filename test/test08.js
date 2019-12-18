/* global describe, it, before */

const expect = require('chai').expect
const ospreyMockService = require('../')
const httpes = require('http')
const path = require('path')
const finalhandler = require('finalhandler')
const makeFetcher = require('./utils').makeFetcher

describe('osprey mock service v0.8', function () {
  let http

  before(async function () {
    this.timeout(3000)
    const fpath = path.join(__dirname, '/fixtures/example08.raml')
    const opts = { server: { cors: true, compression: true } }
    return ospreyMockService.loadFile(fpath, opts)
      .then(server => {
        http = httpes.createServer(function (req, res) {
          return server(req, res, finalhandler(req, res))
        })
      })
  })

  describe('routes', function () {
    it('should expose a function', function () {
      expect(ospreyMockService).to.be.a('function')
    })

    it('should respond with example parameter', function () {
      return makeFetcher(http).fetch('/api/test', {
        method: 'GET'
      })
        .then(function (res) {
          console.log(res.body)
          expect(res.status).to.equal(200)
          expect(JSON.parse(res.body)).to.deep.equal({ success: true })
        })
    })

    it('should reject undefined route', function () {
      return makeFetcher(http).fetch('/api/unknown', {
        method: 'GET'
      })
        .then(function (res) {
          expect(res.status).to.equal(404)
        })
    })

    it('should have empty body when there are no example property', function () {
      return makeFetcher(http).fetch('/api/noexample', {
        method: 'GET'
      })
        .then(function (res) {
          expect(res.status).to.equal(200)
          expect(res.body).to.equal('')
        })
    })

    it('should respect mediaTypeExtensions (application/json)', function () {
      return makeFetcher(http).fetch('/api/mediatypeextension.json', {
        method: 'GET'
      })
        .then(function (res) {
          expect(JSON.parse(res.body)).to.deep.equal({ foo: 'bar' })
        })
    })

    it('should respect mediaTypeExtensions (application/xml)', function () {
      return makeFetcher(http).fetch('/api/mediatypeextension.xml', {
        method: 'GET'
      })
        .then(function (res) {
          expect(res.body).to.contain('<resource>', '<stringProperty>', '<numberProperty>')
        })
    })
  })
})

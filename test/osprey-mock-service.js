/* global describe, it */

var expect = require('chai').expect
var mockService = require('../')
var router = require('osprey-router')
var popsicle = require('popsicle')
var server = require('popsicle-server')
var express = require('express')
var osprey = require('osprey')
var app = express()

describe('osprey mock service', function () {
    var ENDPOINT = '';
    var http
    //var app

    before(function () {
        //app = router()
        return mockService.loadFile(__dirname + '/fixtures/example.raml')
            .then(function (raml) {
                app.use(mockService(raml))
                //app.listen(3000)
                //http = mockService.createServer(raml)
            })
    })
    describe('routes', function () {

        it('should expose a function', function () {
            expect(mockService).to.be.a('function')
        })

        it('should respond with example parameter', function () {
            popsicle.get(ENDPOINT + '/test')
                .then(function (res) {
                    expect(JSON.parse(res.body)).to.have.any.keys('success')
                    expect(res.status).to.equal(200)
                })
        })

        it('should reject undefined route', function () {
            popsicle.get(ENDPOINT + '/unknown')
                .use(server(app))
                .then(function (res) {
                    expect(res.status).to.equal(404)
                })
        })
    })
})

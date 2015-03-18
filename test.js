/* global describe, it */

var expect = require('chai').expect
var mockService = require('./')

describe('osprey mock service', function () {
  it('should expose a function', function () {
    expect(mockService).to.be.a('function')
  })
})

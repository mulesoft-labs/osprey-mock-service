# Osprey Mock Service

[![Greenkeeper badge](https://badges.greenkeeper.io/mulesoft-labs/osprey-mock-service.svg)](https://greenkeeper.io/)

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]

Generate an API mock service from a RAML definition using Osprey.

## Usage

### Global (CLI)

```
npm install -g osprey-mock-service
```

Start the service from the CLI. This will automatically use the `baseUri` as the path to the mock service. For example, `http://example.com/api` will result in `http://localhost:{PORT}/api`.

```
osprey-mock-service -f api.raml -p 3000 --cors
```

**Options**

* `-f` Path to the root RAML definition (E.g. `/path/to/api.raml`)
* `-p` Port number to bind the server locally
* `--cors` Enable CORS with the API

### Locally (JavaScript)

```
npm install osprey-mock-service --save
```

The mocking service simply accepts a RAML definition and returns a router that can be mounted into any Connect-style middleware layer or even used with `http`. Best used with `osprey` to support incoming validation automatically.

```js
var mockService = require('../osprey-mock-service')
var express = require('express')
var parser = require('raml-1-parser')
var path = require('path')
var osprey = require('osprey')

var app = express()

parser.loadRAML(path.join(__dirname, 'api.raml'), { rejectOnErrors: true })
  .then(function (ramlApi) {
    var raml = ramlApi.expand(true).toJSON({ serializeMetadata: false })
    app.use(osprey.server(raml))
    app.use(mockService(raml))
    app.listen(3000)
  })

```

#### Additional methods

* `createServer` Creates a mock service instance with Osprey
* `createServerFromBaseUri` Creates a mock service with Osprey and uses the base URI path
* `loadFile` Creates a mock service with Osprey and the base URI path from a RAML file

## License

Apache License 2.0

[npm-image]: https://img.shields.io/npm/v/osprey-mock-service.svg?style=flat
[npm-url]: https://npmjs.org/package/osprey-mock-service
[downloads-image]: https://img.shields.io/npm/dm/osprey-mock-service.svg?style=flat
[downloads-url]: https://npmjs.org/package/osprey-mock-service
[travis-image]: https://img.shields.io/travis/mulesoft-labs/osprey-mock-service.svg?style=flat
[travis-url]: https://travis-ci.org/mulesoft-labs/osprey-mock-service
[coveralls-image]: https://img.shields.io/coveralls/mulesoft-labs/osprey-mock-service.svg?style=flat
[coveralls-url]: https://coveralls.io/r/mulesoft-labs/osprey-mock-service?branch=master

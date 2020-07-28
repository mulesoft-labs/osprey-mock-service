# Osprey Mock Service

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![Greenkeeper badge](https://badges.greenkeeper.io/mulesoft-labs/osprey-mock-service.svg)](https://greenkeeper.io/)

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
const ospreyMockService = require('osprey-mock-service')
const express = require('express')
const wap = require('webapi-parser').WebApiParser
const path = require('path')
const osprey = require('osprey')

async function main () {
  const app = express()
  const fpath = `file://${path.join(__dirname, 'api.raml')}`
  let model = await wap.raml10.parse(fpath)
  model = await wap.raml10.resolve(model)

  app.use(osprey.server(model))
  app.use(ospreyMockService(model))
  app.listen(3000)
}

main()

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

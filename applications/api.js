'use strict';

const
  Ecosystem = require('../utils/ecosystem'),
  NodeRsa = require('node-rsa'),
  Fs = require('fs'),
  Path = require('path'),
  SwaggerTools = require('swagger-tools'),
  bodyParser = require('body-parser'),
  JsYaml = require('js-yaml')

module.exports = async function (swaggerPath, config) {
  const keys = {
    private: new NodeRsa(Buffer.from(config['private-key'], 'base64')),
    proxy_public_key: new NodeRsa(Buffer.from(config.proxy.public_key, 'base64')),
    authn_public_key: new NodeRsa(Buffer.from(config.authn.public_key, 'base64'))
  }
  const app = require('express')();

  app.use(bodyParser.json({ limit: '15mb' }))
  app.use(await Ecosystem(keys, config))

  // swaggerRouter configuration
  var options = {
    swaggerUi: Path.join(__dirname, '/swagger.json'),
    controllers: './controllers'
  };

  // The Swagger document (require it, build it programmatically, fetch it from a URL, ...)
  var swaggerDoc = JsYaml.safeLoad(Fs.readFileSync(swaggerPath, 'utf8'))

  // Initialize the Swagger middleware
  SwaggerTools.initializeMiddleware(swaggerDoc, function (middleware) {
    app.use(middleware.swaggerMetadata()); // Interpret Swagger resources and attach metadata to request - must be first in swagger-tools middleware chain
    app.use(middleware.swaggerValidator());
    app.use(middleware.swaggerRouter(options));
    app.use(middleware.swaggerUi());

    // Start the server
    app.listen(config.port, (err) => {
      if (err) {
        console.log(err);
        process.exit(1)
      }
      console.log(`${config.name} service is up: ${config.proxy.base_path}/${config.base_path}/`);
    });
  });


}
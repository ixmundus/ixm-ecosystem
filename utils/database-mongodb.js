const MongoClient = require('mongodb').MongoClient;
const _ = require('lodash')

module.exports.db = null
module.exports.init = async function(url, dbName) {

  const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    // Use connect method to connect to the Server
    await client.connect();
    module.exports.client = client

    module.exports.db = client.db(dbName);
    module.exports.db.toMongo = function (component) {
      if (_.isNull(component) || component == 'null') {
        return null
      } else if (_.isArray(component)) {
        return _.map(component, val => {
          return module.exports.db.toMongo (val)
        })
      } else if (_.isObject(component)) {
        var response = {}
        _.forIn(component, (val, key) => {
          key = key.split('.').join('>')
          response[key] = module.exports.db.toMongo(val)
        })
        return response
      } else {
        return component
      }
    }
    
    module.exports.db.fromMongo = function (component) {
      if (_.isNull(component) || component == 'null') {
        return null
      } else if (_.isArray(component)) {
        return _.map(component, val => {
          return module.exports.db.fromMongo (val)
        })
      } else if (_.isObject(component)) {
        var response = {}
        _.forIn(component, (val, key) => {
          key = key.split('>').join('.')
          response[key] = module.exports.db.fromMongo(val)
        })
        return response
      } else {
        return component
      }
    }
  } catch (err) {
    console.log(err.stack);
    throw err
  }

}

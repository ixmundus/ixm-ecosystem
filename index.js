const DatabaseProvider = require('./utils/database-mongodb'),
HrefGenerator = require('./utils/href_generator')

module.exports = {
	runApi: require('./applications/api'),
	init: async function(config) {
		module.exports.config = config
		await DatabaseProvider.init(config.database.url, config.database.name)
		HrefGenerator.init(`${config.proxy.base_path}/${config.base_path}/`)
	},
	utils: require('./utils')
}

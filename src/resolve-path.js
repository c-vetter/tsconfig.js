const path = require('path')

module.exports = function resolvePath (filepath) {
	try {
		// add file extension
		return require.resolve(filepath) // throws if not found, hence try
	} catch (e) {
		return path.resolve(filepath)
	}
}

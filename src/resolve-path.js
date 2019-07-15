const path = require('path')

module.exports = function resolvePath (filepath, context) {
	const relative = /^[.]{1,2}[\\/]/.test(filepath)

	if (relative) {
		filepath = path.resolve(path.dirname(context), filepath)
	}

	try {
		// add file extension
		return require.resolve(filepath) // throws if not found, hence try
	} catch (e) {
		return path.resolve(filepath)
	}
}

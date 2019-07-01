const fs = require('fs-extra')

module.exports = function make(filepath) {
	try {
		return fs.writeJson(
			`${filepath}on`,
			require(filepath)
		)
	} catch (e) {
		e.stack = `Error: ${e.message}\n    at ${filepath}`

		throw e
	}
}

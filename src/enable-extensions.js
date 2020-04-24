const { extensions: available } = require('interpret')

module.exports = enableExtensions

function enableExtensions(extensions) {
	extensions.forEach(ext => {
		if (!available[ext]) return

		const options = [].concat(available[ext])

		if (!options.some(enable)) {
			throw new Error(`Could not enable extension '${ext}'. Make sure to install all dependencies!`)
		}
	})
}

function enable(module) {
	try {
		if (typeof module === 'string') require(module)
		else module.register(require(module.module))

		return true
	} catch(e) {
		return false
	}
}

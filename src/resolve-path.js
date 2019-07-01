const path = require('path')

module.exports = async function resolvePath (...segments) {
	const filepath = path.resolve(...segments)

	try {
		return require.resolve(filepath) // throws if not found, hence try
	} catch (e) {
		return filepath
	}
}

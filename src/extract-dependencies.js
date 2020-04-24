const resolvePath = require('./resolve-path')

module.exports = extractDependencies

function extractDependencies (filepath) {
	filepath = resolvePath(filepath)

	if (!require.cache[filepath]) {
		return
	}

	return require.cache[filepath]
	.children
	.map(({ id }) => id)
}

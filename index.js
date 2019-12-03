module.exports = (...args) => require('./src/once')(normalizeOptions(...args))
module.exports.watch = (...args) => require('./src/watch')(normalizeOptions(...args))

function normalizeOptions(optionsOrRoot, ignore) {
	if (typeof optionsOrRoot === 'object') {
		return optionsOrRoot
	}

	// legacy API
	return {
		ignore,
		root: optionsOrRoot,
	}
}

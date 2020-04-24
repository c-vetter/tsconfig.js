module.exports = {
	once(options) { return require('./once')(options) },
	watch(options) { return require('./watch')(options) },
}

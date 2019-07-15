const baseConfig = require('../tsconfig')

module.exports = {
	...baseConfig,

	compilerOptions: {
		...baseConfig.compilerOptions,

		moduleResolution: 'node',
	},
}

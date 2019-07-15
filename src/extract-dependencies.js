const fs = require('fs-extra')

const resolvePath = require('./resolve-path')

const matcher = /\brequire\s*\(\s*(["'])(.+?[^\\])\1\)/mg

module.exports = extractDependencies

function extractDependencies (filepath) {
	try {
		const dependencies = []
		const content = fs.readFileSync(resolvePath(filepath)).toString()

		let match
		while(match = matcher.exec(content)) {
			dependencies.push(resolvePath(match[2], filepath))
		}

		return dependencies
	} catch (_) { // filepath does not resolve to existing file
		return
	}
}

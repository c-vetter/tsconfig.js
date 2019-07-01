const fs = require('fs-extra')

const resolvePath = require('./resolve-path')

const matcher = /\brequire\s*\(\s*(["'])(.+?[^\\])\1\)/mg

module.exports = extractDependencies

async function extractDependencies (filepath) {
	try {
		const dependencies = []
		const content = fs.readFileSync((await resolvePath(filepath))).toString()

		let match
		while(match = matcher.exec(content)) {
			dependencies.push(resolvePath(filepath, '..', match[2]))
		}

		return Promise.all(dependencies)
	} catch (_) { // filepath does not resolve to existing file
		return
	}
}

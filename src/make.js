const path = require('path')

const fs = require('fs-extra')

module.exports = make

function make(filepath, options) {
	const { log } = options

	try {
		log.debug(`Running ‘make’ for “${filepath}”`)

		const tsconfig = require(filepath)

		log.debug('File loaded, building config')

		if (tsconfig.extends) {
			switch (options.extendsStrategy) {
				case 'ignore': break

				case 'drop-any':
					log.silly(`‘extends’ field set, dropping`)

					delete tsconfig.extends
				break

				case 'drop-relative':
				default:
					if (tsconfig.extends.startsWith('.')) {
					log.silly(`‘extends’ field set to relative path, dropping`)

						delete tsconfig.extends
					}
				break
			}
		}

		log.silly('Setting up main config')
		const output = [JSON.stringify(tsconfig)]

		switch (options.addComments) {
			case 'none': break

			case 'minimal':
				log.silly('Adding filepath as comment')
				output.unshift(`// ${filepath}`)
			break

			case 'info':
			default:
				log.silly('Adding informative comment')

				output.unshift(`// source file: ${filepath}`)
				output.unshift('// built using `tsconfig.js` (https://www.npmjs.com/package/tsconfig.js)')
				output.unshift('// DO NOT EDIT!!!!')
			break
		}

		log.silly('Parsing filepath')
		const { dir, name } = path.parse(filepath)

		log.silly('Assembling final data')
		const writecontent = output.join('\n')
		const writepath = `${dir}/${name}.json`

		log.debug('Writing JSON to file and returning')
		log.silly(`Parameters:`)
		log.silly(writepath)
		log.silly(writecontent)

		return fs.writeFile(
			writepath,
			writecontent,
		)
	} catch (error) {
		return Promise.reject(error)
	}
}

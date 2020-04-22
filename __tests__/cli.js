const test = require('ava')
const proxyquire = require('proxyquire')


const [p1, p2, p3] = ['p1', 'p2', 'p3']


test('no parameters', t => {
	checkOptions(t, '', { ignore: [] })
})

test('positional parameters', t => {
	checkOptions(t,
		'p1 p2 p3',
		{
			ignore: [p1, p2, p3],
		}
	)
})

test('root parameter', t => {
	checkOptions(t,
		'--root p1 p2 p3',
		{
			root: p1,
			ignore: [p2, p3],
		}
	)

	checkOptions(t,
		'p1 --root=p2 p3',
		{
			root: p2,
			ignore: [p1, p3],
		}
	)

	checkOptions(t,
		'p1 p2 --root p3',
		{
			root: p3,
			ignore: [p1, p2],
		}
	)
})

test('extends parameter', t => {
	checkOptions(t,
		'--extends=p1 p2 p3',
		{
			extends: p1,
			ignore: [p2, p3],
		}
	)

	checkOptions(t,
		'p1 --extends p2 p3',
		{
			extends: p2,
			ignore: [p1, p3],
		}
	)

	checkOptions(t,
		'p1 p2 --extends=p3',
		{
			extends: p3,
			ignore: [p1, p2],
		}
	)
})

test('all parameters', t => {
	checkOptions(t,
		'p1 --root root p2 --extends ext p3',

		{
			root: 'root',
			extends: 'ext',
			ignore: [p1, p2, p3],
		}
	)

	checkOptions(t,
		'p1 --extends ext p2 --root root p3',

		{
			root: 'root',
			extends: 'ext',
			ignore: [p1, p2, p3],
		}
	)

	checkOptions(t,
		'--comment --extends=ext --extensions=ext1,ext2,ext3 --root=root -- p1 p2 p3',

		{
			root: 'root',
			comment: true,
			extends: 'ext',
			extensions: ['ext1', 'ext2', 'ext3'],
			ignore: [p1, p2, p3],
		}
	)
})

function checkOptions (t, input, optionsRequired) {
	const optionsExpected = {
		comment: false,
		extends: undefined,
		extensions: ['js'],
		ignore: [],
		root: undefined,

		...optionsRequired,
	}
	let options


	prepare(input)
	require('proxyquire').noCallThru()('../cli.js', {
		'./src/once': o => {
			options = o
			return { catch() {} }
		}
	})
	t.deepEqual(options, optionsExpected)

	prepare(input, true)
	proxyquire('../cli.js', {
		'./src/watch': o => {
			options = o
			return { on() {} }
		}
	})
	t.deepEqual(options, optionsExpected)
}

function prepare(input, watch) {
	process.argv = ['npx', 'tsconfig.js']

	if (!watch) process.argv.push('--no-watch')

	if (input) process.argv.push(...input.split(' '))
}

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

test('extendsStrategy parameter', t => {
	checkOptions(t,
		'--extends-strategy=p1 p2 p3',
		{
			extendsStrategy: p1,
			ignore: [p2, p3],
		}
	)

	checkOptions(t,
		'p1 --extends-strategy p2 p3',
		{
			extendsStrategy: p2,
			ignore: [p1, p3],
		}
	)

	checkOptions(t,
		'p1 p2 --extends-strategy=p3',
		{
			extendsStrategy: p3,
			ignore: [p1, p2],
		}
	)
})

test('all parameters', t => {
	checkOptions(t,
		'p1 --root root p2 --extends-strategy ext p3',

		{
			root: 'root',
			extendsStrategy: 'ext',
			ignore: [p1, p2, p3],
		}
	)

	checkOptions(t,
		'p1 --extends-strategy ext p2 --root root p3',

		{
			root: 'root',
			extendsStrategy: 'ext',
			ignore: [p1, p2, p3],
		}
	)

	checkOptions(t,
		'--add-comments=none --extends-strategy=ext --extensions=ext1,ext2,ext3 --root=root -- p1 p2 p3',

		{
			root: 'root',
			addComments: 'none',
			extendsStrategy: 'ext',
			extensions: ['.ext1', '.ext2', '.ext3'],
			ignore: [p1, p2, p3],
		}
	)
})

function checkOptions (t, input, optionsRequired) {
	const optionsExpected = {
		addComments: undefined,
		extendsStrategy: undefined,
		extensions: ['.js'],
		ignore: [],
		root: undefined,
		logFile: undefined,
		logLevel: undefined,
		logToConsole: undefined,

		...optionsRequired,
	}
	let options


	prepare(input)
	require('proxyquire').noCallThru()('../cli.js', {
		'./once': o => {
			options = o
			return { catch() {} }
		}
	})
	t.like(options, optionsExpected)

	prepare(input, true)
	proxyquire('../cli.js', {
		'./watch': o => {
			options = o
			return { on() {} }
		}
	})
	t.like(options, optionsExpected)
}

function prepare(input, watch) {
	process.argv = ['npx', 'tsconfig.js']

	if (!watch) process.argv.push('--once')

	if (input) process.argv.push(...input.split(' '))
}

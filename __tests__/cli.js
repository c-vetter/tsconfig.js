const test = require('ava')
const proxyquire = require('proxyquire')


const [p1, p2, p3] = ['p1', 'p2', 'p3']


test('no parameters', t => {
	checkOptions(t, '', ['.', []])
})

test('positional parameters', t => {
	checkOptions(t,
		'p1 p2 p3',
		['.', [p1, p2, p3]]
	)
})

test('root parameter', t => {
	checkOptions(t,
		'--root p1 p2 p3',
		[p1, [p2, p3]]
	)

	checkOptions(t,
		'p1 --root p2 p3',
		[p2, [p1, p3]]
	)

	checkOptions(t,
		'p1 p2 --root p3',
		[p3, [p1, p2]]
	)
})

function checkOptions (t, input, argsExpected) {
	let args

	prepare(input)
	proxyquire('../cli.js', {
		'.': (...a) => {
			args = a
			return { catch() {} }
		}
	})
	t.deepEqual(args, argsExpected)

	prepare(input, true)
	proxyquire('../cli.js', {
		'.': {
			watch: (...a) => {
				args = a
				return { on() {} }
			}
		}
	})
	t.deepEqual(args, argsExpected)
}

function prepare(input, watch) {
	process.argv = ['npx', 'tsconfig.js']

	if (!watch) process.argv.push('--no-watch')

	if (input) process.argv.push(...input.split(' '))
}

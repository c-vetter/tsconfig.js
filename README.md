# tsconfig.js
Enables using `tsconfig.js` files instead of `tsconfig.json` files with all the benefits that brings.

> **NOTE:**
> Under the hood, this uses `chokidar`.
> Unfortunately, that results in directories starting with a dot `.` not being captured.
> There is [a ticket with chokidar concerning this issue](https://github.com/paulmillr/chokidar/issues/870).


+ [What it is](#what-it-is)
	+ [Why it exists](#why-it-exists)
	+ [What it does](#what-it-does)
	+ [What it does not](#what-it-does-not)
	+ [When to use](#when-to-use)
	+ [When not to use](#when-not-to-use)
+ [How to use it](#how-to-use-it)
	+ [node API](#node-api)
	+ [CLI](#cli)


----


# What it is
+ [Why it exists](#why-it-exists)
+ [What it does](#what-it-does)
+ [What it does not](#what-it-does-not)
+ [When to use](#when-to-use)
+ [When not to use](#when-not-to-use)


## Why it exists
Using JSON files for configuration has long been an accepted standard and there's nothing wrong with that for simple cases.
However, there are cases when more dynamic configuration files are called for.

That is why `eslint` and others enable the use of different configuration inputs, namely `JS` files alongside `JSON` files.

The TypeScript team, on the other hand, has declined to implement that option for technical reasons.

See the [Design Meeting Notes, 9/28/2018](https://github.com/microsoft/TypeScript/issues/27486).
Quote:
> + What about tsconfig.js?
>   + Nooooooooooooooooooooooooooooo

Some people are still interested in this feature, and I tried to get as close as possible without changing TypeScript itself.
This package is the result.


## What it does
`tsconfig.js` turns JS-based configuration files into their JSON equivalents.
That allows TypeScript to stick to its intended JSON format while enabling users to put their configuration in JS files.

This package offers a recommended watch mode for close-to-seemless operation, as well as a single-run mode so you can trigger re-builds as you see fit.

In order to be as seemless as possible, the `tsconfig.js` watcher builds a dependency map of your config files and rebuilds the targeted config files as needed.


## What it does not
`tsconfig.js` does not:
+ patch TypeScript
+ run on its own
+ support dependencies that use any mechanism other than `require('dependency')`
+ resolve `extends` in dependencies


## When to use
`tsconfig.js` is for you if you want to write configuration as JS files.

This requires that ever member of your team be aware that your `tsconfig.js` files are where changes need to be made, not `tsconfig.json`.

You also need to ensure one of these:
+ The watcher runs concurrently with your other build watchers (recommended for development)
+ The single-run is executed before your build tools relying on `tsconfig.json` (recommended for deployment)


## When not to use
If you cannot ensure every developer runs this, you can commit the built JSON files to source control.

If that is unreliable as well, you may be stuck with using JSON files until the TypeScript team finds a way to implement this on their end.


# How to use it
+ [node API](#node-api)
+ [CLI](#cli)


## node API
You can import either `tsconfig.js` or `tsconfig.js/watch`, depending on how you will use it.

Both take the same two options:
+ `root`: a directory path at which to start looking for `tsconfig.js` files
+ `ignore`: an array of paths to ignore

`tsconfig.js` returns a `Promise` that resolves when all `tsconfig.js` have been converted.
`tsconfig.js/watch` returns an `EventEmitter` that you can call `close` on to stop watching.

And that is it.


### Examples
#### The simplest form
```js
const tsconfigJs = require('tsconfig.js')
tsconfigJs()
```
This reads any `tsconfig.js` files found in the current working directory and its sub-directories, then writes the equivalent `tsconfig.json` files.


#### The most complex case
```js
const tsconfigJs = require('tsconfig.js')

tsconfigJs('src', [
	'src/legacy',
	'src/tsconfig.js', // only a dependency
])
```

This reads any `tsconfig.js` files found in `./src/` and its sub-directories, then writes the equivalent `tsconfig.json` files.
It ignores the specific file `src/tsconfig.js` as well as any `tsconfig.js` files within `src/legacy`.


## CLI
```bash
npx tsconfig.js [--no-watch] [--root src] [src/ignored-file/tsconfig.js].. [src/ignored-directory/]..
```

By default, the watcher is used, but setting `--no-watch` has `tsconfig.js` run only once.

The `--root` argument sets the root directory.

The other arguments are passed to the underlying node API as an array, signifying the ignore-paths.

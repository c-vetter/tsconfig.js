# tsconfig.js
Enables using `tsconfig.js` files instead of `tsconfig.json` files with all the benefits that brings.
Starting with v2.0.0, you can use transpilable source types like TypeScript.


+ [What it is](#what-it-is)
	+ [Why it exists](#why-it-exists)
	+ [What it does](#what-it-does)
	+ [What it does not](#what-it-does-not)
	+ [When to use](#when-to-use)
	+ [When not to use](#when-not-to-use)
+ [How to use it](#how-to-use-it)
	+ [node API](#node-api)
	+ [CLI](#cli)
+ [Changelog](#changelog)


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

Starting with v2.0.0, you can use transpilable source types like TypeScript. This is based on [interpret][]. Therefore, you can use the same types as for [webpack](https://webpack.js.org/configuration/configuration-languages/). This is opt-in via the `extensions` configuration. The rest of this document will talk of `tsconfig.js` files, but everything applies equally to `tsconfig.ts` files and the like.


## What it does not
`tsconfig.js` does not:
+ patch TypeScript
+ run on its own
+ support dependencies that use any mechanism other than `require('dependency')`
+ resolve `extends` in dependencies


## When to use
`tsconfig.js` is for you if you want to write configuration as JS files.

This requires that every member of your team be aware that your `tsconfig.js` files are where changes need to be made, not `tsconfig.json`.

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
You can import either `tsconfig.js/once` or `tsconfig.js/watch`, depending on how you will use it.

Both take an object of options as the only argument, with these fields:
+ `root`: a directory path at which to start looking for `tsconfig.js` files, will be resolved, defaults to '.'
+ `ignore`: an array of paths to ignore
+ `addComments`: each `tsconfig.json` should include a comment indicating the source `tsconfig.js` file. This determines if and what to put in there. Requires [TypeScript v1.8+](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-1-8.html#allow-comments-in-tsconfigjson)
	+ `"info"` (default): warn against editing the file, indicate the source file, and link to documentation
	+ `"minimal"`: indicate the source file
	+ `"none"`: add no comments
+ `extendsStrategy`: a string determining the strategy to use for the `extends` field:
	+ `"drop-relative"` (default): removes all relative paths. Relative paths from imported configs cannot work, so they should be dropped
	+ `"drop-any"`: If you don't care about extending at all, you can just drop this altogether
	+ `"ignore"`: do nothing
+ `extensions`: an array of extensions to process, defaults to `['.js']`
	+ requires `interpret` (see optional dependencies)

`tsconfig.js/once` returns a `Promise` that resolves when all `tsconfig.js` files have been converted.
`tsconfig.js/watch` returns an `EventEmitter` that you can call `close` on to stop watching.

`require('tsconfig.js')` returns an object with the keys `once` and `watch`. Those delegate to the files above.

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

tsconfigJs({
	root: 'src',
	addComments: 'none',
	extends: 'drop-any',
	extensions: [
		'.ts',
		'.toml',
	],
	ignore: [
		'src/legacy',
		'src/**/tsconfig.toml', // only a dependency
	],
})
```

This reads any `tsconfig.ts` files found in `./src/` and its sub-directories, then writes the equivalent `tsconfig.json` files.

It ignores `tsconfig.toml` files as well as any `tsconfig.*` files within `src/legacy`. By including `'.toml'` in the extensions those files are made available to node's `require`.

Also, the `extends` field in the resulting `tsconfig.json` is always dropped.

Finally, generated `tsconfig.json` files will not include comments, e.g. to support an old version of TypeScript.


## CLI
```bash
npx tsconfig.js [--once] [--root=src] [--add-comments=strategy] [--extends=strategy] [--extensions=ext,ext..] [-- [src/ignored-file/tsconfig.js].. [src/ignored-directory/]..]
```

By default, the watcher is used, but setting `--once` has `tsconfig.js` run only once.

The `--add-comments` argument sets the strategy for adding comments, valid values: `drop-any`, `drop-relative`, `ignore`

The `--root` argument sets the root directory.

The `--extends-strategy` argument sets the strategy for dealing with `extends`, valid values: `drop-any`, `drop-relative`, `ignore`

The `--extensions` argument takes the comma-separated list of extensions to look for. Remember to include `.js` if applicable. Requires [interpret][] (see optional dependencies).

The other arguments are passed to the underlying node API as an array, signifying the ignore-paths.


# Changelog

## [2.0.0]
+	custom extensions beyond `.js`
+	source comments
+	improved dependency acquisition
+	`--once` instead of `--no-watch`

## [1.1.0]
+	node API switched to options object, positional parameters deprecated
+	new `extends` option

## [1.0.0]
+	builds `tsconfig.json` from `tsconfig.js`
+	walks down filesystem to find all `tsconfig.js` files in given scope
+	watches for changes, including `require`d files




[interpret]: https://www.npmjs.com/package/interpret

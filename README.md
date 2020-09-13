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
	+ [transpilable sources][]
	+ [logging][]
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

This package offers a recommended watch mode for close-to-seamless operation, as well as a single-run mode so you can trigger re-builds as you see fit.

In order to be as seamless as possible, the `tsconfig.js` watcher builds a dependency map of your config files and rebuilds the targeted config files as needed.

Starting with v2.0.0, you can use transpilable source types like TypeScript. See [transpilable sources][] for details.


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
+ [transpilable sources][]
+ [logging][]


## node API
You can import either `tsconfig.js/once` or `tsconfig.js/watch`, depending on how you will use it. They are aliased as members of `tsconfig.js`, so you can do `require('tsconfig.js').once` or `require('tsconfig.js').watch`, respectively.

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
	+ see [transpilable sources][]
+ `logLevel`, `logFile`, `logToConsole`, `logger`: see [logging][]

`tsconfig.js/once` returns a `Promise` that resolves when all `tsconfig.js` files have been converted.
`tsconfig.js/watch` returns an `EventEmitter` that you can call `close` on to stop watching.

`require('tsconfig.js')` returns an object with the keys `once` and `watch`. Those delegate to the files above.

### Examples
#### The simplest form
```js
const tsconfigJs = require('tsconfig.js/once')
tsconfigJs()
```
This reads any `tsconfig.js` files found in the current working directory and its sub-directories, then writes the equivalent `tsconfig.json` files.


#### The most complex case
```js
const tsconfigJs = require('tsconfig.js/watch')

const tsconfigWatcher = tsconfigJs({
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
	logLevel: 'debug',
	logFile: 'tsconfig.js.log',
	logToConsole: false,
})

tsconfigWatcher.on('ready', handleReady) // wait for the watcher to become "ready", i.e. have completed the initial file crawl
tsconfigWatcher.on('error', handleError) // listen for an Error object

// ..

tsconfigWatcher.close() // you need to do this yourself
```

This reads any `tsconfig.ts` files found in `./src/` and its sub-directories, then writes the equivalent `tsconfig.json` files, and repeats that process (per file) for every change before `.close` is called.

It ignores `tsconfig.toml` files as well as any `tsconfig.*` files within `src/legacy`. By including `'.toml'` in the extensions those files are made available to node's `require`.

Also, the `extends` field in the resulting `tsconfig.json` is always dropped.

There will be no output to the console, log messages (up to debug level) will be written to `tsconfig.js.log`

Finally, generated `tsconfig.json` files will not include comments, e.g. to support an old version of TypeScript.


## CLI
```bash
npx tsconfig.js [--[no-]once] [--root=src] [--add-comments=strategy] [--extends=strategy] [--extensions=.ext,.ext,..] [--log-level=level] [--log-file=filepath] [--[no-]log-to-console] [-- [src/ignored-file/tsconfig.js].. [src/ignored-directory/]..]
```

By default, the watcher is used, but setting `--once` has `tsconfig.js` run only once. Can be reversed with `--no-once`.

The `--add-comments` argument sets the strategy for adding comments, valid values: `drop-any`, `drop-relative`, `ignore`

The `--root` argument sets the root directory.

The `--extends-strategy` argument sets the strategy for dealing with `extends`, valid values: `drop-any`, `drop-relative`, `ignore`

The `--extensions` argument takes the comma-separated list of extensions to look for. Remember to include `.js` if applicable. See [transpilable sources][].

Regarding `--log-level`, `--log-file`, `--log-to-console`, see [logging][].

The remaining arguments are passed to the underlying node API as an array, signifying the ignore-paths.


## Transpilable sources
Starting with v2.0.0, you can use transpilable source types like TypeScript. This is based on [interpret][]. Therefore, you can use the same types as for [webpack](https://webpack.js.org/configuration/configuration-languages/).

This is opt-in via the `extensions` configuration. If you include any extensions other than `.js`, this feature is activated. The rest of this document will generally talk of `tsconfig.js` files, but everything applies equally to `tsconfig.ts` files and the like.

When using this feature, you need [interpret][], as well as an appropriate loader. You can find all available extensions and their usable loaders at [interpret#extensions](https://www.npmjs.com/package/interpret#extensions).

While this package lists `interpret` as an optional dependency to make the relation clear, the same is not true for the loaders which are out of scope here. **It is your responsibility to install any and all required loaders**, including their peer dependencies (if any). For example, if you want to use this with TypeScript, include `typescript` and `ts-node` in your `package.json/dependencies`, and either `npm install` with optional dependencies or include `interpret` in your `package.json/dependencies`.


## Logging
Starting with v3.0.0, you can configure the level an type of logging. This is based on [winston][]. The default log levels of npm/winston are supported:
+ `error`
+ `warn`
+ `info` (default)
+ `http`
+ `verbose`
+ `debug`
+ `silly`

You can set the desired log level by setting `logLevel`/`--log-level` to the respective string.

By default, `tsconfig.js` will log using the [Console Transport](https://github.com/winstonjs/winston/blob/master/docs/transports.md#console-transport). You can deactivate that by setting `logToConsole` to false or passing `--no-log-to-console` (reverse with `--log-to-console`).

`tsconfig.js` can log to a file using the [File Transport](https://github.com/winstonjs/winston/blob/master/docs/transports.md#file-transport) with the [logstash format](https://github.com/winstonjs/logform#logstash). To enable that, pass the filepath to `logFile`/`--log-file`.

When using the node API, you can pass a winston-compatible logger to `tsconfig.js` via the `logger` option. That will replace the internal logger and enable you to use any log format and any transport you desire. That feature is not available through the CLI.


----


# Changelog

## [3.0.0]
+	configurable logging
+	`once` now rejects with all errors after completion, instead of on first error

## [2.0.1]
+	additional documentation

## [2.0.0]
+	custom extensions beyond `.js`
+	source comments
+	improved dependency acquisition
+	`--once` instead of `--no-watch`
+	removed legacy API

## [1.1.0]
+	node API switched to options object, positional parameters deprecated
+	new `extends` option

## [1.0.0]
+	builds `tsconfig.json` from `tsconfig.js`
+	walks down filesystem to find all `tsconfig.js` files in given scope
+	watches for changes, including `require`d files




[interpret]: https://www.npmjs.com/package/interpret
[logging]: #logging
[transpilable sources]: #transpilable-sources
[winston]: https://www.npmjs.com/package/winston

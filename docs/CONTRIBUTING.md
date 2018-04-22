# Contributing to Sequence Diagram

Contributions are welcome!

If you find a bug or desire a new feature, feel free to report it in
the [GitHub issue tracker](https://github.com/davidje13/SequenceDiagram/issues),
or write the code yourself and make a pull request.

Pull requests are more likely to be accepted if the code you changed
is tested (write new tests for new features and bug fixes, and update
existing tests where necessary).

## Getting Started

To get started, you can clone this repository and run:

```shell
npm install;
npm start;
```

This will launch a server in the project directory. You can now open
several pages:

* [http://localhost:8080/](http://localhost:8080/):
  the main editor (uses minified sources, so you won't see your changes
  immediately)
* [http://localhost:8080/editor-dev.htm](http://localhost:8080/editor-dev.htm):
  the main editor, using non-minified sources (good for development)
* [http://localhost:8080/library.htm](http://localhost:8080/library.htm):
  the library sample page (uses minified sources)

**NOTE**: This project uses web modules, which are only supported by
recent browsers. In particular, note that FireFox 59 does not support
web modules unless a flag is set (FireFox 60 will support them fully).
The editor and library page do not require web modules, so should have
wider support.

To run the tests and linter, run the command:

```shell
npm test;
```

And to rebuild the minified sources, run:

```shell
npm run minify;
```

## Commands

The available commands are:

* `npm start`: runs a webserver on
  [localhost:8080](http://localhost:8080)
* `npm test`: runs the `unit-test`, `web-test` and `lint` commands
* `npm run unit-test`: runs non-browser-based unit tests in NodeJS
* `npm run web-test`: runs browser-based unit tests via Karma
  (currently only Chrome is used)
* `npm run lint`: runs the linter against all source and test files
* `npm run minify`: runs the `minify-lib` and `minify-web` commands
* `npm run minify-lib`: minifies the library code in `/lib`
* `npm run minify-web`: minifies the web code in `/weblib`

## Project Structure

You will find most of the interesting code in `/scripts/sequence/*`.

The high-level structure is:

* `SequenceDiagram` (a wrapper class providing an API)
  * `Parser` (converts source code into a formal structure)
    * `Tokeniser` (converts source code into tokens for the `Parser`)
  * `Generator` (converts the formal structure provided by the `Parser`
    into a sort of abstract syntax tree)
  * `Renderer` (converts the AST provided by the `Generator` into SVG
    inside the DOM)
    * `components/*` (registered with the `Renderer` to provide layout
      capability for specific components)
    * `themes/*` (registered with the `Renderer` to provide rendering
      capability through a mix of methods and configurable options)
  * `Exporter` (provides methods for exporting rendered diagrams as
    SVG or PNG files)

Useful helpers can also be found in `/scripts/core/*` and
`/scripts/svg/*`.

The live editor (index.htm & editor-dev.htm) uses the source in
`/web/editor.mjs` and `/web/interface/*`. Other pages use sources in
the root of `/web` as their entry-points.

## Testing

The testing library used here is [Jasmine](https://jasmine.github.io/).

All test files follow the naming convention of `<filename>_spec.mjs`
(commandline and browser), `_webspec.mjs` (browser-only), or
`_nodespec.mjs` (commandline-only). Linting automatically applies to
all files with a `.js` or `.mjs` extension.

You can run just the browser tests by running `npm run web-test`.

The current state of automated testing is:

* Utilities have a good level of testing
* `Parser` and `Generator` stages have a good level of testing
* Rendering methods (SVG generation) have a minimal level of testing;
  there are some high-level tests in
  `/scripts/sequence/SequenceDiagram_spec.mjs`, and a series of image
  comparison tests in `/scripts/sequence/Readme_spec.mjs` (testing that
  the readme screenshots roughly match the current behaviour). Finally
  `/scripts/sequence/SequenceDiagram_visual_spec.mjs` uses coarse image
  comparison to test components and interactions using baseline SVGs
  from `spec/images`.
* The editor has a minimal level of testing.

If you suspect a failing test is not related to your changes, try
[stashing](https://git-scm.com/docs/git-stash) your changes and running
the tests again. If it still reports a failure in a supported browser,
please report it in the issue tracker.

### Browser Support

This project officially supports the latest versions of Google Chrome,
Mozilla FireFox and Apple Safari (both desktop and iOS). Older
browsers, including Internet Explorer, are not supported. Microsoft
Edge might work, but this is not actively tested.

In a few places, specific browser workarounds are included, but these
are avoided wherever possible.

ECMAScript 6 language features are assumed to be available, and no
polyfils are included.

## Finalising a Commit

### Testing & Linting

Ensure that all unit tests are passing and files pass linting. This can
be done by running `npm test` in a command window. At a minimum, you
should ensure that tests are passing in Google Chrome, but testing in
other supported browsers is even better.

### Minifying

When you have finished your changes, it is good to regenerate the
minified library (this is preferred but not required):

```shell
npm run minify;
```

This will update the files in `/lib` and `/weblib`. The minified code
is a self-contained copy of the `/scripts/sequence/SequenceDiagram.mjs`
script, with some boiler-plate added to allow loading into a page in a
variety of ways.

### Screenshots

If your changes affect any of the screenshots in README.md, you can
use `npm run generate-screenshots`, which will automatically extract
all sample blocks from the README.md file and update their
corresponding images in the `screenshots/` directory.

Note: to use this command, you will need
[pngcrush](https://pmt.sourceforge.io/pngcrush/) installed on your
system. On MacOS you can install it with `brew install pngcrush`.

The samples in
[http://localhost:8080/library.htm](http://localhost:8080/library.htm)
are dynamically rendered when the user opens the page, so you do not
need to update those.

## Thank You

Thank you for helping to make this project better!

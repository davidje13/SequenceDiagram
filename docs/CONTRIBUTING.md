# Contributing to Sequence Diagram

Contributions are welcome!

If you find a bug or desire a new feature, feel free to report it in
the [GitHub issue tracker](https://github.com/davidje13/SequenceDiagram/issues),
or write the code yourself and make a pull request.

Pull requests are more likely to be accepted if the code you changed
is tested (write new tests for new features and bug fixes, and update
existing tests where necessary).

## Getting Started

To get started, you can clone this repository and simply open
`index.htm` or `library.htm` in your browser. You do not need any build
tooling, and you do not need to run a local server. You can also run
the unit tests (but not the linter) by opening `test.htm`.

In order to run the linter, you will need to serve the files using a
local server. When opened in this way, `test.htm` will run both the
unit tests and the linter. If you have `node` & `npm` installed, this
is easy to do:

```shell
npm install;
npm run serve;
```

The tests and linter will now be available at
[http://localhost:8080/test.htm](http://localhost:8080/test.htm).

When running using a local server, you can also use the
[editor-dev](http://localhost:8080/editor-dev.htm) resource to test
changes you make to the code. This page uses the non-minified source,
meaning your changes will be available immediately (unlike index.htm
which requires you to run the minifier first).

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
`/scripts/editor.js` and `/scripts/interface/*`. Other pages use
sources in the root of `/scripts` as their entry-points.

## Testing

The testing library used here is [Jasmine](https://jasmine.github.io/).

All test files follow the naming convention of `<filename>_spec.js`,
and must be listed in `/scripts/spec.js`. Linting automatically applies
to all files which are loaded during testing.

You can run the tests by opening `test.htm` in a browser.

The current state of automated testing is:

* Utilities have a good level of testing
* `Parser` and `Generator` stages have a good level of testing
* Rendering methods (SVG generation) have a poor level of testing;
  there are some high-level tests in
  `/scripts/sequence/SequenceDiagram_spec.js` but many component types
  are not tested at all during rendering beyond ensuring that they can
  be used without throwing exceptions. The same applies to themes.
* The editor has a minimal level of testing.

If you suspect a failing test is not related to your changes, you can
check against the current status of the tests on the master branch:
[test.htm](https://davidje13.github.io/SequenceDiagram/test.htm). If
these report a failure in a supported browser, please report it in the
issue tracker.

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
be done by opening `test.htm` in a browser. At a minimum, you should
ensure that tests are passing in Google Chrome, but testing in other
supported browsers is even better.

Due to the limited testing of SVG rendering, it is also a good idea to
open [readme-images](http://localhost:8080/readme-images.htm) and scan
through to ensure the new rendering of each example is OK. It will show
the new rendering as an SVG on the left, as a PNG in the middle, and
the old rendering (from `/screenshots`) on the right.

### Minifying

When you have finished your changes, it is good to regenerate the
minified library (this is preferred but not required):

```shell
npm run minify
```

This will update the files in `/lib`. The minified code is a
self-contained copy of the `/scripts/sequence/SequenceDiagram.js`
script, with some boiler-plate added to allow loading into a page in a
variety of ways.

### Screenshots

If your changes affect any of the screenshots in README.md, you can
use [readme-images](http://localhost:8080/readme-images.htm), which
will automatically extract all sample blocks from the README.md file
and generate downloadable PNGs for them with the correct filenames.
These should replace the files in the `screenshots/` directory.

(I like to aditionally run the screenshots through
[pngcrush](https://pmt.sourceforge.io/pngcrush/) using the flags
`pngcrush -rem allb -brute -l 9 "<filename>"` to reduce the sizes by
about half).

The samples in
[http://localhost:8080/library.htm](http://localhost:8080/library.htm)
are dynamically rendered when the user opens the page, so you do not
need to update those.

## Thank You

Thank you for helping to make this project better!

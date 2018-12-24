const manual = Boolean(process.env.MANUAL);

const SUPPORTED_BROWSERS = [
	'chrome',
	'firefox',
//	'safari', // https://github.com/karma-runner/karma-safari-launcher/issues/29
];

if(manual) {
	SUPPORTED_BROWSERS.length = 0;
}

function is_supported_browser(name) {
	const lcName = name.toLowerCase();
	for(const fragment of SUPPORTED_BROWSERS) {
		if(lcName.includes(fragment)) {
			return true;
		}
	}
	return false;
}

module.exports = (config) => {
	config.set({
		basePath: '../..',

		// See https://github.com/karma-runner/karma/pull/2834
		customContextFile: 'spec/support/karma_context.html',

		detectBrowsers: {
			postDetection: (browsers) => browsers.filter(is_supported_browser),
			preferHeadless: true,
			usePhantomJS: false,
		},

		exclude: ['node_modules/**/*_spec.*', 'lib/**', 'web/lib/**'],
		files: [
			'node_modules/codemirror/lib/codemirror.js',
			{
				included: manual,
				pattern: 'spec/support/karma-hang.mjs',
				type: 'module',
			},
			{pattern: 'spec/helpers/**/*.mjs', type: 'module'},
			{pattern: '**/*_spec.mjs', type: 'module'},
			{pattern: '**/*_webspec.mjs', type: 'module'},
			{included: false, pattern: 'screenshots/**/*'},
			{included: false, pattern: 'scripts/**/*'},
			{included: false, pattern: 'spec/**/*'},
			{included: false, pattern: 'web/scripts/**/*'},
			{included: false, pattern: 'bin/**/*'},
			{included: false, pattern: 'README.md'},
		],
		frameworks: ['detectBrowsers', 'jasmine'],
		plugins: [
			'karma-jasmine',
			'karma-detect-browsers',
			'karma-chrome-launcher',
			'karma-firefox-launcher',
			'karma-safari-launcher',
		],
		proxies: {
			// Add some proxies so that fetch() calls work without modification
			'/README.md': '/base/README.md',
			'/screenshots/': '/base/screenshots/',
			'/spec/': '/base/spec/',
		},
		reportSlowerThan: 500,
		reporters: ['progress'],
	});
};

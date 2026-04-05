module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular/devkit/build-angular'],
    plugins: [
      require('@angular-devkit/build-angular/plugins/karma'),
      require('karma-chrome-launcher')
    ],
    client: {
      jasmine: {},
      clearContext: false
    },
    browsers: ['ChromeHeadless'],
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu']
      }
    },
    restartOnFileChange: true
  });
};

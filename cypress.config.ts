import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: process.env['CYPRESS_baseUrl'] || 'http://localhost:4200',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    viewportWidth: 1920,
    viewportHeight: 1080,
    video: true,
    videosFolder: 'cypress/videos',
    screenshotsFolder: 'cypress/screenshots',
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 20000,
    requestTimeout: 20000,
    responseTimeout: 20000,
    pageLoadTimeout: 60000,
    chromeWebSecurity: false,
    experimentalModifyObstructiveThirdPartyCode: true,
    retries: {
      runMode: 2,
      openMode: 0,
    },
    env: {
      apiUrl: process.env['CYPRESS_apiUrl'] || process.env['API_URL'] || 'http://localhost:3000/api',
    },
    setupNodeEvents(_on, config) {
      // Handle environment variables from CI/CD
      config.env['apiUrl'] = process.env['CYPRESS_apiUrl'] || config.env['apiUrl'];
      return config;
    },
  },
  component: {
    devServer: {
      framework: 'angular',
      bundler: 'webpack',
    },
    specPattern: '**/*.cy.ts',
  },
});

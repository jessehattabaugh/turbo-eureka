# Turbo Eureka

An interactive physics simulation playground built with Matter.js and Web Components.

## Table of Contents

- [Overview](#overview)
- [Development](#development)
- [Testing](#testing)
  - [Test Overview](#test-overview)
  - [Installing Test Dependencies](#installing-test-dependencies)
  - [Running Tests](#running-tests)
  - [Visual Regression Testing](#visual-regression-testing)
  - [Test Fixtures](#test-fixtures)
  - [Maintaining Tests](#maintaining-tests)
- [Deployment](#deployment)

## Overview

Turbo Eureka is an interactive physics playground that allows users to create, manipulate, and destroy physics objects in a web browser. It uses Matter.js for physics simulation and custom Web Components for the UI.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run serve:parcel

# Kill development server if it's stuck
npm run kill
```

## Testing

### Test Overview

The project uses Playwright for end-to-end testing and visual regression testing. The test suite includes:

1. **End-to-end tests**: Verify that the application loads successfully and the Matter.js canvas renders correctly
2. **Component tests**: Test individual web components in isolation using test fixtures
3. **Visual regression tests**: Compare screenshots to detect unintended visual changes

### Installing Test Dependencies

To install the necessary test dependencies:

```bash
# Install NPM dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Running Tests

The following test commands are available:

```bash
# Run all tests in headless mode (default)
npm test

# Run tests with browsers visible
npm run test:headed

# Run tests with Playwright's interactive debugging UI
npm run test:debug

# Open the Playwright UI for test development and debugging
npm run test:ui
```

### Visual Regression Testing

The tests use visual regression testing to detect unintended visual changes. How it works:

1. The first time a test runs, it creates baseline screenshots
2. Subsequent test runs compare new screenshots against these baselines
3. If differences are detected, the test will fail and generate diff images

Visual regression test artifacts are stored in:
- `tests/screenshots/baseline`: Baseline screenshots (reference)
- `tests/screenshots/actual`: Actual screenshots from the latest test run
- `tests/screenshots/diff`: Difference images showing what changed

To update baselines after intentional UI changes:

1. Run the tests to generate new screenshots
2. Review the changes in the diff images
3. If the changes are expected, update the baselines:

```bash
# Example: Manually update a specific baseline
node -e "require('./tests/utils/visual-regression').updateBaseline('main-page')"
```

### Test Fixtures

Component tests use HTML fixtures to test components in isolation:

- `tests/fixtures/tool-dock.html`: Tests the ToolDock component
- `tests/fixtures/physics-engine.html`: Tests the PhysicsEngine component

To run the fixture server manually:

```bash
npm run serve:test
```

Then visit `http://localhost:3001/[fixture-name].html` in your browser.

### Maintaining Tests

#### Adding a New Test

1. Create a new test file in `tests/e2e/` or `tests/modules/`
2. Import the visual regression helper:

```javascript
import { takeScreenshotAndCompare } from '../utils/visual-regression.js';
```

3. Use Playwright's testing API along with the visual regression helper:

```javascript
test('my test description', async ({ page }) => {
  await page.goto('/');

  // Test actions...

  // Take and compare screenshots
  await takeScreenshotAndCompare(page, 'my-test-screenshot');
});
```

#### Adding a New Fixture

To test a component in isolation:

1. Create a new HTML file in `tests/fixtures/`
2. Import the component and its dependencies
3. Create the necessary DOM structure
4. Add any test helpers or controls

#### Common Test Maintenance Tasks

- **Update baselines**: After intentional UI changes, update the baseline screenshots
- **Adjust thresholds**: If visual differences are acceptable, adjust the threshold in the visual regression helper
- **Add test coverage**: Add new tests when adding new features

## Deployment

```bash
# Build and deploy to production
npm run deploy:prod

# Build and deploy to staging
npm run deploy:staging
```

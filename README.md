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
4. **Integration tests**: Test the interaction between components and the physics engine

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
# Run all tests against the staging environment (default)
npm test

# Run tests against the local development server
npm run test:local

# Watch for changes and automatically run tests against local server
npm run test:local:watch

# Run tests with browsers visible
npm run test:headed          # Against staging
npm run test:local:headed    # Against local server

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

- `tests/fixtures/index-element.html`: Tests the IndexElement component
- `tests/fixtures/physics-engine.html`: Tests the PhysicsEngine component
- `tests/fixtures/integration-test.html`: Tests the full component integration

To run the fixture server manually:

```bash
npm run serve:test
```

Then visit `http://localhost:3001/[fixture-name].html` in your browser.

### Maintaining Tests

#### Test Organization

Our tests are organized by type and purpose:

- `tests/e2e/`: End-to-end tests for the full application
  - `page-load.spec.js`: Basic page loading tests
  - `user-interactions.spec.js`: Tests for user interactions with the application

- `tests/modules/`: Unit tests for individual components
  - `index-element.spec.js`: Tests for the IndexElement component
  - `physics-engine.spec.js`: Tests for the PhysicsEngine component

- `tests/integration/`: Integration tests for component combinations
  - `tool-interactions.spec.js`: Tests how tools interact with the physics engine

- `tests/utils/`: Test utilities
  - `visual-regression.js`: Visual regression testing helpers

#### Adding New Tests

1. **For End-to-End Tests**: Add to the appropriate file in `tests/e2e/`
2. **For Component Tests**: Add to the appropriate file in `tests/modules/`
3. **For Integration Tests**: Add to the appropriate file in `tests/integration/`

#### Test Patterns

When writing tests, follow these patterns:

1. **Isolation**: Component tests should test components in isolation
2. **Integration**: Integration tests should test how components work together
3. **User perspective**: E2E tests should simulate real user interactions
4. **Visual verification**: Use visual regression for UI changes

## Deployment

The project can be deployed to both staging and production environments using these commands:

```bash
# Build and deploy to staging environment
npm run deploy:staging

# Build and deploy to production
npm run deploy:prod

# Build, deploy to staging, and run tests
npm run deploy-test:staging

# Safe deployment: Deploy to staging, run tests, and if successful, deploy to production
npm run deploy-safe:prod
```

These automated deployment scripts help ensure that code is properly tested before reaching production. The process works as follows:

1. **Staging Deployment**: Code is built and deployed to the staging environment
2. **Automated Testing**: Comprehensive tests are run against the staging deployment
3. **Production Deployment**: If tests pass, code is built and deployed to production

You can view the live application at:
- Production: [https://turbo-eureka.surge.sh](https://turbo-eureka.surge.sh)
- Staging: [https://staging-turbo-eureka.surge.sh](https://staging-turbo-eureka.surge.sh)

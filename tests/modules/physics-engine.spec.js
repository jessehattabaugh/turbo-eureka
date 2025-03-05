import { test, expect } from '@playwright/test';
import { takeScreenshotAndCompare } from '../utils/visual-regression.js';

// Test server configuration for fixture pages
const TEST_SERVER = 'http://localhost:3001';

test.describe('PhysicsEngine Tests', () => {
	let fixtureServer;

	test.beforeAll(async () => {
		// Start the test fixture server
		const { spawn } = await import('child_process');
		fixtureServer = spawn('npm', ['run', 'serve:test'], {
			stdio: 'inherit',
			shell: true,
		});

		// Wait for server to start
		await new Promise((resolve) => {
			setTimeout(resolve, 2000);
		});
	});

	test.afterAll(async () => {
		// Stop the test fixture server
		if (fixtureServer) {
			fixtureServer.kill();
		}
	});

	test('should initialize physics engine and create bodies', async ({ page }) => {
		// Navigate to the physics-engine test fixture
		await page.goto(`${TEST_SERVER}/physics-engine.html`);

		// Wait for the physics canvas to be rendered
		await page.waitForSelector('#physics-canvas');

		// Take initial screenshot
		await takeScreenshotAndCompare(page, 'physics-engine-initial');

		// Check if the physics engine initialized properly
		const engineInitialized = await page.evaluate(() => {
			return window.testPhysics && window.testPhysics.engine && window.testPhysics.render;
		});

		expect(engineInitialized).toBeTruthy();

		// Spawn a body and check if it was added
		await page
			.evaluate(() => {
				// Get initial body count
				const initialCount = window.testPhysics.bodies.dynamic.length;

				// Spawn an object
				window.testPhysics.spawnObjectAtPoint({ x: 100, y: 100 });

				// Return results
				return {
					initialCount,
					newCount: window.testPhysics.bodies.dynamic.length,
				};
			})
			.then((result) => {
				expect(result.newCount).toBeGreaterThan(result.initialCount);
			});

		// Wait for physics to stabilize
		await page.waitForTimeout(500);

		// Take screenshot after adding bodies
		await takeScreenshotAndCompare(page, 'physics-engine-with-body');

		// Test object removal
		const removalSuccess = await page.evaluate(() => {
			if (window.testPhysics.bodies.dynamic.length === 0) {
				return false;
			}

			const [bodyToRemove] = window.testPhysics.bodies.dynamic;
			window.testPhysics.destroyBody(bodyToRemove);

			return true;
		});

		expect(removalSuccess).toBeTruthy();

		// Wait for physics to update
		await page.waitForTimeout(500);

		// Take screenshot after removing a body
		await takeScreenshotAndCompare(page, 'physics-engine-after-removal');
	});
});

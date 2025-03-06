import { test, expect } from '@playwright/test';
import { takeScreenshotAndCompare } from '../utils/visual-regression.js';

// Helper function to get the number of bodies from the stats display
async function getBodiesCount(page) {
	const statsText = await page.locator('te-index').evaluateHandle((el) => {
		return el.shadowRoot.querySelector('.stats-display').textContent;
	});

	const bodiesCount = await page.evaluate((stats) => {
		const match = stats.match(/Bodies: (\d+)/);
		return match ? parseInt(match[1], 10) : 0;
	}, statsText);

	return bodiesCount;
}

// Helper function to change the tool
async function selectTool(page, toolName) {
	await page.locator('te-index').evaluate((el, tool) => {
		const toolbar = el.shadowRoot.querySelector('.toolbar');
		const button = toolbar.querySelector(`button[data-tool="${tool}"]`);
		if (button) {
			button.click();
		}
	}, toolName);
}

test.describe('User Interaction Tests', () => {
	test.beforeEach(async ({ page }) => {
		// Use baseURL from playwright config which will be either staging or local
		await page.goto('/');
		await page.waitForSelector('te-index');
	});

	test('should spawn object on click with spawn tool', async ({ page }) => {
		// Select spawn tool
		await selectTool(page, 'spawn');

		// Get initial count
		const initialCount = await getBodiesCount(page);

		// Click to spawn object
		await page.mouse.click(100, 100);

		// Wait for physics to update
		await page.waitForTimeout(100);

		// Check if body count increased
		const newCount = await getBodiesCount(page);
		expect(newCount).toBeGreaterThan(initialCount);

		// Take screenshot
		await takeScreenshotAndCompare(page, 'spawn-tool-test');
	});

	test('should drag existing object', async ({ page }) => {
		// First spawn an object
		await selectTool(page, 'spawn');
		await page.mouse.click(200, 200);
		await page.waitForTimeout(100);

		// Get object position
		const initialPosition = await page.locator('te-index').evaluate((el) => {
			const {physics} = el;
			if (physics.bodies.dynamic.length > 0) {
				return {
					x: physics.bodies.dynamic[0].position.x,
					y: physics.bodies.dynamic[0].position.y
				};
			}
			return null;
		});

		expect(initialPosition).not.toBeNull();

		// Select drag tool
		await selectTool(page, 'drag');

		// Perform drag on the object
		await page.mouse.move(initialPosition.x, initialPosition.y);
		await page.mouse.down();
		await page.mouse.move(initialPosition.x + 50, initialPosition.y - 50);
		await page.waitForTimeout(100);

		// Take screenshot during drag
		await takeScreenshotAndCompare(page, 'drag-tool-test');

		// Release mouse
		await page.mouse.up();

		// Get new position
		const newPosition = await page.locator('te-index').evaluate((el) => {
			const {physics} = el;
			if (physics.bodies.dynamic.length > 0) {
				return {
					x: physics.bodies.dynamic[0].position.x,
					y: physics.bodies.dynamic[0].position.y
				};
			}
			return null;
		});

		// Verify position changed
		expect(newPosition.x).not.toEqual(initialPosition.x);
		expect(newPosition.y).not.toEqual(initialPosition.y);
	});

	test('should draw shapes with draw tool', async ({ page }) => {
		// Get initial count
		const initialCount = await getBodiesCount(page);

		// Select draw tool
		await selectTool(page, 'draw');

		// Draw a shape
		await page.mouse.move(150, 150);
		await page.mouse.down();
		await page.mouse.move(200, 200);
		await page.waitForTimeout(100);

		// Take screenshot with preview
		await takeScreenshotAndCompare(page, 'draw-tool-preview');

		// Complete the shape
		await page.mouse.up();
		await page.waitForTimeout(100);

		// Check if a new body was created
		const newCount = await getBodiesCount(page);
		expect(newCount).toBeGreaterThan(initialCount);

		// Take screenshot of final shape
		await takeScreenshotAndCompare(page, 'draw-tool-result');
	});

	test('should create explosion with explode tool', async ({ page }) => {
		// First create several objects
		await selectTool(page, 'spawn');
		const spawnPromises = [];
		for (let i = 0; i < 5; i++) {
			spawnPromises.push(page.mouse.click(150 + i * 20, 150));
			spawnPromises.push(page.waitForTimeout(100));
		}
		await Promise.all(spawnPromises);

		// Take screenshot before explosion
		await takeScreenshotAndCompare(page, 'before-explosion');

		// Select explode tool
		await selectTool(page, 'explode');

		// Click to create explosion
		await page.mouse.click(180, 150);

		// Wait for physics to apply the force
		await page.waitForTimeout(300);

		// Take screenshot after explosion
		await takeScreenshotAndCompare(page, 'after-explosion');
	});

	test('should erase objects with erase tool', async ({ page }) => {
		// First create an object
		await selectTool(page, 'spawn');
		await page.mouse.click(200, 200);
		await page.waitForTimeout(100);

		// Get count after spawn
		const countAfterSpawn = await getBodiesCount(page);
		expect(countAfterSpawn).toBeGreaterThan(0);

		// Select erase tool
		await selectTool(page, 'erase');

		// Erase the object (click at same position)
		await page.mouse.click(200, 200);
		await page.waitForTimeout(100);

		// Get count after erase
		const countAfterErase = await getBodiesCount(page);
		expect(countAfterErase).toBeLessThan(countAfterSpawn);

		// Take screenshot after erase
		await takeScreenshotAndCompare(page, 'erase-tool-test');
	});

	test('should change tools via toolbar', async ({ page }) => {
		// Check that all tools can be selected
		const tools = ['spawn', 'draw', 'drag', 'explode', 'erase'];
		await Promise.all(tools.map(async (tool) => {
			await selectTool(page, tool);

			// Verify the tool was selected
			const isSelected = await page.locator('te-index').evaluate((el, toolName) => {
				return el.currentTool === toolName;
			}, tool);

			expect(isSelected).toBeTruthy();
		}));

		// Take screenshot of toolbar with a specific tool selected
		await selectTool(page, 'explode');
		await takeScreenshotAndCompare(page, 'toolbar-tool-selection');
	});
});

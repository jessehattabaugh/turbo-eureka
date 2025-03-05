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

test.describe('Main Page Tests', () => {
	test('should load the page successfully and render Matter.js canvas', async ({ page }) => {
		// Navigate to the page
		const response = await page.goto('/');

		// Check if page loaded successfully
		expect(response.status()).toBe(200);

		// Wait for the physics canvas to be rendered
		// (we look for canvas element inside shadow DOM)
		await page.waitForSelector('te-index');

		// Verify the custom element exists
		const indexElement = await page.locator('te-index');
		await expect(indexElement).toBeVisible();

		// Access shadow DOM
		const canvasLocator = await page.locator('te-index').evaluateHandle((el) => {
			return el.shadowRoot.querySelector('#physics-canvas');
		});

		// Take a screenshot for visual regression testing
		await takeScreenshotAndCompare(page, 'main-page');

		// Verify canvas exists by checking properties only available on canvas elements
		const canvasExists = await page.evaluate((canvas) => {
			return canvas && typeof canvas.getContext === 'function' && canvas.tagName === 'CANVAS';
		}, canvasLocator);

		expect(canvasExists).toBeTruthy();

		// Check that the Matter.js engine is running by verifying bodies are created
		// (spawn an object and check if bodies count increases)
		const initialBodiesCount = await getBodiesCount(page);

		// Simulate a click to create a new body
		await page.mouse.click(100, 100);
		await page.waitForTimeout(500); // Wait for physics to update

		const newBodiesCount = await getBodiesCount(page);
		expect(newBodiesCount).toBeGreaterThan(initialBodiesCount);
	});
});





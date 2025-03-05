import { test, expect } from '@playwright/test';
import { takeScreenshotAndCompare } from '../utils/visual-regression.js';

// Test server configuration for fixture pages
const TEST_SERVER = 'http://localhost:3001';

test.describe('ToolDock Component Tests', () => {
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

	test('should render tool-dock component correctly', async ({ page }) => {
		// Navigate to the tool-dock test fixture
		await page.goto(`${TEST_SERVER}/tool-dock.html`);

		// Wait for the component to be rendered
		await page.waitForSelector('tool-dock');

		// Verify the component exists
		const toolDock = await page.locator('tool-dock');
		await expect(toolDock).toBeVisible();

		// Access shadow DOM
		const dockButtons = await page.locator('tool-dock').evaluateHandle((el) => {
			return el.shadowRoot.querySelectorAll('.tool-button');
		});

		// Verify dock has the expected number of buttons
		const buttonCount = await page.evaluate((buttons) => {return buttons.length}, dockButtons);
		expect(buttonCount).toBe(6); // We should have 6 tool buttons

		// Take screenshot for visual regression
		await takeScreenshotAndCompare(page, 'tool-dock-component');

		// Test tool selection by clicking
		await page.evaluate(() => {
			const toolDock = document.querySelector('tool-dock');
			const destroyButton = toolDock.shadowRoot.querySelector('[data-tool="destroy"]');
			destroyButton.click();
		});

		// Verify the active tool was changed
		const activeToolAfterClick = await page.evaluate(() => {
			const toolDock = document.querySelector('tool-dock');
			const activeButton = toolDock.shadowRoot.querySelector('.tool-button.active');
			return activeButton.getAttribute('data-tool');
		});

		expect(activeToolAfterClick).toBe('destroy');

		// Test tool selection via keyboard shortcut
		await page.keyboard.press('c');

		// Verify the active tool was changed via keyboard
		const activeToolAfterKeypress = await page.evaluate(() => {
			const toolDock = document.querySelector('tool-dock');
			const activeButton = toolDock.shadowRoot.querySelector('.tool-button.active');
			return activeButton.getAttribute('data-tool');
		});

		expect(activeToolAfterKeypress).toBe('circle');

		// Take another screenshot after interaction
		await takeScreenshotAndCompare(page, 'tool-dock-component-after-selection');
	});
});



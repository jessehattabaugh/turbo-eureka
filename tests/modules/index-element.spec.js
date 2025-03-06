import { test, expect } from '@playwright/test';
import { takeScreenshotAndCompare } from '../utils/visual-regression.js';

// Test server configuration for fixture pages
const TEST_SERVER = 'http://localhost:3001';

test.describe('IndexElement Tests', () => {
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

	test('should initialize with correct structure', async ({ page }) => {
		// Navigate to the index-element test fixture
		await page.goto(`${TEST_SERVER}/index-element.html`);

		// Check if the component rendered properly
		await page.waitForSelector('#test-index-element');

		// Verify shadow DOM structure
		const shadowElements = await page.evaluate(() => {
			const component = document.querySelector('#test-index-element');
			const shadow = component.shadowRoot;
			return {
				hasCanvas: !!shadow.querySelector('#physics-canvas'),
				hasPreviewCanvas: !!shadow.querySelector('#preview-canvas'),
				hasStatsDisplay: !!shadow.querySelector('.stats-display'),
				hasToolbar: !!shadow.querySelector('.toolbar'),
				toolCount: shadow.querySelectorAll('.tool-button').length,
			};
		});

		expect(shadowElements.hasCanvas).toBeTruthy();
		expect(shadowElements.hasPreviewCanvas).toBeTruthy();
		expect(shadowElements.hasStatsDisplay).toBeTruthy();
		expect(shadowElements.hasToolbar).toBeTruthy();
		expect(shadowElements.toolCount).toBe(5); // 5 tools

		// Take screenshot
		await takeScreenshotAndCompare(page, 'index-element-structure');
	});

	test('should change tools correctly', async ({ page }) => {
		await page.goto(`${TEST_SERVER}/index-element.html`);

		// Get initial tool
		const initialTool = await page.evaluate(() => {
			return document.querySelector('#test-index-element').currentTool;
		});

		// Change tool to draw
		await page.evaluate(() => {
			const component = document.querySelector('#test-index-element');
			component.handleToolChange('draw');
		});

		// Verify tool was changed
		const newTool = await page.evaluate(() => {
			return document.querySelector('#test-index-element').currentTool;
		});

		expect(newTool).toBe('draw');
		expect(newTool).not.toBe(initialTool);

		// Verify UI was updated
		const isDrawButtonActive = await page.evaluate(() => {
			const component = document.querySelector('#test-index-element');
			const button = component.shadowRoot.querySelector('button[data-tool="draw"]');
			return button.classList.contains('active');
		});

		expect(isDrawButtonActive).toBeTruthy();
	});

	test('should handle pointer events correctly', async ({ page }) => {
		await page.goto(`${TEST_SERVER}/index-element.html`);

		// Mock the handler functions to track calls
		await page.evaluate(() => {
			const component = document.querySelector('#test-index-element');

			// Create tracking for function calls
			window.handlerCalls = {
				pointerDown: 0,
				pointerMove: 0,
				pointerUp: 0,
			};

			// Override handler functions with tracking
			const originalPointerDown = component.handlePointerDown;
			component.handlePointerDown = function (e) {
				window.handlerCalls.pointerDown++;
				return originalPointerDown.call(this, e);
			};

			const originalPointerMove = component.handlePointerMove;
			component.handlePointerMove = function (e) {
				window.handlerCalls.pointerMove++;
				return originalPointerMove.call(this, e);
			};

			const originalPointerUp = component.handlePointerUp;
			component.handlePointerUp = function (e) {
				window.handlerCalls.pointerUp++;
				return originalPointerUp.call(this, e);
			};
		});

		// Get canvas position
		const canvasPos = await page.evaluate(() => {
			const component = document.querySelector('#test-index-element');
			const canvas = component.shadowRoot.querySelector('#physics-canvas');
			const rect = canvas.getBoundingClientRect();
			return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
		});

		// Simulate pointer events
		await page.mouse.move(canvasPos.x, canvasPos.y);
		await page.mouse.down();
		await page.mouse.move(canvasPos.x + 20, canvasPos.y + 20);
		await page.mouse.up();

		// Check if event handlers were called
		const handlerCalls = await page.evaluate(() => {
			return window.handlerCalls;
		});

		expect(handlerCalls.pointerDown).toBeGreaterThan(0);
		expect(handlerCalls.pointerMove).toBeGreaterThan(0);
		expect(handlerCalls.pointerUp).toBeGreaterThan(0);
	});

	test('should handle draw tool interactions correctly', async ({ page }) => {
		await page.goto(`${TEST_SERVER}/index-element.html`);

		// Switch to draw tool
		await page.evaluate(() => {
			const component = document.querySelector('#test-index-element');
			component.handleToolChange('draw');
		});

		// Mock the preview context for inspection
		await page.evaluate(() => {
			const component = document.querySelector('#test-index-element');

			// Track draw preview calls
			window.drawPreviewCalls = 0;

			// Override drawPreview method
			const originalDrawPreview = component.drawPreview;
			component.drawPreview = function (preview) {
				window.drawPreviewCalls++;
				window.lastPreview = preview;
				return originalDrawPreview.call(this, preview);
			};
		});

		// Get canvas position
		const canvasPos = await page.evaluate(() => {
			const component = document.querySelector('#test-index-element');
			const canvas = component.shadowRoot.querySelector('#physics-canvas');
			const rect = canvas.getBoundingClientRect();
			return { x: rect.x + rect.width / 3, y: rect.y + rect.height / 3 };
		});

		// Simulate drawing action
		await page.mouse.move(canvasPos.x, canvasPos.y);
		await page.mouse.down();
		await page.mouse.move(canvasPos.x + 50, canvasPos.y + 50);

		// Check that preview was drawn
		const previewCalls = await page.evaluate(() => {
			return window.drawPreviewCalls;
		});
		const lastPreview = await page.evaluate(() => {
			return window.lastPreview;
		});

		expect(previewCalls).toBeGreaterThan(0);
		expect(lastPreview).toBeTruthy();

		// Complete the drawing
		await page.mouse.up();

		// Verify drawing state was reset
		const isDrawing = await page.evaluate(() => {
			const component = document.querySelector('#test-index-element');
			return component.isDrawing;
		});

		expect(isDrawing).toBeFalsy();

		// Take screenshot of drawing result
		await takeScreenshotAndCompare(page, 'index-element-draw-test');
	});

	test('should update stats display when body count changes', async ({ page }) => {
		await page.goto(`${TEST_SERVER}/index-element.html`);

		// Get initial stats text
		const initialStats = await page.evaluate(() => {
			const component = document.querySelector('#test-index-element');
			return component.shadowRoot.querySelector('.stats-display').textContent;
		});

		// Add a body
		await page.evaluate(() => {
			const component = document.querySelector('#test-index-element');
			const mockObject = { body: {} };
			component.physics.activeObjects.push(mockObject);
			component.updateStats();
		});

		// Get updated stats text
		const updatedStats = await page.evaluate(() => {
			const component = document.querySelector('#test-index-element');
			return component.shadowRoot.querySelector('.stats-display').textContent;
		});

		// Stats should be different after adding a body
		expect(updatedStats).not.toBe(initialStats);
	});

	test('should handle window resize properly', async ({ page }) => {
		await page.goto(`${TEST_SERVER}/index-element.html`);

		// Track resize calls
		await page.evaluate(() => {
			const component = document.querySelector('#test-index-element');
			window.resizeCalled = false;

			const originalResize = component.physics.resize;
			component.physics.resize = function (...args) {
				window.resizeCalled = true;
				return originalResize.apply(this, args);
			};
		});

		// Trigger resize
		await page.setViewportSize({ width: 800, height: 600 });

		// Wait for resize observer to trigger
		await page.waitForTimeout(100);

		// Check if resize was called
		const resizeCalled = await page.evaluate(() => {
			return window.resizeCalled;
		});
		expect(resizeCalled).toBeTruthy();
	});

	// Add test that was previously in tool-handler.spec.js
	test('should properly handle tool change', async ({ page }) => {
		await page.goto(`${TEST_SERVER}/index-element.html`);

		// Track tool changes
		await page.evaluate(() => {
			const element = document.querySelector('#test-index-element');

			// Record all tool changes
			window.toolChanges = [];

			// Override handleToolChange
			const originalToolChange = element.handleToolChange;
			element.handleToolChange = function (tool) {
				window.toolChanges.push(tool);
				return originalToolChange.call(this, tool);
			};
		});

		// Test each tool button
		const toolNames = ['draw', 'drag', 'explode', 'erase', 'spawn'];
		await Promise.all(
			toolNames.map((toolName) => {
				return page.click(`#${toolName}-tool`);
			}),
		);

		// Verify all tool changes were recorded
		const toolChanges = await page.evaluate(() => {
			return window.toolChanges;
		});

		expect(toolChanges.length).toBe(5);
		expect(toolChanges).toContain('draw');
		expect(toolChanges).toContain('drag');
		expect(toolChanges).toContain('explode');
		expect(toolChanges).toContain('erase');
		expect(toolChanges).toContain('spawn');

		// Verify current tool is the last one we selected
		const currentTool = await page.evaluate(() => {
			const element = document.querySelector('#test-index-element');
			return element.currentTool;
		});

		expect(currentTool).toBe('spawn');
	});

	// Add test that was previously in tool-handler.spec.js
	test('should update UI when tool changes', async ({ page }) => {
		await page.goto(`${TEST_SERVER}/index-element.html`);

		// Change to draw tool
		await page.evaluate(() => {
			const element = document.querySelector('#test-index-element');
			element.handleToolChange('draw');
		});

		// Check if UI reflects the change
		const drawButtonActive = await page.evaluate(() => {
			const element = document.querySelector('#test-index-element');
			const button = element.shadowRoot.querySelector('button[data-tool="draw"]');
			return button.classList.contains('active');
		});

		expect(drawButtonActive).toBe(true);

		// Change to another tool
		await page.evaluate(() => {
			const element = document.querySelector('#test-index-element');
			element.handleToolChange('explode');
		});

		// Check if UI updates
		const toolStatuses = await page.evaluate(() => {
			const element = document.querySelector('#test-index-element');
			const toolbar = element.shadowRoot.querySelector('.toolbar');
			const buttons = toolbar.querySelectorAll('.tool-button');

			const result = {};
			buttons.forEach((btn) => {
				result[btn.dataset.tool] = btn.classList.contains('active');
			});

			return result;
		});

		expect(toolStatuses.draw).toBe(false);
		expect(toolStatuses.explode).toBe(true);
	});
});

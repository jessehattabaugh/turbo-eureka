import { test, expect } from '@playwright/test';
import { takeScreenshotAndCompare } from '../utils/visual-regression.js';



test.describe('Tool Interactions Integration Tests', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('te-index');
	});

	test('should correctly integrate draw tool with physics engine', async ({ page }) => {
		// Select draw tool
		await page.locator('te-index').evaluate((el) => {
			el.handleToolChange('draw');
		});

		// Track both component and physics engine state during drawing
		await page.locator('te-index').evaluate(() => {
			window.testState = {
				componentDrawing: false,
				initialBodyCount: 0,
				finalBodyCount: 0
			};
		});

		// Get initial body count
		await page.locator('te-index').evaluate((el) => {
			window.testState.initialBodyCount = el.physics.bodies.dynamic.length;
		});

		// Get canvas position
		const canvasPos = await page.locator('te-index').evaluate((el) => {
			const canvas = el.shadowRoot.querySelector('#physics-canvas');
			const rect = canvas.getBoundingClientRect();
			return {
				startX: rect.left + 100,
				startY: rect.top + 100,
				endX: rect.left + 200,
				endY: rect.top + 200
			};
		});

		// Start drawing
		await page.mouse.move(canvasPos.startX, canvasPos.startY);
		await page.mouse.down();

		// Check component state mid-drawing
		await page.locator('te-index').evaluate((el) => {
			window.testState.componentDrawing = el.isDrawing;
		});

		// Move to complete drawing
		await page.mouse.move(canvasPos.endX, canvasPos.endY);
		await page.waitForTimeout(100);

		// Take screenshot of preview
		await takeScreenshotAndCompare(page, 'integration-draw-preview');

		// Complete drawing
		await page.mouse.up();
		await page.waitForTimeout(300); // Wait for physics to update

		// Get final count and verify body was added
		await page.locator('te-index').evaluate((el) => {
			window.testState.finalBodyCount = el.physics.bodies.dynamic.length;
		});

		const testState = await page.evaluate(() => {return window.testState});

		expect(testState.componentDrawing).toBe(true);
		expect(testState.finalBodyCount).toBeGreaterThan(testState.initialBodyCount);

		// Take screenshot of final result
		await takeScreenshotAndCompare(page, 'integration-draw-result');
	});

	test('should correctly integrate explode tool with physics engine', async ({ page }) => {
		// First create several objects to explode
		await page.locator('te-index').evaluate((el) => {
			// Create a grid of objects
			for (let x = 0; x < 5; x++) {
				for (let y = 0; y < 5; y++) {
					el.spawnObjectAtPoint({
						x: 100 + x * 30,
						y: 100 + y * 30
					});
				}
			}
		});

		await page.waitForTimeout(300);

		// Capture velocities before explosion
		await page.locator('te-index').evaluate((el) => {
			window.initialVelocities = el.physics.bodies.dynamic.map(body => {return {
				x: body.velocity.x,
				y: body.velocity.y,
				magnitude: Math.sqrt(body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y)
			}});
		});

		// Take screenshot before explosion
		await takeScreenshotAndCompare(page, 'integration-before-explosion');

		// Select explode tool and use it
		await page.locator('te-index').evaluate((el) => {
			el.handleToolChange('explode');
		});

		// Click in the middle to trigger explosion
		await page.locator('te-index').evaluate((el) => {
			const canvas = el.shadowRoot.querySelector('#physics-canvas');
			const rect = canvas.getBoundingClientRect();
			el.handleExplodeTool({
				x: rect.width / 2,
				y: rect.height / 2
			});
		});

		// Wait for physics to update
		await page.waitForTimeout(300);

		// Capture velocities after explosion
		await page.locator('te-index').evaluate((el) => {
			window.afterVelocities = el.physics.bodies.dynamic.map(body => {return {
				x: body.velocity.x,
				y: body.velocity.y,
				magnitude: Math.sqrt(body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y)
			}});
		});

		// Take screenshot after explosion
		await takeScreenshotAndCompare(page, 'integration-after-explosion');

		// Check that velocities increased due to explosion
		const velocityChange = await page.evaluate(() => {
			const initial = window.initialVelocities.reduce((sum, v) => {return sum + v.magnitude}, 0);
			const after = window.afterVelocities.reduce((sum, v) => {return sum + v.magnitude}, 0);
			return { initial, after };
		});

		expect(velocityChange.after).toBeGreaterThan(velocityChange.initial);
	});

	test('should correctly integrate erase tool with physics engine', async ({ page }) => {
		// Create a test object
		await page.locator('te-index').evaluate((el) => {
			const canvas = el.shadowRoot.querySelector('#physics-canvas');
			const centerX = canvas.width / 2;
			const centerY = canvas.height / 2;

			// Spawn an object at center
			el.spawnObjectAtPoint({ x: centerX, y: centerY });
			window.initialCount = el.physics.bodies.dynamic.length;
		});

		await page.waitForTimeout(200);

		// Take screenshot with object
		await takeScreenshotAndCompare(page, 'integration-before-erase');

		// Switch to erase tool
		await page.locator('te-index').evaluate((el) => {
			el.handleToolChange('erase');
		});

		// Use erase tool
		await page.locator('te-index').evaluate((el) => {
			const canvas = el.shadowRoot.querySelector('#physics-canvas');
			const centerX = canvas.width / 2;
			const centerY = canvas.height / 2;

			// Erase at center where we spawned the object
			el.handleEraseTool({ x: centerX, y: centerY });
		});

		await page.waitForTimeout(200);

		// Take screenshot after erase
		await takeScreenshotAndCompare(page, 'integration-after-erase');

		// Check that object was removed
		const countChange = await page.locator('te-index').evaluate((el) => {
			return {
				before: window.initialCount,
				after: el.physics.bodies.dynamic.length
			};
		});

		expect(countChange.after).toBeLessThan(countChange.before);
	});

	test('should correctly integrate drag tool with physics engine', async ({ page }) => {
		// Create a test object
		await page.locator('te-index').evaluate((el) => {
			const canvas = el.shadowRoot.querySelector('#physics-canvas');
			const centerX = canvas.width / 2;
			const centerY = canvas.height / 2;

			// Spawn an object at center
			el.spawnObjectAtPoint({ x: centerX, y: centerY });

			// Store initial position
			if (el.physics.bodies.dynamic.length > 0) {
				const [body] = el.physics.bodies.dynamic;
				window.initialPosition = { x: body.position.x, y: body.position.y };
			}
		});

		await page.waitForTimeout(200);

		// Switch to drag tool
		await page.locator('te-index').evaluate((el) => {
			el.handleToolChange('drag');
		});

		// Get canvas and body position
		const positions = await page.locator('te-index').evaluate((el) => {
			const canvas = el.shadowRoot.querySelector('#physics-canvas');
			const rect = canvas.getBoundingClientRect();
			const [body] = el.physics.bodies.dynamic;

			return {
				canvasRect: {
					left: rect.left,
					top: rect.top
				},
				bodyPos: {
					x: body.position.x,
					y: body.position.y
				}
			};
		});

		// Use drag tool - move to body position
		await page.mouse.move(
			positions.canvasRect.left + positions.bodyPos.x,
			positions.canvasRect.top + positions.bodyPos.y
		);

		// Press down to start drag
		await page.mouse.down();

		// Move to new position
		await page.mouse.move(
			positions.canvasRect.left + positions.bodyPos.x + 100,
			positions.canvasRect.top + positions.bodyPos.y - 50
		);

		await page.waitForTimeout(200);

		// Take screenshot during drag
		await takeScreenshotAndCompare(page, 'integration-during-drag');

		// Release to end drag
		await page.mouse.up();

		await page.waitForTimeout(200);

		// Get final position
		const finalPosition = await page.locator('te-index').evaluate((el) => {
			const [body] = el.physics.bodies.dynamic;
			return { x: body.position.x, y: body.position.y };
		});

		// Compare with initial position
		const initialPosition = await page.evaluate(() => {return window.initialPosition});
		expect(finalPosition.x).not.toEqual(initialPosition.x);
		expect(finalPosition.y).not.toEqual(initialPosition.y);

		// Take screenshot after drag
		await takeScreenshotAndCompare(page, 'integration-after-drag');
	});
});

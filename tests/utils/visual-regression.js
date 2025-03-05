import fs from 'fs';
import path from 'path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { expect } from '@playwright/test';

/**
 * Takes a screenshot and compares it with a baseline
 * @param {Page} page - Playwright page object
 * @param {string} testName - Name of the test (used for screenshot filenames)
 * @param {Object} options - Options for screenshot capture and comparison
 * @returns {Promise<Object>} - Results of the comparison
 */
export async function takeScreenshotAndCompare(page, testName, options = {}) {
	const { threshold = 0.1, maxDiffPercentage = 1, fullPage = true } = options;

	const screenshotDir = path.join(process.cwd(), 'tests', 'screenshots');
	const baselineDir = path.join(screenshotDir, 'baseline');
	const actualDir = path.join(screenshotDir, 'actual');
	const diffDir = path.join(screenshotDir, 'diff');

	// Create directories if they don't exist
	[screenshotDir, baselineDir, actualDir, diffDir].forEach((dir) => {
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
	});

	const baselinePath = path.join(baselineDir, `${testName}.png`);
	const actualPath = path.join(actualDir, `${testName}.png`);
	const diffPath = path.join(diffDir, `${testName}.png`);

	// Take the screenshot
	await page.screenshot({ path: actualPath, fullPage });

	// If baseline doesn't exist, create it
	if (!fs.existsSync(baselinePath)) {
		fs.copyFileSync(actualPath, baselinePath);
		console.log(`Created baseline screenshot for ${testName}`);
		return {
			match: true,
			diff: 0,
			diffPercentage: 0,
			isNewBaseline: true,
		};
	}

	// Compare screenshots
	const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
	const actual = PNG.sync.read(fs.readFileSync(actualPath));

	if (baseline.width !== actual.width || baseline.height !== actual.height) {
		console.log(`Error: Screenshot dimensions don't match for ${testName}`);
		console.log(`  Baseline: ${baseline.width}x${baseline.height}`);
		console.log(`  Actual: ${actual.width}x${actual.height}`);

		// Create a diff with dimension mismatch notice
		fs.writeFileSync(diffPath, PNG.sync.write(actual));

		return {
			match: false,
			diff: -1, // -1 indicates dimension mismatch
			diffPercentage: 100,
			dimensionMismatch: true,
			baseline: { width: baseline.width, height: baseline.height },
			actual: { width: actual.width, height: actual.height },
		};
	}

	const diff = new PNG({ width: baseline.width, height: baseline.height });
	const numDiffPixels = pixelmatch(
		baseline.data,
		actual.data,
		diff.data,
		baseline.width,
		baseline.height,
		{ threshold },
	);

	const totalPixels = baseline.width * baseline.height;
	const diffPercentage = (numDiffPixels / totalPixels) * 100;

	const result = {
		match: numDiffPixels === 0,
		diff: numDiffPixels,
		diffPercentage,
		totalPixels,
	};

	if (numDiffPixels > 0) {
		fs.writeFileSync(diffPath, PNG.sync.write(diff));
		console.log(`Visual difference detected in ${testName}:`);
		console.log(`  ${numDiffPixels} pixels differ (${diffPercentage.toFixed(2)}%)`);
		result.diffPath = diffPath;
	} else {
		// Remove the diff file if it exists and there's no difference
		if (fs.existsSync(diffPath)) {
			fs.unlinkSync(diffPath);
		}
	}

	// Use the provided threshold for acceptable differences
	if (maxDiffPercentage !== null) {
		expect(diffPercentage).toBeLessThanOrEqual(maxDiffPercentage);
	}

	return result;
}

/**
 * Updates a baseline with the current actual screenshot
 * @param {string} testName - Name of the test (used for screenshot filenames)
 */
export function updateBaseline(testName) {
	const screenshotDir = path.join(process.cwd(), 'tests', 'screenshots');
	const baselineDir = path.join(screenshotDir, 'baseline');
	const actualDir = path.join(screenshotDir, 'actual');

	const baselinePath = path.join(baselineDir, `${testName}.png`);
	const actualPath = path.join(actualDir, `${testName}.png`);

	if (fs.existsSync(actualPath)) {
		fs.copyFileSync(actualPath, baselinePath);
		console.log(`Updated baseline for ${testName}`);
		return true;
	}

	console.log(`No actual screenshot found for ${testName}`);
	return false;
}

/**
 * Cleans up screenshots for a given test
 * @param {string} testName - Name of the test (used for screenshot filenames)
 * @param {boolean} removeAll - If true, removes baseline as well
 */
export function cleanupScreenshots(testName, removeAll = false) {
	const screenshotDir = path.join(process.cwd(), 'tests', 'screenshots');
	const baselineDir = path.join(screenshotDir, 'baseline');
	const actualDir = path.join(screenshotDir, 'actual');
	const diffDir = path.join(screenshotDir, 'diff');

	const baselinePath = path.join(baselineDir, `${testName}.png`);
	const actualPath = path.join(actualDir, `${testName}.png`);
	const diffPath = path.join(diffDir, `${testName}.png`);

	if (fs.existsSync(actualPath)) {
		fs.unlinkSync(actualPath);
	}
	if (fs.existsSync(diffPath)) {
		fs.unlinkSync(diffPath);
	}

	if (removeAll && fs.existsSync(baselinePath)) {
		fs.unlinkSync(baselinePath);
	}
}

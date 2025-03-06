import chokidar from 'chokidar';
import { exec } from 'child_process';
import { debounce } from 'lodash-es';

// Configuration
const CONFIG = {
	buildScript: 'npm run build:staging',
	testScript: 'npm run test:local',
	sourceDirs: ['www'],
	fileExtensions: ['.js', '.html', '.css'],
	debounceMs: 500, // Debounce time to avoid multiple builds for rapid changes
};

// State tracking
let isProcessing = false;
let pendingRun = false;

/**
 * Execute a command and handle output
 * @param {string} command - Command to execute
 * @param {string} label - Label for logging
 * @returns {Promise<boolean>} - Success status
 */
const executeCommand = (command, label) => {
	return new Promise((resolve) => {
		console.log(`🚀 ${label}...`);

		exec(command, (error, stdout, stderr) => {
			if (error) {
				console.error(`❌ ${label} failed:`, error.message);
				if (stderr) {
					console.error(stderr);
				}
				resolve(false);
				return;
			}

			console.log(`✅ ${label} complete`);
			if (stdout.trim()) {
				console.log(stdout);
			}
			resolve(true);
		});
	});
};

/**
 * Run the build and test sequence
 */
const runBuildAndTest = async () => {
	if (isProcessing) {
		pendingRun = true;
		return;
	}

	isProcessing = true;

	// Run build
	const buildSuccess = await executeCommand(CONFIG.buildScript, 'Building');

	// Only run tests if build succeeds
	if (buildSuccess) {
		await executeCommand(CONFIG.testScript, 'Testing');
	}

	isProcessing = false;

	// Check if we need to run again
	if (pendingRun) {
		pendingRun = false;
		runBuildAndTest();
	}
};

// Debounced version to avoid multiple runs for rapid file changes
const debouncedRun = debounce(runBuildAndTest, CONFIG.debounceMs);

// Start file watcher with better filtering
const watcher = chokidar.watch(CONFIG.sourceDirs, {
	ignored: [
		/(^|[/\\])\../, // Ignore dotfiles
		/(node_modules)/, // Ignore node_modules
		/\.git/, // Ignore git directory
	],
	persistent: true,
	ignoreInitial: true,
	awaitWriteFinish: {
		// Wait until file write is actually complete
		stabilityThreshold: 300,
		pollInterval: 100,
	},
});

// Add event listener for all relevant file changes
watcher.on('all', (event, path) => {
	const ext = path.slice(path.lastIndexOf('.'));

	if (CONFIG.fileExtensions.includes(ext)) {
		console.log(`📝 ${event}: ${path}`);
		debouncedRun();
	}
});

// Handle process termination
process.on('SIGINT', () => {
	watcher.close();
	console.log('👋 Watch process terminated');
	process.exit(0);
});

console.log('🔍 Watching for file changes...');

// Initial build and test
runBuildAndTest();

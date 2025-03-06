import { exec } from 'child_process';
import { promisify } from 'util';

// Convert exec to promise-based
const execAsync = promisify(exec);

// Deployment configuration
const CONFIG = {
	environments: {
		staging: {
			build: 'npm run build:staging',
			deploy: 'npm run deploy:staging',
			url: 'https://staging-turbo-eureka.surge.sh',
		},
		production: {
			build: 'npm run build:prod',
			deploy: 'npm run deploy:prod',
			url: 'https://turbo-eureka.surge.sh',
		},
	},
	testing: {
		command: 'npm test',
		retries: 2,
	},
};

// Parse command line arguments
const deployToProduction = process.argv.includes('--prod');

/**
 * Execute a command with proper logging
 * @param {string} command - Command to execute
 * @param {string} label - Label for logging
 * @returns {Promise<string>} - Command output
 */
async function runCommand(command, label) {
	console.log(`🚀 ${label}...`);
	try {
		const { stdout, stderr } = await execAsync(command);
		if (stderr && stderr.trim()) {
			console.warn(`⚠️ ${label} warnings:`);
			console.warn(stderr);
		}
		console.log(`✅ ${label} complete`);
		return stdout;
	} catch (error) {
		console.error(`❌ ${label} failed:`);
		console.error(error.message);
		throw error;
	}
}

/**
 * Run tests with retries
 * @param {number} retriesLeft - Number of retries left
 * @returns {Promise<boolean>} - Test success status
 */
async function runTests(retriesLeft = CONFIG.testing.retries) {
	try {
		console.log('🧪 Running tests...');
		await runCommand(CONFIG.testing.command, 'Testing');
		console.log('✅ All tests passed');
		return true;
	} catch {
		if (retriesLeft > 0) {
			console.log(`⚠️ Tests failed. Retrying... (${retriesLeft} attempts left)`);
			return runTests(retriesLeft - 1);
		} else {
			console.error('❌ Tests failed after all retry attempts');
			return false;
		}
	}
}

/**
 * Deploy to an environment
 * @param {string} env - Environment name
 */
async function deployToEnvironment(env) {
	const config = CONFIG.environments[env];
	if (!config) {
		throw new Error(`Unknown environment: ${env}`);
	}

	try {
		// Build
		await runCommand(config.build, `Building for ${env}`);
		// Deploy
		await runCommand(config.deploy, `Deploying to ${env}`);
		console.log(`🌎 ${env} deployed at ${config.url}`);
		return true;
	} catch {
		console.error(`❌ ${env} deployment failed`);
		return false;
	}
}

/**
 * Main deployment function
 */
async function deploy() {
	try {
		// Step 1: Deploy to staging
		const stagingSuccess = await deployToEnvironment('staging');
		if (!stagingSuccess) {
			process.exit(1);
		}

		// Step 2: Run tests against staging
		const testsSuccess = await runTests();
		if (!testsSuccess) {
			console.error('❌ Tests failed on staging. Production deployment aborted.');
			process.exit(1);
		}

		// Step 3: Deploy to production if requested
		if (deployToProduction) {
			const productionSuccess = await deployToEnvironment('production');
			if (!productionSuccess) {
				process.exit(1);
			}

			console.log(`
🎉 Deployment complete!
📊 Staging: ${CONFIG.environments.staging.url}
🚀 Production: ${CONFIG.environments.production.url}
      `);
		} else {
			console.log(`
🎉 Staging deployment and testing complete!
📊 Staging: ${CONFIG.environments.staging.url}
      `);
		}
	} catch (error) {
		console.error('❌ Deployment process failed:', error.message);
		process.exit(1);
	}
}

// Start the deployment process
deploy();

// server.js
import express from 'express';
import {exec} from 'child_process';
import {join, dirname} from 'path';
import {fileURLToPath} from 'url';

const app = express();

// Create equivalent to __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Timestamp of the last successful build
let lastBuildTime = 0;
// Flag to avoid concurrent builds
let isBuilding = false;
// Define how long to wait before triggering a new build (e.g., 5 minutes)
const buildThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds

// Function to trigger the build asynchronously
function triggerBuild() {
	if (isBuilding) {return;}
	isBuilding = true;
	console.log('Triggering build...');
	exec('npm run build:staging', (error, stdout, stderr) => {
		if (error) {
			console.error('Build error:', error);
			console.error(stderr);
		} else {
			console.log('Build output:', stdout);
		}
		lastBuildTime = Date.now();
		isBuilding = false;
	});
}

// Middleware that checks on every request if a rebuild should be triggered
app.use((req, res, next) => {
	// If it's been longer than the threshold since the last build, trigger a rebuild
	if (Date.now() - lastBuildTime > buildThreshold) {
		triggerBuild();
	}
	next();
});

// Serve the static files from the dist directory
app.use(express.static(join(__dirname, 'dist')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});

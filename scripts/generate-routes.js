import {readdirSync,writeFileSync} from 'fs';
import {join, dirname} from 'path';
import {fileURLToPath} from 'url';

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Directory containing page components
const pagesDir = join(__dirname, '../www/scripts/pages');
// Output file path for routes
const outputFile = join(__dirname, '../www/scripts/routes.json');

// Function to scan the pages directory and generate routes
function generateRoutes() {
  console.log('Generating routes from pages directory...');

  try {
    // Read the pages directory
    const pageFiles = readdirSync(pagesDir).filter((file) => {
      return file.endsWith('.js');
    });

    // Create routes object
    const routes = {};

    // Process each page file
    pageFiles.forEach((file) => {
      const pageName = file.replace('.js', '');
      const routePath = pageName === 'home' ? '/' : `/${pageName}`;

      // Add the main route
      routes[routePath] = `./pages/${file}`;

      // If it's the home page, also add it as the root route
      if (pageName === 'home') {
        routes['/home'] = `./pages/${file}`;
      }
    });

    // Write the routes to the output file
    writeFileSync(outputFile, JSON.stringify(routes, null, 2));

    console.log(`Routes generated: ${Object.keys(routes).length} routes saved to ${outputFile}`);
    console.log('Routes:', routes);
  } catch (error) {
    console.error('Error generating routes:', error);

    // Create a fallback routes file with just the home route
    const fallbackRoutes = {
      '/': './pages/home.js',
      '/home': './pages/home.js'
    };

    try {
      writeFileSync(outputFile, JSON.stringify(fallbackRoutes, null, 2));
      console.log('Created fallback routes file');
    } catch (writeError) {
      console.error('Failed to create fallback routes file:', writeError);
    }
  }
}

// Run the function
generateRoutes();

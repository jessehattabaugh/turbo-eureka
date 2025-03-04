// Router class to manage page navigation
class Router {
	constructor() {
		this.routes = new Map();
		this.defaultRoute = null;
		// Fix the path to use a relative path instead of absolute
		this.pageDirectory = './scripts/pages/';
		this.pageLoaded = new Map();
		this.elementRegistered = new Map();

		// Handle popstate events (browser back/forward)
		window.addEventListener('popstate', () => {
			return this.navigate(window.location.pathname);
		});

		// Initial navigation
		document.addEventListener('DOMContentLoaded', () => {
			this.registerPagesFromDirectory();
			this.navigate(window.location.pathname);
		});
	}

	// Register pages from the directory structure
	async registerPagesFromDirectory() {
		// Default home page
		this.register('/', 'home', true);

		// Simple list of known pages - this could be dynamically fetched in a real app
		const knownPages = ['home', 'about', 'game'];

		for (const page of knownPages) {
			// Skip home as it's already registered as default
			if (page === 'home') {continue;}

			// Register each page with its path
			this.register(`/${page}`, page);
		}
	}

	// Register a route with a component
	register(path, pageName, isDefault = false) {
		this.routes.set(path, pageName);
		if (isDefault) {
			this.defaultRoute = path;
		}
		return this;
	}

	// Navigate to a specific path with lazy loading
	async navigate(path) {
		const container = document.getElementById('page-container');
		if (!container) {
			return;
		}

		// Clear current content
		container.innerHTML = '';

		// Find the page name for this route
		let pageName = this.routes.get(path);

		// Use default route if no match found
		if (!pageName && this.defaultRoute) {
			path = this.defaultRoute;
			pageName = this.routes.get(this.defaultRoute);
		}

		// Create the component if found
		if (pageName) {
			try {
				// Show loading indicator
				container.innerHTML = '<div class="loading">Loading...</div>';

				// Lazy load the page module - use the document base URL to ensure correct path resolution
				const baseUrl = new URL('.', document.baseURI).href;
				const modulePath = `${baseUrl}${this.pageDirectory.replace('./', '')}${pageName}.js`;
				console.log(`Loading module from: ${modulePath}`);

					// Load page module and register custom element
				const componentName = `${pageName}-element`;

				// Only import if not already loaded
				if (!this.pageLoaded.has(pageName)) {
					// Import the module
					const pageModule = await import(modulePath);
					this.pageLoaded.set(pageName, true);

					// Register the custom element only when first needed
					if (!this.elementRegistered.has(componentName) && pageModule.default) {
						customElements.define(componentName, pageModule.default);
						this.elementRegistered.set(componentName, true);
						console.log(`Registered custom element: ${componentName}`);
					}
				}

				// Clear loading indicator and create element
				container.innerHTML = '';
				const element = document.createElement(componentName);
				container.appendChild(element);

				// Update document title
				document.title = `TurboEureka - ${pageName.charAt(0).toUpperCase() + pageName.slice(1)}`;
			} catch (error) {
				console.error(`Error loading page module ${pageName}:`, error);
				container.innerHTML = `<h2>Error</h2><p>Failed to load the requested page: ${error.message}</p>`;
			}
		} else {
			// Create a 404 page if no route is found
			container.innerHTML =
				'<h2>Page Not Found</h2><p>The requested page could not be found.</p>';
			document.title = 'TurboEureka - Page Not Found';
		}
	}
}

// Create a global router instance
const router = new Router();

// Custom router-link element that prevents default navigation
class RouterLink extends HTMLAnchorElement {
	connectedCallback() {
		this.addEventListener('click', (e) => {
			e.preventDefault();

			const href = this.getAttribute('href');
			window.history.pushState(null, '', href);
			router.navigate(href);
		});
	}
}

// Register custom elements
customElements.define('router-link', RouterLink, { extends: 'a' });

export { router };

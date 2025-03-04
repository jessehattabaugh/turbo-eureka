// Router class to handle SPA navigation
class Router {
	constructor() {
		this.routes = {};
		this.currentPage = null;
		this.pageContainer = null;
		this.pageTitle = document.title;
		this.routesLoaded = false;

		// Create a custom router-link element that intercepts navigation
		this.defineRouterLink();
	}

	// Initialize the router with available routes and container
	async init(pageContainer) {
		this.pageContainer = pageContainer;

		try {
			// Load routes dynamically
			const routesModule = await import('./routes.json', { assert: { type: 'json' } });
			const routesData = routesModule.default;

			// Register all routes from the generated file
			Object.entries(routesData).forEach(([path, modulePath]) => {
				this.registerRoute(path, () => {
					return import(modulePath);
				});
			});

			this.routesLoaded = true;
			console.log('Routes loaded successfully:', Object.keys(this.routes).join(', '));
		} catch (error) {
			console.error('Failed to load routes:', error);
			// Create a fallback route for home page
			this.registerRoute('/', () => {
				return import('./pages/home.js');
			});
			this.registerRoute('/home', () => {
				return import('./pages/home.js');
			});
		}

		// Set up event listeners
		window.addEventListener('popstate', () => {
			return this.handleNavigation();
		});

		// Handle initial navigation
		this.handleNavigation();
	}

	// Register a route with a callback to load the page module
	registerRoute(path, moduleLoader) {
		if (typeof moduleLoader !== 'function') {
			console.error(`Invalid module loader for path: ${path}`);
			return;
		}
		this.routes[path] = moduleLoader;
	}

	// Navigate to a specific path
	navigate(path) {
		if (path === window.location.pathname) {
			return;
		}

		window.history.pushState({}, '', path);
		this.handleNavigation();
	}

	// Handle navigation events
	async handleNavigation() {
		// Wait for routes to be loaded if they aren't already
		if (!this.routesLoaded && Object.keys(this.routes).length === 0) {
			this.showLoading();
			await new Promise((resolve) => {
				setTimeout(resolve, 100);
			});
		}

		const path = window.location.pathname;
		let routePath = path;

		// Find matching route, default to home if not found
		if (!this.routes[routePath]) {
			console.warn(`Route not found: ${routePath}, redirecting to home`);
			routePath = '/';

			// If home route doesn't exist either, show error
			if (!this.routes[routePath]) {
				console.error('Home route not found!');
				this.showError();
				return;
			}
		}

		try {
			// Show loading state
			this.showLoading();

			// Load the page module
			const moduleLoader = this.routes[routePath];
			if (typeof moduleLoader !== 'function') {
				throw new Error(`Invalid module loader for path: ${routePath}`);
			}

			const module = await moduleLoader();
			const PageComponent = module.default;

			if (!PageComponent) {
				throw new Error(`No default export found in module for path: ${routePath}`);
			}

			// Update the page title if available
			if (module.pageName) {
				document.title = `${module.pageName} | ${
					this.pageTitle.split('|')[1] || this.pageTitle
				}`;
			}

			// Render the page
			this.renderPage(PageComponent);
		} catch (error) {
			console.error('Error loading page:', error);
			this.showError();
		}
	}

	// Show loading state
	showLoading() {
		if (this.pageContainer) {
			this.pageContainer.innerHTML = '<div class="loading">Loading content...</div>';
		}
	}

	// Show error state
	showError() {
		if (this.pageContainer) {
			this.pageContainer.innerHTML = `
        <div class="error">
          <h2>Oops! Something went wrong</h2>
          <p>We couldn't load the requested page. Please try again or go back to <a href="/" is="router-link">home</a>.</p>
        </div>
      `;
		}
	}

	// Render the page component
	renderPage(PageComponent) {
		// Clear the container
		this.pageContainer.innerHTML = '';

		// Create and append the new page element
		const pageElement = new PageComponent();
		this.pageContainer.appendChild(pageElement);

		// Save reference to current page
		this.currentPage = pageElement;
	}

	// Define the custom router link element
	defineRouterLink() {
		if (customElements.get('router-link')) {
			return;
		}

		const router = this;

		// Extend the anchor element for router links
		customElements.define(
			'router-link',
			class RouterLink extends HTMLAnchorElement {
				connectedCallback() {
					this.addEventListener('click', (e) => {
						e.preventDefault();
						router.navigate(this.getAttribute('href'));
					});
				}
			},
			{ extends: 'a' },
		);
	}
}

// Create and export the router instance
export const router = new Router();

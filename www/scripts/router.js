// Router class to manage page navigation
class Router {
	constructor() {
		this.routes = new Map();
		this.defaultRoute = null;

		// Handle popstate events (browser back/forward)
		window.addEventListener('popstate', () => {
			return this.navigate(window.location.pathname);
		});

		// Initial navigation
		document.addEventListener('DOMContentLoaded', () => {
			this.navigate(window.location.pathname);
		});
	}

	// Register a route with a component
	register(path, componentName, isDefault = false) {
		this.routes.set(path, componentName);
		if (isDefault) {
			this.defaultRoute = path;
		}
		return this;
	}

	// Navigate to a specific path
	navigate(path) {
		const container = document.getElementById('app-container');
		if (!container) {
			return;
		}

		// Clear current content
		container.innerHTML = '';

		// Find the component for this route
		let componentName = this.routes.get(path);

		// Use default route if no match found
		if (!componentName && this.defaultRoute) {
			componentName = this.routes.get(this.defaultRoute);
		}

		// Create the component if found
		if (componentName) {
			const element = document.createElement(componentName);
			container.appendChild(element);
		} else {
			// Create a 404 page if no route is found
			container.innerHTML =
				'<h2>Page Not Found</h2><p>The requested page could not be found.</p>';
		}
	}
}

// Create a global router instance
const router = new Router();

// Register routes
router
	.register('/', 'home-page', true)
	.register('/about', 'about-page')
	.register('/game', 'game-page');

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

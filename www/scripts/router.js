// Router for handling page transitions

class Router {
	constructor() {
		this.routes = new Map();
		this.pageContainer = null;
		this.currentPage = null;
		this.defaultTitle = 'TurboEureka';
	}

	init(pageContainer) {
		this.pageContainer = pageContainer;
		window.addEventListener('popstate', this.handlePopState.bind(this));

		// Handle initial route on page load
		this.navigate(window.location.pathname, false);

		console.log('Router initialized');
	}

	async registerRoute(path, moduleImport) {
		this.routes.set(path, moduleImport);
	}

	async handlePopState() {
		await this.navigate(window.location.pathname, false);
	}

	async navigate(path, addToHistory = true) {
		// Default to home page if path is /
		if (path === '/') {
			path = '/home';
		}

		try {
			// Check if we support view transitions
			const supportsViewTransition = !!document.startViewTransition;

			let pageModule;
			try {
				// Try to load the requested page
				pageModule = await this.routes.get(path)();
			} catch (e) {
				console.error(`Error loading module for path ${path}:`, e);
				// If module fails to load, try the 404 page
				if (path !== '/404') {
					return this.navigate('/404');
				} else {
					throw new Error('Failed to load 404 page');
				}
			}

			const updateDOM = async () => {
				// Clear current content
				while (this.pageContainer.firstChild) {
					this.pageContainer.firstChild.remove();
				}

				// Create and append the new page element
				const PageClass = pageModule.default;
				const newPage = new PageClass();
				this.pageContainer.appendChild(newPage);

				// Update document title
				document.title = pageModule.pageName
					? `${pageModule.pageName} | ${this.defaultTitle}`
					: this.defaultTitle;

				// Update current page reference
				this.currentPage = newPage;

				// Add to browser history if needed
				if (addToHistory) {
					window.history.pushState({}, '', path);
				}
			};

			// Use view transitions if supported
			if (supportsViewTransition) {
				await document.startViewTransition(() => {
					return updateDOM();
				});
			} else {
				await updateDOM();
			}
		} catch (e) {
			console.error('Navigation error:', e);
		}
	}
}

// Create and export router instance
export const router = new Router();

// Define custom RouterLink element that uses the router for navigation
class RouterLink extends HTMLAnchorElement {
	constructor() {
		super();
	}

	connectedCallback() {
		this.addEventListener('click', this.navigate);
	}

	disconnectedCallback() {
		this.removeEventListener('click', this.navigate);
	}

	navigate(event) {
		// Prevent default anchor behavior
		event.preventDefault();

		// Get the href attribute and navigate using the router
		const href = this.getAttribute('href');
		router.navigate(href);
	}
}

// Register the custom element
customElements.define('router-link', RouterLink, { extends: 'a' });

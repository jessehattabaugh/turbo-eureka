// Import PageElement base class
import { PageElement } from './page-element.js';

// Import router which will handle page loading
import { router } from './router.js';

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
	// Register routes
	router.registerRoute('/home', () => {
		return import('./pages/home.js');
	});
	router.registerRoute('/', () => {
		return import('./pages/home.js');
	});
	router.registerRoute('/game', () => {
		return import('./pages/game.js');
	});
	router.registerRoute('/about', () => {
		return import('./pages/about.js');
	});

	// Initialize router with the page container
	const pageContainer = document.getElementById('page-container');
	router.init(pageContainer);

	console.log('App initialized');
});

// Export important modules
export { router, PageElement };

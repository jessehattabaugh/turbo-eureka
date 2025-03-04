// Import PageElement base class
import { PageElement } from './page-element.js';

// Import router which will handle page loading
import { router } from './router.js';

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  // Initialize router with the page container
  const pageContainer = document.getElementById('page-container');
  router.init(pageContainer);

  console.log('App initialized with dynamic routes');
});

// Export important modules
export { router, PageElement };

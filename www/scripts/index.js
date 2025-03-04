// Import PageElement base class
import { PageElement } from './page-element.js';

// Import router which will handle page loading
import { router } from './router.js';

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  console.log('App initialized');
});

// Export important modules
export { router, PageElement };

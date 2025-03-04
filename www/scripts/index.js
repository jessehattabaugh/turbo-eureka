// Import router which will handle page loading
import { router } from './router.js';

// Initialize the router
const pageContainer = document.getElementById('page-container');
router.init(pageContainer);

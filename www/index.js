import {IndexElement} from './js/index-element.js';

// Register the web component
customElements.define('te-index', IndexElement);

console.debug('🚀 Application startup complete', {
    timestamp: new Date().toISOString(),
    viewport: {
        width: window.innerWidth,
        height: window.innerHeight
    },
    devicePixelRatio: window.devicePixelRatio,
    userAgent: navigator.userAgent
}, '🏁');

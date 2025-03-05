console.debug('👋 Hello from www/index.js');

class IndexElement extends HTMLElement {
	constructor() {
		super();
		console.debug('🚀 IndexElement constructed');
		this.attachShadow({ mode: 'open' });
	}

	connectedCallback() {
		console.debug('🚀 IndexElement connected');
		this.shadowRoot.innerHTML = `
	  <style>
		:host {
		  display: block;
		  padding: 1rem;
		  background-color: #f0f0f0;
		  border: 1px solid #ccc;
		  border-radius: 4px;
		}
	  </style>
	  <h1>🚀 Turbo Eureka</h1>
	  <p>👋 Hello from the main element!</p>
	`;
	}
}

// register the main element
customElements.define('te-index', IndexElement);

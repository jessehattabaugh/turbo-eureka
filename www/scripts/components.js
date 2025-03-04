// Base component class for easier component creation
class BaseComponent extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
	}

	connectedCallback() {
		this.render();
	}

	render() {
		this.shadowRoot.innerHTML = `
      <style>
        ${this.styles()}
      </style>
      ${this.template()}
    `;
		this.setupEventListeners();
	}

	styles() {
		return '';
	}

	template() {
		return '<div>Base component</div>';
	}

	setupEventListeners() {
		// To be overridden by child classes
	}
}

// Export the base component for use in other components
export { BaseComponent };

// Remove the circular imports
// DO NOT import page components here

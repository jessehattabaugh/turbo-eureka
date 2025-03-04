// Page element class for easier component creation
class PageElement extends HTMLElement {
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
		return '<div>Page element</div>';
	}

	setupEventListeners() {
		// To be overridden by child classes
	}
}

// Export the page element for use in other components
export { PageElement };

// Page element class for easier component creation
export class PageElement extends HTMLElement {
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
        :host {
          animation: fade-in 0.5s ease-out forwards;
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

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

import { PageElement } from '../page-element.js';

// Export the page name for the title
export const pageName = "Home";

// Home page component
export default class HomeElement extends PageElement {
	styles() {
		return `
      :host {
        display: block;
        padding: 1rem;
      }
      img {
        max-width: 100%;
        height: auto;
      }
    `;
	}

	template() {
		return `
      <h2>Building a game with AI</h2>
      <picture>
        <source srcset="icon/512.png" media="(min-width: 512px)" />
        <img src="icon/192.png" alt="TurboEureka logo" />
      </picture>
      <p>Welcome to TurboEureka, a game built with AI and web components!</p>
    `;
	}
}

// NOTE: No customElements.define here - the router will handle this


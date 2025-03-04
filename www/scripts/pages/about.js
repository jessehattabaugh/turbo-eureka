import { PageElement } from '../page-element.js';

// Export the page name for the title
export const pageName = 'About Us';

// About page component
export default class AboutElement extends PageElement {
	styles() {
		return `
      :host {
        display: block;
        padding: 1rem;
      }
    `;
	}

	template() {
		return `
      <h2>About TurboEureka</h2>
      <p>TurboEureka is an experimental game built with modern web technologies and AI.</p>
      <p>This application demonstrates the power of web components and single page applications.</p>
    `;
	}
}

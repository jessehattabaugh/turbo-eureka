import { BaseComponent } from '../components.js';

// About page component
class AboutPage extends BaseComponent {
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

// Register the component
customElements.define('about-page', AboutPage);

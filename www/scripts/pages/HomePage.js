import { BaseComponent } from '../components.js';

// Home page component
class HomePage extends BaseComponent {
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

// Register the component
customElements.define('home-page', HomePage);

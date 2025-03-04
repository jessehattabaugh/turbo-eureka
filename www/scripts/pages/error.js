import { PageElement } from '../page-element.js';

export default class ErrorPage extends PageElement {
  constructor() {
    super();
    this.render();
  }

  render() {
    this.innerHTML = `
      <div class="error">
        <h2>Oops! Something went wrong</h2>
        <p>We couldn't load the requested page. Please try again or go back to <a href="/" is="router-link">home</a>.</p>
      </div>
    `;
  }
}

// Export page metadata
export const pageName = 'Error';

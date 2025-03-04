import { BaseComponent } from '../components.js';

// Game page component
class GamePage extends BaseComponent {
	styles() {
		return `
      :host {
        display: block;
        padding: 1rem;
      }
      .game-container {
        border: 2px solid #333;
        border-radius: 4px;
        padding: 1rem;
        background-color: #f5f5f5;
        min-height: 300px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
    `;
	}

	template() {
		return `
      <h2>Game</h2>
      <div class="game-container">
        <p>Game content will appear here</p>
        <button id="start-game">Start Game</button>
      </div>
    `;
	}

	setupEventListeners() {
		const startButton = this.shadowRoot.getElementById('start-game');
		if (startButton) {
			startButton.addEventListener('click', () => {
				alert('Game starting...');
				// Add game initialization code here
			});
		}
	}
}

// Register the component
customElements.define('game-page', GamePage);

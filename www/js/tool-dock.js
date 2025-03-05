/**
 * ToolDock component for the physics playground
 */
export class ToolDock extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.currentTool = 'spawn';
		this._onToolChange = null;
	}

	connectedCallback() {
		this.render();
		this.setupEventListeners();
	}

	set onToolChange(callback) {
		this._onToolChange = callback;
	}

	render() {
		this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          bottom: 16px;
          right: 16px;
          z-index: 1000;
        }

        .dock {
          background: rgba(30, 30, 30, 0.85);
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          backdrop-filter: blur(10px);
        }

        .tool-button {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          border: none;
          background: rgba(60, 60, 60, 0.6);
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .tool-button.active {
          background: #3a86ff;
          transform: scale(1.05);
        }

        .tool-button svg {
          width: 24px;
          height: 24px;
          fill: currentColor;
        }

        .tooltip {
          position: absolute;
          left: -100px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          opacity: 0;
          pointer-events: none;
        }

        .tool-button:hover .tooltip {
          opacity: 1;
        }

        @media (max-width: 768px) {
          .dock {
            flex-direction: row;
            bottom: 0;
            left: 0;
            width: 100%;
            border-radius: 0;
            justify-content: center;
          }

          :host {
            bottom: 0;
            right: 0;
            width: 100%;
          }

          .tooltip {
            display: none;
          }
        }
      </style>
      <div class="dock">
        <button class="tool-button active" data-tool="spawn">
          <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/></svg>
          <span class="tooltip">Spawn (S)</span>
        </button>
        <button class="tool-button" data-tool="destroy">
          <svg viewBox="0 0 24 24"><path d="M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z"/></svg>
          <span class="tooltip">Destroy (D)</span>
        </button>
        <button class="tool-button" data-tool="circle">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>
          <span class="tooltip">Circle (C)</span>
        </button>
        <button class="tool-button" data-tool="box">
          <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16"/></svg>
          <span class="tooltip">Box (B)</span>
        </button>
        <button class="tool-button" data-tool="polygon">
          <svg viewBox="0 0 24 24"><path d="M12 2L4 9.5 6 20h12l2-10.5z"/></svg>
          <span class="tooltip">Polygon (P)</span>
        </button>
        <button class="tool-button" data-tool="line">
          <svg viewBox="0 0 24 24"><line x1="3" y1="21" x2="21" y2="3" stroke="white" stroke-width="2"/></svg>
          <span class="tooltip">Line (L)</span>
        </button>
      </div>
    `;
	}

	setupEventListeners() {
		// Tool button clicks
		this.shadowRoot.querySelectorAll('.tool-button').forEach((button) => {
			button.addEventListener('click', () => {
				return this.setTool(button.dataset.tool);
			});
		});

		// Keyboard shortcuts
		window.addEventListener(
			'keydown',
			(this.handleKeydown = (e) => {
				if (
					document.activeElement.tagName !== 'INPUT' &&
					document.activeElement.tagName !== 'TEXTAREA'
				) {
					const toolMap = {
						s: 'spawn',
						d: 'destroy',
						c: 'circle',
						b: 'box',
						p: 'polygon',
						l: 'line',
					};

					const tool = toolMap[e.key.toLowerCase()];
					if (tool) {
						this.setTool(tool);
					}
				}
			}),
		);
	}

	setTool(toolName) {
		if (this.currentTool === toolName) {
			return;
		}

		// Update active button state
		const buttons = this.shadowRoot.querySelectorAll('.tool-button');
		buttons.forEach((button) => {
			button.classList.toggle('active', button.dataset.tool === toolName);
		});

		this.currentTool = toolName;
		if (this._onToolChange) {
			this._onToolChange(toolName);
		}
	}

	disconnectedCallback() {
		window.removeEventListener('keydown', this.handleKeydown);
	}
}

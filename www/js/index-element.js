import { PhysicsEngine } from './physics-engine.js';
import { config } from './config.js';

export class IndexElement extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });

		console.debug('🎮 IndexElement constructor initialized 🎯');

		// Physics and tool state
		this.physics = null;
		this.currentTool = 'spawn';
		this.availableTools = ['spawn', 'draw', 'drag', 'explode', 'erase'];

		// Drawing state
		this.isDrawing = false;
		this.drawStartPoint = null;
		this.drawShape = 'circle'; // Default shape for drawing
		this.previewCtx = null;

		// Dragging state
		this.isDragging = false;
		this.dragBody = null;
		this.startPoint = { x: 0, y: 0 };
		this.lastSpawnTime = 0;

		// Bind event handlers
		this.handlePointerDown = this.handlePointerDown.bind(this);
		this.handlePointerMove = this.handlePointerMove.bind(this);
		this.handlePointerUp = this.handlePointerUp.bind(this);
		this.handlePointerCancel = this.handlePointerCancel.bind(this);
		this.handleToolChange = this.handleToolChange.bind(this);
	}

	connectedCallback() {
		console.debug('🎮 IndexElement connectedCallback 🎯');
		this.render();
		this.initializePhysics();
		this.setupEventListeners();
		this.setupResizeObserver();
		this.createToolbar();
	}

	render() {
		this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
        }
        .canvas-container {
          width: 100%;
          height: 100%;
          overflow: hidden;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
          touch-action: none; /* Prevents browser handling of gestures */
          background-color: #121212;
          position: relative;
        }
        canvas {
          width: 100%;
          height: 100%;
          display: block;
          touch-action: none; /* Important for pointer events to work properly */
        }
        .stats-display {
          position: absolute;
          top: 10px;
          right: 10px;
          background-color: rgba(0, 0, 0, 0.5);
          color: white;
          padding: 5px 10px;
          border-radius: 4px;
          font-family: monospace;
          pointer-events: none;
        }
        #preview-canvas {
          position: absolute;
          top: 0;
          left: 0;
          pointer-events: none;
          z-index: 10;
        }
        .toolbar {
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 5px;
          background-color: rgba(0, 0, 0, 0.6);
          padding: 5px 10px;
          border-radius: 20px;
          z-index: 20;
        }
        .tool-button {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: #333;
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: background-color 0.2s;
        }
        .tool-button.active {
          background-color: #3a86ff;
        }
        .tool-button:hover {
          background-color: #555;
        }
        .tool-button.active:hover {
          background-color: #2a76ef;
        }
      </style>
      <div class="canvas-container">
        <canvas id="physics-canvas"></canvas>
        <canvas id="preview-canvas"></canvas>
        <div class="stats-display">Bodies: 0</div>
        <div class="toolbar"></div>
      </div>
    `;
	}

	createToolbar() {
		const toolbar = this.shadowRoot.querySelector('.toolbar');

		// Tool icons/labels
		const toolIcons = {
			spawn: '➕',
			draw: '✏️',
			drag: '✋',
			explode: '💥',
			erase: '🗑️'
		};

		// Create buttons for each tool
		this.availableTools.forEach(tool => {
			const button = document.createElement('button');
			button.classList.add('tool-button');
			button.dataset.tool = tool;
			button.textContent = toolIcons[tool] || tool;
			button.title = this.capitalizeFirstLetter(tool);

			if (tool === this.currentTool) {
				button.classList.add('active');
			}

			button.addEventListener('click', () => {return this.handleToolChange(tool)});
			toolbar.appendChild(button);
		});
	}

	capitalizeFirstLetter(string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	}

	handleToolChange(tool) {
		// Update active tool
		this.currentTool = tool;

		// Update UI
		const toolbar = this.shadowRoot.querySelector('.toolbar');
		toolbar.querySelectorAll('.tool-button').forEach(btn => {
			if (btn.dataset.tool === tool) {
				btn.classList.add('active');
			} else {
				btn.classList.remove('active');
			}
		});
	}

	initializePhysics() {
		const container = this.shadowRoot.querySelector('.canvas-container');
		const canvas = this.shadowRoot.querySelector('#physics-canvas');
		const previewCanvas = this.shadowRoot.querySelector('#preview-canvas');

		// Set up preview canvas
		previewCanvas.width = container.clientWidth;
		previewCanvas.height = container.clientHeight;
		this.previewCtx = previewCanvas.getContext('2d');

		console.debug(
			'🎮 IndexElement initializePhysics',
			{
				containerSize: {
					width: container.clientWidth,
					height: container.clientHeight,
				},
			},
			'🎯',
		);

		// Initialize physics engine
		this.physics = new PhysicsEngine(container, canvas);
		this.physics.init().createBodies();
		this.physics.on('afterUpdate', () => {
			return this.updateStats();
		});
	}

	/**
	 * Update stats display
	 */
	updateStats() {
		const statsDisplay = this.shadowRoot.querySelector('.stats-display');
		const activeObjects = this.physics.getActiveObjectCount();
		statsDisplay.textContent = `Bodies: ${activeObjects}`;
	}

	setupEventListeners() {
		const canvas = this.shadowRoot.querySelector('#physics-canvas');
		if (!canvas) {
			return;
		}

		// Use pointer events for better cross-platform compatibility
		canvas.addEventListener('pointerdown', this.handlePointerDown);
		canvas.addEventListener('pointermove', this.handlePointerMove);
		canvas.addEventListener('pointerup', this.handlePointerUp);
		canvas.addEventListener('pointercancel', this.handlePointerCancel);
		canvas.addEventListener('pointerleave', this.handlePointerCancel);

		// Prevent context menu on right-click
		canvas.addEventListener('contextmenu', (e) => {
			e.preventDefault();
		});
	}

	/**
	 * Handle pointer down event
	 */
	handlePointerDown(e) {
		// Capture the pointer to receive events outside the canvas
		e.target.setPointerCapture(e.pointerId);

		const point = this.getPointFromEvent(e);
		console.debug('🎮 IndexElement handlePointerDown', { tool: this.currentTool, point }, '🎯');

		switch (this.currentTool) {
			case 'spawn':
				this.handleSpawnTool(point);
				break;
			case 'draw':
				this.handleDrawToolStart(point);
				break;
			case 'drag':
				this.handleDragToolStart(point);
				break;
			case 'explode':
				this.handleExplodeTool(point);
				break;
			case 'erase':
				this.handleEraseTool(point);
				break;
			default:
				// Default to spawn behavior
				this.handleSpawnTool(point);
		}

		// Prevent default behavior
		e.preventDefault();
	}

	/**
	 * Handle pointer move event
	 */
	handlePointerMove(e) {
		const point = this.getPointFromEvent(e);

		switch (this.currentTool) {
			case 'spawn':
				this.handleSpawnToolMove(point);
				break;
			case 'draw':
				this.handleDrawToolMove(point);
				break;
			case 'drag':
				this.handleDragToolMove(point);
				break;
			case 'explode':
			case 'erase':
				// These tools don't need special move handling
				break;
			default:
				this.handleSpawnToolMove(point);
		}

		e.preventDefault();
	}

	/**
	 * Handle pointer up event
	 */
	handlePointerUp(e) {
		// Release the pointer capture
		if (e.target.hasPointerCapture(e.pointerId)) {
			e.target.releasePointerCapture(e.pointerId);
		}

		const point = this.getPointFromEvent(e);

		switch (this.currentTool) {
			case 'draw':
				this.handleDrawToolEnd(point);
				break;
			case 'drag':
				this.stopDragging();
				break;
			default:
				// No special handling needed for other tools
				break;
		}

		e.preventDefault();
	}

	/**
	 * Handle pointer cancel event
	 */
	handlePointerCancel(e) {
		// Release the pointer capture
		if (e.target.hasPointerCapture(e.pointerId)) {
			e.target.releasePointerCapture(e.pointerId);
		}

		if (this.isDrawing) {
			this.clearPreview();
			this.isDrawing = false;
		}

		this.stopDragging();
		e.preventDefault();
	}

	/**
	 * Handle spawn tool
	 */
	handleSpawnTool(point) {
		const body = this.physics.getBodyAtPoint(point);
		if (body) {
			// When clicking on a body with spawn tool, start dragging
			this.startDraggingBody(body, point);
		} else {
			// Otherwise spawn a new object
			this.spawnObjectAtPoint(point);
		}
	}

	/**
	 * Handle spawn tool during move
	 */
	handleSpawnToolMove(point) {
		if (this.isDragging && this.dragBody) {
			// Move existing body
			this.moveBodyToPoint(point);
		} else if (this.canSpawn()) {
			// Spawn objects while moving on empty space
			const body = this.physics.getBodyAtPoint(point);
			if (!body) {
				this.spawnObjectAtPoint(point);
			}
		}
	}

	/**
	 * Handle draw tool start
	 */
	handleDrawToolStart(point) {
		this.isDrawing = true;
		this.drawStartPoint = point;

		// Set random draw shape
		const shapes = ['circle', 'box', 'polygon', 'line'];
		this.drawShape = shapes[Math.floor(Math.random() * shapes.length)];
	}

	/**
	 * Handle draw tool during move
	 */
	handleDrawToolMove(point) {
		if (!this.isDrawing) {return;}

		// Clear previous preview
		this.clearPreview();

		// Generate preview shape
		const preview = this.physics.createShapePreview(
			this.drawShape,
			this.drawStartPoint,
			point
		);

		// Draw preview
		if (preview) {
			this.drawPreview(preview);
		}
	}

	/**
	 * Handle draw tool end
	 */
	handleDrawToolEnd(point) {
		if (!this.isDrawing) {return;}

		// Create actual physics body based on shape
		switch (this.drawShape) {
			case 'circle':
				this.physics.createCircle(this.drawStartPoint, point);
				break;
			case 'box':
				this.physics.createBox(this.drawStartPoint, point);
				break;
			case 'polygon':
				this.physics.createPolygon(this.drawStartPoint, point);
				break;
			case 'line':
				this.physics.createLine(this.drawStartPoint, point);
				break;
		}

		// Clear preview and reset state
		this.clearPreview();
		this.isDrawing = false;
		this.drawStartPoint = null;
	}

	/**
	 * Handle drag tool start
	 */
	handleDragToolStart(point) {
		const body = this.physics.getBodyAtPoint(point);
		if (body) {
			this.startDraggingBody(body, point);
		}
	}

	/**
	 * Handle drag tool during move
	 */
	handleDragToolMove(point) {
		if (this.isDragging && this.dragBody) {
			this.moveBodyToPoint(point);
		}
	}

	/**
	 * Handle explode tool
	 */
	handleExplodeTool(point) {
		this.physics.applyExplosionForce(point, 0.01, 150);
	}

	/**
	 * Handle erase tool
	 */
	handleEraseTool(point) {
		const body = this.physics.getBodyAtPoint(point);
		if (body) {
			this.physics.destroyBody(body);
		}
	}

	/**
	 * Draw shape preview
	 */
	drawPreview(preview) {
		if (!this.previewCtx) {return;}

		const ctx = this.previewCtx;
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
		ctx.lineWidth = 2;

		switch (preview.type) {
			case 'circle':
				ctx.beginPath();
				ctx.arc(preview.x, preview.y, preview.radius, 0, Math.PI * 2);
				ctx.stroke();
				break;

			case 'box':
				ctx.strokeRect(preview.x, preview.y, preview.width, preview.height);
				break;

			case 'polygon':
				if (preview.vertices && preview.vertices.length) {
					ctx.beginPath();
					ctx.moveTo(preview.vertices[0].x, preview.vertices[0].y);
					for (let i = 1; i < preview.vertices.length; i++) {
						ctx.lineTo(preview.vertices[i].x, preview.vertices[i].y);
					}
					ctx.closePath();
					ctx.stroke();
				}
				break;

			case 'line':
				ctx.beginPath();
				ctx.moveTo(preview.x1, preview.y1);
				ctx.lineTo(preview.x2, preview.y2);
				ctx.stroke();
				break;
		}
	}

	/**
	 * Clear preview canvas
	 */
	clearPreview() {
		if (this.previewCtx) {
			const {canvas} = this.previewCtx;
			this.previewCtx.clearRect(0, 0, canvas.width, canvas.height);
		}
	}

	/**
	 * Get pointer coordinates relative to canvas
	 */
	getPointFromEvent(e) {
		const canvas = this.shadowRoot.querySelector('#physics-canvas');
		const rect = canvas.getBoundingClientRect();
		return {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top,
		};
	}

	/**
	 * Start dragging a specific body
	 */
	startDraggingBody(body, point) {
		this.isDragging = true;
		this.dragBody = body;
		this.startPoint = point;

		// Apply a visual effect for dragging feedback
		this.physics.setBodyEffect(body, 'drag', true);
	}

	/**
	 * Spawn a new object at the given point
	 */
	spawnObjectAtPoint(point) {
		// Check if enough time passed since last spawn
		const now = Date.now();
		if (now - this.lastSpawnTime < config.limits.spawnInterval) {
			return null;
		}

		// Spawn new object
		const newObject = this.physics.spawnObjectAtPoint(point);
		if (newObject) {
			// Apply initial randomized velocity for more interesting physics
			const forceMagnitude = 0.005 + Math.random() * 0.01;
			const angle = Math.random() * Math.PI * 2;
			newObject.applyForce({
				x: Math.cos(angle) * forceMagnitude,
				y: Math.sin(angle) * forceMagnitude,
			});

			this.lastSpawnTime = now;

			console.debug(
				'🎮 IndexElement spawnObjectAtPoint',
				{
					point,
					timeSinceLastSpawn: now - this.lastSpawnTime,
				},
				'🎯',
			);
		}

		return newObject;
	}

	/**
	 * Check if enough time has passed to spawn a new object
	 */
	canSpawn() {
		return Date.now() - this.lastSpawnTime >= config.limits.spawnInterval;
	}

	/**
	 * Move the currently dragged body to a new point
	 */
	moveBodyToPoint(point) {
		this.physics.moveBody(this.dragBody, {
			x: this.dragBody.position.x + (point.x - this.startPoint.x),
			y: this.dragBody.position.y + (point.y - this.startPoint.y),
		});

		this.startPoint = point;
	}

	/**
	 * Stop dragging the current body
	 */
	stopDragging() {
		if (this.dragBody) {
			// Remove visual effect
			this.physics.setBodyEffect(this.dragBody, 'drag', false);
		}

		this.isDragging = false;
		this.dragBody = null;
	}

	setupResizeObserver() {
		this.resizeObserver = new ResizeObserver((entries) => {
			const { width, height } = entries[0].contentRect;
			if (this.physics) {
				this.physics.resize(width, height);
			}

			// Also resize the preview canvas
			const previewCanvas = this.shadowRoot.querySelector('#preview-canvas');
			if (previewCanvas) {
				previewCanvas.width = width;
				previewCanvas.height = height;
			}
		});

		this.resizeObserver.observe(this.shadowRoot.querySelector('.canvas-container'));
	}

	disconnectedCallback() {
		console.debug('🎮 IndexElement disconnectedCallback 🎯');
		this.cleanup();
	}

	cleanup() {
		// Remove event listeners
		this.removeEventListeners();

		// Clean up physics engine
		if (this.physics) {
			this.physics.destroy();
			this.physics = null;
		}

		// Disconnect observers
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
			this.resizeObserver = null;
		}
	}

	removeEventListeners() {
		const canvas = this.shadowRoot.querySelector('#physics-canvas');
		if (!canvas) {
			return;
		}

		canvas.removeEventListener('pointerdown', this.handlePointerDown);
		canvas.removeEventListener('pointermove', this.handlePointerMove);
		canvas.removeEventListener('pointerup', this.handlePointerUp);
		canvas.removeEventListener('pointercancel', this.handlePointerCancel);
		canvas.removeEventListener('pointerleave', this.handlePointerCancel);
		canvas.removeEventListener('contextmenu', (e) => {
			e.preventDefault();
		});
	}
}

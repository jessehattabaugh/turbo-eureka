import { PhysicsEngine } from './physics-engine.js';
import { config } from './config.js';
import { ToolDock } from './tool-dock.js'; // Import the tool dock component

// Register the custom element
customElements.define('tool-dock', ToolDock);

export class IndexElement extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });

		console.debug('🎮 IndexElement constructor initialized 🎯');

		// Physics and tool state
		this.physics = null;
		this.currentTool = 'spawn';

		// Drawing state
		this.isDrawing = false;
		this.drawStartPoint = null;
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
      </style>
      <div class="canvas-container">
        <canvas id="physics-canvas"></canvas>
        <canvas id="preview-canvas"></canvas>
        <div class="stats-display">Bodies: 0</div>
      </div>
      <tool-dock></tool-dock>
    `;
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

		// Set up tool dock listener
		const toolDock = this.shadowRoot.querySelector('tool-dock');
		toolDock.onToolChange = this.handleToolChange;
	}

	/**
	 * Handle tool selection change from the dock
	 */
	handleToolChange(tool) {
		this.currentTool = tool;
		console.debug(
			'🎮 IndexElement handleToolChange',
			{
				previousTool: this.currentTool,
				newTool: tool,
			},
			'🎯',
		);
		console.log(`Tool changed to: ${tool}`);
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

	/**
	 * Handle pointer down event
	 */
	handlePointerDown(e) {
		// Capture the pointer to receive events outside the canvas
		e.target.setPointerCapture(e.pointerId);

		const point = this.getPointFromEvent(e);
		console.debug(
			'🎮 IndexElement handlePointerDown',
			{
				tool: this.currentTool,
				point,
				button: e.button,
			},
			'🎯',
		);

		// Handle tool-specific behavior
		switch (this.currentTool) {
			case 'spawn':
				// Check if we hit an existing body first
				{
					const body = this.physics.getBodyAtPoint(point);
					if (body) {
						// Start dragging existing body
						this.startDraggingBody(body, point);
					} else {
						// Spawn a new object
						this.spawnObjectAtPoint(point);
					}
				}
				break;

			case 'destroy': {
				// Find and destroy body at point
				const bodyToDestroy = this.physics.getBodyAtPoint(point);
				if (bodyToDestroy) {
					this.physics.destroyBody(bodyToDestroy);
					this.updateStats(); // Update stats immediately
				}
				break;
			}

			case 'circle':
			case 'box':
			case 'polygon':
			case 'line':
				// Start drawing the shape
				this.isDrawing = true;
				this.drawStartPoint = point;
				break;
		}

		// Prevent default behavior
		e.preventDefault();
	}

	/**
	 * Handle pointer move event
	 */
	handlePointerMove(e) {
		const point = this.getPointFromEvent(e);

		if (this.isDragging && this.dragBody) {
			// Move existing body
			this.moveBodyToPoint(point);
			// Prevent default behavior like scrolling
			e.preventDefault();
		} else if (this.isDrawing) {
			// Update shape preview
			this.updateShapePreview(point);
			e.preventDefault();
		} else if (this.currentTool === 'spawn' && this.canSpawn()) {
			// Spawn objects while moving on empty space when using the spawn tool
			const body = this.physics.getBodyAtPoint(point);
			if (!body) {
				this.spawnObjectAtPoint(point);
			}
		} else if (this.currentTool === 'destroy') {
			// Continuously destroy bodies when destroy tool is active and moving
			const bodyToDestroy = this.physics.getBodyAtPoint(point);
			if (bodyToDestroy) {
				this.physics.destroyBody(bodyToDestroy);
				this.updateStats(); // Update stats immediately
				e.preventDefault();
			}
		}
	}

	/**
	 * Update the preview of the shape being drawn
	 */
	updateShapePreview(currentPoint) {
		if (!this.drawStartPoint || !this.previewCtx) {
			return;
		}

		const ctx = this.previewCtx;
		const previewCanvas = ctx.canvas;

		// Clear previous preview
		ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

		// Get shape preview data
		const preview = this.physics.createShapePreview(
			this.currentTool,
			this.drawStartPoint,
			currentPoint,
		);

		if (!preview) {
			return;
		}

		// Draw preview based on type
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
		ctx.fillStyle = 'rgba(58, 134, 255, 0.5)';
		ctx.lineWidth = 2;

		switch (preview.type) {
			case 'circle':
				ctx.beginPath();
				ctx.arc(preview.x, preview.y, preview.radius, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();
				break;

			case 'box':
				ctx.beginPath();
				ctx.rect(preview.x, preview.y, preview.width, preview.height);
				ctx.fill();
				ctx.stroke();
				break;

			case 'polygon':
				ctx.beginPath();
				{
					const { vertices } = preview;
					if (vertices && vertices.length > 0) {
						ctx.moveTo(vertices[0].x, vertices[0].y);
						for (let i = 1; i < vertices.length; i++) {
							ctx.lineTo(vertices[i].x, vertices[i].y);
						}
						ctx.closePath();
						ctx.fill();
						ctx.stroke();
					}
				}
				break;

			case 'line':
				ctx.beginPath();
				ctx.moveTo(preview.x1, preview.y1);
				ctx.lineTo(preview.x2, preview.y2);
				ctx.lineWidth = preview.thickness;
				ctx.stroke();
				break;
		}
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
					timeSinceLastSpawn: Date.now() - this.lastSpawnTime,
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
	 * Handle pointer up event
	 */
	handlePointerUp(e) {
		// Release the pointer capture
		if (e.target.hasPointerCapture(e.pointerId)) {
			e.target.releasePointerCapture(e.pointerId);
		}

		const point = this.getPointFromEvent(e);

		if (this.isDrawing) {
			// Finish creating the shape
			this.finishShapeDrawing(point);
		}

		this.stopDragging();
		e.preventDefault();
	}

	/**
	 * Finish drawing a shape and create the actual physics body
	 */
	finishShapeDrawing(endPoint) {
		if (!this.drawStartPoint) {
			return;
		}

		// Clear the preview
		if (this.previewCtx) {
			const { canvas } = this.previewCtx;
			this.previewCtx.clearRect(0, 0, canvas.width, canvas.height);
		}

		// Calculate minimum distance for shape creation
		const dx = endPoint.x - this.drawStartPoint.x;
		const dy = endPoint.y - this.drawStartPoint.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		// Only create shapes if they're big enough
		if (distance >= config.objects.minSize / 2) {
			switch (this.currentTool) {
				case 'circle':
					this.physics.createCircle(this.drawStartPoint, endPoint);
					break;

				case 'box':
					this.physics.createBox(this.drawStartPoint, endPoint);
					break;

				case 'polygon':
					this.physics.createPolygon(this.drawStartPoint, endPoint);
					break;

				case 'line':
					this.physics.createLine(this.drawStartPoint, endPoint);
					break;
			}
		}

		console.debug(
			'🎮 IndexElement finishShapeDrawing',
			{
				tool: this.currentTool,
				start: this.drawStartPoint,
				end: endPoint,
				distance: Math.sqrt(
					Math.pow(endPoint.x - this.drawStartPoint.x, 2) +
						Math.pow(endPoint.y - this.drawStartPoint.y, 2),
				),
			},
			'🎯',
		);

		// Reset drawing state
		this.isDrawing = false;
		this.drawStartPoint = null;
	}

	/**
	 * Handle pointer cancel event
	 */
	handlePointerCancel(e) {
		// Release the pointer capture
		if (e.target.hasPointerCapture(e.pointerId)) {
			e.target.releasePointerCapture(e.pointerId);
		}

		// Clear any drawing in progress
		if (this.isDrawing && this.previewCtx) {
			const { canvas } = this.previewCtx;
			this.previewCtx.clearRect(0, 0, canvas.width, canvas.height);
			this.isDrawing = false;
			this.drawStartPoint = null;
		}

		this.stopDragging();
		e.preventDefault();
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
	 * Move the currently dragged body to a new point
	 */
	moveBodyToPoint(point) {
		this.physics.moveBody(this.dragBody, {
			x: this.dragBody.position.x + (point.x - this.startPoint.x),
			y: this.dragBody.position.y + (point.y - this.startPoint.y),
		});

		console.debug(
			'🎮 IndexElement moveBodyToPoint',
			{
				delta: {
					x: point.x - this.startPoint.x,
					y: point.y - this.startPoint.y,
				},
				newPosition: {
					x: this.dragBody.position.x,
					y: this.dragBody.position.y,
				},
			},
			'🎯',
		);

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
}

import { PhysicsEngine } from './physics-engine.js';

export class IndexElement extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });

		// Initialize physics engine
		this.physics = null;

		// Initialize interaction state
		this.isDragging = false;
		this.dragBody = null;
		this.startPoint = { x: 0, y: 0 };
		this.originalBodyStyle = null;

		// Initialize observers
		this.resizeObserver = null;

		// Bind event handlers to maintain context
		this.handlePointerDown = this.handlePointerDown.bind(this);
		this.handlePointerMove = this.handlePointerMove.bind(this);
		this.handlePointerUp = this.handlePointerUp.bind(this);
		this.handlePointerCancel = this.handlePointerCancel.bind(this);
	}

	connectedCallback() {
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
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          touch-action: none; /* Prevents browser handling of gestures */
        }
        canvas {
          width: 100%;
          height: 100%;
          display: block;
          touch-action: none; /* Important for pointer events to work properly */
        }
      </style>
      <div class="canvas-container">
        <canvas id="physics-canvas"></canvas>
      </div>
    `;
	}

	initializePhysics() {
		const container = this.shadowRoot.querySelector('.canvas-container');
		const canvas = this.shadowRoot.querySelector('#physics-canvas');

		// Create physics engine and initialize it
		this.physics = new PhysicsEngine(container, canvas);
		this.physics.init().createBodies();

		// Register any callbacks if needed
		this.physics.on('beforeUpdate', () => {
			// Custom logic before physics update
		});

		this.physics.on('afterUpdate', () => {
			// Custom logic after physics update
		});
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
			return e.preventDefault();
		});
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
			return e.preventDefault();
		});
	}

	/**
	 * Handle pointer down event
	 */
	handlePointerDown(e) {
		// Capture the pointer to receive events outside the canvas
		e.target.setPointerCapture(e.pointerId);

		const point = this.getPointFromEvent(e);
		this.startDraggingAtPoint(point);

		// Prevent default behavior
		e.preventDefault();
	}

	/**
	 * Handle pointer move event
	 */
	handlePointerMove(e) {
		if (this.isDragging && this.dragBody) {
			const point = this.getPointFromEvent(e);
			this.moveBodyToPoint(point);

			// Prevent default behavior like scrolling
			e.preventDefault();
		}
	}

	/**
	 * Handle pointer up event
	 */
	handlePointerUp(e) {
		// Release the pointer capture
		if (e.target.hasPointerCapture(e.pointerId)) {
			e.target.releasePointerCapture(e.pointerId);
		}

		this.stopDragging();
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
	 * Start dragging a body at the given point
	 */
	startDraggingAtPoint(point) {
		const body = this.physics.getBodyAtPoint(point);
		if (body) {
			this.isDragging = true;
			this.dragBody = body;
			this.startPoint = point;

			// Apply a visual effect for dragging feedback
			this.physics.setBodyEffect(body, 'drag', true);
		}
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
		});

		this.resizeObserver.observe(this.shadowRoot.querySelector('.canvas-container'));
	}

	disconnectedCallback() {
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



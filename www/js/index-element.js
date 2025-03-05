import { PhysicsEngine } from './physics-engine.js';

export class IndexElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Initialize interaction state
    this.isDragging = false;
    this.dragBody = null;
    this.startPos = { x: 0, y: 0 };

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

    this.physics = new PhysicsEngine(container, canvas);
    this.physics.init().createBodies();
  }

  setupEventListeners() {
    const canvas = this.shadowRoot.querySelector('#physics-canvas');

    // Use pointer events instead of mouse and touch events
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointercancel', this.handlePointerCancel);
    canvas.addEventListener('pointerleave', this.handlePointerCancel);

    // Prevent context menu on right-click
    canvas.addEventListener('contextmenu', e => {return e.preventDefault()});
  }

  handlePointerDown(e) {
    // Capture the pointer to receive events outside the canvas
    e.target.setPointerCapture(e.pointerId);

    const point = this.getPointFromEvent(e);
    this.startDraggingAtPoint(point);

    // Prevent default behavior
    e.preventDefault();
  }

  handlePointerMove(e) {
    if (this.isDragging && this.dragBody) {
      const point = this.getPointFromEvent(e);
      this.moveBodyToPoint(point);

      // Prevent default behavior like scrolling
      e.preventDefault();
    }
  }

  handlePointerUp(e) {
    // Release the pointer capture
    if (e.target.hasPointerCapture(e.pointerId)) {
      e.target.releasePointerCapture(e.pointerId);
    }

    this.stopDragging();
    e.preventDefault();
  }

  handlePointerCancel(e) {
    // Release the pointer capture
    if (e.target.hasPointerCapture(e.pointerId)) {
      e.target.releasePointerCapture(e.pointerId);
    }

    this.stopDragging();
    e.preventDefault();
  }

  getPointFromEvent(e) {
    const canvas = this.shadowRoot.querySelector('#physics-canvas');
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  startDraggingAtPoint(point) {
    const body = this.physics.getBodyAtPoint(point);
    if (body) {
      this.isDragging = true;
      this.dragBody = body;
      this.startPos = point;

      // Apply a slight "lift" effect for better interaction feedback
      if (this.dragBody.render) {
        this.originalOpacity = this.dragBody.render.opacity || 1;
        this.dragBody.render.opacity = 0.8;
      }
    }
  }

  moveBodyToPoint(point) {
    this.physics.moveBody(this.dragBody, {
      x: this.dragBody.position.x + (point.x - this.startPos.x),
      y: this.dragBody.position.y + (point.y - this.startPos.y)
    });
    this.startPos = point;
  }

  stopDragging() {
    if (this.dragBody && this.dragBody.render && this.originalOpacity !== undefined) {
      this.dragBody.render.opacity = this.originalOpacity;
      this.originalOpacity = undefined;
    }

    this.isDragging = false;
    this.dragBody = null;
  }

  setupResizeObserver() {
    this.resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      this.physics.resize(width, height);
    });

    this.resizeObserver.observe(this.shadowRoot.querySelector('.canvas-container'));
  }

  disconnectedCallback() {
    this.cleanup();
  }

  cleanup() {
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

    // Remove event listeners
    const canvas = this.shadowRoot.querySelector('#physics-canvas');
    if (canvas) {
      canvas.removeEventListener('pointerdown', this.handlePointerDown);
      canvas.removeEventListener('pointermove', this.handlePointerMove);
      canvas.removeEventListener('pointerup', this.handlePointerUp);
      canvas.removeEventListener('pointercancel', this.handlePointerCancel);
      canvas.removeEventListener('pointerleave', this.handlePointerCancel);
      canvas.removeEventListener('contextmenu', e => {return e.preventDefault()});
    }
  }
}

// Register the element
customElements.define('te-index', IndexElement);

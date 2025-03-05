import { Engine, Render, Runner, Bodies, Composite, Body } from 'matter-js';

class IndexElement extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.engine = null;
		this.render = null;
		this.runner = null;
		this.resizeObserver = null;
	}

	connectedCallback() {
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: block;
					width: 100%;
					height: 100%;
				}
				.canvas-container {
					width: 100%;
					height: 100vh;
					display: block;
					background-color: #f0f0f0;
					border-radius: 8px;
					overflow: hidden;
				}
				canvas {
					width: 100%;
					height: 100%;
				}
			</style>
			<div class="canvas-container">
				<canvas id="matter-canvas"></canvas>
			</div>
		`;

		this.initPhysics();
		this.setupResizeObserver();

		// Cleanup when element is removed
		this.addEventListener('disconnectedCallback', this.cleanup.bind(this));
	}

	initPhysics() {
		// Create engine
		this.engine = Engine.create({
			enableSleeping: true,
			gravity: { x: 0, y: 1, scale: 0.001 }
		});

		const canvasElement = this.shadowRoot.querySelector('#matter-canvas');

		// Create renderer
		this.render = Render.create({
			element: this.shadowRoot.querySelector('.canvas-container'),
			canvas: canvasElement,
			engine: this.engine,
			options: {
				wireframes: false,
				background: '#f0f0f0',
				width: canvasElement.clientWidth,
				height: canvasElement.clientHeight,
				showSleeping: false
			}
		});

		// Create physics bodies
		this.createBodies();

		// Run the renderer and engine
		Render.run(this.render);
		this.runner = Runner.create();
		Runner.run(this.runner, this.engine);

		// Add mouse interaction
		this.setupMouseEvents(canvasElement);
	}

	createBodies() {
		const {width} = this.render.options;
		const {height} = this.render.options;

		// Ground
		const ground = Bodies.rectangle(
			width / 2,
			height + 30,
			width + 100,
			60,
			{
				isStatic: true,
				render: { fillStyle: '#3a86ff' }
			}
		);

		// Walls
		const leftWall = Bodies.rectangle(-30, height / 2, 60, height, { isStatic: true });
		const rightWall = Bodies.rectangle(width + 30, height / 2, 60, height, { isStatic: true });

		// Create some random boxes
		const boxes = [];
		for (let i = 0; i < 15; i++) {
			const size = 20 + Math.random() * 60;
			boxes.push(
				Bodies.rectangle(
					Math.random() * (width - size) + size / 2,
					Math.random() * (height / 2),
					size,
					size,
					{
						restitution: 0.6,
						friction: 0.1,
						render: {
							fillStyle: this.getRandomColor()
						}
					}
				)
			);
		}

		// Create some circles
		const circles = [];
		for (let i = 0; i < 10; i++) {
			const radius = 15 + Math.random() * 30;
			circles.push(
				Bodies.circle(
					Math.random() * (width - 2 * radius) + radius,
					Math.random() * (height / 3),
					radius,
					{
						restitution: 0.7,
						friction: 0.05,
						render: {
							fillStyle: this.getRandomColor()
						}
					}
				)
			);
		}

		Composite.add(this.engine.world, [ground, leftWall, rightWall, ...boxes, ...circles]);
	}

	setupMouseEvents(canvas) {
		let isDragging = false;
		let dragBody = null;
		let startPos = { x: 0, y: 0 };

		canvas.addEventListener('mousedown', (e) => {
			const rect = canvas.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;

			// Find body under the mouse
			const bodies = Composite.allBodies(this.engine.world);
			for (const body of bodies) {
				if (!body.isStatic && this.isPointInBody(body, { x, y })) {
					isDragging = true;
					dragBody = body;
					startPos = { x, y };
					break;
				}
			}
		});

		canvas.addEventListener('mousemove', (e) => {
			if (isDragging && dragBody) {
				const rect = canvas.getBoundingClientRect();
				const x = e.clientX - rect.left;
				const y = e.clientY - rect.top;

				Body.setPosition(dragBody, {
					x: dragBody.position.x + (x - startPos.x),
					y: dragBody.position.y + (y - startPos.y)
				});

				startPos = { x, y };
			}
		});

		canvas.addEventListener('mouseup', () => {
			isDragging = false;
			dragBody = null;
		});

		canvas.addEventListener('mouseleave', () => {
			isDragging = false;
			dragBody = null;
		});
	}

	isPointInBody(body, point) {
		const {vertices} = body;
		const {x} = point;
		const {y} = point;

		// For circles
		if (body.circleRadius) {
			const dx = point.x - body.position.x;
			const dy = point.y - body.position.y;
			return Math.sqrt(dx * dx + dy * dy) <= body.circleRadius;
		}

		// For polygons
		let inside = false;
		for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
			const xi = vertices[i].x;
			const yi = vertices[i].y;
			const xj = vertices[j].x;
			const yj = vertices[j].y;

			const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
			if (intersect) {inside = !inside;}
		}

		return inside;
	}

	getRandomColor() {
		const colors = ['#3a86ff', '#ff006e', '#8338ec', '#fb5607', '#ffbe0b'];
		return colors[Math.floor(Math.random() * colors.length)];
	}

	setupResizeObserver() {
		// Handle window resize
		this.resizeObserver = new ResizeObserver(entries => {
			for (const entry of entries) {
				const {width} = entry.contentRect;
				const {height} = entry.contentRect;

				if (this.render) {
					// Update renderer dimensions
					this.render.options.width = width;
					this.render.options.height = height;
					this.render.canvas.width = width;
					this.render.canvas.height = height;

					// Adjust ground position
					const bodies = Composite.allBodies(this.engine.world);
					const ground = bodies.find(body => {return body.position.y > height - 50 && body.isStatic});

					if (ground) {
						Body.setPosition(ground, {
							x: width / 2,
							y: height + 30
						});
					}

					Render.setPixelRatio(this.render, window.devicePixelRatio);
					Render.lookAt(this.render, {
						min: { x: 0, y: 0 },
						max: { x: width, y: height }
					});
				}
			}
		});

		this.resizeObserver.observe(this.shadowRoot.querySelector('.canvas-container'));
	}

	disconnectedCallback() {
		this.cleanup();
	}

	cleanup() {
		if (this.runner) {
			Runner.stop(this.runner);
			this.runner = null;
		}

		if (this.render) {
			Render.stop(this.render);
			this.render.canvas.remove();
			this.render.canvas = null;
			this.render.context = null;
			this.render.textures = {};
			this.render = null;
		}

		if (this.engine) {
			Engine.clear(this.engine);
			this.engine.world.bodies = [];
			this.engine.world.constraints = [];
			this.engine.world.composites = [];
			this.engine = null;
		}

		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
			this.resizeObserver = null;
		}
	}
}

// Register the main element
customElements.define('te-index', IndexElement);

console.debug('👋 Hello from www/index.js');

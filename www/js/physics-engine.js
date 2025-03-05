import { Engine, Render, Runner, Bodies, Composite, Body, Events } from 'matter-js';

/**
 * PhysicsEngine class to handle Matter.js functionality
 * This separates physics logic from the web component
 */
export class PhysicsEngine {
	constructor(container, canvas) {
		this.container = container;
		this.canvas = canvas;
		this.engine = null;
		this.render = null;
		this.runner = null;
		this.bodies = {
			static: [],
			dynamic: [],
		};

		// Track currently interactive bodies
		this.activeBody = null;

		// Event callbacks
		this.callbacks = {
			beforeUpdate: null,
			afterUpdate: null
		};
	}

	/**
	 * Initialize the physics engine with container dimensions
	 */
	init() {
		const width = this.container.clientWidth;
		const height = this.container.clientHeight;

		// Create engine with improved settings
		this.engine = Engine.create({
			enableSleeping: true,
			gravity: { x: 0, y: 1, scale: 0.001 },
		});

		// Create renderer with optimized settings
		this.render = Render.create({
			element: this.container,
			canvas: this.canvas,
			engine: this.engine,
			options: {
				width,
				height,
				wireframes: false,
				background: '#f0f0f0',
				showSleeping: false,
				pixelRatio: window.devicePixelRatio || 1,
			},
		});

		// Start the engine and renderer
		Render.run(this.render);
		this.runner = Runner.create();
		Runner.run(this.runner, this.engine);

		// Set up Matter.js events
		this.setupEngineEvents();

		return this;
	}

	/**
	 * Set up Matter.js engine events
	 */
	setupEngineEvents() {
		// Add Matter.js engine events if needed
		Events.on(this.engine, 'beforeUpdate', () => {
			if (this.callbacks.beforeUpdate) {this.callbacks.beforeUpdate();}
		});

		Events.on(this.engine, 'afterUpdate', () => {
			if (this.callbacks.afterUpdate) {this.callbacks.afterUpdate();}
		});
	}

	/**
	 * Register a callback for physics engine events
	 */
	on(event, callback) {
		if (this.callbacks[event] !== undefined) {
			this.callbacks[event] = callback;
		}
	}

	/**
	 * Create all the physical bodies
	 */
	createBodies() {
		const { width, height } = this.render.options;

		// Create static boundaries
		this.bodies.static = [
			// Ground
			Bodies.rectangle(width / 2, height + 30, width + 100, 60, {
				isStatic: true,
				render: { fillStyle: '#3a86ff' },
				label: 'ground',
			}),
			// Left wall
			Bodies.rectangle(-30, height / 2, 60, height, {
				isStatic: true,
				label: 'leftWall',
			}),
			// Right wall
			Bodies.rectangle(width + 30, height / 2, 60, height, {
				isStatic: true,
				label: 'rightWall',
			}),
		];

		// Create dynamic bodies with interactive properties
		this.bodies.dynamic = [
			...this.createBoxes(15, width, height),
			...this.createCircles(10, width, height),
		];

		// Add all bodies to the world
		Composite.add(this.engine.world, [...this.bodies.static, ...this.bodies.dynamic]);

		return this;
	}

	/**
	 * Create random boxes with pointer-friendly properties
	 */
	createBoxes(count, width, height) {
		const boxes = [];
		for (let i = 0; i < count; i++) {
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
							fillStyle: this.getRandomColor(),
						},
						label: 'box',
						// Mark as interactive for pointer events
						isInteractive: true,
					},
				),
			);
		}
		return boxes;
	}

	/**
	 * Create random circles with pointer-friendly properties
	 */
	createCircles(count, width, height) {
		const circles = [];
		for (let i = 0; i < count; i++) {
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
							fillStyle: this.getRandomColor(),
						},
						label: 'circle',
						// Mark as interactive for pointer events
						isInteractive: true,
					},
				),
			);
		}
		return circles;
	}

	/**
	 * Find a body at the given point
	 */
	getBodyAtPoint(point) {
		// First check dynamic bodies for better performance
		for (const body of this.bodies.dynamic) {
			if (this.isPointInBody(body, point)) {
				return body;
			}
		}

		// Then check all other bodies
		const allBodies = Composite.allBodies(this.engine.world);
		for (const body of allBodies) {
			if (
				!body.isStatic &&
				!this.bodies.dynamic.includes(body) &&
				this.isPointInBody(body, point)
			) {
				return body;
			}
		}

		return null;
	}

	/**
	 * Check if a point is inside a body
	 */
	isPointInBody(body, point) {
		const { x, y } = point;

		// For circles (more efficient calculation)
		if (body.circleRadius) {
			const dx = x - body.position.x;
			const dy = y - body.position.y;
			return Math.sqrt(dx * dx + dy * dy) <= body.circleRadius;
		}

		// For polygons
		const { vertices } = body;
		let inside = false;
		for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
			const xi = vertices[i].x;
			const yi = vertices[i].y;
			const xj = vertices[j].x;
			const yj = vertices[j].y;

			const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
			if (intersect) {
				inside = !inside;
			}
		}

		return inside;
	}

	/**
	 * Move a body to a new position with momentum preservation
	 */
	moveBody(body, newPos) {
		// Calculate velocity based on position change
		const velocityX = (newPos.x - body.position.x) * 0.05;
		const velocityY = (newPos.y - body.position.y) * 0.05;

		// Apply the position change
		Body.setPosition(body, newPos);

		// Set velocity based on movement (for realistic momentum)
		Body.setVelocity(body, { x: velocityX, y: velocityY });

		// Wake the body if it's sleeping
		if (body.isSleeping) {
			Body.setStatic(body, false);
			Body.setSleeping(body, false);
		}
	}

	/**
	 * Set a visual effect on a body (like highlighting during drag)
	 */
	setBodyEffect(body, effect = 'drag', active = true) {
		if (!body || !body.render) {return;}

		switch (effect) {
			case 'drag':
				body.render.opacity = active ? 0.8 : 1;
				break;
			case 'hover':
				// Could add hover effects here
				break;
		}
	}

	/**
	 * Update canvas size
	 */
	resize(width, height) {
		if (!this.render) {
			return;
		}

		// Update renderer dimensions
		this.render.options.width = width;
		this.render.options.height = height;
		this.render.canvas.width = width;
		this.render.canvas.height = height;

		// Update ground position
		const ground = this.bodies.static.find((body) => {
			return body.label === 'ground';
		});
		if (ground) {
			Body.setPosition(ground, {
				x: width / 2,
				y: height + 30,
			});
		}

		// Update wall positions
		const leftWall = this.bodies.static.find((body) => {
			return body.label === 'leftWall';
		});
		const rightWall = this.bodies.static.find((body) => {
			return body.label === 'rightWall';
		});

		if (leftWall) {
			Body.setPosition(leftWall, { x: -30, y: height / 2 });
		}

		if (rightWall) {
			Body.setPosition(rightWall, { x: width + 30, y: height / 2 });
		}

		// Update rendering view
		Render.setPixelRatio(this.render, window.devicePixelRatio || 1);
		Render.lookAt(this.render, {
			min: { x: 0, y: 0 },
			max: { x: width, y: height },
		});
	}

	/**
	 * Get a random color from predefined palette
	 */
	getRandomColor() {
		const colors = ['#3a86ff', '#ff006e', '#8338ec', '#fb5607', '#ffbe0b'];
		return colors[Math.floor(Math.random() * colors.length)];
	}

	/**
	 * Clean up all resources
	 */
	destroy() {
		// Remove Matter.js events
		if (this.engine) {
			Events.off(this.engine);
		}

		if (this.runner) {
			Runner.stop(this.runner);
			this.runner = null;
		}

		if (this.render) {
			Render.stop(this.render);
			if (this.render.canvas) {
				this.render.canvas = null;
			}
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

		this.bodies.static = [];
		this.bodies.dynamic = [];
		this.activeBody = null;
		this.callbacks = {};
	}
}

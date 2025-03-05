import { Engine, Render, Runner, Bodies, Composite, Body, Events } from 'matter-js';
import { PhysicsObject } from './physics-object.js';
import { config } from './config.js';

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

		// Object pool for reuse
		this.objectPool = [];
		this.activeObjects = [];
		this.lastSpawnTime = 0;

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

		// Create engine with settings from config
		this.engine = Engine.create({
			enableSleeping: config.physics.enableSleeping,
			gravity: config.physics.gravity,
		});

		// Create renderer with settings from config
		this.render = Render.create({
			element: this.container,
			canvas: this.canvas,
			engine: this.engine,
			options: {
				width,
				height,
				wireframes: config.visual.wireframes,
				background: config.visual.background,
				showSleeping: config.visual.showSleeping,
				pixelRatio: config.physics.pixelRatio,
			},
		});

		// Start the engine and renderer
		Render.run(this.render);
		this.runner = Runner.create();
		Runner.run(this.runner, this.engine);

			// Initialize object pool
		this.initObjectPool();

		// Set up Matter.js events
		this.setupEngineEvents();

		return this;
	}

	/**
	 * Initialize the object pool for reusing physics objects
	 */
	initObjectPool() {
		// Create pool of reusable objects
		for (let i = 0; i < config.limits.poolSize; i++) {
			this.objectPool.push(new PhysicsObject());
		}
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

			// Check for bodies that went off-screen and can be recycled
			this.recycleOffscreenBodies();
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
	 * Create all the physical bodies for boundaries
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

		// Add all static bodies to the world
		Composite.add(this.engine.world, this.bodies.static);

		return this;
	}

	/**
	 * Spawn a new physics object at the specified position
	 */
	spawnObjectAtPoint(point) {
		// Check if we can spawn a new object (time and count limits)
		const now = Date.now();
		if (now - this.lastSpawnTime < config.limits.spawnInterval) {
			return null;
		}

		// Check if we're at the body limit
		if (this.activeObjects.length >= config.limits.maxBodies) {
			// Recycle the oldest object
			this.recycleOldestObject();
		}

		// Get a free object from the pool
		const physicsObject = this.getObjectFromPool();
		if (!physicsObject) {return null;}

		// Determine random object type based on weights
		const typeIndex = this.getWeightedRandomTypeIndex();
		const type = config.objects.types[typeIndex];

		// Initialize with random properties
		physicsObject.init(type, point, {
			label: type,
			isInteractive: true,
		});

		// Add to active objects
		this.activeObjects.push(physicsObject);

		// Add the body to Matter.js world
		Composite.add(this.engine.world, physicsObject.body);

		// Add to dynamic bodies for collision detection
		this.bodies.dynamic.push(physicsObject.body);

		// Update last spawn time
		this.lastSpawnTime = now;

		return physicsObject;
	}

	/**
	 * Get a weighted random object type based on configured weights
	 */
	getWeightedRandomTypeIndex() {
		const weights = config.objects.typeWeights;
		const totalWeight = weights.reduce((sum, weight) => {return sum + weight}, 0);
		const randomValue = Math.random() * totalWeight;

		let weightSum = 0;
		for (let i = 0; i < weights.length; i++) {
			weightSum += weights[i];
			if (randomValue <= weightSum) {return i;}
		}

		return 0; // Default to first type
	}

	/**
	 * Get an unused object from the pool or recycle the oldest if needed
	 */
	getObjectFromPool() {
		// First try to find an inactive object
		for (const obj of this.objectPool) {
			if (!obj.active) {return obj;}
		}

		// If no inactive objects, recycle the oldest
		return this.recycleOldestObject();
	}

	/**
	 * Recycle the oldest active object
	 */
	recycleOldestObject() {
		if (this.activeObjects.length === 0) {return null;}

		// Find the oldest active object
		this.activeObjects.sort((a, b) => {return a.creationTime - b.creationTime});
		const oldestObject = this.activeObjects.shift();

		// Remove from world and mark as inactive
		Composite.remove(this.engine.world, oldestObject.body);

		// Remove from dynamic bodies array
		const index = this.bodies.dynamic.findIndex(body => {return body === oldestObject.body});
		if (index !== -1) {
			this.bodies.dynamic.splice(index, 1);
		}

		oldestObject.deactivate();

		return oldestObject;
	}

	/**
	 * Check for bodies that went off-screen and can be recycled
	 */
	recycleOffscreenBodies() {
		const { width, height } = this.render.options;
		const buffer = 100; // Extra buffer beyond the viewport

		const toRecycle = [];

		// Find objects that are far off-screen
		for (let i = this.activeObjects.length - 1; i >= 0; i--) {
			const obj = this.activeObjects[i];
			const pos = obj.body.position;

			// Check if the object is far off-screen
			if (pos.y > height + buffer ||
				pos.x < -buffer ||
				pos.x > width + buffer) {
				toRecycle.push(i);
			}
		}

		// Recycle all off-screen objects
		for (const index of toRecycle) {
			const obj = this.activeObjects[index];

			// Remove from world
			Composite.remove(this.engine.world, obj.body);

			// Remove from dynamic bodies array
			const bodyIndex = this.bodies.dynamic.findIndex(body => {return body === obj.body});
			if (bodyIndex !== -1) {
				this.bodies.dynamic.splice(bodyIndex, 1);
			}

			// Mark as inactive
			obj.deactivate();

			// Remove from active objects
			this.activeObjects.splice(index, 1);
		}
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
	 * Get the number of active physics objects
	 */
	getActiveObjectCount() {
		return this.activeObjects.length;
	}

	/**
	 * Get a random color from predefined palette in config
	 */
	getRandomColor() {
		const {colors} = config.visual;
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

		// Clear object pools
		this.objectPool = [];
		this.activeObjects = [];
	}
}

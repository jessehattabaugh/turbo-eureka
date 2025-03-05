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
			afterUpdate: null,
		};
	}

	/**
	 * Initialize the physics engine with container dimensions
	 */
	init() {
		const width = this.container.clientWidth;
		const height = this.container.clientHeight;

		// Create engine with settings from config - DISABLE SLEEPING
		this.engine = Engine.create({
			enableSleeping: false, // Disable sleeping completely
			gravity: config.physics.gravity,
		});

		// Ensure clean removal of bodies
		this.engine.world.gravity.scale = config.physics.gravity.scale || 0.001;

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
			if (this.callbacks.beforeUpdate) {
				this.callbacks.beforeUpdate();
			}
		});

		Events.on(this.engine, 'afterUpdate', () => {
			if (this.callbacks.afterUpdate) {
				this.callbacks.afterUpdate();
			}

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
		if (!physicsObject) {
			return null;
		}

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
		const totalWeight = weights.reduce((sum, weight) => {
			return sum + weight;
		}, 0);
		const randomValue = Math.random() * totalWeight;

		let weightSum = 0;
		for (let i = 0; i < weights.length; i++) {
			weightSum += weights[i];
			if (randomValue <= weightSum) {
				return i;
			}
		}

		return 0; // Default to first type
	}

	/**
	 * Get an unused object from the pool or recycle the oldest if needed
	 */
	getObjectFromPool() {
		// First try to find an inactive object
		for (const obj of this.objectPool) {
			if (!obj.active) {
				return obj;
			}
		}

		// If no inactive objects, recycle the oldest
		return this.recycleOldestObject();
	}

	/**
	 * Recycle the oldest active object
	 */
	recycleOldestObject() {
		if (this.activeObjects.length === 0) {
			return null;
		}

		// Find the oldest active object
		this.activeObjects.sort((a, b) => {
			return a.creationTime - b.creationTime;
		});
		const oldestObject = this.activeObjects.shift();

		// Remove from world and mark as inactive
		Composite.remove(this.engine.world, oldestObject.body);

		// Remove from dynamic bodies array
		const index = this.bodies.dynamic.findIndex((body) => {
			return body === oldestObject.body;
		});
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
			if (pos.y > height + buffer || pos.x < -buffer || pos.x > width + buffer) {
				toRecycle.push(i);
			}
		}

		// Recycle all off-screen objects
		for (const index of toRecycle) {
			const obj = this.activeObjects[index];

			// Remove from world
			Composite.remove(this.engine.world, obj.body);

			// Remove from dynamic bodies array
			const bodyIndex = this.bodies.dynamic.findIndex((body) => {
				return body === obj.body;
			});
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
		if (!body || !body.render) {
			return;
		}

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
	 * Create a new circle body
	 * @param {Object} start - Start point {x, y}
	 * @param {Object} end - End point {x, y}
	 */
	createCircle(start, end) {
		// Calculate radius from distance between points
		const dx = end.x - start.x;
		const dy = end.y - start.y;
		let radius = Math.sqrt(dx * dx + dy * dy);

		// Clamp radius to reasonable bounds
		radius = Math.max(config.objects.minSize, Math.min(radius, config.objects.maxSize * 2));

		// Create the circle at the start point
		const body = Bodies.circle(start.x, start.y, radius, {
			restitution: config.physics.restitution,
			friction: config.physics.friction,
			render: {
				fillStyle: this.getRandomColor(),
			},
			isInteractive: true,
		});

		// Add the new body to the world
		Composite.add(this.engine.world, body);

		// Add to dynamic bodies
		this.bodies.dynamic.push(body);

		return body;
	}

	/**
	 * Create a new box body
	 * @param {Object} start - Start point {x, y}
	 * @param {Object} end - End point {x, y}
	 */
	createBox(start, end) {
		// Calculate width and height
		const width = Math.abs(end.x - start.x);
		const height = Math.abs(end.y - start.y);

		// Clamp size to reasonable bounds
		const clampedWidth = Math.max(
			config.objects.minSize,
			Math.min(width, config.objects.maxSize * 3),
		);
		const clampedHeight = Math.max(
			config.objects.minSize,
			Math.min(height, config.objects.maxSize * 3),
		);

		// Calculate center point
		const centerX = start.x + (end.x - start.x) / 2;
		const centerY = start.y + (end.y - start.y) / 2;

		// Create the box
		const body = Bodies.rectangle(centerX, centerY, clampedWidth, clampedHeight, {
			restitution: config.physics.restitution,
			friction: config.physics.friction,
			render: {
				fillStyle: this.getRandomColor(),
			},
			isInteractive: true,
		});

		// Add the new body to the world
		Composite.add(this.engine.world, body);

		// Add to dynamic bodies
		this.bodies.dynamic.push(body);

		return body;
	}

	/**
	 * Create a new polygon body
	 * @param {Object} start - Start point {x, y}
	 * @param {Object} end - End point {x, y}
	 */
	createPolygon(start, end) {
		// Calculate radius from distance between points
		const dx = end.x - start.x;
		const dy = end.y - start.y;
		let radius = Math.sqrt(dx * dx + dy * dy);

		// Clamp radius to reasonable bounds
		radius = Math.max(config.objects.minSize, Math.min(radius, config.objects.maxSize * 2));

		// Determine number of sides (3-8)
		const sides = Math.floor(3 + Math.random() * 6);

		// Create the polygon at the start point
		const body = Bodies.polygon(start.x, start.y, sides, radius, {
			restitution: config.physics.restitution,
			friction: config.physics.friction,
			render: {
				fillStyle: this.getRandomColor(),
			},
			isInteractive: true,
		});

		// Add the new body to the world
		Composite.add(this.engine.world, body);

		// Add to dynamic bodies
		this.bodies.dynamic.push(body);

		return body;
	}

	/**
	 * Create a new line body (implemented as a thin rectangle)
	 * @param {Object} start - Start point {x, y}
	 * @param {Object} end - End point {x, y}
	 */
	createLine(start, end) {
		// Calculate line properties
		const dx = end.x - start.x;
		const dy = end.y - start.y;
		const length = Math.sqrt(dx * dx + dy * dy);
		const thickness = 5; // Line thickness

		// Clamp length to reasonable bounds
		const clampedLength = Math.min(length, config.objects.maxSize * 5);

		// Calculate angle
		const angle = Math.atan2(dy, dx);

		// Calculate center point
		const centerX = start.x + dx / 2;
		const centerY = start.y + dy / 2;

		// Create a thin rectangle
		const body = Bodies.rectangle(centerX, centerY, clampedLength, thickness, {
			angle,
			restitution: config.physics.restitution,
			friction: config.physics.friction,
			render: {
				fillStyle: this.getRandomColor(),
			},
			isInteractive: true,
		});

		// Add the new body to the world
		Composite.add(this.engine.world, body);

		// Add to dynamic bodies
		this.bodies.dynamic.push(body);

		return body;
	}

	/**
	 * Create a preview shape for shape tools
	 * @param {string} tool - The current tool ('circle', 'box', etc.)
	 * @param {Object} start - Start point {x, y}
	 * @param {Object} end - End point {x, y}
	 * @returns {Object} Preview object
	 */
	createShapePreview(tool, start, end) {
		// Similar to the create methods above, but returns rendering data only
		switch (tool) {
			case 'circle': {
				const dx = end.x - start.x;
				const dy = end.y - start.y;
				const radius = Math.min(Math.sqrt(dx * dx + dy * dy), config.objects.maxSize * 2);
				return {
					type: 'circle',
					x: start.x,
					y: start.y,
					radius: Math.max(config.objects.minSize, radius),
				};
			}

			case 'box': {
				const width = Math.abs(end.x - start.x);
				const height = Math.abs(end.y - start.y);
				const clampedWidth = Math.max(
					config.objects.minSize,
					Math.min(width, config.objects.maxSize * 3),
				);
				const clampedHeight = Math.max(
					config.objects.minSize,
					Math.min(height, config.objects.maxSize * 3),
				);

				return {
					type: 'box',
					x: Math.min(start.x, end.x),
					y: Math.min(start.y, end.y),
					width: clampedWidth,
					height: clampedHeight,
				};
			}

			case 'polygon': {
				const dx = end.x - start.x;
				const dy = end.y - start.y;
				const radius = Math.min(Math.sqrt(dx * dx + dy * dy), config.objects.maxSize * 2);
				const sides = Math.floor(3 + Math.random() * 6);

				// Generate vertices for a regular polygon
				const vertices = [];
				for (let i = 0; i < sides; i++) {
					const angle = (i / sides) * Math.PI * 2;
					const actualRadius = Math.max(config.objects.minSize, radius);
					vertices.push({
						x: start.x + actualRadius * Math.cos(angle),
						y: start.y + actualRadius * Math.sin(angle),
					});
				}

				return {
					type: 'polygon',
					vertices,
				};
			}

			case 'line': {
				return {
					type: 'line',
					x1: start.x,
					y1: start.y,
					x2: end.x,
					y2: end.y,
					thickness: 5,
				};
			}

			default:
				return null;
		}
	}

	/**
	 * Remove a body from the simulation
	 * @param {Object} body - The Matter.js body to remove
	 */
	destroyBody(body) {
		if (!body) {
			return;
		}

		try {
			// Store position before removal for applying forces
			const position = { ...body.position };

			// Find and remove from the dynamic bodies array
			const dynamicIndex = this.bodies.dynamic.indexOf(body);
			if (dynamicIndex !== -1) {
				this.bodies.dynamic.splice(dynamicIndex, 1);
			}

			// Find and deactivate the corresponding PhysicsObject
			const objIndex = this.activeObjects.findIndex(obj => {return obj.body === body});
			if (objIndex !== -1) {
				const obj = this.activeObjects[objIndex];
				obj.deactivate();
				this.activeObjects.splice(objIndex, 1);
			}

			// Clear any active body reference
			if (this.activeBody === body) {
				this.activeBody = null;
			}

			// Remove from Matter.js world
			Composite.remove(this.engine.world, body);

			// Apply a small force to nearby bodies
			this.applyForceToNeighbors(position);

			// Force an engine update
			Engine.update(this.engine, 16);
		}
		catch (error) {
			console.error('Error destroying body:', error);
		}
	}

	/**
	 * Apply force to bodies near a position
	 * @param {Object} position - Center position {x, y}
	 */
	applyForceToNeighbors(position) {
		const allBodies = Composite.allBodies(this.engine.world);
		const range = 80;

		for (const body of allBodies) {
			if (body.isStatic) {continue;}

			const dx = body.position.x - position.x;
			const dy = body.position.y - position.y;
			const distance = Math.sqrt(dx * dx + dy * dy);

			if (distance < range) {
				// Apply a small force away from the removed position
				const force = 0.001 / Math.max(0.1, distance);
				const direction = {
					x: dx / (distance || 1),
					y: dy / (distance || 1)
				};

				// Apply force to wake up the physics
				Body.applyForce(body, body.position, {
					x: direction.x * force,
					y: direction.y * force
				});
			}
		}
	}

	/**
	 * Apply explosion force to bodies near a point
	 * @param {Object} position - Center of explosion {x, y}
	 * @param {number} force - Force magnitude
	 * @param {number} radius - Radius of effect
	 */
	applyExplosionForce(position, force = 0.005, radius = 100) {
		const bodies = Composite.allBodies(this.engine.world);

		for (const body of bodies) {
			if (body.isStatic) {continue;}

			// Calculate distance
			const dx = body.position.x - position.x;
			const dy = body.position.y - position.y;
			const distance = Math.sqrt(dx * dx + dy * dy);

				// Apply force if within radius
				if (distance < radius) {
					// Calculate force magnitude (stronger closer to center)
					const magnitude = force * (1 - Math.min(1, distance / radius));

					// Calculate direction (normalize)
					const direction = {
						x: dx / (distance || 1),
						y: dy / (distance || 1)
					};

					// Apply the force
					Body.applyForce(body, body.position, {
						x: direction.x * magnitude,
						y: direction.y * magnitude
					});
				}
			}
		}

	/**
	 * Apply a small force to bodies near a given position
	 * @param {Object} position - Position to apply force at
	 */
	applyForceAtPosition(position) {
		const bodies = Composite.allBodies(this.engine.world);

		for (const body of bodies) {
			if (body.isStatic) {continue;}

			// Calculate distance
			const dx = body.position.x - position.x;
			const dy = body.position.y - position.y;
			const distance = Math.sqrt(dx * dx + dy * dy);

			// Only affect nearby bodies
			if (distance < 80) {
				// Wake the body
				Body.setStatic(body, false);
				Body.setSleeping(body, false);

				// Apply small force away from explosion
				const force = 0.001 / Math.max(0.1, distance);
				const forceDx = dx * force;
				const forceDy = dy * force;

				Body.applyForce(body, body.position, {
					x: forceDx,
					y: forceDy
				});
			}
		}
	}

	/**
	 * Emergency method to force remove a body when normal removal fails
	 * @param {Object} bodyToRemove - Body that needs to be removed
	 */
	forceRemoveBody(bodyToRemove) {
		// Save all bodies except the one to remove
		const bodies = Composite.allBodies(this.engine.world).filter(b => {return b !== bodyToRemove});

		// Clear the world
		Composite.clear(this.engine.world);

		// Add back all other bodies
		for (const body of bodies) {
			if (body !== bodyToRemove) {
				Composite.add(this.engine.world, body);
			}
		}

		// Update the engine
		Engine.update(this.engine, 16);
	}

	/**
	 * Wake up all non-static bodies in the world
	 * This helps ensure physics reactions occur properly
	 */
	wakeAllBodies() {
		const allBodies = Composite.allBodies(this.engine.world);

		// Disable sleeping temporarily
		const wasSleeping = this.engine.enableSleeping;
		this.engine.enableSleeping = false;

		// Wake up all non-static bodies
		for (const body of allBodies) {
			if (!body.isStatic) {
				Body.setStatic(body, false);
				Body.setSleeping(body, false);

				// Give it a tiny velocity to ensure it's active
				Body.setVelocity(body, {
					x: body.velocity.x + (Math.random() - 0.5) * 0.05,
					y: body.velocity.y + (Math.random() - 0.5) * 0.05
				});
			}
		}

		// Restore sleeping setting after a delay
		setTimeout(() => {
			this.engine.enableSleeping = wasSleeping;
		}, 500);
	}

	/**
	 * Apply small forces to bodies near a point
	 * @param {Object} position - The center point {x, y}
	 */
	applyForcesToNeighbors(position) {
		const allBodies = Composite.allBodies(this.engine.world);
		const searchRadius = 100; // Search in a larger area

		for (const body of allBodies) {
			if (body.isStatic) {continue;}

			// Calculate distance to the position
			const dx = body.position.x - position.x;
			const dy = body.position.y - position.y;
			const distanceSquared = dx * dx + dy * dy;

			if (distanceSquared < searchRadius * searchRadius) {
				// Calculate force direction (away from the position)
				const forceMagnitude = 0.005 / (distanceSquared + 1);
				const forceX = dx * forceMagnitude;
				const forceY = dy * forceMagnitude;

				// Apply the force
				Body.applyForce(body, body.position, {
					x: forceX,
					y: forceY
				});
			}
		}
	}

	/**
	 * Reset the physics simulation completely
	 * This is useful when we need to ensure all objects are properly updated
	 */
	resetPhysicsState() {
		// Clear and recreate the physics world
		Composite.clear(this.engine.world);

		// Add back the static bodies
		Composite.add(this.engine.world, this.bodies.static);

		// Add back the dynamic bodies that are still active
		for (const obj of this.activeObjects) {
			if (obj.body && obj.active) {
				Composite.add(this.engine.world, obj.body);
			}
		}

		// Force update the engine
		Engine.update(this.engine, 16.67);
	}

	/**
	 * Temporarily disable sleeping for all bodies
	 * @param {number} duration - Duration in ms to disable sleeping
	 */
	temporarilyDisableSleeping(duration = 500) {
		const wasSleeping = this.engine.enableSleeping;
		this.engine.enableSleeping = false;

		// Wake up all non-static bodies
		const allBodies = Composite.allBodies(this.engine.world);
		for (const body of allBodies) {
			if (!body.isStatic) {
				Body.setSleeping(body, false);

				// Apply tiny random forces for better physics response
				const forceMagnitude = 0.0001;
				Body.applyForce(body, body.position, {
					x: (Math.random() - 0.5) * forceMagnitude,
					y: (Math.random() - 0.5) * forceMagnitude
				});
			}
		}

		// Force a world update
		Engine.update(this.engine, 16.67);

		// Restore sleeping after duration
		setTimeout(() => {
			this.engine.enableSleeping = wasSleeping;
		}, duration);
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
		const { colors } = config.visual;
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

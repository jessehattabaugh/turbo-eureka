import { Bodies, Body, Common } from 'matter-js';
import { config } from './config.js';

/**
 * PhysicsObject class wraps Matter.js Body objects with helper functions
 * and enables object pooling for better performance
 */
export class PhysicsObject {
	/**
	 * Create a new physics object
	 */
	constructor() {
		this.body = null;
		this.type = null;
		this.active = false;
		this.creationTime = 0;
		console.debug('🔮 PhysicsObject constructor 🧩');
	}

	/**
	 * Initialize (or reinitialize) this object as a specific type at a position
	 * @param {string} type - 'circle', 'box', or 'polygon'
	 * @param {object} position - {x, y} coordinates
	 * @param {object} options - Additional Matter.js body options
	 */
	init(type, position, options = {}) {
		// Clean up previous body if it exists
		if (this.body) {
			// We don't destroy the Matter body here, just prepare for reuse
			this.body = null;
		}

		this.type = type;
		const { minSize, maxSize } = config.objects;

		// Create the Matter.js body based on type
		switch (type) {
			case 'circle': {
				const radius = minSize + Math.random() * (maxSize - minSize);
				this.body = Bodies.circle(position.x, position.y, radius, {
					restitution: config.physics.restitution,
					friction: config.physics.friction,
					render: {
						fillStyle: this.getRandomColor(),
					},
					...options,
				});
				break;
			}

			case 'box': {
				const size = minSize + Math.random() * (maxSize - minSize);
				this.body = Bodies.rectangle(position.x, position.y, size, size, {
					restitution: config.physics.restitution,
					friction: config.physics.friction,
					render: {
						fillStyle: this.getRandomColor(),
					},
					...options,
				});
				break;
			}

			case 'polygon': {
				const radius2 = minSize + Math.random() * (maxSize - minSize);
				const sides = Math.floor(3 + Math.random() * 5); // 3 to 7 sides
				this.body = Bodies.polygon(position.x, position.y, sides, radius2, {
					restitution: config.physics.restitution,
					friction: config.physics.friction,
					render: {
						fillStyle: this.getRandomColor(),
					},
					...options,
				});
				break;
			}

			default:
				throw new Error(`Unknown physics object type: ${type}`);
		}

		// Mark the body as interactive
		this.body.isInteractive = true;
		// Set an ID to help track this object
		this.body.objectId = Common.nextId();
		// Mark as active
		this.active = true;
		this.creationTime = Date.now();

		console.debug(
			'🔮 PhysicsObject init',
			{
				type,
				position,
				bodyId: this.body.objectId,
			},
			'🧩',
		);

		return this;
	}

	/**
	 * Apply a force to the body
	 * @param {object} force - {x, y} force vector
	 */
	applyForce(force) {
		if (this.body && this.active) {
			Body.applyForce(this.body, this.body.position, force);
			console.debug(
				'🔮 PhysicsObject applyForce',
				{
					force,
					bodyId: this.body.objectId,
					position: this.body.position,
				},
				'🧩',
			);
		}
		return this;
	}

	/**
	 * Move the body to a new position
	 * @param {object} position - {x, y} coordinates
	 */
	moveTo(position) {
		if (this.body && this.active) {
			Body.setPosition(this.body, position);
		}
		return this;
	}

	/**
	 * Apply a visual effect to the body
	 * @param {string} effect - Effect name ('drag', 'hover', etc.)
	 * @param {boolean} active - Whether to apply or remove the effect
	 */
	setEffect(effect, active = true) {
		if (!this.body || !this.body.render || !this.active) {
			return this;
		}

		switch (effect) {
			case 'drag':
				this.body.render.opacity = active ? 0.8 : 1;
				break;
			case 'hover':
				this.body.render.strokeStyle = active ? '#ffffff' : null;
				this.body.render.lineWidth = active ? 2 : 0;
				break;
		}

		return this;
	}

	/**
	 * Deactivate this object for reuse
	 */
	deactivate() {
		const bodyId = this.body ? this.body.objectId : 'unknown';
		this.active = false;
		console.debug('🔮 PhysicsObject deactivate', { bodyId }, '🧩');
		return this;
	}

	/**
	 * Get a random color for the object
	 */
	getRandomColor() {
		const { colors } = config.visual;
		return colors[Math.floor(Math.random() * colors.length)];
	}
}

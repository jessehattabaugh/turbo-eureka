/**
 * Configuration settings for the physics simulation
 * Centralized for easy tweaking and performance optimization
 */
export const config = {
  // Physics settings
  physics: {
    gravity: { x: 0, y: 1, scale: 0.001 },
    friction: 0.1,
    restitution: 0.7,
    enableSleeping: true,
    pixelRatio: window.devicePixelRatio || 1,
  },

  // Performance limits
  limits: {
    maxBodies: 100,     // Maximum number of bodies in the simulation
    poolSize: 150,      // Size of the object pool for reuse
    spawnInterval: 50,  // Minimum interval between spawns in ms
  },

  // Visual settings
  visual: {
    background: '#121212',
    wireframes: false,
    showSleeping: false,
    colors: ['#3a86ff', '#ff006e', '#8338ec', '#fb5607', '#ffbe0b'],
  },

  // Object properties
  objects: {
    minSize: 15,
    maxSize: 50,
    types: ['circle', 'box', 'polygon'],
    typeWeights: [2, 2, 1],  // More circles and boxes than polygons
  }
};

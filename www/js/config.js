/**
 * Configuration settings for the physics simulation
 */
export const config = {
  // Physics settings
  physics: {
    gravity: { x: 0, y: 1, scale: 0.001 },
    friction: 0.1,
    restitution: 0.7,
    enableSleeping: false, // Changed to false to keep bodies active
    pixelRatio: window.devicePixelRatio || 1,
  },

  // Performance limits
  limits: {
    maxBodies: 100,     // Maximum bodies
    poolSize: 150,      // Object pool size
    spawnInterval: 50,  // Min ms between spawns
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
    typeWeights: [2, 2, 1],  // Weighted probabilities
  },

  // Tool settings
  tools: {
    defaultTool: 'spawn',
    constraints: {
      maxLineLength: 500,
      maxShapeSize: 150
    }
  }
};

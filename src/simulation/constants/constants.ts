// debug
export const DEBUG_ENABLED = false;
export const VISIBLE_SENSORS = 5;

// Grid parameters
export const GRID_CELL_SIZE = 4;

// Rendering optimization - frames between updates (1 = every frame, 2 = every 2nd frame, etc.)
export const GRID_UPDATE_INTERVAL_FRAMES = 2; // Update grid every 2 frames
export const PHEROMONE_UPDATE_INTERVAL_FRAMES = 2; // Update pheromones every 2 frames

// Performance presets
export const RENDER_PRESETS = {
  HIGH_QUALITY: {
    grid: 1,
    pheromones: 1,
  },
  BALANCED: {
    grid: 2,
    pheromones: 2,
  },
  PERFORMANCE: {
    grid: 3,
    pheromones: 3,
  },
  LOW_END: {
    grid: 4,
    pheromones: 4,
  },
} as const;

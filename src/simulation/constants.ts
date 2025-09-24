// debug
export const DEBUG_ENABLED = false;
export const VISIBLE_SENSORS = 5;

// Simulation constants
// Display colors
export const COLORS = {
  NEST: 0x8b4513, // Brown
  FOOD: 0x32cd32, // Green
  OBSTACLE: 0x696969, // Gray
  EMPTY: 0xffffff, // White
  PHEROMONE_FOOD: 0xff0000, // Red
  PHEROMONE_HOME: 0x0000ff, // Blue
  GRID_STROKE: 0xcccccc, // Light gray
  // Ant colors
  ANT_NORMAL: 0x000000, // Black (normal ant)
  ANT_CARRYING_FOOD: 0xff0000, // Red (carrying food)
} as const;

// Grid parameters
export const MAX_FOOD_PER_CELL = 4;
export const GRID_CELL_SIZE = 4;
export const BASE_ANT_COUNT = 40;

// Pheromone parameters
export const PHEROMONE_EVAPORATION_RATE = 0.998;
export const MAX_PHEROMONES = 10000;
export const BASE_PHEROMONE_STRENGTH = 1;
export const PHEROMONE_INCREMENT = 0.25;
// export const MIN_PHEROMONE_TO_REINFORCE = 0.2;
export const MAX_PHEROMONE_THRESHOLD = 10; // Maximum pheromone level in cell
export const PHEROMONE_SIZE = 1; // Pheromone size relative to cell size

// Pheromone gradient parameters
export const MAX_PHEROMONE_MULTIPLIER = 8; // Maximum strength multiplier for fresh pheromones
export const PHEROMONE_FADE_TIME = 16; // Time in seconds for pheromone strength to fade to base
//export const PHEROMONE_SPREAD_RADIUS_CELLS = 2; // Pheromone spread radius in cells

// Ant parameters
export const DEFAULT_ANT_COUNT = 100;
export const ANT_MAX_SPEED = 1.2; // Slightly reduce speed
export const ANT_STEER_STRENGTH = 0.2; // Increase steering force
export const ANT_WANDER_STRENGTH = 0.3; // Reduce random wandering
export const ANT_SIZE_IN_CELLS = 3;

// Sensor parameters (in cells)
export const SENSOR_DISTANCE_CELLS = 5; // Sensor distance in cells (was too far)
export const SENSOR_ANGLE = Math.PI / 3;
export const SENSOR_RADIUS_CELLS = 6; // Sensor radius for pheromone detection in cells (smaller radius)

// Ant pheromone parameters
export const PHEROMONE_TIMER_INTERVAL = 0.25; // Drop pheromones more often (was 0.25)
export const COLLISION_PREDICTION_DISTANCE = 2;

// Alpha channels
export const ALPHA = {
  EMPTY_CELL: 0.1,
  FILLED_CELL: 1.0,
  MIN_PHEROMONE: 0.05,
} as const;

// Sizes and distances
export const NEST_SIZE_MULTIPLIER = 2.5; // Multiplier for nest size calculation
export const EDGE_COLLISION_MARGIN = 10; // Edge margin for collisions

// Physics settings
export const COLLISION_DAMPING = 0.8; // Collision damping
export const RANDOM_TURN_RANGE = Math.PI; // Random turn range

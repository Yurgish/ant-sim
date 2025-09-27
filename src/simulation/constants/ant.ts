// SENSORS
// Sensor parameters (in cells)
export const SENSOR_ANGLE = Math.PI / 4;
export const SENSOR_RADIUS_CELLS = 6; // Sensor radius for pheromone detection in cells (smaller radius)

export const LINEAR_SENSOR_POINTS = 8; // Кількість точок на лінії (менше = швидше)
export const LINEAR_SENSOR_STEP = 2; // Крок між точками в клітинках

// MOVEMENT
export const ANT_MASS_BASE = 1.0; // Base mass for collision calculations
export const ANT_MASS_CARRYING = 1.3; // Mass when carrying food

export const ANT_MAX_SPEED = 1.2; // Slightly reduce speed
export const ANT_STEER_STRENGTH = 0.2; // Increase steering force
export const ANT_WANDER_STRENGTH = 0.3; // Reduce random wandering

export const EDGE_COLLISION_MARGIN = 5; // Edge margin for collisions
export const COLLISION_PREDICTION_DISTANCE = 2; // Distance to predict collisions

// SIZE
export const ANT_SIZE_IN_CELLS = 3;
export const ANT_COLLISION_RADIUS = 1.0;

export const ANT_COLLISION_UPDATE_INTERVAL = 1 / 30;

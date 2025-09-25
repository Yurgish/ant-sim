// SENSORS
// Sensor parameters (in cells)
export const SENSOR_DISTANCE_CELLS = 5; // Sensor distance in cells (was too far)
export const SENSOR_ANGLE = Math.PI / 3;
export const SENSOR_RADIUS_CELLS = 6; // Sensor radius for pheromone detection in cells (smaller radius)

// MOVEMENT
export const ANT_MAX_SPEED = 1.2; // Slightly reduce speed
export const ANT_STEER_STRENGTH = 0.2; // Increase steering force
export const ANT_WANDER_STRENGTH = 0.3; // Reduce random wandering

export const EDGE_COLLISION_MARGIN = 5; // Edge margin for collisions
export const COLLISION_PREDICTION_DISTANCE = 2; // Distance to predict collisions

// SIZE
export const ANT_SIZE_IN_CELLS = 3;

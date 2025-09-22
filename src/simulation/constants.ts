// Константи для симуляції
// Кольори для відображення
export const COLORS = {
  NEST: 0x8b4513, // Коричневий
  FOOD: 0x32cd32, // Зелений
  OBSTACLE: 0x696969, // Сірий
  EMPTY: 0xffffff, // Білий
  PHEROMONE_FOOD: 0xff0000, // Червоний
  PHEROMONE_HOME: 0x0000ff, // Синій
  GRID_STROKE: 0xcccccc, // Світло-сірий
  // Кольори мурашок
  ANT_NORMAL: 0x000000, // Чорний (звичайна мурашка)
  ANT_CARRYING_FOOD: 0xff0000, // Червоний (несе їжу)
} as const;

// Параметри сітки
export const MAX_FOOD_PER_CELL = 10;

// Параметри феромонів
export const PHEROMONE_EVAPORATION_RATE = 0.995;
export const MAX_PHEROMONES = 10000;
export const PHEROMONE_STRENGTH = 5;
export const PHEROMONE_INCREMENT = 0.2;
export const MIN_PHEROMONE_THRESHOLD = 0.05;

// Параметри мурашок
export const DEFAULT_ANT_COUNT = 100;
export const ANT_MAX_SPEED = 2;
export const ANT_STEER_STRENGTH = 0.1;
export const ANT_WANDER_STRENGTH = 0.5;

// Параметри сенсорів
export const SENSOR_DISTANCE = 30;
export const SENSOR_ANGLE = Math.PI / 3; // 60 градусів
export const SENSOR_SIZE = 5;
export const SENSOR_THRESHOLD = 0.1;

// Параметри феромонів мурашок
export const PHEROMONE_TIMER_INTERVAL = 0.25;
export const COLLISION_PREDICTION_DISTANCE = 2;

// Альфа-канали
export const ALPHA = {
  EMPTY_CELL: 0.1,
  FILLED_CELL: 1.0,
  MIN_PHEROMONE: 0.05,
} as const;

// Розміри та відстані
export const NEST_SIZE_MULTIPLIER = 2.5; // Множник для розрахунку розміру гнізда
export const EDGE_COLLISION_MARGIN = 10; // Відступ від краю для колізії

// Налаштування фізики
export const COLLISION_DAMPING = 0.8; // Демпфування при зіткненні
export const RANDOM_TURN_RANGE = Math.PI; // Діапазон випадкового повороту

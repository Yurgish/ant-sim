// Загальні типи для симуляції

export type Vector2D = {
  x: number;
  y: number;
};

export type CellType = "nest" | "food" | "obstacle" | "empty";

export type AntState = "searching" | "returning";

export type PheromoneType = "food" | "home";

export interface SensorSignal {
  food: number;
  foodPheromone: number;
  homePheromone: number;
  obstacle: boolean;
  homeDirection: Vector2D | null;
  homeDistance: number;
  // Додаємо інформацію про їжу
  foodDirection: Vector2D | null;
  foodDistance: number;
}

export interface PheromoneData {
  food: number;
  home: number;
  homeDirection: Vector2D | null;
  homeDistance: number;
  // Додаємо інформацію про їжу
  foodDirection: Vector2D | null;
  foodDistance: number;
}

export interface Cell {
  food: number;
  pheromones: PheromoneData;
  obstacle: boolean;
  isNest: boolean;
}

export interface CellParticle {
  particle: import("pixi.js").Particle;
  row: number;
  col: number;
  type: CellType;
}

export interface PheromoneParticle {
  particle: import("pixi.js").Particle;
  x: number;
  y: number;
  type: PheromoneType;
  intensity: number;
}

// Колбеки
export type FoodConsumedCallback = (row: number, col: number) => void;

// General types for simulation

export type Vector2D = {
  x: number;
  y: number;
};

export type CellType = "nest" | "food" | "obstacle" | "empty";

export type AntState = "searching" | "returning";

export type PheromoneType = "food" | "home";

// New type for ant sensor
export interface Sensor {
  position: Vector2D;
  value: number;
  radius: number;
}

export interface SensorSignal {
  food: number;
  foodPheromone: number;
  homePheromone: number;
  obstacle: boolean;
}

export interface SensorResult {
  obstacle: boolean;
  pheromoneStrength: number;
  targetStrength: number;
}

export interface PheromoneData {
  food: number;
  home: number;
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

// Callbacks
export type FoodConsumedCallback = (row: number, col: number) => void;

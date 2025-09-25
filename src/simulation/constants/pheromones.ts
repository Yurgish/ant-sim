import { PHEROMONE_TYPES } from "@simulation/types/PheromoneTypes";

export const PHEROMONE_COLORS_MAP: Record<number, number> = {
  [PHEROMONE_TYPES.FOOD]: 0x00ff00, // Зелений
  [PHEROMONE_TYPES.HOME]: 0xff0000, // Червоний
};

export const PHEROMONE_EVAPORATION_RATE = 0.998;

export const MAX_PHEROMONE_THRESHOLD = 10; // Maximum pheromone level in cell
export const MIN_PHEROMONE_THRESHOLD = 0.1; // Minimum pheromone level to be considered present
export const PHEROMONE_SIZE = 0.7; // Pheromone size relative to cell size

export const BASE_PHEROMONE_STRENGTH = 1;
export const PHEROMONE_INCREMENT = 0.25;

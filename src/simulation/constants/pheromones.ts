import { PHEROMONE_TYPES } from "@simulation/types/PheromoneTypes";

export const PHEROMONE_COLORS_MAP: Record<number, number> = {
  [PHEROMONE_TYPES.FOOD]: 0x00ff00, // green
  [PHEROMONE_TYPES.HOME]: 0x0000ff,
};

export const PHEROMONE_EVAPORATION_RATE = 0.998;

export const MAX_PHEROMONE_THRESHOLD = 10; // Maximum pheromone level in cell
export const MIN_PHEROMONE_THRESHOLD = 0.1; // Minimum pheromone level to be considered present
export const PHEROMONE_SIZE = 0.7; // Pheromone size relative to cell size

export const BASE_PHEROMONE_STRENGTH = 1;
export const PHEROMONE_INCREMENT = 0.25;
export const PHEROMONE_TIMER_INTERVAL = 0.25;
export const MAX_PHEROMONE_MULTIPLIER = 8; // Maximum strength multiplier for fresh pheromones
export const PHEROMONE_FADE_TIME = 16; // Time in seconds for pheromone strength to fade to base

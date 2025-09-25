export const PHEROMONE_TYPES = {
  FOOD: 0,
  HOME: 1,
} as const;

/**
 * Represents the possible numeric IDs for pheromone types.
 *
 * **Value Mapping:**
 * - `0` = FOOD pheromone (attracts ants to food)
 * - `1` = HOME pheromone (guides ants back to nest)
 */
export type PheromoneTypeId = (typeof PHEROMONE_TYPES)[keyof typeof PHEROMONE_TYPES]; // 0 | 1

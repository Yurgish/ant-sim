export const GRID_COLORS = {
  NEST: 0x8b4513,
  FOOD: 0x32cd32,
  OBSTACLE: 0x696969,
  EMPTY: 0xffffff,
} as const;

export const GRID_ALPHA = {
  EMPTY_CELL: 0.1,
  FILLED_CELL: 1.0,
} as const;

export const MAX_FOOD_PER_CELL = 4;

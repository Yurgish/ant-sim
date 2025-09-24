import { MAX_PHEROMONE_THRESHOLD, PHEROMONE_EVAPORATION_RATE } from "./constants";
import type { Cell, PheromoneType } from "./types";
import { GridUtils } from "./utils";

export class Grid {
  rows: number;
  cols: number;
  cellSize: number;
  width: number;
  height: number;
  cells: Cell[][];

  constructor(width: number, height: number, cellSize: number) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;

    this.cols = Math.floor(width / cellSize);
    this.rows = Math.floor(height / cellSize);

    this.cells = this.initializeCells();
  }

  private initializeCells(): Cell[][] {
    return Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => ({
        food: 0,
        pheromones: {
          food: 0,
          home: 0,
        },
        obstacle: false,
        isNest: false,
      }))
    );
  }

  updateCell(row: number, col: number): void {
    if (!GridUtils.isInBounds(row, col, this.rows, this.cols)) return;

    const cell = this.cells[row][col];

    cell.pheromones.food *= PHEROMONE_EVAPORATION_RATE;
    cell.pheromones.home *= PHEROMONE_EVAPORATION_RATE;
  }

  updateAll(deltaTime: number = 1 / 60): void {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        this.evaporatePheromones(row, col, deltaTime);
      }
    }
  }

  addPheromone(x: number, y: number, type: PheromoneType, strength: number): void {
    const { row, col } = GridUtils.getGridPosition(x, y, this.cellSize);

    if (!GridUtils.isInBounds(row, col, this.rows, this.cols)) return;

    const cell = this.cells[row][col];

    if (type === "food") {
      cell.pheromones.food = Math.min(Math.max(strength, cell.pheromones.food), MAX_PHEROMONE_THRESHOLD);
    } else {
      cell.pheromones.home = Math.min(Math.max(strength, cell.pheromones.home), MAX_PHEROMONE_THRESHOLD);
    }
  }

  // Reinforce existing pheromone
  reinforcePheromone(x: number, y: number, type: PheromoneType, amount: number = 0.1): void {
    const { row, col } = GridUtils.getGridPosition(x, y, this.cellSize);

    if (!GridUtils.isInBounds(row, col, this.rows, this.cols)) return;

    const cell = this.cells[row][col];

    if (type === "food") {
      cell.pheromones.food = Math.min(cell.pheromones.food + amount, MAX_PHEROMONE_THRESHOLD);
    } else {
      cell.pheromones.home = Math.min(cell.pheromones.home + amount, MAX_PHEROMONE_THRESHOLD);
    }
  }

  // Get pheromone strength
  getPheromoneStrength(x: number, y: number, type: PheromoneType): number {
    const { row, col } = GridUtils.getGridPosition(x, y, this.cellSize);

    if (!GridUtils.isInBounds(row, col, this.rows, this.cols)) return 0;

    const cell = this.cells[row][col];
    return type === "food" ? cell.pheromones.food : cell.pheromones.home;
  }

  // Evaporate pheromones for specific cell
  evaporatePheromones(row: number, col: number, deltaTime: number): void {
    if (!GridUtils.isInBounds(row, col, this.rows, this.cols)) return;

    const cell = this.cells[row][col];
    const evaporationFactor = Math.pow(PHEROMONE_EVAPORATION_RATE, deltaTime * 60);

    cell.pheromones.food *= evaporationFactor;
    cell.pheromones.home *= evaporationFactor;

    // Remove very weak pheromones
    if (cell.pheromones.food < 0.1) cell.pheromones.food = 0;
    if (cell.pheromones.home < 0.1) cell.pheromones.home = 0;
  }

  getCell(x: number, y: number): Cell | null {
    const { row, col } = GridUtils.getGridPosition(x, y, this.cellSize);

    if (!GridUtils.isInBounds(row, col, this.rows, this.cols)) {
      return null;
    }

    return this.cells[row][col];
  }

  getCellByRowCol(row: number, col: number): Cell | null {
    if (!GridUtils.isInBounds(row, col, this.rows, this.cols)) {
      return null;
    }

    return this.cells[row][col];
  }
}

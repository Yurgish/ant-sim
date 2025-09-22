export type Cell = {
  food: number;
  pheromones: {
    food: number;
    home: number;
  };
  obstacle: boolean;
  isNest: boolean;
};

const EVAPORATION_RATE = 0.99;

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

    this.cells = Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => ({
        food: 0,
        pheromones: { food: 0, home: 0 },
        obstacle: false,
        isNest: false,
      }))
    );
  }

  updateCell(r: number, c: number) {
    const cell = this.cells[r][c];
    cell.pheromones.food *= EVAPORATION_RATE;
    cell.pheromones.home *= EVAPORATION_RATE;
  }

  updateAll() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.updateCell(r, c);
      }
    }
  }
}

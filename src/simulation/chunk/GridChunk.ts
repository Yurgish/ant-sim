import { BaseChunk } from "./BaseChunk";

/**
 * Represents a single cell in the world grid.
 */
export interface GridCell {
  food: number;
  obstacle: boolean;
  isNest: boolean;
}

export class GridChunk extends BaseChunk {
  cells: GridCell[];

  constructor(rows: number, cols: number) {
    super(rows, cols);
    // Initialize all cells with default values
    this.cells = new Array(rows * cols).fill(null).map(() => ({
      food: 0,
      obstacle: false,
      isNest: false,
    }));
  }

  get(r: number, c: number): GridCell | null {
    if (r < 0 || c < 0 || r >= this.rows || c >= this.cols) return null;
    return this.cells[this.getIndex(r, c)];
  }

  set(r: number, c: number, cellData: Partial<GridCell>): void {
    if (r < 0 || c < 0 || r >= this.rows || c >= this.cols) return;

    const cell = this.cells[this.getIndex(r, c)];

    Object.assign(cell, cellData);

    this.setDirty();
  }

  update(): void {
    if (!this.dirty) return;
  }
}

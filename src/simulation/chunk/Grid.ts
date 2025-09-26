import { MAX_FOOD_PER_CELL } from "@simulation/constants/grid";
import type { CellType } from "@simulation/types";

import { BaseGrid } from "./BaseGrid";
import { type GridCell, GridChunk } from "./GridChunk";

export class Grid extends BaseGrid<GridChunk> {
  protected createChunk(rows: number, cols: number): GridChunk {
    return new GridChunk(rows, cols);
  }

  getCellByRowCol(row: number, col: number): GridCell | null {
    const chunk = this.getChunk(row, col);
    if (!chunk) return null;
    const { localRow, localCol } = this.getChunkIndices(row, col);
    return chunk.get(localRow, localCol);
  }

  setCellProperties(row: number, col: number, properties: Partial<GridCell>): void {
    const chunk = this.getChunk(row, col);
    if (!chunk) return;

    const { localRow, localCol } = this.getChunkIndices(row, col);

    chunk.set(localRow, localCol, properties);
    chunk.setDirty();

    this.dirtyChunks.add(chunk);
  }

  setCellTypeInRadius(centerRow: number, centerCol: number, radiusCells: number, type: CellType): void {
    this.forEachInRadius(centerRow, centerCol, radiusCells, (row, col) => {
      let properties: Partial<GridCell> = {};

      switch (type) {
        case "food":
          properties = { food: MAX_FOOD_PER_CELL, obstacle: false, isNest: false };
          break;
        case "obstacle":
          properties = { food: 0, obstacle: true, isNest: false };
          break;
        case "nest":
          properties = { food: 0, obstacle: false, isNest: true };
          break;
        case "empty":
          properties = { food: 0, obstacle: false, isNest: false };
          break;
      }

      this.setCellProperties(row, col, properties);
    });
  }

  getCellsInRadius(centerRow: number, centerCol: number, radiusCells: number): GridCell[] {
    return this.collectInRadius(
      centerRow,
      centerCol,
      radiusCells,
      (_row, _col, _distance, chunk, localRow, localCol) => {
        return chunk.get(localRow, localCol);
      }
    ).filter((cell) => cell !== null) as GridCell[];
  }
}

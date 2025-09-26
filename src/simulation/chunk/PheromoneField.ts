import type { PheromoneTypeId } from "@simulation/types/PheromoneTypes";

import { BaseGrid } from "./BaseGrid";
import { PheromoneChunk } from "./PheromoneChunk";

export class PheromoneField extends BaseGrid<PheromoneChunk> {
  protected createChunk(rows: number, cols: number): PheromoneChunk {
    return new PheromoneChunk(rows, cols);
  }

  getStrength(row: number, col: number, typeId: PheromoneTypeId): number {
    const chunk = this.getChunk(row, col);
    if (!chunk) return 0;

    const { localRow, localCol } = this.getChunkIndices(row, col);

    return chunk.get(localRow, localCol, typeId);
  }

  addStrength(row: number, col: number, typeId: PheromoneTypeId, strength: number): void {
    const chunk = this.getChunk(row, col);
    if (!chunk) return;

    const { localRow, localCol } = this.getChunkIndices(row, col);

    chunk.add(localRow, localCol, typeId, strength);

    this.dirtyChunks.add(chunk);
  }

  addStrengthPx(x: number, y: number, typeId: PheromoneTypeId, strength: number): void {
    const { row, col } = this.pixelsToGrid(x, y);
    this.addStrength(row, col, typeId, strength);
  }

  update(deltaTime: number): void {
    const chunksToUpdate = Array.from(this.dirtyChunks);

    this.dirtyChunks.clear();

    for (const chunk of chunksToUpdate) {
      chunk.update(deltaTime);

      if (chunk.dirty) {
        this.dirtyChunks.add(chunk);
      }
    }
  }
}

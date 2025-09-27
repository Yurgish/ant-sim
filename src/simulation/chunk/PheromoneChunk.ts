import { MIN_PHEROMONE_THRESHOLD, PHEROMONE_EVAPORATION_RATE } from "@simulation/constants/pheromones";
import { PHEROMONE_TYPES, type PheromoneTypeId } from "@simulation/types/PheromoneTypes";

import { BaseChunk } from "./BaseChunk"; // Припустимо, BaseChunk.getIndex тепер public

export class PheromoneChunk extends BaseChunk {
  pheromoneData: Map<PheromoneTypeId, Float32Array> = new Map();

  constructor(rows: number, cols: number) {
    super(rows, cols);
    const typeIds = Object.values(PHEROMONE_TYPES) as PheromoneTypeId[];
    for (const typeId of typeIds) {
      this.pheromoneData.set(typeId, new Float32Array(rows * cols));
    }
  }

  getStrengthByType(typeId: PheromoneTypeId, index: number): number {
    return this.pheromoneData.get(typeId)?.[index] ?? 0;
  }

  get(r: number, c: number, typeId: PheromoneTypeId): number {
    if (r < 0 || c < 0 || r >= this.rows || c >= this.cols) return 0;
    const i = this.getIndex(r, c);
    return this.getStrengthByType(typeId, i);
  }

  add(r: number, c: number, typeId: PheromoneTypeId, strength: number) {
    if (r < 0 || c < 0 || r >= this.rows || c >= this.cols) return;
    const data = this.pheromoneData.get(typeId);
    if (!data) return;

    const i = this.getIndex(r, c);
    data[i] = strength;
    this.setDirty();
  }

  update(deltaTime: number): void {
    if (!this.dirty) return;

    const evaporation = Math.pow(PHEROMONE_EVAPORATION_RATE, deltaTime * 60);
    let hasSignificantPheromones = false;

    for (const data of this.pheromoneData.values()) {
      for (let i = 0; i < data.length; i++) {
        data[i] *= evaporation;

        if (data[i] < MIN_PHEROMONE_THRESHOLD) {
          data[i] = 0;
        } else {
          hasSignificantPheromones = true;
        }
      }
    }

    if (!hasSignificantPheromones) {
      this.clearDirty();
    }
  }
}

import type { PheromoneChunk } from "@simulation/chunk/PheromoneChunk";
import type { PheromoneField } from "@simulation/chunk/PheromoneField";
import { MAX_PHEROMONE_THRESHOLD, MIN_PHEROMONE_THRESHOLD, PHEROMONE_SIZE } from "@simulation/constants/constants";
import { PHEROMONE_COLORS_MAP } from "@simulation/constants/pheromones";
import { PHEROMONE_TYPES, type PheromoneTypeId } from "@simulation/types/PheromoneTypes";
import { Particle, ParticleContainer, Texture } from "pixi.js";

type PheromoneVisuals = Map<PheromoneTypeId, (Particle | null)[]>;

export class PheromoneRenderer {
  private container: ParticleContainer;
  private field: PheromoneField;
  private cellSize: number;
  private chunkVisuals: Map<PheromoneChunk, PheromoneVisuals> = new Map();

  constructor(field: PheromoneField, cellSize: number) {
    this.field = field;
    this.cellSize = cellSize;

    this.container = new ParticleContainer({
      dynamicProperties: {
        position: false,
        alpha: true,
        scale: false,
        tint: true,
      },
    });

    this.initializeVisuals();
  }

  private initializeVisuals(): void {
    const typeIds = Object.values(PHEROMONE_TYPES) as PheromoneTypeId[];

    for (let r = 0; r < this.field.chunkRows; r++) {
      for (let c = 0; c < this.field.chunkCols; c++) {
        const chunk = this.field.chunks[r][c];
        const size = chunk.rows * chunk.cols;

        const chunkMap: PheromoneVisuals = new Map();

        for (const typeId of typeIds) {
          chunkMap.set(typeId, new Array(size).fill(null));
        }

        this.chunkVisuals.set(chunk, chunkMap);
      }
    }
  }

  update(deltaMS: number): void {
    const deltaSeconds = deltaMS / 1000;

    const chunksToRender = Array.from(this.field.dirtyChunks);

    this.field.update(deltaSeconds);

    for (const chunk of chunksToRender) {
      this.updateChunkVisual(chunk);
    }
  }

  private updateChunkVisual(chunk: PheromoneChunk): void {
    const visualsMap = this.chunkVisuals.get(chunk);
    if (!visualsMap) return;

    const startRow = chunk.globalRow * this.field.chunkSize;
    const startCol = chunk.globalCol * this.field.chunkSize;

    const typeIds = Object.values(PHEROMONE_TYPES) as PheromoneTypeId[];

    for (let r = 0; r < chunk.rows; r++) {
      for (let c = 0; c < chunk.cols; c++) {
        const i = chunk.getIndex(r, c);
        const globalRow = startRow + r;
        const globalCol = startCol + c;

        for (const typeId of typeIds) {
          const strength = chunk.getStrengthByType(typeId, i);
          const color = PHEROMONE_COLORS_MAP[typeId];
          const particlesArray = visualsMap.get(typeId)!;

          this.processPheromone(globalRow, globalCol, i, strength, color, particlesArray);
        }
      }
    }
  }

  private processPheromone(
    globalRow: number,
    globalCol: number,
    localIndex: number,
    strength: number,
    color: number,
    particlesArray: (Particle | null)[]
  ): void {
    let particle = particlesArray[localIndex];
    const isVisible = strength > MIN_PHEROMONE_THRESHOLD;

    if (isVisible) {
      if (!particle) {
        particle = new Particle(Texture.WHITE);
        particle.x = globalCol * this.cellSize + this.cellSize / 2;
        particle.y = globalRow * this.cellSize + this.cellSize / 2;
        particle.scaleX = this.cellSize * PHEROMONE_SIZE;
        particle.scaleY = this.cellSize * PHEROMONE_SIZE;
        particle.anchorX = 0.5;
        particle.anchorY = 0.5;
        this.container.addParticle(particle);
        particlesArray[localIndex] = particle;
      }

      const normalized = Math.min(strength, MAX_PHEROMONE_THRESHOLD) / MAX_PHEROMONE_THRESHOLD;
      particle.alpha = MIN_PHEROMONE_THRESHOLD + normalized * (1.0 - MIN_PHEROMONE_THRESHOLD);
      particle.tint = color;
    } else if (particle) {
      this.container.removeParticle(particle);
      particlesArray[localIndex] = null; // Очищаємо посилання
    }
  }

  getContainer() {
    return this.container;
  }

  destroy(): void {
    this.chunkVisuals.clear();
    this.container.destroy({ children: true });
  }
}

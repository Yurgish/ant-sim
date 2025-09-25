import type { Grid } from "@simulation/chunk/Grid";
import type { GridCell, GridChunk } from "@simulation/chunk/GridChunk";
import { DEBUG_ENABLED } from "@simulation/constants/constants";
import { GRID_ALPHA, GRID_COLORS, MAX_FOOD_PER_CELL } from "@simulation/constants/grid";
import { Particle, ParticleContainer, Texture } from "pixi.js";

type CellParticleMap = Map<GridChunk, (Particle | null)[]>;

export class GridRenderer {
  private container: ParticleContainer;
  private debugContainer: ParticleContainer;

  private grid: Grid;
  private cellParticles: CellParticleMap = new Map();
  private debugParticles: Map<GridChunk, Particle> = new Map();

  constructor(grid: Grid) {
    this.grid = grid;

    this.container = new ParticleContainer({
      dynamicProperties: {
        position: false,
        alpha: true,
        scale: false,
        tint: true,
      },
    });

    this.debugContainer = new ParticleContainer({
      dynamicProperties: {
        position: false,
        alpha: true,
        scale: false,
        tint: true,
      },
    });

    this.initializeVisuals();

    if (DEBUG_ENABLED) {
      this.initializeDebugParticles();
    }
  }

  private initializeVisuals(): void {
    for (let r = 0; r < this.grid.chunkRows; r++) {
      for (let c = 0; c < this.grid.chunkCols; c++) {
        const chunk = this.grid.chunks[r][c];
        const size = chunk.rows * chunk.cols;
        this.cellParticles.set(chunk, new Array(size).fill(null));
      }
    }
  }

  private initializeDebugParticles(): void {
    for (let r = 0; r < this.grid.chunkRows; r++) {
      for (let c = 0; c < this.grid.chunkCols; c++) {
        const chunk = this.grid.chunks[r][c];

        const startX = c * this.grid.chunkSize * this.grid.cellSize;
        const startY = r * this.grid.chunkSize * this.grid.cellSize;
        const chunkWidth = this.grid.chunkSize * this.grid.cellSize;
        const chunkHeight = this.grid.chunkSize * this.grid.cellSize;

        const debugParticle = new Particle(Texture.WHITE);
        debugParticle.x = startX;
        debugParticle.y = startY;
        debugParticle.scaleX = chunkWidth;
        debugParticle.scaleY = chunkHeight;
        debugParticle.anchorX = 0;
        debugParticle.anchorY = 0;
        debugParticle.alpha = 0.5; // базова прозорість
        debugParticle.tint = 0x4444ff; // базовий колір — синій

        this.debugContainer.addParticle(debugParticle);
        this.debugParticles.set(chunk, debugParticle);
      }
    }
  }

  update(): void {
    const chunksToRender = Array.from(this.grid.dirtyChunks);

    // 🔹 завжди показуємо всі чанки, dirty робимо червоними
    if (DEBUG_ENABLED) {
      for (const [chunk, particle] of this.debugParticles.entries()) {
        if (this.grid.dirtyChunks.has(chunk)) {
          particle.alpha = 0.4;
          particle.tint = 0xff0000;
          console.log("Marked dirty for eat at row/col:", chunk.globalRow, chunk.globalCol);
        } else {
          particle.alpha = 0.5;
          particle.tint = 0x4444ff;
        }
      }
    }

    for (const chunk of chunksToRender) {
      this.updateChunkVisual(chunk);
    }
  }

  private updateChunkVisual(chunk: GridChunk): void {
    const particlesArray = this.cellParticles.get(chunk);
    if (!particlesArray) return;

    const startRow = chunk.globalRow * this.grid.chunkSize;
    const startCol = chunk.globalCol * this.grid.chunkSize;

    for (let r = 0; r < chunk.rows; r++) {
      for (let c = 0; c < chunk.cols; c++) {
        const i = chunk.getIndex(r, c);
        const cell = chunk.get(r, c);
        if (!cell) continue;

        const globalRow = startRow + r;
        const globalCol = startCol + c;
        const particle = particlesArray[i];

        this.processCell(globalRow, globalCol, cell, i, particle, particlesArray);
      }
    }
  }

  private processCell(
    globalRow: number,
    globalCol: number,
    cell: GridCell,
    localIndex: number,
    particle: Particle | null,
    particlesArray: (Particle | null)[]
  ): void {
    let color: number = GRID_COLORS.EMPTY;
    let alpha: number = GRID_ALPHA.EMPTY_CELL;

    if (cell.isNest) {
      color = GRID_COLORS.NEST;
      alpha = GRID_ALPHA.FILLED_CELL;
    } else if (cell.obstacle) {
      color = GRID_COLORS.OBSTACLE;
      alpha = GRID_ALPHA.FILLED_CELL;
    } else if (cell.food > 0) {
      color = GRID_COLORS.FOOD;
      alpha = Math.min(GRID_ALPHA.FILLED_CELL, cell.food / MAX_FOOD_PER_CELL);
    }

    const isVisible = cell.isNest || cell.obstacle || cell.food > 0;

    if (isVisible) {
      if (!particle) {
        particle = new Particle(Texture.WHITE);
        particle.x = globalCol * this.grid.cellSize;
        particle.y = globalRow * this.grid.cellSize;
        particle.scaleX = this.grid.cellSize;
        particle.scaleY = this.grid.cellSize;
        particle.anchorX = 0;
        particle.anchorY = 0;
        this.container.addParticle(particle);
        particlesArray[localIndex] = particle;
      }

      particle.tint = color;
      particle.alpha = alpha;
    } else if (particle) {
      this.container.removeParticle(particle);
      particlesArray[localIndex] = null;
    }
  }

  getContainer(): ParticleContainer {
    return this.container;
  }

  getDebugContainer(): ParticleContainer {
    return this.debugContainer;
  }

  destroy(): void {
    this.cellParticles.clear();
    this.container.destroy({ children: true });
  }
}

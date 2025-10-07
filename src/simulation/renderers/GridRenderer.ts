import type { Grid } from "@simulation/chunk/Grid";
import type { GridCell, GridChunk } from "@simulation/chunk/GridChunk";
import { DEBUG_ENABLED, GRID_UPDATE_INTERVAL_FRAMES } from "@simulation/constants/constants";
import { GRID_ALPHA, GRID_COLORS, MAX_FOOD_PER_CELL } from "@simulation/constants/grid";
import { Container, Particle, ParticleContainer, Sprite, Texture } from "pixi.js";

import { GridBackgroundRenderer } from "./GridBackgroundRenderer";

type CellParticleMap = Map<GridChunk, (Particle | null)[]>;

export class GridRenderer {
  private container: ParticleContainer;
  private debugContainer: Container;

  private backgroundRenderer: GridBackgroundRenderer;

  private grid: Grid;
  private cellParticles: CellParticleMap = new Map();
  private debugParticles: Map<GridChunk, Sprite> = new Map();

  // Frame-based update optimization
  private frameCounter: number = 0;
  private updateInterval: number = GRID_UPDATE_INTERVAL_FRAMES;

  constructor(grid: Grid, tileTexture: Texture) {
    this.grid = grid;

    this.backgroundRenderer = new GridBackgroundRenderer(
      tileTexture,
      grid.cellSize,
      grid.cols * grid.cellSize,
      grid.rows * grid.cellSize
    );

    this.container = new ParticleContainer({
      dynamicProperties: {
        position: false,
        alpha: true,
        scale: false,
        tint: true,
      },
    });

    this.debugContainer = new Container();
    this.debugContainer.zIndex = 1000;

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

        const debugParticle = new Sprite(Texture.WHITE);
        debugParticle.x = startX;
        debugParticle.y = startY;
        debugParticle.width = chunkWidth;
        debugParticle.height = chunkHeight;
        debugParticle.alpha = 0.01;
        debugParticle.tint = 0x4444ff;

        this.debugContainer.addChild(debugParticle);
        this.debugParticles.set(chunk, debugParticle);
      }
    }
  }

  update(): void {
    this.frameCounter++;

    // Only update visuals at the specified interval
    if (this.frameCounter >= this.updateInterval) {
      this.frameCounter = 0;

      const chunksToRender = Array.from(this.grid.dirtyChunks);

      if (DEBUG_ENABLED) {
        for (const [chunk, particle] of this.debugParticles.entries()) {
          if (chunksToRender.includes(chunk)) {
            particle.alpha = 0.4;
            particle.tint = 0xff0000;
          } else {
            particle.alpha = 0.01;
            particle.tint = 0x4444ff;
          }
        }
      }

      for (const chunk of chunksToRender) {
        this.updateChunkVisual(chunk);
        chunk.clearDirty();
      }
      this.grid.dirtyChunks.clear();
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

  /**
   * Set how often the grid should update visually
   * @param frames - Number of frames between updates (1 = every frame, 2 = every 2nd frame, etc.)
   */
  setUpdateInterval(frames: number): void {
    this.updateInterval = Math.max(1, frames);
  }

  /**
   * Force immediate visual update regardless of frame counter
   */
  forceUpdate(): void {
    this.frameCounter = this.updateInterval; // Will trigger update on next call
  }

  getContainer(): ParticleContainer {
    return this.container;
  }

  getDebugContainer(): Container {
    return this.debugContainer;
  }

  getBackgroundContainer(): Container {
    return this.backgroundRenderer.getContainer();
  }

  destroy(): void {
    this.cellParticles.clear();
    this.debugParticles.clear();
    this.backgroundRenderer.destroy();
    this.debugContainer.destroy({ children: true });
    this.container.destroy({ children: true });
  }
}

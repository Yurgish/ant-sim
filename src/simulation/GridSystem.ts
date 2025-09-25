import { Container, Particle, ParticleContainer, Texture } from "pixi.js";

import { ALPHA, COLORS, MAX_FOOD_PER_CELL } from "./constants/constants";
import { Grid } from "./Grid";
import type { Cell, CellParticle, CellType } from "./types";

export class GridSystem {
  container: Container;
  grid: Grid;
  particleContainer: ParticleContainer;
  particles: Map<string, CellParticle> = new Map();

  constructor(width: number, height: number, cellSize: number) {
    this.grid = new Grid(width, height, cellSize);
    this.container = new Container();

    this.particleContainer = new ParticleContainer({
      dynamicProperties: {
        position: false,
        alpha: true,
        scale: false,
        tint: true,
      },
    });

    this.container.addChild(this.particleContainer);
  }

  ensureParticle(row: number, col: number): CellParticle {
    const key = `${row}-${col}`;
    let cellParticle = this.particles.get(key);

    if (!cellParticle) {
      const x = col * this.grid.cellSize;
      const y = row * this.grid.cellSize;

      const particle = new Particle(Texture.WHITE);
      particle.x = x;
      particle.y = y;
      particle.scaleX = this.grid.cellSize;
      particle.scaleY = this.grid.cellSize;
      particle.anchorX = 0;
      particle.anchorY = 0;

      this.particleContainer.addParticle(particle);

      cellParticle = {
        particle,
        row,
        col,
        type: "empty",
      };

      this.particles.set(key, cellParticle);
    }

    return cellParticle;
  }

  removeParticleIfEmpty(row: number, col: number) {
    const key = `${row}-${col}`;
    const cellParticle = this.particles.get(key);
    const cell = this.grid.cells[row][col];

    if (cellParticle && !cell.isNest && !cell.obstacle && cell.food <= 0) {
      this.particleContainer.removeParticle(cellParticle.particle);
      this.particles.delete(key);
    }
  }

  updateParticle(cellParticle: CellParticle, cell: Cell) {
    let type: CellType = "empty";
    let color: number = COLORS.EMPTY;
    let alpha: number = ALPHA.EMPTY_CELL;

    if (cell.isNest) {
      type = "nest";
      color = COLORS.NEST;
      alpha = ALPHA.FILLED_CELL;
    } else if (cell.obstacle) {
      type = "obstacle";
      color = COLORS.OBSTACLE;
      alpha = ALPHA.FILLED_CELL;
    } else if (cell.food > 0) {
      type = "food";
      color = COLORS.FOOD;
      alpha = Math.min(ALPHA.FILLED_CELL, cell.food / MAX_FOOD_PER_CELL);
    }

    cellParticle.type = type;
    cellParticle.particle.tint = color;
    cellParticle.particle.alpha = alpha;
  }

  setCellTypeAtPosition(x: number, y: number, type: CellType) {
    const col = Math.floor(x / this.grid.cellSize);
    const row = Math.floor(y / this.grid.cellSize);

    if (row >= 0 && row < this.grid.rows && col >= 0 && col < this.grid.cols) {
      const cell = this.grid.cells[row][col];

      switch (type) {
        case "food":
          cell.food = MAX_FOOD_PER_CELL;
          cell.obstacle = false;
          cell.isNest = false;
          break;
        case "obstacle":
          cell.obstacle = true;
          cell.food = 0;
          cell.isNest = false;
          break;
        case "nest":
          cell.isNest = true;
          cell.food = 0;
          cell.obstacle = false;
          break;
        case "empty":
          cell.food = 0;
          cell.obstacle = false;
          cell.isNest = false;
          break;
      }

      // Create or update particle only if needed
      if (type !== "empty") {
        const cellParticle = this.ensureParticle(row, col);
        this.updateParticle(cellParticle, cell);
      } else {
        this.removeParticleIfEmpty(row, col);
      }
    }
  }

  setCellTypeInRadius(centerX: number, centerY: number, radius: number, type: CellType) {
    const cellSize = this.grid.cellSize;
    const startCol = Math.max(0, Math.floor((centerX - radius) / cellSize));
    const endCol = Math.min(this.grid.cols - 1, Math.floor((centerX + radius) / cellSize));
    const startRow = Math.max(0, Math.floor((centerY - radius) / cellSize));
    const endRow = Math.min(this.grid.rows - 1, Math.floor((centerY + radius) / cellSize));

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const cellCenterX = col * cellSize + cellSize / 2;
        const cellCenterY = row * cellSize + cellSize / 2;
        const distance = Math.sqrt(Math.pow(cellCenterX - centerX, 2) + Math.pow(cellCenterY - centerY, 2));

        if (distance <= radius) {
          const cell = this.grid.cells[row][col];

          switch (type) {
            case "food":
              cell.food = MAX_FOOD_PER_CELL;
              cell.obstacle = false;
              cell.isNest = false;
              break;
            case "obstacle":
              cell.obstacle = true;
              cell.food = 0;
              cell.isNest = false;
              break;
            case "nest":
              cell.isNest = true;
              cell.food = 0;
              cell.obstacle = false;
              break;
            case "empty":
              cell.food = 0;
              cell.obstacle = false;
              cell.isNest = false;
              break;
          }

          // Create or update particle only if needed
          if (type !== "empty") {
            const cellParticle = this.ensureParticle(row, col);
            this.updateParticle(cellParticle, cell);
          } else {
            this.removeParticleIfEmpty(row, col);
          }
        }
      }
    }
  }

  update() {
    // This method can be left empty or removed,
    // since updates happen during interactions
  }

  // Updates specific cell (called when ant consumes food)
  updateCell(row: number, col: number) {
    if (row >= 0 && row < this.grid.rows && col >= 0 && col < this.grid.cols) {
      const cell = this.grid.cells[row][col];
      const key = `${row}-${col}`;
      const cellParticle = this.particles.get(key);

      if (cellParticle) {
        this.updateParticle(cellParticle, cell);
        // Remove particle if cell became empty
        if (!cell.isNest && !cell.obstacle && cell.food <= 0) {
          this.removeParticleIfEmpty(row, col);
        }
      }
    }
  }

  // Updates all existing particles (rarely used)
  updateAllParticles() {
    for (const [, cellParticle] of this.particles) {
      const cell = this.grid.cells[cellParticle.row][cellParticle.col];
      this.updateParticle(cellParticle, cell);
    }
  }

  destroy() {
    this.particles.clear();
    this.particleContainer.destroy();
    this.container.destroy();
  }
}

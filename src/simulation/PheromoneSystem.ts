import { Particle, ParticleContainer, Texture } from "pixi.js";

import {
  ALPHA,
  BASE_PHEROMONE_STRENGTH,
  COLORS,
  MAX_PHEROMONE_THRESHOLD,
  MAX_PHEROMONES,
  PHEROMONE_SIZE,
} from "./constants/constants";
import { Grid } from "./Grid";
import type { PheromoneParticle, PheromoneType } from "./types";
import { GridUtils } from "./utils";

export class PheromoneSystem {
  container: ParticleContainer;
  pheromones: Map<string, PheromoneParticle> = new Map(); // key: `${row}-${col}-${type}`
  cellSize: number;
  grid: Grid;

  constructor(cellSize: number, grid: Grid) {
    this.cellSize = cellSize;
    this.grid = grid;

    this.container = new ParticleContainer({
      dynamicProperties: {
        position: false,
        alpha: true,
        scale: false,
        tint: true,
      },
    });
  }

  // Add pheromone only to Grid, visualization will update in update()
  add(x: number, y: number, type: PheromoneType, strength: number = BASE_PHEROMONE_STRENGTH): void {
    const { row, col } = GridUtils.getGridPosition(x, y, this.cellSize);
    if (!GridUtils.isInBounds(row, col, this.grid.rows, this.grid.cols)) return;

    const cell = this.grid.cells[row][col];
    const oldValue = type === "food" ? cell.pheromones.food : cell.pheromones.home;
    const newValue = Math.min(oldValue + strength, MAX_PHEROMONE_THRESHOLD);

    if (type === "food") cell.pheromones.food = newValue;
    else cell.pheromones.home = newValue;

    this.updateVisualPheromone(row, col, type, newValue);
  }

  // Reinforce pheromone in Grid
  reinforce(x: number, y: number, type: PheromoneType, amount: number = 0.1): void {
    const { row, col } = GridUtils.getGridPosition(x, y, this.cellSize);
    if (!GridUtils.isInBounds(row, col, this.grid.rows, this.grid.cols)) return;

    const cell = this.grid.cells[row][col];
    const oldValue = type === "food" ? cell.pheromones.food : cell.pheromones.home;
    const newValue = Math.min(oldValue + amount, MAX_PHEROMONE_THRESHOLD);

    if (type === "food") cell.pheromones.food = newValue;
    else cell.pheromones.home = newValue;

    this.updateVisualPheromone(row, col, type, newValue);
  }

  // Synchronize with Grid and update visualization
  update(deltaTime: number = 1 / 60): void {
    // First update pheromones in Grid (call Grid.updateAll)
    this.grid.updateAll(deltaTime);

    // Now synchronize visualization with Grid
    this.syncWithGrid();
  }

  private syncWithGrid(): void {
    const toRemove: string[] = [];

    // First check existing visual pheromones
    for (const [key] of this.pheromones) {
      const [row, col, type] = key.split("-");
      const r = parseInt(row),
        c = parseInt(col);
      const cell = this.grid.cells[r][c];

      const currentValue = type === "food" ? cell.pheromones.food : cell.pheromones.home;

      if (currentValue < ALPHA.MIN_PHEROMONE) {
        // Pheromone disappeared - remove visual
        toRemove.push(key);
      } else {
        // Update visual pheromone
        this.updateVisualPheromone(r, c, type as PheromoneType, currentValue);
      }
    }

    // Remove weak visual pheromones
    for (const key of toRemove) {
      const phero = this.pheromones.get(key);
      if (phero) {
        this.container.removeParticle(phero.particle);
        this.pheromones.delete(key);
      }
    }

    // Now check all Grid cells for new pheromones
    for (let row = 0; row < this.grid.rows; row++) {
      for (let col = 0; col < this.grid.cols; col++) {
        const cell = this.grid.cells[row][col];

        // Check food pheromones
        if (cell.pheromones.food >= ALPHA.MIN_PHEROMONE) {
          const foodKey = `${row}-${col}-food`;
          if (!this.pheromones.has(foodKey)) {
            this.updateVisualPheromone(row, col, "food", cell.pheromones.food);
          }
        }

        // Check home pheromones
        if (cell.pheromones.home >= ALPHA.MIN_PHEROMONE) {
          const homeKey = `${row}-${col}-home`;
          if (!this.pheromones.has(homeKey)) {
            this.updateVisualPheromone(row, col, "home", cell.pheromones.home);
          }
        }
      }
    }
  }

  private updateVisualPheromone(row: number, col: number, type: PheromoneType, intensity: number): void {
    if (intensity < ALPHA.MIN_PHEROMONE || this.pheromones.size >= MAX_PHEROMONES) return;

    const key = `${row}-${col}-${type}`;
    let phero = this.pheromones.get(key);

    const x = col * this.cellSize + this.cellSize / 2;
    const y = row * this.cellSize + this.cellSize / 2;

    if (!phero) {
      const particle = new Particle(Texture.WHITE);
      particle.x = x;
      particle.y = y;
      particle.scaleX = this.cellSize * PHEROMONE_SIZE;
      particle.scaleY = this.cellSize * PHEROMONE_SIZE;
      particle.anchorX = 0.5;
      particle.anchorY = 0.5;

      this.container.addParticle(particle);

      phero = { particle, x, y, type, intensity };
      this.pheromones.set(key, phero);
    }

    const normalized = 0.1 + (Math.min(intensity, MAX_PHEROMONE_THRESHOLD) / MAX_PHEROMONE_THRESHOLD) * 0.9;
    phero.particle.alpha = normalized;
    phero.particle.tint = type === "food" ? COLORS.PHEROMONE_FOOD : COLORS.PHEROMONE_HOME;
    phero.intensity = intensity;
  }

  destroy(): void {
    this.pheromones.clear();
    this.container.destroy();
  }
}

import { Particle, ParticleContainer, Texture } from "pixi.js";

import {
  COLORS,
  MAX_PHEROMONES,
  MIN_PHEROMONE_THRESHOLD,
  PHEROMONE_EVAPORATION_RATE,
  PHEROMONE_INCREMENT,
  PHEROMONE_STRENGTH,
} from "./constants";
import { Grid } from "./Grid";
import type { PheromoneParticle, PheromoneType, Vector2D } from "./types";
import { PheromoneUtils } from "./utils";

export class PheromoneSystem {
  container: ParticleContainer;
  pheromones: PheromoneParticle[] = [];
  cellSize: number;
  grid: Grid | null = null;

  constructor(cellSize: number, grid?: Grid) {
    this.cellSize = cellSize;
    this.grid = grid || null;

    this.container = new ParticleContainer({
      dynamicProperties: {
        position: false,
        alpha: true,
        scale: false,
        tint: true,
      },
    });
  }

  add(x: number, y: number, type: PheromoneType): void {
    const cellCenter = this.getCellCenter(x, y);

    // Додаємо феромон в Grid якщо він доступний
    if (this.grid) {
      this.grid.addPheromone(x, y, type, PHEROMONE_STRENGTH);
    }

    const existing = this.findExistingPheromone(cellCenter, type);

    if (existing) {
      this.strengthenPheromone(existing);
      return;
    }

    if (this.pheromones.length >= MAX_PHEROMONES) {
      this.removeWeakestPheromone();
    }

    this.createNewPheromone(cellCenter, type);
  }

  // Додавання феромону їжі з інформацією про позицію їжі
  addFoodPheromone(x: number, y: number, foodPosition: Vector2D): void {
    const cellCenter = this.getCellCenter(x, y);

    if (this.grid) {
      this.grid.addFoodPheromone(x, y, PHEROMONE_STRENGTH, foodPosition);
    }

    const existing = this.findExistingPheromone(cellCenter, "food");

    if (existing) {
      this.strengthenPheromone(existing);
      return;
    }

    if (this.pheromones.length >= MAX_PHEROMONES) {
      this.removeWeakestPheromone();
    }

    this.createNewPheromone(cellCenter, "food");
  }

  private getCellCenter(x: number, y: number): Vector2D {
    return {
      x: Math.floor(x / this.cellSize) * this.cellSize + this.cellSize / 2,
      y: Math.floor(y / this.cellSize) * this.cellSize + this.cellSize / 2,
    };
  }

  private findExistingPheromone(position: Vector2D, type: PheromoneType): PheromoneParticle | null {
    return (
      this.pheromones.find(
        (p) => Math.abs(p.x - position.x) < 1 && Math.abs(p.y - position.y) < 1 && p.type === type
      ) || null
    );
  }

  private strengthenPheromone(pheromone: PheromoneParticle): void {
    pheromone.intensity = Math.min(1, pheromone.intensity + PHEROMONE_INCREMENT);
    pheromone.particle.alpha = pheromone.intensity;
  }

  private removeWeakestPheromone(): void {
    const weakest = this.pheromones.reduce((min, p) => (p.intensity < min.intensity ? p : min));

    const index = this.pheromones.indexOf(weakest);
    this.container.removeParticle(weakest.particle);
    this.pheromones.splice(index, 1);
  }

  private createNewPheromone(position: Vector2D, type: PheromoneType): void {
    const particle = new Particle(Texture.WHITE);
    particle.x = position.x;
    particle.y = position.y;
    particle.scaleX = this.cellSize / 1.5;
    particle.scaleY = this.cellSize / 1.5;
    particle.anchorX = 0.5;
    particle.anchorY = 0.5;
    particle.alpha = 1;
    particle.tint = type === "food" ? COLORS.PHEROMONE_FOOD : COLORS.PHEROMONE_HOME;

    this.container.addParticle(particle);

    this.pheromones.push({
      particle,
      x: position.x,
      y: position.y,
      type,
      intensity: 1,
    });
  }

  update(deltaTime: number = 1 / 60): void {
    for (let i = this.pheromones.length - 1; i >= 0; i--) {
      const pheromone = this.pheromones[i];

      // Випаровування
      pheromone.intensity *= Math.pow(PHEROMONE_EVAPORATION_RATE, deltaTime * 60);
      pheromone.particle.alpha = pheromone.intensity;

      // Видалення слабких феромонів
      if (PheromoneUtils.shouldEvaporate(pheromone.intensity, MIN_PHEROMONE_THRESHOLD)) {
        this.container.removeParticle(pheromone.particle);
        this.pheromones.splice(i, 1);
      }
    }
  }

  sense(
    position: Vector2D,
    direction: Vector2D,
    fov: number,
    distance: number,
    type: PheromoneType
  ): PheromoneParticle | null {
    let best: PheromoneParticle | null = null;
    let bestIntensity = 0;

    for (const pheromone of this.pheromones) {
      if (pheromone.type !== type) continue;

      const pheromonePos = { x: pheromone.x, y: pheromone.y };
      const dist = PheromoneUtils.calculateDistance(position, pheromonePos);

      if (dist > distance) continue;

      const toPhero = PheromoneUtils.calculateDirection(position, pheromonePos);
      const angle = Math.acos(Math.max(-1, Math.min(1, toPhero.x * direction.x + toPhero.y * direction.y)));

      if (angle > fov / 2) continue;

      if (pheromone.intensity > bestIntensity) {
        bestIntensity = pheromone.intensity;
        best = pheromone;
      }
    }

    return best;
  }

  destroy(): void {
    this.pheromones.length = 0;
    this.container.destroy();
  }
}

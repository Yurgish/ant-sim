import { Particle, ParticleContainer, Texture } from "pixi.js";

export type PheromoneType = "food" | "home";

export class PheromoneSystem {
  container: ParticleContainer;
  pheromones: { particle: Particle; x: number; y: number; type: PheromoneType; intensity: number }[] = [];

  evaporation = 0.995;
  cellSize: number;
  maxPheromones = 10000;

  constructor(cellSize: number = 10) {
    this.cellSize = cellSize;
    this.container = new ParticleContainer({
      dynamicProperties: {
        position: false,
        alpha: true,
        scale: false,
        tint: true,
      },
    });
  }

  add(x: number, y: number, type: PheromoneType) {
    const gridX = Math.floor(x / this.cellSize) * this.cellSize + this.cellSize / 2;
    const gridY = Math.floor(y / this.cellSize) * this.cellSize + this.cellSize / 2;

    const existing = this.pheromones.find(
      (p) => Math.abs(p.x - gridX) < 1 && Math.abs(p.y - gridY) < 1 && p.type === type
    );

    if (existing) {
      existing.intensity = Math.min(1, existing.intensity + 0.2); // Збільшуємо приріст
      existing.particle.alpha = existing.intensity;
      return;
    }

    // Перевіряємо ліміт
    if (this.pheromones.length >= this.maxPheromones) {
      // Видаляємо найслабший феромон
      const weakest = this.pheromones.reduce((min, p) => (p.intensity < min.intensity ? p : min));
      const index = this.pheromones.indexOf(weakest);
      this.container.removeParticle(weakest.particle);
      this.pheromones.splice(index, 1);
    }

    const particle = new Particle(Texture.WHITE);
    particle.x = gridX;
    particle.y = gridY;
    particle.scaleX = this.cellSize;
    particle.scaleY = this.cellSize;
    particle.anchorX = 0.5;
    particle.anchorY = 0.5;
    particle.alpha = 1;

    if (type === "food") {
      particle.tint = 0xff0000;
    } else {
      particle.tint = 0x0000ff;
    }

    this.container.addParticle(particle);
    this.pheromones.push({ particle, x: gridX, y: gridY, type, intensity: 1 });
  }

  update(deltaTime: number = 1 / 60) {
    for (let i = this.pheromones.length - 1; i >= 0; i--) {
      const p = this.pheromones[i];
      p.intensity *= Math.pow(this.evaporation, deltaTime * 60);

      p.particle.alpha = p.intensity;

      if (p.intensity <= 0.05) {
        this.container.removeParticle(p.particle);
        this.pheromones.splice(i, 1);
      }
    }
  }

  sense(x: number, y: number, dir: { x: number; y: number }, fov: number, dist: number, type: PheromoneType) {
    let best = null;
    let bestIntensity = 0;

    for (const p of this.pheromones) {
      if (p.type !== type) continue;

      const dx = p.x - x;
      const dy = p.y - y;
      const d = Math.hypot(dx, dy);
      if (d > dist) continue;

      const angle = Math.acos((dx * dir.x + dy * dir.y) / (d || 1));
      if (angle > fov / 2) continue;

      if (p.intensity > bestIntensity) {
        bestIntensity = p.intensity;
        best = p;
      }
    }
    return best;
  }
}

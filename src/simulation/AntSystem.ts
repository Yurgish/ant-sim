import { ParticleContainer, Texture } from "pixi.js";

import { Ant } from "./Ant";

export class AntSystem {
  container: ParticleContainer;
  ants: Ant[];
  private antTexture: Texture;
  private gridWidth: number;
  private gridHeight: number;
  private nestPosition: { x: number; y: number } | null = null;

  constructor(antTexture: Texture, gridWidth: number, gridHeight: number) {
    this.antTexture = antTexture;
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.ants = [];

    this.container = new ParticleContainer({
      dynamicProperties: {
        position: true,
        rotation: true,
        scale: false,
        color: false,
      },
    });
  }

  addAnt(): Ant {
    const spawnX = this.nestPosition ? this.nestPosition.x : this.gridWidth / 2;
    const spawnY = this.nestPosition ? this.nestPosition.y : this.gridHeight / 2;

    const ant = new Ant(spawnX, spawnY, this.antTexture);
    this.ants.push(ant);
    this.container.addParticle(ant.particle);
    return ant;
  }

  removeAnt(ant: Ant) {
    const index = this.ants.indexOf(ant);
    if (index !== -1) {
      this.container.removeParticle(ant.particle);
      this.ants.splice(index, 1);
    }
  }

  setCount(newCount: number) {
    const currentCount = this.ants.length;

    if (newCount === currentCount) return;

    if (newCount > currentCount) {
      for (let i = currentCount; i < newCount; i++) {
        this.addAnt();
      }
    } else {
      for (let i = currentCount - 1; i >= newCount; i--) {
        const ant = this.ants[i];
        this.removeAnt(ant);
      }
    }
  }

  update(deltaTime: number, gridWidth: number, gridHeight: number) {
    for (const ant of this.ants) {
      ant.step(gridWidth, gridHeight, deltaTime);
    }
  }

  getAntsReadyToDropPheromone(): Ant[] {
    return this.ants.filter((ant) => ant.shouldDropPheromone());
  }

  destroy() {
    this.ants.length = 0;
    this.container.destroy();
  }

  setNestPosition(x: number, y: number) {
    this.nestPosition = { x, y };
  }

  getNestPosition(): { x: number; y: number } | null {
    return this.nestPosition;
  }
}

import { Container, Texture } from "pixi.js";

import { Ant } from "./Ant";
import { Grid } from "./Grid";
import type { FoodConsumedCallback, Vector2D } from "./types";

export class AntSystem {
  container: Container;
  ants: Ant[];
  private antTexture: Texture;
  private antRedTexture: Texture; // Додаємо червону текстуру
  private gridWidth: number;
  private gridHeight: number;
  private nestPosition: Vector2D | null = null;

  constructor(antTexture: Texture, antRedTexture: Texture, gridWidth: number, gridHeight: number) {
    this.antTexture = antTexture;
    this.antRedTexture = antRedTexture;
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.ants = [];

    this.container = new Container();
  }

  addAnt(): Ant {
    const spawnX = this.nestPosition ? this.nestPosition.x : this.gridWidth / 2;
    const spawnY = this.nestPosition ? this.nestPosition.y : this.gridHeight / 2;

    const ant = new Ant(spawnX, spawnY, this.antTexture, this.antRedTexture);
    this.ants.push(ant);
    this.container.addChild(ant.sprite); // Використовуємо sprite
    return ant;
  }

  removeAnt(ant: Ant) {
    const index = this.ants.indexOf(ant);
    if (index !== -1) {
      this.container.removeChild(ant.sprite); // Використовуємо sprite
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

  update(deltaTime: number, gridWidth: number, gridHeight: number, grid?: Grid, onFoodConsumed?: FoodConsumedCallback) {
    for (const ant of this.ants) {
      ant.step(gridWidth, gridHeight, deltaTime, grid, onFoodConsumed);
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

  getNestPosition(): Vector2D | null {
    return this.nestPosition;
  }
}

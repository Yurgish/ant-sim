import type { Grid } from "@simulation/chunk/Grid";
import type { PheromoneField } from "@simulation/chunk/PheromoneField";
import type { Vector2D } from "@simulation/types";
import { Container, Texture } from "pixi.js";

import { Ant } from "./ant/Ant";
import { DEBUG_ENABLED, VISIBLE_SENSORS } from "./constants/constants";

export class Colony {
  private container: Container;
  private debugContainer: Container;
  ants: Ant[];

  private antTexture: Texture;
  private antRedTexture: Texture;
  private gridWidth: number;
  private gridHeight: number;
  private cellSize: number;
  private nestPosition: Vector2D | null = null;

  constructor(antTexture: Texture, antRedTexture: Texture, gridWidth: number, gridHeight: number, cellSize: number) {
    this.antTexture = antTexture;
    this.antRedTexture = antRedTexture;
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.cellSize = cellSize;
    this.ants = [];

    this.container = new Container();
    this.debugContainer = new Container(); // Ініціалізуємо дебаг-контейнер
    this.container.addChild(this.debugContainer);
  }

  addAnt(): Ant {
    const spawnX = this.nestPosition ? this.nestPosition.x : this.gridWidth / 2;
    const spawnY = this.nestPosition ? this.nestPosition.y : this.gridHeight / 2;

    const ant = new Ant(spawnX, spawnY, this.antTexture, this.antRedTexture, this.cellSize);

    if (this.ants.length < VISIBLE_SENSORS && DEBUG_ENABLED) {
      ant.enableDebug();
      const sensorGraphics = ant.getSensorGraphics();
      if (sensorGraphics) {
        this.debugContainer.addChild(sensorGraphics);
      }
    }

    this.ants.push(ant);
    this.container.addChild(ant.sprite);
    return ant;
  }

  removeAnt(ant: Ant): void {
    const index = this.ants.indexOf(ant);
    if (index !== -1) {
      this.container.removeChild(ant.sprite);

      const sensorGraphics = ant.getSensorGraphics();
      if (sensorGraphics && this.debugContainer.children.includes(sensorGraphics)) {
        this.debugContainer.removeChild(sensorGraphics);
      }

      this.ants.splice(index, 1);
    }
  }

  setAntCount(newCount: number): void {
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

  update(deltaTime: number, grid: Grid, pheromoneField: PheromoneField): void {
    for (const ant of this.ants) {
      ant.step(this.gridWidth, this.gridHeight, deltaTime, grid, pheromoneField);
    }
  }

  setNestPosition(x: number, y: number): void {
    this.nestPosition = { x, y };
  }

  getNestPosition(): Vector2D | null {
    return this.nestPosition;
  }

  getAntCount(): number {
    return this.ants.length;
  }

  getStats(): { total: number; searching: number; returning: number; carryingFood: number } {
    let searching = 0;
    let returning = 0;
    let carryingFood = 0;

    for (const ant of this.ants) {
      if (ant.state === "searching") searching++;
      if (ant.state === "returning") returning++;
      if (ant.carryingFood) carryingFood++;
    }

    return {
      total: this.ants.length,
      searching,
      returning,
      carryingFood,
    };
  }

  getContainer() {
    return this.container;
  }

  destroy(): void {
    this.ants.length = 0;
    this.debugContainer.destroy();
    this.container.destroy();
  }
}

import type { Grid } from "@simulation/chunk/Grid";
import type { PheromoneField } from "@simulation/chunk/PheromoneField";
import type { Vector2D } from "@simulation/types";
import { Container, Texture } from "pixi.js";

import { Ant } from "./ant/Ant";
import { AntCollisionManager } from "./ant/AntCollisionManager";
import { ANT_COLLISION_UPDATE_INTERVAL } from "./constants/ant";
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

  grid: Grid;
  pheromoneField: PheromoneField;

  private nestPosition: Vector2D | null = null;

  private collisionManager: AntCollisionManager;
  private collisionTimer: number = 0;

  constructor(
    antTexture: Texture,
    antRedTexture: Texture,
    gridWidth: number,
    gridHeight: number,
    cellSize: number,
    grid: Grid,
    pheromoneField: PheromoneField
  ) {
    this.antTexture = antTexture;
    this.antRedTexture = antRedTexture;
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.cellSize = cellSize;
    this.ants = [];
    this.grid = grid;
    this.pheromoneField = pheromoneField;

    this.collisionManager = new AntCollisionManager(cellSize, gridWidth, gridHeight, grid);

    this.container = new Container();
    this.debugContainer = new Container();
    this.container.addChild(this.debugContainer);
  }

  addAnt(): Ant {
    const spawnX = this.nestPosition ? this.nestPosition.x : this.gridWidth / 2;
    const spawnY = this.nestPosition ? this.nestPosition.y : this.gridHeight / 2;

    const ant = new Ant(
      spawnX,
      spawnY,
      this.antTexture,
      this.antRedTexture,
      this.cellSize,
      this.grid,
      this.pheromoneField
    );
    this.ants.push(ant);
    this.container.addChild(ant.sprite);
    this.collisionManager.addAnt(ant);

    if (this.ants.length < VISIBLE_SENSORS && true) {
      ant.enableDebug();
      const sensorGraphics = ant.getSensorGraphics();
      if (sensorGraphics) {
        this.debugContainer.addChild(sensorGraphics);
      }
    }

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
      this.collisionManager.removeAnt(ant);
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
    this.grid = grid;
    this.pheromoneField = pheromoneField;

    // Оновлюємо мурах
    for (const ant of this.ants) {
      ant.step(this.gridWidth, this.gridHeight, deltaTime);
    }

    // Рідше обробляємо колізії (кожні 2-3 кадри)
    this.collisionTimer += deltaTime;
    if (this.collisionTimer >= ANT_COLLISION_UPDATE_INTERVAL) {
      this.collisionManager.handleCollisions(this.ants, deltaTime);
      this.collisionTimer = 0;
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
    this.ants.forEach((ant) => this.collisionManager.removeAnt(ant));
    this.ants.length = 0;
    this.debugContainer.destroy();
    this.container.destroy();
  }
}

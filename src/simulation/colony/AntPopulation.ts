import { Ant } from "@simulation/ant/Ant";
import { AntCollisionManager } from "@simulation/ant/AntCollisionManager";
import type { Grid } from "@simulation/chunk/Grid";
import type { PheromoneField } from "@simulation/chunk/PheromoneField";
import { DEBUG_ENABLED, VISIBLE_SENSORS } from "@simulation/constants/constants";
import { Container, Texture } from "pixi.js";

import type { Nest } from "./Nest";

export interface PopulationStats {
  total: number;
  active: number;
  searching: number;
  returning: number;
  resting: number;
  carryingFood: number;
  efficiency: number;
}

export class AntPopulation {
  private ants: Ant[] = [];
  private nest: Nest;
  private collisionManager: AntCollisionManager;
  private targetCount: number;
  private cellSize: number = 10;
  private width: number = 800;
  private height: number = 600;
  private grid: Grid | null = null;
  private pheromoneField: PheromoneField | null = null;
  private antTextures: { normal: Texture; carrying: Texture } | null = null;

  private spawnTimer: number = 0;
  private spawnInterval: number = 0.08;

  private container: Container;
  private debugContainer: Container;

  constructor(nest: Nest, initialCount: number) {
    this.nest = nest;
    this.targetCount = initialCount;

    this.container = new Container();
    this.debugContainer = new Container();
    this.container.addChild(this.debugContainer);

    this.collisionManager = new AntCollisionManager(this.cellSize, this.width, this.height, {} as Grid);
  }

  initialize(
    cellSize: number,
    width: number,
    height: number,
    grid: Grid,
    pheromoneField: PheromoneField,
    antTextures: { normal: Texture; carrying: Texture }
  ): void {
    this.cellSize = cellSize;
    this.width = width;
    this.height = height;
    this.grid = grid;
    this.pheromoneField = pheromoneField;
    this.antTextures = antTextures;

    this.collisionManager = new AntCollisionManager(cellSize, width, height, grid);
  }

  update(deltaTime: number, grid: Grid, pheromoneField: PheromoneField): void {
    this.grid = grid;
    this.pheromoneField = pheromoneField;

    this.adjustPopulationGradually(deltaTime);

    const nestPosition = this.nest.getMainEntrance().position;
    for (const ant of this.ants) {
      ant.step(deltaTime, nestPosition);
    }

    const visibleAnts = this.ants.filter((ant) => ant.isVisible);
    this.collisionManager.handleCollisions(visibleAnts, deltaTime);
  }

  private adjustPopulationGradually(deltaTime: number): void {
    const currentCount = this.ants.length;

    if (currentCount < this.targetCount) {
      this.spawnTimer += deltaTime;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnAnt();
        this.spawnTimer = 0;
      }
    } else if (currentCount > this.targetCount) {
      this.removeAnt();
    }
  }

  private spawnAnt(): void {
    if (!this.grid || !this.pheromoneField || !this.antTextures) {
      console.warn("AntPopulation not properly initialized");
      return;
    }

    const spawnEntrance = this.selectSpawnEntrance();

    const ant = new Ant(
      spawnEntrance.position.x,
      spawnEntrance.position.y,
      this.antTextures.normal,
      this.antTextures.carrying,
      this.cellSize,
      this.grid,
      this.pheromoneField,
      (antId: number) => this.onFoodDelivered(antId),
      (antId: number, duration: number) => this.nest.antEnter(antId, duration),
      (antId: number) => this.onAntExit(antId)
    );

    if (this.ants.length < VISIBLE_SENSORS && DEBUG_ENABLED) {
      ant.enableDebug();
      const sensorGraphics = ant.getSensorGraphics();
      if (sensorGraphics) {
        this.debugContainer.addChild(sensorGraphics);
      }
    }

    this.ants.push(ant);
    this.container.addChild(ant.sprite);
    this.collisionManager.addAnt(ant);
  }

  private removeAnt(): void {
    const ant = this.ants.pop();
    if (ant) {
      this.container.removeChild(ant.sprite);
      this.collisionManager.removeAnt(ant);
    }
  }

  private selectSpawnEntrance() {
    return this.nest.selectExitEntrance();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private onFoodDelivered(_antId: number): void {
    this.nest.storeFood(1);
  }

  private onAntExit(antId: number): void {
    const exitPosition = this.nest.antExit(antId);

    const ant = this.ants.find((a) => a.id === antId);
    if (ant) {
      ant.sprite.x = exitPosition.x;
      ant.sprite.y = exitPosition.y;
    }
  }

  getContainer(): Container {
    return this.container;
  }

  setTargetCount(count: number): void {
    this.targetCount = count;
  }

  setSpawnInterval(interval: number): void {
    this.spawnInterval = Math.max(0.05, interval);
  }

  getCount(): number {
    return this.ants.length;
  }

  getStats(): PopulationStats {
    let active = 0,
      searching = 0,
      returning = 0,
      resting = 0,
      carryingFood = 0;

    for (const ant of this.ants) {
      if (ant.isVisible) active++;
      if (ant.state === "searching") searching++;
      if (ant.state === "returning") returning++;
      if (ant.state === "resting") resting++;
      if (ant.carryingFood) carryingFood++;
    }

    return {
      total: this.ants.length,
      active,
      searching,
      returning,
      resting,
      carryingFood,
      efficiency: this.calculateEfficiency(),
    };
  }

  private calculateEfficiency(): number {
    const nestStats = this.nest.getStats();
    return this.ants.length > 0 ? nestStats.foodDeliveryRate / this.ants.length : 0;
  }

  destroy(): void {
    this.ants.forEach((ant) => this.collisionManager.removeAnt(ant));
    this.ants = [];
    this.container.destroy();
  }
}

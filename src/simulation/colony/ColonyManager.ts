import type { Grid } from "@simulation/chunk/Grid";
import type { PheromoneField } from "@simulation/chunk/PheromoneField";
import type { Vector2D } from "@simulation/types";
import type { Texture } from "pixi.js";

import { AntPopulation } from "./AntPopulation";
import { ColonyGrowth } from "./ColonyGrowth";
import { Nest } from "./Nest";

export interface ColonyStats {
  totalAnts: number;
  activeAnts: number;
  foodStored: number;
  growthRate: number;
  efficiency: number;
}

export class ColonyManager {
  private nest: Nest;
  private population: AntPopulation;
  private growth: ColonyGrowth;
  private grid: Grid | null = null;

  private id: string;

  constructor(nestPosition: Vector2D, initialAntCount: number = 50) {
    this.id = `colony_${Math.random().toString(36).substr(2, 9)}`;
    this.nest = new Nest(nestPosition, `${this.id}_nest`);
    this.population = new AntPopulation(this.nest, initialAntCount);
    this.growth = new ColonyGrowth(this.nest, this.population);
  }

  update(deltaTime: number, grid: Grid, pheromoneField: PheromoneField): void {
    this.population.update(deltaTime, grid, pheromoneField);

    this.growth.update(deltaTime);
  }

  addNestEntrance(position: Vector2D, radius?: number): string {
    const entranceId = this.nest.addEntrance(position, radius);

    if (this.grid) {
      const entrance = this.nest.getAllEntrances().find((e) => e.id === entranceId);
      if (entrance) {
        const { row, col } = this.grid.pixelsToGrid(entrance.position.x, entrance.position.y);
        const radiusCells = entrance.radius / this.grid.cellSize;
        this.grid.setCellTypeInRadius(row, col, radiusCells, "nest");
      }
    }

    return entranceId;
  }

  removeNestEntrance(entranceId: string): boolean {
    const entrance = this.nest.getAllEntrances().find((e) => e.id === entranceId);

    const success = this.nest.removeEntrance(entranceId);

    if (success && entrance && this.grid) {
      const { row, col } = this.grid.pixelsToGrid(entrance.position.x, entrance.position.y);
      const radiusCells = entrance.radius / this.grid.cellSize;
      this.grid.setCellTypeInRadius(row, col, radiusCells, "empty");
    }

    return success;
  }

  setAntCount(count: number): void {
    this.population.setTargetCount(count);
  }

  getAntCount(): number {
    return this.population.getCount();
  }

  getStats(): ColonyStats {
    const nestStats = this.nest.getStats();
    const populationStats = this.population.getStats();
    const growthStats = this.growth.getStats();

    return {
      totalAnts: populationStats.total,
      activeAnts: populationStats.active,
      foodStored: nestStats.totalFoodStored,
      growthRate: growthStats.rate,
      efficiency: populationStats.efficiency,
    };
  }

  getNest(): Nest {
    return this.nest;
  }

  getPopulation(): AntPopulation {
    return this.population;
  }

  destroy(): void {
    this.population.destroy();
  }

  getContainer() {
    return this.population.getContainer();
  }

  setNestPosition(x: number, y: number): void {
    this.clearNestFromGrid();

    this.nest.getMainEntrance().position.x = x;
    this.nest.getMainEntrance().position.y = y;

    this.drawNestOnGrid();
  }

  initialize(
    cellSize: number,
    width: number,
    height: number,
    grid: Grid,
    pheromoneField: PheromoneField,
    antTextures: { normal: Texture; carrying: Texture }
  ): void {
    this.grid = grid;
    this.population.initialize(cellSize, width, height, grid, pheromoneField, antTextures);

    this.drawNestOnGrid();
  }

  private drawNestOnGrid(): void {
    if (!this.grid) return;

    for (const entrance of this.nest.getAllEntrances()) {
      const { row, col } = this.grid.pixelsToGrid(entrance.position.x, entrance.position.y);
      const radiusCells = entrance.radius / this.grid.cellSize;
      this.grid.setCellTypeInRadius(row, col, radiusCells, "nest");
    }
  }

  private clearNestFromGrid(): void {
    if (!this.grid) return;

    for (const entrance of this.nest.getAllEntrances()) {
      const { row, col } = this.grid.pixelsToGrid(entrance.position.x, entrance.position.y);
      const radiusCells = entrance.radius / this.grid.cellSize;
      this.grid.setCellTypeInRadius(row, col, radiusCells, "empty");
    }
  }
}

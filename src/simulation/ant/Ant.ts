import type { Grid } from "@simulation/chunk/Grid";
import type { PheromoneField } from "@simulation/chunk/PheromoneField";
import { COLLISION_PREDICTION_DISTANCE } from "@simulation/constants/ant";
import type { AntState } from "@simulation/types";
import { AngleUtils, VectorUtils } from "@simulation/utils";
import { Texture } from "pixi.js";

import { AntMovement } from "./AntMovement";
import { AntPheromones } from "./AntPheromones";
import { AntRenderer } from "./AntRenderer";
import { AntSensors } from "./AntSensors";

export class Ant {
  state: AntState = "searching";
  carryingFood: boolean = false;

  private movement: AntMovement;
  private sensors: AntSensors;
  private pheromones: AntPheromones;
  private renderer: AntRenderer;

  constructor(x: number, y: number, normalTexture: Texture, carryingTexture: Texture, cellSize: number) {
    const randomDirection = VectorUtils.fromAngle(AngleUtils.random());
    this.movement = new AntMovement(randomDirection);
    this.sensors = new AntSensors(cellSize);
    this.pheromones = new AntPheromones();
    this.renderer = new AntRenderer(x, y, normalTexture, carryingTexture, cellSize);

    this.renderer.updateTexture(this.carryingFood);
  }

  get sprite() {
    return this.renderer.sprite;
  }

  enableDebug(): void {
    this.sensors.enableDebug();
  }

  step(width: number, height: number, deltaTime: number = 1 / 60, grid?: Grid, pheromoneField?: PheromoneField): void {
    if (grid && pheromoneField) {
      const position = this.renderer.getPosition();
      this.sensors.updateSensors(position, this.movement.velocity, grid, pheromoneField, this.state);

      this.checkCollisions(grid);

      this.pheromones.update(deltaTime, this.state);
      if (this.pheromones.shouldDropPheromone()) {
        this.pheromones.layPheromones(pheromoneField, this.sprite.x, this.sprite.y, this.state);
      }
    }

    this.movement.update(this.sensors, deltaTime);

    this.movement.updatePosition(this.sprite, deltaTime);
    this.renderer.updateRotation(this.movement.getRotation());

    //this.movement.handleEdgeCollisions(width, height);
    this.movement.handleSpriteEdgeCollisions(this.sprite, width, height);

    this.sensors.drawSensors();
  }

  private checkCollisions(grid: Grid): void {
    const futurePosition = {
      x: this.sprite.x + this.movement.velocity.x * COLLISION_PREDICTION_DISTANCE,
      y: this.sprite.y + this.movement.velocity.y * COLLISION_PREDICTION_DISTANCE,
    };

    const { row, col } = grid.pixelsToGrid(futurePosition.x, futurePosition.y);
    const cell = grid.getCellByRowCol(row, col);
    if (!cell) return;

    // Food interaction
    if (cell.food > 0 && this.state === "searching") {
      this.carryingFood = true;
      this.state = "returning";
      this.renderer.updateTexture(this.carryingFood);

      // Update cell food using setCellProperties
      grid.setCellProperties(row, col, { food: Math.max(0, cell.food - 1) });

      this.pheromones.resetWanderingTimer();
      this.movement.reverseDirection();
    }

    if (cell.food > 0 && this.state === "returning") {
      this.pheromones.resetWanderingTimer();
    }

    if (cell.isNest && this.state === "searching") {
      this.pheromones.resetWanderingTimer();
    }

    if (cell.isNest && this.state === "returning" && this.carryingFood) {
      this.carryingFood = false;
      this.state = "searching";
      this.renderer.updateTexture(this.carryingFood);

      this.pheromones.resetWanderingTimer();
      this.movement.reverseDirection();
    }
  }
}

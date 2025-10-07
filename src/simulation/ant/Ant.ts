import type { Grid } from "@simulation/chunk/Grid";
import type { PheromoneField } from "@simulation/chunk/PheromoneField";
import {
  ANT_MASS_BASE,
  ANT_MASS_CARRYING,
  ANT_MAX_SPEED,
  ANT_REST_TIME_MAX,
  ANT_REST_TIME_MIN,
  COLLISION_PREDICTION_DISTANCE,
} from "@simulation/constants/ant";
import type { AntState, Vector2D } from "@simulation/types";
import { AngleUtils, VectorUtils } from "@simulation/utils";
import { Graphics, Texture } from "pixi.js";

import { AntMovement } from "./AntMovement";
import { AntPheromones } from "./AntPheromones";
import { AntRenderer } from "./AntRenderer";
import { LinearAntSensors } from "./LinearAntSensors";

export class Ant {
  id: number;
  state: AntState = "searching";
  carryingFood: boolean = false;

  radius: number;
  mass: number;

  private restTimer: number = 0;
  private restDuration: number = 0;
  private isInNest: boolean = false;

  private movement: AntMovement;
  private sensors: LinearAntSensors;
  private pheromones: AntPheromones;
  private renderer: AntRenderer;

  grid: Grid;
  pheromoneField: PheromoneField;

  private onFoodDelivered?: (antId: number) => void;
  private onEnterNest?: (antId: number, duration: number) => void;
  private onExitNest?: (antId: number) => void;

  constructor(
    x: number,
    y: number,
    normalTexture: Texture,
    carryingTexture: Texture,
    cellSize: number,
    grid: Grid,
    pheromoneField: PheromoneField,
    onFoodDelivered?: (antId: number) => void,
    onEnterNest?: (antId: number, duration: number) => void,
    onExitNest?: (antId: number) => void
  ) {
    this.id = Math.floor(Math.random() * 1e9);
    const randomDirection = VectorUtils.fromAngle(AngleUtils.random());
    this.movement = new AntMovement(randomDirection);
    this.sensors = new LinearAntSensors(cellSize);
    this.pheromones = new AntPheromones();
    this.renderer = new AntRenderer(x, y, normalTexture, carryingTexture, cellSize);

    this.radius = cellSize;
    this.mass = ANT_MASS_BASE;

    this.grid = grid;
    this.pheromoneField = pheromoneField;

    this.onFoodDelivered = onFoodDelivered;
    this.onEnterNest = onEnterNest;
    this.onExitNest = onExitNest;

    this.renderer.updateTexture(this.carryingFood);
  }

  get sprite() {
    return this.renderer.sprite;
  }

  enableDebug(): void {
    this.sensors.enableDebug();
  }

  getSensorGraphics(): Graphics | undefined {
    return this.sensors.getDebugGraphics();
  }

  forceSensorUpdate(): void {
    const position = this.renderer.getPosition();
    this.sensors.forceUpdate(position, this.movement.velocity, this.grid, this.pheromoneField, this.state);
  }

  step(deltaTime: number = 1 / 60, nestPosition?: Vector2D): void {
    if (this.state === "resting") {
      this.handleResting(deltaTime, nestPosition);
      return;
    }

    const position = this.renderer.getPosition();
    this.sensors.updateSensors(position, this.movement.velocity, this.grid, this.pheromoneField, this.state, deltaTime);

    this.checkInteractions();

    this.pheromones.update(deltaTime, this.state);
    if (this.pheromones.shouldDropPheromone()) {
      this.pheromones.layPheromones(this.pheromoneField, this.sprite.x, this.sprite.y, this.state);
    }

    this.movement.update(this.sensors, deltaTime);
    this.movement.updatePosition(this.sprite, deltaTime);
    this.renderer.updateRotation(this.movement.getRotation());
    this.updateMass();

    this.sensors.drawSensors();
  }

  private handleResting(deltaTime: number, nestPosition?: Vector2D): void {
    this.restTimer += deltaTime;

    if (this.restTimer >= this.restDuration) {
      this.exitNest(nestPosition);
    }
  }

  private enterNest(): void {
    this.state = "resting";
    this.isInNest = true;
    this.restTimer = 0;

    this.restDuration = ANT_REST_TIME_MIN + Math.random() * (ANT_REST_TIME_MAX - ANT_REST_TIME_MIN);

    this.sprite.visible = false;
    this.movement.velocity = { x: 0, y: 0 };

    if (this.carryingFood && this.onFoodDelivered) {
      this.onFoodDelivered(this.id);
    }

    this.carryingFood = false;
    this.renderer.updateTexture(false);

    if (this.onEnterNest) {
      this.onEnterNest(this.id, this.restDuration);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private exitNest(_nestPosition?: Vector2D): void {
    this.state = "searching";
    this.isInNest = false;
    this.restTimer = 0;
    this.restDuration = 0;

    this.sprite.visible = true;
    if (this.onExitNest) {
      this.onExitNest(this.id);
    }

    const exitAngle = Math.random() * Math.PI * 2;
    const exitDirection = VectorUtils.fromAngle(exitAngle);

    this.movement.velocity = VectorUtils.multiply(exitDirection, ANT_MAX_SPEED * 0.5);
    this.movement.desiredDirection = exitDirection;

    this.pheromones.resetWanderingTimer();
    this.forceSensorUpdate();
  }

  private checkInteractions(): void {
    const futurePosition = {
      x: this.sprite.x + this.movement.velocity.x * COLLISION_PREDICTION_DISTANCE,
      y: this.sprite.y + this.movement.velocity.y * COLLISION_PREDICTION_DISTANCE,
    };

    if (isNaN(futurePosition.x) || isNaN(futurePosition.y)) {
      console.warn("NaN detected in futurePosition, resetting velocity");
      this.movement.velocity = VectorUtils.fromAngle(AngleUtils.random());
      return;
    }

    const { row, col } = this.grid.pixelsToGrid(futurePosition.x, futurePosition.y);
    const cell = this.grid.getCellByRowCol(row, col);
    if (!cell) return;

    let stateChanged = false;

    if (cell.food > 0 && this.state === "searching") {
      this.carryingFood = true;
      this.state = "returning";
      this.renderer.updateTexture(this.carryingFood);
      this.grid.setCellProperties(row, col, { food: Math.max(0, cell.food - 1) });
      this.pheromones.resetWanderingTimer();
      this.movement.reverseDirection();
      stateChanged = true;
    }

    if (cell.food > 0 && this.state === "returning") {
      this.pheromones.resetWanderingTimer();
    }

    if (cell.isNest && this.state === "searching") {
      this.pheromones.resetWanderingTimer();
    }

    if (cell.isNest && this.state === "returning" && this.carryingFood) {
      this.enterNest();
      stateChanged = true;
    }

    if (stateChanged) {
      this.forceSensorUpdate();
    }
  }

  get isResting(): boolean {
    return this.state === "resting";
  }

  get restTimeRemaining(): number {
    return Math.max(0, this.restDuration - this.restTimer);
  }

  get isVisible(): boolean {
    return this.sprite.visible;
  }

  getPosition(): Vector2D {
    return this.renderer.getPosition();
  }

  getSpriteWidth(): number {
    return this.renderer.sprite.width;
  }

  getSpriteHeight(): number {
    return this.renderer.sprite.height;
  }

  getMovementMaxSpeed(): number {
    return this.movement.maxSpeed;
  }

  get velocity(): Vector2D {
    return this.movement.velocity;
  }

  set velocity(value: Vector2D) {
    this.movement.velocity = value;
  }

  get desiredDirection(): Vector2D {
    return this.movement.desiredDirection;
  }

  set desiredDirection(value: Vector2D) {
    this.movement.desiredDirection = value;
  }

  private updateMass(): void {
    this.mass = this.carryingFood ? ANT_MASS_CARRYING : ANT_MASS_BASE;
    this.movement.maxSpeed = ANT_MAX_SPEED / this.mass;
  }
}

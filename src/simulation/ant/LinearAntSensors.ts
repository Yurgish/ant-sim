import type { Grid } from "@simulation/chunk/Grid";
import type { PheromoneField } from "@simulation/chunk/PheromoneField";
import { LINEAR_SENSOR_POINTS, LINEAR_SENSOR_STEP, SENSOR_ANGLE } from "@simulation/constants/ant";
import type { AntState, Sensor, Vector2D } from "@simulation/types";
import { PHEROMONE_TYPES } from "@simulation/types/PheromoneTypes";
import { VectorUtils } from "@simulation/utils";
import { Graphics } from "pixi.js";

export class LinearAntSensors {
  leftSensor: Sensor;
  centreSensor: Sensor;
  rightSensor: Sensor;

  private cellSize: number;
  sensorAngle: number = SENSOR_ANGLE;

  private updateTimer: number = 0;
  private updateInterval: number = 1 / 15;

  private leftPoints: Vector2D[] = [];
  private centerPoints: Vector2D[] = [];
  private rightPoints: Vector2D[] = [];

  private debugGraphics?: Graphics;
  debugEnabled: boolean = false;

  constructor(cellSize: number) {
    this.cellSize = cellSize;

    this.leftSensor = { position: { x: 0, y: 0 }, value: 0, radius: 0 };
    this.centreSensor = { position: { x: 0, y: 0 }, value: 0, radius: 0 };
    this.rightSensor = { position: { x: 0, y: 0 }, value: 0, radius: 0 };

    this.initializeSensorPoints();

    this.updateTimer = Math.random() * this.updateInterval;
  }

  private initializeSensorPoints(): void {
    for (let i = 1; i <= LINEAR_SENSOR_POINTS; i++) {
      const distance = i * LINEAR_SENSOR_STEP;

      this.leftPoints.push({ x: 0, y: -distance });
      this.centerPoints.push({ x: 0, y: -distance });
      this.rightPoints.push({ x: 0, y: -distance });
    }
  }

  setSensorUpdateRate(updatesPerSecond: number): void {
    this.updateInterval = 1 / updatesPerSecond;
  }

  enableDebug(): void {
    if (!this.debugGraphics) {
      this.debugGraphics = new Graphics();
    }
    this.debugEnabled = true;
  }

  getDebugGraphics(): Graphics | undefined {
    return this.debugGraphics;
  }

  updateSensors(
    position: Vector2D,
    velocity: Vector2D,
    grid: Grid,
    pheromoneField: PheromoneField,
    antState: AntState,
    deltaTime: number
  ): void {
    this.updateTimer += deltaTime;

    if (this.updateTimer >= this.updateInterval) {
      this.updateTimer = 0;

      const currentAngle = VectorUtils.angle(velocity);

      // Оновлюємо позиції точок для кожного сенсора
      this.updateSensorPoints(position, currentAngle);

      this.leftSensor.value = this.evaluateLinearSensor(this.leftPoints, grid, pheromoneField, antState);
      this.centreSensor.value = this.evaluateLinearSensor(this.centerPoints, grid, pheromoneField, antState);
      this.rightSensor.value = this.evaluateLinearSensor(this.rightPoints, grid, pheromoneField, antState);

      this.updateSensorPositions(position, currentAngle);
    }
  }

  private updateSensorPoints(position: Vector2D, currentAngle: number): void {
    const leftAngle = currentAngle - this.sensorAngle;
    const centerAngle = currentAngle;
    const rightAngle = currentAngle + this.sensorAngle;

    for (let i = 0; i < LINEAR_SENSOR_POINTS; i++) {
      const distance = (i + 1) * LINEAR_SENSOR_STEP * this.cellSize;
      this.leftPoints[i] = {
        x: position.x + Math.cos(leftAngle) * distance,
        y: position.y + Math.sin(leftAngle) * distance,
      };
    }

    for (let i = 0; i < LINEAR_SENSOR_POINTS; i++) {
      const distance = (i + 1) * LINEAR_SENSOR_STEP * this.cellSize;
      this.centerPoints[i] = {
        x: position.x + Math.cos(centerAngle) * distance,
        y: position.y + Math.sin(centerAngle) * distance,
      };
    }

    for (let i = 0; i < LINEAR_SENSOR_POINTS; i++) {
      const distance = (i + 1) * LINEAR_SENSOR_STEP * this.cellSize;
      this.rightPoints[i] = {
        x: position.x + Math.cos(rightAngle) * distance,
        y: position.y + Math.sin(rightAngle) * distance,
      };
    }
  }

  private updateSensorPositions(position: Vector2D, currentAngle: number): void {
    const totalSensorDistanceCells = LINEAR_SENSOR_POINTS * LINEAR_SENSOR_STEP;

    const sensorDistancePixels = (totalSensorDistanceCells / 2) * this.cellSize;

    this.leftSensor.position = {
      x: position.x + Math.cos(currentAngle - this.sensorAngle) * sensorDistancePixels,
      y: position.y + Math.sin(currentAngle - this.sensorAngle) * sensorDistancePixels,
    };

    this.centreSensor.position = {
      x: position.x + Math.cos(currentAngle) * sensorDistancePixels,
      y: position.y + Math.sin(currentAngle) * sensorDistancePixels,
    };

    this.rightSensor.position = {
      x: position.x + Math.cos(currentAngle + this.sensorAngle) * sensorDistancePixels,
      y: position.y + Math.sin(currentAngle + this.sensorAngle) * sensorDistancePixels,
    };
  }

  private evaluateLinearSensor(
    points: Vector2D[],
    grid: Grid,
    pheromoneField: PheromoneField,
    antState: AntState
  ): number {
    let obstacleDetected = false;
    let maxTargetStrength = 0;
    let totalPheromoneStrength = 0;

    const pheromoneType = antState === "searching" ? PHEROMONE_TYPES.FOOD : PHEROMONE_TYPES.HOME;

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const { row: gridRow, col: gridCol } = grid.pixelsToGrid(point.x, point.y);

      if (gridRow < 0 || gridCol < 0 || gridRow >= grid.rows || gridCol >= grid.cols) {
        obstacleDetected = true;
        break;
      }

      const cell = grid.getCellByRowCol(gridRow, gridCol);
      if (!cell) continue;

      if (cell.obstacle) {
        obstacleDetected = true;
        break;
      }

      const distanceFactor = Math.max(0.1, 1 - (i / (LINEAR_SENSOR_POINTS - 1)) * 0.7);

      if (antState === "searching" && cell.food > 0) {
        const foodStrength = cell.food * distanceFactor * 100;
        maxTargetStrength = Math.max(maxTargetStrength, foodStrength);
      } else if (antState === "returning" && cell.isNest) {
        const nestStrength = 100 * distanceFactor;
        maxTargetStrength = Math.max(maxTargetStrength, nestStrength);
      }

      const { row: pheromoneRow, col: pheromoneCol } = pheromoneField.pixelsToGrid(point.x, point.y);
      const pheromoneStrength = pheromoneField.getStrength(pheromoneRow, pheromoneCol, pheromoneType);
      if (pheromoneStrength > 0) {
        totalPheromoneStrength += pheromoneStrength * distanceFactor;
      }
    }

    if (obstacleDetected) {
      return -Infinity;
    }

    if (maxTargetStrength > 0) {
      return maxTargetStrength * 200;
    }

    return totalPheromoneStrength;
  }

  hasObstacles(): boolean {
    return (
      this.centreSensor.value === -Infinity ||
      this.leftSensor.value === -Infinity ||
      this.rightSensor.value === -Infinity
    );
  }

  hasStrongTargetSignal(): boolean {
    return this.leftSensor.value > 100 || this.centreSensor.value > 100 || this.rightSensor.value > 100;
  }

  forceUpdate(
    position: Vector2D,
    velocity: Vector2D,
    grid: Grid,
    pheromoneField: PheromoneField,
    antState: AntState
  ): void {
    this.updateTimer = this.updateInterval;
    this.updateSensors(position, velocity, grid, pheromoneField, antState, 0);
  }

  isDataFresh(): boolean {
    return this.updateTimer < this.updateInterval * 0.5;
  }

  drawSensors(): void {
    if (!this.debugEnabled || !this.debugGraphics) return;

    this.debugGraphics.clear();

    const colors = [0xff0000, 0x00ff00, 0x0000ff]; // Червоний, зелений, синій
    const pointSets = [this.leftPoints, this.centerPoints, this.rightPoints];
    const sensors = [this.leftSensor, this.centreSensor, this.rightSensor];

    pointSets.forEach((points, sensorIndex) => {
      const color = colors[sensorIndex];
      const sensorValue = sensors[sensorIndex].value;

      let alpha = 0.3;
      if (sensorValue === -Infinity) {
        alpha = 0.8;
      } else if (sensorValue > 100) {
        alpha = 0.9;
      } else if (sensorValue > 0) {
        alpha = Math.min(0.7, 0.3 + (sensorValue / 100) * 0.4);
      }

      if (points.length > 0 && this.debugGraphics) {
        this.debugGraphics.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
          this.debugGraphics.lineTo(points[i].x, points[i].y);
        }

        this.debugGraphics.stroke({ width: 2, color, alpha });

        points.forEach((point, i) => {
          const pointAlpha = alpha * (1 - i * 0.1);
          if (this.debugGraphics && pointAlpha > 0.1) {
            this.debugGraphics.circle(point.x, point.y, 3);
            this.debugGraphics.fill({ color, alpha: pointAlpha });
          }
        });
      }
    });
  }
}

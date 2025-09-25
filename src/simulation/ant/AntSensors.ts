import type { Grid } from "@simulation/chunk/Grid";
import type { PheromoneField } from "@simulation/chunk/PheromoneField";
import { SENSOR_ANGLE, SENSOR_DISTANCE_CELLS, SENSOR_RADIUS_CELLS } from "@simulation/constants/ant";
import type { AntState, Sensor, SensorResult, Vector2D } from "@simulation/types";
import { PHEROMONE_TYPES } from "@simulation/types/PheromoneTypes";
import { VectorUtils } from "@simulation/utils";
import { Graphics } from "pixi.js";

export class AntSensors {
  leftSensor: Sensor;
  centreSensor: Sensor;
  rightSensor: Sensor;

  private cellSize: number;
  private sensorDistanceCells: number = SENSOR_DISTANCE_CELLS;
  private sensorRadiusCells: number = SENSOR_RADIUS_CELLS;
  sensorAngle: number = SENSOR_ANGLE;

  // Debug visuals
  private debugGraphics?: Graphics;
  debugEnabled: boolean = false;

  constructor(cellSize: number) {
    this.cellSize = cellSize;

    this.leftSensor = { position: { x: 0, y: 0 }, value: 0, radius: this.sensorRadiusCells };
    this.centreSensor = { position: { x: 0, y: 0 }, value: 0, radius: this.sensorRadiusCells };
    this.rightSensor = { position: { x: 0, y: 0 }, value: 0, radius: this.sensorRadiusCells };
  }

  enableDebug(): void {
    if (!this.debugGraphics) {
      this.debugGraphics = new Graphics();
    }
    this.debugEnabled = true;
  }

  updateSensors(
    position: Vector2D,
    velocity: Vector2D,
    grid: Grid,
    pheromoneField: PheromoneField,
    antState: AntState
  ): void {
    this.updateSensor(this.leftSensor, position, velocity, grid, pheromoneField, antState);
    this.updateSensor(this.centreSensor, position, velocity, grid, pheromoneField, antState);
    this.updateSensor(this.rightSensor, position, velocity, grid, pheromoneField, antState);
  }

  private updateSensor(
    sensor: Sensor,
    position: Vector2D,
    velocity: Vector2D,
    grid: Grid,
    pheromoneField: PheromoneField,
    antState: AntState
  ): void {
    const currentAngle = VectorUtils.angle(velocity);
    let sensorAngle = currentAngle;

    if (sensor === this.leftSensor) sensorAngle = currentAngle - this.sensorAngle;
    if (sensor === this.rightSensor) sensorAngle = currentAngle + this.sensorAngle;

    const sensorDistancePixels = this.sensorDistanceCells * this.cellSize;
    sensor.position.x = position.x + Math.cos(sensorAngle) * sensorDistancePixels;
    sensor.position.y = position.y + Math.sin(sensorAngle) * sensorDistancePixels;

    const result = this.getSensorResult(grid, pheromoneField, sensor.position, antState);

    // Priority system
    if (result.obstacle) {
      sensor.value = -Infinity;
      return;
    }

    if (result.targetStrength > 0) {
      sensor.value = result.targetStrength * 200;
      return;
    }

    sensor.value = result.pheromoneStrength;
  }

  private getSensorResult(
    grid: Grid,
    pheromoneField: PheromoneField,
    sensorPosition: Vector2D,
    antState: AntState
  ): SensorResult {
    const result: SensorResult = {
      obstacle: false,
      pheromoneStrength: 0,
      targetStrength: 0,
    };

    // Convert sensor position to grid coordinates
    const { row: sensorRow, col: sensorCol } = grid.pixelsToGrid(sensorPosition.x, sensorPosition.y);

    // Check if sensor is out of bounds
    if (sensorRow < 0 || sensorCol < 0 || sensorRow >= grid.rows || sensorCol >= grid.cols) {
      result.obstacle = true;
      return result;
    }

    // Check for obstacles first (highest priority)
    const hasObstacle = this.checkForObstacles(grid, sensorRow, sensorCol, this.sensorRadiusCells);
    if (hasObstacle) {
      result.obstacle = true;
      return result;
    }

    // Check for targets (food/nest)
    result.targetStrength = this.getTargetStrength(grid, sensorRow, sensorCol, this.sensorRadiusCells, antState);

    // Get pheromone strength using PheromoneField methods
    result.pheromoneStrength = this.getPheromoneStrength(
      pheromoneField,
      sensorRow,
      sensorCol,
      this.sensorRadiusCells,
      antState
    );

    return result;
  }

  private checkForObstacles(grid: Grid, centerRow: number, centerCol: number, radiusCells: number): boolean {
    let hasObstacle = false;

    grid.forEachInRadius(centerRow, centerCol, radiusCells, (_row, _col, _distance, chunk, localRow, localCol) => {
      if (hasObstacle) return; // Early exit if obstacle found

      const cell = chunk.get(localRow, localCol);
      if (cell?.obstacle) {
        hasObstacle = true;
      }
    });

    return hasObstacle;
  }

  private getTargetStrength(
    grid: Grid,
    centerRow: number,
    centerCol: number,
    radiusCells: number,
    antState: AntState
  ): number {
    let maxTargetStrength = 0;

    grid.forEachInRadius(centerRow, centerCol, radiusCells, (_row, _col, distance, chunk, localRow, localCol) => {
      const cell = chunk.get(localRow, localCol);
      if (!cell) return;

      const distanceFactor = Math.max(0.1, 1 - distance / radiusCells);

      if (antState === "searching" && cell.food > 0) {
        const foodStrength = cell.food * distanceFactor;
        maxTargetStrength = Math.max(maxTargetStrength, foodStrength);
      } else if (antState === "returning" && cell.isNest) {
        const nestStrength = 100 * distanceFactor;
        maxTargetStrength = Math.max(maxTargetStrength, nestStrength);
      }
    });

    return maxTargetStrength;
  }

  private getPheromoneStrength(
    pheromoneField: PheromoneField,
    centerRow: number,
    centerCol: number,
    radiusCells: number,
    antState: AntState
  ): number {
    const pheromoneType = antState === "searching" ? PHEROMONE_TYPES.FOOD : PHEROMONE_TYPES.HOME;
    let totalPheromoneStrength = 0;

    pheromoneField.forEachInRadius(
      centerRow,
      centerCol,
      radiusCells,
      (_row, _col, distance, chunk, localRow, localCol) => {
        const strength = chunk.get(localRow, localCol, pheromoneType);
        if (strength > 0) {
          const distanceFactor = Math.max(0.1, 1 - distance / radiusCells);
          totalPheromoneStrength += strength * distanceFactor;
        }
      }
    );

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

  drawSensors(): Graphics | undefined {
    if (!this.debugEnabled || !this.debugGraphics) return undefined;

    this.debugGraphics.clear();

    const sensors = [this.leftSensor, this.centreSensor, this.rightSensor];
    const colors = [0xff0000, 0x00ff00, 0x0000ff];

    sensors.forEach((sensor, i) => {
      const alpha = Math.min(1, Math.abs(sensor.value) / 100);
      if (this.debugGraphics) {
        this.debugGraphics.circle(sensor.position.x, sensor.position.y, sensor.radius / 2);
        this.debugGraphics.fill({ color: colors[i], alpha });
        this.debugGraphics.stroke({ width: 1, color: colors[i] });
      }
    });

    return this.debugGraphics;
  }
}

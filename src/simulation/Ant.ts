import { Graphics, Sprite, Texture } from "pixi.js";

import {
  ANT_MAX_SPEED,
  ANT_SIZE_IN_CELLS,
  ANT_STEER_STRENGTH,
  ANT_WANDER_STRENGTH,
  BASE_PHEROMONE_STRENGTH,
  COLLISION_PREDICTION_DISTANCE,
  EDGE_COLLISION_MARGIN,
  MAX_PHEROMONE_MULTIPLIER,
  PHEROMONE_FADE_TIME,
  PHEROMONE_TIMER_INTERVAL,
  SENSOR_ANGLE,
  SENSOR_DISTANCE_CELLS,
  SENSOR_RADIUS_CELLS,
} from "./constants/constants";
import { Grid } from "./Grid";
import type { AntState, FoodConsumedCallback, Sensor, SensorResult, SensorSignal, Vector2D } from "./types";
import { AngleUtils, GridUtils, VectorUtils } from "./utils";

export class Ant {
  sprite: Sprite;
  state: AntState;
  carryingFood: boolean = false;

  // Textures for different states
  private normalTexture: Texture;
  private carryingTexture: Texture;

  // Movement parameters
  maxSpeed: number = ANT_MAX_SPEED;
  steerStrength: number = ANT_STEER_STRENGTH;
  wanderStrength: number = ANT_WANDER_STRENGTH;

  // Sensor parameters
  sensorDistanceCells: number = SENSOR_DISTANCE_CELLS;
  sensorRadiusCells: number = SENSOR_RADIUS_CELLS;
  sensorAngle: number = SENSOR_ANGLE;
  cellSize: number;

  // Three sensors for pheromone detection
  leftSensor: Sensor;
  centreSensor: Sensor;
  rightSensor: Sensor;

  // Pheromone timer
  pheromoneTimer: number = 0;
  pheromoneInterval: number = PHEROMONE_TIMER_INTERVAL;

  // Wandering timer for pheromone strength
  wanderingTime: number = 0;

  velocity: Vector2D;
  desiredDirection: Vector2D;

  // Optional debug graphics
  debugGraphics?: Graphics;
  debugEnabled: boolean = false;

  constructor(x: number, y: number, normalTexture: Texture, carryingTexture: Texture, cellSize: number) {
    this.state = "searching";
    this.normalTexture = normalTexture;
    this.carryingTexture = carryingTexture;
    this.cellSize = cellSize;

    // Initialize velocity with random direction
    const randomDirection = VectorUtils.fromAngle(AngleUtils.random());
    this.velocity = randomDirection;
    this.desiredDirection = { ...this.velocity };

    // Initialize sensors with radius in pixels (convert from cells)
    const radiusInPixels = SENSOR_RADIUS_CELLS * cellSize;
    this.leftSensor = { position: { x: 0, y: 0 }, value: 0, radius: radiusInPixels };
    this.centreSensor = { position: { x: 0, y: 0 }, value: 0, radius: radiusInPixels };
    this.rightSensor = { position: { x: 0, y: 0 }, value: 0, radius: radiusInPixels };

    // Random start for pheromone timer
    this.pheromoneTimer = Math.random() * this.pheromoneInterval;

    this.sprite = new Sprite(this.normalTexture); // Create sprite with normal texture
    this.sprite.x = x;
    this.sprite.y = y;
    this.sprite.rotation = 0;

    // Calculate scale based on cell size
    const desiredSize = ANT_SIZE_IN_CELLS * cellSize;
    const textureSize = Math.max(this.normalTexture.width, this.normalTexture.height);
    const scale = desiredSize / textureSize;

    this.sprite.scale.set(scale, scale);
    this.sprite.anchor.set(0.5, 0.5);

    // Set initial texture
    this.updateTexture();
  }

  // Method to enable debug (called from AntSystem)
  enableDebug(): void {
    if (!this.debugGraphics) {
      this.debugGraphics = new Graphics();
    }
    this.debugEnabled = true;
  }

  step(
    width: number,
    height: number,
    deltaTime: number = 1 / 60,
    grid?: Grid,
    onFoodConsumed?: FoodConsumedCallback
  ): void {
    if (grid) {
      // Update sensors and handle pheromone steering
      this.handlePheromoneSteering(grid);

      // Check collisions
      this.checkCollisions(grid, onFoodConsumed);

      // Drop pheromones if it's time
      if (this.shouldDropPheromone()) {
        this.layPheromones(grid);
      }
    }

    // Add random wandering
    this.addWanderingIfNeeded();

    // Normalize desired direction
    this.desiredDirection = VectorUtils.normalize(this.desiredDirection);

    // Calculate desired velocity
    const desiredVelocity = VectorUtils.multiply(this.desiredDirection, this.maxSpeed);

    // Apply steering
    this.applySteering(desiredVelocity, deltaTime);

    // Limit speed
    this.limitSpeed();

    // Update position
    this.updatePosition(deltaTime);

    // Update rotation
    this.updateRotation();

    // Handle edge collisions
    this.handleEdgeCollisions(width, height);

    // Update pheromone timer
    this.pheromoneTimer += deltaTime;

    // Update wandering timer
    this.updateWanderingTimer(deltaTime);

    this.drawSensors();
  }

  private addWanderingIfNeeded(): void {
    const maxValue = Math.max(this.leftSensor.value, this.centreSensor.value, this.rightSensor.value);
    if (maxValue < 4) {
      // Threshold: weak signal — wander (phero <0.4 baseline)
      const wanderMult = maxValue > 0 ? 1 - maxValue / 2 : 1; // Gradually reduce noise
      this.desiredDirection.x += (Math.random() - 0.5) * this.wanderStrength * wanderMult;
      this.desiredDirection.y += (Math.random() - 0.5) * this.wanderStrength * wanderMult;
    }
  }

  private applySteering(desiredVelocity: Vector2D, deltaTime: number): void {
    let steer = VectorUtils.subtract(desiredVelocity, this.velocity);
    steer = VectorUtils.multiply(steer, this.steerStrength);

    // Limit steering force
    const steerMagnitude = Math.hypot(steer.x, steer.y);
    if (steerMagnitude > this.steerStrength) {
      steer = VectorUtils.multiply(VectorUtils.normalize(steer), this.steerStrength);
    }

    // Apply steering
    this.velocity = VectorUtils.add(this.velocity, VectorUtils.multiply(steer, deltaTime * 60));
  }

  private limitSpeed(): void {
    const speed = Math.hypot(this.velocity.x, this.velocity.y);
    if (speed > this.maxSpeed) {
      this.velocity = VectorUtils.multiply(VectorUtils.normalize(this.velocity), this.maxSpeed);
    }
  }

  private updatePosition(deltaTime: number): void {
    const movement = VectorUtils.multiply(this.velocity, deltaTime * 60);
    this.sprite.x += movement.x;
    this.sprite.y += movement.y;
  }

  private updateRotation(): void {
    this.sprite.rotation = VectorUtils.angle(this.velocity) + Math.PI / 2;
  }

  private handleEdgeCollisions(width: number, height: number): void {
    const margin = EDGE_COLLISION_MARGIN;

    if (this.sprite.x < margin) {
      this.sprite.x = margin;
      this.velocity.x = Math.abs(this.velocity.x);
    }
    if (this.sprite.y < margin) {
      this.sprite.y = margin;
      this.velocity.y = Math.abs(this.velocity.y);
    }
    if (this.sprite.x > width - margin) {
      this.sprite.x = width - margin;
      this.velocity.x = -Math.abs(this.velocity.x);
    }
    if (this.sprite.y > height - margin) {
      this.sprite.y = height - margin;
      this.velocity.y = -Math.abs(this.velocity.y);
    }
  }

  shouldDropPheromone(): boolean {
    if (this.pheromoneTimer >= this.pheromoneInterval) {
      this.pheromoneTimer = 0;
      return true;
    }
    return false;
  }

  // Drop pheromones in Grid
  layPheromones(grid: Grid): void {
    // Ant drops opposite type pheromones for other ants
    // If searching for food - drops home pheromones (so others know way home)
    // If carrying food - drops food pheromones (so others know way to food)
    const pheromoneType = this.state === "searching" ? "home" : "food";

    let pheromoneStrength = BASE_PHEROMONE_STRENGTH;

    if (this.state === "searching") {
      // For searching ants: initially strength *MAX_PHEROMONE_MULTIPLIER, after PHEROMONE_FADE_TIME seconds = *1 (base)
      const strengthMultiplier = Math.max(
        1,
        MAX_PHEROMONE_MULTIPLIER - (this.wanderingTime / PHEROMONE_FADE_TIME) * (MAX_PHEROMONE_MULTIPLIER - 1)
      );
      pheromoneStrength *= strengthMultiplier;
    } else if (this.state === "returning") {
      // For returning ants: strong pheromone near food, weaker as time passes
      // Timer resets when food is found, so creates gradient around food sources
      const strengthMultiplier = Math.max(
        1,
        MAX_PHEROMONE_MULTIPLIER - (this.wanderingTime / (PHEROMONE_FADE_TIME * 3)) * (MAX_PHEROMONE_MULTIPLIER - 1)
      );
      pheromoneStrength = strengthMultiplier;
    }

    grid.addPheromone(this.sprite.x, this.sprite.y, pheromoneType, pheromoneStrength);
  }

  private updateWanderingTimer(deltaTime: number): void {
    if (this.state === "searching") {
      // Increase wandering time when searching for food
      this.wanderingTime += deltaTime;
    } else if (this.state === "returning") {
      // Increase time since finding food (for pheromone gradient)
      // Timer was reset when food was found in checkCollisions()
      this.wanderingTime += deltaTime;
    }
  }

  // Main method for handling sensors and navigation
  handlePheromoneSteering(grid: Grid): void {
    // Update sensor values
    this.updateSensor(this.leftSensor, grid);
    this.updateSensor(this.centreSensor, grid);
    this.updateSensor(this.rightSensor, grid);

    // Check if there are obstacles in any sensor
    const hasObstacles =
      this.centreSensor.value === -Infinity ||
      this.leftSensor.value === -Infinity ||
      this.rightSensor.value === -Infinity;

    let newDir: Vector2D;

    if (hasObstacles) {
      // PRIORITY 1: Obstacle avoidance
      newDir = this.calculateObstacleAvoidance();
    } else {
      // PRIORITY 2-4: Targets and pheromones
      newDir = this.calculateNavigationDirection();
    }

    // Apply new direction with appropriate smoothing
    const hasStrongSignal = this.hasStrongTargetSignal();
    const smoothFactor = hasStrongSignal ? 0.8 : 0.15; // React faster to targets

    this.desiredDirection = VectorUtils.normalize({
      x: this.desiredDirection.x * (1 - smoothFactor) + newDir.x * smoothFactor,
      y: this.desiredDirection.y * (1 - smoothFactor) + newDir.y * smoothFactor,
    });

    // Reinforce pheromones only if not fleeing from obstacles
    // if (!hasObstacles) {
    //   this.reinforcePheromonesAtPosition(grid);
    // }
  }

  // Calculate direction for obstacle avoidance
  private calculateObstacleAvoidance(): Vector2D {
    let escapeDir = VectorUtils.normalize(this.velocity);

    if (this.leftSensor.value === -Infinity && this.rightSensor.value === -Infinity) {
      // Both sides blocked - turn around
      escapeDir = VectorUtils.multiply(escapeDir, -1);
    } else if (this.leftSensor.value === -Infinity) {
      // Left obstacle - go right
      escapeDir = VectorUtils.fromAngle(VectorUtils.angle(this.velocity) + Math.PI / 3);
    } else if (this.rightSensor.value === -Infinity) {
      // Right obstacle - go left
      escapeDir = VectorUtils.fromAngle(VectorUtils.angle(this.velocity) - Math.PI / 3);
    } else if (this.centreSensor.value === -Infinity) {
      // Only center blocked - choose better side
      const turnAngle = (Math.PI / 4) * (Math.random() > 0.5 ? 1 : -1);
      escapeDir = VectorUtils.fromAngle(VectorUtils.angle(this.velocity) + turnAngle);
    }

    return escapeDir;
  }

  // Calculate navigation direction (proper selection of best sensor)
  private calculateNavigationDirection(): Vector2D {
    const forward = VectorUtils.normalize(this.velocity);
    const leftDir = VectorUtils.fromAngle(VectorUtils.angle(this.velocity) - this.sensorAngle);
    const rightDir = VectorUtils.fromAngle(VectorUtils.angle(this.velocity) + this.sensorAngle);

    // Find sensor with highest value
    const sensors = [
      { dir: leftDir, value: this.leftSensor.value, name: "left" },
      { dir: forward, value: this.centreSensor.value, name: "center" },
      { dir: rightDir, value: this.rightSensor.value, name: "right" },
    ];

    // Sort by value (highest first)
    sensors.sort((a, b) => b.value - a.value);

    const bestSensor = sensors[0];
    const secondBest = sensors[1];

    // If best sensor has strong signal
    if (bestSensor.value > 1) {
      // If difference between best and second is small, mix directions
      if (secondBest.value > 0.5 && bestSensor.value - secondBest.value < 2) {
        const weight = bestSensor.value / (bestSensor.value + secondBest.value);
        return VectorUtils.normalize({
          x: bestSensor.dir.x * weight + secondBest.dir.x * (1 - weight),
          y: bestSensor.dir.y * weight + secondBest.dir.y * (1 - weight),
        });
      } else {
        // Otherwise go in direction of best sensor
        return bestSensor.dir;
      }
    } else {
      // No strong signal - continue current direction
      return this.desiredDirection;
    }
  }

  // Check if there's a strong signal from targets
  private hasStrongTargetSignal(): boolean {
    // Targets have 200x values, so threshold 100 means at least weak targets
    return this.leftSensor.value > 100 || this.centreSensor.value > 100 || this.rightSensor.value > 100;
  }

  // Підсилюємо феромони в позиції мурахи
  // reinforcePheromonesAtPosition(grid: Grid): void {
  //   const pheromoneType = this.state === "searching" ? "food" : "home";
  //   const currentPheromone = grid.getPheromoneStrength(this.sprite.x, this.sprite.y, pheromoneType);

  //   // Тільки підсилюємо, якщо там вже є феромони
  //   if (currentPheromone > MIN_PHEROMONE_TO_REINFORCE) {
  //     grid.reinforcePheromone(this.sprite.x, this.sprite.y, pheromoneType, PHEROMONE_INCREMENT);
  //   }
  // }

  updateSensor(sensor: Sensor, grid: Grid): void {
    const currentAngle = VectorUtils.angle(this.velocity);
    let sensorAngle = currentAngle;
    if (sensor === this.leftSensor) sensorAngle = currentAngle - this.sensorAngle;
    if (sensor === this.rightSensor) sensorAngle = currentAngle + this.sensorAngle;

    const sensorDistancePixels = this.sensorDistanceCells * this.cellSize;
    sensor.position.x = this.sprite.x + Math.cos(sensorAngle) * sensorDistancePixels;
    sensor.position.y = this.sprite.y + Math.sin(sensorAngle) * sensorDistancePixels;

    const result = this.getSensorResult(grid, sensor.position);

    // Priority system:
    // 1. Obstacles (highest priority) - block any movement
    if (result.obstacle) {
      sensor.value = -Infinity;
      return;
    }

    // 2. Targets (food/nest) - absolute priority over pheromones
    if (result.targetStrength > 0) {
      // Amplify target signal significantly more than pheromones
      sensor.value = result.targetStrength * 200; // Targets are 200x stronger than pheromones
      return;
    }

    // 3. Pheromones - base signal for navigation
    sensor.value = result.pheromoneStrength;
  }

  private getSensorResult(grid: Grid, sensorPosition: Vector2D): SensorResult {
    const result: SensorResult = {
      obstacle: false,
      pheromoneStrength: 0,
      targetStrength: 0,
    };

    // Determine sensor radius in pixels
    const sensorRadiusPixels = this.sensorRadiusCells * this.cellSize;

    // Check all cells within sensor radius
    const cellsToCheck = Math.ceil(sensorRadiusPixels / this.cellSize) + 1;

    for (let dx = -cellsToCheck; dx <= cellsToCheck; dx++) {
      for (let dy = -cellsToCheck; dy <= cellsToCheck; dy++) {
        const checkX = sensorPosition.x + dx * this.cellSize;
        const checkY = sensorPosition.y + dy * this.cellSize;

        // Check if cell is within radius
        const distance = Math.hypot(checkX - sensorPosition.x, checkY - sensorPosition.y);
        if (distance > sensorRadiusPixels) continue;

        // Check if cell is within grid bounds
        const row = Math.floor(checkY / this.cellSize);
        const col = Math.floor(checkX / this.cellSize);
        const isOutOfBounds = !GridUtils.isInBounds(row, col, grid.rows, grid.cols);

        // Priority 1: Obstacles and canvas boundaries
        if (isOutOfBounds) {
          result.obstacle = true;
          return result; // Immediately return when obstacle detected
        }

        const cell = grid.getCell(checkX, checkY);
        if (cell && cell.obstacle) {
          result.obstacle = true;
          return result; // Immediately return when obstacle detected
        }

        if (cell) {
          // The closer to sensor center, the stronger the signal
          const distanceFactor = Math.max(0.1, 1 - distance / sensorRadiusPixels);

          // Priority 2: Targets (food/nest)
          if (this.state === "searching" && cell.food > 0) {
            // Find strongest food signal in radius
            const foodStrength = cell.food * distanceFactor;
            result.targetStrength = Math.max(result.targetStrength, foodStrength);
          } else if (this.state === "returning" && cell.isNest) {
            // Strong signal for nest considering distance
            const nestStrength = 100 * distanceFactor;
            result.targetStrength = Math.max(result.targetStrength, nestStrength);
          }

          // Priority 3: Pheromones - accumulate strength from all cells
          const pheromoneType = this.state === "searching" ? "food" : "home";
          const pheromoneStrength = cell.pheromones[pheromoneType] * distanceFactor;
          result.pheromoneStrength += pheromoneStrength;
        }
      }
    }

    return result;
  }

  // Отримуємо всі феромони в колі навколо позиції
  // getAllPheromonesInCircle(grid: Grid, position: Vector2D, radius: number, type: "food" | "home"): number[] {
  //   const pheromones: number[] = [];
  //   const cellsToCheck = Math.ceil(radius / grid.cellSize) + 1;

  //   for (let dx = -cellsToCheck; dx <= cellsToCheck; dx++) {
  //     for (let dy = -cellsToCheck; dy <= cellsToCheck; dy++) {
  //       const checkX = position.x + dx * grid.cellSize;
  //       const checkY = position.y + dy * grid.cellSize;

  //       const distance = Math.hypot(checkX - position.x, checkY - position.y);
  //       if (distance <= radius) {
  //         const cell = grid.getCell(checkX, checkY);
  //         if (cell) {
  //           const pheromoneValue = type === "food" ? cell.pheromones.food : cell.pheromones.home;
  //           if (pheromoneValue > 0) {
  //             pheromones.push(pheromoneValue);
  //           }
  //         }
  //       }
  //     }
  //   }

  //   return pheromones;
  // }

  // Отримуємо сигнал з сенсора в певному напрямку
  getSensorSignal(grid: Grid, angle: number): SensorSignal {
    const sensorDistancePixels = this.sensorDistanceCells * this.cellSize;
    const sensorPosition = {
      x: this.sprite.x + Math.cos(angle) * sensorDistancePixels,
      y: this.sprite.y + Math.sin(angle) * sensorDistancePixels,
    };

    const cell = grid.getCell(sensorPosition.x, sensorPosition.y);

    if (!cell) {
      return {
        food: 0,
        foodPheromone: 0,
        homePheromone: 0,
        obstacle: false,
      };
    }

    return {
      food: cell.food,
      foodPheromone: cell.pheromones.food,
      homePheromone: cell.pheromones.home,
      obstacle: cell.obstacle,
    };
  }

  // Check collisions with obstacles
  checkCollisions(grid: Grid, onFoodConsumed?: FoodConsumedCallback): void {
    const futurePosition = {
      x: this.sprite.x + this.velocity.x * COLLISION_PREDICTION_DISTANCE,
      y: this.sprite.y + this.velocity.y * COLLISION_PREDICTION_DISTANCE,
    };

    const cell = grid.getCell(futurePosition.x, futurePosition.y);
    if (!cell) return;

    // Get cell coordinates
    const row = Math.floor(futurePosition.y / grid.cellSize);
    const col = Math.floor(futurePosition.x / grid.cellSize);

    // Interaction with food (only while searching)
    if (cell.food > 0 && this.state === "searching") {
      this.carryingFood = true;
      this.state = "returning";
      this.updateTexture(); // Update texture after picking up food
      cell.food = Math.max(0, cell.food - 1);

      // Reset wandering timer when food is found - this creates strong pheromone gradient near food
      this.wanderingTime = 0;

      // Turn ant 180 degrees
      this.velocity.x = -this.velocity.x;
      this.velocity.y = -this.velocity.y;
      this.desiredDirection.x = -this.desiredDirection.x;
      this.desiredDirection.y = -this.desiredDirection.y;

      if (onFoodConsumed) {
        onFoodConsumed(row, col);
      }
    }

    if (cell.food > 0 && this.state === "returning") {
      this.wanderingTime = 0;
    }

    if (cell.isNest && this.state === "searching") {
      this.wanderingTime = 0;
    }

    // Interaction with nest (only while returning with food)
    if (cell.isNest && this.state === "returning" && this.carryingFood) {
      this.carryingFood = false;
      this.state = "searching";
      this.updateTexture(); // Update texture after delivering food

      // Reset wandering timer when returning to nest
      this.wanderingTime = 0;

      // Turn ant 180 degrees to search for new food
      this.velocity.x = -this.velocity.x;
      this.velocity.y = -this.velocity.y;
      this.desiredDirection.x = -this.desiredDirection.x;
      this.desiredDirection.y = -this.desiredDirection.y;
    }
  }

  private updateTexture(): void {
    // Update ant texture depending on whether it's carrying food
    if (this.carryingFood) {
      this.sprite.texture = this.carryingTexture;
    } else {
      this.sprite.texture = this.normalTexture;
    }
  }

  private drawSensors(): void {
    if (!this.debugEnabled || !this.debugGraphics) return;

    this.debugGraphics.clear();

    // Draw circles for sensors (radius = sensor.radius)
    const sensors = [this.leftSensor, this.centreSensor, this.rightSensor];
    const colors = [0xff0000, 0x00ff00, 0x0000ff]; // red/left, green/centre, blue/right

    sensors.forEach((sensor, i) => {
      const alpha = Math.min(1, Math.abs(sensor.value) / 100); // alpha by value (for visibility)
      if (this.debugGraphics) {
        this.debugGraphics.circle(sensor.position.x, sensor.position.y, sensor.radius / 2);
        this.debugGraphics.fill({ color: colors[i], alpha });
        this.debugGraphics.stroke({ width: 1, color: colors[i] });
      }
    });
  }
}

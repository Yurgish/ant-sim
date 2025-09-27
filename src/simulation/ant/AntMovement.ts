import {
  ANT_MAX_SPEED,
  ANT_STEER_STRENGTH,
  ANT_WANDER_STRENGTH,
  EDGE_COLLISION_MARGIN,
} from "@simulation/constants/ant";
import type { Vector2D } from "@simulation/types";
import { VectorUtils } from "@simulation/utils";

//import type { AntSensors } from "./AntSensors";
import type { LinearAntSensors } from "./LinearAntSensors";

export class AntMovement {
  velocity: Vector2D;
  desiredDirection: Vector2D;

  maxSpeed: number = ANT_MAX_SPEED;
  steerStrength: number = ANT_STEER_STRENGTH;
  wanderStrength: number = ANT_WANDER_STRENGTH;

  constructor(initialDirection: Vector2D) {
    this.velocity = { ...initialDirection };
    this.desiredDirection = { ...initialDirection };
  }

  update(sensors: LinearAntSensors, deltaTime: number): void {
    this.handlePheromoneSteering(sensors);
    this.addWanderingIfNeeded(sensors);
    this.applyMovement(deltaTime);
  }

  private handlePheromoneSteering(sensors: LinearAntSensors): void {
    const hasObstacles = sensors.hasObstacles();

    let newDir: Vector2D;

    if (hasObstacles) {
      newDir = this.calculateObstacleAvoidance(sensors);
    } else {
      newDir = this.calculateNavigationDirection(sensors);
    }

    const hasStrongSignal = sensors.hasStrongTargetSignal();
    const smoothFactor = hasStrongSignal ? 0.8 : 0.15;

    this.desiredDirection = VectorUtils.normalize({
      x: this.desiredDirection.x * (1 - smoothFactor) + newDir.x * smoothFactor,
      y: this.desiredDirection.y * (1 - smoothFactor) + newDir.y * smoothFactor,
    });
  }

  private calculateObstacleAvoidance(sensors: LinearAntSensors): Vector2D {
    let escapeDir = VectorUtils.normalize(this.velocity);

    if (sensors.leftSensor.value === -Infinity && sensors.rightSensor.value === -Infinity) {
      escapeDir = VectorUtils.multiply(escapeDir, -1);
    } else if (sensors.leftSensor.value === -Infinity) {
      escapeDir = VectorUtils.fromAngle(VectorUtils.angle(this.velocity) + Math.PI / 3);
    } else if (sensors.rightSensor.value === -Infinity) {
      escapeDir = VectorUtils.fromAngle(VectorUtils.angle(this.velocity) - Math.PI / 3);
    } else if (sensors.centreSensor.value === -Infinity) {
      const turnAngle = (Math.PI / 4) * (Math.random() > 0.5 ? 1 : -1);
      escapeDir = VectorUtils.fromAngle(VectorUtils.angle(this.velocity) + turnAngle);
    }

    return escapeDir;
  }

  private calculateNavigationDirection(sensors: LinearAntSensors): Vector2D {
    const forward = VectorUtils.normalize(this.velocity);
    const leftDir = VectorUtils.fromAngle(VectorUtils.angle(this.velocity) - sensors.sensorAngle);
    const rightDir = VectorUtils.fromAngle(VectorUtils.angle(this.velocity) + sensors.sensorAngle);

    const sensorData = [
      { dir: leftDir, value: sensors.leftSensor.value, name: "left" },
      { dir: forward, value: sensors.centreSensor.value, name: "center" },
      { dir: rightDir, value: sensors.rightSensor.value, name: "right" },
    ];

    sensorData.sort((a, b) => b.value - a.value);

    const bestSensor = sensorData[0];
    const secondBest = sensorData[1];

    if (bestSensor.value > 1) {
      if (secondBest.value > 0.5 && bestSensor.value - secondBest.value < 2) {
        const weight = bestSensor.value / (bestSensor.value + secondBest.value);
        return VectorUtils.normalize({
          x: bestSensor.dir.x * weight + secondBest.dir.x * (1 - weight),
          y: bestSensor.dir.y * weight + secondBest.dir.y * (1 - weight),
        });
      } else {
        return bestSensor.dir;
      }
    } else {
      return this.desiredDirection;
    }
  }

  private addWanderingIfNeeded(sensors: LinearAntSensors): void {
    const maxValue = Math.max(sensors.leftSensor.value, sensors.centreSensor.value, sensors.rightSensor.value);
    if (maxValue < 4) {
      const minWanderMult = 0.1;
      const maxWanderMult = 1.0;
      const signalClarity = Math.min(maxValue / 4, 1);
      const wanderMult = maxWanderMult - signalClarity * (maxWanderMult - minWanderMult);
      this.desiredDirection.x += (Math.random() - 0.5) * this.wanderStrength * wanderMult;
      this.desiredDirection.y += (Math.random() - 0.5) * this.wanderStrength * wanderMult;
    }
  }

  private applyMovement(deltaTime: number): void {
    this.desiredDirection = VectorUtils.normalize(this.desiredDirection);
    const desiredVelocity = VectorUtils.multiply(this.desiredDirection, this.maxSpeed);

    this.applySteering(desiredVelocity, deltaTime);
    this.limitSpeed();
  }

  private applySteering(desiredVelocity: Vector2D, deltaTime: number): void {
    let steer = VectorUtils.subtract(desiredVelocity, this.velocity);
    steer = VectorUtils.multiply(steer, this.steerStrength);

    const steerMagnitude = Math.hypot(steer.x, steer.y);
    if (steerMagnitude > this.steerStrength) {
      steer = VectorUtils.multiply(VectorUtils.normalize(steer), this.steerStrength);
    }

    this.velocity = VectorUtils.add(this.velocity, VectorUtils.multiply(steer, deltaTime * 60));
  }

  private limitSpeed(): void {
    const speed = Math.hypot(this.velocity.x, this.velocity.y);
    if (speed > this.maxSpeed) {
      this.velocity = VectorUtils.multiply(VectorUtils.normalize(this.velocity), this.maxSpeed);
    }
  }

  updatePosition(sprite: { x: number; y: number }, deltaTime: number): void {
    const movement = VectorUtils.multiply(this.velocity, deltaTime * 60);
    sprite.x += movement.x;
    sprite.y += movement.y;
  }

  handleSpriteEdgeCollisions(sprite: { x: number; y: number }, width: number, height: number): void {
    const margin = EDGE_COLLISION_MARGIN;

    if (sprite.x < margin) sprite.x = margin;
    if (sprite.y < margin) sprite.y = margin;
    if (sprite.x > width - margin) sprite.x = width - margin;
    if (sprite.y > height - margin) sprite.y = height - margin;
  }

  reverseDirection(): void {
    this.velocity.x = -this.velocity.x;
    this.velocity.y = -this.velocity.y;
    this.desiredDirection.x = -this.desiredDirection.x;
    this.desiredDirection.y = -this.desiredDirection.y;
  }

  getRotation(): number {
    return VectorUtils.angle(this.velocity) + Math.PI / 2;
  }
}

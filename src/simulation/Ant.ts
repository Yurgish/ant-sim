import { Sprite, Texture } from "pixi.js";

import {
  ANT_MAX_SPEED,
  ANT_STEER_STRENGTH,
  ANT_WANDER_STRENGTH,
  COLLISION_DAMPING,
  COLLISION_PREDICTION_DISTANCE,
  EDGE_COLLISION_MARGIN,
  PHEROMONE_TIMER_INTERVAL,
  RANDOM_TURN_RANGE,
  SENSOR_ANGLE,
  SENSOR_DISTANCE,
  SENSOR_THRESHOLD,
} from "./constants";
import { Grid } from "./Grid";
import type { AntState, FoodConsumedCallback, SensorSignal, Vector2D } from "./types";
import { AngleUtils, VectorUtils } from "./utils";

export class Ant {
  sprite: Sprite;
  state: AntState;
  carryingFood: boolean = false;

  // Текстури для різних станів
  private normalTexture: Texture;
  private carryingTexture: Texture;

  // Параметри руху
  maxSpeed: number = ANT_MAX_SPEED;
  steerStrength: number = ANT_STEER_STRENGTH;
  wanderStrength: number = ANT_WANDER_STRENGTH;

  // Параметри сенсорів
  sensorDistance: number = SENSOR_DISTANCE;
  sensorAngle: number = SENSOR_ANGLE;

  // Таймер феромонів
  pheromoneTimer: number = 0;
  pheromoneInterval: number = PHEROMONE_TIMER_INTERVAL;

  velocity: Vector2D;
  desiredDirection: Vector2D;

  constructor(x: number, y: number, normalTexture: Texture, carryingTexture: Texture) {
    this.state = "searching";
    this.normalTexture = normalTexture;
    this.carryingTexture = carryingTexture;

    // Ініціалізуємо швидкість випадковим напрямком
    const randomDirection = VectorUtils.fromAngle(AngleUtils.random());
    this.velocity = randomDirection;
    this.desiredDirection = { ...this.velocity };

    // Рандомний старт таймера феромонів
    this.pheromoneTimer = Math.random() * this.pheromoneInterval;

    this.sprite = new Sprite(this.normalTexture); // Створюємо спрайт з нормальною текстурою
    this.sprite.x = x;
    this.sprite.y = y;
    this.sprite.rotation = 0;
    this.sprite.scale.set(0.03, 0.03);
    this.sprite.anchor.set(0.5, 0.5);

    // Встановлюємо початкову текстуру

    // Встановлюємо початкову текстуру
    this.updateTexture();
  }

  step(
    width: number,
    height: number,
    deltaTime: number = 1 / 60,
    grid?: Grid,
    onFoodConsumed?: FoodConsumedCallback
  ): void {
    if (grid) {
      // Перевіряємо сенсори для феромонів та їжі
      this.checkSensors(grid);

      // Перевіряємо колізії
      this.checkCollisions(grid, onFoodConsumed);
    }

    // Додаємо випадкове блукання
    this.addWandering();

    // Нормалізуємо бажаний напрямок
    this.desiredDirection = VectorUtils.normalize(this.desiredDirection);

    // Обчислюємо бажану швидкість
    const desiredVelocity = VectorUtils.multiply(this.desiredDirection, this.maxSpeed);

    // Застосовуємо керування
    this.applySteering(desiredVelocity, deltaTime);

    // Обмежуємо швидкість
    this.limitSpeed();

    // Оновлюємо позицію
    this.updatePosition(deltaTime);

    // Оновлюємо ротацію
    this.updateRotation();

    // Обробляємо колізії з краями
    this.handleEdgeCollisions(width, height);

    // Оновлюємо таймер феромонів
    this.pheromoneTimer += deltaTime;
  }

  private addWandering(): void {
    this.desiredDirection.x += (Math.random() - 0.5) * this.wanderStrength;
    this.desiredDirection.y += (Math.random() - 0.5) * this.wanderStrength;
  }

  private applySteering(desiredVelocity: Vector2D, deltaTime: number): void {
    let steer = VectorUtils.subtract(desiredVelocity, this.velocity);
    steer = VectorUtils.multiply(steer, this.steerStrength);

    // Обмежуємо силу керування
    const steerMagnitude = Math.hypot(steer.x, steer.y);
    if (steerMagnitude > this.steerStrength) {
      steer = VectorUtils.multiply(VectorUtils.normalize(steer), this.steerStrength);
    }

    // Застосовуємо керування
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

  // Метод для перевірки сенсорів (конус перед мурашкою)
  checkSensors(grid: Grid): void {
    const currentAngle = VectorUtils.angle(this.velocity);

    // Створюємо три промені: прямо, ліворуч, праворуч
    const angles = [
      currentAngle, // Прямо
      currentAngle - this.sensorAngle, // Ліворуч
      currentAngle + this.sensorAngle, // Праворуч
    ];

    const signals = angles.map((angle) => this.getSensorSignal(grid, angle));

    // Визначаємо напрямок на основі сигналів і стану мурашки
    if (this.state === "searching") {
      // Шукаємо їжу або їжні феромони
      this.steerTowardsFood(signals, angles);
    } else if (this.state === "returning") {
      // Повертаємось до дому
      this.steerTowardsHome(signals);
    }
  }

  // Направлення до їжі (під час пошуку)
  private steerTowardsFood(signals: SensorSignal[], angles: number[]): void {
    let bestAngle: number | null = null;
    let bestScore = 0;

    for (let i = 0; i < signals.length; i++) {
      const signal = signals[i];

      // Спочатку пріоритет їжі, потім феромонам їжі
      let score = 0;

      if (signal.food > 0) {
        // Пряма їжа має найвищий пріоритет
        score = signal.food * 2;
      } else if (signal.foodPheromone > SENSOR_THRESHOLD && signal.foodDirection) {
        // Феромони їжі з інформацією про напрямок
        const distanceScore = Math.max(0, 1 - signal.foodDistance / 200);
        score = signal.foodPheromone * 0.7 + distanceScore * 0.3;
      }

      if (score > bestScore) {
        bestScore = score;

        if (signal.food > 0) {
          // Прямо до їжі
          bestAngle = angles[i];
        } else if (signal.foodDirection) {
          // У напрямку до їжі
          bestAngle = VectorUtils.angle(signal.foodDirection);
        }
      }
    }

    if (bestAngle !== null) {
      this.steerToAngle(bestAngle, 0.5);
    }
  }

  // Направлення додому (під час повернення)
  private steerTowardsHome(signals: SensorSignal[]): void {
    let bestAngle: number | null = null;
    let bestScore = 0;

    for (let i = 0; i < signals.length; i++) {
      const signal = signals[i];

      if (signal.homePheromone > SENSOR_THRESHOLD && signal.homeDirection) {
        // Оцінюємо сигнал на основі сили феромонів та відстані
        const distanceScore = Math.max(0, 1 - signal.homeDistance / 200);
        const pheromoneScore = signal.homePheromone;
        const score = pheromoneScore * 0.7 + distanceScore * 0.3;

        if (score > bestScore) {
          bestScore = score;
          // Використовуємо напрямок до дому з феромонів
          bestAngle = VectorUtils.angle(signal.homeDirection);
        }
      }
    }

    if (bestAngle !== null) {
      this.steerToAngle(bestAngle, 0.5);
    }
  }

  private steerToAngle(targetAngle: number, force: number): void {
    const currentAngle = VectorUtils.angle(this.velocity);
    const angleDiff = AngleUtils.normalize(targetAngle - currentAngle);
    const steerForce = angleDiff * force;

    this.desiredDirection.x = Math.cos(currentAngle + steerForce);
    this.desiredDirection.y = Math.sin(currentAngle + steerForce);
  }

  // Отримуємо сигнал з сенсора в певному напрямку
  getSensorSignal(grid: Grid, angle: number): SensorSignal {
    const sensorPosition = {
      x: this.sprite.x + Math.cos(angle) * this.sensorDistance,
      y: this.sprite.y + Math.sin(angle) * this.sensorDistance,
    };

    const cell = grid.getCell(sensorPosition.x, sensorPosition.y);

    if (!cell) {
      return {
        food: 0,
        foodPheromone: 0,
        homePheromone: 0,
        obstacle: false,
        homeDirection: null,
        homeDistance: Infinity,
        foodDirection: null,
        foodDistance: Infinity,
      };
    }

    return {
      food: cell.food,
      foodPheromone: cell.pheromones.food,
      homePheromone: cell.pheromones.home,
      obstacle: cell.obstacle,
      homeDirection: cell.pheromones.homeDirection,
      homeDistance: cell.pheromones.homeDistance,
      foodDirection: cell.pheromones.foodDirection,
      foodDistance: cell.pheromones.foodDistance,
    };
  }

  // Перевірка колізій з перешкодами
  checkCollisions(grid: Grid, onFoodConsumed?: FoodConsumedCallback): void {
    const futurePosition = {
      x: this.sprite.x + this.velocity.x * COLLISION_PREDICTION_DISTANCE,
      y: this.sprite.y + this.velocity.y * COLLISION_PREDICTION_DISTANCE,
    };

    const cell = grid.getCell(futurePosition.x, futurePosition.y);
    if (!cell) return;

    // Отримуємо координати клітинки
    const row = Math.floor(futurePosition.y / grid.cellSize);
    const col = Math.floor(futurePosition.x / grid.cellSize);

    // Колізія з перешкодами
    if (cell.obstacle) {
      this.handleObstacleCollision();
      return;
    }

    // Взаємодія з їжею (тільки під час пошуку)
    if (cell.food > 0 && this.state === "searching") {
      this.carryingFood = true;
      this.state = "returning";
      this.updateTexture(); // Оновлюємо текстуру після взяття їжі
      cell.food = Math.max(0, cell.food - 1);

      if (onFoodConsumed) {
        onFoodConsumed(row, col);
      }
    }

    // Взаємодія з гніздом (тільки під час повернення з їжею)
    if (cell.isNest && this.state === "returning" && this.carryingFood) {
      this.carryingFood = false;
      this.state = "searching";
      this.updateTexture(); // Оновлюємо текстуру після здачі їжі
    }
  }

  private handleObstacleCollision(): void {
    // Відбиваємось від перешкоди
    this.velocity.x *= -COLLISION_DAMPING;
    this.velocity.y *= -COLLISION_DAMPING;

    // Додаємо випадковий поворот щоб уникнути застрягання
    const randomAngle = (Math.random() - 0.5) * RANDOM_TURN_RANGE;
    const cos = Math.cos(randomAngle);
    const sin = Math.sin(randomAngle);

    const newVelX = this.velocity.x * cos - this.velocity.y * sin;
    const newVelY = this.velocity.x * sin + this.velocity.y * cos;

    this.velocity.x = newVelX;
    this.velocity.y = newVelY;
  }

  private updateTexture(): void {
    // Оновлюємо текстуру мурахи в залежності від того, чи несе вона їжу
    if (this.carryingFood) {
      this.sprite.texture = this.carryingTexture;
    } else {
      this.sprite.texture = this.normalTexture;
    }
  }
}

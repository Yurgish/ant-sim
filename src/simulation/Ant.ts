import { Particle, Texture } from "pixi.js";

type AntState = "searching" | "returning";

export class Ant {
  particle: Particle;

  state: AntState;
  carryingFood: boolean = false;

  maxSpeed: number = 2;
  steerStrength: number = 0.1;
  wanderStrength: number = 0.5;

  pheromoneTimer: number = 0;
  pheromoneInterval: number = 0.25;

  velocity: { x: number; y: number };
  desiredDirection: { x: number; y: number };

  constructor(x: number, y: number, texture: Texture) {
    this.state = "searching";
    this.velocity = { x: Math.cos(Math.random() * Math.PI * 2), y: Math.sin(Math.random() * Math.PI * 2) };
    this.desiredDirection = { ...this.velocity };
    this.pheromoneTimer = Math.random() * this.pheromoneInterval; // Рандомний старт

    this.particle = new Particle({
      texture,
      x,
      y,
      rotation: 0,
      scaleX: 0.03,
      scaleY: 0.03,
      anchorX: 0.5,
      anchorY: 0.5,
    });
  }

  step(width: number, height: number, deltaTime: number = 1 / 60) {
    this.desiredDirection.x += (Math.random() - 0.5) * this.wanderStrength;
    this.desiredDirection.y += (Math.random() - 0.5) * this.wanderStrength;

    const len = Math.hypot(this.desiredDirection.x, this.desiredDirection.y) || 1;
    this.desiredDirection.x /= len;
    this.desiredDirection.y /= len;

    const desiredVelocity = {
      x: this.desiredDirection.x * this.maxSpeed,
      y: this.desiredDirection.y * this.maxSpeed,
    };

    let steerX = (desiredVelocity.x - this.velocity.x) * this.steerStrength;
    let steerY = (desiredVelocity.y - this.velocity.y) * this.steerStrength;

    const steerLen = Math.hypot(steerX, steerY);
    if (steerLen > this.steerStrength) {
      steerX = (steerX / steerLen) * this.steerStrength;
      steerY = (steerY / steerLen) * this.steerStrength;
    }

    this.velocity.x += steerX * deltaTime * 60;
    this.velocity.y += steerY * deltaTime * 60;

    const vLen = Math.hypot(this.velocity.x, this.velocity.y);
    if (vLen > this.maxSpeed) {
      this.velocity.x = (this.velocity.x / vLen) * this.maxSpeed;
      this.velocity.y = (this.velocity.y / vLen) * this.maxSpeed;
    }

    this.particle.x += this.velocity.x * deltaTime * 60;
    this.particle.y += this.velocity.y * deltaTime * 60;

    this.particle.rotation = Math.atan2(this.velocity.y, this.velocity.x) + Math.PI / 2;

    if (this.particle.x < 0) this.particle.x = width;
    if (this.particle.y < 0) this.particle.y = height;
    if (this.particle.x > width) this.particle.x = 0;
    if (this.particle.y > height) this.particle.y = 0;

    // Оновлюємо таймер феромонів
    this.pheromoneTimer += deltaTime;
  }

  shouldDropPheromone(): boolean {
    if (this.pheromoneTimer >= this.pheromoneInterval) {
      this.pheromoneTimer = 0;
      return true;
    }
    return false;
  }
}

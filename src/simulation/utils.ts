import type { Vector2D } from "./types";

// Vector utilities
export class VectorUtils {
  static create(x: number, y: number): Vector2D {
    return { x, y };
  }

  static distance(a: Vector2D, b: Vector2D): number {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
  }

  static normalize(vector: Vector2D): Vector2D {
    const length = Math.hypot(vector.x, vector.y) || 1;
    return { x: vector.x / length, y: vector.y / length };
  }

  static direction(from: Vector2D, to: Vector2D): Vector2D {
    return this.normalize({ x: to.x - from.x, y: to.y - from.y });
  }

  static multiply(vector: Vector2D, scalar: number): Vector2D {
    return { x: vector.x * scalar, y: vector.y * scalar };
  }

  static add(a: Vector2D, b: Vector2D): Vector2D {
    return { x: a.x + b.x, y: a.y + b.y };
  }

  static subtract(a: Vector2D, b: Vector2D): Vector2D {
    return { x: a.x - b.x, y: a.y - b.y };
  }

  static dot(a: Vector2D, b: Vector2D): number {
    return a.x * b.x + a.y * b.y;
  }

  static angle(vector: Vector2D): number {
    return Math.atan2(vector.y, vector.x);
  }

  static fromAngle(angle: number): Vector2D {
    return { x: Math.cos(angle), y: Math.sin(angle) };
  }
}

// Angle utilities
export class AngleUtils {
  static normalize(angle: number): number {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }

  static difference(a: number, b: number): number {
    return this.normalize(a - b);
  }

  static random(): number {
    return Math.random() * Math.PI * 2;
  }
}

// Grid utilities
export class GridUtils {
  static getKey(row: number, col: number): string {
    return `${row}-${col}`;
  }

  static getGridPosition(x: number, y: number, cellSize: number): { row: number; col: number } {
    return {
      row: Math.floor(y / cellSize),
      col: Math.floor(x / cellSize),
    };
  }

  static getCellCenter(row: number, col: number, cellSize: number): Vector2D {
    return {
      x: col * cellSize + cellSize / 2,
      y: row * cellSize + cellSize / 2,
    };
  }

  static getCellPosition(row: number, col: number, cellSize: number): Vector2D {
    return {
      x: col * cellSize,
      y: row * cellSize,
    };
  }

  static isInBounds(row: number, col: number, rows: number, cols: number): boolean {
    return row >= 0 && row < rows && col >= 0 && col < cols;
  }
}

// Pheromone utilities
export class PheromoneUtils {
  static calculateDirection(from: Vector2D, to: Vector2D): Vector2D {
    return VectorUtils.direction(from, to);
  }

  static calculateDistance(from: Vector2D, to: Vector2D): number {
    return VectorUtils.distance(from, to);
  }

  static shouldEvaporate(intensity: number, threshold: number): boolean {
    return intensity <= threshold;
  }
}

// General math utilities
export class MathUtils {
  static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  static randomBetween(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  static randomDirection(): Vector2D {
    const angle = AngleUtils.random();
    return VectorUtils.fromAngle(angle);
  }
}

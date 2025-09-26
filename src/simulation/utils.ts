import type { Vector2D } from "./types";

export class VectorUtils {
  static create(x: number, y: number): Vector2D {
    if (!isFinite(x) || !isFinite(y)) return { x: 1, y: 0 };
    return { x, y };
  }

  static distance(a: Vector2D, b: Vector2D): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    return isFinite(d) ? d : 0;
  }

  static normalize(vector: Vector2D): Vector2D {
    const magnitude = Math.hypot(vector.x, vector.y);
    if (!isFinite(magnitude) || magnitude === 0) {
      return { x: 1, y: 0 }; // fallback direction
    }
    return { x: vector.x / magnitude, y: vector.y / magnitude };
  }

  static direction(from: Vector2D, to: Vector2D): Vector2D {
    return this.normalize({ x: to.x - from.x, y: to.y - from.y });
  }

  static multiply(vector: Vector2D, scalar: number): Vector2D {
    if (!isFinite(scalar)) return { x: 0, y: 0 };
    return { x: vector.x * scalar, y: vector.y * scalar };
  }

  static add(a: Vector2D, b: Vector2D): Vector2D {
    return { x: a.x + b.x, y: a.y + b.y };
  }

  static subtract(a: Vector2D, b: Vector2D): Vector2D {
    return { x: a.x - b.x, y: a.y - b.y };
  }

  static dot(a: Vector2D, b: Vector2D): number {
    const v = a.x * b.x + a.y * b.y;
    return isFinite(v) ? v : 0;
  }

  static angle(vector: Vector2D): number {
    const angle = Math.atan2(vector.y, vector.x);
    return isFinite(angle) ? angle : 0;
  }

  static fromAngle(angle: number): Vector2D {
    if (!isFinite(angle)) return { x: 1, y: 0 };
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
// export class GridUtils {
//   static getKey(row: number, col: number): string {
//     return `${row}-${col}`;
//   }

//   static getGridPosition(x: number, y: number, cellSize: number): { row: number; col: number } {
//     return {
//       row: Math.floor(y / cellSize),
//       col: Math.floor(x / cellSize),
//     };
//   }

//   static getCellCenter(row: number, col: number, cellSize: number): Vector2D {
//     return {
//       x: col * cellSize + cellSize / 2,
//       y: row * cellSize + cellSize / 2,
//     };
//   }

//   static getCellPosition(row: number, col: number, cellSize: number): Vector2D {
//     return {
//       x: col * cellSize,
//       y: row * cellSize,
//     };
//   }

//   static isInBounds(row: number, col: number, rows: number, cols: number): boolean {
//     return row >= 0 && row < rows && col >= 0 && col < cols;
//   }
// }

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

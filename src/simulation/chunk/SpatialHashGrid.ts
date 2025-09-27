import { VectorUtils } from "@simulation/utils";

export interface Collidable<T> {
  getPosition(): { x: number; y: number };
  radius: number;
  velocity: { x: number; y: number };
  mass: number;
  onCollision?(other: T): void;
}

// Клас для бакету (комірки)
class Bucket<T extends Collidable<T>> {
  objects: T[] = [];

  add(obj: T): void {
    if (!this.objects.includes(obj)) {
      this.objects.push(obj);
    }
  }

  remove(obj: T): void {
    const index = this.objects.indexOf(obj);
    if (index !== -1) {
      this.objects.splice(index, 1);
    }
  }

  clear(): void {
    this.objects.length = 0;
  }
}

export class SpatialHashGrid<T extends Collidable<T>> {
  private cellSize: number;
  private width: number;
  private height: number;
  public buckets: Map<string, Bucket<T>> = new Map();
  private pushStrength: number;

  constructor(cellSize: number, width: number, height: number, pushStrength: number = 0.5) {
    this.cellSize = cellSize;
    this.width = width;
    this.height = height;
    this.pushStrength = pushStrength;
  }

  // Отримати хеш-ключ для позиції
  private getKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX}_${cellY}`;
  }

  // Додати об'єкт
  insert(obj: T): void {
    const pos = obj.getPosition();
    const key = this.getKey(pos.x, pos.y);
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = new Bucket<T>();
      this.buckets.set(key, bucket);
    }
    bucket.add(obj);
  }

  remove(obj: T): void {
    const pos = obj.getPosition();
    const key = this.getKey(pos.x, pos.y);
    const bucket = this.buckets.get(key);
    if (bucket) {
      bucket.remove(obj);
      if (bucket.objects.length === 0) {
        this.buckets.delete(key);
      }
    }
  }

  update(obj: T, oldX: number, oldY: number): void {
    const oldKey = this.getKey(oldX, oldY);
    const pos = obj.getPosition();
    const newKey = this.getKey(pos.x, pos.y);
    if (oldKey !== newKey) {
      this.remove(obj);
      this.insert(obj);
    }
  }

  getNearby(x: number, y: number, queryRadius: number): T[] {
    const nearby: T[] = [];
    const minX = Math.floor((x - queryRadius) / this.cellSize);
    const maxX = Math.floor((x + queryRadius) / this.cellSize);
    const minY = Math.floor((y - queryRadius) / this.cellSize);
    const maxY = Math.floor((y + queryRadius) / this.cellSize);

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const key = `${cx}_${cy}`;
        const bucket = this.buckets.get(key);
        if (bucket) {
          nearby.push(...bucket.objects);
        }
      }
    }
    return nearby;
  }

  handleCollisions(): void {
    for (const [key, bucket] of this.buckets.entries()) {
      const neighbors = this.getNeighborKeys(key);
      neighbors.push(key);

      for (const objA of bucket.objects) {
        const posA = objA.getPosition();
        for (const neighborKey of neighbors) {
          const neighborBucket = this.buckets.get(neighborKey);
          if (!neighborBucket) continue;
          for (const objB of neighborBucket.objects) {
            if (objA === objB) continue;
            const posB = objB.getPosition();
            const dist = VectorUtils.distance(posA, posB);
            const sumRadius = objA.radius + objB.radius;
            if (dist < sumRadius && dist > 0) {
              const dir = VectorUtils.normalize(VectorUtils.subtract(posB, posA));
              const relativeMass = objA.mass / (objA.mass + objB.mass);
              const push = VectorUtils.multiply(dir, this.pushStrength * (1 - dist / sumRadius));
              objA.velocity = VectorUtils.subtract(objA.velocity, VectorUtils.multiply(push, relativeMass));
              objB.velocity = VectorUtils.add(objB.velocity, VectorUtils.multiply(push, 1 - relativeMass));

              if (objA.onCollision) objA.onCollision(objB);
              if (objB.onCollision) objB.onCollision(objA);
            }
          }
        }
      }
    }
  }

  private getNeighborKeys(key: string): string[] {
    const [cx, cy] = key.split("_").map(Number);
    const neighbors: string[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = cx + dx;
        const ny = cy + dy;

        if (
          nx >= 0 &&
          nx < Math.ceil(this.width / this.cellSize) &&
          ny >= 0 &&
          ny < Math.ceil(this.height / this.cellSize)
        ) {
          neighbors.push(`${nx}_${ny}`);
        }
      }
    }
    return neighbors;
  }

  clear(): void {
    this.buckets.clear();
  }

  getStats(): { bucketCount: number; totalObjects: number } {
    let totalObjects = 0;
    for (const bucket of this.buckets.values()) {
      totalObjects += bucket.objects.length;
    }
    return { bucketCount: this.buckets.size, totalObjects };
  }
}

import type { Grid } from "@simulation/chunk/Grid";
import { EDGE_COLLISION_MARGIN } from "@simulation/constants/ant";

import type { Ant } from "./Ant";

interface CollisionCell {
  ants: Ant[];
}

export class AntCollisionManager {
  private cellSize: number;
  private gridWidth: number;
  private gridHeight: number;
  private worldWidth: number;
  private worldHeight: number;
  private staticGrid: Grid;

  private collisionGrid: CollisionCell[][];

  constructor(cellSize: number, width: number, height: number, staticGrid: Grid) {
    this.cellSize = cellSize * 4;
    this.worldWidth = width;
    this.worldHeight = height;
    this.staticGrid = staticGrid;

    this.gridWidth = Math.ceil(width / this.cellSize);
    this.gridHeight = Math.ceil(height / this.cellSize);

    // Ініціалізуємо простий 2D масив
    this.collisionGrid = [];
    for (let y = 0; y < this.gridHeight; y++) {
      this.collisionGrid[y] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        this.collisionGrid[y][x] = { ants: [] };
      }
    }
  }

  addAnt(ant: Ant): void {
    ant.radius = 3;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  removeAnt(_ant: Ant): void {
    // Нічого не робимо - сітка очищається кожен кадр
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updateAntPosition(_ant: Ant, _oldX: number, _oldY: number): void {
    // Нічого не робимо - позиції оновлюються при handleCollisions
  }

  handleCollisions(ants: Ant[], deltaTime: number): void {
    this.clearGrid();

    this.populateGrid(ants);

    this.processAntCollisions(deltaTime);

    this.processStaticCollisions(ants);
  }

  private clearGrid(): void {
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        this.collisionGrid[y][x].ants.length = 0;
      }
    }
  }

  private populateGrid(ants: Ant[]): void {
    for (const ant of ants) {
      const pos = ant.getPosition();
      const gridX = Math.floor(pos.x / this.cellSize);
      const gridY = Math.floor(pos.y / this.cellSize);

      if (gridX >= 0 && gridX < this.gridWidth && gridY >= 0 && gridY < this.gridHeight) {
        this.collisionGrid[gridY][gridX].ants.push(ant);
      }
    }
  }

  private processAntCollisions(deltaTime: number): void {
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const cell = this.collisionGrid[y][x];
        if (cell.ants.length <= 1) continue;

        // Перевіряємо колізії всередині клітинки
        this.checkCellCollisions(cell.ants, deltaTime);

        if (x < this.gridWidth - 1) {
          this.checkCrossCellCollisions(cell.ants, this.collisionGrid[y][x + 1].ants, deltaTime);
        }
        if (y < this.gridHeight - 1) {
          this.checkCrossCellCollisions(cell.ants, this.collisionGrid[y + 1][x].ants, deltaTime);
        }
        if (x < this.gridWidth - 1 && y < this.gridHeight - 1) {
          this.checkCrossCellCollisions(cell.ants, this.collisionGrid[y + 1][x + 1].ants, deltaTime);
        }
      }
    }
  }

  private checkCellCollisions(ants: Ant[], deltaTime: number): void {
    for (let i = 0; i < ants.length - 1; i++) {
      for (let j = i + 1; j < ants.length; j++) {
        this.resolveCollision(ants[i], ants[j], deltaTime);
      }
    }
  }

  private checkCrossCellCollisions(ants1: Ant[], ants2: Ant[], deltaTime: number): void {
    for (const ant1 of ants1) {
      for (const ant2 of ants2) {
        this.resolveCollision(ant1, ant2, deltaTime);
      }
    }
  }

  private resolveCollision(ant1: Ant, ant2: Ant, deltaTime: number): void {
    const pos1 = ant1.getPosition();
    const pos2 = ant2.getPosition();

    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const minDistance = ant1.radius + ant2.radius;

    if (distance < minDistance && distance > 0) {
      const nx = dx / distance;
      const ny = dy / distance;

      const overlap = minDistance - distance;
      const separationX = nx * overlap * 0.5;
      const separationY = ny * overlap * 0.5;

      ant1.sprite.x -= separationX;
      ant1.sprite.y -= separationY;
      ant2.sprite.x += separationX;
      ant2.sprite.y += separationY;

      const impulseStrength = 0.1 * deltaTime * 60;

      ant1.velocity.x -= nx * impulseStrength;
      ant1.velocity.y -= ny * impulseStrength;
      ant2.velocity.x += nx * impulseStrength;
      ant2.velocity.y += ny * impulseStrength;
    }
  }

  private processStaticCollisions(ants: Ant[]): void {
    for (const ant of ants) {
      const pos = ant.getPosition();
      let needsUpdate = false;

      if (pos.x < EDGE_COLLISION_MARGIN) {
        ant.sprite.x = EDGE_COLLISION_MARGIN;
        ant.velocity.x = Math.abs(ant.velocity.x) * 0.8;
        needsUpdate = true;
      } else if (pos.x > this.worldWidth - EDGE_COLLISION_MARGIN) {
        ant.sprite.x = this.worldWidth - EDGE_COLLISION_MARGIN;
        ant.velocity.x = -Math.abs(ant.velocity.x) * 0.8;
        needsUpdate = true;
      }

      if (pos.y < EDGE_COLLISION_MARGIN) {
        ant.sprite.y = EDGE_COLLISION_MARGIN;
        ant.velocity.y = Math.abs(ant.velocity.y) * 0.8;
        needsUpdate = true;
      } else if (pos.y > this.worldHeight - EDGE_COLLISION_MARGIN) {
        ant.sprite.y = this.worldHeight - EDGE_COLLISION_MARGIN;
        ant.velocity.y = -Math.abs(ant.velocity.y) * 0.8;
        needsUpdate = true;
      }

      const speed = Math.sqrt(ant.velocity.x * ant.velocity.x + ant.velocity.y * ant.velocity.y);
      if (speed > 0.5 && Math.random() < 0.1) {
        this.checkObstacleCollision(ant);
        needsUpdate = true;
      }

      if (needsUpdate && Math.random() < 0.3) {
        ant.forceSensorUpdate();
      }
    }
  }

  private checkObstacleCollision(ant: Ant): void {
    const pos = ant.getPosition();
    const futurePos = {
      x: pos.x + ant.velocity.x * 2,
      y: pos.y + ant.velocity.y * 2,
    };

    const { row, col } = this.staticGrid.pixelsToGrid(futurePos.x, futurePos.y);
    const cell = this.staticGrid.getCellByRowCol(row, col);

    if (cell?.obstacle) {
      const angle = Math.atan2(ant.velocity.y, ant.velocity.x) + (Math.random() - 0.5) * Math.PI;
      const speed = Math.sqrt(ant.velocity.x * ant.velocity.x + ant.velocity.y * ant.velocity.y);

      ant.velocity.x = Math.cos(angle) * speed * 0.7;
      ant.velocity.y = Math.sin(angle) * speed * 0.7;
    }
  }

  private getNearbyAnts(targetAnt: Ant): Ant[] {
    const pos = targetAnt.getPosition();
    const gridX = Math.floor(pos.x / this.cellSize);
    const gridY = Math.floor(pos.y / this.cellSize);

    const nearbyAnts: Ant[] = [];

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const checkX = gridX + dx;
        const checkY = gridY + dy;

        if (checkX >= 0 && checkX < this.gridWidth && checkY >= 0 && checkY < this.gridHeight) {
          nearbyAnts.push(...this.collisionGrid[checkY][checkX].ants);
        }
      }
    }

    return nearbyAnts.filter((ant) => ant !== targetAnt);
  }

  getNearbyAntsForAvoidance(targetAnt: Ant): Ant[] {
    return this.getNearbyAnts(targetAnt);
  }

  clear(): void {
    this.clearGrid();
  }
}

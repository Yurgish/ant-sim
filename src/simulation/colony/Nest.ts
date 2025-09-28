import { MAIN_ENTRANCE_RADIUS, NEST_ENTRANCE_RADIUS } from "@simulation/constants/nest";
import type { Vector2D } from "@simulation/types";

export interface NestEntrance {
  id: string;
  position: Vector2D;
  radius: number;
  isMain: boolean;
  isActive: boolean;
}

export interface NestStats {
  totalFoodStored: number;
  foodDeliveryRate: number;
  antsInside: number;
  totalEntrances: number;
}

export class Nest {
  private id: string;
  private mainEntrance: NestEntrance;
  private secondaryEntrances: Map<string, NestEntrance> = new Map();

  private foodStorage: number = 0;
  private antsInside: Set<number> = new Set();
  private restingAnts: Map<number, { startTime: number; duration: number }> = new Map();

  private foodDeliveryHistory: number[] = [];

  constructor(mainPosition: Vector2D, id?: string) {
    this.id = id || `nest_${Math.random().toString(36).substr(2, 9)}`;
    this.mainEntrance = {
      id: `${this.id}_main`,
      position: { ...mainPosition },
      radius: MAIN_ENTRANCE_RADIUS,
      isMain: true,
      isActive: true,
    };
  }

  addEntrance(position: Vector2D, radius: number = NEST_ENTRANCE_RADIUS): string {
    const entranceId = `${this.id}_entrance_${Date.now()}`;
    const entrance: NestEntrance = {
      id: entranceId,
      position: { ...position },
      radius,
      isMain: false,
      isActive: true,
    };

    this.secondaryEntrances.set(entranceId, entrance);
    return entranceId;
  }

  removeEntrance(entranceId: string): boolean {
    if (entranceId === this.mainEntrance.id) return false;
    return this.secondaryEntrances.delete(entranceId);
  }

  getAllEntrances(): NestEntrance[] {
    return [this.mainEntrance, ...this.secondaryEntrances.values()];
  }

  getMainEntrance(): NestEntrance {
    return this.mainEntrance;
  }

  canAntEnter(position: Vector2D): NestEntrance | null {
    for (const entrance of this.getAllEntrances()) {
      if (!entrance.isActive) continue;

      const distance = Math.sqrt(
        Math.pow(position.x - entrance.position.x, 2) + Math.pow(position.y - entrance.position.y, 2)
      );

      if (distance <= entrance.radius) {
        return entrance;
      }
    }
    return null;
  }

  antEnter(antId: number, restDuration: number): void {
    this.antsInside.add(antId);
    this.restingAnts.set(antId, {
      startTime: Date.now(),
      duration: restDuration * 1000,
    });
  }

  antExit(antId: number): Vector2D {
    this.antsInside.delete(antId);
    this.restingAnts.delete(antId);

    const exitEntrance = this.selectExitEntrance();

    const angle = Math.random() * Math.PI * 2;
    const distance = exitEntrance.radius + 10;

    return {
      x: exitEntrance.position.x + Math.cos(angle) * distance,
      y: exitEntrance.position.y + Math.sin(angle) * distance,
    };
  }

  selectExitEntrance(): NestEntrance {
    const allEntrances = this.getAllEntrances().filter((e) => e.isActive);

    if (allEntrances.length === 1) {
      return allEntrances[0];
    }

    const secondaryEntrances = allEntrances.filter((e) => !e.isMain);

    const secondaryWeightPerEntrance = 0.2;
    const totalSecondaryWeight = secondaryEntrances.length * secondaryWeightPerEntrance;
    const mainWeight = Math.max(0.2, 1.0 - totalSecondaryWeight);

    const rnd = Math.random();

    if (rnd < mainWeight) {
      return this.mainEntrance;
    }

    const secondaryRnd = (rnd - mainWeight) / totalSecondaryWeight;
    const entranceIndex = Math.floor(secondaryRnd * secondaryEntrances.length);
    const selectedEntrance = secondaryEntrances[entranceIndex];

    return selectedEntrance || this.mainEntrance;
  }

  storeFood(amount: number = 1): void {
    this.foodStorage += amount;
    this.foodDeliveryHistory.push(Date.now());

    const oneMinuteAgo = Date.now() - 60000;
    this.foodDeliveryHistory = this.foodDeliveryHistory.filter((time) => time > oneMinuteAgo);
  }

  consumeFood(amount: number): boolean {
    if (this.foodStorage >= amount) {
      this.foodStorage -= amount;
      return true;
    }
    return false;
  }

  getStats(): NestStats {
    return {
      totalFoodStored: this.foodStorage,
      foodDeliveryRate: this.foodDeliveryHistory.length,
      antsInside: this.antsInside.size,
      totalEntrances: this.getAllEntrances().length,
    };
  }

  getId(): string {
    return this.id;
  }

  contains(x: number, y: number): boolean {
    for (const entrance of this.getAllEntrances()) {
      if (!entrance.isActive) continue;

      const distance = Math.sqrt(Math.pow(x - entrance.position.x, 2) + Math.pow(y - entrance.position.y, 2));

      if (distance <= entrance.radius) {
        return true;
      }
    }
    return false;
  }

  getFoodDeliveryRate(): number {
    return this.foodDeliveryHistory.length;
  }
}

import type { PheromoneField } from "@simulation/chunk/PheromoneField";
import {
  BASE_PHEROMONE_STRENGTH,
  MAX_PHEROMONE_MULTIPLIER,
  PHEROMONE_FADE_TIME,
  PHEROMONE_TIMER_INTERVAL,
} from "@simulation/constants/pheromones";
import type { AntState } from "@simulation/types";
import { PHEROMONE_TYPES } from "@simulation/types/PheromoneTypes";

export class AntPheromones {
  private pheromoneTimer: number = 0;
  private pheromoneInterval: number = PHEROMONE_TIMER_INTERVAL;
  private wanderingTime: number = 0;

  constructor() {
    this.pheromoneTimer = Math.random() * this.pheromoneInterval;
  }

  update(deltaTime: number, state: AntState): void {
    this.pheromoneTimer += deltaTime;
    this.updateWanderingTimer(deltaTime, state);
  }

  shouldDropPheromone(): boolean {
    if (this.pheromoneTimer >= this.pheromoneInterval) {
      this.pheromoneTimer = 0;
      return true;
    }
    return false;
  }

  layPheromones(pheromoneField: PheromoneField, x: number, y: number, state: AntState): void {
    const pheromoneType = state === "searching" ? PHEROMONE_TYPES.HOME : PHEROMONE_TYPES.FOOD;

    let pheromoneStrength = BASE_PHEROMONE_STRENGTH;

    if (state === "searching") {
      const strengthMultiplier = Math.max(
        1,
        MAX_PHEROMONE_MULTIPLIER - (this.wanderingTime / PHEROMONE_FADE_TIME) * (MAX_PHEROMONE_MULTIPLIER - 1)
      );
      pheromoneStrength *= strengthMultiplier;
    } else if (state === "returning") {
      const strengthMultiplier = Math.max(
        1,
        MAX_PHEROMONE_MULTIPLIER - (this.wanderingTime / (PHEROMONE_FADE_TIME * 3)) * (MAX_PHEROMONE_MULTIPLIER - 1)
      );
      pheromoneStrength *= strengthMultiplier;
    }

    pheromoneField.addStrengthPx(x, y, pheromoneType, pheromoneStrength);
  }

  private updateWanderingTimer(deltaTime: number, state: AntState): void {
    if (state === "searching" || state === "returning") {
      this.wanderingTime += deltaTime;
    }
  }

  resetWanderingTimer(): void {
    this.wanderingTime = 0;
  }
}

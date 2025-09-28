import type { AntPopulation } from "./AntPopulation";
import type { Nest } from "./Nest";

export interface GrowthStats {
  rate: number;
  nextGrowthIn: number;
  canGrow: boolean;
}

export class ColonyGrowth {
  private nest: Nest;
  private population: AntPopulation;

  private growthTimer: number = 0;
  private growthInterval: number = 15;

  private foodRequiredPerAnt: number = 20;
  private maxPopulation: number = 5000;

  constructor(nest: Nest, population: AntPopulation) {
    this.nest = nest;
    this.population = population;
  }

  update(deltaTime: number): void {
    this.growthTimer += deltaTime;

    if (this.growthTimer >= this.growthInterval) {
      this.checkGrowthConditions();
      this.growthTimer = 0;
    }
  }

  private checkGrowthConditions(): void {
    const currentCount = this.population.getCount();
    const nestStats = this.nest.getStats();

    const hasEnoughFood = nestStats.totalFoodStored >= this.foodRequiredPerAnt;
    const belowMaxPopulation = currentCount < this.maxPopulation;
    const goodEfficiency = nestStats.foodDeliveryRate > currentCount * 0.1;

    if (hasEnoughFood && belowMaxPopulation && goodEfficiency) {
      this.growPopulation();
    }
  }

  private growPopulation(): void {
    const currentCount = this.population.getCount();
    const growthAmount = Math.max(1, Math.floor(currentCount * 0.05));

    if (this.nest.consumeFood(growthAmount * this.foodRequiredPerAnt)) {
      this.population.setTargetCount(currentCount + growthAmount);
      console.log(`🐜 Колонія виросла на ${growthAmount} мурах! Тепер: ${currentCount + growthAmount}`);
    }
  }

  getStats(): GrowthStats {
    const nestStats = this.nest.getStats();
    const currentCount = this.population.getCount();

    return {
      rate: this.calculateGrowthRate(),
      nextGrowthIn: this.growthInterval - this.growthTimer,
      canGrow: nestStats.totalFoodStored >= this.foodRequiredPerAnt && currentCount < this.maxPopulation,
    };
  }

  private calculateGrowthRate(): number {
    const nestStats = this.nest.getStats();
    const currentCount = this.population.getCount();

    if (currentCount === 0) return 0;

    const efficiency = nestStats.foodDeliveryRate / currentCount;
    return Math.min(1.0, efficiency / 0.5);
  }
}

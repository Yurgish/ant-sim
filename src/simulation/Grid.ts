import { MAX_FOOD_PER_CELL, MIN_PHEROMONE_THRESHOLD, PHEROMONE_EVAPORATION_RATE } from "./constants";
import type { Cell, PheromoneType, Vector2D } from "./types";
import { GridUtils, VectorUtils } from "./utils";

export class Grid {
  rows: number;
  cols: number;
  cellSize: number;
  width: number;
  height: number;
  cells: Cell[][];

  constructor(width: number, height: number, cellSize: number) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;

    this.cols = Math.floor(width / cellSize);
    this.rows = Math.floor(height / cellSize);

    this.cells = this.initializeCells();
  }

  private initializeCells(): Cell[][] {
    return Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => ({
        food: 0,
        pheromones: {
          food: 0,
          home: 0,
          homeDirection: null,
          homeDistance: Infinity,
          foodDirection: null,
          foodDistance: Infinity,
        },
        obstacle: false,
        isNest: false,
      }))
    );
  }

  updateCell(row: number, col: number): void {
    if (!GridUtils.isInBounds(row, col, this.rows, this.cols)) return;

    const cell = this.cells[row][col];

    // Випаровування феромонів
    cell.pheromones.food *= PHEROMONE_EVAPORATION_RATE;
    cell.pheromones.home *= PHEROMONE_EVAPORATION_RATE;

    // Очищення слабких феромонів
    if (cell.pheromones.home < MIN_PHEROMONE_THRESHOLD) {
      cell.pheromones.homeDirection = null;
      cell.pheromones.homeDistance = Infinity;
    }

    if (cell.pheromones.food < MIN_PHEROMONE_THRESHOLD) {
      cell.pheromones.foodDirection = null;
      cell.pheromones.foodDistance = Infinity;
    }
  }

  updateAll(): void {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        this.updateCell(row, col);
      }
    }
  }

  addPheromone(x: number, y: number, type: PheromoneType, amount: number = 1, targetPosition?: Vector2D): void {
    const { row, col } = GridUtils.getGridPosition(x, y, this.cellSize);

    if (!GridUtils.isInBounds(row, col, this.rows, this.cols)) return;

    const cell = this.cells[row][col];

    if (type === "food") {
      cell.pheromones.food = Math.min(cell.pheromones.food + amount, MAX_FOOD_PER_CELL);
    } else {
      cell.pheromones.home = Math.min(cell.pheromones.home + amount, MAX_FOOD_PER_CELL);

      // Додаємо інформацію про напрямок до гнізда
      if (targetPosition) {
        this.updateDirectionInfo(row, col, targetPosition, "home");
      }
    }
  }

  // Метод для додавання феромонів їжі з інформацією про напрямок
  addFoodPheromone(x: number, y: number, amount: number, foodPosition: Vector2D): void {
    const { row, col } = GridUtils.getGridPosition(x, y, this.cellSize);

    if (!GridUtils.isInBounds(row, col, this.rows, this.cols)) return;

    const cell = this.cells[row][col];
    cell.pheromones.food = Math.min(cell.pheromones.food + amount, MAX_FOOD_PER_CELL);

    this.updateDirectionInfo(row, col, foodPosition, "food");
  }

  private updateDirectionInfo(row: number, col: number, targetPosition: Vector2D, type: "home" | "food"): void {
    const cellCenter = GridUtils.getCellCenter(row, col, this.cellSize);
    const direction = VectorUtils.direction(cellCenter, targetPosition);
    const distance = VectorUtils.distance(cellCenter, targetPosition);

    const cell = this.cells[row][col];

    if (type === "home") {
      cell.pheromones.homeDirection = direction;
      cell.pheromones.homeDistance = distance;
    } else {
      cell.pheromones.foodDirection = direction;
      cell.pheromones.foodDistance = distance;
    }
  }

  getCell(x: number, y: number): Cell | null {
    const { row, col } = GridUtils.getGridPosition(x, y, this.cellSize);

    if (!GridUtils.isInBounds(row, col, this.rows, this.cols)) {
      return null;
    }

    return this.cells[row][col];
  }

  getCellByRowCol(row: number, col: number): Cell | null {
    if (!GridUtils.isInBounds(row, col, this.rows, this.cols)) {
      return null;
    }

    return this.cells[row][col];
  }

  // Обчислення напрямків до гнізда для всієї сітки
  calculateHomeDirections(nestPosition: Vector2D): void {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const cell = this.cells[row][col];

        // Пропускаємо перешкоди
        if (cell.obstacle) continue;

        // Оновлюємо напрямок тільки якщо є домашні феромони
        if (cell.pheromones.home > MIN_PHEROMONE_THRESHOLD) {
          this.updateDirectionInfo(row, col, nestPosition, "home");
        }
      }
    }
  }

  // Обчислення напрямків до їжі для всієї сітки
  calculateFoodDirections(): void {
    // Знаходимо всі позиції з їжею
    const foodPositions: Vector2D[] = [];

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const cell = this.cells[row][col];
        if (cell.food > 0) {
          foodPositions.push(GridUtils.getCellCenter(row, col, this.cellSize));
        }
      }
    }

    // Оновлюємо напрямки до найближчої їжі для кожної клітинки з феромонами їжі
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const cell = this.cells[row][col];

        if (cell.pheromones.food > MIN_PHEROMONE_THRESHOLD && foodPositions.length > 0) {
          const cellCenter = GridUtils.getCellCenter(row, col, this.cellSize);

          // Знаходимо найближчу їжу
          let closestFood = foodPositions[0];
          let minDistance = VectorUtils.distance(cellCenter, closestFood);

          for (const foodPos of foodPositions) {
            const distance = VectorUtils.distance(cellCenter, foodPos);
            if (distance < minDistance) {
              minDistance = distance;
              closestFood = foodPos;
            }
          }

          this.updateDirectionInfo(row, col, closestFood, "food");
        }
      }
    }
  }

  // Знаходження позиції гнізда
  findNestPosition(): Vector2D | null {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.cells[row][col].isNest) {
          return GridUtils.getCellCenter(row, col, this.cellSize);
        }
      }
    }
    return null;
  }

  // Знаходження всіх позицій їжі
  findFoodPositions(): Vector2D[] {
    const positions: Vector2D[] = [];

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.cells[row][col].food > 0) {
          positions.push(GridUtils.getCellCenter(row, col, this.cellSize));
        }
      }
    }

    return positions;
  }
}

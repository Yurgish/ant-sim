import { Container, Graphics } from "pixi.js";

import { Grid } from "./Grid";

export type CellType = "nest" | "food" | "obstacle" | "empty";

export class GridSystem {
  container: Container;
  grid: Grid;
  graphics: Graphics;
  private needsRedraw: boolean = false;

  constructor(grid: Grid) {
    this.grid = grid;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    this.draw();
  }
  draw() {
    this.graphics.clear();

    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const cell = this.grid.cells[r][c];
        const x = c * this.grid.cellSize;
        const y = r * this.grid.cellSize;

        let cellType: CellType = "empty";

        if (cell.isNest) {
          cellType = "nest";
        } else if (cell.obstacle) {
          cellType = "obstacle";
        } else if (cell.food > 0) {
          cellType = "food";
        }
        this.drawCell(x, y, cellType);
      }
    }
  }

  private drawCell(x: number, y: number, type: CellType) {
    const cellSize = this.grid.cellSize;

    const colors = {
      nest: 0x8b4513,
      food: 0x32cd32,
      obstacle: 0x696969,
      empty: 0xffffff,
    };

    const color = colors[type];
    const alpha = type === "empty" ? 0.1 : 1;

    this.graphics.rect(x, y, cellSize, cellSize);
    this.graphics.fill({ color, alpha });
    this.graphics.stroke({ color: 0xcccccc, width: 0.5 });
  }

  setCellTypeAtPosition(x: number, y: number, type: CellType) {
    const col = Math.floor(x / this.grid.cellSize);
    const row = Math.floor(y / this.grid.cellSize);

    if (row >= 0 && row < this.grid.rows && col >= 0 && col < this.grid.cols) {
      const cell = this.grid.cells[row][col];

      switch (type) {
        case "food":
          cell.food = 100;
          cell.obstacle = false;
          cell.isNest = false;
          break;
        case "obstacle":
          cell.obstacle = true;
          cell.food = 0;
          cell.isNest = false;
          break;
        case "nest":
          cell.isNest = true;
          cell.food = 0;
          cell.obstacle = false;
          break;
        case "empty":
          cell.food = 0;
          cell.obstacle = false;
          cell.isNest = false;
          break;
      }

      this.needsRedraw = true;
    }
  }

  setCellTypeInRadius(centerX: number, centerY: number, radius: number, type: CellType) {
    const cellSize = this.grid.cellSize;
    const startCol = Math.max(0, Math.floor((centerX - radius) / cellSize));
    const endCol = Math.min(this.grid.cols - 1, Math.floor((centerX + radius) / cellSize));
    const startRow = Math.max(0, Math.floor((centerY - radius) / cellSize));
    const endRow = Math.min(this.grid.rows - 1, Math.floor((centerY + radius) / cellSize));

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const cellCenterX = col * cellSize + cellSize / 2;
        const cellCenterY = row * cellSize + cellSize / 2;
        const distance = Math.sqrt(Math.pow(cellCenterX - centerX, 2) + Math.pow(cellCenterY - centerY, 2));

        if (distance <= radius) {
          const cell = this.grid.cells[row][col];

          switch (type) {
            case "food":
              cell.food = 100;
              cell.obstacle = false;
              cell.isNest = false;
              break;
            case "obstacle":
              cell.obstacle = true;
              cell.food = 0;
              cell.isNest = false;
              break;
            case "nest":
              cell.isNest = true;
              cell.food = 0;
              cell.obstacle = false;
              break;
            case "empty":
              cell.food = 0;
              cell.obstacle = false;
              cell.isNest = false;
              break;
          }
        }
      }
    }

    this.needsRedraw = true;
  }

  update() {
    if (this.needsRedraw) {
      this.draw();
      this.needsRedraw = false;
    }
  }

  destroy() {
    this.graphics.destroy();
    this.container.destroy();
  }
}

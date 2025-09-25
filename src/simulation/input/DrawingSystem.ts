import type { Grid } from "@simulation/chunk/Grid";
import type { CellType } from "@simulation/types";

import type { Colony } from "../Colony";
import type { InputManager } from "./InputManager";

export interface DrawingConfig {
  brushType: CellType;
  brushSize: number;
  continuousDrawing: boolean;
}

export class DrawingSystem {
  private grid: Grid;
  private colony: Colony;
  private inputManager: InputManager;
  private config: DrawingConfig;

  private isDrawing: boolean = false;
  private lastDrawPosition: { x: number; y: number } | null = null;

  private onDrawingStart?: () => void;
  private onDrawingEnd?: () => void;
  private onBrushChange?: (config: DrawingConfig) => void;

  constructor(grid: Grid, colony: Colony, inputManager: InputManager, initialConfig: Partial<DrawingConfig> = {}) {
    this.grid = grid;
    this.colony = colony;
    this.inputManager = inputManager;

    this.config = {
      brushType: "food",
      brushSize: 20,
      continuousDrawing: true,
      ...initialConfig,
    };
  }

  update(): void {
    this.handleInput();
  }

  private handleInput(): void {
    const mouse = this.inputManager.mouse;

    if (mouse.isDown && !this.isDrawing) {
      this.startDrawing(mouse.x, mouse.y);
    } else if (!mouse.isDown && this.isDrawing) {
      this.stopDrawing();
    }

    if (this.isDrawing && this.config.continuousDrawing) {
      this.drawAtPosition(mouse.x, mouse.y);
    }

    this.handleKeyboardInput();
  }

  private handleKeyboardInput(): void {
    if (this.inputManager.isKeyPressed("1")) {
      this.setBrushType("nest");
    } else if (this.inputManager.isKeyPressed("2")) {
      this.setBrushType("food");
    } else if (this.inputManager.isKeyPressed("3")) {
      this.setBrushType("obstacle");
    } else if (this.inputManager.isKeyPressed("4")) {
      this.setBrushType("empty");
    }

    if (this.inputManager.isKeyPressed("=") || this.inputManager.isKeyPressed("+")) {
      this.increaseBrushSize();
    } else if (this.inputManager.isKeyPressed("-")) {
      this.decreaseBrushSize();
    }

    if (this.inputManager.isKeyPressed("c")) {
      this.toggleContinuousDrawing();
    }
  }

  private startDrawing(x: number, y: number): void {
    this.isDrawing = true;
    this.lastDrawPosition = { x, y };

    this.drawAtPosition(x, y);

    if (this.onDrawingStart) {
      this.onDrawingStart();
    }
  }

  private stopDrawing(): void {
    this.isDrawing = false;
    this.lastDrawPosition = null;

    if (this.onDrawingEnd) {
      this.onDrawingEnd();
    }
  }

  private drawAtPosition(x: number, y: number): void {
    if (
      this.lastDrawPosition &&
      Math.abs(this.lastDrawPosition.x - x) < 5 &&
      Math.abs(this.lastDrawPosition.y - y) < 5
    ) {
      return;
    }

    this.lastDrawPosition = { x, y };

    if (this.config.brushType === "nest") {
      this.placeNest(x, y);
    } else {
      this.paintCells(x, y);
    }
  }

  private placeNest(x: number, y: number): void {
    const oldNest = this.colony.getNestPosition();
    if (oldNest) {
      const nestSize = this.config.brushSize;
      this.paintCellsInRadius(oldNest.x, oldNest.y, nestSize, "empty");
    }

    const nestSize = Math.max(this.config.brushSize, 10);
    this.paintCellsInRadius(x, y, nestSize, "nest");

    // this.colony.setNestPosition(x, y);
  }

  private paintCells(x: number, y: number): void {
    this.paintCellsInRadius(x, y, this.config.brushSize, this.config.brushType);
  }

  private paintCellsInRadius(x: number, y: number, radius: number, type: CellType): void {
    const { row: centerRow, col: centerCol } = this.grid.pixelsToGrid(x, y);
    const radiusCells = radius / this.grid.cellSize;

    this.grid.setCellTypeInRadius(centerRow, centerCol, radiusCells, type);
  }

  setBrushType(type: CellType): void {
    this.config.brushType = type;
    this.notifyBrushChange();
  }

  setBrushSize(size: number): void {
    this.config.brushSize = Math.max(5, Math.min(200, size));
    this.notifyBrushChange();
  }

  increaseBrushSize(): void {
    this.setBrushSize(this.config.brushSize + 5);
  }

  decreaseBrushSize(): void {
    this.setBrushSize(this.config.brushSize - 5);
  }

  toggleContinuousDrawing(): void {
    this.config.continuousDrawing = !this.config.continuousDrawing;
    this.notifyBrushChange();
  }

  setContinuousDrawing(enabled: boolean): void {
    this.config.continuousDrawing = enabled;
    this.notifyBrushChange();
  }

  getBrushType(): CellType {
    return this.config.brushType;
  }

  getBrushSize(): number {
    return this.config.brushSize;
  }

  isContinuousDrawing(): boolean {
    return this.config.continuousDrawing;
  }

  getConfig(): DrawingConfig {
    return { ...this.config };
  }

  setOnDrawingStart(callback: () => void): void {
    this.onDrawingStart = callback;
  }

  setOnDrawingEnd(callback: () => void): void {
    this.onDrawingEnd = callback;
  }

  setOnBrushChange(callback: (config: DrawingConfig) => void): void {
    this.onBrushChange = callback;
  }

  private notifyBrushChange(): void {
    if (this.onBrushChange) {
      this.onBrushChange(this.getConfig());
    }
  }

  isCurrentlyDrawing(): boolean {
    return this.isDrawing;
  }

  destroy(): void {
    this.onDrawingStart = undefined;
    this.onDrawingEnd = undefined;
    this.onBrushChange = undefined;
  }
}

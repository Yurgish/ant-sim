import { Application, Assets, Texture } from "pixi.js";

import antSprite from "/ant.png";
import antRedSprite from "/ant-red.png";

import { Grid } from "./chunk/Grid";
import { PheromoneField } from "./chunk/PheromoneField";
import { Colony } from "./Colony";
import { DEBUG_ENABLED } from "./constants/constants";
import { GridRenderer } from "./renderers/GridRenderer";
import { PheromoneRenderer } from "./renderers/PheromoneRenderer";

export class Simulation {
  app: Application;
  grid: Grid;
  colony: Colony;
  pheromoneField: PheromoneField;

  gridRenderer: GridRenderer;
  pheromoneRenderer: PheromoneRenderer;

  private updateFunction: (ticker: { deltaTime: number }) => void;

  public currentBrushType: "nest" | "food" | "obstacle" | "empty" = "food";
  public brushSize: number = 20;
  private isDrawing: boolean = false;
  private isPaused: boolean = false;
  private userPaused: boolean = false;
  private drawingPaused: boolean = false;

  private constructor(
    app: Application,
    grid: Grid,
    pheromoneField: PheromoneField,
    colony: Colony,
    gridRenderer: GridRenderer,
    pheromoneRenderer: PheromoneRenderer
  ) {
    this.app = app;
    this.grid = grid;
    this.pheromoneField = pheromoneField;
    this.colony = colony;
    this.gridRenderer = gridRenderer;
    this.pheromoneRenderer = pheromoneRenderer;
    this.updateFunction = this.update.bind(this);
  }

  static async init(container: HTMLElement, width: number, height: number, cellSize: number): Promise<Simulation> {
    let canvas = container.querySelector("canvas") as HTMLCanvasElement;

    if (!canvas) {
      canvas = document.createElement("canvas");
      container.appendChild(canvas);
    }

    const app = new Application();

    await app.init({ canvas: canvas, width, height, backgroundColor: 0xffffff });

    const CHUNK_SIZE = 16;
    const grid = new Grid(width, height, cellSize, CHUNK_SIZE);
    const pheromoneField = new PheromoneField(width, height, cellSize, CHUNK_SIZE);

    const pheromoneRenderer = new PheromoneRenderer(pheromoneField);
    const gridRenderer = new GridRenderer(grid);

    app.stage.addChild(gridRenderer.getContainer());
    app.stage.addChild(pheromoneRenderer.getContainer());

    if (DEBUG_ENABLED) {
      app.stage.addChild(gridRenderer.getDebugContainer());
    }

    const antTexture: Texture = await Assets.load(antSprite);
    const antRedTexture: Texture = await Assets.load(antRedSprite);

    const colony = new Colony(antTexture, antRedTexture, width, height, cellSize);
    app.stage.addChild(colony.getContainer());

    const simulation = new Simulation(app, grid, pheromoneField, colony, gridRenderer, pheromoneRenderer);

    colony.setNestPosition(width / 2, height / 2);
    const nestPos = colony.getNestPosition();

    if (nestPos) {
      const { row, col } = grid.pixelsToGrid(nestPos.x, nestPos.y);
      grid.setCellTypeInRadius(row, col, 3, "nest");
    }

    colony.setAntCount(100);

    simulation.setupMouseEvents();

    app.ticker.add(simulation.updateFunction);

    return simulation;
  }

  private update = (ticker: { deltaTime: number }): void => {
    const deltaTime = ticker.deltaTime / 60;

    if (!this.isPaused) {
      this.colony.update(deltaTime, this.grid, this.pheromoneField);

      this.gridRenderer.update();
      this.pheromoneRenderer.update(deltaTime);

      this.grid.update(deltaTime);
      this.pheromoneField.update(deltaTime);
    }
  };

  setupMouseEvents() {
    this.app.canvas.style.cursor = "crosshair";

    this.app.canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
    this.app.canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
    this.app.canvas.addEventListener("mouseup", this.onMouseUp.bind(this));
    this.app.canvas.addEventListener("mouseleave", this.onMouseUp.bind(this));

    document.addEventListener("mouseup", this.onMouseUp.bind(this));
    document.addEventListener("mouseleave", this.onMouseUp.bind(this));
  }

  private onMouseDown(event: MouseEvent) {
    this.isDrawing = true;

    if (!this.userPaused) {
      this.drawingPaused = true;
      this.updatePauseState();
    }

    this.drawAtPosition(event.offsetX, event.offsetY);
  }

  private onMouseMove(event: MouseEvent) {
    if (this.isDrawing) {
      this.drawAtPosition(event.offsetX, event.offsetY);
    }
  }

  private onMouseUp() {
    this.isDrawing = false;

    this.drawingPaused = false;
    this.updatePauseState();
  }

  setAntCount(count: number) {
    this.colony.setAntCount(count);
  }

  private drawAtPosition(x: number, y: number) {
    if (this.currentBrushType === "nest") {
      this.moveNest(x, y);
    } else {
      const { row, col } = this.grid.pixelsToGrid(x, y);
      const radiusCells = this.brushSize / this.grid.cellSize;

      this.grid.setCellTypeInRadius(
        row,
        col,
        radiusCells,
        this.currentBrushType === "empty" ? "empty" : this.currentBrushType
      );
    }
  }

  setBrushType(type: "nest" | "food" | "obstacle" | "empty") {
    this.currentBrushType = type;
  }

  setBrushSize(size: number) {
    this.brushSize = size;
  }

  moveNest(x: number, y: number) {
    const { row, col } = this.grid.pixelsToGrid(x, y);
    const nestRadius = 3;

    this.grid.setCellTypeInRadius(row, col, nestRadius, "nest");
    this.colony.setNestPosition(x, y);
  }

  private updatePauseState() {
    this.isPaused = this.userPaused || this.drawingPaused;
  }

  pause() {
    this.userPaused = true;
    this.updatePauseState();
  }

  resume() {
    this.userPaused = false;
    this.updatePauseState();
  }

  togglePause() {
    this.userPaused = !this.userPaused;
    this.updatePauseState();
  }

  isPausedState(): boolean {
    return this.isPaused;
  }

  destroy(): void {
    // Stop ticker
    this.app.ticker.remove(this.update, this);

    // Destroy input
    // if (this.inputManager) this.inputManager.destroy();
    // if (this.drawingSystem) this.drawingSystem.destroy();

    // Destroy components
    if (this.colony) this.colony.destroy();
    if (this.gridRenderer) this.gridRenderer.destroy();
    if (this.pheromoneRenderer) this.pheromoneRenderer.destroy();

    // Destroy PIXI app
    this.app.destroy(true);
  }
}

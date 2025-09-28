import { Application, Assets, Texture } from "pixi.js";

import antSprite from "/ant.png";
import antCarryingFood from "/carrying-food-ant.png";

import { Grid } from "./chunk/Grid";
import { PheromoneField } from "./chunk/PheromoneField";
import { ColonyManager } from "./colony/ColonyManager";
import { DEBUG_ENABLED, RENDER_PRESETS } from "./constants/constants";
import { GridRenderer } from "./renderers/GridRenderer";
import { PheromoneRenderer } from "./renderers/PheromoneRenderer";

export class Simulation {
  app: Application;
  grid: Grid;
  colony: ColonyManager;
  pheromoneField: PheromoneField;

  gridRenderer: GridRenderer;
  pheromoneRenderer: PheromoneRenderer;

  private updateFunction: (ticker: { deltaTime: number }) => void;

  public currentBrushType: "nest" | "food" | "obstacle" | "empty" | "move-nest" | "add-entrance" = "food";
  public brushSize: number = 20;
  private isDrawing: boolean = false;
  private isPaused: boolean = false;
  private userPaused: boolean = false;
  private drawingPaused: boolean = false;

  private constructor(
    app: Application,
    grid: Grid,
    pheromoneField: PheromoneField,
    colony: ColonyManager,
    gridRenderer: GridRenderer,
    pheromoneRenderer: PheromoneRenderer
  ) {
    this.app = app;
    this.grid = grid;
    this.pheromoneField = pheromoneField;
    this.colony = colony;
    this.gridRenderer = gridRenderer;
    this.pheromoneRenderer = pheromoneRenderer;

    this.updateFunction = this.simulationLoop.bind(this);
  }

  static async init(container: HTMLElement, width: number, height: number, cellSize: number): Promise<Simulation> {
    let canvas = container.querySelector("canvas") as HTMLCanvasElement;

    if (!canvas) {
      canvas = document.createElement("canvas");
      container.appendChild(canvas);
    }

    const app = new Application();

    await app.init({ canvas: canvas, width, height, backgroundColor: 0xffffff, preference: "webgl" });

    const CHUNK_SIZE = 16;
    const grid = new Grid(width, height, cellSize, CHUNK_SIZE);
    const pheromoneField = new PheromoneField(width, height, cellSize * 1.25, CHUNK_SIZE / 2);

    const pheromoneRenderer = new PheromoneRenderer(pheromoneField);
    const gridRenderer = new GridRenderer(grid);

    app.stage.addChild(gridRenderer.getContainer());
    app.stage.addChild(pheromoneRenderer.getContainer());

    const antTexture: Texture = await Assets.load(antSprite);
    const antCarryingFoodTexture: Texture = await Assets.load(antCarryingFood);

    const nestX = width / 2;
    const nestY = height / 2;
    const colony = new ColonyManager({ x: nestX, y: nestY }, 100);

    colony.initialize(cellSize, width, height, grid, pheromoneField, {
      normal: antTexture,
      carrying: antCarryingFoodTexture,
    });
    app.stage.addChild(colony.getContainer());

    const simulation = new Simulation(app, grid, pheromoneField, colony, gridRenderer, pheromoneRenderer);

    console.log(`Creating initial nest at (${nestX}, ${nestY})`);

    simulation.setOptimalRenderIntervals();

    simulation.setupMouseEvents();

    app.ticker.add(simulation.updateFunction);

    if (DEBUG_ENABLED) {
      app.stage.addChild(pheromoneRenderer.getDebugContainer());
      app.stage.addChild(gridRenderer.getDebugContainer());
    }

    setInterval(() => {
      const stats = colony.getStats();
      const nestStats = colony.getNest().getStats();
      console.log(`📊 Статистика: Мурах: ${stats.totalAnts} (активні: ${stats.activeAnts}), 
        Їжі зібрано: ${stats.foodStored}, 
        Ефективність: ${stats.efficiency.toFixed(2)}, 
        Ріст: ${(stats.growthRate * 100).toFixed(1)}%,
        Входів в гніздо: ${nestStats.totalEntrances}, Мурах всередині: ${nestStats.antsInside}`);
    }, 5000);

    return simulation;
  }

  private simulationLoop = (ticker: { deltaTime: number }): void => {
    const deltaTime = ticker.deltaTime / 60;

    if (!this.isPaused) {
      this.colony.update(deltaTime, this.grid, this.pheromoneField);
    }

    this.gridRenderer.update();

    if (!this.isPaused) {
      this.pheromoneField.update(deltaTime);
      this.pheromoneRenderer.update();
    }
  };

  setupMouseEvents() {
    this.setBrushType(this.currentBrushType);

    this.app.canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
    this.app.canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
    this.app.canvas.addEventListener("mouseup", this.onMouseUp.bind(this));
    this.app.canvas.addEventListener("mouseleave", this.onMouseUp.bind(this));
    this.app.canvas.addEventListener("contextmenu", this.onRightClick.bind(this));

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

  //remake
  private onRightClick(event: MouseEvent) {
    event.preventDefault();

    if (this.currentBrushType === "add-entrance") {
      const entrances = this.colony.getNest().getAllEntrances();
      if (entrances.length > 1) {
        const clickPos = { x: event.offsetX, y: event.offsetY };
        let closestEntrance = null;
        let minDistance = Infinity;

        for (const entrance of entrances) {
          if (entrance.isMain && entrances.length === 1) continue;

          const distance = Math.sqrt(
            Math.pow(clickPos.x - entrance.position.x, 2) + Math.pow(clickPos.y - entrance.position.y, 2)
          );

          if (distance < minDistance && distance < entrance.radius) {
            minDistance = distance;
            closestEntrance = entrance;
          }
        }

        if (closestEntrance) {
          const success = this.colony.removeNestEntrance(closestEntrance.id);
          if (success) {
            console.log(`🗑️ Видалено вхід: ${closestEntrance.id}`);
          }
        }
      }
    }
  }

  setAntCount(count: number) {
    this.colony.setAntCount(count);
  }

  /**
   * Set how often the grid renderer should update visually
   * @param frames - Number of frames between updates (1 = every frame, 2 = every 2nd frame, etc.)
   */
  setGridRenderInterval(frames: number) {
    this.gridRenderer.setUpdateInterval(frames);
  }

  /**
   * Set how often the pheromone renderer should update visually
   * @param frames - Number of frames between updates (1 = every frame, 2 = every 2nd frame, etc.)
   */
  setPheromoneRenderInterval(frames: number) {
    this.pheromoneRenderer.setUpdateInterval(frames);
  }

  /**
   * Set render intervals for optimal performance
   */
  setOptimalRenderIntervals() {
    this.setGridRenderInterval(2); // Update grid every 2 frames
    this.setPheromoneRenderInterval(2); // Update pheromones every 2 frames
  }

  /**
   * Force immediate update of all renderers
   */
  forceRenderUpdate() {
    this.gridRenderer.forceUpdate();
    this.pheromoneRenderer.forceUpdate();
  }

  /**
   * Apply a performance preset for rendering intervals
   * @param preset - The performance preset to apply
   */
  setRenderPreset(preset: keyof typeof RENDER_PRESETS) {
    const settings = RENDER_PRESETS[preset];
    this.setGridRenderInterval(settings.grid);
    this.setPheromoneRenderInterval(settings.pheromones);
  }

  private drawAtPosition(x: number, y: number) {
    if (this.currentBrushType === "nest" || this.currentBrushType === "move-nest") {
      this.moveNest(x, y);
    } else if (this.currentBrushType === "add-entrance") {
      this.addNestEntrance(x, y);
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

  setBrushType(type: "nest" | "food" | "obstacle" | "empty" | "move-nest" | "add-entrance") {
    this.currentBrushType = type;

    // Змінюємо курсор в залежності від режиму
    if (type === "move-nest") {
      this.app.canvas.style.cursor = "move";
    } else if (type === "add-entrance") {
      this.app.canvas.style.cursor = "copy";
    } else {
      this.app.canvas.style.cursor = "crosshair";
    }
  }

  setBrushSize(size: number) {
    this.brushSize = size;
  }

  moveNest(x: number, y: number) {
    this.colony.setNestPosition(x, y);
    console.log(`🏠 Переміщено головний вхід в (${x.toFixed(0)}, ${y.toFixed(0)})`);
  }

  addNestEntrance(x: number, y: number) {
    const entranceId = this.colony.addNestEntrance({ x, y });
    console.log(`➕ Додано новий вхід в (${x.toFixed(0)}, ${y.toFixed(0)}): ${entranceId}`);
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
    this.app.ticker.remove(this.simulationLoop, this);

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

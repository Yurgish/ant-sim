import { Application, Assets, Graphics, Texture } from "pixi.js";

import antSprite from "/ant.png";

import { AntSystem } from "./AntSystem";
import { Grid } from "./Grid";
import { GridSystem } from "./GridSystem";
import { PheromoneSystem } from "./PheromoneSystem";

export class Simulation {
  app: Application;
  grid: Grid;
  gridSystem: GridSystem;
  gridGraphics: Graphics;
  antSystem: AntSystem;
  pheromones: PheromoneSystem;
  private updateFunction: (ticker: { deltaTime: number }) => void;

  public currentBrushType: "nest" | "food" | "obstacle" | "empty" = "food";
  public brushSize: number = 20;
  private isDrawing: boolean = false;
  private isPaused: boolean = false;
  private userPaused: boolean = false; // Пауза встановлена користувачем
  private drawingPaused: boolean = false; // Пауза при малюванні

  private nestPosition: { x: number; y: number } | null = null;

  private constructor(
    app: Application,
    grid: Grid,
    gridSystem: GridSystem,
    gridGraphics: Graphics,
    antSystem: AntSystem,
    pheromones: PheromoneSystem
  ) {
    this.app = app;
    this.grid = grid;
    this.gridSystem = gridSystem;
    this.gridGraphics = gridGraphics;
    this.antSystem = antSystem;
    this.pheromones = pheromones;
    this.updateFunction = this.update.bind(this);
  }

  destroy() {
    this.app.ticker.remove(this.updateFunction);

    this.gridGraphics.destroy();
    this.antSystem.destroy();

    this.app.destroy(true, { children: true });
  }

  static async create(
    container: HTMLElement,
    width: number,
    height: number,
    cellSize: number,
    initialAntCount: number = 100
  ): Promise<Simulation> {
    let canvas = container.querySelector("canvas") as HTMLCanvasElement;

    if (!canvas) {
      canvas = document.createElement("canvas");
      container.appendChild(canvas);
    }

    const app = new Application();

    await app.init({ canvas: canvas, width, height, backgroundColor: 0xffffff });

    const grid = new Grid(width, height, cellSize);
    const gridSystem = new GridSystem(grid);

    const pheromones = new PheromoneSystem(cellSize);

    app.stage.addChild(pheromones.container);
    app.stage.addChild(gridSystem.container);

    const texture: Texture = await Assets.load(antSprite);

    const antSystem = new AntSystem(texture, width, height);
    app.stage.addChild(antSystem.container);

    const gridGraphics = new Graphics();

    const simulation = new Simulation(app, grid, gridSystem, gridGraphics, antSystem, pheromones);

    simulation.setInitialNest(width / 2, height / 2);

    simulation.setAntCount(initialAntCount);

    simulation.setupMouseEvents();

    app.ticker.add(simulation.updateFunction);

    return simulation;
  }

  update(ticker: { deltaTime: number }) {
    if (this.isPaused) return;

    const deltaTime = ticker.deltaTime / 60;

    this.antSystem.update(deltaTime, this.app.canvas.width, this.app.canvas.height);

    const antsReadyToDropPheromone = this.antSystem.getAntsReadyToDropPheromone();

    for (const ant of antsReadyToDropPheromone) {
      if (ant.carryingFood) {
        this.pheromones.add(ant.particle.x, ant.particle.y, "food");
      } else {
        this.pheromones.add(ant.particle.x, ant.particle.y, "home");
      }
    }

    this.pheromones.update(deltaTime);

    this.gridSystem.update();
  }

  setAntCount(newCount: number) {
    this.antSystem.setCount(newCount);
  }

  setPheromonesVisible(visible: boolean) {
    if (visible) {
      if (!this.app.stage.children.includes(this.pheromones.container)) {
        this.app.stage.addChild(this.pheromones.container);
      }
    } else {
      if (this.app.stage.children.includes(this.pheromones.container)) {
        this.app.stage.removeChild(this.pheromones.container);
      }
    }
  }

  setAntsVisible(visible: boolean) {
    if (visible) {
      if (!this.app.stage.children.includes(this.antSystem.container)) {
        this.app.stage.addChild(this.antSystem.container);
      }
    } else {
      if (this.app.stage.children.includes(this.antSystem.container)) {
        this.app.stage.removeChild(this.antSystem.container);
      }
    }
  }

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

  private drawAtPosition(x: number, y: number) {
    if (this.currentBrushType === "nest") {
      this.moveNest(x, y);
    } else {
      this.gridSystem.setCellTypeInRadius(x, y, this.brushSize, this.currentBrushType);
    }
  }

  setBrushType(type: "nest" | "food" | "obstacle" | "empty") {
    this.currentBrushType = type;
  }

  setBrushSize(size: number) {
    this.brushSize = size;
  }

  setGridVisible(visible: boolean) {
    if (visible) {
      if (!this.app.stage.children.includes(this.gridSystem.container)) {
        this.app.stage.addChild(this.gridSystem.container);
      }
    } else {
      if (this.app.stage.children.includes(this.gridSystem.container)) {
        this.app.stage.removeChild(this.gridSystem.container);
      }
    }
  }

  setInitialNest(x: number, y: number) {
    this.nestPosition = { x, y };
    this.antSystem.setNestPosition(x, y);
    this.gridSystem.setCellTypeAtPosition(x, y, "nest");
  }

  moveNest(x: number, y: number) {
    if (this.nestPosition) {
      this.gridSystem.setCellTypeAtPosition(this.nestPosition.x, this.nestPosition.y, "empty");
    }

    this.setInitialNest(x, y);
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
}

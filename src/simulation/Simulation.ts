import { Application, Assets, Graphics, ParticleContainer, Texture } from "pixi.js";

import antSprite from "/ant.png";

import { Ant } from "./Ant";
import { Grid } from "./Grid";
import { PheromoneSystem } from "./PheromoneSystem";

export class Simulation {
  app: Application;
  grid: Grid;
  ants: Ant[];
  gridGraphics: Graphics;
  antContainer: ParticleContainer;
  pheromones: PheromoneSystem;
  private updateFunction: (ticker: { deltaTime: number }) => void;
  private antTexture: Texture;

  private constructor(
    app: Application,
    grid: Grid,
    gridGraphics: Graphics,
    antContainer: ParticleContainer,
    pheromones: PheromoneSystem,
    antTexture: Texture
  ) {
    this.app = app;
    this.grid = grid;
    this.ants = [];
    this.gridGraphics = gridGraphics;
    this.antContainer = antContainer;
    this.pheromones = pheromones;
    this.antTexture = antTexture;
    this.updateFunction = this.update.bind(this);
  }

  destroy() {
    this.app.ticker.remove(this.updateFunction);

    this.gridGraphics.destroy();
    this.antContainer.destroy();

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

    const antContainer = new ParticleContainer({
      dynamicProperties: {
        position: true,
        rotation: true,
        scale: false,
        color: false,
      },
    });

    const pheromones = new PheromoneSystem(cellSize);
    app.stage.addChild(pheromones.container);
    app.stage.addChild(antContainer);

    const texture: Texture = await Assets.load(antSprite);

    const gridGraphics = new Graphics();

    const simulation = new Simulation(app, grid, gridGraphics, antContainer, pheromones, texture);

    simulation.setAntCount(initialAntCount);

    app.ticker.add(simulation.updateFunction);

    return simulation;
  }

  update(ticker: { deltaTime: number }) {
    const deltaTime = ticker.deltaTime / 60;

    for (const ant of this.ants) {
      ant.step(this.grid.width, this.grid.height, deltaTime);

      if (ant.shouldDropPheromone()) {
        if (ant.carryingFood) {
          this.pheromones.add(ant.particle.x, ant.particle.y, "food");
        } else {
          this.pheromones.add(ant.particle.x, ant.particle.y, "home");
        }
      }
    }

    this.pheromones.update(deltaTime);
  }

  setAntCount(newCount: number) {
    const currentCount = this.ants.length;

    if (newCount === currentCount) return;

    if (newCount > currentCount) {
      for (let i = currentCount; i < newCount; i++) {
        const ant = new Ant(this.grid.width / 2, this.grid.height / 2, this.antTexture);
        this.ants.push(ant);
        this.antContainer.addParticle(ant.particle);
      }
    } else {
      for (let i = currentCount - 1; i >= newCount; i--) {
        const ant = this.ants[i];
        this.antContainer.removeParticle(ant.particle);
        this.ants.splice(i, 1);
      }
    }
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
      if (!this.app.stage.children.includes(this.antContainer)) {
        this.app.stage.addChild(this.antContainer);
      }
    } else {
      if (this.app.stage.children.includes(this.antContainer)) {
        this.app.stage.removeChild(this.antContainer);
      }
    }
  }
}

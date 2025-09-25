import { ANT_SIZE_IN_CELLS } from "@simulation/constants/ant";
import { Sprite, Texture } from "pixi.js";

export class AntRenderer {
  sprite: Sprite;
  private normalTexture: Texture;
  private carryingTexture: Texture;

  constructor(x: number, y: number, normalTexture: Texture, carryingTexture: Texture, cellSize: number) {
    this.normalTexture = normalTexture;
    this.carryingTexture = carryingTexture;

    this.sprite = new Sprite(this.normalTexture);
    this.sprite.x = x;
    this.sprite.y = y;
    this.sprite.rotation = 0;

    const desiredSize = ANT_SIZE_IN_CELLS * cellSize;
    const textureSize = Math.max(this.normalTexture.width, this.normalTexture.height);
    const scale = desiredSize / textureSize;

    this.sprite.scale.set(scale, scale);
    this.sprite.anchor.set(0.5, 0.5);
  }

  updateTexture(carryingFood: boolean): void {
    this.sprite.texture = carryingFood ? this.carryingTexture : this.normalTexture;
  }

  updateRotation(rotation: number): void {
    this.sprite.rotation = rotation;
  }

  getPosition(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }
}

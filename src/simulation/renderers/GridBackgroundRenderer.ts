import { Container, Texture, TilingSprite } from "pixi.js";

export class GridBackgroundRenderer {
  private container: Container;
  private tilingSprite: TilingSprite;
  private cellSize: number;

  constructor(tileTexture: Texture, cellSize: number, worldWidth: number, worldHeight: number) {
    this.cellSize = cellSize;

    this.container = new Container();
    this.container.zIndex = -1000;

    this.tilingSprite = new TilingSprite({
      texture: tileTexture,
      width: worldWidth,
      height: worldHeight,
    });

    this.tilingSprite.x = 0;
    this.tilingSprite.y = 0;

    const tileScale = (this.cellSize / tileTexture.width) * 8;
    this.tilingSprite.tileScale.set(tileScale, tileScale);

    this.container.addChild(this.tilingSprite);
  }

  getContainer(): Container {
    return this.container;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

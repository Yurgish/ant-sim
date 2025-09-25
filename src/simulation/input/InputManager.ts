export class InputManager {
  private element: HTMLElement;

  public mouse = {
    x: 0,
    y: 0,
    isDown: false,
  };

  public keys: Set<string> = new Set();

  constructor(element: HTMLElement) {
    this.element = element;
    this.setupListeners();
  }

  private setupListeners(): void {
    this.element.addEventListener("pointerdown", this.handlePointerDown);
    this.element.addEventListener("pointerup", this.handlePointerUp);
    this.element.addEventListener("pointermove", this.handlePointerMove);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  // Обробники подій для миші
  private handlePointerDown = (e: PointerEvent): void => {
    this.mouse.isDown = true;
    this.updateMousePosition(e);
  };

  private handlePointerUp = (): void => {
    this.mouse.isDown = false;
  };

  private handlePointerMove = (e: PointerEvent): void => {
    this.updateMousePosition(e);
  };

  private updateMousePosition(e: PointerEvent): void {
    this.mouse.x = e.offsetX;
    this.mouse.y = e.offsetY;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.key.toLowerCase());
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    // Видаляємо відпущену клавішу з набору
    this.keys.delete(e.key.toLowerCase());
  };

  public isKeyPressed(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  public destroy(): void {
    this.element.removeEventListener("pointerdown", this.handlePointerDown);
    this.element.removeEventListener("pointerup", this.handlePointerUp);
    this.element.removeEventListener("pointermove", this.handlePointerMove);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
  }
}

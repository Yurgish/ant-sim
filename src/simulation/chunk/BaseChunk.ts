export abstract class BaseChunk {
  rows: number;
  cols: number;

  globalRow: number = -1;
  globalCol: number = -1;

  dirty: boolean = false;

  constructor(rows: number, cols: number) {
    this.rows = rows;
    this.cols = cols;
  }

  getIndex(r: number, c: number): number {
    return r * this.cols + c;
  }

  setDirty(): void {
    this.dirty = true;
  }

  clearDirty(): void {
    this.dirty = false;
  }

  abstract update(delta: number): void;
}

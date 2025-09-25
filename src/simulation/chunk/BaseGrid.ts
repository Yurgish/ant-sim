import type { BaseChunk } from "./BaseChunk";

/**
 * Callback function for processing cells in radius
 * @param row - Global row coordinate
 * @param col - Global column coordinate
 * @param distance - Distance from center point
 * @param chunk - The chunk containing this cell
 * @param localRow - Local row within chunk
 * @param localCol - Local column within chunk
 */
export type RadiusCallback<T extends BaseChunk> = (
  row: number,
  col: number,
  distance: number,
  chunk: T,
  localRow: number,
  localCol: number
) => void;

/**
 * Callback function for collecting values in radius
 * @param row - Global row coordinate
 * @param col - Global column coordinate
 * @param distance - Distance from center point
 * @param chunk - The chunk containing this cell
 * @param localRow - Local row within chunk
 * @param localCol - Local column within chunk
 * @returns Value to collect (or null to skip)
 */
export type RadiusCollectorCallback<T extends BaseChunk, R> = (
  row: number,
  col: number,
  distance: number,
  chunk: T,
  localRow: number,
  localCol: number
) => R | null;

export abstract class BaseGrid<T extends BaseChunk> {
  width: number;
  height: number;
  cellSize: number;

  rows: number;
  cols: number;

  chunkSize: number;
  chunkRows: number;
  chunkCols: number;

  chunks: T[][];

  dirtyChunks: Set<T> = new Set();

  constructor(width: number, height: number, cellSize: number, chunkSize: number) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;

    this.cols = Math.floor(width / cellSize);
    this.rows = Math.floor(height / cellSize);

    this.chunkSize = chunkSize;
    this.chunkCols = Math.ceil(this.cols / chunkSize);
    this.chunkRows = Math.ceil(this.rows / chunkSize);

    this.chunks = this.initializeChunks();
  }

  protected abstract createChunk(rows: number, cols: number): T;

  private initializeChunks(): T[][] {
    return Array.from({ length: this.chunkRows }, (_, cr) =>
      Array.from({ length: this.chunkCols }, (_, cc) => {
        const chunk = this.createChunk(this.chunkSize, this.chunkSize);
        chunk.globalRow = cr;
        chunk.globalCol = cc;
        return chunk;
      })
    );
  }

  protected getChunkIndices(row: number, col: number) {
    const chunkRow = Math.floor(row / this.chunkSize);
    const chunkCol = Math.floor(col / this.chunkSize);
    const localRow = row % this.chunkSize;
    const localCol = col % this.chunkSize;
    return { chunkRow, chunkCol, localRow, localCol };
  }

  protected getChunk(row: number, col: number): T | null {
    if (isNaN(row) || isNaN(col)) return null;
    if (row < 0 || col < 0 || row >= this.rows || col >= this.cols) return null;
    const { chunkRow, chunkCol } = this.getChunkIndices(row, col);
    return this.chunks[chunkRow][chunkCol];
  }

  /**
   * Convert pixel coordinates to grid coordinates
   */
  pixelsToGrid(x: number, y: number): { row: number; col: number } {
    return {
      row: Math.floor(y / this.cellSize),
      col: Math.floor(x / this.cellSize),
    };
  }

  /**
   * Convert grid coordinates to pixel coordinates (center of cell)
   */
  gridToPixels(row: number, col: number): { x: number; y: number } {
    return {
      x: col * this.cellSize + this.cellSize / 2,
      y: row * this.cellSize + this.cellSize / 2,
    };
  }

  /**
   * Execute callback for each cell within radius (in grid coordinates)
   */
  forEachInRadius(centerRow: number, centerCol: number, radiusCells: number, callback: RadiusCallback<T>): void {
    const startRow = Math.max(0, Math.floor(centerRow - radiusCells));
    const endRow = Math.min(this.rows - 1, Math.floor(centerRow + radiusCells));
    const startCol = Math.max(0, Math.floor(centerCol - radiusCells));
    const endCol = Math.min(this.cols - 1, Math.floor(centerCol + radiusCells));

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const distance = Math.hypot(row - centerRow, col - centerCol);

        if (distance <= radiusCells) {
          const chunk = this.getChunk(row, col);
          if (chunk) {
            const { localRow, localCol } = this.getChunkIndices(row, col);
            callback(row, col, distance, chunk, localRow, localCol);
          }
        }
      }
    }
  }

  /**
   * Execute callback for each cell within radius (in pixel coordinates)
   */
  forEachInRadiusPixels(centerX: number, centerY: number, radiusPixels: number, callback: RadiusCallback<T>): void {
    const { row: centerRow, col: centerCol } = this.pixelsToGrid(centerX, centerY);
    const radiusCells = radiusPixels / this.cellSize;

    this.forEachInRadius(centerRow, centerCol, radiusCells, (row, col, _distance, chunk, localRow, localCol) => {
      const { x: cellX, y: cellY } = this.gridToPixels(row, col);
      const pixelDistance = Math.hypot(cellX - centerX, cellY - centerY);

      if (pixelDistance <= radiusPixels) {
        callback(row, col, pixelDistance, chunk, localRow, localCol);
      }
    });
  }

  /**
   * Collect values from cells within radius
   */
  collectInRadius<R>(
    centerRow: number,
    centerCol: number,
    radiusCells: number,
    collector: RadiusCollectorCallback<T, R>
  ): R[] {
    const results: R[] = [];

    this.forEachInRadius(centerRow, centerCol, radiusCells, (row, col, distance, chunk, localRow, localCol) => {
      const value = collector(row, col, distance, chunk, localRow, localCol);
      if (value !== null) {
        results.push(value);
      }
    });

    return results;
  }

  /**
   * Collect values from cells within radius (pixel coordinates)
   */
  collectInRadiusPixels<R>(
    centerX: number,
    centerY: number,
    radiusPixels: number,
    collector: RadiusCollectorCallback<T, R>
  ): R[] {
    const results: R[] = [];

    this.forEachInRadiusPixels(centerX, centerY, radiusPixels, (row, col, distance, chunk, localRow, localCol) => {
      const value = collector(row, col, distance, chunk, localRow, localCol);
      if (value !== null) {
        results.push(value);
      }
    });

    return results;
  }

  markRadiusDirty(centerRow: number, centerCol: number, radiusCells: number): void {
    const affectedChunks = new Set<T>();

    this.forEachInRadius(centerRow, centerCol, radiusCells, (_row, _col, _distance, chunk) => {
      affectedChunks.add(chunk);
    });

    for (const chunk of affectedChunks) {
      this.dirtyChunks.add(chunk);
    }
  }

  /**
   * Get statistics about the grid
   */
  getGridStats(): {
    totalChunks: number;
    dirtyChunks: number;
    gridSize: string;
    chunkSize: number;
  } {
    return {
      totalChunks: this.chunkRows * this.chunkCols,
      dirtyChunks: this.dirtyChunks.size,
      gridSize: `${this.cols}x${this.rows}`,
      chunkSize: this.chunkSize,
    };
  }

  update(delta: number): void {
    const chunksToUpdate = Array.from(this.dirtyChunks);
    this.dirtyChunks.clear();
    for (const chunk of chunksToUpdate) {
      chunk.update(delta);
      if (chunk.dirty) {
        this.dirtyChunks.add(chunk);
      }
    }
  }
}

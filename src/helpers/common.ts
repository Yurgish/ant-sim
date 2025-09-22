import type { CanvasSize } from "@components/types";

export const calculateCanvasSize = (): CanvasSize => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  return { width, height };
};

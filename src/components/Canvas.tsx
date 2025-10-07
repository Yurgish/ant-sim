import { GRID_CELL_SIZE } from "@simulation/constants/constants";
import { Simulation } from "@simulation/Simulation";
import { button, useControls } from "leva";
import { useEffect, useRef, useState } from "react";

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<Simulation | null>(null);
  const [isSimulationReady, setIsSimulationReady] = useState(false);

  const restartSimulation = async () => {
    if (simulationRef.current) {
      simulationRef.current.destroy();
      simulationRef.current = null;
      setIsSimulationReady(false);
    }

    if (!containerRef.current) return;

    const container = containerRef.current;
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    try {
      simulationRef.current = await Simulation.init(
        containerRef.current,
        window.innerWidth,
        window.innerHeight,
        GRID_CELL_SIZE
      );
      setIsSimulationReady(true);
    } catch (error) {
      console.error("Failed to restart simulation:", error);
    }
  };

  const controls = useControls("Simulation", {
    antCount: { value: 100, min: 1, max: 5000, step: 1 },
    showAnts: { value: true, label: "Show Ants" },
    showPheromones: { value: false, label: "Show Pheromones" },
    showGrid: { value: true, label: "Show Grid" },
    brushType: {
      value: "food",
      options: ["nest", "food", "obstacle", "empty", "move-nest", "add-entrance"],
      label: "Brush Type",
    },
    brushSize: { value: 20, min: 5, max: 100, step: 5, label: "Brush Size" },
    isPaused: { value: false, label: "Pause Simulation" },
    timeScale: { value: 1.0, min: 0.1, max: 10.0, step: 0.1, label: "Time Speed" },
    "1x": button(() => {
      if (simulationRef.current) simulationRef.current.setTimeScale(1.0);
    }),
    "2x": button(() => {
      if (simulationRef.current) simulationRef.current.setTimeScale(2.0);
    }),
    "5x": button(() => {
      if (simulationRef.current) simulationRef.current.setTimeScale(5.0);
    }),

    restart: button(() => {
      restartSimulation();
    }),
  });

  const { antCount, showAnts, showPheromones, showGrid, brushType, brushSize, isPaused, timeScale } = controls;

  useEffect(() => {
    const initSimulation = async () => {
      if (!containerRef.current) return;

      if (simulationRef.current) return;

      const container = containerRef.current;
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      try {
        simulationRef.current = await Simulation.init(
          containerRef.current,
          window.innerWidth,
          window.innerHeight,
          GRID_CELL_SIZE
        );
        setIsSimulationReady(true);
      } catch (error) {
        console.error("Failed to create simulation:", error);
      }
    };

    initSimulation();

    return () => {
      if (simulationRef.current) {
        simulationRef.current.destroy();
        simulationRef.current = null;
        setIsSimulationReady(false);
      }
    };
  }, []);

  useEffect(() => {
    if (isSimulationReady && simulationRef.current) {
      // simulationRef.current.setAntCount(antCount);
      // simulationRef.current.setAntsVisible(showAnts);
      // simulationRef.current.setPheromonesVisible(showPheromones);
      // simulationRef.current.setGridVisible(showGrid);
      simulationRef.current.setBrushType(brushType as "nest" | "food" | "obstacle" | "empty");
      simulationRef.current.setBrushSize(brushSize);
      simulationRef.current.setTimeScale(timeScale);
      if (isPaused) {
        simulationRef.current.pause();
      } else {
        simulationRef.current.resume();
      }
    }
  }, [isSimulationReady, antCount, showAnts, showPheromones, showGrid, brushType, brushSize, isPaused, timeScale]);

  return <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />;
}

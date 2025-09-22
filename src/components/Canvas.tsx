import { Simulation } from "@simulation/Simulation";
import { useControls } from "leva";
import { useEffect, useRef } from "react";

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<Simulation | null>(null);

  const { antCount, showAnts, showPheromones } = useControls("Simulation", {
    antCount: { value: 100, min: 1, max: 2000, step: 1 },
    showAnts: { value: true, label: "Show Ants" },
    showPheromones: { value: true, label: "Show Pheromones" },
  });

  useEffect(() => {
    const initSimulation = async () => {
      if (!containerRef.current) return;

      if (simulationRef.current) return;

      const container = containerRef.current;
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      try {
        simulationRef.current = await Simulation.create(
          containerRef.current,
          window.innerWidth,
          window.innerHeight,
          10,
          100
        );
      } catch (error) {
        console.error("Failed to create simulation:", error);
      }
    };

    initSimulation();

    return () => {
      if (simulationRef.current) {
        simulationRef.current.destroy();
        simulationRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (simulationRef.current) {
      simulationRef.current.setAntCount(antCount);
    }
  }, [antCount]);

  useEffect(() => {
    if (simulationRef.current) {
      simulationRef.current.setAntsVisible(showAnts);
    }
  }, [showAnts]);

  useEffect(() => {
    if (simulationRef.current) {
      simulationRef.current.setPheromonesVisible(showPheromones);
    }
  }, [showPheromones]);

  return <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />;
}

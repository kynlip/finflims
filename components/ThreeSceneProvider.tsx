"use client";

import dynamic from "next/dynamic";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

const ThreeSceneCanvas = dynamic(
  () => import("./ThreeSceneCanvas").then((module) => module.ThreeSceneCanvas),
  { ssr: false },
);

interface ThreeSceneContextType {
  isLoaded: boolean;
  setIsLoaded: (loaded: boolean) => void;
  cameraPosition: [number, number, number];
  setCameraPosition: (pos: [number, number, number]) => void;
}

const ThreeSceneContext = createContext<ThreeSceneContextType | null>(null);

export function useThreeScene() {
  const context = useContext(ThreeSceneContext);
  if (!context) {
    throw new Error("useThreeScene must be used within ThreeSceneProvider");
  }
  return context;
}

export function ThreeSceneProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [cameraPosition, setCameraPosition] = useState<
    [number, number, number]
  >([0, 8, 18]);
  const [isSceneEnabled, setIsSceneEnabled] = useState(false);

  useEffect(() => {
    const isTouchDevice =
      navigator.maxTouchPoints > 0 ||
      window.matchMedia("(pointer: coarse)").matches;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Keep the heavy WebGL background for mouse-driven desktop layouts only.
    // Touch devices need the page and video controls to stay responsive.
    setIsSceneEnabled(!isTouchDevice && !prefersReducedMotion);
  }, []);

  return (
    <ThreeSceneContext.Provider
      value={{ isLoaded, setIsLoaded, cameraPosition, setCameraPosition }}
    >
      {/* 3D Background Layer */}
      {isSceneEnabled && <ThreeSceneCanvas />}

      {/* HTML Content Layer - on top of 3D canvas */}
      <div className="relative z-10 min-h-screen pointer-events-none">
        <div className="pointer-events-auto">{children}</div>
      </div>
    </ThreeSceneContext.Provider>
  );
}

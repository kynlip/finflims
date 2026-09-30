"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls, Stars } from "@react-three/drei";
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
} from "@react-three/postprocessing";
import * as THREE from "three";
import { BlendFunction } from "postprocessing";

function SceneEnvironment() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <group ref={groupRef}>
      <color attach="background" args={["#0b1221"]} />
      <fog attach="fog" args={["#0b1221", 8, 45]} />
      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={2}
        saturation={0}
        fade
        speed={0.5}
      />
      <ambientLight intensity={0.3} color="#a5b4fc" />
      <pointLight position={[10, 10, 10]} intensity={1.5} color="#c084fc" />
      <pointLight position={[-10, -10, -10]} intensity={0.8} color="#67e8f9" />
      <Environment preset="night" />
    </group>
  );
}

export function ThreeSceneCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 8, 18], fov: 50, near: 0.1, far: 100 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 1,
        pointerEvents: "none",
      }}
      dpr={[1, 1.5]}
    >
      <Suspense fallback={null}>
        <SceneEnvironment />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={0.2}
          enableDamping
          dampingFactor={0.08}
          target={[0, 2, 0]}
        />
        <EffectComposer>
          <Bloom
            intensity={1.2}
            luminanceThreshold={0.1}
            luminanceSmoothing={0.9}
            blendFunction={BlendFunction.SCREEN}
          />
          <ChromaticAberration offset={new THREE.Vector2(0.002, 0.002)} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}

'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Box, Plane, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

interface ThreeWatchTheaterProps {
  videoUrl: string;
  movieTitle: string;
  onClose: () => void;
}

function TheaterEnvironment() {
  const projectorRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (projectorRef.current) {
      projectorRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <>
      {/* Theater Walls with Anime Posters */}
      <Box args={[20, 12, 1]} position={[0, 4, -10]}>
        <meshStandardMaterial color="#1a2333" emissive="#1e3a8a" emissiveIntensity={0.2} />
      </Box>

      {/* Floor with reflection */}
      <Plane args={[30, 30]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
      </Plane>

      {/* Projector */}
      <group ref={projectorRef} position={[-8, 6, -6]}>
        <Box args={[2, 1.5, 3]}>
          <meshStandardMaterial color="#334155" metalness={0.9} />
        </Box>
        <pointLight position={[0, 0, 4]} color="#67e8f9" intensity={8} distance={25} />
      </group>

      {/* Floating Title */}
      <Float speed={1}>
        <Text
          position={[0, 9, -9]}
          fontSize={1.8}
          color="#e0f2fe"
          anchorX="center"
          anchorY="middle"
        >
          { 'Đang xem' }
        </Text>
      </Float>

      {/* God Rays from projector - disabled for simplicity */}
      {/* <GodRays /> */}
    </>
  );
}

export function ThreeWatchTheater({ videoUrl, movieTitle, onClose }: ThreeWatchTheaterProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [texture, setTexture] = useState<THREE.VideoTexture | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.src = videoUrl;
      video.play().catch(console.error);

      const vidTexture = new THREE.VideoTexture(video);
      vidTexture.minFilter = THREE.LinearFilter;
      vidTexture.magFilter = THREE.LinearFilter;
      setTexture(vidTexture);
    }

    return () => {
      if (video) video.pause();
    };
  }, [videoUrl]);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
      <div className="relative w-full h-full">
        <Canvas camera={{ position: [0, 5, 18], fov: 45 }}>
          <ambientLight intensity={0.3} />
          <TheaterEnvironment />

          {/* Main Screen */}
          <Plane args={[16, 9]} position={[0, 4, -8]}>
            <meshBasicMaterial map={texture || undefined} toneMapped={false} />
          </Plane>

          <EffectComposer>
            <Bloom intensity={1.5} luminanceThreshold={0.1} />
          </EffectComposer>
        </Canvas>

        {/* HTML Controls */}
        <div className="absolute top-6 left-6 z-10 flex gap-4">
          <button
            onClick={onClose}
            className="glass-panel px-6 py-3 text-white rounded-2xl flex items-center gap-2 hover:bg-red-500/20"
          >
            ← Thoát rạp
          </button>
          <div className="glass-panel px-6 py-3 text-white rounded-2xl">
            {movieTitle}
          </div>
        </div>

        {/* Video element (hidden) */}
        <video ref={videoRef} className="hidden" loop muted playsInline />
      </div>
    </div>
  );
}

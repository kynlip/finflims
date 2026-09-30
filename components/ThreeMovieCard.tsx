'use client';

import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Movie } from '@/lib/data';

interface ThreeMovieCardProps {
  movie: Movie;
  position?: [number, number, number];
  rank?: number;
}

export function ThreeMovieCard({ movie, position = [0, 0, 0], rank }: ThreeMovieCardProps) {
  const router = useRouter();
  const groupRef = useRef<THREE.Group>(null);
  const cardRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (groupRef.current) {
      // Gentle floating animation
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.6;

      if (hovered && cardRef.current) {
        cardRef.current.rotation.y = THREE.MathUtils.lerp(
          cardRef.current.rotation.y,
          Math.sin(state.clock.elapsedTime * 6) * 0.15,
          0.1
        );
      }
    }
  });

  const handleClick = () => {
    router.push(`/phim/${movie.slug}`);
  };

  return (
    <Float
      speed={1.8}
      rotationIntensity={0.4}
      floatIntensity={0.8}
      position={position}
    >
      <group ref={groupRef}>
        {/* Main Card */}
        <mesh
          ref={cardRef}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          onClick={handleClick}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[4.2, 6, 0.6]} />
          <meshPhongMaterial
            color={hovered ? "#a5b4fc" : "#1e2937"}
            shininess={90}
            emissive={hovered ? "#6366f1" : "#312e81"}
            emissiveIntensity={hovered ? 0.6 : 0.2}
            specular="#e0f2fe"
          />
        </mesh>

        {/* Poster Texture Simulation (in real project use TextureLoader with movie.poster_url) */}
        <mesh position={[0, 0, 0.31]}>
          <planeGeometry args={[3.8, 5.3]} />
          <meshBasicMaterial
            color="#0f172a"
            transparent
            opacity={0.95}
          />
        </mesh>

        {/* Neon Border Glow */}
        <mesh position={[0, 0, 0.35]}>
          <planeGeometry args={[4.0, 6.1]} />
          <meshBasicMaterial
            color="#67e8f9"
            transparent
            opacity={hovered ? 0.7 : 0.25}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Title Text - rendered below the poster plane */}
        <Billboard position={[0, -3.45, 0.4]}>
          <Text
            fontSize={0.38}
            color="#e0f2fe"
            anchorX="center"
            anchorY="middle"
            font="/fonts/inter-bold.woff" // Replace with actual font
            outlineWidth={0.02}
            outlineColor="#312e81"
          >
            {movie.name.length > 18 ? movie.name.substring(0, 17) + '...' : movie.name}
          </Text>
        </Billboard>

        {/* Episode Badge */}
        <Billboard position={[1.6, 2.4, 0.5]}>
          <Text
            fontSize={0.32}
            color="#c084fc"
            anchorX="center"
            anchorY="middle"
          >
            {movie.episode_current || 'Tập Mới'}
          </Text>
        </Billboard>

        {/* Rank if available */}
        {rank && (
          <Billboard position={[-1.8, 2.6, 0.5]}>
            <Text
              fontSize={0.9}
              color="#f472b6"
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
            >
              #{rank}
            </Text>
          </Billboard>
        )}

        {/* Hover Spark Particles (simplified) */}
        {hovered && (
          <pointLight
            position={[0, 1, 2]}
            color="#a5b4fc"
            intensity={4}
            distance={8}
          />
        )}
      </group>
    </Float>
  );
}

// HTML version for fallback / hybrid use
export function ThreeMovieCardHTML({ movie, rank }: { movie: Movie; rank?: number }) {
  return (
    <Link
      href={`/phim/${movie.slug}`}
      className="movie-card-3d group relative block w-full cursor-pointer"
    >
      <div className="glass-panel relative aspect-2/3 w-full overflow-hidden rounded-3xl border border-violet-400/30 shadow-2xl transition-all duration-500 hover:-translate-y-3 hover:rotate-2 hover:shadow-[0_0_60px_-10px] hover:shadow-violet-500/50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={movie.poster_url}
          alt={movie.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />

        {/* Anime corner decorations */}
        <div className="absolute -left-1 -top-1 h-8 w-8 border-l-4 border-t-4 border-violet-400" />
        <div className="absolute -right-1 -bottom-1 h-8 w-8 border-r-4 border-b-4 border-fuchsia-400" />
      </div>

      <div className="mt-3 flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <h3 className="neon-text line-clamp-2 text-lg font-bold text-white">
            {movie.name}
          </h3>
          <div className="mt-1 text-xs uppercase tracking-widest text-sky-300">
            {movie.episode_current || 'Mới cập nhật'}
          </div>
        </div>
        {rank && <div className="shrink-0 text-3xl font-black text-pink-400 opacity-80">#{rank}</div>}
      </div>
    </Link>
  );
}

'use client';

import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function buildHeartGeometry() {
  // Classic heart outline (three.js example), drawn point-down after the flip below.
  const s = new THREE.Shape();
  s.moveTo(25, 25);
  s.bezierCurveTo(25, 25, 20, 0, 0, 0);
  s.bezierCurveTo(-30, 0, -30, 35, -30, 35);
  s.bezierCurveTo(-30, 55, -10, 77, 25, 95);
  s.bezierCurveTo(60, 77, 80, 55, 80, 35);
  s.bezierCurveTo(80, 35, 80, 0, 50, 0);
  s.bezierCurveTo(35, 0, 25, 25, 25, 25);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 14,
    bevelEnabled: true,
    bevelSegments: 6,
    steps: 1,
    bevelSize: 6,
    bevelThickness: 6,
    curveSegments: 24,
  });
  geo.center();
  geo.rotateZ(Math.PI);
  geo.scale(0.018, 0.018, 0.018);
  return geo;
}

function SpinningHeart({ color }: { color: string }) {
  const mesh = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => buildHeartGeometry(), []);

  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const t = clock.getElapsedTime();
    m.rotation.y = t * 1.1;
    // Double "lub-dub" beat roughly once a second.
    const beat = Math.max(0, Math.sin(t * 6.3)) ** 6 + 0.5 * Math.max(0, Math.sin(t * 6.3 - 0.9)) ** 6;
    const s = 1 + beat * 0.12;
    m.scale.set(s, s, s);
  });

  return (
    <mesh ref={mesh} geometry={geometry}>
      <meshStandardMaterial color={color} roughness={0.35} metalness={0.15} />
    </mesh>
  );
}

export default function Heart3D({ color = '#BE185D' }: { color?: string }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 3.4], fov: 40 }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      style={{ width: '100%', height: '100%' }}
      aria-hidden="true"
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 3, 4]} intensity={1.6} />
      <pointLight position={[-3, -2, 2]} intensity={0.6} />
      <SpinningHeart color={color} />
    </Canvas>
  );
}

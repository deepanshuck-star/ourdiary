'use client';

import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useThemeColors, type ThemeColors } from './capabilities';
import { dampTowards } from '@/lib/features/globe-math';
import { stationPointIndices, trackControlPoints, wrapProgress } from '@/lib/features/track-layout';

// Client-only (load with next/dynamic ssr:false). A low-poly toy train looping a curved
// track, with one clickable station per relationship milestone.

export type TrainStation = { label: string; date: string; reached: boolean };

type Props = {
  stations: TrainStation[];
  selected: number | null;
  onSelect: (index: number) => void;
  /** Reduced motion: no looping, the train jumps straight to the selected station. */
  still: boolean;
};

const UP = new THREE.Vector3(0, 1, 0);
const TRAIN_SPEED = 0.028; // loops per second when cruising
const CAR_GAP = 0.034; // spacing between cars, as a fraction of the loop

function useTrack(stationCount: number) {
  return useMemo(() => {
    const points = trackControlPoints(stationCount).map(([x, y, z]) => new THREE.Vector3(x, y, z));
    const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.5);

    // Two rails offset sideways from the centre line.
    const samples = 160;
    const left: THREE.Vector3[] = [];
    const right: THREE.Vector3[] = [];
    const sleepers: Array<{ position: THREE.Vector3; look: THREE.Vector3 }> = [];
    for (let i = 0; i < samples; i++) {
      const t = i / samples;
      const p = curve.getPointAt(t);
      const tan = curve.getTangentAt(t);
      const side = new THREE.Vector3().crossVectors(tan, UP).normalize();
      left.push(p.clone().addScaledVector(side, 0.32));
      right.push(p.clone().addScaledVector(side, -0.32));
      if (i % 2 === 0) sleepers.push({ position: p, look: p.clone().add(tan) });
    }
    const leftRail = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(left, true), samples * 2, 0.045, 6, true);
    const rightRail = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(right, true), samples * 2, 0.045, 6, true);

    // Arc-length parameter of each station's control point (getPointAt space).
    const divisions = 400;
    const lengths = curve.getLengths(divisions);
    const total = lengths[divisions];
    const pointIdx = stationPointIndices(stationCount);
    const stationT = pointIdx.map((pi) => lengths[Math.round((pi / points.length) * divisions)] / total);
    const stationPos = pointIdx.map((pi, i) => {
      const p = points[pi];
      const tan = curve.getTangentAt(stationT[i]);
      const side = new THREE.Vector3().crossVectors(tan, UP).normalize();
      // Put platforms on the outside of the loop.
      if (side.dot(new THREE.Vector3(p.x, 0, p.z)) < 0) side.negate();
      return p.clone().addScaledVector(side, 1.05);
    });

    return { curve, leftRail, rightRail, sleepers, stationT, stationPos };
  }, [stationCount]);
}

function Sleeper({ position, look, color }: { position: THREE.Vector3; look: THREE.Vector3; color: string }) {
  return (
    <mesh
      ref={(m) => {
        if (m) m.lookAt(look);
      }}
      position={position}
    >
      <boxGeometry args={[0.95, 0.06, 0.16]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

function Locomotive({ colors }: { colors: ThemeColors }) {
  return (
    <group>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.8, 0.22, 1.5]} />
        <meshStandardMaterial color={colors.ink} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.62, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 1.0, 16]} />
        <meshStandardMaterial color={colors.primary} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.98, 0.5]}>
        <cylinderGeometry args={[0.1, 0.14, 0.38, 12]} />
        <meshStandardMaterial color={colors.ink} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.78, -0.48]}>
        <boxGeometry args={[0.78, 0.74, 0.55]} />
        <meshStandardMaterial color={colors.secondary} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.2, -0.48]}>
        <boxGeometry args={[0.9, 0.08, 0.68]} />
        <meshStandardMaterial color={colors.primary} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.62, 0.71]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshStandardMaterial color="#FFE9A8" emissive="#FFD27A" emissiveIntensity={0.8} />
      </mesh>
      <Wheels colors={colors} zs={[-0.5, 0.05, 0.5]} />
    </group>
  );
}

function Carriage({ colors }: { colors: ThemeColors }) {
  return (
    <group>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.8, 0.2, 1.2]} />
        <meshStandardMaterial color={colors.ink} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.66, 0]}>
        <boxGeometry args={[0.76, 0.56, 1.12]} />
        <meshStandardMaterial color={colors.secondary} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.98, 0]}>
        <boxGeometry args={[0.88, 0.08, 1.24]} />
        <meshStandardMaterial color={colors.primary} roughness={0.4} />
      </mesh>
      <Wheels colors={colors} zs={[-0.38, 0.38]} />
    </group>
  );
}

function Wheels({ colors, zs }: { colors: ThemeColors; zs: number[] }) {
  return (
    <>
      {zs.flatMap((z) =>
        [-0.42, 0.42].map((x) => (
          <mesh key={`${x}:${z}`} position={[x, 0.2, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.17, 0.17, 0.08, 14]} />
            <meshStandardMaterial color={colors.ink} roughness={0.5} />
          </mesh>
        ))
      )}
    </>
  );
}

function Train({
  curve,
  targetT,
  still,
  colors,
}: {
  curve: THREE.CatmullRomCurve3;
  targetT: number | null;
  still: boolean;
  colors: ThemeColors;
}) {
  const cars = useRef<Array<THREE.Group | null>>([]);
  const progress = useRef(targetT ?? 0);
  const scratch = useRef({ pos: new THREE.Vector3(), tan: new THREE.Vector3() });

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    if (targetT !== null) {
      if (still) {
        progress.current = targetT;
      } else {
        // Always roll forward to the chosen station, slowing as it pulls in.
        const ahead = wrapProgress(targetT - progress.current);
        const remaining = ahead > 0.999 ? 0 : ahead;
        const speed = Math.min(0.12, Math.max(0.012, remaining * 1.8));
        progress.current = wrapProgress(progress.current + Math.min(remaining, speed * dt));
      }
    } else if (!still) {
      progress.current = wrapProgress(progress.current + dt * TRAIN_SPEED);
    }

    const { pos, tan } = scratch.current;
    cars.current.forEach((car, i) => {
      if (!car) return;
      const t = wrapProgress(progress.current - i * CAR_GAP);
      curve.getPointAt(t, pos);
      curve.getTangentAt(t, tan);
      car.position.set(pos.x, pos.y + 0.06, pos.z);
      car.lookAt(pos.x + tan.x, pos.y + 0.06 + tan.y, pos.z + tan.z);
    });
  });

  return (
    <>
      {[0, 1, 2].map((i) => (
        <group
          key={i}
          ref={(g) => {
            cars.current[i] = g;
          }}
        >
          {i === 0 ? <Locomotive colors={colors} /> : <Carriage colors={colors} />}
        </group>
      ))}
    </>
  );
}

function Station({
  station,
  position,
  index,
  selected,
  colors,
  onSelect,
}: {
  station: TrainStation;
  position: THREE.Vector3;
  index: number;
  selected: boolean;
  colors: ThemeColors;
  onSelect: (i: number) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const beacon = useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    const b = beacon.current;
    if (!b) return;
    const target = selected ? 1.5 : hovered ? 1.25 : 1;
    b.scale.setScalar(dampTowards(b.scale.x, target, 8, Math.min(dt, 0.1)));
  });

  const beaconColor = station.reached ? colors.primary : colors.secondary;

  return (
    <group
      position={position}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect(index);
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = '';
      }}
    >
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.55, 0.6, 0.16, 20]} />
        <meshStandardMaterial color={colors.surface} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1.1, 8]} />
        <meshStandardMaterial color={colors.inkMuted} roughness={0.6} />
      </mesh>
      <mesh ref={beacon} position={[0, 1.38, 0]}>
        <sphereGeometry args={[0.22, 20, 20]} />
        <meshStandardMaterial
          color={beaconColor}
          emissive={beaconColor}
          emissiveIntensity={selected ? 0.9 : station.reached ? 0.45 : 0.15}
          roughness={0.35}
        />
      </mesh>
      {selected && (
        <Html position={[0, 2.05, 0]} center distanceFactor={10} zIndexRange={[20, 0]}>
          <div className="px-3 py-1 rounded-full bg-surface border border-line shadow-card text-[11px] font-semibold text-ink whitespace-nowrap pointer-events-none">
            {station.label}
          </div>
        </Html>
      )}
    </group>
  );
}

function World({ stations, selected, onSelect, still }: Props) {
  const colors = useThemeColors();
  const track = useTrack(stations.length);
  const targetT = selected !== null ? (track.stationT[selected] ?? null) : null;

  return (
    <>
      <ambientLight intensity={colors.dark ? 0.55 : 0.85} />
      <directionalLight position={[6, 12, 8]} intensity={colors.dark ? 0.9 : 1.2} />
      <hemisphereLight args={[colors.surface, colors.line, 0.35]} />

      {/* Ground */}
      <mesh position={[0, -0.12, 0]} receiveShadow>
        <cylinderGeometry args={[11.5, 11.5, 0.2, 64]} />
        <meshStandardMaterial color={colors.line} roughness={1} />
      </mesh>

      {/* Track */}
      {track.sleepers.map((s, i) => (
        <Sleeper key={i} position={s.position} look={s.look} color={colors.inkMuted} />
      ))}
      <mesh geometry={track.leftRail} position={[0, 0.07, 0]}>
        <meshStandardMaterial color={colors.primary} metalness={0.3} roughness={0.35} />
      </mesh>
      <mesh geometry={track.rightRail} position={[0, 0.07, 0]}>
        <meshStandardMaterial color={colors.primary} metalness={0.3} roughness={0.35} />
      </mesh>

      {stations.map((st, i) => (
        <Station
          key={`${st.label}-${i}`}
          station={st}
          index={i}
          position={track.stationPos[i]}
          selected={selected === i}
          colors={colors}
          onSelect={onSelect}
        />
      ))}

      <Train curve={track.curve} targetT={targetT} still={still} colors={colors} />
    </>
  );
}

export default function TrainScene(props: Props) {
  const [ready, setReady] = useState(false);
  return (
    <div className="relative h-[440px] sm:h-[520px] rounded-[1.25rem] bg-hero border border-line shadow-card overflow-hidden">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 9.5, 13], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={() => setReady(true)}
      >
        <World {...props} />
        <OrbitControls
          enablePan={false}
          minDistance={8}
          maxDistance={24}
          minPolarAngle={0.35}
          maxPolarAngle={Math.PI / 2.25}
          enableDamping={!props.still}
        />
      </Canvas>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-ink-muted">
          Laying down the tracks...
        </div>
      )}
      <p className="absolute left-3 bottom-3 px-3 py-1 rounded-full bg-surface/85 backdrop-blur text-[11px] text-ink-muted pointer-events-none">
        Drag to look around · tap a station
      </p>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useThemeColors } from './capabilities';
import { dampTowards } from '@/lib/features/globe-math';
import {
  frontIndexForRotation,
  ringLayout,
  ringRadius,
  rotationForIndex,
} from '@/lib/features/ring-layout';

// Client-only (load with next/dynamic ssr:false). Photos on a slowly turning cylinder.

export type RingPhoto = { id: string; url: string; caption?: string; memoryTitle: string };

type Props = {
  photos: RingPhoto[];
  onOpen: (index: number) => void;
  /** No auto-spin, no easing (reduced motion). */
  still: boolean;
};

const CARD_W = 1.6;
const CARD_H = 2.05;
const BORDER = 0.08;
const DRAG_THRESHOLD_PX = 6;

type RingState = {
  rotation: number;
  target: number | null;
  dragging: boolean;
  startX: number;
  startRotation: number;
  movedPx: number;
  hovering: boolean;
};

function usePhotoTexture(url: string) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    const tex = loader.load(
      url,
      (t) => {
        if (!alive) return;
        // object-fit: cover inside the card.
        const img = t.image as { width?: number; height?: number } | undefined;
        const imgAspect = img?.width && img?.height ? img.width / img.height : CARD_W / CARD_H;
        const cardAspect = CARD_W / CARD_H;
        if (imgAspect > cardAspect) {
          t.repeat.set(cardAspect / imgAspect, 1);
          t.offset.set((1 - t.repeat.x) / 2, 0);
        } else {
          t.repeat.set(1, imgAspect / cardAspect);
          t.offset.set(0, (1 - t.repeat.y) / 2);
        }
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        t.needsUpdate = true;
        setTexture(t);
      },
      undefined,
      () => {
        // Usually a host without CORS headers: show a soft placeholder card instead.
        if (alive) setFailed(true);
      }
    );
    return () => {
      alive = false;
      tex.dispose();
    };
  }, [url]);

  return { texture, failed };
}

function PhotoCard({
  photo,
  position,
  rotationY,
  isFront,
  frameColor,
  placeholderColor,
  onSelect,
  onHover,
}: {
  photo: RingPhoto;
  position: [number, number, number];
  rotationY: number;
  isFront: boolean;
  frameColor: string;
  placeholderColor: string;
  onSelect: () => void;
  onHover: (on: boolean) => void;
}) {
  const { texture, failed } = usePhotoTexture(photo.url);
  const [hovered, setHovered] = useState(false);
  const group = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const target = hovered ? 1.07 : isFront ? 1.03 : 1;
    const s = dampTowards(g.scale.x, target, 10, dt);
    g.scale.setScalar(s);
  });

  return (
    <group ref={group} position={position} rotation={[0, rotationY, 0]}>
      <mesh
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHovered(true);
          onHover(true);
        }}
        onPointerOut={() => {
          setHovered(false);
          onHover(false);
        }}
      >
        <planeGeometry args={[CARD_W + BORDER * 2, CARD_H + BORDER * 2]} />
        <meshBasicMaterial color={frameColor} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.005]} raycast={() => null}>
        <planeGeometry args={[CARD_W, CARD_H]} />
        {/* Separate keys so the placeholder material isn't reused (its color would tint the photo). */}
        {texture && !failed ? (
          <meshBasicMaterial key="photo" map={texture} color="#ffffff" toneMapped={false} />
        ) : (
          <meshBasicMaterial key="placeholder" color={placeholderColor} toneMapped={false} />
        )}
      </mesh>
    </group>
  );
}

function Ring({
  photos,
  ringRef,
  still,
  onOpen,
  onFrontChange,
}: {
  photos: RingPhoto[];
  ringRef: RefObject<RingState>;
  still: boolean;
  onOpen: (index: number) => void;
  onFrontChange: (index: number) => void;
}) {
  const colors = useThemeColors();
  const group = useRef<THREE.Group>(null);
  const radius = ringRadius(photos.length, CARD_W, 0.35);
  const slots = useMemo(() => ringLayout(photos.length, radius), [photos.length, radius]);
  const [front, setFront] = useState(0);

  useFrame((_, rawDt) => {
    const s = ringRef.current;
    const g = group.current;
    if (!s || !g) return;
    const dt = Math.min(rawDt, 0.1);
    if (!s.dragging) {
      if (s.target !== null) {
        s.rotation = still ? s.target : dampTowards(s.rotation, s.target, 5, dt);
        if (s.rotation === s.target) s.target = null;
      } else if (!still && !s.hovering) {
        s.rotation -= dt * 0.12;
      }
    }
    g.rotation.y = s.rotation;
    const f = frontIndexForRotation(s.rotation, photos.length);
    if (f !== front) {
      setFront(f);
      onFrontChange(f);
    }
  });

  return (
    <group ref={group} position={[0, 0, -radius]}>
      {slots.map((slot) => (
        <PhotoCard
          key={photos[slot.index].id}
          photo={photos[slot.index]}
          position={[slot.x, 0, slot.z]}
          rotationY={slot.rotationY}
          isFront={slot.index === front}
          frameColor={colors.surface}
          placeholderColor={colors.line}
          onHover={(on) => {
            if (ringRef.current) ringRef.current.hovering = on;
          }}
          onSelect={() => {
            // A drag that happens to end on a photo is not a click.
            if ((ringRef.current?.movedPx ?? 0) > DRAG_THRESHOLD_PX) return;
            onOpen(slot.index);
          }}
        />
      ))}
    </group>
  );
}

export default function PhotoRing({ photos, onOpen, still }: Props) {
  const state = useRef<RingState>({
    rotation: 0,
    target: null,
    dragging: false,
    startX: 0,
    startRotation: 0,
    movedPx: 0,
    hovering: false,
  });
  const [front, setFront] = useState(0);
  const [ready, setReady] = useState(false);
  const count = photos.length;

  const step = (dir: 1 | -1) => {
    const s = state.current;
    const current = frontIndexForRotation(s.target ?? s.rotation, count);
    const next = (current + dir + count) % count;
    s.target = rotationForIndex(next, count, s.target ?? s.rotation);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (count === 0) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      step(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      step(-1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(frontIndexForRotation(state.current.rotation, count));
    }
  };

  const frontPhoto = photos[front];

  return (
    <div className="space-y-3">
      <div
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label="3D photo ring. Use the left and right arrow keys to turn it, Enter to open the photo in front."
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          const s = state.current;
          s.dragging = true;
          s.target = null;
          s.startX = e.clientX;
          s.startRotation = s.rotation;
          s.movedPx = 0;
        }}
        onPointerMove={(e) => {
          const s = state.current;
          if (!s.dragging) return;
          const dx = e.clientX - s.startX;
          s.movedPx = Math.max(s.movedPx, Math.abs(dx));
          s.rotation = s.startRotation + dx * 0.006;
        }}
        onPointerUp={() => {
          state.current.dragging = false;
        }}
        onPointerLeave={() => {
          state.current.dragging = false;
        }}
        onPointerCancel={() => {
          state.current.dragging = false;
        }}
        className="relative h-[420px] sm:h-[480px] rounded-[1.25rem] bg-hero border border-line shadow-card overflow-hidden cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        style={{ touchAction: 'pan-y' }}
      >
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0.9, 5.6], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          onCreated={({ camera }) => {
            camera.lookAt(0, 0, 0);
            setReady(true);
          }}
        >
          <Ring
            photos={photos}
            ringRef={state}
            still={still}
            onOpen={onOpen}
            onFrontChange={setFront}
          />
        </Canvas>
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-ink-muted">
            Arranging your photos...
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-xs text-ink-muted truncate" aria-live="polite">
          {frontPhoto ? (
            <>
              <span className="font-semibold text-ink">{frontPhoto.memoryTitle}</span>
              {frontPhoto.caption ? ` · ${frontPhoto.caption}` : ''}
            </>
          ) : null}
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => step(-1)}
            className="px-3 py-1.5 rounded-full border border-line text-xs font-semibold text-ink-muted hover:text-ink hover:bg-purple-50"
            aria-label="Previous photo"
          >
            ←
          </button>
          <button
            onClick={() => step(1)}
            className="px-3 py-1.5 rounded-full border border-line text-xs font-semibold text-ink-muted hover:text-ink hover:bg-purple-50"
            aria-label="Next photo"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}

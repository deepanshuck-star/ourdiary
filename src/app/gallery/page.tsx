'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { formatDate } from '@/lib/date-utils';
import { useLocalState } from '@/lib/local-store';
import { usePrefersReducedMotion, useWebGLSupport } from '@/components/three/capabilities';
import { ThreeFallback, ThreeLoading } from '@/components/three/ThreeFallback';
import {
  Image as GalleryIcon,
  UploadCloud,
  X,
  ArrowRight,
  ZoomIn,
  Camera,
  LayoutGrid,
  Orbit,
} from 'lucide-react';
import { Button, ButtonLink, IconButton } from '@/components/ui/Button';
import { Card, Field, inputClass } from '@/components/ui/Surface';
import { cn } from '@/lib/cn';

const PhotoRing = dynamic(() => import('@/components/three/PhotoRing'), {
  ssr: false,
  loading: () => <ThreeLoading text="Arranging your photos..." />,
});

// Keeps the ring light enough for phones; the grid still shows everything.
const RING_MAX_PHOTOS = 30;

type GalleryView = 'grid' | 'ring';

export default function GalleryPage() {
  const { data, addPhotoToMemory } = useDiary();
  const [selectedMemoryFilter, setSelectedMemoryFilter] = useState<string>('all');
  const [view, setView] = useLocalState<GalleryView>(`gallery-view:${data.couple.id}`, 'grid');
  const [ringAnyway, setRingAnyway] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const webgl = useWebGLSupport();
  const [lightboxPhoto, setLightboxPhoto] = useState<{
    url: string;
    caption?: string;
    memoryTitle?: string;
    memoryId?: string;
    date?: string;
  } | null>(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [targetMemoryId, setTargetMemoryId] = useState<string>(
    data.memories[0]?.id || ''
  );
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');

  // Collect all photos from all memories flattened with memory metadata
  const allPhotos = useMemo(() => {
    const list: Array<{
      id: string;
      url: string;
      caption?: string;
      dateAdded: string;
      memoryId: string;
      memoryTitle: string;
      memoryDate: string;
    }> = [];

    data.memories.forEach((mem) => {
      mem.photos?.forEach((p) => {
        list.push({
          ...p,
          memoryId: mem.id,
          memoryTitle: mem.title,
          memoryDate: mem.date,
        });
      });
    });

    return list;
  }, [data.memories]);

  // Filtered photos
  const filteredPhotos = useMemo(() => {
    if (selectedMemoryFilter === 'all') return allPhotos;
    return allPhotos.filter((p) => p.memoryId === selectedMemoryFilter);
  }, [allPhotos, selectedMemoryFilter]);

  const ringPhotos = useMemo(() => filteredPhotos.slice(0, RING_MAX_PHOTOS), [filteredPhotos]);

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadUrl.trim() || !targetMemoryId) return;

    addPhotoToMemory(targetMemoryId, {
      url: uploadUrl.trim(),
      caption: uploadCaption.trim() || undefined,
    });

    setUploadUrl('');
    setUploadCaption('');
    setShowUploadModal(false);
  };

  const handleLocalImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !targetMemoryId) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        addPhotoToMemory(targetMemoryId, {
          url: event.target.result as string,
          caption: uploadCaption.trim() || file.name,
        });
        setUploadCaption('');
        setShowUploadModal(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <AppShell>
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Gallery Header — nothing around it but the dark */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-5 px-1 pt-2">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <GalleryIcon className="w-5 h-5" />
            </span>
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-normal tracking-tight text-ink">
                Photo Moments Gallery
              </h1>
              <p className="text-xs text-ink-muted mt-1.5">
                {allPhotos.length} captured snapshots of {data.couple.name}’s adventures
              </p>
            </div>
          </div>

          <Button variant="primary" size="sm" onClick={() => setShowUploadModal(true)}>
            <Camera className="w-4 h-4" />
            <span>Add Photo</span>
          </Button>
        </div>

        {/* Grid | 3D ring view toggle */}
        <div className="flex items-center justify-between gap-3">
          <div
            role="radiogroup"
            aria-label="Gallery view"
            className="inline-flex p-1 rounded-full bg-ink/5 border border-line"
          >
            {(
              [
                { id: 'grid', label: 'Grid', Icon: LayoutGrid },
                { id: 'ring', label: '3D ring', Icon: Orbit },
              ] as const
            ).map(({ id, label, Icon }) => (
              <Button
                key={id}
                role="radio"
                aria-checked={view === id}
                variant={view === id ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setView(id)}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Button>
            ))}
          </div>
          {view === 'ring' && filteredPhotos.length > RING_MAX_PHOTOS && (
            <p className="text-[11px] text-ink-muted">
              Showing the first {RING_MAX_PHOTOS} of {filteredPhotos.length} photos
            </p>
          )}
        </div>

        {/* Filter by Memory Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-[0.18em] flex-shrink-0">
            Filter:
          </span>
          <Button
            variant={selectedMemoryFilter === 'all' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setSelectedMemoryFilter('all')}
            className="flex-shrink-0"
          >
            All Photos ({allPhotos.length})
          </Button>
          {data.memories.map((mem) => {
            const count = mem.photos?.length || 0;
            if (count === 0) return null;
            return (
              <Button
                key={mem.id}
                variant={selectedMemoryFilter === mem.id ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedMemoryFilter(mem.id)}
                className="flex-shrink-0 truncate max-w-xs"
              >
                {mem.title} ({count})
              </Button>
            );
          })}
        </div>

        {/* 3D ring view */}
        {view === 'ring' && filteredPhotos.length > 0 ? (
          webgl === null ? (
            <ThreeLoading text="Arranging your photos..." />
          ) : !webgl ? (
            <ThreeFallback reason="no-webgl">
              <p className="text-xs text-ink-muted">Switch back to Grid to browse every photo.</p>
            </ThreeFallback>
          ) : reducedMotion && !ringAnyway ? (
            <ThreeFallback reason="reduced-motion" onShowAnyway={() => setRingAnyway(true)} />
          ) : (
            <PhotoRing
              photos={ringPhotos}
              still={reducedMotion}
              onOpen={(i) => {
                const photo = ringPhotos[i];
                if (!photo) return;
                setLightboxPhoto({
                  url: photo.url,
                  caption: photo.caption,
                  memoryTitle: photo.memoryTitle,
                  memoryId: photo.memoryId,
                  date: photo.memoryDate,
                });
              }}
            />
          )
        ) : /* Photo Grid */
        filteredPhotos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-7">
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                onClick={() =>
                  setLightboxPhoto({
                    url: photo.url,
                    caption: photo.caption,
                    memoryTitle: photo.memoryTitle,
                    memoryId: photo.memoryId,
                    date: photo.memoryDate,
                  })
                }
                className="group relative h-72 rounded-2xl overflow-hidden cursor-pointer bg-canvas shadow-card lift"
              >
                <img
                  src={photo.url}
                  alt={photo.caption || photo.memoryTitle}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Hover Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-between text-snow">
                  <div className="flex justify-end">
                    <span className="p-2 rounded-full bg-snow/15 backdrop-blur-md">
                      <ZoomIn className="w-4 h-4 text-snow" />
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-primary font-semibold uppercase tracking-[0.18em] block">
                      {formatDate(photo.memoryDate)}
                    </span>
                    <h4 className="font-semibold text-sm leading-tight text-snow line-clamp-1 mt-1">
                      {photo.memoryTitle}
                    </h4>
                    {photo.caption && (
                      <p className="text-xs text-snow/80 line-clamp-1 mt-0.5 italic">
                        "{photo.caption}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card tone="flat" className="p-16 text-center space-y-3">
            <div className="text-5xl">🖼️</div>
            <h3 className="font-display text-xl font-normal text-ink">No photos in this view</h3>
            <p className="text-xs text-ink-muted max-w-sm mx-auto">
              Add photos to your memories or choose another category filter.
            </p>
          </Card>
        )}

        {/* Lightbox Modal */}
        {lightboxPhoto && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
            onClick={() => setLightboxPhoto(null)}
          >
            <div
              className="relative max-w-4xl max-h-[92vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightboxPhoto.url}
                alt={lightboxPhoto.caption || 'Enlarged photo'}
                className="max-h-[75vh] w-auto rounded-2xl object-contain shadow-card"
              />

              {/* Caption and Memory link bar */}
              <div className="mt-5 p-4 rounded-2xl bg-snow/5 backdrop-blur-lg border border-snow/10 text-snow w-full flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-display text-base sm:text-lg font-normal">{lightboxPhoto.memoryTitle}</h4>
                  {lightboxPhoto.caption && (
                    <p className="text-xs text-snow/80 italic mt-0.5">"{lightboxPhoto.caption}"</p>
                  )}
                </div>

                {lightboxPhoto.memoryId && (
                  <ButtonLink
                    href={`/memories/${lightboxPhoto.memoryId}`}
                    variant="primary"
                    size="sm"
                    className="flex-shrink-0"
                  >
                    <span>Open Memory</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </ButtonLink>
                )}
              </div>

              <IconButton
                label="Close photo"
                variant="ghost"
                size="sm"
                onClick={() => setLightboxPhoto(null)}
                className="absolute -top-3 -right-3 sm:top-2 sm:right-2 bg-black/70 text-snow hover:text-snow hover:bg-black/95"
              >
                <X className="w-5 h-5" />
              </IconButton>
            </div>
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <Card className="p-6 sm:p-8 max-w-md w-full space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-line">
                <h3 className="font-display text-xl font-normal text-ink">Add Photo to Gallery</h3>
                <IconButton
                  label="Close"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUploadModal(false)}
                >
                  <X className="w-5 h-5" />
                </IconButton>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <Field id="gallery-target-memory" label="Attach to Memory *">
                  <select
                    id="gallery-target-memory"
                    value={targetMemoryId}
                    onChange={(e) => setTargetMemoryId(e.target.value)}
                    className={cn(inputClass, 'py-2.5 text-xs')}
                  >
                    {data.memories.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title} ({formatDate(m.date)})
                      </option>
                    ))}
                  </select>
                </Field>

                <Field id="gallery-photo-url" label="Image URL">
                  <input
                    id="gallery-photo-url"
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={uploadUrl}
                    onChange={(e) => setUploadUrl(e.target.value)}
                    className={cn(inputClass, 'py-2.5 text-xs')}
                  />
                </Field>

                <div className="text-center py-1 text-[11px] text-ink-muted font-semibold tracking-[0.18em]">— OR —</div>

                <div>
                  <label className="cursor-pointer block text-center p-5 rounded-2xl border border-dashed border-line hover:border-primary/50 hover:bg-primary/5 transition-all">
                    <UploadCloud className="w-6 h-6 text-primary mx-auto mb-1.5" />
                    <span className="text-xs font-semibold text-ink block">
                      Choose local image from computer
                    </span>
                    <span className="text-[10px] text-ink-muted">Instant browser-local preview</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLocalImageSelect}
                      className="hidden"
                    />
                  </label>
                </div>

                <Field id="gallery-photo-caption" label="Caption (Optional)">
                  <input
                    id="gallery-photo-caption"
                    type="text"
                    placeholder="e.g. Maya smiling by the sunset..."
                    value={uploadCaption}
                    onChange={(e) => setUploadCaption(e.target.value)}
                    className={cn(inputClass, 'py-2.5 text-xs')}
                  />
                </Field>

                <div className="pt-4 border-t border-line flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowUploadModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" disabled={!uploadUrl.trim()}>
                    Save Photo
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}

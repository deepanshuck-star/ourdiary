'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { formatDate } from '@/lib/date-utils';
import {
  Image as GalleryIcon,
  UploadCloud,
  X,
  ArrowRight,
  ZoomIn,
  Camera,
} from 'lucide-react';

export default function GalleryPage() {
  const { data, addPhotoToMemory } = useDiary();
  const [selectedMemoryFilter, setSelectedMemoryFilter] = useState<string>('all');
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
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Gallery Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-[#EFE4D6] shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-emerald-100 text-emerald-600">
              <GalleryIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">Photo Moments Gallery</h1>
              <p className="text-xs text-slate-500">
                {allPhotos.length} captured snapshots of {data.couple.name}’s adventures
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowUploadModal(true)}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#F5A3A3] via-[#CBBEF4] to-[#B6DDF4] text-slate-900 font-bold text-xs sm:text-sm shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            <span>Add Photo</span>
          </button>
        </div>

        {/* Filter by Memory Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">
            Filter:
          </span>
          <button
            onClick={() => setSelectedMemoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-semibold flex-shrink-0 transition-all ${
              selectedMemoryFilter === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Photos ({allPhotos.length})
          </button>
          {data.memories.map((mem) => {
            const count = mem.photos?.length || 0;
            if (count === 0) return null;
            return (
              <button
                key={mem.id}
                onClick={() => setSelectedMemoryFilter(mem.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold flex-shrink-0 transition-all truncate max-w-xs ${
                  selectedMemoryFilter === mem.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {mem.title} ({count})
              </button>
            );
          })}
        </div>

        {/* Photo Grid */}
        {filteredPhotos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                className="group relative h-64 rounded-3xl overflow-hidden cursor-pointer shadow-xs hover:shadow-xl transition-all duration-300 border border-[#EFE4D6] bg-slate-100"
              >
                <img
                  src={photo.url}
                  alt={photo.caption || photo.memoryTitle}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Hover Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-between text-white">
                  <div className="flex justify-end">
                    <span className="p-1.5 rounded-full bg-white/20 backdrop-blur-md">
                      <ZoomIn className="w-4 h-4 text-white" />
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-rose-300 font-bold uppercase tracking-wider block">
                      {formatDate(photo.memoryDate)}
                    </span>
                    <h4 className="font-bold text-sm leading-tight text-white line-clamp-1">
                      {photo.memoryTitle}
                    </h4>
                    {photo.caption && (
                      <p className="text-xs text-slate-200 line-clamp-1 mt-0.5 italic">
                        "{photo.caption}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-16 text-center rounded-3xl bg-white border border-[#EFE4D6] space-y-3">
            <div className="text-5xl">🖼️</div>
            <h3 className="font-bold text-slate-800 text-lg">No photos in this view</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add photos to your memories or choose another category filter.
            </p>
          </div>
        )}

        {/* Lightbox Modal */}
        {lightboxPhoto && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            onClick={() => setLightboxPhoto(null)}
          >
            <div
              className="relative max-w-4xl max-h-[92vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightboxPhoto.url}
                alt={lightboxPhoto.caption || 'Enlarged photo'}
                className="max-h-[75vh] w-auto rounded-3xl object-contain shadow-2xl"
              />

              {/* Caption and Memory link bar */}
              <div className="mt-4 p-4 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 text-white w-full flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm sm:text-base">{lightboxPhoto.memoryTitle}</h4>
                  {lightboxPhoto.caption && (
                    <p className="text-xs text-slate-200 italic mt-0.5">"{lightboxPhoto.caption}"</p>
                  )}
                </div>

                {lightboxPhoto.memoryId && (
                  <Link
                    href={`/memories/${lightboxPhoto.memoryId}`}
                    className="px-4 py-2 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 transition-colors flex items-center gap-1.5 flex-shrink-0"
                  >
                    <span>Open Memory</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>

              <button
                onClick={() => setLightboxPhoto(null)}
                className="absolute -top-3 -right-3 sm:top-2 sm:right-2 p-2 rounded-full bg-black/70 text-white hover:bg-black/95 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-extrabold text-lg text-slate-900">Add Photo to Gallery</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Attach to Memory *
                  </label>
                  <select
                    value={targetMemoryId}
                    onChange={(e) => setTargetMemoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-300 bg-white"
                  >
                    {data.memories.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title} ({formatDate(m.date)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Image URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={uploadUrl}
                    onChange={(e) => setUploadUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-300"
                  />
                </div>

                <div className="text-center py-2 text-xs text-slate-400 font-semibold">— OR —</div>

                <div>
                  <label className="cursor-pointer block text-center p-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all">
                    <UploadCloud className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                    <span className="text-xs font-semibold text-slate-700 block">
                      Choose local image from computer
                    </span>
                    <span className="text-[10px] text-slate-400">Instant browser-local preview</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLocalImageSelect}
                      className="hidden"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Caption (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Maya smiling by the sunset..."
                    value={uploadCaption}
                    onChange={(e) => setUploadCaption(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-300"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!uploadUrl.trim()}
                    className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-40 shadow-sm"
                  >
                    Save Photo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

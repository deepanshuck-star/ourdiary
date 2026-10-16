'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  OurDiaryData,
  ProfileId,
  DemoProfile,
  Couple,
  Memory,
  MemoryPhoto,
  MemoryNote,
  Reaction,
  CalendarEvent,
  Letter,
  BucketItem,
  MoodType,
  UserMood,
  HeartbeatPing,
  DailySparkAnswer,
  WheelOption,
  LoveCoupon,
} from '@/types';
import { initialDiaryData } from '@/data/seed';
import {
  loadDiaryData,
  saveDiaryData,
  resetDiaryData,
  exportDiaryDataJSON,
  validateAndImportDiaryData,
} from '@/lib/storage';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchMemoriesRemote, createMemoryRemote, updateMemoryRemote, deleteMemoryRemote } from '@/lib/supabase/memories';
import { fetchCoupleProfilesRemote, updateMyAvatarRemote, updateCouplePhotoRemote } from '@/lib/supabase/profiles';
import {
  fetchEventsRemote, createEventRemote, updateEventRemote, deleteEventRemote,
  fetchLettersRemote, createLetterRemote, updateLetterRemote, deleteLetterRemote,
  fetchBucketListRemote, createBucketItemRemote, updateBucketItemRemote, deleteBucketItemRemote,
  fetchLoveCouponsRemote, createLoveCouponRemote, redeemLoveCouponRemote,
  fetchWheelOptionsRemote, createWheelOptionRemote, deleteWheelOptionRemote,
  fetchDailySparkAnswersRemote, upsertDailySparkAnswerRemote,
  fetchMemoryNotesForMemoriesRemote, createMemoryNoteRemote, updateMemoryNoteRemote, deleteMemoryNoteRemote,
  fetchMemoryPhotosForMemoriesRemote, createMemoryPhotoRemote, deleteMemoryPhotoRemote,
} from '@/lib/supabase/sync';
import { sendPushNotification } from '@/lib/notifications';

export interface ToastInfo {
  id: string;
  message: string;
  type: 'success' | 'info' | 'heart' | 'warn';
}

interface DiaryContextValue {
  data: OurDiaryData;
  isHydrated: boolean;
  activeProfile: DemoProfile;
  partnerProfile: DemoProfile;
  switchProfile: (id: ProfileId) => void;
  updateCouple: (updates: Partial<Couple>) => void;
  updateProfile: (profileId: ProfileId, updates: Partial<DemoProfile>) => void;
  addMemory: (memory: Omit<Memory, 'id' | 'reactions' | 'notes'>) => Memory;
  updateMemory: (id: string, updates: Partial<Memory>) => void;
  deleteMemory: (id: string) => void;
  addPhotoToMemory: (memoryId: string, photo: { url: string; caption?: string }) => void;
  deletePhotoFromMemory: (memoryId: string, photoId: string) => void;
  addReaction: (memoryId: string, emoji: string, label: string) => void;
  removeReaction: (memoryId: string, reactionId: string) => void;
  isLiveUser: boolean;
  setIsLiveUser: (live: boolean) => void;
  initCleanCoupleSpace: (couple: Couple) => void;
  regenerateCoupleCode: () => Promise<string>;
  addNote: (memoryId: string, content: string, visibility: 'shared' | 'private') => void;
  toggleNoteLock: (memoryId: string, noteId: string) => void;
  toggleNoteVisibleWhenLocked: (memoryId: string, noteId: string) => void;
  updateNote: (memoryId: string, noteId: string, content: string, visibility: 'shared' | 'private') => void;
  deleteNote: (memoryId: string, noteId: string) => void;
  addEvent: (event: Omit<CalendarEvent, 'id'>) => CalendarEvent;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  addLetter: (letter: Omit<Letter, 'id' | 'createdAt'>) => Letter;
  updateLetter: (id: string, updates: Partial<Letter>) => void;
  deleteLetter: (id: string) => void;
  addBucketItem: (item: Omit<BucketItem, 'id'>) => BucketItem;
  updateBucketItem: (id: string, updates: Partial<BucketItem>) => void;
  toggleBucketItem: (id: string) => void;
  deleteBucketItem: (id: string) => void;
  convertBucketToMemory: (bucketId: string) => string;
  resetAllData: () => void;
  exportJSON: () => string;
  importJSON: (jsonStr: string) => { success: boolean; error?: string };
  sendHeartbeatPing: (message?: string) => void;
  markHeartbeatSeen: () => void;
  updateMoodBeacon: (mood: MoodType, customNote?: string) => void;
  sendWarmHug: (message?: string) => void;
  answerDailySpark: (questionId: string, question: string, content: string) => void;
  addWheelOption: (text: string, category: 'food' | 'activity') => void;
  deleteWheelOption: (id: string) => void;
  addLoveCoupon: (title: string, description: string, category: string) => void;
  redeemLoveCoupon: (id: string) => void;
  toggleSoundtrack: () => void;
  loadExistingCoupleSpace: (userId: string, remoteCouple: any, role?: 'creator' | 'partner') => void;
  logout: (redirectToLogin?: boolean) => Promise<void>;
  toasts: ToastInfo[];
  showToast: (message: string, type?: ToastInfo['type']) => void;
  dismissToast: (id: string) => void;
}

const DiaryContext = createContext<DiaryContextValue | null>(null);

function buildCleanCoupleData(couple: Couple): OurDiaryData {
  // Provide cute romantic avatars by default if none or placeholder is provided
  const defaultAvatar1 = couple.user1.avatar && !couple.user1.avatar.includes('/avatars/')
    ? couple.user1.avatar
    : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
  const defaultAvatar2 = couple.user2.avatar && !couple.user2.avatar.includes('/avatars/')
    ? couple.user2.avatar
    : 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80';

  const freshCleanData: OurDiaryData = {
    couple: {
      ...couple,
      theme: couple.theme || 'candy',
      animationsEnabled: true,
      inviteCode: couple.inviteCode || Math.random().toString(36).substring(2, 8).toUpperCase(),
      isLocked: false,
      user1: {
        ...couple.user1,
        avatar: defaultAvatar1,
      },
      user2: {
        ...couple.user2,
        avatar: defaultAvatar2,
      },
    },
    activeProfileId: 'user_1',
    memories: [],
    events: [],
    letters: [],
    bucketList: [],
    moodBeacons: {},
    heartbeatStreak: 1,
    lastHeartbeatDate: new Date().toISOString().split('T')[0],
    dailySparkAnswers: [],
    customWheelOptions: [
      { id: 'w_1', text: 'Wood-fired Neapolitan Pizza 🍕', category: 'food' },
      { id: 'w_2', text: 'Spicy Ramen & Gyoza 🍜', category: 'food' },
      { id: 'w_3', text: 'Sushi & Edamame 🍣', category: 'food' },
      { id: 'w_4', text: 'Tacos & Fresh Guacamole 🌮', category: 'food' },
      { id: 'w_5', text: 'Cook Homemade Pasta Together 🍝', category: 'food' },
      { id: 'w_6', text: 'Breakfast for Dinner Pancakes 🥞', category: 'food' },
      { id: 'w_7', text: 'Late Night Gelato & Waffles 🍨', category: 'food' },
      { id: 'w_8', text: 'Burgers & Sweet Potato Fries 🍔', category: 'food' },
      { id: 'w_9', text: 'Blanket Fort Movie Marathon 🍿', category: 'activity' },
      { id: 'w_10', text: 'Sunset Drive With Playlist On 🌅', category: 'activity' },
      { id: 'w_11', text: 'Board Game Battle & Snacks 🎲', category: 'activity' },
      { id: 'w_12', text: 'Bookstore Date & Hot Drinks 📚', category: 'activity' },
      { id: 'w_13', text: 'At-Home DIY Spa & Face Masks 🧖‍♀️', category: 'activity' },
      { id: 'w_14', text: 'Night Stargazing With Hot Cocoa ✨', category: 'activity' },
      { id: 'w_15', text: 'Arcade Games & Mini Golf 🕹️', category: 'activity' },
      { id: 'w_16', text: 'Picnic in the Botanical Garden 🧺', category: 'activity' },
    ],
    loveCoupons: [
      {
        id: 'c_1',
        title: '1 Free 30-Min Back Massage',
        description: 'Redeem anytime for a soothing massage.',
        category: 'Pampering',
        fromId: 'user_1',
        toId: 'user_2',
        redeemed: false,
      },
      {
        id: 'c_2',
        title: 'You Pick the Movie (Zero Complaints)',
        description: 'Full control of the remote with zero complaints.',
        category: 'Entertainment',
        fromId: 'user_2',
        toId: 'user_1',
        redeemed: false,
      },
      {
        id: 'c_3',
        title: 'Sunday Breakfast in Bed',
        description: 'Fresh pancakes and hot coffee delivered to bed.',
        category: 'Food',
        fromId: 'user_2',
        toId: 'user_1',
        redeemed: false,
      },
    ],
    soundtrack: {
      currentSong: 'Our Song',
      currentArtist: 'Couple Favorite',
      isPlaying: false,
    },
  };
  return freshCleanData;
}

export function DiaryProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OurDiaryData>(initialDiaryData);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLiveUser, setIsLiveUser] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  // Ephemeral Demo Mode vs Live Couple Space Hydration:
  // If in demo mode, modifications are in-memory only and reset on refresh.
  // Real registered couples persist under their dedicated per-user key.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isLive = localStorage.getItem('ourdiary_is_live_user') === 'true';
      const storedUserId = localStorage.getItem('ourdiary_current_user_id');
      setIsLiveUser(isLive);
      if (storedUserId) setCurrentUserId(storedUserId);

      if (isLive) {
        const userKey = storedUserId ? `ourdiary_space_${storedUserId}` : 'ourdiary_real_couple_v1';
        const savedReal = localStorage.getItem(userKey) || localStorage.getItem('ourdiary_real_couple_v1');
        if (savedReal) {
          try {
            setData(JSON.parse(savedReal));
          } catch (e) {
            console.error('Failed to parse real couple space:', e);
          }
        }
      } else {
        // Ephemeral Demo Mode: Always start fresh with original seed dummy data!
        setData(JSON.parse(JSON.stringify(initialDiaryData)));
      }
    }
    setIsHydrated(true);
  }, []);

  // Save changes ONLY for real authenticated couples (keyed by user ID)
  useEffect(() => {
    if (isHydrated && isLiveUser && typeof window !== 'undefined') {
      if (currentUserId) {
        localStorage.setItem(`ourdiary_space_${currentUserId}`, JSON.stringify(data));
      }
      localStorage.setItem('ourdiary_real_couple_v1', JSON.stringify(data));
    }
  }, [data, isHydrated, isLiveUser, currentUserId]);

  const showToast = (message: string, type: ToastInfo['type'] = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const activeProfile = useMemo(() => {
    return data.activeProfileId === 'user_1' ? data.couple.user1 : data.couple.user2;
  }, [data.activeProfileId, data.couple]);

  const partnerProfile = useMemo(() => {
    return data.activeProfileId === 'user_1' ? data.couple.user2 : data.couple.user1;
  }, [data.activeProfileId, data.couple]);

  const switchProfile = (id: ProfileId) => {
    setData((prev) => ({
      ...prev,
      activeProfileId: id,
    }));
    const newName = id === 'user_1' ? data.couple.user1.name : data.couple.user2.name;
    showToast(`Switched view to ${newName}`, 'heart');
  };

  const updateCouple = (updates: Partial<Couple>) => {
    setData((prev) => ({
      ...prev,
      couple: { ...prev.couple, ...updates },
    }));
    showToast('Relationship settings saved!', 'success');

    if (updates.photoUrl !== undefined) {
      const supabase = isLiveUser && currentUserId ? getSupabaseBrowserClient() : null;
      if (supabase && data.couple.id) {
        updateCouplePhotoRemote(supabase, data.couple.id, updates.photoUrl).catch((err) => {
          console.error('[OurDiary] Failed to save couple photo to database:', err);
          showToast("Couldn't sync this change to the server — it's only on this device for now.", 'warn');
        });
      }
    }
  };

  const updateProfile = (profileId: ProfileId, updates: Partial<DemoProfile>) => {
    setData((prev) => {
      const isUser1 = profileId === 'user_1';
      return {
        ...prev,
        couple: {
          ...prev.couple,
          user1: isUser1 ? { ...prev.couple.user1, ...updates } : prev.couple.user1,
          user2: !isUser1 ? { ...prev.couple.user2, ...updates } : prev.couple.user2,
        },
      };
    });
    showToast('Profile updated!', 'success');

    // Only sync the photo to the database for your OWN profile — RLS would
    // reject writing your partner's row anyway, and the UI shouldn't try.
    if (updates.avatar !== undefined && profileId === data.activeProfileId) {
      const supabase = isLiveUser && currentUserId ? getSupabaseBrowserClient() : null;
      if (supabase && currentUserId) {
        updateMyAvatarRemote(supabase, currentUserId, updates.avatar).catch((err) => {
          console.error('[OurDiary] Failed to save avatar to database:', err);
          showToast("Couldn't sync this change to the server — it's only on this device for now.", 'warn');
        });
      }
    }
  };

  // Returns a live Supabase client only when this is a signed-in cloud couple
  // space, so every call site below can fall back to local-only state cleanly.
  const remoteClient = () => {
    if (!isLiveUser || !currentUserId) return null;
    return getSupabaseBrowserClient();
  };

  const addMemory = (newMem: Omit<Memory, 'id' | 'reactions' | 'notes'>): Memory => {
    const tempId = 'mem_' + Date.now();
    const createdMemory: Memory = {
      ...newMem,
      id: tempId,
      reactions: [],
      notes: [],
    };
    setData((prev) => ({
      ...prev,
      memories: [createdMemory, ...prev.memories].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    }));
    showToast('New memory created & added to journey! 🎉', 'heart');

    // Persist to the database so it survives logout/login. The temp id is
    // swapped for the real one once saved; anything that referenced the temp
    // id (e.g. a bucket-list item just converted to a memory) is patched too.
    const supabase = getSupabaseBrowserClient();
    if (supabase && isLiveUser && currentUserId && data.couple.id) {
      createMemoryRemote(supabase, data.couple.id, currentUserId, newMem)
        .then((saved) => {
          setData((prev) => ({
            ...prev,
            memories: prev.memories.map((m) => (m.id === tempId ? { ...m, id: saved.id } : m)),
            bucketList: prev.bucketList.map((b) =>
              b.memoryId === tempId ? { ...b, memoryId: saved.id } : b
            ),
          }));
        })
        .catch((err) => {
          console.error('[OurDiary] Failed to save memory to database:', err);
          showToast("This memory is saved on this device only — couldn't reach the server.", 'warn');
        });
    }

    return createdMemory;
  };

  const updateMemory = (id: string, updates: Partial<Memory>) => {
    setData((prev) => ({
      ...prev,
      memories: prev.memories.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
    showToast('Memory updated!', 'success');

    const supabase = getSupabaseBrowserClient();
    if (supabase && isLiveUser && !id.startsWith('mem_')) {
      updateMemoryRemote(supabase, id, updates).catch((err) => {
        console.error('[OurDiary] Failed to update memory in database:', err);
        showToast("Couldn't sync this change to the server — it's only on this device for now.", 'warn');
      });
    }
  };

  const deleteMemory = (id: string) => {
    setData((prev) => ({
      ...prev,
      memories: prev.memories.filter((m) => m.id !== id),
    }));
    showToast('Memory deleted from journey and diary', 'info');

    const supabase = getSupabaseBrowserClient();
    if (supabase && isLiveUser && !id.startsWith('mem_')) {
      deleteMemoryRemote(supabase, id).catch((err) => {
        console.error('[OurDiary] Failed to delete memory from database:', err);
        showToast("Couldn't sync this change to the server — it's only on this device for now.", 'warn');
      });
    }
  };

  const addPhotoToMemory = (memoryId: string, photo: { url: string; caption?: string }) => {
    const tempId = 'p_' + Date.now();
    const newPhoto: MemoryPhoto = {
      id: tempId,
      url: photo.url,
      caption: photo.caption,
      dateAdded: new Date().toISOString(),
    };
    setData((prev) => ({
      ...prev,
      memories: prev.memories.map((m) =>
        m.id === memoryId ? { ...m, photos: [...m.photos, newPhoto] } : m
      ),
    }));
    showToast('Photo added to memory!', 'success');

    const supabase = remoteClient();
    if (supabase && !memoryId.startsWith('mem_')) {
      createMemoryPhotoRemote(supabase, memoryId, photo)
        .then((saved) => {
          setData((prev) => ({
            ...prev,
            memories: prev.memories.map((m) =>
              m.id === memoryId
                ? { ...m, photos: m.photos.map((p) => (p.id === tempId ? saved : p)) }
                : m
            ),
          }));
        })
        .catch((err) => {
        console.error('[OurDiary] Failed to save photo to database:', err);
        showToast("Couldn't sync this change to the server — it's only on this device for now.", 'warn');
      });
    }
  };

  const deletePhotoFromMemory = (memoryId: string, photoId: string) => {
    const supabase = remoteClient();
    if (supabase && !photoId.startsWith('p_')) {
      deleteMemoryPhotoRemote(supabase, photoId).catch((err) => {
        console.error('[OurDiary] Failed to delete photo from database:', err);
        showToast("Couldn't sync this change to the server — it's only on this device for now.", 'warn');
      });
    }
    setData((prev) => ({
      ...prev,
      memories: prev.memories.map((m) =>
        m.id === memoryId ? { ...m, photos: m.photos.filter((p) => p.id !== photoId) } : m
      ),
    }));
    showToast('Photo removed', 'info');
  };

  const addReaction = (memoryId: string, emoji: string, label: string) => {
    setData((prev) => {
      return {
        ...prev,
        memories: prev.memories.map((m) => {
          if (m.id !== memoryId) return m;
          // Check if already reacted with this emoji
          const existing = m.reactions.find((r) => r.userId === prev.activeProfileId && r.emoji === emoji);
          if (existing) {
            return {
              ...m,
              reactions: m.reactions.filter((r) => r.id !== existing.id),
            };
          }
          const newReaction: Reaction = {
            id: 'r_' + Date.now() + Math.random().toString(36).substring(2, 5),
            userId: prev.activeProfileId,
            emoji,
            label,
          };
          return {
            ...m,
            reactions: [...m.reactions, newReaction],
          };
        }),
      };
    });
  };

  const removeReaction = (memoryId: string, reactionId: string) => {
    setData((prev) => ({
      ...prev,
      memories: prev.memories.map((m) =>
        m.id === memoryId
          ? { ...m, reactions: m.reactions.filter((r) => r.id !== reactionId) }
          : m
      ),
    }));
  };

  const initCleanCoupleSpace = (couple: Couple) => {
    const freshCleanData = buildCleanCoupleData(couple);
    const userId =
      currentUserId ||
      (typeof window !== 'undefined' ? localStorage.getItem('ourdiary_current_user_id') : null);
    setIsLiveUser(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ourdiary_is_live_user', 'true');
      if (userId) {
        localStorage.setItem(`ourdiary_space_${userId}`, JSON.stringify(freshCleanData));
      }
      localStorage.setItem('ourdiary_real_couple_v1', JSON.stringify(freshCleanData));
    }
    setData(freshCleanData);
    showToast(`Created private couple space for ${couple.name}! 💕 (Clean slate ready)`, 'heart');
  };

  const loadExistingCoupleSpace = async (
    userId: string,
    remoteCouple: any,
    role: 'creator' | 'partner' = 'creator'
  ) => {
    setIsLiveUser(true);
    setCurrentUserId(userId);
    const activeProfileId: ProfileId = role === 'partner' ? 'user_2' : 'user_1';

    const defaultAvatar1 = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
    const defaultAvatar2 = 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80';

    // The database is the source of truth for identity: id, name and invite code.
    const remoteFields = {
      id: remoteCouple.id,
      name: remoteCouple.name || 'Our Couple Space',
      startDate: remoteCouple.relationship_start_date || '2024-01-01',
      anniversaryDate: remoteCouple.anniversary_date || remoteCouple.relationship_start_date || '2024-01-01',
      theme: remoteCouple.theme || 'candy',
      inviteCode: remoteCouple.invite_code,
      photoUrl: remoteCouple.photo_url || undefined,
    };

    let cached: OurDiaryData | null = null;
    if (typeof window !== 'undefined') {
      localStorage.setItem('ourdiary_is_live_user', 'true');
      localStorage.setItem('ourdiary_current_user_id', userId);
      try {
        const saved = localStorage.getItem(`ourdiary_space_${userId}`);
        const parsed = saved ? (JSON.parse(saved) as OurDiaryData) : null;
        // Only reuse the cache if it belongs to this very couple space.
        if (parsed && parsed.couple?.id === remoteCouple.id) cached = parsed;
      } catch (e) {
        console.warn('Failed to parse cached user space:', e);
      }
    }

    const nextData: OurDiaryData = cached
      ? { ...cached, activeProfileId, couple: { ...cached.couple, ...remoteFields } }
      : {
          ...buildCleanCoupleData({
            ...remoteFields,
            animationsEnabled: true,
            isLocked: false,
            user1: { id: 'user_1', name: remoteCouple.creator_name || 'Partner 1', avatar: defaultAvatar1 },
            user2: { id: 'user_2', name: remoteCouple.partner_name || 'Partner 2', avatar: defaultAvatar2 },
          }),
          activeProfileId,
        };

    if (typeof window !== 'undefined') {
      localStorage.setItem(`ourdiary_space_${userId}`, JSON.stringify(nextData));
      localStorage.setItem('ourdiary_real_couple_v1', JSON.stringify(nextData));
    }
    setData(nextData);

    // The database is the durable source of truth: pull everything meaningful
    // back so nothing created before is lost after logout/login. Ephemeral
    // state (heartbeat pings, mood beacons, soundtrack) stays local-only.
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      try {
        const results = await Promise.allSettled([
          fetchMemoriesRemote(supabase, remoteCouple.id, userId, activeProfileId),
          fetchEventsRemote(supabase, remoteCouple.id),
          fetchLettersRemote(supabase, remoteCouple.id, userId, activeProfileId),
          fetchBucketListRemote(supabase, remoteCouple.id, userId, activeProfileId),
          fetchLoveCouponsRemote(supabase, remoteCouple.id, userId, activeProfileId),
          fetchWheelOptionsRemote(supabase, remoteCouple.id),
          fetchDailySparkAnswersRemote(supabase, remoteCouple.id, userId, activeProfileId),
          fetchCoupleProfilesRemote(supabase, remoteCouple.id, userId, activeProfileId),
        ]);

        const memories = results[0].status === 'fulfilled' ? results[0].value : [];
        const events = results[1].status === 'fulfilled' ? results[1].value : [];
        const letters = results[2].status === 'fulfilled' ? results[2].value : [];
        const bucketList = results[3].status === 'fulfilled' ? results[3].value : [];
        const loveCoupons = results[4].status === 'fulfilled' ? results[4].value : [];
        const customWheelOptions = results[5].status === 'fulfilled' ? results[5].value : [];
        const dailySparkAnswers = results[6].status === 'fulfilled' ? results[6].value : [];
        const profiles = results[7].status === 'fulfilled' ? results[7].value : {};

        results.forEach((r, idx) => {
          if (r.status === 'rejected') {
            console.warn(`[OurDiary] Sub-resource ${idx} failed to load from remote:`, r.reason);
          }
        });

        const memoryIds = memories.map((m) => m.id);
        const [notesRes, photosRes] = await Promise.allSettled([
          fetchMemoryNotesForMemoriesRemote(supabase, memoryIds, userId, activeProfileId),
          fetchMemoryPhotosForMemoriesRemote(supabase, memoryIds),
        ]);
        const notesByMemory = notesRes.status === 'fulfilled' ? notesRes.value : new Map<string, MemoryNote[]>();
        const photosByMemory = photosRes.status === 'fulfilled' ? photosRes.value : new Map<string, MemoryPhoto[]>();

        const memoriesWithDetails = memories.map((m) => ({
          ...m,
          notes: notesByMemory.get(m.id) || [],
          photos: photosByMemory.get(m.id) || [],
        }));

        setData((prev) => {
          // Merge remote memories with any locally created memories that haven't synced yet
          const remoteIds = new Set(memoriesWithDetails.map((m) => m.id));
          const localOnly = prev.memories.filter((m) => !remoteIds.has(m.id) && m.id.startsWith('mem_'));
          const mergedMemories = [...memoriesWithDetails, ...localOnly].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );

          const updated: OurDiaryData = {
            ...prev,
            memories: mergedMemories.length > 0 ? mergedMemories : prev.memories,
            events: events.length > 0 ? events : prev.events,
            letters: letters.length > 0 ? letters : prev.letters,
            bucketList: bucketList.length > 0 ? bucketList : prev.bucketList,
            loveCoupons: loveCoupons.length > 0 ? loveCoupons : prev.loveCoupons,
            customWheelOptions: customWheelOptions.length > 0 ? customWheelOptions : prev.customWheelOptions,
            dailySparkAnswers: dailySparkAnswers.length > 0 ? dailySparkAnswers : prev.dailySparkAnswers,
            couple: {
              ...prev.couple,
              user1: profiles.user_1?.avatarUrl
                ? { ...prev.couple.user1, avatar: profiles.user_1.avatarUrl }
                : prev.couple.user1,
              user2: profiles.user_2?.avatarUrl
                ? { ...prev.couple.user2, avatar: profiles.user_2.avatarUrl }
                : prev.couple.user2,
            },
          };
          if (typeof window !== 'undefined') {
            localStorage.setItem(`ourdiary_space_${userId}`, JSON.stringify(updated));
          }
          return updated;
        });
      } catch (err) {
        console.error('[OurDiary] Failed to load couple data from database:', err);
        showToast("Couldn't load some of your couple data right now. Please refresh to try again.", 'warn');
      }
    }
  };

  const logout = async (redirectToLogin: boolean = true) => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase sign out error:', e);
      }
    }
    setIsLiveUser(false);
    setCurrentUserId(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ourdiary_is_live_user');
      localStorage.removeItem('ourdiary_current_user_id');
      localStorage.removeItem('ourdiary_real_couple_v1');
    }
    setData(JSON.parse(JSON.stringify(initialDiaryData)));
    showToast('Logged out successfully. See you soon! 💕', 'heart');

    if (redirectToLogin && typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const regenerateCoupleCode = async (): Promise<string> => {
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // If Supabase is connected and real couple exists, update remote database
    const supabase = getSupabaseBrowserClient();
    if (supabase && data.couple.id && isLiveUser) {
      try {
        await supabase
          .from('couples')
          .update({ invite_code: newCode })
          .eq('id', data.couple.id);
      } catch (err) {
        console.warn('Could not update remote couple code:', err);
      }
    }

    setData((prev) => ({
      ...prev,
      couple: {
        ...prev.couple,
        inviteCode: newCode,
      },
    }));

    if (isLiveUser && typeof window !== 'undefined') {
      const saved = localStorage.getItem('ourdiary_real_couple_v1');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          parsed.couple.inviteCode = newCode;
          localStorage.setItem('ourdiary_real_couple_v1', JSON.stringify(parsed));
        } catch (e) {
          console.error(e);
        }
      }
    }

    showToast(`New couple code generated: ${newCode}. Previous code deleted! 🔒`, 'success');
    return newCode;
  };

  const addNote = (memoryId: string, content: string, visibility: 'shared' | 'private') => {
    const author = data.activeProfileId === 'user_1' ? data.couple.user1 : data.couple.user2;
    const tempId = 'n_' + Date.now();
    const newNote: MemoryNote = {
      id: tempId,
      memoryId,
      authorId: data.activeProfileId,
      authorName: author.name,
      content,
      visibility,
      createdAt: new Date().toISOString(),
    };
    setData((prev) => ({
      ...prev,
      memories: prev.memories.map((m) =>
        m.id === memoryId ? { ...m, notes: [...m.notes, newNote] } : m
      ),
    }));
    showToast(
      visibility === 'private'
        ? 'Locked note added — only you can see it until you unlock it 🔒'
        : 'Shared note added! 💌',
      'heart'
    );

    const supabase = remoteClient();
    if (supabase && currentUserId && !memoryId.startsWith('mem_')) {
      createMemoryNoteRemote(supabase, currentUserId, newNote)
        .then((saved) => {
          setData((prev) => ({
            ...prev,
            memories: prev.memories.map((m) =>
              m.id === memoryId
                ? { ...m, notes: m.notes.map((n) => (n.id === tempId ? { ...n, id: saved.id } : n)) }
                : m
            ),
          }));
        })
        .catch((err) => {
          console.error('[OurDiary] Failed to save note to database:', err);
          showToast("This note is saved on this device only — couldn't reach the server.", 'warn');
        });
    }
  };

  // Only the note's author can flip this — enforced both by the UI (which
  // only shows the toggle on your own notes) and by the database (the RLS
  // update policy requires author_id = auth.uid()). Locking a note again
  // after unlocking it is fully supported; it just goes back to 'private'.
  const toggleNoteLock = (memoryId: string, noteId: string) => {
    let nextVisibility: 'shared' | 'private' | null = null;
    setData((prev) => ({
      ...prev,
      memories: prev.memories.map((m) => {
        if (m.id !== memoryId) return m;
        return {
          ...m,
          notes: m.notes.map((n) => {
            if (n.id !== noteId) return n;
            nextVisibility = n.visibility === 'private' ? 'shared' : 'private';
            return { ...n, visibility: nextVisibility };
          }),
        };
      }),
    }));
    showToast(
      nextVisibility === 'private' ? 'Note locked — only you can see it 🔒' : 'Note unlocked — your partner can see it now 💌',
      'heart'
    );

    const supabase = remoteClient();
    if (supabase && nextVisibility && !noteId.startsWith('n_')) {
      updateMemoryNoteRemote(supabase, noteId, { visibility: nextVisibility }).catch((err) => {
        console.error('[OurDiary] Failed to sync note lock state:', err);
        showToast("Couldn't sync this change to the server — it's only on this device for now.", 'warn');
      });
    }
  };

  // Only meaningful while a note is locked. On: the partner can see that a
  // locked note exists (and where), with its content masked server-side —
  // they never receive the text. Off: fully invisible to them, as usual.
  // Unlocking the note (toggleNoteLock) always shows it to both regardless
  // of this flag.
  const toggleNoteVisibleWhenLocked = (memoryId: string, noteId: string) => {
    let nextValue: boolean | null = null;
    setData((prev) => ({
      ...prev,
      memories: prev.memories.map((m) => {
        if (m.id !== memoryId) return m;
        return {
          ...m,
          notes: m.notes.map((n) => {
            if (n.id !== noteId) return n;
            nextValue = !n.visibleWhenLocked;
            return { ...n, visibleWhenLocked: nextValue };
          }),
        };
      }),
    }));
    showToast(
      nextValue
        ? "Your partner will now see this locked note on their dashboard (not its content) 💌"
        : 'Hidden from your partner\'s dashboard again',
      'heart'
    );

    const supabase = remoteClient();
    if (supabase && nextValue !== null && !noteId.startsWith('n_')) {
      updateMemoryNoteRemote(supabase, noteId, { visibleWhenLocked: nextValue }).catch((err) => {
        console.error('[OurDiary] Failed to sync note visibility flag:', err);
        showToast("Couldn't sync this change to the server — it's only on this device for now.", 'warn');
      });
    }
  };

  const updateNote = (
    memoryId: string,
    noteId: string,
    content: string,
    visibility: 'shared' | 'private'
  ) => {
    setData((prev) => ({
      ...prev,
      memories: prev.memories.map((m) =>
        m.id === memoryId
          ? {
              ...m,
              notes: m.notes.map((n) => (n.id === noteId ? { ...n, content, visibility } : n)),
            }
          : m
      ),
    }));
    showToast('Note updated!', 'success');

    const supabase = remoteClient();
    if (supabase && !noteId.startsWith('n_')) {
      updateMemoryNoteRemote(supabase, noteId, { content, visibility }).catch((err) => {
        console.error('[OurDiary] Failed to update note in database:', err);
        showToast("Couldn't sync this change to the server — it's only on this device for now.", 'warn');
      });
    }
  };

  const deleteNote = (memoryId: string, noteId: string) => {
    setData((prev) => ({
      ...prev,
      memories: prev.memories.map((m) =>
        m.id === memoryId ? { ...m, notes: m.notes.filter((n) => n.id !== noteId) } : m
      ),
    }));
    showToast('Note deleted', 'info');

    const supabase = remoteClient();
    if (supabase && !noteId.startsWith('n_')) {
      deleteMemoryNoteRemote(supabase, noteId).catch((err) => {
        console.error('[OurDiary] Failed to delete note from database:', err);
        showToast("Couldn't sync this change to the server — it's only on this device for now.", 'warn');
      });
    }
  };

  const addEvent = (event: Omit<CalendarEvent, 'id'>): CalendarEvent => {
    const tempId = 'ev_' + Date.now();
    const createdEvent: CalendarEvent = { ...event, id: tempId };
    setData((prev) => ({
      ...prev,
      events: [...prev.events, createdEvent].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    }));
    showToast('Event added to calendar!', 'success');

    const supabase = remoteClient();
    if (supabase && currentUserId && data.couple.id) {
      createEventRemote(supabase, data.couple.id, currentUserId, event)
        .then((saved) => {
          setData((prev) => ({
            ...prev,
            events: prev.events.map((e) => (e.id === tempId ? { ...e, id: saved.id } : e)),
          }));
        })
        .catch((err) => {
        console.error('[OurDiary] Failed to save event to database:', err);
        showToast("Couldn't sync this change to the server — it's only on this device for now.", 'warn');
      });
    }

    return createdEvent;
  };

  const updateEvent = (id: string, updates: Partial<CalendarEvent>) => {
    setData((prev) => ({
      ...prev,
      events: prev.events.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }));
    showToast('Event updated!', 'success');

    const supabase = remoteClient();
    if (supabase && !id.startsWith('ev_')) {
      updateEventRemote(supabase, id, updates).catch((err) => {
        console.error('[OurDiary] Failed to update event in database:', err);
        showToast("Couldn't sync this change to the server — it's only on this device for now.", 'warn');
      });
    }
  };

  const deleteEvent = (id: string) => {
    setData((prev) => ({
      ...prev,
      events: prev.events.filter((e) => e.id !== id),
    }));
    showToast('Event deleted', 'info');

    const supabase = remoteClient();
    if (supabase && !id.startsWith('ev_')) {
      deleteEventRemote(supabase, id).catch((err) => {
        console.error('[OurDiary] Failed to delete event from database:', err);
        showToast("Couldn't sync this change to the server — it's only on this device for now.", 'warn');
      });
    }
  };

  const addLetter = (letter: Omit<Letter, 'id' | 'createdAt'>): Letter => {
    const tempId = 'let_' + Date.now();
    const createdLetter: Letter = {
      ...letter,
      id: tempId,
      createdAt: new Date().toISOString(),
    };
    setData((prev) => ({
      ...prev,
      letters: [createdLetter, ...prev.letters],
    }));
    showToast(letter.isDraft ? 'Draft letter saved 📝' : 'Love letter sealed & sent! 💌', 'heart');

    const supabase = remoteClient();
    if (supabase && currentUserId && data.couple.id) {
      createLetterRemote(supabase, data.couple.id, currentUserId, null, letter)
        .then((saved) => {
          setData((prev) => ({
            ...prev,
            letters: prev.letters.map((l) => (l.id === tempId ? { ...l, id: saved.id, createdAt: saved.createdAt } : l)),
          }));
        })
        .catch((err) => {
        console.error('[OurDiary] Failed to save letter to database:', err);
        showToast("Couldn't sync this change to the server — it's only on this device for now.", 'warn');
      });
    }

    return createdLetter;
  };

  const updateLetter = (id: string, updates: Partial<Letter>) => {
    setData((prev) => ({
      ...prev,
      letters: prev.letters.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    }));
    showToast('Letter updated!', 'success');

    const supabase = remoteClient();
    if (supabase && !id.startsWith('let_')) {
      updateLetterRemote(supabase, id, updates).catch((err) => {
        console.error('[OurDiary] Failed to update letter in database:', err);
        showToast("Couldn't sync this change to the server — it's only on this device for now.", 'warn');
      });
    }
  };

  const deleteLetter = (id: string) => {
    setData((prev) => ({
      ...prev,
      letters: prev.letters.filter((l) => l.id !== id),
    }));
    showToast('Letter removed', 'info');

    const supabase = remoteClient();
    if (supabase && !id.startsWith('let_')) {
      deleteLetterRemote(supabase, id).catch((err) => {
        console.error('[OurDiary] Failed to delete letter from database:', err);
        showToast("Couldn't sync this change to the server — it's only on this device for now.", 'warn');
      });
    }
  };

  const addBucketItem = (item: Omit<BucketItem, 'id'>): BucketItem => {
    const tempId = 'b_' + Date.now();
    const createdItem: BucketItem = { ...item, id: tempId };
    setData((prev) => ({
      ...prev,
      bucketList: [createdItem, ...prev.bucketList],
    }));
    showToast('Added to your couple bucket list! ✨', 'heart');

    const supabase = remoteClient();
    if (supabase && currentUserId && data.couple.id) {
      createBucketItemRemote(supabase, data.couple.id, currentUserId, item)
        .then((saved) => {
          setData((prev) => ({
            ...prev,
            bucketList: prev.bucketList.map((b) => (b.id === tempId ? { ...b, id: saved.id } : b)),
          }));
        })
        .catch((err) => {
        console.error('[OurDiary] Failed to save bucket item to database:', err);
        showToast("Couldn't sync this change to the server — it's only on this device for now.", 'warn');
      });
    }

    return createdItem;
  };

  const updateBucketItem = (id: string, updates: Partial<BucketItem>) => {
    setData((prev) => ({
      ...prev,
      bucketList: prev.bucketList.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    }));
    showToast('Bucket item updated', 'success');

    const supabase = remoteClient();
    if (supabase && !id.startsWith('b_')) {
      updateBucketItemRemote(supabase, id, updates).catch((err) => {
        console.error('[OurDiary] Failed to update bucket item in database:', err);
        showToast("Couldn't sync this change to the server — it's only on this device for now.", 'warn');
      });
    }
  };

  const toggleBucketItem = (id: string) => {
    let nextUpdates: Partial<BucketItem> | null = null;
    setData((prev) => ({
      ...prev,
      bucketList: prev.bucketList.map((b) => {
        if (b.id !== id) return b;
        const willComplete = !b.completed;
        nextUpdates = {
          completed: willComplete,
          completedDate: willComplete ? new Date().toISOString().split('T')[0] : undefined,
        };
        return { ...b, ...nextUpdates };
      }),
    }));
    showToast('Bucket list item status updated!', 'heart');

    const supabase = remoteClient();
    if (supabase && nextUpdates && !id.startsWith('b_')) {
      updateBucketItemRemote(supabase, id, nextUpdates).catch((err) => {
        console.error('[OurDiary] Failed to update bucket item in database:', err);
        showToast("Couldn't sync this change to the server — it's only on this device for now.", 'warn');
      });
    }
  };

  const deleteBucketItem = (id: string) => {
    setData((prev) => ({
      ...prev,
      bucketList: prev.bucketList.filter((b) => b.id !== id),
    }));
    showToast('Item deleted from bucket list', 'info');

    const supabase = remoteClient();
    if (supabase && !id.startsWith('b_')) {
      deleteBucketItemRemote(supabase, id).catch((err) => {
        console.error('[OurDiary] Failed to delete bucket item from database:', err);
        showToast("Couldn't sync this change to the server — it's only on this device for now.", 'warn');
      });
    }
  };

  const convertBucketToMemory = (bucketId: string): string => {
    const item = data.bucketList.find((b) => b.id === bucketId);
    if (!item) return '';

    const newMem = addMemory({
      title: `Achieved: ${item.title}`,
      date: item.completedDate || new Date().toISOString().split('T')[0],
      description: item.notes || `We finally crossed off "${item.title}" together from our couple bucket list!`,
      mood: 'happy',
      category: 'Special moment',
      location: 'Bucket List Milestone',
      photos: [],
      tags: ['BucketList', item.category],
      createdBy: data.activeProfileId,
      perspectives: {
        [data.activeProfileId]: `I am so proud we made this happen together!`,
      },
    });

    updateBucketItem(bucketId, { memoryId: newMem.id, completed: true });
    showToast('Turned bucket item into a lasting memory! 🎉', 'heart');
    return newMem.id;
  };

  const resetAllData = () => {
    const seeded = resetDiaryData();
    setData(seeded);
    showToast('All data reset to fresh demo sample!', 'info');
  };

  const exportJSON = () => {
    return exportDiaryDataJSON(data);
  };

  const importJSON = (jsonStr: string) => {
    const res = validateAndImportDiaryData(jsonStr);
    if (res.success && res.data) {
      setData(res.data);
      showToast('Successfully imported your diary data!', 'success');
      return { success: true };
    }
    showToast(`Import failed: ${res.error}`, 'warn');
    return { success: false, error: res.error };
  };

  const sendHeartbeatPing = (message?: string) => {
    const today = new Date().toISOString().split('T')[0];
    const senderName = data.activeProfileId === 'user_1' ? data.couple.user1.name : data.couple.user2.name;
    setData((prev) => {
      const isNewDay = prev.lastHeartbeatDate !== today;
      const currentStreak = prev.heartbeatStreak || 0;
      const newStreak = isNewDay ? currentStreak + 1 : currentStreak;

      return {
        ...prev,
        latestHeartbeat: {
          fromId: prev.activeProfileId,
          fromName: senderName,
          message: message?.trim() || undefined,
          timestamp: new Date().toISOString(),
          seen: false,
        },
        heartbeatStreak: newStreak,
        lastHeartbeatDate: today,
      };
    });
    sendPushNotification(`💓 Thinking of you! (${senderName})`, {
      body: message?.trim() ? `"${message.trim()}"` : `${senderName} just sent you a glowing heartbeat ping!`,
      url: '/dashboard',
    });
    showToast(`Sent heartbeat love ping to ${partnerProfile.name}! 💓`, 'heart');
  };

  const markHeartbeatSeen = () => {
    setData((prev) => {
      if (!prev.latestHeartbeat) return prev;
      return {
        ...prev,
        latestHeartbeat: {
          ...prev.latestHeartbeat,
          seen: true,
        },
      };
    });
  };

  const updateMoodBeacon = (mood: MoodType, customNote?: string) => {
    setData((prev) => ({
      ...prev,
      moodBeacons: {
        ...prev.moodBeacons,
        [prev.activeProfileId]: {
          mood,
          customNote: customNote?.trim() || undefined,
          updatedAt: new Date().toISOString(),
        },
      },
    }));
    showToast('Updated your mood beacon! ☀️', 'success');
  };

  const sendWarmHug = (message?: string) => {
    const senderName = data.activeProfileId === 'user_1' ? data.couple.user1.name : data.couple.user2.name;
    setData((prev) => ({
      ...prev,
      latestHeartbeat: {
        fromId: prev.activeProfileId,
        fromName: senderName,
        message: message?.trim() ? `Warm Hug 🤗: "${message.trim()}"` : 'Sent you a warm cuddle hug! 🤗❤️',
        timestamp: new Date().toISOString(),
        seen: false,
      },
    }));
    sendPushNotification(`🤗 Warm Cuddle Hug from ${senderName}!`, {
      body: message?.trim() ? `"${message.trim()}"` : `${senderName} sent you a warm comforting hug!`,
      url: '/dashboard',
    });
    showToast(`Sent a warm cuddle hug to ${partnerProfile.name}! 🤗💕`, 'heart');
  };

  const answerDailySpark = (questionId: string, question: string, content: string) => {
    const today = new Date().toISOString().split('T')[0];
    const senderName = data.activeProfileId === 'user_1' ? data.couple.user1.name : data.couple.user2.name;
    setData((prev) => {
      const existingAnswers = prev.dailySparkAnswers || [];
      const index = existingAnswers.findIndex((a) => a.questionId === questionId || a.date === today);

      if (index >= 0) {
        const item = existingAnswers[index];
        const updatedAnswers = {
          ...item.answers,
          [prev.activeProfileId]: {
            content: content.trim(),
            answeredAt: new Date().toISOString(),
          },
        };
        const updatedList = [...existingAnswers];
        updatedList[index] = {
          ...item,
          answers: updatedAnswers,
        };
        return { ...prev, dailySparkAnswers: updatedList };
      } else {
        const newEntry: DailySparkAnswer = {
          questionId,
          question,
          date: today,
          answers: {
            [prev.activeProfileId]: {
              content: content.trim(),
              answeredAt: new Date().toISOString(),
            },
          },
        };
        return {
          ...prev,
          dailySparkAnswers: [newEntry, ...existingAnswers],
        };
      }
    });
    sendPushNotification(`💖 Daily Spark: ${senderName} answered!`, {
      body: `"${question}" - Tap to see what your partner wrote!`,
      url: '/daily-spark',
    });
    showToast('Daily answer submitted! 💌', 'heart');

    const supabase = remoteClient();
    if (supabase && currentUserId && data.couple.id) {
      upsertDailySparkAnswerRemote(
        supabase,
        data.couple.id,
        currentUserId,
        questionId,
        question,
        today,
        content.trim()
      ).catch((err) => {
        console.error('[OurDiary] Failed to save daily spark answer to database:', err);
        showToast("Couldn't sync this change to the server — it's only on this device for now.", 'warn');
      });
    }
  };

  const addWheelOption = (text: string, category: 'food' | 'activity') => {
    const tempId = 'w_' + Date.now();
    const newOpt: WheelOption = {
      id: tempId,
      text: text.trim(),
      category,
    };
    setData((prev) => ({
      ...prev,
      customWheelOptions: [...(prev.customWheelOptions || []), newOpt],
    }));
    showToast('Added option to wheel! 🎡', 'success');

    const supabase = remoteClient();
    if (supabase && data.couple.id) {
      createWheelOptionRemote(supabase, data.couple.id, newOpt)
        .then((saved) => {
          setData((prev) => ({
            ...prev,
            customWheelOptions: (prev.customWheelOptions || []).map((o) =>
              o.id === tempId ? { ...o, id: saved.id } : o
            ),
          }));
        })
        .catch((err) => {
        console.error('[OurDiary] Failed to save wheel option to database:', err);
        showToast("Couldn't sync this change to the server — it's only on this device for now.", 'warn');
      });
    }
  };

  const deleteWheelOption = (id: string) => {
    setData((prev) => ({
      ...prev,
      customWheelOptions: (prev.customWheelOptions || []).filter((o) => o.id !== id),
    }));
    showToast('Option removed from wheel', 'info');

    const supabase = remoteClient();
    if (supabase && !id.startsWith('w_')) {
      deleteWheelOptionRemote(supabase, id).catch((err) => {
        console.error('[OurDiary] Failed to delete wheel option from database:', err);
        showToast("Couldn't sync this change to the server — it's only on this device for now.", 'warn');
      });
    }
  };

  const addLoveCoupon = (title: string, description: string, category: string) => {
    const tempId = 'c_' + Date.now();
    const newCoupon: LoveCoupon = {
      id: tempId,
      title: title.trim(),
      description: description.trim(),
      category: category.trim() || 'Love',
      fromId: data.activeProfileId,
      toId: data.activeProfileId === 'user_1' ? 'user_2' : 'user_1',
      redeemed: false,
    };
    setData((prev) => ({
      ...prev,
      loveCoupons: [newCoupon, ...(prev.loveCoupons || [])],
    }));
    showToast(`Gifted love coupon to ${partnerProfile.name}! 🎟️`, 'heart');

    const supabase = remoteClient();
    if (supabase && currentUserId && data.couple.id) {
      createLoveCouponRemote(supabase, data.couple.id, currentUserId, null, newCoupon)
        .then((saved) => {
          setData((prev) => ({
            ...prev,
            loveCoupons: (prev.loveCoupons || []).map((c) => (c.id === tempId ? { ...c, id: saved.id } : c)),
          }));
        })
        .catch((err) => {
        console.error('[OurDiary] Failed to save love coupon to database:', err);
        showToast("Couldn't sync this change to the server — it's only on this device for now.", 'warn');
      });
    }
  };

  const redeemLoveCoupon = (id: string) => {
    const redeemerName = activeProfile.name;
    const targetCoupon = data.loveCoupons?.find((c) => c.id === id);
    const redeemedDate = new Date().toISOString().split('T')[0];
    setData((prev) => ({
      ...prev,
      loveCoupons: (prev.loveCoupons || []).map((c) =>
        c.id === id ? { ...c, redeemed: true, redeemedAt: redeemedDate } : c
      ),
    }));
    if (targetCoupon) {
      sendPushNotification(`🎟️ Love Coupon Redeemed!`, {
        body: `${redeemerName} just redeemed: "${targetCoupon.title}"!`,
        url: '/coupons',
      });
    }
    showToast('Coupon redeemed! Time to pamper each other 💕', 'heart');

    const supabase = remoteClient();
    if (supabase && !id.startsWith('c_')) {
      redeemLoveCouponRemote(supabase, id, redeemedDate).catch((err) => {
        console.error('[OurDiary] Failed to sync redeemed coupon:', err);
        showToast("Couldn't sync this change to the server — it's only on this device for now.", 'warn');
      });
    }
  };

  const toggleSoundtrack = () => {
    setData((prev) => ({
      ...prev,
      soundtrack: {
        ...(prev.soundtrack || { currentSong: 'Until I Found You', currentArtist: 'Stephen Sanchez' }),
        isPlaying: !prev.soundtrack?.isPlaying,
      },
    }));
  };

  return (
    <DiaryContext.Provider
      value={{
        data,
        isHydrated,
        activeProfile,
        partnerProfile,
        switchProfile,
        updateCouple,
        updateProfile,
        addMemory,
        updateMemory,
        deleteMemory,
        addPhotoToMemory,
        deletePhotoFromMemory,
        addReaction,
        removeReaction,
        addNote,
        updateNote,
        deleteNote,
        addEvent,
        updateEvent,
        deleteEvent,
        addLetter,
        updateLetter,
        deleteLetter,
        addBucketItem,
        updateBucketItem,
        toggleBucketItem,
        deleteBucketItem,
        convertBucketToMemory,
        resetAllData,
        exportJSON,
        importJSON,
        isLiveUser,
        setIsLiveUser,
        initCleanCoupleSpace,
        regenerateCoupleCode,
        toggleNoteLock,
        toggleNoteVisibleWhenLocked,
        sendHeartbeatPing,
        markHeartbeatSeen,
        updateMoodBeacon,
        sendWarmHug,
        answerDailySpark,
        addWheelOption,
        deleteWheelOption,
        addLoveCoupon,
        redeemLoveCoupon,
        toggleSoundtrack,
        loadExistingCoupleSpace,
        logout,
        toasts,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </DiaryContext.Provider>
  );
}

export function useDiary() {
  const context = useContext(DiaryContext);
  if (!context) {
    throw new Error('useDiary must be used within a DiaryProvider');
  }
  return context;
}

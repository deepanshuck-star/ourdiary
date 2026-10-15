import { OurDiaryData } from '@/types';
import { initialDiaryData } from '@/data/seed';

const STORAGE_KEY = 'ourdiary_app_state_v1';

export function loadDiaryData(): OurDiaryData {
  if (typeof window === 'undefined') {
    return initialDiaryData;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return initialDiaryData;
    }
    const parsed = JSON.parse(raw) as OurDiaryData;
    // Basic validation
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.couple &&
      Array.isArray(parsed.memories) &&
      Array.isArray(parsed.events) &&
      Array.isArray(parsed.letters) &&
      Array.isArray(parsed.bucketList)
    ) {
      return parsed;
    }
    console.warn('Storage data corrupted or schema mismatch. Falling back to initial seed data.');
    return initialDiaryData;
  } catch (error) {
    console.error('Error loading data from localStorage:', error);
    return initialDiaryData;
  }
}

export function saveDiaryData(data: OurDiaryData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving data to localStorage:', error);
  }
}

export function resetDiaryData(): OurDiaryData {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }
  }
  return JSON.parse(JSON.stringify(initialDiaryData));
}

export function exportDiaryDataJSON(data: OurDiaryData): string {
  return JSON.stringify(data, null, 2);
}

export function validateAndImportDiaryData(jsonStr: string): { success: boolean; data?: OurDiaryData; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Invalid JSON: root must be an object' };
    }
    if (!parsed.couple || !parsed.couple.name || !parsed.couple.startDate) {
      return { success: false, error: 'Missing couple information in imported data' };
    }
    if (!Array.isArray(parsed.memories)) {
      return { success: false, error: 'Memories array missing' };
    }
    if (!Array.isArray(parsed.events)) {
      return { success: false, error: 'Events array missing' };
    }
    if (!Array.isArray(parsed.letters)) {
      return { success: false, error: 'Letters array missing' };
    }
    if (!Array.isArray(parsed.bucketList)) {
      return { success: false, error: 'Bucket list array missing' };
    }
    return { success: true, data: parsed as OurDiaryData };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to parse JSON file' };
  }
}

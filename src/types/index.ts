export type ProfileId = 'user_1' | 'user_2';

export interface DemoProfile {
  id: ProfileId;
  name: string;
  nickname?: string;
  avatar: string;
  bio?: string;
  favoriteColor?: string;
}

export interface Couple {
  id: string;
  name: string;
  user1: DemoProfile;
  user2: DemoProfile;
  startDate: string; // YYYY-MM-DD
  anniversaryDate: string; // YYYY-MM-DD
  theme: 'candy' | 'sunset' | 'lavender' | 'mint';
  animationsEnabled: boolean;
  inviteCode?: string;
  isLocked?: boolean;
}

export type MemoryCategory =
  | 'First date'
  | 'Outing'
  | 'Trip'
  | 'Anniversary'
  | 'Birthday'
  | 'Funny moment'
  | 'Special moment'
  | 'Fight or disagreement'
  | 'Important conversation'
  | 'Other';

export type Mood =
  | 'happy'
  | 'romantic'
  | 'adventurous'
  | 'funny'
  | 'cozy'
  | 'touching'
  | 'peaceful';

export interface MemoryPhoto {
  id: string;
  url: string;
  caption?: string;
  dateAdded: string;
}

export interface MemoryNote {
  id: string;
  memoryId: string;
  authorId: ProfileId;
  authorName: string;
  content: string;
  visibility: 'shared' | 'private';
  passcode?: string;
  isLocked?: boolean;
  createdAt: string;
}

export interface Reaction {
  id: string;
  userId: ProfileId;
  emoji: string;
  label: string;
}

export interface Memory {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  description: string;
  mood: Mood;
  category: MemoryCategory;
  location: string;
  photos: MemoryPhoto[];
  tags: string[];
  createdBy: ProfileId;
  perspectives: {
    user_1?: string;
    user_2?: string;
  };
  reactions: Reaction[];
  notes: MemoryNote[];
}

export type EventCategory =
  | 'Anniversary'
  | 'Birthday'
  | 'Date Night'
  | 'Trip'
  | 'Milestone'
  | 'Reminder';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  category: EventCategory;
  description?: string;
  memoryId?: string;
}

export interface Letter {
  id: string;
  title: string;
  fromId: ProfileId;
  toId: ProfileId;
  content: string;
  createdAt: string; // ISO
  unlockDate: string; // YYYY-MM-DD
  isDraft: boolean;
  readAt?: string;
  envelopeColor?: string;
}

export type BucketCategory = 'Travel' | 'Food' | 'Movies' | 'Activities' | 'Milestones';

export interface BucketItem {
  id: string;
  title: string;
  category: BucketCategory;
  completed: boolean;
  completedDate?: string;
  targetDate?: string;
  notes?: string;
  createdBy: ProfileId;
  memoryId?: string;
}

export type MoodType =
  | 'happy'
  | 'cuddle'
  | 'low_battery'
  | 'hangry'
  | 'stressed'
  | 'romantic';

export interface UserMood {
  mood: MoodType;
  customNote?: string;
  updatedAt: string;
}

export interface HeartbeatPing {
  fromId: ProfileId;
  fromName: string;
  message?: string;
  timestamp: string;
  seen: boolean;
}

export interface DailySparkAnswer {
  questionId: string;
  question: string;
  date: string;
  answers: {
    user_1?: { content: string; answeredAt: string };
    user_2?: { content: string; answeredAt: string };
  };
}

export interface WheelOption {
  id: string;
  text: string;
  category: 'food' | 'activity';
}

export interface LoveCoupon {
  id: string;
  title: string;
  description: string;
  category: string;
  fromId: ProfileId;
  toId: ProfileId;
  redeemed: boolean;
  redeemedAt?: string;
}

export interface MemorySoundtrack {
  currentSong?: string;
  currentArtist?: string;
  spotifyUrl?: string;
  isPlaying?: boolean;
}

export interface OurDiaryData {
  couple: Couple;
  activeProfileId: ProfileId;
  memories: Memory[];
  events: CalendarEvent[];
  letters: Letter[];
  bucketList: BucketItem[];
  moodBeacons?: {
    user_1?: UserMood;
    user_2?: UserMood;
  };
  latestHeartbeat?: HeartbeatPing;
  heartbeatStreak?: number;
  lastHeartbeatDate?: string;
  dailySparkAnswers?: DailySparkAnswer[];
  customWheelOptions?: WheelOption[];
  loveCoupons?: LoveCoupon[];
  soundtrack?: MemorySoundtrack;
}


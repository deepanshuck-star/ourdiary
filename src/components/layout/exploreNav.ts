import {
  Globe2,
  HelpCircle,
  Gift,
  BookOpen,
  HeartHandshake,
  Hourglass,
  Clock3,
  Wallet,
  MapPinned,
  MessagesSquare,
  Music4,
} from 'lucide-react';

// Newer features — synced to the shared couple space in Supabase (see
// src/lib/supabase/xsync.ts), same as memories/events/etc.
export const exploreItems = [
  { name: 'Our Chat', href: '/chat', icon: MessagesSquare },
  { name: 'Our Soundtrack', href: '/music', icon: Music4 },
  { name: 'Memory Globe', href: '/globe', icon: Globe2 },
  { name: 'Couple Quizzes', href: '/quizzes', icon: HelpCircle },
  { name: 'Date Ideas', href: '/date-ideas', icon: HeartHandshake },
  { name: 'Countdowns', href: '/countdowns', icon: Hourglass },
  { name: 'Long Distance', href: '/long-distance', icon: Clock3 },
  { name: 'Date Budget', href: '/budget', icon: Wallet },
  { name: 'Surprise Notes', href: '/surprises', icon: MapPinned },
  { name: 'Year in Review', href: '/year-review', icon: Gift },
  { name: 'Memory Book', href: '/memory-book', icon: BookOpen },
];

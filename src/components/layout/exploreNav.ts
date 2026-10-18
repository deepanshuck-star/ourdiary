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
  Wand2,
} from 'lucide-react';

// Newer features — all data stays on this device (see src/lib/local-store.ts).
export const exploreItems = [
  { name: 'Memory Globe', href: '/globe', icon: Globe2 },
  { name: 'Couple Quizzes', href: '/quizzes', icon: HelpCircle },
  { name: 'Date Ideas', href: '/date-ideas', icon: HeartHandshake },
  { name: 'AI Date Planner', href: '/planner', icon: Wand2 },
  { name: 'Countdowns', href: '/countdowns', icon: Hourglass },
  { name: 'Long Distance', href: '/long-distance', icon: Clock3 },
  { name: 'Date Budget', href: '/budget', icon: Wallet },
  { name: 'Surprise Notes', href: '/surprises', icon: MapPinned },
  { name: 'Year in Review', href: '/year-review', icon: Gift },
  { name: 'Memory Book', href: '/memory-book', icon: BookOpen },
];

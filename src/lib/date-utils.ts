/**
 * Date utility helpers for OurDiary
 */

export function getNow(): Date {
  if (typeof window === 'undefined') {
    return new Date('2025-04-12T12:00:00Z');
  }
  return new Date();
}

export function parseDate(dateStr: string): Date {
  // Handles YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  return new Date(dateStr);
}

export function formatDate(dateStr: string): string {
  try {
    const d = parseDate(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatMonthYear(dateStr: string): string {
  try {
    const d = parseDate(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function calculateDaysTogether(startDateStr: string): number {
  const start = parseDate(startDateStr);
  const today = getNow();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}

export function calculateNextAnniversary(startDateStr: string): {
  daysLeft: number;
  nextDate: Date;
  yearsCount: number;
} {
  const start = parseDate(startDateStr);
  const today = getNow();
  today.setHours(0, 0, 0, 0);

  const startMonth = start.getMonth();
  const startDay = start.getDate();

  let nextYear = today.getFullYear();
  let candidate = new Date(nextYear, startMonth, startDay);

  if (candidate.getTime() < today.getTime()) {
    nextYear += 1;
    candidate = new Date(nextYear, startMonth, startDay);
  }

  const diffTime = candidate.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const yearsCount = nextYear - start.getFullYear();

  return {
    daysLeft,
    nextDate: candidate,
    yearsCount,
  };
}

export function getDaysUntil(dateStr: string): number {
  const target = parseDate(dateStr);
  const today = getNow();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isPastOrToday(dateStr: string): boolean {
  return getDaysUntil(dateStr) <= 0;
}

export function getMilestones(startDateStr: string) {
  const start = parseDate(startDateStr);
  const today = getNow();
  today.setHours(0, 0, 0, 0);

  const milestones = [
    { days: 100, label: '100 Days Together' },
    { days: 200, label: '200 Days of Us' },
    { days: 365, label: '1st Year Anniversary' },
    { days: 500, label: '500 Days of Magic' },
    { days: 730, label: '2nd Year Anniversary' },
    { days: 1000, label: '1,000 Days of Love' },
    { days: 1095, label: '3rd Year Anniversary' },
    { days: 1500, label: '1,500 Days Together' },
    { days: 1825, label: '5th Year Golden Milestone' },
  ];

  return milestones.map((m) => {
    const targetTime = start.getTime() + m.days * 24 * 60 * 60 * 1000;
    const targetDate = new Date(targetTime);
    const diffTime = targetDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      days: m.days,
      label: m.label,
      targetDate: targetDate.toISOString().split('T')[0],
      daysLeft,
      reached: daysLeft <= 0,
    };
  });
}

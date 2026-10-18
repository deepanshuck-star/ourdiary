// Date budget logic. Import-free so `node --test` can load it directly.
// All money math happens in integer minor units (cents/paise) to avoid float drift.

export type ExpenseCategory = 'dates' | 'trips' | 'gifts' | 'other';
export type Payer = 'user_1' | 'user_2';

export interface Expense {
  id: string;
  title: string;
  amount: number; // major units, e.g. 450.5
  category: ExpenseCategory;
  paidBy: Payer;
  date: string; // YYYY-MM-DD
}

export const EXPENSE_CATEGORIES: { id: ExpenseCategory; label: string }[] = [
  { id: 'dates', label: 'Dates' },
  { id: 'trips', label: 'Trips' },
  { id: 'gifts', label: 'Gifts' },
  { id: 'other', label: 'Other' },
];

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED', 'JPY'];

const toMinor = (n: number) => Math.round(n * 100);
const toMajor = (n: number) => n / 100;

export function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function expensesForMonth(expenses: Expense[], month: string): Expense[] {
  return expenses.filter((e) => monthKey(e.date) === month);
}

export interface BudgetSummary {
  total: number;
  remaining: number;
  percentUsed: number; // 0..∞ (can exceed 100)
  overBudget: boolean;
  byCategory: Record<ExpenseCategory, number>;
}

export function summarize(expenses: Expense[], monthlyBudget: number): BudgetSummary {
  const byMinor: Record<ExpenseCategory, number> = { dates: 0, trips: 0, gifts: 0, other: 0 };
  let totalMinor = 0;
  for (const e of expenses) {
    const minor = toMinor(e.amount);
    totalMinor += minor;
    byMinor[e.category] = (byMinor[e.category] ?? 0) + minor;
  }
  const budgetMinor = toMinor(Math.max(0, monthlyBudget || 0));
  return {
    total: toMajor(totalMinor),
    remaining: toMajor(budgetMinor - totalMinor),
    percentUsed: budgetMinor > 0 ? (totalMinor / budgetMinor) * 100 : 0,
    overBudget: budgetMinor > 0 && totalMinor > budgetMinor,
    byCategory: {
      dates: toMajor(byMinor.dates),
      trips: toMajor(byMinor.trips),
      gifts: toMajor(byMinor.gifts),
      other: toMajor(byMinor.other),
    },
  };
}

export interface Settlement {
  paid: Record<Payer, number>;
  fairShare: number;
  /** null when already even. */
  owes: { from: Payer; to: Payer; amount: number } | null;
}

/** Every expense is split 50/50; work out who owes whom to even up. */
export function settleUp(expenses: Expense[]): Settlement {
  let p1 = 0;
  let p2 = 0;
  for (const e of expenses) {
    if (e.paidBy === 'user_1') p1 += toMinor(e.amount);
    else p2 += toMinor(e.amount);
  }
  const total = p1 + p2;
  const diff = p1 - p2; // positive: user_1 paid more
  const owedMinor = Math.round(Math.abs(diff) / 2);
  return {
    paid: { user_1: toMajor(p1), user_2: toMajor(p2) },
    fairShare: toMajor(Math.round(total / 2)),
    owes:
      owedMinor === 0
        ? null
        : diff > 0
          ? { from: 'user_2', to: 'user_1', amount: toMajor(owedMinor) }
          : { from: 'user_1', to: 'user_2', amount: toMajor(owedMinor) },
  };
}

export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[,\s]/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return n > 0 ? n : null;
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

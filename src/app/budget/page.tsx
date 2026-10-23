'use client';

import React, { useMemo, useState } from 'react';
import { ArrowRight, Plus, Scale, Trash2, Wallet } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { useSpaceMode } from '@/hooks/useSpaceMode';
import { useLocalState } from '@/lib/local-store';
import { newId, useNow } from '@/hooks/useNow';
import { toISODate } from '@/lib/features/countdowns';
import {
  CURRENCIES,
  EXPENSE_CATEGORIES,
  expensesForMonth,
  formatMoney,
  parseAmount,
  settleUp,
  summarize,
  type Expense,
  type ExpenseCategory,
  type Payer,
} from '@/lib/features/budget';

interface BudgetState {
  currency: string;
  monthlyBudget: number;
  expenses: Expense[];
}

const inputClass =
  'w-full px-4 py-2.5 rounded-2xl border border-line bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus';

function formatMonthLabel(month: string) {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export default function BudgetPage() {
  const { data, showToast } = useDiary();
  const { isPersonal, note: spaceNote, title: spaceTitle } = useSpaceMode();
  const note = spaceNote('/budget');
  const now = useNow(60_000);
  const names: Record<Payer, string> = { user_1: data.couple.user1.name, user_2: data.couple.user2.name };

  const [state, setState] = useLocalState<BudgetState>(`budget:${data.couple.id}`, {
    currency: 'INR',
    monthlyBudget: 0,
    expenses: [],
  });
  const { currency, monthlyBudget, expenses } = state;

  const today = now === null ? '' : toISODate(new Date(now));
  const [monthPick, setMonthPick] = useState('');
  const month = monthPick || today.slice(0, 7);

  const [budgetDraft, setBudgetDraft] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('dates');
  const [paidBy, setPaidBy] = useState<Payer>(data.activeProfileId);
  const [datePick, setDatePick] = useState('');
  const [amountError, setAmountError] = useState('');

  const monthExpenses = useMemo(
    () => expensesForMonth(expenses, month).sort((a, b) => b.date.localeCompare(a.date)),
    [expenses, month]
  );
  const summary = summarize(monthExpenses, monthlyBudget);
  const settlement = settleUp(monthExpenses);
  const money = (n: number) => formatMoney(n, currency);

  const saveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseAmount(budgetDraft);
    if (n === null) return;
    setState((prev) => ({ ...prev, monthlyBudget: n }));
    setBudgetDraft('');
    showToast('Monthly budget updated', 'success');
  };

  const addExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseAmount(amount);
    if (n === null) {
      setAmountError('Enter an amount above zero, with up to two decimals.');
      return;
    }
    if (!title.trim()) return;
    setAmountError('');
    const expense: Expense = {
      id: newId('exp'),
      title: title.trim(),
      amount: n,
      category,
      paidBy,
      date: datePick || today,
    };
    setState((prev) => ({ ...prev, expenses: [expense, ...prev.expenses] }));
    setTitle('');
    setAmount('');
    setDatePick('');
    showToast('Expense added', 'success');
  };

  const removeExpense = (id: string) =>
    setState((prev) => ({ ...prev, expenses: prev.expenses.filter((x) => x.id !== id) }));

  const pctUsed = Math.min(100, summary.percentUsed);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Date budget</p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink mt-1">
              {spaceTitle('/budget', 'Love, on a budget')}
            </h1>
            {!isPersonal && (
              <p className="text-sm text-ink-muted mt-2 max-w-2xl">
                Keep date nights, trips and gifts in check — and keep things even between you.
              </p>
            )}
            {note && <p className="text-sm text-ink-muted mt-2 max-w-2xl">{note}</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            <div>
              <label htmlFor="budget-month" className="block text-xs font-semibold text-ink-muted mb-1">Month</label>
              <input
                id="budget-month"
                type="month"
                value={month}
                onChange={(e) => setMonthPick(e.target.value)}
                className="px-4 py-2 rounded-2xl border border-line bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus"
              />
            </div>
            <div>
              <label htmlFor="budget-currency" className="block text-xs font-semibold text-ink-muted mb-1">Currency</label>
              <select
                id="budget-currency"
                value={currency}
                onChange={(e) => setState((prev) => ({ ...prev, currency: e.target.value }))}
                className="px-4 py-2 rounded-2xl border border-line bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <section aria-label={`Summary for ${formatMonthLabel(month)}`} className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Spent', value: money(summary.total) },
            { label: 'Monthly budget', value: monthlyBudget > 0 ? money(monthlyBudget) : 'Not set' },
            {
              label: summary.overBudget ? 'Over budget by' : 'Remaining',
              value: monthlyBudget > 0 ? money(Math.abs(summary.remaining)) : '—',
            },
          ].map((card) => (
            <div key={card.label} className="rounded-[1.25rem] bg-surface border border-line p-5 shadow-card">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{card.label}</p>
              <p className={`font-display text-3xl font-semibold mt-2 ${card.label.startsWith('Over') ? 'text-danger' : 'text-ink'}`}>
                {card.value}
              </p>
            </div>
          ))}
        </section>

        {monthlyBudget > 0 && (
          <div>
            <div className="flex justify-between text-xs text-ink-muted mb-1">
              <span>{Math.round(summary.percentUsed)}% of this month's budget used</span>
              <span>{formatMonthLabel(month)}</span>
            </div>
            <div
              className="h-3 rounded-full bg-purple-50 border border-line overflow-hidden"
              role="progressbar"
              aria-label="Budget used"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pctUsed)}
            >
              <div
                className={`h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500 ${summary.overBudget ? 'bg-danger' : 'bg-primary'}`}
                style={{ width: `${pctUsed}%` }}
              />
            </div>
          </div>
        )}

        <div className={`grid gap-6 items-start ${isPersonal ? '' : 'lg:grid-cols-2'}`}>
          <section aria-labelledby="by-category" className="rounded-[1.25rem] bg-surface border border-line p-5 sm:p-6 shadow-card">
            <h2 id="by-category" className="text-xl font-semibold text-ink">Where it went</h2>
            <ul className="mt-4 space-y-4">
              {EXPENSE_CATEGORIES.map((c) => {
                const value = summary.byCategory[c.id];
                const share = summary.total > 0 ? (value / summary.total) * 100 : 0;
                return (
                  <li key={c.id}>
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-ink">{c.label}</span>
                      <span className="text-ink-muted">
                        {money(value)} · {Math.round(share)}%
                      </span>
                    </div>
                    <div className="h-2.5 mt-1.5 rounded-full bg-purple-50 overflow-hidden" aria-hidden="true">
                      <div
                        className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-500"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Nothing to settle with yourself. */}
          {!isPersonal && (
            <section aria-labelledby="split-heading" className="rounded-[1.25rem] bg-hero border border-line p-5 sm:p-6 shadow-card">
              <h2 id="split-heading" className="text-xl font-semibold text-ink flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" aria-hidden="true" /> Keeping it even
              </h2>
              <p className="text-xs text-ink-muted mt-1">Everything is split 50/50.</p>
              <dl className="grid grid-cols-2 gap-3 mt-4">
                {(['user_1', 'user_2'] as Payer[]).map((p) => (
                  <div key={p} className="rounded-2xl bg-surface border border-line p-3">
                    <dt className="text-xs text-ink-muted">{names[p]} paid</dt>
                    <dd className="font-semibold text-ink mt-0.5">{money(settlement.paid[p])}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-sm text-ink flex flex-wrap items-center gap-2">
                {settlement.owes ? (
                  <>
                    <span className="font-semibold">{names[settlement.owes.from]}</span>
                    <ArrowRight className="w-4 h-4 text-primary" aria-hidden="true" />
                    <span className="font-semibold">{names[settlement.owes.to]}</span>
                    <span>
                      owes <span className="font-display text-2xl font-semibold">{money(settlement.owes.amount)}</span>
                    </span>
                  </>
                ) : (
                  <span>You're perfectly even this month.</span>
                )}
              </p>
            </section>
          )}
        </div>

        <div className="grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6 items-start">
          <section aria-labelledby="add-expense" className="rounded-[1.25rem] bg-surface border border-line p-5 sm:p-6 shadow-card">
            <h2 id="add-expense" className="text-xl font-semibold text-ink">Add an expense</h2>
            <form onSubmit={addExpense} className="grid sm:grid-cols-2 gap-4 mt-4" noValidate>
              <div className="sm:col-span-2">
                <label htmlFor="exp-title" className="block text-xs font-semibold text-ink-muted mb-1">What was it?</label>
                <input id="exp-title" required maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dinner at the rooftop place" className={inputClass} />
              </div>
              <div>
                <label htmlFor="exp-amount" className="block text-xs font-semibold text-ink-muted mb-1">Amount ({currency})</label>
                <input
                  id="exp-amount"
                  inputMode="decimal"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1200"
                  aria-invalid={Boolean(amountError)}
                  aria-describedby={amountError ? 'exp-amount-error' : undefined}
                  className={inputClass}
                />
                {amountError && (
                  <p id="exp-amount-error" className="text-xs text-danger mt-1">{amountError}</p>
                )}
              </div>
              <div>
                <label htmlFor="exp-category" className="block text-xs font-semibold text-ink-muted mb-1">Category</label>
                <select id="exp-category" value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} className={inputClass}>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              {!isPersonal && (
                <fieldset>
                  <legend className="block text-xs font-semibold text-ink-muted mb-1">Who paid?</legend>
                  <div className="flex gap-2">
                    {(['user_1', 'user_2'] as Payer[]).map((p) => (
                      <label
                        key={p}
                        className={`flex-1 text-center px-3 py-2.5 rounded-full border text-sm font-semibold cursor-pointer focus-within:ring-2 focus-within:ring-focus ${
                          paidBy === p ? 'bg-primary text-on-primary border-primary' : 'bg-surface text-ink border-line'
                        }`}
                      >
                        <input type="radio" name="paid-by" value={p} checked={paidBy === p} onChange={() => setPaidBy(p)} className="sr-only" />
                        {names[p]}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              <div>
                <label htmlFor="exp-date" className="block text-xs font-semibold text-ink-muted mb-1">Date</label>
                <input id="exp-date" type="date" value={datePick || today} onChange={(e) => setDatePick(e.target.value)} className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta">
                  <Plus className="w-4 h-4" /> Add expense
                </button>
              </div>
            </form>
          </section>

          <section aria-labelledby="set-budget" className="rounded-[1.25rem] bg-surface border border-line p-5 sm:p-6 shadow-card">
            <h2 id="set-budget" className="text-xl font-semibold text-ink flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" aria-hidden="true" /> Monthly budget
            </h2>
            <form onSubmit={saveBudget} className="mt-4 space-y-3">
              <div>
                <label htmlFor="budget-amount" className="block text-xs font-semibold text-ink-muted mb-1">Amount per month ({currency})</label>
                <input
                  id="budget-amount"
                  inputMode="decimal"
                  value={budgetDraft}
                  onChange={(e) => setBudgetDraft(e.target.value)}
                  placeholder={monthlyBudget > 0 ? String(monthlyBudget) : '10000'}
                  className={inputClass}
                />
              </div>
              <button type="submit" className="px-5 py-2.5 rounded-full text-sm font-semibold border border-line text-ink hover:border-primary">
                Save budget
              </button>
            </form>
          </section>
        </div>

        <section aria-labelledby="expense-list" className="space-y-3">
          <h2 id="expense-list" className="text-2xl font-semibold text-ink">
            {formatMonthLabel(month)} ({monthExpenses.length})
          </h2>
          {monthExpenses.length === 0 ? (
            <p className="text-sm text-ink-muted rounded-[1.25rem] border border-dashed border-line p-5">
              No expenses this month yet.
            </p>
          ) : (
            <ul className="rounded-[1.25rem] bg-surface border border-line shadow-card divide-y divide-line">
              {monthExpenses.map((x) => (
                <li key={x.id} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink truncate">{x.title}</p>
                    <p className="text-xs text-ink-muted">
                      {EXPENSE_CATEGORIES.find((c) => c.id === x.category)?.label}
                      {!isPersonal && ` · paid by ${names[x.paidBy]}`} · {x.date}
                    </p>
                  </div>
                  <p className="font-semibold text-ink tabular-nums">{money(x.amount)}</p>
                  <button
                    type="button"
                    onClick={() => removeExpense(x.id)}
                    aria-label={`Delete ${x.title}`}
                    className="p-2 rounded-full text-ink-muted hover:text-ink"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}

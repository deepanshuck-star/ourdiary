import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize, settleUp, expensesForMonth, parseAmount, formatMoney } from '../src/lib/features/budget.ts';

const ex = [
  { id: '1', title: 'Dinner', amount: 1200.5, category: 'dates', paidBy: 'user_1', date: '2026-10-02' },
  { id: '2', title: 'Train', amount: 800, category: 'trips', paidBy: 'user_2', date: '2026-10-05' },
  { id: '3', title: 'Flowers', amount: 0.1, category: 'gifts', paidBy: 'user_1', date: '2026-10-06' },
  { id: '4', title: 'Old', amount: 999, category: 'other', paidBy: 'user_2', date: '2026-09-30' },
];

test('month filter and totals per category without float drift', () => {
  const oct = expensesForMonth(ex, '2026-10');
  assert.equal(oct.length, 3);
  const s = summarize(oct, 5000);
  assert.equal(s.total, 2000.6);
  assert.equal(s.remaining, 2999.4);
  assert.equal(s.byCategory.dates, 1200.5);
  assert.equal(s.byCategory.trips, 800);
  assert.equal(s.byCategory.gifts, 0.1);
  assert.equal(s.byCategory.other, 0);
  assert.equal(s.overBudget, false);
  assert.ok(Math.abs(s.percentUsed - 40.012) < 1e-9);
});

test('over budget and zero budget', () => {
  assert.equal(summarize(ex, 100).overBudget, true);
  assert.equal(summarize(ex, 0).percentUsed, 0);
  assert.equal(summarize([], 0).total, 0);
});

test('settleUp: the one who paid less owes half the difference', () => {
  const s = settleUp(expensesForMonth(ex, '2026-10'));
  assert.equal(s.paid.user_1, 1200.6);
  assert.equal(s.paid.user_2, 800);
  assert.deepEqual(s.owes, { from: 'user_2', to: 'user_1', amount: 200.3 });
  assert.equal(settleUp([]).owes, null);
  const even = settleUp([
    { id: 'a', title: 'x', amount: 50, category: 'dates', paidBy: 'user_1', date: '2026-10-01' },
    { id: 'b', title: 'y', amount: 50, category: 'dates', paidBy: 'user_2', date: '2026-10-01' },
  ]);
  assert.equal(even.owes, null);
  const reverse = settleUp([{ id: 'a', title: 'x', amount: 30, category: 'gifts', paidBy: 'user_2', date: '2026-10-01' }]);
  assert.deepEqual(reverse.owes, { from: 'user_1', to: 'user_2', amount: 15 });
});

test('parseAmount and formatMoney', () => {
  assert.equal(parseAmount('1,250.50'), 1250.5);
  assert.equal(parseAmount('abc'), null);
  assert.equal(parseAmount('0'), null);
  assert.equal(parseAmount('1.234'), null);
  assert.match(formatMoney(1250, 'INR'), /1,250/);
});

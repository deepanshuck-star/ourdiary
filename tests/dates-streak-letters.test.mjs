import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { toLocalDayKey } from '../src/lib/date-utils.ts';
import { nextHeartbeatStreak, liveHeartbeatStreak } from '../src/lib/features/streak.ts';

const root = process.cwd();
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? sourceFiles(path.join(dir, e.name)) : /\.(ts|tsx)$/.test(e.name) ? [path.join(dir, e.name)] : []
  );
}

test('a local day key uses the local calendar, not UTC', () => {
  // 00:30 on 3 November in the viewer's own time zone is the 3rd — whatever
  // UTC thinks. The old toISOString() version said the 2nd in India.
  assert.equal(toLocalDayKey(new Date(2026, 10, 3, 0, 30)), '2026-11-03');
  assert.equal(toLocalDayKey(new Date(2026, 10, 3, 23, 59)), '2026-11-03');
  assert.equal(toLocalDayKey(new Date(2026, 0, 5)), '2026-01-05');
});

test('nothing in the app works out "today" in UTC any more', () => {
  const offenders = [];
  for (const file of sourceFiles(path.join(root, 'src'))) {
    const code = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    if (/toISOString\(\)\.(split\(['"]T['"]\)\[0\]|slice\(0, ?10\)|substring\(0, ?10\))/.test(code)) {
      offenders.push(path.relative(root, file));
    }
  }
  assert.deepEqual(offenders, [], 'these compute a date in UTC, which is yesterday after midnight in India');
});

test('the love-ping streak only grows on consecutive days', () => {
  const today = '2026-11-03';
  assert.equal(nextHeartbeatStreak(undefined, undefined, today), 1, 'first ever ping');
  assert.equal(nextHeartbeatStreak(5, '2026-11-03', today), 5, 'second ping the same day');
  assert.equal(nextHeartbeatStreak(5, '2026-11-02', today), 6, 'the day after');
  assert.equal(nextHeartbeatStreak(12, '2026-10-27', today), 1, 'a week off starts again — the old code said 13');
  assert.equal(nextHeartbeatStreak(4, '2026-11-04', today), 4, 'a date ahead of today never breaks it');
  assert.equal(nextHeartbeatStreak(9, '2026-10-31', '2026-11-01'), 10, 'across a month boundary');
  assert.equal(nextHeartbeatStreak(3, '2026-12-31', '2027-01-01'), 4, 'across a year boundary');
  assert.equal(nextHeartbeatStreak(-3, '2026-11-02', today), 1, 'junk counts as nothing');
});

test('the streak shown today is honest about a missed day', () => {
  const today = '2026-11-03';
  assert.equal(liveHeartbeatStreak(7, '2026-11-03', today), 7, 'pinged today');
  assert.equal(liveHeartbeatStreak(7, '2026-11-02', today), 7, 'yesterday still counts until today ends');
  assert.equal(liveHeartbeatStreak(7, '2026-11-01', today), 0, 'a whole day missed');
  assert.equal(liveHeartbeatStreak(0, undefined, today), 0, 'a new couple has no streak yet');
  assert.equal(liveHeartbeatStreak(7, 'garbage', today), 0);
});

test('the app uses those rules rather than counting days with a ping', () => {
  const ctx = read('src', 'store', 'DiaryContext.tsx');
  assert.ok(ctx.includes('nextHeartbeatStreak(prev.heartbeatStreak, prev.lastHeartbeatDate, today)'));
  assert.equal(ctx.includes('isNewDay ? currentStreak + 1'), false);
  assert.equal(/heartbeatStreak: 1,/.test(ctx), false, 'a new couple must not start on a streak');
  assert.ok(read('src', 'app', 'dashboard', 'page.tsx').includes('liveHeartbeatStreak(data.heartbeatStreak, data.lastHeartbeatDate, todayStr)'));
  assert.ok(read('src', 'components', 'widgets', 'HeartbeatLovePingModal.tsx').includes('nextHeartbeatStreak('));
});

test('migration 22 keeps drafts private and received letters unedited', () => {
  const sql = read('supabase', 'migrations', '20261103000022_letters_drafts_private_recipient_read_only.sql');
  assert.match(sql, /author_id = auth\.uid\(\) OR\s*\(\s*status <> 'draft' AND/);
  for (const col of ['title', 'content', 'unlock_at', 'author_id', 'recipient_id', 'couple_id', 'envelope_color', 'created_at']) {
    assert.ok(sql.includes(`NEW.${col}`), `the trigger does not protect ${col}`);
  }
  assert.equal(sql.includes('NEW.read_at'), false, 'marking a letter read must stay allowed');
  assert.match(sql, /auth\.uid\(\) IS NOT NULL/, 'the SQL editor and service role must not be blocked');
  assert.match(sql, /DROP TRIGGER IF EXISTS/, 'safe to run twice');
});

test('the migration check only looks, never changes anything', () => {
  const sql = read('supabase', 'checks', 'check_migrations_21_22.sql')
    .replace(/--[^\n]*/g, '')
    .toUpperCase();
  for (const verb of ['INSERT', 'UPDATE', 'DELETE', 'ALTER', 'DROP', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE']) {
    assert.equal(new RegExp(`\\b${verb}\\b`).test(sql), false, `the check contains ${verb}`);
  }
  assert.ok(sql.includes('FEATURE_STATE_KEY_UIDX'));
  assert.ok(sql.includes('LETTERS_RECIPIENT_MAY_ONLY_OPEN'));
});

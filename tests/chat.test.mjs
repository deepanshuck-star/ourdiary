import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  MAX_MESSAGE_LENGTH,
  dayLabel,
  groupMessagesByDay,
  mergeMessages,
  unreadCount,
  unreadIdsToMark,
  validateMessage,
  encodeChatMessage,
  decodeChatMessage,
} from '../src/lib/features/chat.ts';

const read = (...p) => fs.readFileSync(path.join(process.cwd(), ...p), 'utf8');

/** Local-time ISO string, so grouping tests don't depend on the runner's TZ. */
const localISO = (y, m, d, hh = 12, mm = 0) => new Date(y, m - 1, d, hh, mm).toISOString();

test('validateMessage rejects blank and over-long text', () => {
  assert.equal(validateMessage('hey'), null);
  assert.match(validateMessage('   '), /type something/i);
  assert.match(validateMessage(''), /type something/i);
  assert.equal(validateMessage('a'.repeat(MAX_MESSAGE_LENGTH)), null);
  assert.match(validateMessage('a'.repeat(MAX_MESSAGE_LENGTH + 1)), /too long/i);
});

test('validateMessage measures the trimmed length', () => {
  // Surrounding whitespace is stripped before sending, so it must not count
  // against the limit the database CHECK enforces.
  assert.equal(validateMessage('  ' + 'a'.repeat(MAX_MESSAGE_LENGTH) + '  '), null);
});

test('dayLabel says Today / Yesterday, else a date', () => {
  const now = new Date(2026, 9, 21, 15, 0);
  assert.equal(dayLabel(localISO(2026, 10, 21, 9), now), 'Today');
  assert.equal(dayLabel(localISO(2026, 10, 20, 23), now), 'Yesterday');
  assert.match(dayLabel(localISO(2026, 10, 12, 9), now), /Oct/);
  assert.equal(dayLabel('not-a-date', now), 'Unknown');
});

test('dayLabel groups by local date, not UTC', () => {
  // 00:30 local is still "today" for the reader even when UTC says otherwise.
  const now = new Date(2026, 9, 21, 15, 0);
  assert.equal(dayLabel(localISO(2026, 10, 21, 0, 30), now), 'Today');
});

test('groupMessagesByDay keeps order and starts a new group per day', () => {
  const now = new Date(2026, 9, 21, 15, 0);
  const messages = [
    { id: '1', createdAt: localISO(2026, 10, 20, 9) },
    { id: '2', createdAt: localISO(2026, 10, 20, 18) },
    { id: '3', createdAt: localISO(2026, 10, 21, 8) },
  ];
  const groups = groupMessagesByDay(messages, now);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].label, 'Yesterday');
  assert.deepEqual(groups[0].messages.map((m) => m.id), ['1', '2']);
  assert.equal(groups[1].label, 'Today');
  assert.deepEqual(groups[1].messages.map((m) => m.id), ['3']);
});

test('groupMessagesByDay keeps a message with a bad timestamp rather than dropping it', () => {
  const groups = groupMessagesByDay([{ id: 'x', createdAt: 'garbage' }], new Date(2026, 9, 21));
  assert.equal(groups.length, 1);
  assert.equal(groups[0].messages[0].id, 'x');
});

test('groupMessagesByDay returns nothing for an empty thread', () => {
  assert.deepEqual(groupMessagesByDay([]), []);
});

const thread = [
  { id: 'a', senderId: 'me', content: 'hi', createdAt: '2026-10-20T09:00:00.000Z', readAt: null },
  { id: 'b', senderId: 'them', content: 'hello', createdAt: '2026-10-20T09:01:00.000Z', readAt: null },
  { id: 'c', senderId: 'them', content: 'you up?', createdAt: '2026-10-20T09:02:00.000Z', readAt: '2026-10-20T10:00:00.000Z' },
];

test('unreadCount counts only the partner’s unread messages', () => {
  assert.equal(unreadCount(thread, 'me'), 1);
  // From the other side, my own 'hi' is the unread one.
  assert.equal(unreadCount(thread, 'them'), 1);
  assert.equal(unreadCount(thread, null), 0);
});

test('unreadIdsToMark never includes my own messages', () => {
  // RLS rejects stamping read_at on a row I sent, so those ids must not be
  // sent at all — the whole update would fail.
  assert.deepEqual(unreadIdsToMark(thread, 'me'), ['b']);
  assert.deepEqual(unreadIdsToMark(thread, 'them'), ['a']);
  assert.deepEqual(unreadIdsToMark(thread, null), []);
});

test('mergeMessages de-duplicates by id and sorts oldest-first', () => {
  const existing = [
    { id: 'b', createdAt: '2026-10-20T09:01:00.000Z' },
    { id: 'a', createdAt: '2026-10-20T09:00:00.000Z' },
  ];
  const incoming = [
    { id: 'b', createdAt: '2026-10-20T09:01:00.000Z' }, // realtime echo of one we hold
    { id: 'c', createdAt: '2026-10-20T09:02:00.000Z' },
  ];
  const merged = mergeMessages(existing, incoming);
  assert.deepEqual(merged.map((m) => m.id), ['a', 'b', 'c']);
});

test('mergeMessages orders equal timestamps deterministically', () => {
  const same = '2026-10-20T09:00:00.000Z';
  const merged = mergeMessages([{ id: 'z', createdAt: same }], [{ id: 'a', createdAt: same }]);
  assert.deepEqual(merged.map((m) => m.id), ['a', 'z']);
});

test('mergeMessages lets the incoming copy win, so read receipts land', () => {
  const merged = mergeMessages(
    [{ id: 'a', createdAt: '2026-10-20T09:00:00.000Z', readAt: null }],
    [{ id: 'a', createdAt: '2026-10-20T09:00:00.000Z', readAt: '2026-10-20T10:00:00.000Z' }]
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0].readAt, '2026-10-20T10:00:00.000Z');
});

test('Migration 15: chat_messages has RLS and a sender-bound insert', () => {
  const sql = read('supabase', 'migrations', '20261014000015_couple_songs_and_chat.sql');
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.chat_messages'));
  assert.ok(sql.includes('ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;'));
  assert.ok(sql.includes('sender_id = auth.uid()'));
  assert.ok(sql.includes('public.is_couple_member(couple_id)'));
});

test('Migration 15: only the recipient can stamp a read receipt', () => {
  const sql = read('supabase', 'migrations', '20261014000015_couple_songs_and_chat.sql');
  // Without this, a client could mark its own messages "seen" and fake a receipt.
  assert.ok(sql.includes('sender_id <> auth.uid()'));
  assert.ok(sql.includes('Chat messages mark-read policy'));
});

test('Migration 15: chat is added to the realtime publication idempotently', () => {
  const sql = read('supabase', 'migrations', '20261014000015_couple_songs_and_chat.sql');
  assert.ok(sql.includes('supabase_realtime'));
  // A bare ALTER PUBLICATION ... ADD TABLE errors on re-run; migrations here
  // are expected to be safely re-runnable.
  assert.ok(sql.includes('pg_publication_tables'));
});

test('chat.ts data layer targets chat_messages and cleans up its channel', () => {
  const src = read('src', 'lib', 'supabase', 'chat.ts');
  assert.ok(src.includes("from('chat_messages')"));
  assert.ok(src.includes('export async function sendMessageRemote'));
  assert.ok(src.includes('export async function markMessagesReadRemote'));
  assert.ok(src.includes('export function subscribeToChat'));
  // Re-stamping must not clobber an earlier "seen" time.
  assert.ok(src.includes(".is('read_at', null)"));
});

test('chat page removes its realtime channel on unmount', () => {
  const src = read('src', 'app', 'chat', 'page.tsx');
  assert.ok(src.includes('removeChannel'));
});


test('encodeChatMessage and decodeChatMessage round-trip correctly', () => {
  const raw = 'Hello sweetie!';
  const encoded = encodeChatMessage(raw, 'user_1');
  assert.notEqual(encoded, raw);
  const decoded = decodeChatMessage(encoded);
  assert.equal(decoded.text, raw);
  assert.equal(decoded.profile, 'user_1');
});

test('decodeChatMessage handles legacy messages without profile tag', () => {
  const legacy = 'I love you so much';
  const decoded = decodeChatMessage(legacy);
  assert.equal(decoded.text, legacy);
  assert.equal(decoded.profile, undefined);
});

test('encodeChatMessage caps at MAX_MESSAGE_LENGTH', () => {
  const longText = 'x'.repeat(MAX_MESSAGE_LENGTH);
  const encoded = encodeChatMessage(longText, 'user_2');
  assert.ok(encoded.length <= MAX_MESSAGE_LENGTH);
  const decoded = decodeChatMessage(encoded);
  assert.equal(decoded.profile, 'user_2');
  assert.ok(decoded.text.startsWith('x'));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  actorLabel,
  eventAdded,
  hugSent,
  letterSent,
  memoryAdded,
  messageSent,
  moodUpdated,
  noteAdded,
  photoAdded,
  pingSent,
} from '../src/lib/features/notify.ts';
import { KINDS, describe as describeNotification } from '../src/lib/features/notifications.ts';

const read = (...p) => fs.readFileSync(path.join(process.cwd(), ...p), 'utf8');

const builders = [
  ['memoryAdded', memoryAdded, 'memory', '/memories'],
  ['noteAdded', noteAdded, 'note', '/memories'],
  ['photoAdded', photoAdded, 'photo', '/memories'],
  ['eventAdded', eventAdded, 'event', '/calendar'],
  ['letterSent', letterSent, 'letter', '/letters'],
  ['pingSent', pingSent, 'ping', '/dashboard'],
  ['hugSent', hugSent, 'hug', '/dashboard'],
  ['moodUpdated', moodUpdated, 'mood', '/dashboard'],
];

test('every builder returns a supported kind and a destination', () => {
  for (const [name, build, kind, href] of builders) {
    const out = build('Mira');
    assert.equal(out.kind, kind, `${name} kind`);
    assert.equal(out.href, href, `${name} href`);
    assert.ok(KINDS.includes(out.kind), `${name} must use a known kind`);
  }
  const message = messageSent('Mira', null);
  assert.equal(message.kind, 'message');
  assert.equal(message.href, '/chat');
  assert.ok(KINDS.includes(message.kind));
});

test('the actor is named in the title', () => {
  for (const [name, build] of builders) {
    assert.ok(build('Mira').title.includes('Mira'), `${name} should name the actor`);
  }
  assert.ok(messageSent('Mira').title.includes('Mira'));
});

test('a missing or blank actor name falls back to "Your partner"', () => {
  assert.equal(actorLabel(''), 'Your partner');
  assert.equal(actorLabel('   '), 'Your partner');
  assert.equal(actorLabel(null), 'Your partner');
  assert.equal(actorLabel(undefined), 'Your partner');
  assert.equal(actorLabel('  Mira  '), 'Mira');
  for (const [name, build] of builders) {
    assert.ok(build(undefined).title.startsWith('Your partner'), `${name} fallback`);
  }
});

test('no builder but the chat one carries a body — content stays out of the feed', () => {
  for (const [name, build] of builders) {
    assert.equal(build('Mira').body, null, `${name} must not carry content`);
  }
});

test('a letter notification never leaks the letter', () => {
  const out = letterSent('Mira');
  const secret = 'I have something to tell you';
  assert.equal(out.body, null);
  assert.ok(!out.title.includes(secret));
  // The builder takes no content at all, so there is nothing to leak.
  assert.equal(letterSent.length, 1);
});

test('a chat preview is carried through when the sender opted in', () => {
  assert.equal(messageSent('Mira', 'see you at seven').body, 'see you at seven');
});

test('no preview means a null body, so the feed shows its generic line', () => {
  // previewFor() returns null when previews are off.
  for (const empty of [null, undefined, '', '   ']) {
    assert.equal(messageSent('Mira', empty).body, null, `preview ${JSON.stringify(empty)}`);
  }
  const generic = describeNotification(
    { id: 'n1', ...messageSent('Mira', null), createdAt: new Date().toISOString() },
    'Mira'
  );
  assert.equal(generic, 'Mira sent you a message.');
});

test('builders are pure: same input, same output, no clock or randomness', () => {
  for (const [name, build] of builders) {
    assert.deepEqual(build('Mira'), build('Mira'), `${name} should be deterministic`);
  }
  const src = read('src', 'lib', 'features', 'notify.ts');
  assert.ok(!src.includes('Date.now()'), 'notify.ts must not read the clock');
  assert.ok(!src.includes('Math.random()'), 'notify.ts must not use randomness');
  assert.ok(!src.includes('supabase'), 'notify.ts must stay free of the network layer');
});

// ----------------------------------------------------------------- wiring ---

test('DiaryContext raises a notification for each wired action', () => {
  const ctx = read('src', 'store', 'DiaryContext.tsx');
  for (const [name] of builders) {
    assert.ok(ctx.includes(`notify.${name}(`), `${name} should be raised from DiaryContext`);
  }
});

test('DiaryContext only notifies a shared note, never a private one', () => {
  const ctx = read('src', 'store', 'DiaryContext.tsx');
  const addNote = ctx.slice(ctx.indexOf('const addNote ='), ctx.indexOf('const toggleNoteLock ='));
  assert.ok(addNote.includes('notify.noteAdded('));
  assert.ok(
    /visibility === 'shared'[\s\S]{0,200}notify\.noteAdded\(/.test(addNote),
    'the note notification must be gated on shared visibility'
  );
});

test('notifications are addressed to the partner and never to yourself', () => {
  const ctx = read('src', 'store', 'DiaryContext.tsx');
  assert.ok(ctx.includes('recipientId: partnerUserId'));
  assert.ok(ctx.includes('actorId: currentUserId'));
  // No partner, no demo mode, no Supabase — nothing to raise.
  assert.ok(ctx.includes('if (!supabase || !partnerUserId'));
});

test('a failed notification is logged, never toasted or thrown at the caller', () => {
  const ctx = read('src', 'store', 'DiaryContext.tsx');
  const helper = ctx.slice(ctx.indexOf('const notifyPartner ='), ctx.indexOf('const addMemory ='));
  assert.ok(helper.includes('createNotificationRemote'));
  assert.ok(helper.includes('.catch('), 'the promise must never reject into the caller');
  assert.ok(!helper.includes('await '), 'the action must not wait on the notification');
  assert.ok(!helper.includes('showToast('), 'a failed notification is not the user’s problem');
});

test('the chat page previews only what the couple switched on', () => {
  const page = read('src', 'app', 'chat', 'page.tsx');
  assert.ok(page.includes('notify.messageSent('));
  assert.ok(page.includes('previewFor('));
  assert.ok(page.includes('data.couple.notificationPreviews === true'));
  assert.ok(page.includes('previewFor(content, previewsEnabled, 80)'));
});

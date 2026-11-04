import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { canSwitchProfile, accountSlot, mayEditProfile, mayRedeemCoupon } from '../src/lib/features/identity.ts';

const read = (...p) => fs.readFileSync(path.join(process.cwd(), ...p), 'utf8');

test('only demo mode can switch between partners', () => {
  assert.equal(canSwitchProfile(false, null), true, 'demo');
  assert.equal(canSwitchProfile(true, null), true, 'local-only space with no account behind it');
  assert.equal(canSwitchProfile(true, 'uid-1'), false, 'a signed-in account is one person');
});

test('an account is the partner the database says it is', () => {
  assert.equal(accountSlot(true, 'uid', 'creator'), 'user_1');
  assert.equal(accountSlot(true, 'uid', 'partner'), 'user_2');
  assert.equal(accountSlot(false, 'uid', 'partner'), null, 'demo has no fixed identity');
  assert.equal(accountSlot(true, null, 'partner'), null);
  assert.equal(accountSlot(true, 'uid', undefined), null, 'unknown role: do not guess');
});

test('you can change only your own profile, unless this is demo mode', () => {
  assert.equal(mayEditProfile(false, 'user_1', 'user_1'), true);
  assert.equal(mayEditProfile(false, 'user_2', 'user_1'), false, "a partner's photo and name are theirs");
  assert.equal(mayEditProfile(true, 'user_2', 'user_1'), true, 'demo plays both');
});

test('a coupon is for the person it was given to', () => {
  const forMaya = { toId: 'user_2', redeemed: false };
  assert.equal(mayRedeemCoupon(forMaya, 'user_2'), true);
  assert.equal(mayRedeemCoupon(forMaya, 'user_1'), false, 'the giver cannot use it for them');
  assert.equal(mayRedeemCoupon({ ...forMaya, redeemed: true }, 'user_2'), false, 'once only');
});

test('the context pins the account, locks the switch and guards on the other side', () => {
  const ctx = read('src', 'store', 'DiaryContext.tsx');
  // The switch is a no-op for an account, whatever calls it.
  assert.match(ctx, /const switchProfile = \(id: ProfileId\) => \{\s*if \(!canSwitchProfile\) return;/);
  // Identity comes from the database role, and is re-pinned after a reload.
  assert.ok(ctx.includes('accountSlotFor(isLiveUser, currentUserId, data.couple.myRole)'));
  assert.match(ctx, /prev\.activeProfileId === accountSlot \? prev : \{ \.\.\.prev, activeProfileId: accountSlot \}/);
  // The two places that could act for the other partner refuse in code, not
  // just by hiding a button.
  assert.ok(ctx.includes('!mayEditProfile(canSwitchProfile, profileId, accountSlot ?? data.activeProfileId)'));
  assert.ok(ctx.includes('!mayRedeemCoupon(targetCoupon, data.activeProfileId)'));
  assert.ok(ctx.includes('canSwitchProfile,\n'), 'exposed to the UI');
});

test('no screen offers to act as the other partner on a real account', () => {
  const nav = read('src', 'components', 'layout', 'AppNavbar.tsx');
  assert.ok(nav.includes('{canSwitchProfile ? ('), 'the top-bar switch is demo only');
  assert.equal(nav.includes('>Switch view<'), false, 'the label no longer promises a switch');

  const wyr = read('src', 'components', 'games', 'WouldYouRatherGame.tsx');
  assert.ok(wyr.includes('{canSwitchProfile ? ('), 'no voting for both on a real account');

  const quiz = read('src', 'app', 'quizzes', 'page.tsx');
  assert.ok(quiz.includes('{canSwitchProfile && ('));

  const settings = read('src', 'app', 'settings', 'page.tsx');
  assert.ok(settings.includes('<fieldset disabled={!canEditUser1}'));
  assert.ok(settings.includes('<fieldset disabled={!canEditUser2}'));
  assert.equal(settings.includes('User 1 (You)'), false, 'the joining partner was labelled as the other person');

  const coupons = read('src', 'app', 'coupons', 'page.tsx');
  assert.ok(coupons.includes('!mayRedeemCoupon(coupon, data.activeProfileId)'));

  // Every remaining caller of switchProfile is gated or demo-only.
  const callers = ['src/app/login/page.tsx', 'src/app/onboarding/page.tsx'];
  for (const file of callers) {
    const src = fs.readFileSync(file, 'utf8');
    assert.ok(src.includes('switchProfile('), `${file} no longer switches — update this test`);
  }
  // login switches only on the demo sign-in; onboarding only in no-database demo.
  assert.match(read('src', 'app', 'login', 'page.tsx'), /handleDemoSignIn[\s\S]{0,300}switchProfile\(profileId\)/);
  assert.match(read('src', 'app', 'onboarding', 'page.tsx'), /Demo mode only[\s\S]*switchProfile\('user_2'\)/);
});

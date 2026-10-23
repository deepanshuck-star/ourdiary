import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COUPLE_ONLY,
  COUPLE_ONLY_WIDGETS,
  PERSONAL_ADAPTED,
  gameAllowed,
  isPersonal,
  personalNote,
  reasonFor,
  routeAccess,
  titleFor,
  waitingCount,
  widgetAccess,
} from '../src/lib/features/spaceMode.ts';

const personal = { kind: 'personal', hasPartner: false };
const soloCouple = { kind: 'couple', hasPartner: false };
const couple = { kind: 'couple', hasPartner: true };

test('a couple diary with both seats filled changes nothing', () => {
  for (const href of [...Object.keys(COUPLE_ONLY), ...Object.keys(PERSONAL_ADAPTED), '/gallery']) {
    assert.equal(routeAccess(href, couple), 'open', `${href} should be open for a couple`);
  }
});

test('couple-only routes are hidden in a personal diary, not locked', () => {
  // Nobody is coming, so a greyed-out row with "invite your partner" on it
  // would be permanent noise.
  for (const href of Object.keys(COUPLE_ONLY)) {
    assert.equal(routeAccess(href, personal), 'hidden', `${href} should be hidden`);
  }
});

test('the same routes wait, rather than hide, in a couple diary with one person', () => {
  for (const href of Object.keys(COUPLE_ONLY)) {
    assert.equal(routeAccess(href, soloCouple), 'waiting', `${href} should be waiting`);
  }
  assert.equal(waitingCount(soloCouple), Object.keys(COUPLE_ONLY).length);
  assert.equal(waitingCount(personal), 0);
  assert.equal(waitingCount(couple), 0);
});

test('solo-capable routes are adapted in a personal diary and open elsewhere', () => {
  assert.equal(routeAccess('/letters', personal), 'adapted');
  assert.equal(routeAccess('/letters', soloCouple), 'open');
  assert.equal(routeAccess('/surprises', personal), 'adapted');
  assert.match(personalNote('/letters'), /future self/);
  assert.match(personalNote('/surprises'), /future self/);
  assert.equal(personalNote('/gallery'), null);
});

test('a route in neither list is simply open everywhere', () => {
  for (const ctx of [personal, soloCouple, couple]) {
    assert.equal(routeAccess('/gallery', ctx), 'open');
    assert.equal(routeAccess('/calendar', ctx), 'open');
    assert.equal(routeAccess('/unknown-page', ctx), 'open');
  }
});

test('nothing is hidden or locked while membership is still loading', () => {
  const pending = { kind: 'couple', hasPartner: false, loading: true };
  assert.equal(routeAccess('/chat', pending), 'open');
  assert.equal(widgetAccess('MorningMail', pending), 'open');
  assert.equal(waitingCount(pending), 0);
});

test('no route is both couple-only and adapted', () => {
  for (const href of Object.keys(PERSONAL_ADAPTED)) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(COUPLE_ONLY, href),
      false,
      `${href} cannot be both`
    );
  }
});

test('every couple-only route explains itself', () => {
  for (const [href, why] of Object.entries(COUPLE_ONLY)) {
    assert.ok(why.length > 10, `${href} needs a real reason`);
    assert.equal(reasonFor(href), why);
  }
  assert.equal(reasonFor('/gallery'), null);
});

test('partner widgets disappear in a personal diary and wait in a couple one', () => {
  for (const widget of COUPLE_ONLY_WIDGETS) {
    assert.equal(widgetAccess(widget, personal), 'hidden');
    assert.equal(widgetAccess(widget, soloCouple), 'waiting');
    assert.equal(widgetAccess(widget, couple), 'open');
  }
  assert.equal(widgetAccess('OnThisDayCard', personal), 'open');
  assert.equal(widgetAccess('MoodHistorySection', personal), 'open');
});

test('two-player games drop out of a personal diary via the registry flag', () => {
  // Driven by the registry's own `requires`, so a new two-player game is
  // covered by the flag it already has to declare.
  assert.equal(gameAllowed(['partner'], personal), false);
  assert.equal(gameAllowed(['photos'], personal), true);
  assert.equal(gameAllowed(undefined, personal), true);
  assert.equal(gameAllowed(['partner'], couple), true);
  assert.equal(gameAllowed(['partner'], soloCouple), true);
});

test('titles stop saying "our" in a diary of one', () => {
  assert.equal(titleFor('/music', personal, 'Our Soundtrack'), 'My Soundtrack');
  assert.equal(titleFor('/music', couple, 'Our Soundtrack'), 'Our Soundtrack');
  assert.equal(titleFor('/gallery', personal, 'Gallery'), 'Gallery');
});

test('trailing slashes and query strings do not change the answer', () => {
  assert.equal(routeAccess('/chat/', personal), 'hidden');
  assert.equal(routeAccess('/chat?from=nav', personal), 'hidden');
  assert.equal(routeAccess('/letters#top', personal), 'adapted');
  assert.equal(isPersonal(personal), true);
  assert.equal(isPersonal(couple), false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DRAWER_GROUPS, UNGROUPED_TITLE, groupDrawerItems, groupForPath } from '../src/lib/features/nav-groups.ts';

const root = process.cwd();
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');

/** Every destination the phone drawer offers, read from the source. */
function drawerHrefs() {
  const nav = read('src', 'components', 'layout', 'MobileNav.tsx');
  const more = nav.slice(nav.indexOf('const moreItems'), nav.indexOf('];', nav.indexOf('const moreItems')));
  const explore = read('src', 'components', 'layout', 'exploreNav.ts');
  return [...more.matchAll(/href: '([^']+)'/g), ...explore.matchAll(/href: '([^']+)'/g)].map((m) => m[1]);
}

test('every drawer destination is in exactly one group, so nothing went missing', () => {
  const hrefs = drawerHrefs();
  assert.ok(hrefs.length >= 30, `expected the full drawer, found ${hrefs.length}`);
  const grouped = DRAWER_GROUPS.flatMap((g) => g.hrefs);
  for (const href of hrefs) {
    const count = grouped.filter((h) => h === href).length;
    assert.equal(count, 1, `${href} appears in ${count} groups`);
  }
  // And no group points at a page the drawer no longer offers.
  for (const href of grouped) assert.ok(hrefs.includes(href), `group names ${href}, which the drawer does not offer`);
});

test('the drawer opens on a handful of short sections', () => {
  assert.ok(DRAWER_GROUPS.length <= 8);
  for (const g of DRAWER_GROUPS) assert.ok(g.hrefs.length >= 2 && g.hrefs.length <= 6, `${g.title} has ${g.hrefs.length}`);
});

test('a feature added later but never grouped still shows up', () => {
  const items = [{ href: '/gallery' }, { href: '/brand-new-feature' }];
  const out = groupDrawerItems(items);
  assert.deepEqual(out.map((g) => g.title), ['Memories', UNGROUPED_TITLE]);
  assert.equal(out.at(-1).items[0].href, '/brand-new-feature');
  // Groups with nothing to show are left out rather than drawn empty.
  assert.equal(groupDrawerItems([{ href: '/gallery' }]).length, 1);
});

test('the drawer opens on the section holding the current page', () => {
  assert.equal(groupForPath('/letters'), 'Little gestures');
  assert.equal(groupForPath('/world/forest'), 'Us & our world');
  assert.equal(groupForPath('/settings'), 'Settings & privacy');
  assert.equal(groupForPath('/dashboard'), null, 'a bottom-bar page opens nothing');
  assert.equal(groupForPath('/gallery-extra'), null, '"/gallery" must not match a different page that starts the same');
});

test('nothing can push the page wider than a phone', () => {
  // The toast stack was full-width plus a right inset: 400px on a 390px
  // phone, so it started 10px off the left edge and the page could be
  // dragged sideways on every screen.
  const toast = read('src', 'components', 'ui', 'ToastContainer.tsx');
  assert.ok(toast.includes('left-4 right-4 sm:left-auto'));
  assert.equal(/right-4[^"]*max-w-sm w-full/.test(toast), false);

  // A grid with only breakpoint columns gets an implicit auto column below
  // the breakpoint, which grows to its widest content. One long title
  // widened the page.
  const offenders = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (p.endsWith('.tsx') && /className="grid( gap-[0-9.]+)? (sm|md|lg|xl):grid-cols-/.test(fs.readFileSync(p, 'utf8'))) offenders.push(path.relative(root, p));
    }
  };
  walk(path.join(root, 'src'));
  assert.deepEqual(offenders, [], 'grids without a base column');

  // The safety net, with clip rather than hidden so the sticky top bar works.
  const css = read('src', 'app', 'globals.css');
  const base = css.slice(css.indexOf('@layer base'));
  assert.match(base, /html \{[^}]*overflow-x: clip;/);
  assert.match(base, /body \{[^}]*overflow-x: clip;/);
  assert.equal(/body \{[^}]*overflow-x: hidden;/.test(base), false, 'hidden would break position: sticky');
});

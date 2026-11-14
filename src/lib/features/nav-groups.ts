// How the mobile "More" drawer is grouped.
//
// Thirty destinations in one grid was a wall on a phone. They are grouped
// into seven folding sections instead, so the drawer opens on seven short
// headings and only the section you tap unfolds.
//
// Import-free so tests/nav-groups.test.mjs can load it directly. Groups name
// pages by href only; the drawer supplies each page's label and icon, so a
// page is never described in two places.

export interface DrawerGroup {
  title: string;
  hrefs: string[];
}

export const DRAWER_GROUPS: DrawerGroup[] = [
  { title: 'Memories', hrefs: ['/gallery', '/memory-book', '/globe', '/year-review', '/photo-of-the-day', '/music'] },
  { title: 'Plan together', hrefs: ['/calendar', '/date-ideas', '/spin-wheel', '/budget', '/countdowns', '/bucket-list'] },
  { title: 'Far apart', hrefs: ['/long-distance', '/trips', '/care-packages'] },
  { title: 'Little gestures', hrefs: ['/letters', '/coupons', '/surprises', '/gifts'] },
  { title: 'Talk & play', hrefs: ['/chat', '/games', '/quizzes', '/daily-spark'] },
  { title: 'Us & our world', hrefs: ['/world', '/journey', '/our-stats', '/habits', '/barsaat'] },
  { title: 'Settings & privacy', hrefs: ['/notifications', '/privacy', '/settings'] },
];

/** The title used for anything not yet placed in a group. */
export const UNGROUPED_TITLE = 'More';

/**
 * Sorts the drawer's items into their groups, in the groups' own order.
 *
 * An item that no group names is not dropped: it lands in a final group of
 * its own. A feature added to the drawer and forgotten here is still one tap
 * away, rather than silently vanishing from the phone.
 */
export function groupDrawerItems<T extends { href: string }>(
  items: T[],
  groups: DrawerGroup[] = DRAWER_GROUPS
): { title: string; items: T[] }[] {
  const byHref = new Map(items.map((item) => [item.href, item]));
  const placed = new Set<string>();
  const out: { title: string; items: T[] }[] = [];
  for (const group of groups) {
    const found: T[] = [];
    for (const href of group.hrefs) {
      const item = byHref.get(href);
      if (item && !placed.has(href)) {
        found.push(item);
        placed.add(href);
      }
    }
    if (found.length) out.push({ title: group.title, items: found });
  }
  const rest = items.filter((item) => !placed.has(item.href));
  if (rest.length) out.push({ title: UNGROUPED_TITLE, items: rest });
  return out;
}

/** The group holding the page you are on, so the drawer opens there. */
export function groupForPath(pathname: string, groups: DrawerGroup[] = DRAWER_GROUPS): string | null {
  for (const group of groups) {
    for (const href of group.hrefs) {
      if (pathname === href || pathname.startsWith(`${href}/`)) return group.title;
    }
  }
  return null;
}

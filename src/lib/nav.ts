import type { Page, Tree } from "./types";

/**
 * How a sitemap would turn into a website navbar. The first root page is Home (the logo link),
 * pages directly under it are the top bar, and deeper pages sit in dropdowns.
 */
export type NavItem = { page: Page; children: NavItem[] };

const roots = (t: Tree) => {
  const ids = new Set(t.pages.map((p) => p.id));
  return t.pages.filter((p) => !p.parentId || !ids.has(p.parentId));
};

export function buildNav(t: Tree): { home: Page | undefined; items: NavItem[] } {
  const [home, ...otherRoots] = roots(t);
  // `seen` stops a malformed tree with a parent cycle from recursing forever.
  const build = (p: Page, seen: Set<string>): NavItem => {
    const next = new Set(seen).add(p.id);
    return { page: p, children: t.pages.filter((c) => c.parentId === p.id && !next.has(c.id)).map((c) => build(c, next)) };
  };
  const top = home ? t.pages.filter((p) => p.parentId === home.id) : [];
  return { home, items: [...top, ...otherRoots].map((p) => build(p, new Set(home ? [home.id] : []))) };
}

/** Pages from Home down to `pageId`. Empty if the page isn't in the tree. */
export function pathTo(t: Tree, pageId: string): Page[] {
  const byId = new Map(t.pages.map((p) => [p.id, p]));
  const path: Page[] = [];
  const seen = new Set<string>();
  let cur = byId.get(pageId);
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    path.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return path;
}

/** The address a visitor would see, from the page slugs. Home is "/". */
export const urlPath = (path: Page[]) => "/" + path.slice(1).map((p) => p.slug).join("/");

export type NavCheck = { level: "ok" | "tip"; text: string };

const MAX_TOP = 7;
const MAX_DROPDOWN = 7;
const MAX_CLICKS = 2;
const MAX_LABEL = 24;

/** Plain-language checks on how easy the navigation is to scan and reach. */
export function navChecks(t: Tree): NavCheck[] {
  const { items } = buildNav(t);
  const tips: string[] = [];

  if (items.length > MAX_TOP) {
    tips.push(`${items.length} links across the top bar. Visitors scan 5 to 7 easily, so consider grouping some under a dropdown.`);
  }

  const labels = new Map<string, string>();
  const walk = (list: NavItem[], depth: number) => {
    for (const { page, children } of list) {
      const key = page.name.trim().toLowerCase();
      if (labels.has(key)) tips.push(`Two pages are both called "${page.name}". Visitors can't tell them apart.`);
      labels.set(key, page.name);
      if (page.name.length > MAX_LABEL) tips.push(`"${page.name}" is a long label. Short ones fit the bar and read faster.`);
      if (children.length > MAX_DROPDOWN) tips.push(`"${page.name}" has ${children.length} pages in its dropdown. Long menus are hard to scan.`);
      if (children.length === 1) tips.push(`"${page.name}" opens a dropdown with a single page. Make it a plain link, or add siblings.`);
      // Top-level links are 1 click from Home, and each dropdown level adds one.
      if (depth > MAX_CLICKS && children.length === 0) {
        tips.push(`"${page.name}" is ${depth} clicks from Home. Pages deeper than ${MAX_CLICKS} clicks are easy to miss.`);
      }
      walk(children, depth + 1);
    }
  };
  walk(items, 1);

  if (tips.length === 0) {
    const dropdowns = items.filter((i) => i.children.length > 0).length;
    return [
      {
        level: "ok",
        text: `Looks easy to scan: ${items.length} top-level link${items.length === 1 ? "" : "s"}${dropdowns ? `, ${dropdowns} with a dropdown` : ""}, nothing deeper than ${MAX_CLICKS} clicks.`,
      },
    ];
  }
  return tips.slice(0, 6).map((text) => ({ level: "tip" as const, text }));
}

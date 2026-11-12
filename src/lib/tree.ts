import type { GeneratedSitemap, Page, Section, Tree } from "./types";

export const uid = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "page"
  );
}

/** Turns model output into a tree with stable ids. First page is treated as Home. */
export function treeFromGenerated(g: GeneratedSitemap): Tree {
  const bySlug = new Map<string, string>();
  const pages: Page[] = g.pages.map((p) => {
    const id = uid();
    bySlug.set(slugify(p.slug || p.name), id);
    return {
      id,
      name: p.name.trim().slice(0, 200) || "Untitled",
      slug: slugify(p.slug || p.name),
      parentId: null,
      sections: p.sections.slice(0, 40).map((s) => ({
        id: uid(),
        type: s.type.trim().slice(0, 100) || "Section",
        description: s.description.trim().slice(0, 2000),
      })),
    };
  });
  g.pages.forEach((p, i) => {
    const parent = p.parent_slug ? bySlug.get(slugify(p.parent_slug)) : undefined;
    // A page can't parent itself; anything unresolved hangs off the first page.
    if (parent && parent !== pages[i].id) pages[i].parentId = parent;
    else if (i > 0) pages[i].parentId = pages[0].id;
  });
  return { pages };
}

const mapPages = (t: Tree, fn: (p: Page) => Page): Tree => ({ pages: t.pages.map(fn) });

export function renamePage(t: Tree, id: string, name: string): Tree {
  return mapPages(t, (p) => (p.id === id ? { ...p, name } : p));
}

export function addPage(t: Tree, parentId: string | null): Tree {
  const page: Page = {
    id: uid(),
    name: "New page",
    slug: "new-page",
    parentId,
    sections: [
      { id: uid(), type: "Navbar", description: "" },
      { id: uid(), type: "Footer", description: "" },
    ],
  };
  return { pages: [...t.pages, page] };
}

/** Deleting a page re-parents its children to the deleted page's parent. */
export function deletePage(t: Tree, id: string): Tree {
  const gone = t.pages.find((p) => p.id === id);
  if (!gone) return t;
  return {
    pages: t.pages
      .filter((p) => p.id !== id)
      .map((p) => (p.parentId === id ? { ...p, parentId: gone.parentId } : p)),
  };
}

/** Moves a page one place left/right among its siblings. */
export function movePage(t: Tree, id: string, dir: -1 | 1): Tree {
  const page = t.pages.find((p) => p.id === id);
  if (!page) return t;
  const siblings = t.pages.filter((p) => p.parentId === page.parentId);
  const i = siblings.findIndex((p) => p.id === id);
  const j = i + dir;
  if (j < 0 || j >= siblings.length) return t;
  const swapWith = siblings[j].id;
  const a = t.pages.findIndex((p) => p.id === id);
  const b = t.pages.findIndex((p) => p.id === swapWith);
  const pages = [...t.pages];
  [pages[a], pages[b]] = [pages[b], pages[a]];
  return { pages };
}

export function addSection(t: Tree, pageId: string): Tree {
  return mapPages(t, (p) => {
    if (p.id !== pageId) return p;
    const s: Section = { id: uid(), type: "Feature", description: "" };
    // Keep a trailing Footer last.
    const last = p.sections[p.sections.length - 1];
    const at = last && /^footer$/i.test(last.type) ? p.sections.length - 1 : p.sections.length;
    return { ...p, sections: [...p.sections.slice(0, at), s, ...p.sections.slice(at)] };
  });
}

export function updateSection(t: Tree, sectionId: string, patch: Partial<Pick<Section, "type" | "description">>): Tree {
  return mapPages(t, (p) => ({
    ...p,
    sections: p.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)),
  }));
}

export function deleteSection(t: Tree, sectionId: string): Tree {
  return mapPages(t, (p) => ({ ...p, sections: p.sections.filter((s) => s.id !== sectionId) }));
}

/** Moves a section (within or across pages) to sit before `beforeId`, or at the end if null. */
export function moveSection(t: Tree, sectionId: string, toPageId: string, beforeId: string | null): Tree {
  let moving: Section | undefined;
  for (const p of t.pages) {
    moving = p.sections.find((s) => s.id === sectionId);
    if (moving) break;
  }
  if (!moving || sectionId === beforeId) return t;
  const m = moving;
  return mapPages(t, (p) => {
    const without = p.sections.filter((s) => s.id !== sectionId);
    if (p.id !== toPageId) return { ...p, sections: without };
    const at = beforeId ? without.findIndex((s) => s.id === beforeId) : -1;
    const idx = at < 0 ? without.length : at;
    return { ...p, sections: [...without.slice(0, idx), m, ...without.slice(idx)] };
  });
}

/** Drops a section onto another section: lands before it, or after it when moving down within a page. */
export function moveSectionOnto(t: Tree, sectionId: string, overSectionId: string): Tree {
  const from = t.pages.find((p) => p.sections.some((s) => s.id === sectionId));
  const to = t.pages.find((p) => p.sections.some((s) => s.id === overSectionId));
  if (!from || !to || sectionId === overSectionId) return t;
  if (from.id === to.id) {
    const a = from.sections.findIndex((s) => s.id === sectionId);
    const b = from.sections.findIndex((s) => s.id === overSectionId);
    if (a < b) return moveSection(t, sectionId, to.id, to.sections[b + 1]?.id ?? null);
  }
  return moveSection(t, sectionId, to.id, overSectionId);
}

/** Where a page sits among its siblings, to disable the move buttons at either end. */
export function siblingPosition(t: Tree, id: string) {
  const page = t.pages.find((p) => p.id === id);
  const siblings = t.pages.filter((p) => p.parentId === (page?.parentId ?? null));
  return { index: siblings.findIndex((p) => p.id === id), count: siblings.length };
}

/* ---------- layout ---------- */

export const NODE_W = 300;
const GAP_X = 40;
const GAP_Y = 90;

export function estimateHeight(p: Page) {
  const body = p.sections.reduce(
    (h, s) => h + 56 + Math.max(1, Math.ceil(s.description.length / 34)) * 17,
    0,
  );
  return 64 + body + 52;
}

/** Tidy top-down tree layout. Returns top-left positions keyed by page id. */
export function layoutTree(t: Tree): Map<string, { x: number; y: number }> {
  const ids = new Set(t.pages.map((p) => p.id));
  const kids = new Map<string | null, Page[]>();
  for (const p of t.pages) {
    const key = p.parentId && ids.has(p.parentId) ? p.parentId : null;
    kids.set(key, [...(kids.get(key) ?? []), p]);
  }
  const depth = new Map<string, number>();
  const rowMax: number[] = [];
  const walk = (p: Page, d: number) => {
    depth.set(p.id, d);
    rowMax[d] = Math.max(rowMax[d] ?? 0, estimateHeight(p));
    (kids.get(p.id) ?? []).forEach((c) => walk(c, d + 1));
  };
  (kids.get(null) ?? []).forEach((r) => walk(r, 0));

  const rowTop: number[] = [];
  rowMax.forEach((h, i) => (rowTop[i] = i === 0 ? 0 : rowTop[i - 1] + rowMax[i - 1] + GAP_Y));

  const pos = new Map<string, { x: number; y: number }>();
  let cursor = 0;
  const place = (p: Page): number => {
    const children = kids.get(p.id) ?? [];
    let x: number;
    if (children.length === 0) {
      x = cursor;
      cursor += NODE_W + GAP_X;
    } else {
      const xs = children.map(place);
      x = (xs[0] + xs[xs.length - 1]) / 2;
    }
    pos.set(p.id, { x, y: rowTop[depth.get(p.id) ?? 0] ?? 0 });
    return x;
  };
  (kids.get(null) ?? []).forEach(place);
  return pos;
}

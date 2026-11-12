"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { buildNav, navChecks, pathTo, urlPath, type NavItem } from "@/lib/nav";
import type { Page, Tree } from "@/lib/types";
import { IconButton } from "./ui/button";
import { ChevronDownIcon, CloseIcon } from "./ui/icons";

type Props = {
  tree: Tree;
  siteName: string;
  /** The page last clicked in the preview. It is highlighted on the canvas. */
  currentId: string | null;
  onSelect: (pageId: string) => void;
  onClose: () => void;
};

type BarProps = {
  home: Page | undefined;
  items: NavItem[];
  trail: Set<string>;
  siteName: string;
  onPick: (id: string) => void;
};

const linkBase =
  "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-900";

/** The ancestors of the current page stay underlined, as on most real sites. */
const linkTone = (active: boolean) =>
  active ? "font-medium text-neutral-900 underline decoration-amber-400 decoration-2 underline-offset-[6px]" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900";

function SubList({ items, trail, onPick, depth = 0 }: { items: NavItem[]; trail: Set<string>; onPick: (id: string) => void; depth?: number }) {
  return (
    <ul role="none">
      {items.map((c) => (
        <li key={c.page.id} role="none">
          <button
            type="button"
            role="menuitem"
            onClick={() => onPick(c.page.id)}
            style={{ paddingLeft: 10 + depth * 14 }}
            className={clsx("block w-full rounded-md py-1.5 pr-3 text-left text-sm transition-colors hover:bg-neutral-100", trail.has(c.page.id) ? "font-medium text-neutral-900" : "text-neutral-600")}
          >
            {depth > 0 && <span aria-hidden className="mr-1.5 text-neutral-400">–</span>}
            {c.page.name}
          </button>
          {c.children.length > 0 && <SubList items={c.children} trail={trail} onPick={onPick} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}

function DesktopBar({ home, items, trail, siteName, onPick }: BarProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const pick = (id: string) => {
    setOpenId(null);
    onPick(id);
  };
  return (
    <nav aria-label="Navigation preview" className="flex items-center gap-3 px-4 py-2.5">
      <button
        type="button"
        onClick={() => home && pick(home.id)}
        className="max-w-[10rem] shrink-0 truncate rounded-md px-1 text-sm font-semibold text-neutral-900 focus-visible:outline-2 focus-visible:outline-neutral-900"
        title="The logo links to Home"
      >
        {siteName}
      </button>
      <ul className="ml-auto flex flex-wrap items-center justify-end gap-0.5">
        {items.map((item) => {
          const hasMenu = item.children.length > 0;
          const open = openId === item.page.id;
          return (
            <li
              key={item.page.id}
              className="relative"
              onMouseEnter={() => hasMenu && setOpenId(item.page.id)}
              onMouseLeave={() => setOpenId(null)}
              onKeyDown={(e) => e.key === "Escape" && setOpenId(null)}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpenId(null);
              }}
            >
              <button
                type="button"
                aria-haspopup={hasMenu ? "menu" : undefined}
                aria-expanded={hasMenu ? open : undefined}
                onClick={() => (hasMenu ? setOpenId(open ? null : item.page.id) : pick(item.page.id))}
                className={clsx(linkBase, linkTone(trail.has(item.page.id)))}
              >
                {item.page.name}
                {hasMenu && <ChevronDownIcon width={12} height={12} className={clsx("transition-transform", open && "rotate-180")} />}
              </button>
              {hasMenu && open && (
                <div role="menu" className="absolute right-0 top-full z-10 mt-0.5 min-w-52 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => pick(item.page.id)}
                    className="block w-full rounded-md px-2.5 py-1.5 text-left text-sm font-medium text-neutral-900 hover:bg-neutral-100"
                  >
                    {item.page.name} overview
                  </button>
                  <div className="my-1 h-px bg-neutral-200" />
                  <SubList items={item.children} trail={trail} onPick={pick} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function PhoneBar({ home, items, trail, siteName, onPick }: BarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const pick = (id: string) => {
    setMenuOpen(false);
    onPick(id);
  };
  return (
    <nav aria-label="Navigation preview (phone)">
      <div className="flex items-center justify-between px-3 py-2.5">
        <button type="button" onClick={() => home && pick(home.id)} className="max-w-[10rem] truncate text-sm font-semibold text-neutral-900">
          {siteName}
        </button>
        <button
          type="button"
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-neutral-900"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {menuOpen ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
      {menuOpen && (
        <ul className="rounded-b-lg border-t border-neutral-200 bg-white py-1">
          {items.map((item) => {
            const hasMenu = item.children.length > 0;
            const open = expanded === item.page.id;
            return (
              <li key={item.page.id}>
                <button
                  type="button"
                  aria-expanded={hasMenu ? open : undefined}
                  onClick={() => (hasMenu ? setExpanded(open ? null : item.page.id) : pick(item.page.id))}
                  className={clsx("flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-50", trail.has(item.page.id) ? "font-medium text-neutral-900" : "text-neutral-700")}
                >
                  {item.page.name}
                  {hasMenu && <ChevronDownIcon width={14} height={14} className={clsx("transition-transform", open && "rotate-180")} />}
                </button>
                {hasMenu && open && (
                  <div className="bg-neutral-50 pb-1">
                    <button type="button" onClick={() => pick(item.page.id)} className="block w-full px-5 py-1.5 text-left text-sm font-medium text-neutral-900">
                      {item.page.name} overview
                    </button>
                    <SubListPhone items={item.children} trail={trail} onPick={pick} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}

function SubListPhone({ items, trail, onPick, depth = 1 }: { items: NavItem[]; trail: Set<string>; onPick: (id: string) => void; depth?: number }) {
  return (
    <ul>
      {items.map((c) => (
        <li key={c.page.id}>
          <button
            type="button"
            onClick={() => onPick(c.page.id)}
            style={{ paddingLeft: 12 + depth * 12 }}
            className={clsx("block w-full py-1.5 pr-3 text-left text-sm", trail.has(c.page.id) ? "font-medium text-neutral-900" : "text-neutral-600")}
          >
            {c.page.name}
          </button>
          {c.children.length > 0 && <SubListPhone items={c.children} trail={trail} onPick={onPick} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}

/** A mock website header built from the sitemap, so the structure can be tried before anything is designed. */
export default function NavPreview({ tree, siteName, currentId, onSelect, onClose }: Props) {
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  const nav = useMemo(() => buildNav(tree), [tree]);
  const checks = useMemo(() => navChecks(tree), [tree]);
  const path = useMemo(() => (currentId ? pathTo(tree, currentId) : []), [tree, currentId]);
  const trail = useMemo(() => new Set(path.map((p) => p.id)), [path]);
  const clicks = Math.max(0, path.length - 1);

  const bar = { home: nav.home, items: nav.items, trail, siteName, onPick: onSelect };

  return (
    <section aria-label="Navigation preview" className="max-h-[46vh] overflow-y-auto border-b border-neutral-200 bg-neutral-50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-neutral-900">Navigation preview</h2>
          <p className="text-xs text-neutral-500">Built from your sitemap: pages under Home form the top bar, deeper pages sit in dropdowns. Click around like a visitor would.</p>
        </div>
        <div role="group" aria-label="Preview size" className="flex rounded-md border border-neutral-300 bg-white p-0.5 text-xs">
          {(["desktop", "phone"] as const).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={device === d}
              onClick={() => setDevice(d)}
              className={clsx("rounded px-2.5 py-1 capitalize", device === d ? "bg-neutral-900 text-white" : "text-neutral-600 hover:text-neutral-900")}
            >
              {d}
            </button>
          ))}
        </div>
        <IconButton label="Hide preview" ariaLabel="Hide navigation preview" side="left" onClick={onClose}>
          <CloseIcon width={14} height={14} />
        </IconButton>
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className={clsx("min-w-0", device === "phone" && "flex justify-center")}>
          <div className={clsx("overflow-visible rounded-lg border border-neutral-300 bg-white shadow-sm", device === "phone" ? "w-[300px]" : "w-full")}>
            <div className="flex items-center gap-2 rounded-t-lg border-b border-neutral-200 bg-neutral-100 px-3 py-1.5">
              <span aria-hidden className="flex gap-1">
                <i className="h-2 w-2 rounded-full bg-neutral-300" />
                <i className="h-2 w-2 rounded-full bg-neutral-300" />
                <i className="h-2 w-2 rounded-full bg-neutral-300" />
              </span>
              <span className="min-w-0 flex-1 truncate rounded bg-white px-2.5 py-0.5 text-center text-[11px] text-neutral-500">
                yoursite.com.au{path.length ? urlPath(path) : "/"}
              </span>
            </div>
            {nav.items.length === 0 ? (
              <p className="px-4 py-5 text-sm text-neutral-500">Add pages under Home to see them in the navigation.</p>
            ) : device === "desktop" ? (
              <DesktopBar {...bar} />
            ) : (
              <PhoneBar {...bar} />
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-3 text-sm">
          <div>
            <h3 className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">You are here</h3>
            {path.length > 0 ? (
              <>
                <ol aria-label="Breadcrumb" className="mt-1 flex flex-wrap items-center gap-x-1">
                  {path.map((p, i) => (
                    <li key={p.id} className="flex items-center gap-1">
                      {i > 0 && <span aria-hidden className="text-neutral-400">›</span>}
                      <button
                        type="button"
                        onClick={() => onSelect(p.id)}
                        className={clsx("rounded", i === path.length - 1 ? "font-semibold text-neutral-900" : "text-neutral-600 underline-offset-2 hover:underline")}
                      >
                        {p.name}
                      </button>
                    </li>
                  ))}
                </ol>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {clicks === 0 ? "This is Home." : `${clicks} click${clicks === 1 ? "" : "s"} from Home.`} The page is highlighted on the canvas.
                </p>
              </>
            ) : (
              <p className="mt-1 text-xs text-neutral-500">Click a link in the bar to see the path a visitor takes.</p>
            )}
          </div>
          <div>
            <h3 className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Is it easy to use?</h3>
            <ul className="mt-1 space-y-1.5">
              {checks.map((c, i) => (
                <li key={i} className="flex gap-2 text-xs leading-snug text-neutral-700">
                  <span aria-hidden className={clsx("mt-px shrink-0 font-semibold", c.level === "ok" ? "text-emerald-700" : "text-amber-700")}>
                    {c.level === "ok" ? "✓" : "!"}
                  </span>
                  <span>
                    <span className="sr-only">{c.level === "ok" ? "Good: " : "Tip: "}</span>
                    {c.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

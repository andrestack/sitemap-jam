"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type MouseEvent, type ReactNode } from "react";
import { Menu } from "@base-ui/react/menu";
import { Popover } from "@base-ui/react/popover";
import Logo from "./Logo";
import { Button } from "./ui/button";
import { ChevronDownIcon, PlusIcon } from "./ui/icons";
import { createClient } from "@/lib/supabase/browser";
import { APP_NAME } from "@/lib/brand";
import type { ProjectSummary } from "@/lib/types";

type Props = {
  projects: ProjectSummary[];
  userEmail: string | null;
  /** Where "New sitemap" and the logo lead. */
  homePath?: string;
  projectHref?: (id: string) => string;
  /** When set, "New sitemap" resets the workspace in place instead of navigating. */
  onNewSitemap?: () => void;
  currentId?: string;
  /** Shown after the logo, e.g. the project name. */
  title?: ReactNode;
  /** Right-hand controls (save status, Share). */
  children?: ReactNode;
};

const menuItem =
  "flex cursor-default select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-neutral-700 outline-none data-highlighted:bg-neutral-100 data-highlighted:text-neutral-900";

export default function AppBar({
  projects,
  userEmail,
  homePath = "/",
  projectHref = (id) => `/p/${id}`,
  onNewSitemap,
  currentId,
  title,
  children,
}: Props) {
  const [open, setOpen] = useState(false);

  // A plain click resets in place; modified clicks (new tab, etc.) keep their normal behaviour.
  const goNew = (e: MouseEvent) => {
    setOpen(false);
    if (!onNewSitemap || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onNewSitemap();
  };

  const router = useRouter();
  const signOut = async () => {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  return (
    <header className="relative z-20 flex items-center gap-2 border-b border-neutral-200 bg-white px-3 py-2 sm:gap-3 sm:px-4">
      <Link
        href={homePath}
        onClick={goNew}
        aria-label={`${APP_NAME}: new sitemap`}
        className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
      >
        <Logo size={30} compact />
      </Link>

      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger render={<Button variant="ghost" size="sm" />}>
          Projects <ChevronDownIcon width={14} height={14} />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner side="bottom" align="start" sideOffset={8} className="z-40">
            <Popover.Popup className="w-72 max-w-[calc(100vw-2rem)] origin-[var(--transform-origin)] rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl outline-none transition-[opacity,scale] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
              <Popover.Title className="sr-only">Your sitemaps</Popover.Title>
              <Link
                href={homePath}
                onClick={goNew}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-neutral-900"
              >
                <PlusIcon width={14} height={14} /> New sitemap
              </Link>
              <div className="my-1 h-px bg-neutral-200" />
              <ul className="max-h-72 overflow-y-auto">
                {projects.length === 0 && <li className="px-2.5 py-2 text-sm text-neutral-500">Nothing here yet.</li>}
                {projects.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={projectHref(p.id)}
                      aria-current={p.id === currentId ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      className="flex items-baseline justify-between gap-3 rounded-lg px-2.5 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900 aria-[current=page]:bg-amber-100 aria-[current=page]:text-neutral-900 focus-visible:outline-2 focus-visible:outline-neutral-900"
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="shrink-0 text-xs text-neutral-500">
                        {new Date(p.updated_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>

      {title ? (
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span aria-hidden className="h-5 w-px bg-neutral-200" />
          {title}
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {children}

      {userEmail && (
        <Menu.Root>
          <Menu.Trigger
            aria-label="Account"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold uppercase text-white transition-colors hover:bg-neutral-700 data-popup-open:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
          >
            {userEmail.charAt(0)}
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner side="bottom" align="end" sideOffset={8} className="z-50 outline-none">
              <Menu.Popup className="min-w-56 max-w-[calc(100vw-2rem)] origin-[var(--transform-origin)] rounded-lg border border-neutral-200 bg-white p-1 shadow-lg outline-none transition-[opacity,scale] duration-100 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
                <div className="px-2.5 py-1.5 text-xs text-neutral-500">
                  Signed in as
                  <div className="break-all text-sm text-neutral-900">{userEmail}</div>
                </div>
                <Menu.Separator className="my-1 h-px bg-neutral-200" />
                <Menu.Item className={menuItem} onClick={signOut}>
                  Sign out
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      )}
    </header>
  );
}

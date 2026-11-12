"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import SitemapCanvas from "@/components/SitemapCanvas";
import CommentPanel from "@/components/CommentPanel";
import NavPreview from "@/components/NavPreview";
import { Button } from "@/components/ui/button";
import { NavIcon } from "@/components/ui/icons";
import type { CommentRow, CommentTarget, Tree } from "@/lib/types";

// An invented business, so the demo works with no database and no real client data.
let n = 0;
const s = (type: string, description: string) => ({ id: `demo-s${++n}`, type, description });
const home = "demo-home";
const services = "demo-menu";
const about = "demo-story";
const contact = "demo-find";
const breakfast = "demo-breakfast";
const lunch = "demo-lunch";
const catering = "demo-catering";
const FIXTURE: Tree = {
  pages: [
    {
      id: home, name: "Home", slug: "home", parentId: null,
      sections: [
        s("Navbar", "Logo, main links and a Book a table button."),
        s("Hero Header", "Headline about slow-roasted coffee and breakfast all day, with a photo of the shopfront and a primary button to the menu."),
        s("Features List", "Three highlights: house-roasted beans, local produce, dog-friendly courtyard."),
        s("Testimonial", "One short customer quote about the weekend brunch."),
        s("CTA", "Invite visitors to book for groups of six or more."),
        s("Footer", "Address, opening hours, social links and newsletter sign-up."),
      ],
    },
    {
      id: services, name: "Menu", slug: "menu", parentId: home,
      sections: [
        s("Navbar", ""),
        s("Header", "Page title and a short note on dietary options."),
        s("Feature", "Breakfast menu grouped by category."),
        s("Feature", "Lunch menu and daily specials."),
        s("FAQ", "Allergens, takeaway and catering questions."),
        s("Footer", ""),
      ],
    },
    {
      id: breakfast, name: "Breakfast", slug: "breakfast", parentId: services,
      sections: [s("Navbar", ""), s("Header", "All-day breakfast, from the classics to the weekend specials."), s("Footer", "")],
    },
    {
      id: lunch, name: "Lunch & specials", slug: "lunch", parentId: services,
      sections: [s("Navbar", ""), s("Header", "Lunch menu and the daily blackboard specials."), s("Footer", "")],
    },
    {
      id: catering, name: "Catering", slug: "catering", parentId: services,
      sections: [s("Navbar", ""), s("Header", "Platters and office catering."), s("Contact", "Enquiry form."), s("Footer", "")],
    },
    {
      id: about, name: "Our story", slug: "our-story", parentId: home,
      sections: [
        s("Navbar", ""),
        s("Header", "Warm introduction to the owners and the neighbourhood."),
        s("Team", "Short profiles of the roaster, head chef and front-of-house lead."),
        s("Gallery", "Behind-the-scenes photos of roasting and prep."),
        s("Footer", ""),
      ],
    },
    {
      id: contact, name: "Find us", slug: "find-us", parentId: home,
      sections: [
        s("Navbar", ""),
        s("Contact", "Map, parking notes, phone number and a booking enquiry form."),
        s("Footer", ""),
      ],
    },
  ],
};

function Demo() {
  const [tree, setTree] = useState<Tree>(FIXTURE);
  const [comments, setComments] = useState<CommentRow[]>([
    {
      id: "00000000-0000-4000-8000-000000000001", project_id: "demo", page_id: home, section_id: FIXTURE.pages[0].sections[1].id,
      parent_id: null, author_name: "Sam (client)", body: "Can the hero mention the courtyard too?",
      by_owner: false, resolved: false, created_at: "2026-11-12T09:30:00.000Z",
    },
  ]);
  const [target, setTarget] = useState<CommentTarget | null>(null);
  const [mode, setMode] = useState<"edit" | "view">("edit");
  const [author, setAuthor] = useState("");
  const [showNav, setShowNav] = useState(false);
  const [focus, setFocus] = useState<{ id: string; tick: number } | null>(null);

  const post = async (body: string, parentId: string | null) => {
    if (!target) return "Pick a page or section first.";
    setComments((c) => [
      ...c,
      {
        id: crypto.randomUUID(), project_id: "demo", page_id: target.pageId, section_id: target.sectionId,
        parent_id: parentId, author_name: mode === "edit" ? "Studio" : author, body,
        by_owner: mode === "edit", resolved: false, created_at: new Date().toISOString(),
      },
    ]);
    return null;
  };

  return (
    <div className="flex h-dvh flex-col bg-neutral-100">
      <header className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-2.5">
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">← Home</Link>
        <h1 className="flex-1 truncate text-base font-semibold text-neutral-900">Demo: Wattle &amp; Fern Café (nothing is saved)</h1>
        <Button
          variant="secondary"
          size="sm"
          aria-pressed={showNav}
          onClick={() => {
            setShowNav((v) => !v);
            setFocus(null);
          }}
        >
          <NavIcon width={14} height={14} /> Navigation
        </Button>
        <div className="flex rounded-md border border-neutral-300 p-0.5 text-xs">
          {(["edit", "view"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`rounded px-2.5 py-1 ${mode === m ? "bg-neutral-900 text-white" : "text-neutral-600"}`}>
              {m === "edit" ? "Owner view" : "Client view"}
            </button>
          ))}
        </div>
      </header>
      {showNav && (
        <NavPreview
          tree={tree}
          siteName="Wattle & Fern"
          currentId={focus?.id ?? null}
          onSelect={(id) => setFocus((f) => ({ id, tick: (f?.tick ?? 0) + 1 }))}
          onClose={() => {
            setShowNav(false);
            setFocus(null);
          }}
        />
      )}
      <div className="relative flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <SitemapCanvas tree={tree} mode={mode} comments={comments} activeTarget={target} focus={focus} onChange={setTree} onOpenComments={setTarget} />
        </div>
        {target && (
          <CommentPanel
            target={target} tree={tree} comments={comments} isOwner={mode === "edit"}
            authorName={author} onAuthorName={setAuthor} onPost={post}
            onResolve={(id, resolved) => setComments((c) => c.map((x) => (x.id === id ? { ...x, resolved } : x)))}
            onDelete={(id) => setComments((c) => c.filter((x) => x.id !== id && x.parent_id !== id))}
            onClose={() => setTarget(null)}
          />
        )}
      </div>
    </div>
  );
}

export default function DemoPage() {
  return (
    <Suspense fallback={<div className="grid h-dvh place-items-center text-sm text-neutral-500">Loading…</div>}>
      <Demo />
    </Suspense>
  );
}

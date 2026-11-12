"use client";

import { useEffect, useState } from "react";
import SitemapCanvas from "./SitemapCanvas";
import CommentPanel from "./CommentPanel";
import type { CommentRow, CommentTarget, Tree } from "@/lib/types";

const NAME_KEY = "sitemap-commenter-name";

export default function SharedView({
  token,
  name,
  tree,
  initialComments,
}: {
  token: string;
  name: string;
  tree: Tree;
  initialComments: CommentRow[];
}) {
  const [comments, setComments] = useState(initialComments);
  const [target, setTarget] = useState<CommentTarget | null>(null);
  // The name field only renders after a click, so reading storage here can't cause a hydration mismatch.
  const [author, setAuthor] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const rememberName = (n: string) => {
    setAuthor(n);
    try {
      localStorage.setItem(NAME_KEY, n);
    } catch {}
  };

  useEffect(() => {
    const t = setInterval(async () => {
      const res = await fetch(`/api/share/${token}/comments`, { cache: "no-store" }).catch(() => null);
      if (res?.ok) setComments((await res.json()).comments);
    }, 15000);
    return () => clearInterval(t);
  }, [token]);

  const post = async (body: string, parentId: string | null): Promise<string | null> => {
    if (!target) return "Pick a page or section first.";
    const res = await fetch(`/api/share/${token}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ authorName: author, body, pageId: target.pageId, sectionId: target.sectionId, parentId }),
    }).catch(() => null);
    if (!res) return "Couldn't reach the server. Check your connection and try again.";
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return json.error ?? "Something went wrong.";
    setComments((c) => [...c, json.comment]);
    return null;
  };

  return (
    <div className="flex h-dvh flex-col bg-neutral-100">
      <header className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-2.5">
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-900">{name}</h1>
        <p className="hidden text-xs text-neutral-500 sm:block">Click the speech bubble on any page or section to leave a comment.</p>
      </header>
      <div className="relative flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <SitemapCanvas tree={tree} mode="view" comments={comments} activeTarget={target} onOpenComments={setTarget} />
        </div>
        {target && (
          <div className="absolute inset-y-0 right-0 z-20 flex w-full sm:static sm:w-auto">
            <CommentPanel
              target={target}
              tree={tree}
              comments={comments}
              isOwner={false}
              authorName={author}
              onAuthorName={rememberName}
              onPost={post}
              onClose={() => setTarget(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

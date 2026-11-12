"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import SitemapCanvas from "./SitemapCanvas";
import CommentPanel from "./CommentPanel";
import { createClient } from "@/lib/supabase/browser";
import type { CommentRow, CommentTarget, Tree } from "@/lib/types";

type Project = { id: string; name: string; tree: Tree; share_token: string; share_enabled: boolean };
type SaveState = "saved" | "saving" | "error";

const OWNER_NAME = process.env.NEXT_PUBLIC_OWNER_NAME || "Studio";
const COLUMNS = "id, project_id, page_id, section_id, parent_id, author_name, body, by_owner, resolved, created_at";

const randomToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");

export default function Editor({ project, initialComments }: { project: Project; initialComments: CommentRow[] }) {
  const [supabase] = useState(() => createClient());
  const [tree, setTree] = useState<Tree>(project.tree);
  const [save, setSave] = useState<SaveState>("saved");
  const [comments, setComments] = useState<CommentRow[]>(initialComments);
  const [target, setTarget] = useState<CommentTarget | null>(null);
  const [share, setShare] = useState({ token: project.share_token, enabled: project.share_enabled });
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Debounced autosave of the whole tree.
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(project.tree);

  // One save at a time, always sending the newest tree, so a slow earlier save can't land last.
  const saving = useRef(false);
  const flush = useCallback(async () => {
    if (saving.current) return;
    saving.current = true;
    try {
      while (dirty.current) {
        dirty.current = false;
        setSave("saving");
        const { error } = await supabase.from("projects").update({ tree: latest.current }).eq("id", project.id);
        if (error) {
          dirty.current = true;
          setSave("error");
          return;
        }
      }
      setSave("saved");
    } finally {
      saving.current = false;
    }
  }, [supabase, project.id]);

  const onChange = (t: Tree) => {
    setTree(t);
    latest.current = t;
    dirty.current = true;
    setSave("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 800);
  };

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  // Pick up new client comments without needing realtime.
  useEffect(() => {
    const t = setInterval(async () => {
      const { data } = await supabase.from("comments").select(COLUMNS).eq("project_id", project.id).order("created_at");
      if (data) setComments(data as CommentRow[]);
    }, 15000);
    return () => clearInterval(t);
  }, [supabase, project.id]);

  const post = async (body: string, parentId: string | null): Promise<string | null> => {
    if (!target) return "Pick a page or section first.";
    const { data, error } = await supabase
      .from("comments")
      .insert({
        project_id: project.id,
        page_id: target.pageId,
        section_id: target.sectionId,
        parent_id: parentId,
        author_name: OWNER_NAME,
        body,
        by_owner: true,
      })
      .select(COLUMNS)
      .single();
    if (error) return error.message;
    setComments((c) => [...c, data as CommentRow]);
    return null;
  };

  const resolve = async (id: string, resolved: boolean) => {
    setComments((c) => c.map((x) => (x.id === id ? { ...x, resolved } : x)));
    await supabase.from("comments").update({ resolved }).eq("id", id);
  };
  const remove = async (id: string) => {
    setComments((c) => c.filter((x) => x.id !== id && x.parent_id !== id));
    await supabase.from("comments").delete().eq("id", id);
  };

  const updateShare = async (patch: { share_token?: string; share_enabled?: boolean }) => {
    const { error } = await supabase.from("projects").update(patch).eq("id", project.id);
    if (!error) setShare((s) => ({ token: patch.share_token ?? s.token, enabled: patch.share_enabled ?? s.enabled }));
  };

  const link = typeof window === "undefined" ? "" : `${window.location.origin}/s/${share.token}`;
  const openCount = comments.filter((c) => !c.parent_id && !c.resolved).length;

  return (
    <div className="flex h-dvh flex-col bg-neutral-100">
      <header className="relative z-10 flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-2.5">
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">← Projects</Link>
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-900">{project.name}</h1>
        <span className={`text-xs ${save === "error" ? "text-red-600" : "text-neutral-400"}`} aria-live="polite">
          {save === "saving" ? "Saving…" : save === "error" ? "Couldn't save. Retrying on next edit." : "Saved"}
        </span>
        {openCount > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">{openCount} open</span>
        )}
        <button
          type="button"
          onClick={() => setShareOpen((v) => !v)}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Share
        </button>
        {shareOpen && (
          <div className="absolute right-4 top-full mt-2 w-[26rem] max-w-[calc(100vw-2rem)] rounded-lg border border-neutral-200 bg-white p-4 shadow-lg">
            <p className="text-sm font-medium text-neutral-900">Client link</p>
            <p className="mt-0.5 text-xs text-neutral-500">Anyone with this link can view the sitemap and leave comments. They can&apos;t edit it.</p>
            <div className="mt-3 flex gap-2">
              <input readOnly value={share.enabled ? link : "Link is turned off"} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-neutral-50 px-2.5 py-1.5 text-xs" aria-label="Share link" />
              <button
                type="button"
                disabled={!share.enabled}
                onClick={async () => {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50 disabled:opacity-40"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 text-neutral-700">
                <input type="checkbox" checked={share.enabled} onChange={(e) => updateShare({ share_enabled: e.target.checked })} />
                Link active
              </label>
              <button
                type="button"
                onClick={() => window.confirm("Create a new link? The old link will stop working.") && updateShare({ share_token: randomToken() })}
                className="text-neutral-500 hover:text-neutral-900"
              >
                Make a new link
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <SitemapCanvas tree={tree} mode="edit" comments={comments} activeTarget={target} onChange={onChange} onOpenComments={setTarget} />
        </div>
        {target && (
          <CommentPanel
            target={target}
            tree={tree}
            comments={comments}
            isOwner
            authorName={OWNER_NAME}
            onAuthorName={() => {}}
            onPost={post}
            onResolve={resolve}
            onDelete={remove}
            onClose={() => setTarget(null)}
          />
        )}
      </div>
    </div>
  );
}

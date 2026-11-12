"use client";

import { useMemo, useState } from "react";
import type { CommentRow, CommentTarget, Tree } from "@/lib/types";
import { Button, IconButton } from "./ui/button";
import { useConfirm } from "./ui/confirm";
import { CloseIcon } from "./ui/icons";

type Props = {
  target: CommentTarget;
  tree: Tree;
  comments: CommentRow[];
  /** Owner can resolve/delete; clients can only add. */
  isOwner: boolean;
  authorName: string;
  onAuthorName: (n: string) => void;
  onPost: (body: string, parentId: string | null) => Promise<string | null>;
  onResolve?: (id: string, resolved: boolean) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default function CommentPanel(p: Props) {
  // A section's comments follow it between pages, so find it wherever it currently lives.
  const sectionPage = p.target.sectionId ? p.tree.pages.find((x) => x.sections.some((s) => s.id === p.target.sectionId)) : undefined;
  const section = sectionPage?.sections.find((s) => s.id === p.target.sectionId);
  const page = sectionPage ?? p.tree.pages.find((x) => x.id === p.target.pageId);
  const label = section ? `${page?.name} · ${section.type}` : p.target.sectionId ? "Removed section" : (page?.name ?? "Removed page");

  const threads = useMemo(() => {
    const here = p.comments.filter((c) =>
      p.target.sectionId ? c.section_id === p.target.sectionId : c.page_id === p.target.pageId && !c.section_id,
    );
    return here
      .filter((c) => !c.parent_id)
      .map((c) => ({ root: c, replies: here.filter((r) => r.parent_id === c.id) }));
  }, [p.comments, p.target]);

  return (
    <aside className="flex h-full w-full flex-col border-l border-neutral-200 bg-white sm:w-96" aria-label="Comments">
      <header className="flex items-start justify-between gap-2 border-b border-neutral-200 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Comments</p>
          <h2 className="truncate text-base font-semibold text-neutral-900">{label}</h2>
        </div>
        <IconButton label="Close" ariaLabel="Close comments" side="left" onClick={p.onClose}>
          <CloseIcon width={14} height={14} />
        </IconButton>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
        {threads.length === 0 && <p className="text-sm text-neutral-500">No comments here yet.</p>}
        {threads.map(({ root, replies }) => (
          <Thread key={root.id} root={root} replies={replies} {...p} />
        ))}
      </div>

      <NewComment
        key={`${p.target.pageId}:${p.target.sectionId}`}
        authorName={p.authorName}
        onAuthorName={p.onAuthorName}
        showName={!p.isOwner}
        placeholder="Add a comment…"
        submitLabel="Comment"
        onPost={(body) => p.onPost(body, null)}
      />
    </aside>
  );
}

function Thread({ root, replies, ...p }: { root: CommentRow; replies: CommentRow[] } & Props) {
  const [replying, setReplying] = useState(false);
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${root.resolved ? "border-neutral-100 bg-neutral-50 opacity-70" : "border-neutral-200"}`}>
      <Entry c={root} {...p} />
      {replies.map((r) => (
        <div key={r.id} className="mt-2 border-l-2 border-neutral-200 pl-3">
          <Entry c={r} {...p} />
        </div>
      ))}
      <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
        {!root.resolved && (
          <button type="button" onClick={() => setReplying((v) => !v)} className="hover:text-neutral-900">
            Reply
          </button>
        )}
        {p.isOwner && p.onResolve && (
          <button type="button" onClick={() => p.onResolve!(root.id, !root.resolved)} className="hover:text-neutral-900">
            {root.resolved ? "Reopen" : "Resolve"}
          </button>
        )}
        {root.resolved && <span className="text-emerald-700">Resolved</span>}
      </div>
      {replying && (
        <div className="mt-2">
          <NewComment
            authorName={p.authorName}
            onAuthorName={p.onAuthorName}
            showName={!p.isOwner}
            placeholder="Write a reply…"
            submitLabel="Reply"
            compact
            onPost={async (body) => {
              const err = await p.onPost(body, root.id);
              if (!err) setReplying(false);
              return err;
            }}
          />
        </div>
      )}
    </div>
  );
}

function Entry({ c, ...p }: { c: CommentRow } & Props) {
  const confirm = useConfirm();
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-medium text-neutral-900">{c.author_name}</span>
        {c.by_owner && <span className="rounded bg-neutral-900 px-1 text-[10px] font-medium text-white">Team</span>}
        <span className="text-[11px] text-neutral-500">{when(c.created_at)}</span>
        {p.isOwner && p.onDelete && (
          <button
            type="button"
            aria-label="Delete comment"
            onClick={async () => {
              if (await confirm({ title: "Delete this comment?", description: "This can't be undone.", confirmLabel: "Delete", destructive: true })) p.onDelete!(c.id);
            }}
            className="ml-auto rounded text-xs text-neutral-500 transition-colors hover:text-red-600 focus-visible:text-red-600 focus-visible:outline-2 focus-visible:outline-neutral-900"
          >
            Delete
          </button>
        )}
      </div>
      <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-neutral-700">{c.body}</p>
    </div>
  );
}

function NewComment(p: {
  authorName: string;
  onAuthorName: (n: string) => void;
  showName: boolean;
  placeholder: string;
  submitLabel: string;
  compact?: boolean;
  onPost: (body: string) => Promise<string | null>;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    if (p.showName && !p.authorName.trim()) return setError("Add your name so we know who commented.");
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    const err = await p.onPost(body.trim());
    setBusy(false);
    if (err) setError(err);
    else setBody("");
  };

  return (
    <div className={p.compact ? "space-y-1.5" : "space-y-2 border-t border-neutral-200 px-4 py-3"}>
      {p.showName && (
        <input
          value={p.authorName}
          onChange={(e) => p.onAuthorName(e.target.value)}
          placeholder="Your name"
          maxLength={80}
          aria-label="Your name"
          className="w-full rounded-md border border-neutral-400 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-900"
        />
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
        }}
        maxLength={2000}
        rows={p.compact ? 2 : 3}
        placeholder={p.placeholder}
        aria-label="Comment"
        className="w-full resize-none rounded-md border border-neutral-400 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-900"
      />
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      <Button variant="primary" size={p.compact ? "sm" : "md"} disabled={busy || !body.trim()} onClick={submit}>
        {busy ? "Sending…" : p.submitLabel}
      </Button>
    </div>
  );
}

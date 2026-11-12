import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import SharedView from "@/components/SharedView";
import { createAdminClient } from "@/lib/supabase/admin";
import { TreeSchema, type CommentRow } from "@/lib/types";

// Client links must never be indexed or cached.
export const metadata: Metadata = { title: "Sitemap review", robots: { index: false, follow: false } };
export default function SharedPage({ params }: PageProps<"/s/[token]">) {
  return (
    <Suspense fallback={<div className="grid h-dvh place-items-center text-sm text-neutral-400">Loading…</div>}>
      <SharedContent params={params} />
    </Suspense>
  );
}

async function SharedContent({ params }: { params: PageProps<"/s/[token]">["params"] }) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) notFound();

  const db = createAdminClient();
  const { data: project } = await db
    .from("projects")
    .select("id, name, tree, share_enabled")
    .eq("share_token", token)
    .maybeSingle();
  if (!project || !project.share_enabled) notFound();

  const tree = TreeSchema.safeParse(project.tree);
  if (!tree.success) notFound();

  const { data: comments } = await db
    .from("comments")
    .select("id, project_id, page_id, section_id, parent_id, author_name, body, by_owner, resolved, created_at")
    .eq("project_id", project.id)
    .order("created_at");

  return <SharedView token={token} name={project.name} tree={tree.data} initialComments={(comments ?? []) as CommentRow[]} />;
}

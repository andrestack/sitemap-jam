import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import Editor from "@/components/Editor";
import { createClient } from "@/lib/supabase/server";
import { TreeSchema, type CommentRow } from "@/lib/types";

export const metadata: Metadata = { title: "Edit sitemap", robots: { index: false } };
export default function ProjectPage({ params }: PageProps<"/p/[id]">) {
  return (
    <Suspense fallback={<div className="grid h-dvh place-items-center text-sm text-neutral-400">Loading…</div>}>
      <ProjectContent params={params} />
    </Suspense>
  );
}

async function ProjectContent({ params }: { params: PageProps<"/p/[id]">["params"] }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  // RLS limits this to the signed-in owner's own project.
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, tree, share_token, share_enabled")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();
  const tree = TreeSchema.safeParse(project.tree);
  if (!tree.success) notFound();

  const { data: comments } = await supabase
    .from("comments")
    .select("id, project_id, page_id, section_id, parent_id, author_name, body, by_owner, resolved, created_at")
    .eq("project_id", id)
    .order("created_at");

  return <Editor project={{ ...project, tree: tree.data }} initialComments={(comments ?? []) as CommentRow[]} />;
}

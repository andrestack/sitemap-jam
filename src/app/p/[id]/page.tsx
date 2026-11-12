import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import Editor from "@/components/Editor";
import GhostCanvas from "@/components/GhostCanvas";
import { createClient } from "@/lib/supabase/server";
import { TreeSchema, type CommentRow, type ProjectSummary } from "@/lib/types";

export const metadata: Metadata = { title: "Edit sitemap", robots: { index: false } };
export default function ProjectPage({ params }: PageProps<"/p/[id]">) {
  return (
    <Suspense
      fallback={
        <div className="h-dvh bg-neutral-100">
          <GhostCanvas />
        </div>
      }
    >
      <ProjectContent params={params} />
    </Suspense>
  );
}

async function ProjectContent({ params }: { params: PageProps<"/p/[id]">["params"] }) {
  // Depends on who is signed in, so it renders per request, never at build time.
  await connection();
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

  const [{ data: comments }, { data: projects }] = await Promise.all([
    supabase
      .from("comments")
      .select("id, project_id, page_id, section_id, parent_id, author_name, body, by_owner, resolved, created_at")
      .eq("project_id", id)
      .order("created_at"),
    supabase.from("projects").select("id, name, updated_at").order("updated_at", { ascending: false }).limit(50),
  ]);

  return (
    <Editor
      project={{ ...project, tree: tree.data }}
      initialComments={(comments ?? []) as CommentRow[]}
      projects={(projects ?? []) as ProjectSummary[]}
      userEmail={auth.user.email ?? null}
    />
  );
}

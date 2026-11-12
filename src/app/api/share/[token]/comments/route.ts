import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyNewComment } from "@/lib/notify";
import { TreeSchema, type CommentRow } from "@/lib/types";

const TOKEN = /^[a-f0-9]{64}$/;
const MAX_COMMENTS_PER_PROJECT = 500;

const Body = z.object({
  authorName: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(2000),
  pageId: z.string().min(1).max(64),
  sectionId: z.string().min(1).max(64).nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
});

async function loadProject(token: string) {
  if (!TOKEN.test(token)) return null;
  const db = createAdminClient();
  const { data } = await db
    .from("projects")
    .select("id, name, tree, share_enabled")
    .eq("share_token", token)
    .maybeSingle();
  if (!data || !data.share_enabled) return null;
  return { db, project: data };
}

export async function GET(_req: Request, ctx: RouteContext<"/api/share/[token]/comments">) {
  const { token } = await ctx.params;
  const found = await loadProject(token);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data } = await found.db
    .from("comments")
    .select("id, project_id, page_id, section_id, parent_id, author_name, body, by_owner, resolved, created_at")
    .eq("project_id", found.project.id)
    .order("created_at");
  return NextResponse.json({ comments: (data ?? []) as CommentRow[] });
}

export async function POST(req: Request, ctx: RouteContext<"/api/share/[token]/comments">) {
  const { token } = await ctx.params;
  const found = await loadProject(token);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { db, project } = found;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your name and a comment." }, { status: 400 });
  const { authorName, body, pageId, sectionId = null, parentId = null } = parsed.data;

  // The comment must point at something that exists in this project's tree.
  // Section comments follow the section, so resolve its current page rather than trusting pageId.
  const tree = TreeSchema.safeParse(project.tree);
  const pages = tree.success ? tree.data.pages : [];
  const section = sectionId ? pages.flatMap((p) => p.sections).find((s) => s.id === sectionId) : undefined;
  if (sectionId && !section) return NextResponse.json({ error: "That section no longer exists." }, { status: 400 });
  const page = sectionId ? pages.find((p) => p.sections.some((s) => s.id === sectionId)) : pages.find((p) => p.id === pageId);
  if (!page) return NextResponse.json({ error: "That page no longer exists." }, { status: 400 });

  if (parentId) {
    const { data: parent } = await db
      .from("comments")
      .select("id, project_id, parent_id")
      .eq("id", parentId)
      .maybeSingle();
    if (!parent || parent.project_id !== project.id || parent.parent_id) {
      return NextResponse.json({ error: "Can't reply to that comment." }, { status: 400 });
    }
  }

  const { count } = await db
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project.id);
  if ((count ?? 0) >= MAX_COMMENTS_PER_PROJECT) {
    return NextResponse.json({ error: "This project has reached its comment limit." }, { status: 429 });
  }

  const { data: row, error } = await db
    .from("comments")
    .insert({
      project_id: project.id,
      page_id: page.id,
      section_id: sectionId,
      parent_id: parentId,
      author_name: authorName,
      body,
      by_owner: false,
    })
    .select("id, project_id, page_id, section_id, parent_id, author_name, body, by_owner, resolved, created_at")
    .single();
  if (error) return NextResponse.json({ error: "Could not save your comment." }, { status: 500 });

  await notifyNewComment({
    projectName: project.name,
    projectId: project.id,
    author: authorName,
    body,
    where: section ? `${page.name} → ${section.type}` : page.name,
    isReply: Boolean(parentId),
  });

  return NextResponse.json({ comment: row as CommentRow }, { status: 201 });
}

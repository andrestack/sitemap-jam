import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateTree } from "@/lib/generate";

export const maxDuration = 300;

const Body = z.object({
  name: z.string().trim().min(1).max(200),
  brief: z.string().trim().min(10).max(4000),
});

/** Owner-only: generates a sitemap from a brief and saves it as a new project. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Sign-ups should be disabled in Supabase; this is a second lock on the paid API call.
  const allowed = process.env.ALLOWED_EMAILS?.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!allowed?.length) {
    return NextResponse.json({ error: "Set ALLOWED_EMAILS in the environment before generating." }, { status: 503 });
  }
  if (!allowed.includes((user.email ?? "").toLowerCase())) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a name and a brief of at least 10 characters." }, { status: 400 });
  }
  const { name, brief } = parsed.data;

  let tree;
  try {
    tree = await generateTree(name, brief);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const { data: row, error } = await supabase
    .from("projects")
    .insert({ name, brief, tree })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: row.id });
}

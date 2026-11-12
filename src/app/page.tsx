import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import GhostCanvas from "@/components/GhostCanvas";
import Logo from "@/components/Logo";
import Workspace from "@/components/Workspace";
import { createClient } from "@/lib/supabase/server";
import type { ProjectSummary } from "@/lib/types";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="h-dvh bg-neutral-100">
          <GhostCanvas />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  // Everything below depends on who is signed in, so it renders per request, never at build time.
  await connection();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-16">
        <h1>
          <Logo size={44} />
        </h1>
        <p className="mt-5 text-sm text-neutral-600">
          Supabase isn&apos;t configured yet. Copy <code>.env.example</code> to <code>.env.local</code>, fill it in and run the migrations in{" "}
          <code>supabase/migrations</code>. Meanwhile you can try the editor on{" "}
          <Link href="/demo" className="underline">the demo page</Link>.
        </p>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);

  return <Workspace projects={(projects ?? []) as ProjectSummary[]} userEmail={auth.user.email ?? null} />;
}

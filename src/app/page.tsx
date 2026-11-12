import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import NewProject from "@/components/NewProject";
import { createClient } from "@/lib/supabase/server";

export default function Home() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-2xl px-4 py-12 text-sm text-neutral-400">Loading…</main>}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-16">
        <h1 className="text-xl font-semibold text-neutral-900">Sitemap studio</h1>
        <p className="mt-3 text-sm text-neutral-600">
          Supabase isn&apos;t configured yet. Copy <code>.env.example</code> to <code>.env.local</code>, fill it in and run the migration in{" "}
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
    .order("updated_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-xl font-semibold text-neutral-900">Sitemaps</h1>
      <div className="mt-6">
        <NewProject />
      </div>
      <ul className="mt-8 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
        {(projects ?? []).length === 0 && <li className="px-5 py-4 text-sm text-neutral-400">No projects yet.</li>}
        {(projects ?? []).map((p) => (
          <li key={p.id}>
            <Link href={`/p/${p.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-neutral-50">
              <span className="text-sm font-medium text-neutral-900">{p.name}</span>
              <span className="text-xs text-neutral-400">
                {new Date(p.updated_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

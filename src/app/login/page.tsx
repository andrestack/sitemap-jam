"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setError("That email and password didn't match.");
    router.replace("/");
    router.refresh();
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4">
      <h1 className="text-xl font-semibold text-neutral-900">Sitemap studio</h1>
      <p className="mt-1 text-sm text-neutral-500">Sign in to build and share sitemaps.</p>
      {!configured && (
        <p role="alert" className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Supabase isn&apos;t configured yet. Copy <code>.env.example</code> to <code>.env.local</code> and fill it in.
        </p>
      )}
      <form onSubmit={submit} className="mt-6 space-y-3">
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" aria-label="Email" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900" />
        <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" aria-label="Password" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900" />
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button disabled={busy || !configured} className="w-full rounded-md bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

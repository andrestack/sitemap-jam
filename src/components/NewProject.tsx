"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

export default function NewProject() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, brief }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (!res || !res.ok) {
      setBusy(false);
      return setError(json.error ?? "Couldn't reach the server.");
    }
    router.push(`/p/${json.id}`);
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-neutral-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-neutral-900">New sitemap</h2>
      <input required value={name} onChange={(e) => setName(e.target.value)} maxLength={200} placeholder="Business or project name" aria-label="Business or project name" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900" />
      <textarea
        required
        minLength={10}
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        maxLength={4000}
        rows={5}
        placeholder="What does the business do, who are the customers, and what should the website achieve? Mention any pages you already know you need."
        aria-label="Brief"
        className="w-full resize-y rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
      />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? "Generating… this can take a minute" : "Generate sitemap"}
      </Button>
    </form>
  );
}

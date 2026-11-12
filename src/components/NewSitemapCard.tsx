"use client";

import { useState, type FormEvent } from "react";
import { Button } from "./ui/button";
import { SpinnerIcon } from "./ui/icons";

export type NewSitemapInput = { name: string; brief: string };

type Props = {
  busy: boolean;
  error: string | null;
  onSubmit: (input: NewSitemapInput) => void;
};

const field =
  "mt-1 block w-full rounded-md border border-neutral-400 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-500/70 focus:border-neutral-900 read-only:bg-neutral-50 read-only:text-neutral-600";

/** The form that floats over the placeholder sitemap. */
export default function NewSitemapCard({ busy, error, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [brief, setBrief] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return; // each submit spends model credits and creates a project
    onSubmit({ name: name.trim(), brief: brief.trim() });
  };

  return (
    <form
      onSubmit={submit}
      aria-busy={busy}
      className="w-full rounded-xl border border-neutral-200 bg-white p-5 shadow-xl shadow-neutral-900/10"
    >
      <h1 className="text-xl font-semibold text-neutral-900">New sitemap</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Describe the business. Sitemap Jam plans the pages and the sections on each one.
      </p>

      <label htmlFor="sitemap-name" className="mt-4 block text-xs font-medium text-neutral-700">
        Business or project name
      </label>
      <input
        id="sitemap-name"
        required
        maxLength={200}
        readOnly={busy}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Wattle & Fern Café"
        autoComplete="off"
        className={field}
      />

      <label htmlFor="sitemap-brief" className="mt-3 block text-xs font-medium text-neutral-700">
        Brief
      </label>
      <textarea
        id="sitemap-brief"
        required
        minLength={10}
        maxLength={4000}
        readOnly={busy}
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        rows={6}
        placeholder="What the business does, who its customers are, and what the website should achieve. Mention any pages you already know you need."
        className={`${field} resize-y`}
      />

      {error && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <Button
        type="submit"
        variant="gold"
        size="lg"
        aria-disabled={busy}
        className={busy ? "mt-4 w-full cursor-wait" : "mt-4 w-full"}
      >
        {busy ? (
          <>
            <SpinnerIcon width={16} height={16} /> Generating…
          </>
        ) : (
          "Generate sitemap"
        )}
      </Button>
      <p className="mt-2 text-center text-xs text-neutral-500" aria-live="polite">
        {busy ? "Writing your sitemap. This can take up to a minute." : "It appears on the canvas, ready to edit and share."}
      </p>
    </form>
  );
}

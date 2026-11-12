"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AppBar from "./AppBar";
import Editor from "./Editor";
import GhostCanvas from "./GhostCanvas";
import NewSitemapCard, { type NewSitemapInput } from "./NewSitemapCard";
import { TreeSchema, type ProjectFull, type ProjectSummary } from "@/lib/types";

type Props = {
  projects: ProjectSummary[];
  userEmail: string | null;
  /** The address of the empty stage, and of a generated project. Overridable so the stage can be previewed. */
  homePath?: string;
  projectPath?: (id: string) => string;
  /** Overridable so the stage can be previewed without spending credits. */
  generate?: (input: NewSitemapInput) => Promise<ProjectFull>;
};

async function generateViaApi(input: NewSitemapInput): Promise<ProjectFull> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  }).catch(() => null);
  const json = res ? await res.json().catch(() => ({})) : {};
  if (!res || !res.ok) throw new Error(json.error ?? "Couldn't reach the server. Check your connection and try again.");
  const tree = TreeSchema.safeParse(json.tree);
  if (!json.id || !tree.success) throw new Error("The server's reply wasn't a sitemap. Try again.");
  return { id: json.id, name: json.name, tree: tree.data, share_token: json.share_token, share_enabled: json.share_enabled };
}

/**
 * Where a signed-in owner lands: the canvas, with a placeholder sitemap and a form floating over it.
 * Generating fills the same canvas in place, so the editor appears without a page change.
 */
export default function Workspace({
  projects,
  userEmail,
  homePath = "/",
  projectPath = (id) => `/p/${id}`,
  generate = generateViaApi,
}: Props) {
  const [project, setProject] = useState<ProjectFull | null>(null);
  const [recent, setRecent] = useState(projects);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const submit = async (input: NewSitemapInput) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const created = await generate(input);
      // The user may have left while it was generating. The project is saved either way, and shows up in Projects.
      if (!mounted.current) return;
      setProject(created);
      setRecent((r) => [{ id: created.id, name: created.name, updated_at: new Date().toISOString() }, ...r]);
      // Make the address shareable and reload-safe without a navigation.
      if (window.location.pathname === homePath) window.history.replaceState(null, "", projectPath(created.id));
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const startNew = useCallback(() => {
    setProject(null);
    setError(null);
    window.history.replaceState(null, "", homePath);
  }, [homePath]);

  if (project) {
    return (
      <Editor
        key={project.id}
        project={project}
        initialComments={[]}
        projects={recent}
        userEmail={userEmail}
        homePath={homePath}
        projectHref={projectPath}
        onNewSitemap={startNew}
      />
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-neutral-100">
      <AppBar projects={recent} userEmail={userEmail} homePath={homePath} projectHref={projectPath} onNewSitemap={startNew} />
      <main className="relative min-h-0 flex-1">
        <GhostCanvas busy={busy} />
        <div className="pointer-events-none absolute inset-0 overflow-y-auto p-4 sm:p-6">
          <div className="pointer-events-auto w-full sm:w-[24rem]">
            <NewSitemapCard busy={busy} error={error} onSubmit={submit} />
          </div>
        </div>
      </main>
    </div>
  );
}

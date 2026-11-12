"use client";

import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { clsx } from "clsx";
import { BRAND } from "@/lib/brand";
import { NODE_W, layoutTree } from "@/lib/tree";
import type { Page, Tree } from "@/lib/types";

// A stand-in sitemap. Static ids and no randomness, because this also renders on the server.
const filler = (lines: number) => "x".repeat(lines * 34 - 6);
const sec = (id: string, type: string, lines = 2) => ({ id, type, description: filler(lines) });
const page = (id: string, parentId: string | null, sections: Page["sections"]): Page => ({ id, name: id, slug: id, parentId, sections });

const GHOST: Tree = {
  pages: [
    page("home", null, [sec("h1", "Navbar", 1), sec("h2", "Hero", 2), sec("h3", "Feature", 2), sec("h4", "CTA", 1), sec("h5", "Footer", 1)]),
    page("about", "home", [sec("a1", "Navbar", 1), sec("a2", "Header", 2), sec("a3", "Team", 2), sec("a4", "Footer", 1)]),
    page("services", "home", [sec("s1", "Navbar", 1), sec("s2", "Header", 2), sec("s3", "Features", 2), sec("s4", "Pricing", 2), sec("s5", "Footer", 1)]),
    page("contact", "home", [sec("c1", "Navbar", 1), sec("c2", "Contact", 2), sec("c3", "Footer", 1)]),
  ],
};

type GhostData = { pageId: string; busy: boolean; index: number };

function Bar({ className }: { className: string }) {
  return <div className={clsx("rounded-full", className)} />;
}

function GhostNode({ data }: NodeProps<Node<GhostData>>) {
  const p = GHOST.pages.find((x) => x.id === data.pageId);
  if (!p) return null;
  return (
    <div
      style={{ width: NODE_W, ["--jam-delay" as string]: `${data.index * 140}ms` }}
      className={clsx(
        "rounded-lg border border-dashed border-neutral-300 bg-neutral-50/80 shadow-sm",
        data.busy && "jam-breathe",
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-1.5 !w-1.5 !border-0 !bg-neutral-300" />
      <div className="flex h-10 items-center border-b border-dashed border-neutral-300 px-2.5">
        <Bar className="h-2.5 w-24 bg-neutral-300/80" />
      </div>
      <div className="flex flex-col gap-1.5 p-2">
        {p.sections.map((s) => {
          const lines = Math.ceil(s.description.length / 34);
          return (
            <div key={s.id} className="rounded-md border border-neutral-200 bg-white/70 px-2.5 py-2">
              <div className="flex h-6 items-center">
                <Bar className="h-2 w-16 bg-neutral-300/80" />
              </div>
              <div className="mt-1 flex flex-col justify-center gap-[7px]" style={{ height: lines * 17 }}>
                {Array.from({ length: lines }, (_, i) => (
                  <Bar key={i} className={clsx("h-1.5 bg-neutral-200", i === lines - 1 ? "w-3/5" : "w-full")} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="h-12" />
      <Handle type="source" position={Position.Bottom} className="!h-1.5 !w-1.5 !border-0 !bg-neutral-300" />
    </div>
  );
}

const nodeTypes = { ghost: GhostNode };

function Inner({ busy }: { busy: boolean }) {
  const positions = useMemo(() => layoutTree(GHOST), []);
  const nodes: Node[] = useMemo(
    () =>
      GHOST.pages.map((p, index) => ({
        id: p.id,
        type: "ghost",
        position: positions.get(p.id) ?? { x: 0, y: 0 },
        data: { pageId: p.id, busy, index } satisfies GhostData,
        draggable: false,
        selectable: false,
        focusable: false,
      })),
    [positions, busy],
  );
  const edges: Edge[] = useMemo(
    () =>
      GHOST.pages
        .filter((p) => p.parentId)
        .map((p) => ({ id: `${p.parentId}-${p.id}`, source: p.parentId!, target: p.id, type: "smoothstep", style: { strokeDasharray: "5 5" } })),
    [],
  );

  // Keep the placeholder clear of the floating form card: beside it from the sm breakpoint up, below it on phones.
  const phone = typeof window !== "undefined" && window.innerWidth < 640;
  // React Flow reads a bare number as a fraction of the viewport, so these carry an explicit px unit.
  const px = (n: number) => `${n}px` as `${number}px`;
  const padding = phone
    ? { top: px(Math.min(500, Math.round(window.innerHeight * 0.62))), right: px(16), bottom: px(16), left: px(16) }
    : { top: px(56), right: px(48), bottom: px(40), left: px(400) };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding, maxZoom: 0.85 }}
      minZoom={0.1}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnDrag={false}
      zoomOnScroll={false}
      zoomOnPinch={false}
      zoomOnDoubleClick={false}
      preventScrolling={false}
      aria-label="A placeholder sitemap. Fill in the form to create a real one."
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color={BRAND.dots} />
    </ReactFlow>
  );
}

/** A faint, non-interactive sitemap that stands in until a real one is generated. */
export default function GhostCanvas({ busy = false }: { busy?: boolean }) {
  return (
    <div className="h-full w-full">
      <ReactFlowProvider>
        <Inner busy={busy} />
      </ReactFlowProvider>
    </div>
  );
}

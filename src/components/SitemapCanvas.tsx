"use client";

import "@xyflow/react/dist/style.css";
import { createContext, useContext, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import type { CommentRow, CommentTarget, Page, Tree } from "@/lib/types";
import { SECTION_TYPES } from "@/lib/types";
import {
  NODE_W,
  addPage,
  addSection,
  deletePage,
  deleteSection,
  layoutTree,
  moveSection,
  movePage,
  renamePage,
  updateSection,
} from "@/lib/tree";

type Ctx = {
  tree: Tree;
  mode: "edit" | "view";
  openCounts: Map<string, number>;
  activeKey: string | null;
  onChange: (t: Tree) => void;
  onOpenComments: (t: CommentTarget) => void;
};
const CanvasCtx = createContext<Ctx | null>(null);
const useCanvas = () => {
  const c = useContext(CanvasCtx);
  if (!c) throw new Error("CanvasCtx missing");
  return c;
};

// Section ids are unique across the tree, so a section's comments follow it when it moves pages.
export const targetKey = (t: CommentTarget) => (t.sectionId ? `s:${t.sectionId}` : `p:${t.pageId}`);

function CommentButton({ target, label }: { target: CommentTarget; label: string }) {
  const { openCounts, activeKey, onOpenComments } = useCanvas();
  const key = targetKey(target);
  const n = openCounts.get(key) ?? 0;
  const active = activeKey === key;
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={() => onOpenComments(target)}
      className={`nodrag nopan inline-flex h-6 min-w-6 items-center justify-center gap-1 rounded-full px-1.5 text-[11px] font-medium leading-none transition ${
        n > 0
          ? "bg-amber-400 text-amber-950 hover:bg-amber-300"
          : active
            ? "bg-neutral-900 text-white"
            : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
      }`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      {n > 0 ? n : null}
    </button>
  );
}

function SectionCard({ page, sectionId }: { page: Page; sectionId: string }) {
  const { tree, mode, onChange, activeKey } = useCanvas();
  const [over, setOver] = useState(false);
  const section = page.sections.find((s) => s.id === sectionId)!;
  const editing = mode === "edit";
  const key = targetKey({ pageId: page.id, sectionId });

  return (
    <div
      draggable={editing}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/section", sectionId);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        if (!editing || !e.dataTransfer.types.includes("text/section")) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        const id = e.dataTransfer.getData("text/section");
        if (!editing || !id) return;
        e.preventDefault();
        e.stopPropagation();
        onChange(moveSection(tree, id, page.id, sectionId));
      }}
      className={`nodrag nopan group rounded-md border bg-white px-2.5 py-2 text-left transition ${
        over ? "border-neutral-900 shadow-[0_-3px_0_0_#171717]" : activeKey === key ? "border-neutral-900" : "border-neutral-200"
      } ${editing ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <div className="flex items-center gap-1.5">
        {editing ? (
          <input
            list="section-types"
            value={section.type}
            onChange={(e) => onChange(updateSection(tree, sectionId, { type: e.target.value }))}
            aria-label="Section type"
            className="min-w-0 flex-1 rounded bg-transparent text-[11px] font-semibold uppercase tracking-wide text-neutral-700 outline-none focus:bg-neutral-50"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-wide text-neutral-700">{section.type}</span>
        )}
        <CommentButton target={{ pageId: page.id, sectionId }} label={`Comments on ${section.type}`} />
        {editing && (
          <button
            type="button"
            aria-label={`Delete ${section.type}`}
            title="Delete section"
            onClick={() => onChange(deleteSection(tree, sectionId))}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-neutral-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus:opacity-100"
          >
            ×
          </button>
        )}
      </div>
      {editing ? (
        <textarea
          value={section.description}
          onChange={(e) => onChange(updateSection(tree, sectionId, { description: e.target.value }))}
          rows={Math.max(2, Math.ceil(section.description.length / 34))}
          placeholder="What does this section say or do?"
          aria-label="Section description"
          className="mt-1 block w-full resize-none rounded bg-transparent text-xs leading-[17px] text-neutral-600 outline-none placeholder:text-neutral-300 focus:bg-neutral-50"
        />
      ) : (
        <p className="mt-1 text-xs leading-[17px] text-neutral-600">{section.description || <span className="text-neutral-300">No description</span>}</p>
      )}
    </div>
  );
}

function PageNode({ data }: NodeProps<Node<{ pageId: string }>>) {
  const { tree, mode, onChange } = useCanvas();
  const page = tree.pages.find((p) => p.id === data.pageId);
  if (!page) return null;
  const editing = mode === "edit";

  return (
    <div style={{ width: NODE_W }} className="rounded-lg border border-neutral-300 bg-neutral-50 shadow-sm">
      <Handle type="target" position={Position.Top} className="!h-1.5 !w-1.5 !border-0 !bg-neutral-400" />
      <div className="flex items-center gap-1.5 border-b border-neutral-200 px-2.5 py-2">
        {editing ? (
          <input
            value={page.name}
            onChange={(e) => onChange(renamePage(tree, page.id, e.target.value))}
            aria-label="Page name"
            className="nodrag nopan min-w-0 flex-1 rounded bg-transparent text-sm font-semibold text-neutral-900 outline-none focus:bg-white"
          />
        ) : (
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-900">{page.name}</h3>
        )}
        <CommentButton target={{ pageId: page.id, sectionId: null }} label={`Comments on ${page.name} page`} />
      </div>

      <div
        className="flex flex-col gap-1.5 p-2"
        onDragOver={(e) => {
          if (editing && e.dataTransfer.types.includes("text/section")) e.preventDefault();
        }}
        onDrop={(e) => {
          const id = e.dataTransfer.getData("text/section");
          if (!editing || !id) return;
          e.preventDefault();
          onChange(moveSection(tree, id, page.id, null));
        }}
      >
        {page.sections.map((s) => (
          <SectionCard key={s.id} page={page} sectionId={s.id} />
        ))}
        {editing && (
          <button
            type="button"
            onClick={() => onChange(addSection(tree, page.id))}
            className="nodrag nopan rounded-md border border-dashed border-neutral-300 py-1 text-xs text-neutral-500 transition hover:border-neutral-500 hover:text-neutral-800"
          >
            + Add section
          </button>
        )}
      </div>

      {editing && (
        <div className="nodrag nopan flex items-center gap-1 border-t border-neutral-200 px-2 py-1.5 text-[11px] text-neutral-500">
          <button type="button" onClick={() => onChange(addPage(tree, page.id))} className="rounded px-1.5 py-0.5 hover:bg-neutral-200">
            + Child page
          </button>
          <button type="button" aria-label="Move page left" onClick={() => onChange(movePage(tree, page.id, -1))} className="rounded px-1.5 py-0.5 hover:bg-neutral-200">
            ←
          </button>
          <button type="button" aria-label="Move page right" onClick={() => onChange(movePage(tree, page.id, 1))} className="rounded px-1.5 py-0.5 hover:bg-neutral-200">
            →
          </button>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Delete the "${page.name}" page? Its child pages move up a level.`)) onChange(deletePage(tree, page.id));
            }}
            className="rounded px-1.5 py-0.5 hover:bg-red-50 hover:text-red-600"
          >
            Delete
          </button>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!h-1.5 !w-1.5 !border-0 !bg-neutral-400" />
    </div>
  );
}

const nodeTypes = { page: PageNode };

function Inner(props: Props) {
  const { tree, comments, activeTarget } = props;
  const positions = useMemo(() => layoutTree(tree), [tree]);

  const nodes: Node[] = useMemo(
    () =>
      tree.pages.map((p) => ({
        id: p.id,
        type: "page",
        position: positions.get(p.id) ?? { x: 0, y: 0 },
        data: { pageId: p.id },
        draggable: false,
      })),
    [tree.pages, positions],
  );

  const edges: Edge[] = useMemo(() => {
    const ids = new Set(tree.pages.map((p) => p.id));
    return tree.pages
      .filter((p) => p.parentId && ids.has(p.parentId))
      .map((p) => ({ id: `${p.parentId}-${p.id}`, source: p.parentId!, target: p.id, type: "smoothstep", style: { stroke: "#a3a3a3" } }));
  }, [tree.pages]);

  const openCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of comments) {
      if (c.parent_id || c.resolved) continue;
      const k = targetKey({ pageId: c.page_id, sectionId: c.section_id });
      // (page_id is ignored for section comments; see targetKey)
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [comments]);

  const ctx: Ctx = {
    tree,
    mode: props.mode,
    openCounts,
    activeKey: activeTarget ? targetKey(activeTarget) : null,
    onChange: props.onChange ?? (() => {}),
    onOpenComments: props.onOpenComments,
  };

  return (
    <CanvasCtx.Provider value={ctx}>
      <datalist id="section-types">
        {SECTION_TYPES.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
        minZoom={0.1}
        maxZoom={1.5}
        nodesDraggable={false}
        nodesConnectable={false}
        // Must stay selectable: React Flow turns off pointer events on nodes that are neither
        // draggable nor selectable, which would make every button inside them unclickable.
        elementsSelectable
        panOnScroll
        zoomOnScroll={false}
        proOptions={{ hideAttribution: false }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d4d4d4" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </CanvasCtx.Provider>
  );
}

type Props = {
  tree: Tree;
  mode: "edit" | "view";
  comments: CommentRow[];
  activeTarget: CommentTarget | null;
  onChange?: (t: Tree) => void;
  onOpenComments: (t: CommentTarget) => void;
};

export default function SitemapCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}

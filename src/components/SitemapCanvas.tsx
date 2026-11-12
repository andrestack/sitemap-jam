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
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Menu } from "@base-ui/react/menu";
import { clsx } from "clsx";
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
  moveSectionOnto,
  movePage,
  renamePage,
  siblingPosition,
  updateSection,
} from "@/lib/tree";
import { Button, IconButton } from "./ui/button";
import { useConfirm } from "./ui/confirm";
import { ArrowLeftIcon, ArrowRightIcon, CloseIcon, CommentIcon, DotsIcon, GripIcon, PlusIcon, TrashIcon } from "./ui/icons";

type Ctx = {
  tree: Tree;
  mode: "edit" | "view";
  openCounts: Map<string, number>;
  activeKey: string | null;
  dragging: boolean;
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
  return (
    <IconButton
      label={label}
      ariaLabel={label}
      size="iconSm"
      onClick={() => onOpenComments(target)}
      className={clsx(
        "nodrag nopan",
        n > 0 && "!w-auto min-w-6 gap-1 bg-amber-400 px-1.5 text-[11px] !text-amber-950 hover:!bg-amber-300",
        n === 0 && activeKey === key && "bg-neutral-900 !text-white hover:bg-neutral-700",
      )}
    >
      <CommentIcon width={12} height={12} />
      {n > 0 ? n : null}
    </IconButton>
  );
}

function SectionCard({ page, sectionId }: { page: Page; sectionId: string }) {
  const { tree, mode, onChange, activeKey } = useCanvas();
  const section = page.sections.find((s) => s.id === sectionId)!;
  const editing = mode === "edit";
  const key = targetKey({ pageId: page.id, sectionId });

  const drag = useDraggable({ id: sectionId, disabled: !editing });
  const drop = useDroppable({ id: `drop:${sectionId}`, disabled: !editing });
  const handleProps = { ref: drag.setActivatorNodeRef, ...drag.listeners, ...drag.attributes };

  return (
    <div
      ref={(el) => {
        drop.setNodeRef(el);
        drag.setNodeRef(el);
      }}
      className={clsx(
        "nodrag nopan group relative rounded-md border bg-white px-2.5 py-2 text-left transition-[border-color,opacity,box-shadow] duration-150",
        activeKey === key ? "border-neutral-900" : "border-neutral-200 hover:border-neutral-300",
        drag.isDragging && "opacity-40",
        drop.isOver && !drag.isDragging && "shadow-[0_-3px_0_0_#171717]",
      )}
    >
      <div className="flex items-center gap-1">
        {editing && (
          <button
            {...handleProps}
            type="button"
            aria-label={`Drag ${section.type} to reorder`}
            title="Drag to reorder"
            className="-ml-1.5 inline-flex h-6 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:text-neutral-700 focus-visible:outline-2 focus-visible:outline-neutral-900 active:cursor-grabbing"
          >
            <GripIcon width={14} height={14} />
          </button>
        )}
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
          <IconButton
            label="Delete section"
            ariaLabel={`Delete ${section.type} section`}
            size="iconSm"
            className="nodrag nopan opacity-0 hover:!bg-red-50 hover:!text-red-600 focus-visible:opacity-100 group-hover:opacity-100"
            onClick={() => onChange(deleteSection(tree, sectionId))}
          >
            <CloseIcon width={12} height={12} />
          </IconButton>
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

function AddSectionZone({ page }: { page: Page }) {
  const { tree, onChange, dragging } = useCanvas();
  const { setNodeRef, isOver } = useDroppable({ id: `end:${page.id}` });
  return (
    <div ref={setNodeRef} className="nodrag nopan">
      <Button
        variant="dashed"
        size="sm"
        className={clsx("w-full", dragging && "border-neutral-400 text-neutral-700", isOver && "!border-neutral-900 !bg-neutral-100 !text-neutral-900")}
        onClick={() => onChange(addSection(tree, page.id))}
      >
        {dragging ? (
          "Drop here to move to the end"
        ) : (
          <>
            <PlusIcon width={12} height={12} /> Add section
          </>
        )}
      </Button>
    </div>
  );
}

const menuItem =
  "flex cursor-default select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-neutral-700 outline-none data-highlighted:bg-neutral-100 data-highlighted:text-neutral-900 data-disabled:opacity-40";

function PageNode({ data }: NodeProps<Node<{ pageId: string }>>) {
  const { tree, mode, onChange } = useCanvas();
  const confirm = useConfirm();
  const page = tree.pages.find((p) => p.id === data.pageId);
  if (!page) return null;
  const editing = mode === "edit";
  const { index, count } = siblingPosition(tree, page.id);

  const askDelete = async () => {
    const hasKids = tree.pages.some((p) => p.parentId === page.id);
    const ok = await confirm({
      title: `Delete "${page.name}"?`,
      description: hasKids
        ? "Its child pages move up a level. Comments on this page are kept but no longer shown."
        : "The page and its sections are removed. Comments on it are kept but no longer shown.",
      confirmLabel: "Delete page",
      destructive: true,
    });
    if (ok) onChange(deletePage(tree, page.id));
  };

  return (
    <div style={{ width: NODE_W }} className="group/page relative rounded-lg border border-neutral-300 bg-neutral-50 shadow-sm">
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

      <div className="flex flex-col gap-1.5 p-2">
        {page.sections.map((s) => (
          <SectionCard key={s.id} page={page} sectionId={s.id} />
        ))}
        {editing && <AddSectionZone page={page} />}
      </div>

      {editing && (
        <div className="nodrag nopan flex items-center justify-between border-t border-neutral-200 px-2 py-1.5">
          <div className="inline-flex items-center gap-0.5 rounded-md border border-neutral-200 bg-white p-0.5">
            <IconButton label="Move page left" ariaLabel="Move page left" disabled={index <= 0} onClick={() => onChange(movePage(tree, page.id, -1))}>
              <ArrowLeftIcon width={14} height={14} />
            </IconButton>
            <IconButton label="Move page right" ariaLabel="Move page right" disabled={index < 0 || index >= count - 1} onClick={() => onChange(movePage(tree, page.id, 1))}>
              <ArrowRightIcon width={14} height={14} />
            </IconButton>
          </div>

          <Menu.Root>
            <Menu.Trigger
              aria-label={`More actions for ${page.name}`}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900 data-popup-open:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-neutral-900"
            >
              <DotsIcon width={16} height={16} />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-50 outline-none">
                <Menu.Popup className="min-w-44 origin-[var(--transform-origin)] rounded-lg border border-neutral-200 bg-white p-1 shadow-lg outline-none transition-[opacity,scale] duration-100 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
                  <Menu.Item className={menuItem} onClick={() => onChange(addPage(tree, page.id))}>
                    <PlusIcon width={14} height={14} /> Add child page
                  </Menu.Item>
                  <Menu.Separator className="my-1 h-px bg-neutral-100" />
                  <Menu.Item className={clsx(menuItem, "text-red-600 data-highlighted:bg-red-50 data-highlighted:text-red-700")} onClick={askDelete}>
                    <TrashIcon width={14} height={14} /> Delete page
                  </Menu.Item>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </div>
      )}

      {/* The connector handle and the add-child button share the bottom-centre of the card. */}
      <Handle type="source" position={Position.Bottom} className="!h-1.5 !w-1.5 !border-0 !bg-neutral-400" />
      {editing && (
        <div className="nodrag nopan absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2">
          <IconButton
            variant="primary"
            label="Add child page"
            ariaLabel={`Add a child page under ${page.name}`}
            side="bottom"
            className="!h-7 !w-7 rounded-full shadow-md ring-4 ring-neutral-100 hover:scale-110"
            onClick={() => onChange(addPage(tree, page.id))}
          >
            <PlusIcon width={14} height={14} strokeWidth={2.5} />
          </IconButton>
        </div>
      )}
    </div>
  );
}

const nodeTypes = { page: PageNode };

/** Pointer first (precise drop target); closest-centre only for keyboard drags, which have no pointer. */
const collision: CollisionDetection = (args) => {
  if (!args.pointerCoordinates) return closestCenter(args);
  return pointerWithin(args);
};

function Inner(props: Props) {
  const { tree, comments, activeTarget } = props;
  const positions = useMemo(() => layoutTree(tree), [tree]);
  const [dragId, setDragId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

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
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [comments]);

  const onChange = props.onChange ?? (() => {});
  const ctx: Ctx = {
    tree,
    mode: props.mode,
    openCounts,
    activeKey: activeTarget ? targetKey(activeTarget) : null,
    dragging: dragId !== null,
    onChange,
    onOpenComments: props.onOpenComments,
  };

  const onDragEnd = (e: DragEndEvent) => {
    setDragId(null);
    if (!e.over) return;
    const id = String(e.active.id);
    const over = String(e.over.id);
    if (over.startsWith("end:")) onChange(moveSection(tree, id, over.slice(4), null));
    else if (over.startsWith("drop:")) onChange(moveSectionOnto(tree, id, over.slice(5)));
  };

  const dragged = dragId ? tree.pages.flatMap((p) => p.sections).find((s) => s.id === dragId) : undefined;

  return (
    <CanvasCtx.Provider value={ctx}>
      <datalist id="section-types">
        {SECTION_TYPES.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <DndContext
        sensors={sensors}
        collisionDetection={collision}
        autoScroll={false}
        onDragStart={(e) => setDragId(String(e.active.id))}
        onDragCancel={() => setDragId(null)}
        onDragEnd={onDragEnd}
      >
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
        {/* Rendered at screen scale outside the zoomed canvas, so it stays readable at any zoom. */}
        <DragOverlay dropAnimation={null} style={{ width: 240, height: "auto" }}>
          {dragged ? (
            <div className="rounded-md border border-neutral-900 bg-white px-3 py-2 shadow-xl">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-700">{dragged.type}</p>
              {dragged.description && <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">{dragged.description}</p>}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
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

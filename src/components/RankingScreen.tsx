"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { useSprout, type RankedDisplay } from "@/lib/store";
import { GripIcon } from "./icons";
import { GenderDot } from "./NameCardContent";

export function RankingScreen() {
  const s = useSprout();
  const [view, setView] = useState<"mine" | "combined">("mine");
  const [expanded, setExpanded] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const items = s.myOrdered;
  const ids = items.map((i) => i.cluster.id);
  const canCompare = items.length >= 3;

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = ids.indexOf(Number(e.active.id));
    const to = ids.indexOf(Number(e.over.id));
    if (from < 0 || to < 0) return;
    s.reorder(arrayMove(ids, from, to));
  };

  const toggleExpanded = (id: number) => setExpanded((cur) => (cur === id ? null : id));

  return (
    <>
      <header style={{ padding: "20px 20px 0" }}>
        <h1 className="title">Rank your matches</h1>
        <p className="muted" style={{ margin: "4px 0 0" }}>
          {view === "mine" ? "Drag to reorder — your favourite first." : "Both of your rankings combined, best overall first."}
        </p>
      </header>

      {items.length === 0 ? (
        <div className="center-stack">
          <div className="emoji">💛</div>
          <p className="muted" style={{ margin: 0 }}>
            You&apos;ll be able to rank once you have a couple of matches.
          </p>
          <button className="btn" onClick={() => s.setTab("swipe")}>
            Keep swiping
          </button>
        </div>
      ) : (
        <>
          <div className="seg" role="group" aria-label="Ranking view">
            <button aria-pressed={view === "mine"} onClick={() => setView("mine")}>
              My order
            </button>
            <button aria-pressed={view === "combined"} onClick={() => setView("combined")}>
              Combined
            </button>
          </div>

          {view === "mine" ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <ol className="rank-list">
                  {items.map((item, index) => (
                    <SortableRow
                      key={item.cluster.id}
                      item={item}
                      position={index + 1}
                      showDisagreement={canCompare}
                      expanded={expanded === item.cluster.id}
                      onToggle={() => toggleExpanded(item.cluster.id)}
                    />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          ) : (
            <ol className="rank-list">
              {s.combined.map((item, index) => (
                <li key={item.cluster.id} className="rank-item">
                  <span className="rank-num">{index + 1}</span>
                  <div className="rank-main">
                    <h3>{item.cluster.name}</h3>
                    <Disagreement
                      item={item}
                      show={canCompare}
                      expanded={expanded === item.cluster.id}
                      onToggle={() => toggleExpanded(item.cluster.id)}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
          {!s.partnerJoined && s.firebaseConfigured && (
            <p className="muted" style={{ padding: "0 20px 20px", margin: 0 }}>
              Your partner&apos;s ranking will show up here once they&apos;ve joined and ranked.
            </p>
          )}
        </>
      )}
    </>
  );
}

function SortableRow({
  item,
  position,
  showDisagreement,
  expanded,
  onToggle,
}: {
  item: RankedDisplay;
  position: number;
  showDisagreement: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.cluster.id,
  });

  return (
    <li
      ref={setNodeRef}
      className={`rank-item ${isDragging ? "dragging" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <span className="rank-num">{position}</span>
      <div className="rank-main">
        <div className="row" style={{ gap: 8 }}>
          <h3>{item.cluster.name}</h3>
          <GenderDot gender={item.cluster.gender} size={8} />
        </div>
        <Disagreement item={item} show={showDisagreement} expanded={expanded} onToggle={onToggle} />
      </div>
      <button
        ref={setActivatorNodeRef}
        className="drag-handle"
        aria-label={`Reorder ${item.cluster.name}. Press space to pick up, arrow keys to move.`}
        {...attributes}
        {...listeners}
      >
        <GripIcon />
      </button>
    </li>
  );
}

function Disagreement({
  item,
  show,
  expanded,
  onToggle,
}: {
  item: RankedDisplay;
  show: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (!show || item.disagreement === null || item.disagreement < 2) return null;
  return (
    <button className="disagree" onClick={onToggle} aria-expanded={expanded}>
      {expanded
        ? `You: #${(item.myPosition ?? 0) + 1} · Partner: #${(item.partnerPosition ?? 0) + 1}`
        : "You two see this one differently"}
    </button>
  );
}

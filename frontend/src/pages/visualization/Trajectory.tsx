import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  type Node,
  type Edge,
  Position,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import useVersionStore, { VersionSnapshot } from "@/stores/useVersionStore";

// Custom node colors per stage
const STAGE_COLORS = {
  card: { bg: "#FDE8EA", border: "#E8B4B8", text: "#8B3A3A", label: "Open Codes" },
  code: { bg: "#E8EFF9", border: "#B4C7E8", text: "#2C4A7C", label: "Sub-themes" },
  concept: { bg: "#E6F5EC", border: "#A8D5BA", text: "#2D6A4F", label: "Themes" },
};

function getStageFromSnapshot(snap: VersionSnapshot): "card" | "code" | "concept" | null {
  if (snap.step === "card" || snap.step === "restore") {
    // Determine by what changed
    return "card";
  }
  if (snap.step === "code") return "code";
  if (snap.step === "concept") return "concept";
  return "card"; // default
}

function countActive(items: any[]): number {
  return items.filter((i: any) => i.active !== false).length;
}

const NODE_WIDTH = 200;
const NODE_HEIGHT = 120;

// Compute change summary between two consecutive snapshots
function computeChangeSummary(prev: VersionSnapshot, curr: VersionSnapshot, stage: "card" | "code" | "concept"): string {
  const parts: string[] = [];

  if (stage === "card") {
    const prevActive = prev.cardData.filter(c => c.active !== false);
    const currActive = curr.cardData.filter(c => c.active !== false);
    const prevNames = new Set(prevActive.map(c => c.name));
    const currNames = new Set(currActive.map(c => c.name));
    const added = currActive.filter(c => !prevNames.has(c.name)).length;
    const removed = prevActive.filter(c => !currNames.has(c.name)).length;
    const renamed = currActive.filter(c => {
      const prevCard = prevActive.find(p => p.id === c.id);
      return prevCard && prevCard.name !== c.name;
    }).length;
    if (added > 0) parts.push(`+${added} codes`);
    if (removed > 0) parts.push(`-${removed} codes`);
    if (renamed > 0) parts.push(`${renamed} renamed`);
  } else if (stage === "code") {
    const diff = curr.codeData.length - prev.codeData.length;
    if (diff > 0) parts.push(`+${diff} sub-themes`);
    else if (diff < 0) parts.push(`${diff} sub-themes`);
    // Check name changes
    const prevNames = new Set(prev.codeData.map(c => c.name));
    const newNames = curr.codeData.filter(c => !prevNames.has(c.name)).length;
    if (newNames > 0 && diff === 0) parts.push(`${newNames} changed`);
  } else if (stage === "concept") {
    const diff = curr.conceptData.length - prev.conceptData.length;
    if (diff > 0) parts.push(`+${diff} themes`);
    else if (diff < 0) parts.push(`${diff} themes`);
    const prevNames = new Set(prev.conceptData.map(c => c.name));
    const newNames = curr.conceptData.filter(c => !prevNames.has(c.name)).length;
    if (newNames > 0 && diff === 0) parts.push(`${newNames} changed`);
  }

  // Check if prompt changed (via label hint)
  if (curr.label?.includes("regen") || curr.label?.includes("Regen")) {
    parts.push("regenerated");
  }

  return parts.length > 0 ? parts.join(", ") : "minor changes";
}

function VersionNode({ data }: { data: any }) {
  const style = STAGE_COLORS[data.stage as keyof typeof STAGE_COLORS] || STAGE_COLORS.card;
  const isCurrent = data.isCurrent;
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);
  const renameVersion = useVersionStore((s) => s.renameVersion);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitRename = useCallback(() => {
    setEditing(false);
    if (editValue.trim() && editValue.trim() !== data.label) {
      renameVersion(data.versionId, editValue.trim());
    }
  }, [editValue, data.label, data.versionId, renameVersion]);

  return (
    <div
      className={`rounded-xl border-2 px-3 py-2.5 shadow-sm transition-all relative flex flex-col justify-between ${
        isCurrent ? "ring-2 ring-offset-2 ring-[#CB9180]" : ""
      }`}
      style={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        backgroundColor: style.bg,
        borderColor: isCurrent ? "#CB9180" : style.border,
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditValue(data.label);
        setEditing(true);
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="left" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0 }} />

      {/* Header */}
      <div className="flex items-center justify-between mb-0.5">
        {editing ? (
          <input
            ref={inputRef}
            className="text-[11px] font-bold bg-white/80 border rounded px-1 py-0.5 w-full mr-1 outline-none"
            style={{ color: style.text }}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setEditing(false);
            }}
          />
        ) : (
          <span
            className="text-[11px] font-bold truncate cursor-text hover:underline hover:decoration-dashed group/name inline-flex items-center gap-1"
            style={{ color: style.text }}
            title="Double-click to rename"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditValue(data.label);
              setEditing(true);
            }}
          >
            {data.label}
            <span className="opacity-40 text-[9px]">✏️</span>
          </span>
        )}
        {isCurrent && !editing && (
          <span className="text-[9px] bg-[#CB9180] text-white px-1.5 py-0.5 rounded-full shrink-0">
            CURRENT
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="text-[10px] text-gray-600 space-y-0.5">
        <div>📊 {data.cardCount} codes · {data.codeCount} sub · {data.conceptCount} themes</div>
        {(data.lockedCount > 0 || data.editedCount > 0) && (
          <div>
            {data.lockedCount > 0 && <span>🔒 {data.lockedCount} </span>}
            {data.editedCount > 0 && <span>✏️ {data.editedCount}</span>}
          </div>
        )}
      </div>

      {/* Timestamp */}
      <div className="text-[9px] text-gray-400 mt-auto">
        {new Date(data.timestamp).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </div>
  );
}

const nodeTypes = { versionNode: VersionNode };

export default function Trajectory() {
  const { versions, activeVersionId } = useVersionStore();

  const { nodes, edges } = useMemo(() => {
    if (versions.length === 0) {
      return { nodes: [], edges: [] };
    }

    // Group versions by stage
    const cardVersions: VersionSnapshot[] = [];
    const codeVersions: VersionSnapshot[] = [];
    const conceptVersions: VersionSnapshot[] = [];

    versions.forEach((v) => {
      const stage = getStageFromSnapshot(v);
      if (stage === "card") cardVersions.push(v);
      else if (stage === "code") codeVersions.push(v);
      else if (stage === "concept") conceptVersions.push(v);
    });

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const COLUMN_X = { card: 0, code: 280, concept: 560 };
    const ROW_HEIGHT = NODE_HEIGHT + 50;
    const HEADER_Y = 0;
    const START_Y = 60;

    // Add column headers
    Object.entries(STAGE_COLORS).forEach(([stage, style]) => {
      nodes.push({
        id: `header-${stage}`,
        type: "default",
        position: { x: COLUMN_X[stage as keyof typeof COLUMN_X] + 20, y: HEADER_Y },
        data: { label: style.label },
        style: {
          background: "transparent",
          border: "none",
          fontSize: "14px",
          fontWeight: "700",
          color: style.text,
          width: 160,
          textAlign: "center" as const,
        },
        draggable: false,
        selectable: false,
      });
    });

    // Create version nodes per column
    const createColumnNodes = (
      versionList: VersionSnapshot[],
      stage: "card" | "code" | "concept"
    ) => {
      const latestId = versionList.length > 0 ? versionList[versionList.length - 1].id : null;
      versionList.forEach((v, index) => {
        const isCurrent = v.id === latestId;
        const activeCards = countActive(v.cardData);
        const editedCards = v.cardData.filter((c) => c.isGPT === false).length;

        nodes.push({
          id: v.id,
          type: "versionNode",
          position: {
            x: COLUMN_X[stage],
            y: START_Y + index * ROW_HEIGHT,
          },
          data: {
            versionId: v.id,
            label: v.label || `Version ${index + 1}`,
            stage,
            isCurrent,
            cardCount: activeCards,
            codeCount: v.codeData.length,
            conceptCount: v.conceptData.length,
            lockedCount: 0,
            editedCount: editedCards,
            timestamp: v.timestamp,
            aiSummary: v.aiSummary || "",
            humanInstruction: v.humanInstruction || "",
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        });

        // Vertical edge to next version in same column — with change summary
        if (index > 0) {
          const prevVersion = versionList[index - 1];
          const changeSummary = computeChangeSummary(prevVersion, v, stage);
          edges.push({
            id: `e-${prevVersion.id}-${v.id}`,
            source: prevVersion.id,
            target: v.id,
            type: "smoothstep",
            style: { stroke: STAGE_COLORS[stage].border, strokeWidth: 2 },
            animated: false,
            markerEnd: { type: MarkerType.ArrowClosed, color: STAGE_COLORS[stage].border, width: 12, height: 12 },
            label: changeSummary,
            labelStyle: { fontSize: 9, fill: STAGE_COLORS[stage].text, fontWeight: 600 },
            labelBgStyle: { fill: "white", fillOpacity: 0.9 },
            labelBgPadding: [4, 2] as [number, number],
          });
        }
      });
    };

    createColumnNodes(cardVersions, "card");
    createColumnNodes(codeVersions, "code");
    createColumnNodes(conceptVersions, "concept");

    // Final trajectory: connect the CURRENT (latest) version of each stage
    // This shows the path: e.g., Open Codes v4 → Sub-themes v1 → Themes v2
    const currentCard = cardVersions[cardVersions.length - 1];
    const currentCode = codeVersions[codeVersions.length - 1];
    const currentConcept = conceptVersions[conceptVersions.length - 1];

    if (currentCard && currentCode) {
      edges.push({
        id: `e-trajectory-card-code`,
        source: currentCard.id,
        sourceHandle: "right",
        target: currentCode.id,
        targetHandle: "left",
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed, color: "#CB9180", width: 16, height: 16 },
        style: { stroke: "#CB9180", strokeWidth: 3 },
        animated: true,
      });
    }
    if (currentCode && currentConcept) {
      edges.push({
        id: `e-trajectory-code-concept`,
        source: currentCode.id,
        sourceHandle: "right",
        target: currentConcept.id,
        targetHandle: "left",
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed, color: "#CB9180", width: 16, height: 16 },
        style: { stroke: "#CB9180", strokeWidth: 3 },
        animated: true,
      });
    }

    return { nodes, edges };
  }, [versions, activeVersionId]);

  if (versions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        <div className="text-center">
          <div className="text-4xl mb-3">🔄</div>
          <div className="font-medium">No iteration history yet</div>
          <div className="text-xs mt-1">
            Generate and regenerate codes to see the analysis trajectory
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, minZoom: 0.8, maxZoom: 1.2 }}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.4}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#f0e6e2" gap={20} />
        <Controls
          position="bottom-right"
          style={{ background: "white", borderRadius: "8px" }}
        />
      </ReactFlow>
    </div>
  );
}

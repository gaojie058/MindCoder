import { useMemo } from "react";
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

function VersionNode({ data }: { data: any }) {
  const style = STAGE_COLORS[data.stage as keyof typeof STAGE_COLORS] || STAGE_COLORS.card;
  const isCurrent = data.isCurrent;

  return (
    <div
      className={`rounded-xl border-2 px-4 py-3 min-w-[160px] shadow-sm transition-all relative ${
        isCurrent ? "ring-2 ring-offset-2 ring-[#CB9180]" : ""
      }`}
      style={{
        backgroundColor: style.bg,
        borderColor: isCurrent ? "#CB9180" : style.border,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="left" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0 }} />
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-bold" style={{ color: style.text }}>
          {data.label}
        </span>
        {isCurrent && (
          <span className="text-[9px] bg-[#CB9180] text-white px-1.5 py-0.5 rounded-full">
            CURRENT
          </span>
        )}
      </div>
      <div className="text-[10px] text-gray-600 space-y-0.5">
        <div>📊 {data.cardCount} codes · {data.codeCount} sub-themes · {data.conceptCount} themes</div>
        {data.lockedCount > 0 && <div>🔒 {data.lockedCount} locked</div>}
        {data.editedCount > 0 && <div>✏️ {data.editedCount} edited</div>}
      </div>
      <div className="text-[9px] text-gray-400 mt-1.5">
        {new Date(data.timestamp).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
      {data.changeLabel && (
        <div className="text-[9px] mt-1 px-1.5 py-0.5 bg-white/60 rounded text-gray-500 italic">
          {data.changeLabel}
        </div>
      )}
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

    const COLUMN_X = { card: 0, code: 350, concept: 700 };
    const ROW_HEIGHT = 140;
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
            label: v.label || `Version ${index + 1}`,
            stage,
            isCurrent,
            cardCount: activeCards,
            codeCount: v.codeData.length,
            conceptCount: v.conceptData.length,
            lockedCount: 0, // Would need lockedCardIds from version
            editedCount: editedCards,
            timestamp: v.timestamp,
            changeLabel: v.label,
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        });

        // Vertical edge to next version in same column
        if (index > 0) {
          edges.push({
            id: `e-${versionList[index - 1].id}-${v.id}`,
            source: versionList[index - 1].id,
            target: v.id,
            type: "smoothstep",
            style: { stroke: STAGE_COLORS[stage].border, strokeWidth: 2 },
            animated: false,
            markerEnd: { type: MarkerType.ArrowClosed, color: STAGE_COLORS[stage].border, width: 12, height: 12 },
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
        label: "feeds into",
        labelStyle: { fontSize: 10, fill: "#CB9180", fontWeight: 700 },
        labelBgStyle: { fill: "white", fillOpacity: 0.9 },
        labelBgPadding: [6, 3] as [number, number],
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
        label: "feeds into",
        labelStyle: { fontSize: 10, fill: "#CB9180", fontWeight: 700 },
        labelBgStyle: { fill: "white", fillOpacity: 0.9 },
        labelBgPadding: [6, 3] as [number, number],
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
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
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

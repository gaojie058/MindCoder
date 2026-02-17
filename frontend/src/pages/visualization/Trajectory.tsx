import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  Position,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import useVersionStore from "@/stores/useVersionStore";
import useCardStore from "@/stores/useCardStore";
import useCodeStore from "@/stores/useCodeStore";
import useConceptStore from "@/stores/useConceptStore";
import { CODE_COLORS } from "@/utils/codeColors";

// --- Custom Node Components ---

function CodeNode({ data }: { data: any }) {
  return (
    <div
      className="rounded-lg border px-3 py-2 min-w-[140px] max-w-[180px] shadow-sm"
      style={{ backgroundColor: data.color || "#FDE8EA", borderColor: data.borderColor || "#E8B4B8" }}
    >
      <div className="text-[10px] font-bold truncate" style={{ color: data.textColor || "#8B3A3A" }}>
        {data.label}
      </div>
      <div className="text-[9px] text-gray-500 mt-0.5">{data.segmentCount} segment{data.segmentCount !== 1 ? "s" : ""}</div>
    </div>
  );
}

function SubthemeNode({ data }: { data: any }) {
  return (
    <div
      className="rounded-lg border-2 px-3 py-2 min-w-[150px] max-w-[200px] shadow-sm"
      style={{ backgroundColor: "#E8EFF9", borderColor: "#B4C7E8" }}
    >
      <div className="text-[10px] font-bold text-[#2C4A7C] truncate">{data.label}</div>
      <div className="text-[9px] text-gray-500 mt-0.5">{data.codeCount} code{data.codeCount !== 1 ? "s" : ""}</div>
    </div>
  );
}

function ThemeNode({ data }: { data: any }) {
  return (
    <div
      className="rounded-xl border-2 px-4 py-3 min-w-[160px] max-w-[220px] shadow-md"
      style={{ backgroundColor: "#E6F5EC", borderColor: "#A8D5BA" }}
    >
      <div className="text-[11px] font-bold text-[#2D6A4F]">{data.label}</div>
      {data.definition && (
        <div className="text-[9px] text-gray-500 mt-1 line-clamp-2">{data.definition}</div>
      )}
      <div className="text-[9px] text-[#2D6A4F] mt-1 font-medium">{data.subthemeCount} sub-theme{data.subthemeCount !== 1 ? "s" : ""}</div>
    </div>
  );
}

function VersionBadge({ data }: { data: any }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white/80 px-3 py-2 min-w-[120px] shadow-sm text-center">
      <div className="text-[9px] text-gray-400 uppercase tracking-wider">{data.stage}</div>
      <div className="text-xs font-bold text-[#8B5E4B] mt-0.5">v{data.versionNum}</div>
      <div className="text-[9px] text-gray-400">{data.timestamp}</div>
    </div>
  );
}

const nodeTypes = {
  codeNode: CodeNode,
  subthemeNode: SubthemeNode,
  themeNode: ThemeNode,
  versionBadge: VersionBadge,
};

export default function Trajectory() {
  const { versions, activeVersionId } = useVersionStore();
  const cardData = useCardStore((s) => s.cardData);
  const codeData = useCodeStore((s) => s.codeData);
  const conceptData = useConceptStore((s) => s.conceptData);

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Use current live data (the "final" state)
    const activeCodes = cardData.filter((c) => c.active !== false);
    const activeSubthemes = codeData;
    const activeThemes = conceptData;

    if (activeCodes.length === 0 && activeSubthemes.length === 0 && activeThemes.length === 0) {
      return { nodes: [], edges: [] };
    }

    // Layout constants
    const COL_X = { code: 0, subtheme: 280, theme: 600 };
    const ROW_H = 55;
    const START_Y = 50;

    // Column headers
    nodes.push({
      id: "header-codes",
      type: "default",
      position: { x: COL_X.code + 20, y: 0 },
      data: { label: `Open Codes (${activeCodes.length})` },
      style: { background: "transparent", border: "none", fontSize: "13px", fontWeight: "700", color: "#8B3A3A", width: 180 },
      draggable: false, selectable: false,
    });
    nodes.push({
      id: "header-subthemes",
      type: "default",
      position: { x: COL_X.subtheme + 20, y: 0 },
      data: { label: `Sub-themes (${activeSubthemes.length})` },
      style: { background: "transparent", border: "none", fontSize: "13px", fontWeight: "700", color: "#2C4A7C", width: 180 },
      draggable: false, selectable: false,
    });
    nodes.push({
      id: "header-themes",
      type: "default",
      position: { x: COL_X.theme + 20, y: 0 },
      data: { label: `Themes (${activeThemes.length})` },
      style: { background: "transparent", border: "none", fontSize: "13px", fontWeight: "700", color: "#2D6A4F", width: 180 },
      draggable: false, selectable: false,
    });

    // Build a mapping: card ID → which subtheme(s) it belongs to
    const cardToSubtheme = new Map<string, string[]>();
    activeSubthemes.forEach((sub) => {
      Object.keys(sub.data || {}).forEach((cardId) => {
        if (!cardToSubtheme.has(cardId)) cardToSubtheme.set(cardId, []);
        cardToSubtheme.get(cardId)!.push(sub.id);
      });
    });

    // Build mapping: subtheme ID → which theme(s) it belongs to
    const subthemeToTheme = new Map<string, string[]>();
    activeThemes.forEach((theme) => {
      Object.keys(theme.codes || {}).forEach((codeId) => {
        if (!subthemeToTheme.has(codeId)) subthemeToTheme.set(codeId, []);
        subthemeToTheme.get(codeId)!.push(theme.id);
      });
    });

    // Create Open Code nodes
    activeCodes.forEach((card, index) => {
      const colorEntry = CODE_COLORS[index % CODE_COLORS.length];
      nodes.push({
        id: `card-${card.id}`,
        type: "codeNode",
        position: { x: COL_X.code, y: START_Y + index * ROW_H },
        data: {
          label: `#${index + 1} ${card.name}`,
          segmentCount: card.topics?.length || 0,
          color: colorEntry.light,
          borderColor: colorEntry.bg,
          textColor: colorEntry.text,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
    });

    // Create Sub-theme nodes
    activeSubthemes.forEach((sub, index) => {
      const codeCount = Object.keys(sub.data || {}).length;
      nodes.push({
        id: `sub-${sub.id}`,
        type: "subthemeNode",
        position: { x: COL_X.subtheme, y: START_Y + index * ROW_H },
        data: {
          label: sub.name,
          codeCount,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
    });

    // Create Theme nodes
    activeThemes.forEach((theme, index) => {
      const subthemeCount = Object.keys(theme.codes || {}).length;
      nodes.push({
        id: `theme-${theme.id}`,
        type: "themeNode",
        position: { x: COL_X.theme, y: START_Y + index * (ROW_H + 20) },
        data: {
          label: theme.name,
          definition: theme.definition,
          subthemeCount,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
    });

    // Edges: Open Codes → Sub-themes
    activeCodes.forEach((card) => {
      const subIds = cardToSubtheme.get(card.id) || [];
      subIds.forEach((subId) => {
        edges.push({
          id: `e-card${card.id}-sub${subId}`,
          source: `card-${card.id}`,
          target: `sub-${subId}`,
          type: "smoothstep",
          style: { stroke: "#B4C7E8", strokeWidth: 1.5, opacity: 0.6 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#B4C7E8", width: 12, height: 12 },
        });
      });
    });

    // Edges: Sub-themes → Themes
    activeSubthemes.forEach((sub) => {
      const themeIds = subthemeToTheme.get(sub.id) || [];
      themeIds.forEach((themeId) => {
        edges.push({
          id: `e-sub${sub.id}-theme${themeId}`,
          source: `sub-${sub.id}`,
          target: `theme-${themeId}`,
          type: "smoothstep",
          style: { stroke: "#A8D5BA", strokeWidth: 2, opacity: 0.7 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#A8D5BA", width: 14, height: 14 },
        });
      });
    });

    // Add version history badges below the main flow
    if (versions.length > 0) {
      const BADGE_Y = START_Y + Math.max(activeCodes.length, activeSubthemes.length, activeThemes.length) * ROW_H + 40;

      nodes.push({
        id: "history-header",
        type: "default",
        position: { x: COL_X.code + 20, y: BADGE_Y },
        data: { label: `📜 Version History (${versions.length} snapshots)` },
        style: { background: "transparent", border: "none", fontSize: "11px", fontWeight: "600", color: "#8B5E4B", width: 300 },
        draggable: false, selectable: false,
      });

      versions.forEach((v, index) => {
        nodes.push({
          id: `version-${v.id}`,
          type: "versionBadge",
          position: { x: index * 160, y: BADGE_Y + 30 },
          data: {
            stage: v.step,
            versionNum: index + 1,
            timestamp: new Date(v.timestamp).toLocaleString("en-US", {
              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
            }),
          },
        });

        if (index > 0) {
          edges.push({
            id: `e-vh-${index}`,
            source: `version-${versions[index - 1].id}`,
            target: `version-${v.id}`,
            type: "smoothstep",
            style: { stroke: "#ddd", strokeWidth: 1.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#ccc", width: 10, height: 10 },
          });
        }
      });
    }

    return { nodes, edges };
  }, [cardData, codeData, conceptData, versions, activeVersionId]);

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        <div className="text-center">
          <div className="text-4xl mb-3">🔄</div>
          <div className="font-medium">No analysis data yet</div>
          <div className="text-xs mt-1">
            Generate codes, sub-themes, and themes to see the analysis trajectory
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
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
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

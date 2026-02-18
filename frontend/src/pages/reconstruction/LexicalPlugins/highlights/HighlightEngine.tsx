/**
 * HighlightEngine — Core highlight plugin.
 *
 * Single source of truth: Lexical model styles.
 * On any cardData/file change → clear all highlights → rebuild from scratch.
 *
 * Interactions:
 *  1. Click editor text → dispatch navigateToCard → CodeLabel receives + highlights
 *  2. Click CodeLabel → dispatch selectCodeInEditor → this plugin shows selection
 *  3. Delete code → cardData changes → auto re-highlight (deleted code's highlight disappears)
 *  4. Add code from selection → cardData changes → auto re-highlight (new code gets color)
 */
import { useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getRoot,
  $isTextNode,
  $createTextNode,
  TextNode,
} from "lexical";
import useCardStore from "@/stores/useCardStore";
import useEditorStore from "@/stores/useEditorStore";
import { getColorForCardId, invalidateColorCache } from "./HighlightColors";
import { findMatch, findSpanningMatch } from "./TextMatcher";

interface Datapoint {
  cardId: string;
  content: string;
  topicId: string;
}

// ─── Helpers ──────────────────────────────────────────────

function collectTextNodes(root: ReturnType<typeof $getRoot>): TextNode[] {
  const nodes: TextNode[] = [];
  const walk = (node: any) => {
    if ($isTextNode(node)) {
      nodes.push(node);
    } else if (node.getChildren) {
      node.getChildren().forEach(walk);
    }
  };
  root.getChildren().forEach(walk);
  return nodes;
}

function clearAllHighlights(root: ReturnType<typeof $getRoot>) {
  const walk = (node: any) => {
    if ($isTextNode(node)) {
      const style = node.getStyle();
      if (style && style.includes("background-color")) {
        const text = node.getTextContent();
        const plain = $createTextNode(text);
        if (node.isAttached()) node.replace(plain);
      }
    } else if (node.getChildren) {
      // Copy children array because we may mutate it during iteration
      [...node.getChildren()].forEach(walk);
    }
  };
  root.getChildren().forEach(walk);
}

function splitAndHighlight(
  node: TextNode,
  startOffset: number,
  endOffset: number,
  cardId: string,
  workingNodes: TextNode[]
) {
  const text = node.getTextContent();
  const color = getColorForCardId(cardId);
  const style = `background-color: ${color}; cursor: pointer; --card-id: ${cardId};`;

  const before = text.substring(0, startOffset);
  const highlighted = text.substring(startOffset, endOffset);
  const after = text.substring(endOffset);

  if (!node.isAttached()) return;

  const newNodes: TextNode[] = [];
  if (before) newNodes.push($createTextNode(before));

  const hlNode = $createTextNode(highlighted);
  hlNode.setStyle(style);
  newNodes.push(hlNode);

  if (after) newNodes.push($createTextNode(after));

  // Replace original
  node.replace(newNodes[0]);
  for (let i = 1; i < newNodes.length; i++) {
    newNodes[i - 1].insertAfter(newNodes[i]);
  }

  // Update working set: remove original, add non-highlighted parts
  const idx = workingNodes.indexOf(node);
  if (idx >= 0) {
    const replacements: TextNode[] = [];
    if (before) replacements.push(newNodes[0]);
    if (after) replacements.push(newNodes[newNodes.length - 1]);
    workingNodes.splice(idx, 1, ...replacements);
  }
}

// ─── Main Plugin ──────────────────────────────────────────

export default function HighlightEnginePlugin({
  currentFileName: _currentFileName,
}: {
  currentFileName: string;
}) {
  const [editor] = useLexicalComposerContext();
  const { selectedFile } = useEditorStore();
  const cardData = useCardStore((s) => s.cardData);
  const fileCardMap = useCardStore((s) => s.fileCardMap);
  const rafRef = useRef<number>(0);

  // ── Core: apply highlights whenever cards or file change ──
  useEffect(() => {
    if (!selectedFile) return;

    const fileCardIds = new Set(
      (fileCardMap[selectedFile] || []) as string[]
    );
    const activeCards = cardData.filter(
      (c) => fileCardIds.has(c.id) && c.active !== false
    );

    // Invalidate color cache so colors match current active order
    invalidateColorCache();

    // Collect all datapoints, longest first (prevent short matches eating long ones)
    const datapoints: Datapoint[] = activeCards
      .flatMap((card) =>
        (card.topics || []).map((t: any) => ({
          cardId: card.id,
          content: t.content || "",
          topicId: t.id || t.uuid || "",
        }))
      )
      .filter((d) => d.content.trim().length > 0)
      .sort((a, b) => b.content.length - a.content.length);

    // Use rAF to ensure Lexical content is rendered
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      editor.update(
        () => {
          const root = $getRoot();

          // Step 1: Clear all existing highlights
          clearAllHighlights(root);

          if (datapoints.length === 0) return;

          // Step 2: Collect fresh text nodes (after clearing)
          const textNodes = collectTextNodes(root);
          if (textNodes.length === 0) return;

          // Step 3: Match and highlight each datapoint
          const matched = new Set<string>();
          const workingNodes = [...textNodes];

          for (const dp of datapoints) {
            if (matched.has(dp.content)) continue;

            // Try single-node match
            let found = false;
            for (const node of [...workingNodes]) {
              if (!node.isAttached()) continue;
              const text = node.getTextContent();
              if (text.length < 5) continue;

              const result = findMatch(text, dp.content);
              if (result) {
                splitAndHighlight(
                  node,
                  result.startOffset,
                  result.endOffset,
                  dp.cardId,
                  workingNodes
                );
                matched.add(dp.content);
                found = true;
                break;
              }
            }

            // Try spanning match (2-4 adjacent nodes)
            if (!found) {
              const segments = workingNodes
                .filter((n) => n.isAttached())
                .map((n) => n.getTextContent());
              const spanResult = findSpanningMatch(segments, dp.content);
              if (spanResult) {
                // Highlight all involved nodes
                const color = getColorForCardId(dp.cardId);
                const style = `background-color: ${color}; cursor: pointer; --card-id: ${dp.cardId};`;
                for (
                  let i = spanResult.startSegment;
                  i <= spanResult.endSegment;
                  i++
                ) {
                  const node = workingNodes[i];
                  if (node && node.isAttached()) {
                    node.setStyle(style);
                  }
                }
                matched.add(dp.content);
              }
            }
          }
        },
        { tag: "highlight-engine" }
      );
    });

    return () => cancelAnimationFrame(rafRef.current);
  }, [editor, selectedFile, cardData, fileCardMap]);

  // ── Interaction 1: Click highlighted text → navigate to code ──
  useEffect(() => {
    const rootEl = editor.getRootElement();
    if (!rootEl) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const cardId = extractCardId(target);
      if (!cardId) return;

      e.preventDefault();
      e.stopPropagation();

      window.dispatchEvent(
        new CustomEvent("navigateToCard", {
          detail: { cardId },
        })
      );
    };

    rootEl.addEventListener("click", handleClick);
    return () => rootEl.removeEventListener("click", handleClick);
  }, [editor]);

  // ── Interaction 2: selectCodeInEditor → persistent highlight + dim others ──
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const handleSelect = (e: CustomEvent) => {
      // Clean up previous selection visuals
      if (cleanup) {
        cleanup();
        cleanup = null;
      }

      const { codeId, color } = e.detail || {};
      const rootEl = editor.getRootElement();
      if (!codeId || !rootEl) return;

      const selectColor = color || "#CB9180";
      const modified: { el: HTMLElement; origOpacity: string; origBoxShadow: string }[] = [];

      // Find all highlighted elements, dim non-selected, emphasize selected
      const allHighlighted = rootEl.querySelectorAll(
        '[style*="background-color"]'
      );
      allHighlighted.forEach((el: Element) => {
        const htmlEl = el as HTMLElement;
        const elCardId = extractCardId(htmlEl);
        const origOpacity = htmlEl.style.opacity;
        const origBoxShadow = htmlEl.style.boxShadow;

        if (elCardId === codeId) {
          htmlEl.style.boxShadow = `inset 0 -2px 0 0 ${selectColor}`;
        } else {
          htmlEl.style.opacity = "0.3";
        }
        modified.push({ el: htmlEl, origOpacity, origBoxShadow });
      });

      // Scroll to first selected element
      const firstSelected = rootEl.querySelector(
        `[style*="--card-id: ${codeId}"], [style*="--card-id:${codeId}"]`
      ) as HTMLElement | null;
      if (firstSelected) {
        firstSelected.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      cleanup = () => {
        modified.forEach(({ el, origOpacity, origBoxShadow }) => {
          el.style.opacity = origOpacity;
          el.style.boxShadow = origBoxShadow;
        });
      };
    };

    window.addEventListener(
      "selectCodeInEditor",
      handleSelect as EventListener
    );
    return () => {
      if (cleanup) cleanup();
      window.removeEventListener(
        "selectCodeInEditor",
        handleSelect as EventListener
      );
    };
  }, [editor]);

  return null;
}

// ─── Utility ──────────────────────────────────────────────

function extractCardId(el: HTMLElement): string | null {
  const style = el.getAttribute("style") || "";
  const match = style.match(/--card-id:\s*([^;}\s]+)/);
  return match?.[1]?.trim() || null;
}

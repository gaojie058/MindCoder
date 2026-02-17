import { registerCodeHighlighting } from "@lexical/code";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useState, useRef, useMemo } from "react";
import {
  $getRoot,
  $isTextNode,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  TextNode,
} from "lexical";
import { createPortal } from "react-dom";
import useCardStore from "@/stores/useCardStore";
import useEditorStore from "@/stores/useEditorStore";
import { useGenerateStore } from "@/api/useGenerate";
import * as wuzzy from "wuzzy";

// Shared cache so tooltip plugin can use the same set of cards used by highlighter
const derivedCardsForFile: Record<string, any[]> = {};
declare module "lexical" {
  interface TextNode {
    __cardInfo?: {
      id: string;
      name: string;
      topicId: string;
    };
  }
}

// export default function CodeHighlightPlugin() {
//   const [editor] = useLexicalComposerContext();
//   useEffect(() => {
//     return registerCodeHighlighting(editor);
//   }, [editor]);
//   return null;
// }

import { CODE_COLORS } from "@/utils/codeColors";

// Build a cardId → color map based on active card order (matches CodeLabel's colorIndex)
let _cardColorMap: Record<string, string> = {};

function rebuildCardColorMap() {
  const { cardData } = useCardStore.getState();
  const activeCards = cardData.filter((c) => c.active);
  _cardColorMap = {};
  activeCards.forEach((card, index) => {
    _cardColorMap[card.id] = CODE_COLORS[index % CODE_COLORS.length].bg;
    // Also map each datapoint content to the same color
    card.topics.forEach((t) => {
      _cardColorMap[`content:${t.content.substring(0, 60)}`] = CODE_COLORS[index % CODE_COLORS.length].bg;
    });
  });
}

function getColorForCard(cardId: string): string {
  if (!_cardColorMap[cardId]) rebuildCardColorMap();
  return _cardColorMap[cardId] || CODE_COLORS[0].bg;
}

function getConsistentColorForString(str: string): string {
  // Try to find by content prefix
  const key = `content:${str.substring(0, 60)}`;
  if (_cardColorMap[key]) return _cardColorMap[key];
  // Rebuild and try again
  rebuildCardColorMap();
  if (_cardColorMap[key]) return _cardColorMap[key];
  // Fallback
  return CODE_COLORS[0].bg;
}

function getRandomColor(): string {
  return CODE_COLORS[Math.floor(Math.random() * CODE_COLORS.length)].bg;
}

export const HighlightTextPlugin = ({ searchStr }) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!searchStr) return;

    editor.update(() => {
      const root = $getRoot();
      const textNodes: TextNode[] = [];

      // Collect all text nodes
      root.getChildren().forEach((node) => {
        if ($isTextNode(node)) {
          textNodes.push(node);
        }
      });

      // Highlight matches
      textNodes.forEach((textNode) => {
        const text = textNode.getTextContent();
        const regex = new RegExp(searchStr, "gi");
        let match;
        const newNodes: TextNode[] = [];
        let lastIndex = 0;

        while ((match = regex.exec(text)) !== null) {
          const start = match.index;
          const end = start + searchStr.length;

          // Add text before the match
          if (start > lastIndex) {
            newNodes.push($createTextNode(text.slice(lastIndex, start)));
          }

          // Add highlighted text with a random color instead of yellow
          const highlightedNode = $createTextNode(text.slice(start, end));
          const highlightColor = getRandomColor();
          highlightedNode.setStyle(`background-color: ${highlightColor}`);
          newNodes.push(highlightedNode);

          lastIndex = end;
        }

        // Add remaining text
        if (lastIndex < text.length) {
          newNodes.push($createTextNode(text.slice(lastIndex)));
        }

        // Replace the original node with new nodes
        if (newNodes.length > 0) {
          textNode.replace(newNodes[0]);
          for (let i = 1; i < newNodes.length; i++) {
            newNodes[i - 1].insertAfter(newNodes[i]);
          }
        }
      });
    });
    return registerCodeHighlighting(editor);
  }, [editor, searchStr]);

  return null;
};

export function DatapointHighlightPlugin({
  currentFileName,
}: {
  currentFileName: string;
}) {
  const { getCardsForFile } = useCardStore();
  const [editor] = useLexicalComposerContext();
  const matchStatsRef = useRef({ total: 0, found: 0 });
  const { selectedFile } = useEditorStore();
  const highlightResultsRef = useRef(new Map());
  const lastProcessedFileRef = useRef(null);
  const highlightedContentRef = useRef(new Set());
  const isProcessingRef = useRef(false);
  const fileSpecificCardsRef = useRef([]);
  const { processedFiles, hasFullGenerated } = useGenerateStore();
  const [forceUpdate, setForceUpdate] = useState(0);
  const lastProcessingTimestampRef = useRef(0);
  const prevHasFullGeneratedRef = useRef(false);
  const processedResetForFileRef = useRef<Record<string, boolean>>({});
  const lastResetTsRef = useRef(0);
  const prevSelectedFileRef = useRef<string | null>(null);
  const lastResetPerFileRef = useRef<Record<string, number>>({});
  const coverageLoggedForFileRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    rebuildCardColorMap(); // Sync colors with CodeLabel order
    const cards = getCardsForFile(currentFileName) || [];
    fileSpecificCardsRef.current = cards;
    // try {
    //   const totalDatapoints = cards.reduce(
    //     (sum, card) => sum + (card.topics?.length || 0),
    //     0
    //   );
    //   console.log(
    //     "[DatapointHighlightPlugin] currentFileName changed:",
    //     currentFileName,
    //     "cards:",
    //     cards.length,
    //     "datapoints:",
    //     totalDatapoints
    //   );
    // } catch (_) {
    //   // no-op
    // }
  }, [getCardsForFile, currentFileName]);

  // Re-highlight when cards are added/deleted
  useEffect(() => {
    const handler = () => {
      // Refresh active cards
      const cards = getCardsForFile(currentFileName) || [];
      fileSpecificCardsRef.current = cards;
      const activeCardIds = new Set(cards.filter(c => c.active !== false).map(c => c.id));

      highlightedContentRef.current.clear();
      highlightResultsRef.current.clear();
      lastProcessedFileRef.current = null;
      isProcessingRef.current = false;
      rebuildCardColorMap();

      // Clear highlights for deleted cards via DOM (more reliable than Lexical node replacement)
      const rootEl = editor.getRootElement();
      if (rootEl) {
        const highlighted = rootEl.querySelectorAll('[style*="background-color"]');
        highlighted.forEach((el: Element) => {
          const htmlEl = el as HTMLElement;
          const style = htmlEl.getAttribute("style") || "";
          const cardIdMatch = style.match(/--card-id:\s*(\S+)/);
          const cardId = cardIdMatch?.[1]?.replace(";", "");
          if (cardId && !activeCardIds.has(cardId)) {
            htmlEl.style.backgroundColor = "";
            htmlEl.style.cursor = "";
            htmlEl.style.boxShadow = "";
            htmlEl.removeAttribute("data-card-id");
          }
        });
      }

      // Also clear via Lexical for any we missed
      editor.update(() => {
        const root = $getRoot();
        const clearNode = (node) => {
          if ($isTextNode(node)) {
            const style = node.getStyle();
            if (style && style.includes("--card-id")) {
              const cardIdMatch = style.match(/--card-id:\s*(\S+)/);
              const cardId = cardIdMatch?.[1]?.replace(";", "");
              if (cardId && !activeCardIds.has(cardId)) {
                node.setStyle("");
              }
            }
          } else if (node.getChildren) {
            node.getChildren().forEach(clearNode);
          }
        };
        root.getChildren().forEach(clearNode);
      });

      setForceUpdate((prev) => prev + 1);
    };
    window.addEventListener("cardDataChanged", handler);
    return () => window.removeEventListener("cardDataChanged", handler);
  }, [editor, getCardsForFile, currentFileName]);

  useEffect(() => {
    // Reset highlights ONLY when selected file changes, to avoid thrashing
    const now = Date.now();
    const fileChanged =
      !!selectedFile && prevSelectedFileRef.current !== selectedFile;
    if (!fileChanged) return;

    // console.log(
    //   "[DatapointHighlightPlugin] reset highlights triggered (file change)",
    //   { selectedFile }
    // );

    // Clear all highlight data
    highlightResultsRef.current.clear();
    highlightedContentRef.current.clear();
    lastProcessedFileRef.current = null;
    isProcessingRef.current = false;

    // Force a complete re-highlight by updating timestamp and triggering re-render
    lastProcessingTimestampRef.current = now;
    lastResetTsRef.current = now;
    if (selectedFile) {
      prevSelectedFileRef.current = selectedFile;
    }
    setForceUpdate((prev) => prev + 1);

    // Clear any existing highlights in the editor
    editor.update(() => {
      const root = $getRoot();

      const clearHighlightsFromNode = (node) => {
        if ($isTextNode(node)) {
          const style = node.getStyle();
          if (style && style.includes("background-color")) {
            const text = node.getTextContent();
            const newNode = $createTextNode(text);
            if (node.isAttached()) {
              node.replace(newNode);
            }
          } else if (node.__cardInfo) {
            const text = node.getTextContent();
            const newNode = $createTextNode(text);
            if (node.isAttached()) {
              node.replace(newNode);
            }
          }
        } else {
          const children = node.getChildren();
          children.forEach(clearHighlightsFromNode);
        }
      };

      root.getChildren().forEach(clearHighlightsFromNode);
    });
  }, [editor, selectedFile]);

  // The main highlighting effect - modified to be more efficient
  useEffect(() => {
    const debugCards = fileSpecificCardsRef.current || [];
    try {
      const debugTotalDps = debugCards.reduce(
        (sum, c) => sum + (c.topics?.length || 0),
        0
      );
      console.log("[DatapointHighlightPlugin] highlight pass start", {
        selectedFile,
        cards: debugCards.length,
        datapoints: debugTotalDps,
      });
    } catch (_) {
      // no-op
    }

    if (isProcessingRef.current) {
      console.log("[DatapointHighlightPlugin] skip highlight", {
        selectedFile,
        reason: "processing",
      });
      return;
    }

    const fileSpecificCards = fileSpecificCardsRef.current;
    if (!fileSpecificCards || !fileSpecificCards.length || !selectedFile) {
      // console.log("[DatapointHighlightPlugin] no cards or no selectedFile", {
      //   selectedFile,
      //   cards: fileSpecificCards ? fileSpecificCards.length : 0,
      // });
      return;
    }

    const totalDatapoints = fileSpecificCards.reduce(
      (sum, card) => sum + (card.topics?.length || 0),
      0
    );

    matchStatsRef.current = { total: totalDatapoints, found: 0 };

    // Store the highlight state for this file to prevent duplicate highlighting
    highlightResultsRef.current.set(selectedFile, true);

    // Build datapoints per pass inside highlightMatches so we can fallback if mapping is wrong

    const highlightMatches = () => {
      // mark processing for this run
      isProcessingRef.current = true;
      editor.update(() => {
        const root = $getRoot();
        let foundCount = 0;

        // Collect all text nodes first
        const textNodes = [];
        const traverseNodes = (node) => {
          if ($isTextNode(node)) {
            textNodes.push(node);
          } else {
            const children = node.getChildren();
            children.forEach(traverseNodes);
          }
        };

        root.getChildren().forEach(traverseNodes);

        const fullText = root.getTextContent();
        // console.log("[DatapointHighlightPlugin] editor textNodes", {
        //   count: textNodes.length,
        //   textLength: (fullText && fullText.length) || 0,
        // });

        if (textNodes.length === 0) {
          // console.log(
          //   "[DatapointHighlightPlugin] no text nodes yet, will retry shortly"
          // );
          const currentFile = selectedFile || "__unknown__";
          // simple capped backoff per file
          (window as any).__lexicalRetryNoTextNodes =
            (window as any).__lexicalRetryNoTextNodes || {};
          const prev =
            (window as any).__lexicalRetryNoTextNodes[currentFile] || 0;
          if (prev < 5) {
            (window as any).__lexicalRetryNoTextNodes[currentFile] = prev + 1;
            setTimeout(() => {
              isProcessingRef.current = false;
              highlightMatches();
            }, 250 + prev * 150);
          } else {
            // console.warn(
            //   "[DatapointHighlightPlugin] giving up retry (no text nodes)"
            // );
          }
          return;
        }

        const workingTextNodes = [...textNodes];

        // Build datapoints list, with fallback if mapping seems wrong
        const normalizedRoot = normalizeText(root.getTextContent() || "");
        let cardsForPass = fileSpecificCards;
        const mappedDpNorms: Array<{ norm: string; raw: string }> = [];
        cardsForPass.forEach((c) =>
          (c.topics || []).forEach((t) =>
            mappedDpNorms.push({
              norm: normalizeText(t.content || ""),
              raw: t.content || "",
            })
          )
        );
        const mappedExists = mappedDpNorms.filter(
          (d) => d.norm && normalizedRoot.includes(d.norm)
        ).length;

        // One-time per-file coverage debug
        try {
          const fileKey = selectedFile || "__unknown__";
          if (!coverageLoggedForFileRef.current[fileKey]) {
            console.log("[DatapointHighlightPlugin] coverage", {
              selectedFile,
              datapoints: mappedDpNorms.length,
              existsInDoc: mappedExists,
              sampleDp: mappedDpNorms.slice(0, 3),
            });
            coverageLoggedForFileRef.current[fileKey] = true;
          }
        } catch (_) {
          // Ignore coverage logging errors
        }

        const mappedTotal = mappedDpNorms.length;
        const coverageRatio = mappedTotal > 0 ? mappedExists / mappedTotal : 0;

        if (mappedExists === 0 || coverageRatio < 0.5) {
          const allCards = (useCardStore.getState().cardData || []) as any[];
          const fallbackCards = allCards.filter((card) =>
            (card.topics || []).some((t) =>
              normalizedRoot.includes(normalizeText(t.content || ""))
            )
          );
          const fallbackCount = fallbackCards.reduce(
            (acc, c) =>
              acc +
              (c.topics || []).filter((t) =>
                normalizedRoot.includes(normalizeText(t.content || ""))
              ).length,
            0
          );
          if (fallbackCards.length > 0 && fallbackCount >= mappedExists) {
            // console.log(
            //   "[DatapointHighlightPlugin] using fallback cards derived from document",
            //   {
            //     count: fallbackCards.length,
            //     fallbackCount,
            //     mappedExists,
            //     coverageRatio,
            //   }
            // );
            cardsForPass = fallbackCards;
          }
        }

        // Sort datapoints by length (longest first) and de-duplicate by normalized content
        const sortedDatapoints: Array<{
          card: any;
          datapoint: any;
          length: number;
        }> = [];
        const seenNorm = new Set<string>();
        cardsForPass.forEach((card) => {
          if (!card.topics) return;
          card.topics.forEach((datapoint) => {
            if (!datapoint.content || !datapoint.content.trim()) return;
            const norm = normalizeText(datapoint.content);
            if (seenNorm.has(norm)) return;
            seenNorm.add(norm);
            sortedDatapoints.push({
              card,
              datapoint,
              length: datapoint.content.length,
            });
          });
        });
        sortedDatapoints.sort((a, b) => b.length - a.length);
        try {
          if (selectedFile) {
            derivedCardsForFile[selectedFile] = cardsForPass;
            window.dispatchEvent(
              new CustomEvent("derivedCardsUpdated", {
                detail: { fileName: selectedFile },
              })
            );
          }
        } catch (_) {
          // Ignore event dispatch errors
        }

        // Process datapoints in order (longest first)
        sortedDatapoints.forEach(({ card, datapoint }) => {
          // Skip already highlighted content
          if (highlightedContentRef.current.has(datapoint.content)) {
            foundCount++;
            return;
          }

          // Find the best match in CURRENT working set of nodes
          const bestMatch = findBestTextMatch(
            workingTextNodes,
            datapoint.content
          );

          if (bestMatch && bestMatch.node) {
            try {
              const textNode = bestMatch.node;

              // CRITICAL FIX: Check if node is still attached before manipulating
              if (!textNode.isAttached()) {
                return;
              }

              // IMPROVED VALIDATION: Additional check for match quality
              // Only proceed with high quality matches (70%+ for exact, 80%+ for fuzzy)
              if (
                bestMatch.matchType !== "exact" &&
                bestMatch.matchType !== "contained" &&
                bestMatch.matchType !== "spanning" &&
                bestMatch.ratio < 80
              ) {
                return;
              }

              const text = textNode.getTextContent();
              const normalizedDatapoint = normalizeText(datapoint.content);
              const normalizedText = normalizeText(text);

              // Handle spanning nodes case (match across multiple nodes)
              if (
                bestMatch.matchType === "spanning" &&
                bestMatch.spanningNodes
              ) {
                const highlightColor = getColorForCard(card.id);
                // Highlight ALL spanning nodes, not just the first
                for (const spanNode of bestMatch.spanningNodes) {
                  if (spanNode.isAttached()) {
                    spanNode.setStyle(
                      `background-color: ${highlightColor} !important; cursor: pointer; --card-id: ${card.id};`
                    );
                    // Set data attribute for tooltip
                    const spanKey = spanNode.getKey();
                    const spanDom = editor.getElementByKey(spanKey);
                    if (spanDom) {
                      spanDom.setAttribute("data-card-id", card.id);
                    }
                  }
                }

                foundCount++;
                highlightedContentRef.current.add(datapoint.content);
                return;
              }

              // Find the exact substring position within the text
              let startPos = -1;
              let exactMatch = false;

              // Try to find exact match position
              if (normalizedText.includes(normalizedDatapoint)) {
                startPos = normalizedText.indexOf(normalizedDatapoint);
                exactMatch = true;
              } else if (
                bestMatch.matchType === "exact" &&
                bestMatch.startPos !== undefined
              ) {
                startPos = bestMatch.startPos;
                exactMatch = true;
              } else if (bestMatch.matchType === "contained") {
                // Handle the case where the datapoint contains the text
                exactMatch = true;
                startPos = 0;
              }

              if (exactMatch && startPos >= 0) {
                // Get the exact string in the original casing
                const endPos = startPos + normalizedDatapoint.length;
                const originalStartPos = findOriginalPosition(
                  text,
                  normalizedText,
                  startPos
                );
                const originalEndPos = findOriginalPosition(
                  text,
                  normalizedText,
                  endPos
                );

                // Adjust end position if needed
                const adjustedEndPos = Math.min(originalEndPos, text.length);
                const originalExactContent = text.substring(
                  originalStartPos,
                  adjustedEndPos
                );

                // SAFER NODE MANIPULATION: Create all nodes first before modifying the DOM
                const beforeNode = $createTextNode(
                  text.substring(0, originalStartPos)
                );
                const matchNode = $createTextNode(originalExactContent);
                const afterNode = $createTextNode(
                  text.substring(adjustedEndPos)
                );

                // Style only the matching part
                const highlightColor = getColorForCard(card.id);
                matchNode.setStyle(
                  `background-color: ${highlightColor} !important; cursor: pointer; --card-id: ${card.id};`
                );

                // Card info will be attached to DOM later by tooltip plugin via content matching
                matchNode.setFormat("highlight");

                // SAFER NODE REPLACEMENT: Use a more reliable approach
                if (textNode.isAttached()) {
                  // Replace the original node with the new nodes in a safer sequence
                  if (beforeNode.getTextContent()) {
                    textNode.insertBefore(beforeNode);
                  }

                  if (beforeNode.isAttached()) {
                    beforeNode.insertAfter(matchNode);
                  } else {
                    textNode.insertBefore(matchNode);
                  }

                  if (afterNode.getTextContent()) {
                    if (matchNode.isAttached()) {
                      matchNode.insertAfter(afterNode);
                    } else if (beforeNode.isAttached()) {
                      beforeNode.insertAfter(afterNode);
                    } else {
                      textNode.insertBefore(afterNode);
                    }
                  }

                  // Only remove the original node after all insertions are complete
                  textNode.remove();
                }

                // IMPORTANT CHANGE: Update our working set more safely
                const nodeIndex = workingTextNodes.findIndex(
                  (n) => n === textNode
                );
                if (nodeIndex !== -1) {
                  // Remove the original node
                  workingTextNodes.splice(nodeIndex, 1);

                  // Add the new nodes if they have content and are attached
                  const newNodesToProcess = [];
                  if (
                    beforeNode.getTextContent().trim() &&
                    beforeNode.isAttached()
                  ) {
                    newNodesToProcess.push(beforeNode);
                  }
                  if (
                    afterNode.getTextContent().trim() &&
                    afterNode.isAttached()
                  ) {
                    newNodesToProcess.push(afterNode);
                  }

                  // Add these nodes back to our working set
                  if (newNodesToProcess.length > 0) {
                    workingTextNodes.splice(nodeIndex, 0, ...newNodesToProcess);
                  }
                }
              } else {
                // Fuzzy matching logic - with the same safety improvements
                const fuzzyMatchSubstring = findFuzzyMatchSubstring(
                  text,
                  datapoint.content
                );

                if (fuzzyMatchSubstring && textNode.isAttached()) {
                  // We found a fuzzy match within the text
                  const substring = fuzzyMatchSubstring.match;
                  const subStart = fuzzyMatchSubstring.startPos;
                  const subEnd = subStart + substring.length;

                  // Split into before, match, and after
                  const beforeNode = $createTextNode(
                    text.substring(0, subStart)
                  );
                  const matchNode = $createTextNode(substring);
                  const afterNode = $createTextNode(text.substring(subEnd));

                  // Style only the matching part
                  const highlightColor = getColorForCard(card.id);
                  matchNode.setStyle(
                    `background-color: ${highlightColor} !important; cursor: pointer; --card-id: ${card.id};`
                  );

                  // Card info will be attached to DOM later by tooltip plugin via content matching
                  matchNode.setFormat("highlight");

                  // SAFER NODE REPLACEMENT: Same approach as above
                  if (textNode.isAttached()) {
                    // Replace the original node with the new nodes in a safer sequence
                    if (beforeNode.getTextContent()) {
                      textNode.insertBefore(beforeNode);
                    }

                    if (beforeNode.isAttached()) {
                      beforeNode.insertAfter(matchNode);
                    } else {
                      textNode.insertBefore(matchNode);
                    }

                    if (afterNode.getTextContent()) {
                      if (matchNode.isAttached()) {
                        matchNode.insertAfter(afterNode);
                      } else if (beforeNode.isAttached()) {
                        beforeNode.insertAfter(afterNode);
                      } else {
                        textNode.insertBefore(afterNode);
                      }
                    }

                    // Only remove the original node after all insertions are complete
                    textNode.remove();
                  }

                  // IMPORTANT CHANGE: Update our working set more safely
                  const nodeIndex = workingTextNodes.findIndex(
                    (n) => n === textNode
                  );
                  if (nodeIndex !== -1) {
                    // Remove the original node
                    workingTextNodes.splice(nodeIndex, 1);

                    // Add the new nodes if they have content and are attached
                    const newNodesToProcess = [];
                    if (
                      beforeNode.getTextContent().trim() &&
                      beforeNode.isAttached()
                    ) {
                      newNodesToProcess.push(beforeNode);
                    }
                    if (
                      afterNode.getTextContent().trim() &&
                      afterNode.isAttached()
                    ) {
                      newNodesToProcess.push(afterNode);
                    }

                    // Add these nodes back to our working set
                    if (newNodesToProcess.length > 0) {
                      workingTextNodes.splice(
                        nodeIndex,
                        0,
                        ...newNodesToProcess
                      );
                    }
                  }
                } else {
                  // IMPROVED VALIDATION: Much stricter threshold for last resort highlighting
                  // Only highlight whole node if we have a very strong match (90%+)
                  if (bestMatch.ratio >= 90 && textNode.isAttached()) {
                    const highlightColor = getColorForCard(card.id);
                    textNode.setStyle(
                      `background-color: ${highlightColor} !important; cursor: pointer; --card-id: ${card.id};`
                    );

                    // Card info will be attached to DOM later by tooltip plugin via content matching
                  }
                }
              }

              foundCount++;
              highlightedContentRef.current.add(datapoint.content);
            } catch (error) {
              console.error("Error while highlighting node:", error);
            }
          }
        });

        // Update ref instead of state
        matchStatsRef.current.found = foundCount;

        // console.log("[DatapointHighlightPlugin] highlight pass result", {
        //   selectedFile,
        //   found: foundCount,
        //   total: sortedDatapoints.length,
        // });

        // Only mark processed if we actually highlighted something
        if (foundCount > 0) {
          lastProcessedFileRef.current = selectedFile;
          lastProcessingTimestampRef.current = Date.now();
        }
      });

      // Set processing to false after the update is complete
      isProcessingRef.current = false;
    };

    // If we just reset very recently, delay the first pass slightly to wait for content
    const sinceReset = Date.now() - lastResetTsRef.current;
    if (sinceReset < 500) {
      const delayed = setTimeout(() => {
        highlightMatches();
      }, 300);
      // Also run a second delayed attempt for safety
      const delayed2 = setTimeout(() => {
        highlightMatches();
      }, 700);
      return () => {
        clearTimeout(delayed);
        clearTimeout(delayed2);
      };
    } else {
      // Run highlighting immediately
      highlightMatches();
    }

    // NEW: Run multiple highlight passes with increasing leniency
    const timer1 = setTimeout(() => {
      if (highlightedContentRef.current.size < totalDatapoints * 0.9) {
        // console.log("[DatapointHighlightPlugin] retry pass #1", {
        //   highlighted: highlightedContentRef.current.size,
        //   target: Math.floor(totalDatapoints * 0.9),
        // });
        isProcessingRef.current = false;
        highlightMatches();
      }
    }, 1000);

    const timer2 = setTimeout(() => {
      if (highlightedContentRef.current.size < totalDatapoints * 0.95) {
        // console.log("[DatapointHighlightPlugin] retry pass #2", {
        //   highlighted: highlightedContentRef.current.size,
        //   target: Math.floor(totalDatapoints * 0.95),
        // });
        isProcessingRef.current = false;
        highlightMatches();
      }
    }, 2000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      isProcessingRef.current = false;
    };
  }, [editor, selectedFile, forceUpdate]);

  return null;
}

// Helper functions for text normalization and matching
function normalizeText(text) {
  return text
    .trim()
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/[\u2018\u2019]/g, "'") // Normalize single quotes
    .replace(/[\u201C\u201D]/g, '"') // Normalize double quotes
    .replace(/[.,;:!?()[\]{}]/g, " ") // Replace punctuation with spaces
    .replace(/\u00A0/g, " ") // Replace non-breaking spaces
    .toLowerCase() // Case insensitive comparison
    .trim(); // Remove leading/trailing whitespace
}

// Improved text matching using token-based approach plus exact matching
function findBestTextMatch(textNodes, datapointContent) {
  const normalizedDatapoint = normalizeText(datapointContent);
  if (!normalizedDatapoint || normalizedDatapoint.length === 0) {
    return null;
  }

  let bestMatch = { node: null, ratio: 0, index: -1, text: "", matchType: "" };

  // First try exact matching with normalization
  for (let i = 0; i < textNodes.length; i++) {
    const textNode = textNodes[i];
    const text = textNode.getTextContent();

    if (text.length < 10) continue;
    const normalizedText = normalizeText(text);

    // Exact match check (case insensitive)
    if (normalizedText.includes(normalizedDatapoint)) {
      return {
        node: textNode,
        ratio: 100,
        index: i,
        text,
        matchType: "exact",
        startPos: normalizedText.indexOf(normalizedDatapoint),
      };
    }

    // Check if datapoint contains the text (for partial matches)
    if (
      normalizedDatapoint.includes(normalizedText) &&
      text.length > 20 &&
      text.length >= normalizedDatapoint.length * 0.6
    ) {
      return {
        node: textNode,
        ratio: 95,
        index: i,
        text,
        matchType: "contained",
        startPos: 0,
      };
    }
  }

  // For short datapoints, only allow exact/contained matches; skip fuzzy to avoid noise
  if (normalizedDatapoint.length < 10) {
    return bestMatch.node ? bestMatch : null;
  }

  // Try concatenating adjacent nodes (2-4 nodes) for longer matches
  for (let i = 0; i < textNodes.length - 1; i++) {
    // Try combining 2, 3, or 4 adjacent nodes
    for (let span = 2; span <= Math.min(4, textNodes.length - i); span++) {
      const spanNodes = textNodes.slice(i, i + span);
      const combinedText = spanNodes.map(n => n.getTextContent()).join(" ");

      if (combinedText.length < 20) continue;

      const normalizedCombined = normalizeText(combinedText);

      if (
        normalizedCombined.includes(normalizedDatapoint) &&
        normalizedDatapoint.length >= combinedText.length * 0.4
      ) {
        return {
          node: spanNodes[0],
          ratio: 90,
          index: i,
          text: combinedText,
          matchType: "spanning",
          startPos: normalizedCombined.indexOf(normalizedDatapoint),
          spanningNodes: spanNodes,
        };
      }
    }
  }

  // IMPROVED: Increase required matches for fuzzy matching
  // Try multiple string similarity algorithms from wuzzy package
  for (let i = 0; i < textNodes.length; i++) {
    const textNode = textNodes[i];
    const text = textNode.getTextContent();

    // Require longer text for fuzzy matching
    if (text.length < Math.max(20, normalizedDatapoint.length / 2)) continue;

    const normalizedText = normalizeText(text);

    // 1. Try Jaro-Winkler distance (good for shorter strings with small differences)
    const jaroScore =
      wuzzy.jarowinkler(normalizedDatapoint, normalizedText) * 100;

    // 2. Try N-gram similarity (good for detecting local similarities)
    const ngramScore = wuzzy.ngram(normalizedDatapoint, normalizedText) * 100;

    // 3. Try Levenshtein distance (standard edit distance metric)
    const levenScore =
      wuzzy.levenshtein(normalizedDatapoint, normalizedText) * 100;

    // Use the best score from any algorithm
    const bestScore = Math.max(jaroScore, ngramScore, levenScore);
    const matchType =
      bestScore === jaroScore
        ? "jaro"
        : bestScore === ngramScore
        ? "ngram"
        : "levenshtein";

    // Only consider high-quality fuzzy matches
    if (bestScore > bestMatch.ratio && bestScore >= 75) {
      bestMatch = {
        node: textNode,
        ratio: bestScore,
        index: i,
        text,
        matchType,
        startPos: 0,
      };
    }
  }

  // Token-based matching for long content as a fallback
  if (bestMatch.ratio < 75 && datapointContent.length > 50) {
    const datapointTokens = normalizedDatapoint
      .split(/\s+/)
      .filter((t) => t.length > 3);

    for (let i = 0; i < textNodes.length; i++) {
      const textNode = textNodes[i];
      const text = textNode.getTextContent();

      if (text.length < 30) continue;

      const normalizedText = normalizeText(text);
      const textTokens = normalizedText
        .split(/\s+/)
        .filter((t) => t.length > 3);

      // Calculate Jaccard similarity for tokens (set-based similarity)
      try {
        // Convert tokens to sets for Jaccard calculation
        const tokenSetA = new Set(datapointTokens);
        const tokenSetB = new Set(textTokens);

        // Use wuzzy's jaccard implementation directly with arrays
        const jaccardScore =
          wuzzy.jaccard(Array.from(tokenSetA), Array.from(tokenSetB)) * 100;

        if (jaccardScore > bestMatch.ratio) {
          bestMatch = {
            node: textNode,
            ratio: jaccardScore,
            index: i,
            text,
            matchType: "jaccard",
            startPos: 0,
          };
        }
      } catch (e) {
        console.error("Error in Jaccard calculation:", e);
      }
    }
  }

  // Lower the threshold for longer datapoints, but with a higher minimum
  const thresholdAdjustment = Math.min(15, datapointContent.length / 25);
  const adjustedThreshold = Math.max(65, 75 - thresholdAdjustment);

  // Only return matches above our threshold
  return bestMatch.ratio >= adjustedThreshold ? bestMatch : null;
}

// Helper to find original text position accounting for whitespace and casing differences
function findOriginalPosition(originalText, normalizedText, normalizedPos) {
  if (normalizedPos <= 0) return 0;
  if (normalizedPos >= normalizedText.length) return originalText.length;

  let originalCount = 0;
  let normalizedCount = 0;

  while (
    normalizedCount < normalizedPos &&
    originalCount < originalText.length
  ) {
    // Skip extra whitespace in the original text
    while (
      originalCount < originalText.length &&
      /\s/.test(originalText[originalCount]) &&
      (originalCount === 0 || /\s/.test(originalText[originalCount - 1]))
    ) {
      originalCount++;
    }

    // Move both counters for valid characters
    if (originalCount < originalText.length) {
      originalCount++;
      normalizedCount++;
    }
  }

  return originalCount;
}

export function DatapointTooltipPlugin({
  currentFileName,
}: {
  currentFileName: string;
}) {
  const { getCardsForFile, deleteDatapoint } = useCardStore();
  const [editor] = useLexicalComposerContext();

  // Memoize the file-specific cards with a fallback to empty array
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const handler = (e: any) => {
      if (e?.detail?.fileName === currentFileName) setVersion((v) => v + 1);
    };
    window.addEventListener("derivedCardsUpdated", handler);
    return () => window.removeEventListener("derivedCardsUpdated", handler);
  }, [currentFileName]);

  const fileSpecificCards = useMemo(() => {
    // Prefer cards derived by highlighter (with fallback logic), else mapping
    const derived = (derivedCardsForFile as any)[currentFileName] || [];
    if (derived && derived.length > 0) return derived;
    return getCardsForFile(currentFileName) || [];
  }, [getCardsForFile, currentFileName, version]);

  useEffect(() => {
    // Store a reference map of content to card info for quick lookup
    const contentToCardMap = new Map();

    // Pre-populate the map with all datapoints
    fileSpecificCards.forEach((card) => {
      if (!card.topics) return;

      card.topics.forEach((topic) => {
        if (!topic.content) return;

        // Store normalized content to improve matching
        const normalizedContent = normalizeText(topic.content);
        contentToCardMap.set(normalizedContent, {
          cardId: card.id,
          cardName: card.name,
          topicId: topic.id,
          topicUuid: topic.uuid,
        });
      });
    });

    // Helper function to check if an element is highlighted
    const isHighlightedElement = (element) => {
      if (!element || element.nodeType !== 1) return false;

      // Check for any background-color instead of just yellow
      if (element.style && element.style.backgroundColor) return true;

      // Check for any background-color in style attribute
      const styleAttr = element.getAttribute("style");
      if (styleAttr && styleAttr.includes("background-color:")) return true;

      // Check for highlight class and attributes
      if (element.classList && element.classList.contains("highlight"))
        return true;

      if (
        element.hasAttribute("data-highlight") ||
        element.getAttribute("format") === "highlight"
      )
        return true;

      return false;
    };

    // Helper function to find the closest highlighted parent
    const findHighlightedParent = (element) => {
      let current = element;
      while (current && current !== document.body) {
        if (isHighlightedElement(current)) return current;
        current = current.parentElement;
      }
      return null;
    };

    // Improved card info finder that works with Lexical internals
    const findCardInfoForElement = (element) => {
      // Try to get card info from data attributes (set by our processExistingHighlights)
      const cardId = element.getAttribute("data-card-id");
      const topicId = element.getAttribute("data-topic-id");
      const cardName = element.getAttribute("data-card-name");

      if (cardId && topicId) {
        return {
          id: cardId,
          name: cardName || "Unknown Card",
          topicId: topicId,
        };
      }

      // Try accessing Lexical internal data
      const elementKey = element.getAttribute("data-lexical-node-key");
      if (elementKey) {
        // Use Lexical editor API to safely access node data
        let nodeInfo = null;
        editor.getEditorState().read(() => {
          const node = editor._nodes.get(elementKey);
          // Add proper type checking before accessing __cardInfo
          if (node && $isTextNode(node) && "__cardInfo" in node) {
            nodeInfo = (node as any).__cardInfo;
          }
        });

        if (nodeInfo) {
          return nodeInfo;
        }
      }

      // Try content matching as a fallback
      const elementText = element.textContent;
      if (elementText && elementText.length > 5) {
        // Try exact match first
        const normalizedText = normalizeText(elementText);
        const exactMatch = contentToCardMap.get(normalizedText);

        if (exactMatch) {
          return {
            id: exactMatch.cardId,
            name: exactMatch.cardName,
            topicId: exactMatch.topicId,
          };
        }

        // Try fuzzy matching as a last resort
        for (const card of fileSpecificCards) {
          if (!card.topics) continue;

          for (const topic of card.topics) {
            if (!topic.content || topic.content.length < 10) continue;
            const normalizedTopicContent = normalizeText(topic.content);

            if (
              normalizedText === normalizedTopicContent ||
              (normalizedText.length > 15 &&
                normalizedTopicContent.includes(normalizedText)) ||
              (normalizedTopicContent.length > 15 &&
                normalizedText.includes(normalizedTopicContent)) ||
              (normalizedText.length > 20 &&
                wuzzy.jarowinkler(normalizedText, normalizedTopicContent) > 0.9)
            ) {
              return {
                id: card.id,
                name: card.name,
                topicId: topic.id,
              };
            }
          }
        }
      }

      return null;
    };

    // Handle click events
    const handleClick = (e) => {
      // Alt+Click to delete datapoints - keep existing code
      if (e.altKey) {
        // Existing alt-click code remains unchanged
        const target = e.target;
        const highlightedElement = findHighlightedParent(target);

        if (highlightedElement) {
          const cardInfo = findCardInfoForElement(highlightedElement);
          if (cardInfo) {
            // Find the UUID for this datapoint
            let topicUuid = null;

            for (const card of fileSpecificCards) {
              if (card.id === cardInfo.id || card.id === cardInfo.cardId) {
                const topic = card.topics?.find(
                  (t) => t.id === cardInfo.topicId
                );
                if (topic) {
                  topicUuid = topic.uuid;
                  break;
                }
              }
            }

            if (topicUuid) {
              // First unhighlight the text
              editor.update(() => {
                try {
                  // Try to access the Lexical node
                  if (highlightedElement._lexicalNode) {
                    const node = highlightedElement._lexicalNode;
                    const text = node.getTextContent();
                    // Create a new clean node instead of modifying the existing one
                    const plainTextNode = $createTextNode(text);
                    if (node.isAttached()) {
                      node.replace(plainTextNode);
                    }
                  } else {
                    // Fallback to DOM manipulation
                    highlightedElement.style.backgroundColor = "transparent";
                    highlightedElement.removeAttribute("data-card-id");
                    highlightedElement.removeAttribute("data-topic-id");
                  }
                } catch (err) {
                  console.error("Error removing highlight:", err);
                }
              });

              // Then delete the datapoint from the store
              deleteDatapoint(topicUuid);

              // Prevent regular click behavior
              e.preventDefault();
              e.stopPropagation();
              return;
            }
          }
        }
      }

      // Improved click handling for card navigation
      const target = e.target;
      const highlightedElement = findHighlightedParent(target);

      if (highlightedElement) {
        const cardInfo = findCardInfoForElement(highlightedElement);
        if (cardInfo) {
          // Dispatch event for card navigation
          window.dispatchEvent(
            new CustomEvent("navigateToCard", {
              detail: {
                cardId: cardInfo.id || cardInfo.cardId,
                cardName: cardInfo.name || cardInfo.cardName,
              },
            })
          );

          // Prevent any default behavior that might interfere
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    // Process all existing highlighted elements
    const processExistingHighlights = () => {
      // More comprehensive selector to catch all highlighted elements
      const allHighlights = document.querySelectorAll(
        '[style*="background-color"], [format="highlight"], .highlight, [data-lexical-text="true"]'
      );

      allHighlights.forEach((element) => {
        // Only process elements that actually have a background color
        if (
          isHighlightedElement(element) &&
          !element.hasAttribute("data-card-id")
        ) {
          processElementForCardInfo(element);
        }
      });
    };

    // Improved function to store card info on DOM elements
    const processElementForCardInfo = (element) => {
      if (!element || !element.textContent || element.textContent.length < 5)
        return;

      // Skip if element already has card info
      if (
        element.hasAttribute("data-card-id") &&
        element.hasAttribute("data-topic-id")
      )
        return;

      const text = element.textContent;
      const normalizedText = normalizeText(text);

      // Try exact match first for efficiency
      const exactMatch = contentToCardMap.get(normalizedText);
      if (exactMatch) {
        element.setAttribute("data-card-id", exactMatch.cardId);
        element.setAttribute("data-topic-id", exactMatch.topicId);
        element.setAttribute("data-card-name", exactMatch.cardName);
        return;
      }

      // Then try to find best partial match
      let bestMatch = { card: null, topic: null, score: 0 };

      for (const card of fileSpecificCards) {
        if (!card.topics) continue;

        for (const topic of card.topics) {
          if (!topic.content || topic.content.length < 10) continue;

          const topicText = normalizeText(topic.content);

          // Exact substring match has highest priority
          if (
            normalizedText.includes(topicText) ||
            topicText.includes(normalizedText)
          ) {
            element.setAttribute("data-card-id", card.id);
            element.setAttribute("data-topic-id", topic.id);
            element.setAttribute("data-card-name", card.name);
            return; // Exit early on exact substring match
          }

          // Otherwise score by similarity
          const similarity = wuzzy.jarowinkler(normalizedText, topicText);
          if (similarity > 0.8 && similarity > bestMatch.score) {
            bestMatch = {
              card,
              topic,
              score: similarity,
            };
          }
        }
      }

      // Apply best match if good enough
      if (bestMatch.score > 0.8 && bestMatch.card && bestMatch.topic) {
        element.setAttribute("data-card-id", bestMatch.card.id);
        element.setAttribute("data-topic-id", bestMatch.topic.id);
        element.setAttribute("data-card-name", bestMatch.card.name);
      }
    };

    // Process existing highlights on mount and periodically
    processExistingHighlights();
    const intervalId = setInterval(processExistingHighlights, 1000);

    // Add click event listener with capture to ensure it's triggered
    document.addEventListener("click", handleClick, true);

    // Add MutationObserver to detect new highlighted elements
    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false;

      mutations.forEach((mutation) => {
        if (
          mutation.type === "childList" ||
          (mutation.type === "attributes" &&
            (mutation.attributeName === "style" ||
              mutation.attributeName === "class"))
        ) {
          shouldProcess = true;
        }
      });

      if (shouldProcess) {
        processExistingHighlights();
      }
    });

    // Start observing with a more comprehensive configuration
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class", "data-lexical-node-key"],
    });

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("click", handleClick, true);
      observer.disconnect();
    };
  }, [fileSpecificCards, editor, currentFileName, deleteDatapoint]);

  // Return null instead of the tooltip component
  return null;
}

export function AddDatapointPlugin({
  currentFileName,
}: {
  currentFileName: string;
}) {
  const {
    getCardsForFile,
    setCardData: storeSetCardData,
    cardData,
  } = useCardStore();
  const [editor] = useLexicalComposerContext();
  const [showPopup, setShowPopup] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [selectedCard, setSelectedCard] = useState("");

  // Add cardData to the dependency array so it refreshes when new cards are added
  const fileSpecificCards = useMemo(
    () => getCardsForFile(currentFileName) || [],
    [getCardsForFile, currentFileName, cardData]
  );

  useEffect(() => {
    // Use Lexical's selection system instead of DOM selection
    const checkEditorSelection = () => {
      if (showPopup) return;

      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection) && !selection.isCollapsed()) {
          const text = selection.getTextContent();
          if (text.trim().length > 0) {
            // Get DOM node information from Lexical selection for positioning
            const domSelection = window.getSelection();
            if (domSelection && domSelection.rangeCount > 0) {
              const range = domSelection.getRangeAt(0);
              const rect = range.getBoundingClientRect();
              // Only proceed if the selection is within the editor
              if (isSelectionInEditor(range)) {
                setPosition({ x: rect.right, y: rect.bottom });
                setSelectedText(text);
                setShowPopup(true);
                return;
              }
            }
          }
        }
        // If we get here, either there's no valid selection or it's not in the editor
        setShowPopup(false);
      });
    };

    // Helper function to check if a selection is within the editor
    const isSelectionInEditor = (range) => {
      // Find the editor root element
      const editorElement = document.querySelector(
        '[data-lexical-editor="true"]'
      );
      if (!editorElement) return false;

      // Check if the selection container is within the editor
      return editorElement.contains(range.commonAncestorContainer);
    };

    // Listen for Lexical updates to detect selection changes within the editor
    const removeUpdateListener = editor.registerUpdateListener(
      ({ editorState, dirtyElements, dirtyLeaves }) => {
        // Only check selection if there was an update to the editor
        if (dirtyElements.size > 0 || dirtyLeaves.size > 0) {
          checkEditorSelection();
        }
      }
    );

    // Also check on mouseup within the editor to catch selections immediately
    const handleMouseUp = (e) => {
      if (e.target && isEventInEditor(e)) {
        checkEditorSelection();
      }
    };

    const isEventInEditor = (e) => {
      const editorElement = document.querySelector(
        '[data-lexical-editor="true"]'
      );
      return editorElement && editorElement.contains(e.target);
    };

    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      removeUpdateListener();
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [editor, showPopup]);

  const handleAddDatapoint = () => {
    // Add strict validation to prevent invalid operations
    if (!selectedCard || !selectedText || selectedText.trim().length === 0) {
      setShowPopup(false);
      return;
    }

    try {
      // Get the complete card data from the store
      const allCards = useCardStore.getState().cardData || [];
      if (!Array.isArray(allCards)) {
        console.error("Card data is not an array:", allCards);
        setShowPopup(false);
        return;
      }

      const updatedCards = [...allCards];
      const cardIndex = updatedCards.findIndex(
        (card) => card.id === selectedCard
      );

      if (cardIndex >= 0) {
        // Ensure topics array exists and is an array
        if (
          !updatedCards[cardIndex].topics ||
          !Array.isArray(updatedCards[cardIndex].topics)
        ) {
          updatedCards[cardIndex].topics = [];
        }

        const newDatapoint = {
          id: Date.now().toString(),
          content: selectedText,
          uuid: Math.random().toString(36).substring(2, 9),
        };

        // Create a defensive copy of the topics array
        const updatedTopics = [...updatedCards[cardIndex].topics];
        updatedTopics.push(newDatapoint);

        // Update the card with the new topics array
        updatedCards[cardIndex] = {
          ...updatedCards[cardIndex],
          topics: updatedTopics,
          name: updatedCards[cardIndex].name || "Unnamed Card",
        };

        // Validate all cards have valid topics arrays before updating store
        const validatedCards = updatedCards.map((card) => ({
          ...card,
          topics: Array.isArray(card.topics) ? card.topics : [],
          name: card.name || "Unnamed Card",
        }));

        // Use the store's setCardData function
        storeSetCardData(validatedCards);

        setShowPopup(false);
        setSelectedText("");
        setSelectedCard("");

        // Highlight the newly added datapoint immediately
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const highlightedNode = $createTextNode(selectedText);
            const highlightColor = getRandomColor();
            highlightedNode.setStyle(
              `background-color: ${highlightColor} !important; cursor: pointer; --card-id: ${card.id};`
            );

            // Store card info as custom data
            highlightedNode.__cardInfo = {
              id: selectedCard,
              name: updatedCards[cardIndex].name || "Unnamed Card",
              topicId: newDatapoint.id,
            };

            selection.insertNodes([highlightedNode]);
          }
        });
      } else {
        console.error("Selected card not found:", selectedCard);
        setShowPopup(false);
      }
    } catch (error) {
      console.error("Error adding datapoint:", error);
      setShowPopup(false);
    }
  };

  return showPopup
    ? createPortal(
        <div
          className="fixed bg-white border shadow-lg p-3 rounded z-50"
          style={{
            top: position.y + 10,
            left: position.x - 150,
          }}
        >
          <h3 className="text-sm font-bold mb-2">Add as Datapoint</h3>
          {/* <p className="text-xs mb-2 italic max-h-20 overflow-auto">
            {selectedText.length > 100
              ? `${selectedText.substring(0, 100)}...`
              : selectedText}
          </p> */}
          <select
            className="w-full mb-2 text-sm p-1 border rounded"
            value={selectedCard}
            onChange={(e) => setSelectedCard(e.target.value)}
          >
            <option value="">Select a card</option>
            {fileSpecificCards.map((card) => (
              <option key={card.id} value={card.id}>
                {card.name}
              </option>
            ))}
          </select>
          <div className="flex justify-end">
            <button
              className="bg-gray-200 text-xs px-2 py-1 rounded mr-2"
              onClick={() => setShowPopup(false)}
            >
              Cancel
            </button>
            <button
              className="bg-blue-500 text-white text-xs px-2 py-1 rounded"
              onClick={handleAddDatapoint}
              disabled={!selectedCard}
            >
              Add
            </button>
          </div>
        </div>,
        document.body
      )
    : null;
}

// Add this new helper function at the end of the file
function findFuzzyMatchSubstring(text, datapoint) {
  if (!text || !datapoint) return null;

  const normalizedText = normalizeText(text);
  const normalizedDatapoint = normalizeText(datapoint);

  // Try direct substring matching first
  if (normalizedText.includes(normalizedDatapoint)) {
    const startPos = normalizedText.indexOf(normalizedDatapoint);
    const originalStartPos = findOriginalPosition(
      text,
      normalizedText,
      startPos
    );
    const originalEndPos = findOriginalPosition(
      text,
      normalizedText,
      startPos + normalizedDatapoint.length
    );
    return {
      match: text.substring(originalStartPos, originalEndPos),
      startPos: originalStartPos,
    };
  }

  // NEW: Try if datapoint contains the text
  // IMPROVED: Require more substantial overlap
  if (
    normalizedDatapoint.includes(normalizedText) &&
    text.length > 20 &&
    text.length >= normalizedDatapoint.length * 0.7
  ) {
    return {
      match: text,
      startPos: 0,
    };
  }

  // Try finding the longest common substring
  const wordTokensDP = normalizedDatapoint
    .split(/\s+/)
    .filter((t) => t.length > 3);
  const textTokensDP = normalizedText.split(/\s+/).filter((t) => t.length > 3);

  if (wordTokensDP.length === 0) return null;

  // Find a sequence of tokens that appear in the text in order
  let bestMatch = null;
  let bestScore = 0;

  // Try different starting positions in the text
  for (let i = 0; i < textTokensDP.length; i++) {
    let matchCount = 0;
    let dpIndex = 0;

    // Try to match consecutive tokens
    for (
      let j = i;
      j < textTokensDP.length && dpIndex < wordTokensDP.length;
      j++
    ) {
      if (
        textTokensDP[j].includes(wordTokensDP[dpIndex]) ||
        wordTokensDP[dpIndex].includes(textTokensDP[j])
      ) {
        matchCount++;
        dpIndex++;
      }
    }

    // If we found a good match (at least 60% of the datapoint tokens)
    if (
      matchCount > 0 &&
      matchCount / wordTokensDP.length > 0.6 &&
      matchCount > bestScore
    ) {
      // Find the text range in the original text
      const startToken = textTokensDP[i];
      const endToken = textTokensDP[i + matchCount - 1];

      const startIndex = normalizedText.indexOf(
        startToken,
        normalizedText.indexOf(textTokensDP[i])
      );
      const endIndex =
        normalizedText.indexOf(endToken, startIndex) + endToken.length;

      if (startIndex >= 0 && endIndex > startIndex) {
        const originalStartPos = findOriginalPosition(
          text,
          normalizedText,
          startIndex
        );
        const originalEndPos = findOriginalPosition(
          text,
          normalizedText,
          endIndex
        );

        bestMatch = {
          match: text.substring(originalStartPos, originalEndPos),
          startPos: originalStartPos,
        };
        bestScore = matchCount;
      }
    }
  }

  // NEW: If we still don't have a match, try matching individual significant words
  // IMPROVED: Require more significant words and context
  if (!bestMatch && wordTokensDP.length > 1) {
    // Find the longest word in the datapoint (likely most significant)
    const significantWord = wordTokensDP.sort((a, b) => b.length - a.length)[0];

    if (significantWord && significantWord.length > 5) {
      // Increased minimum word length
      const wordIndex = normalizedText.indexOf(significantWord);

      if (wordIndex >= 0) {
        // Find a reasonable context around this word - reduced context size
        const contextStart = Math.max(0, wordIndex - 10);
        const contextEnd = Math.min(
          normalizedText.length,
          wordIndex + significantWord.length + 10
        );

        const originalStartPos = findOriginalPosition(
          text,
          normalizedText,
          contextStart
        );
        const originalEndPos = findOriginalPosition(
          text,
          normalizedText,
          contextEnd
        );

        bestMatch = {
          match: text.substring(originalStartPos, originalEndPos),
          startPos: originalStartPos,
        };
      }
    }
  }

  return bestMatch;
}

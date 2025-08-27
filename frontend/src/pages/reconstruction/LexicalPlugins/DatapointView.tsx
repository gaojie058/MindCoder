import { card } from "@/types";
import { useState } from "react";
import { DecoratorNode } from "lexical";
import { createPortal } from "react-dom";
import { SerializedLexicalNode, LexicalNode } from "lexical";

export function DatapointComponent({ content, card: card }) {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  return (
    <span
      className="bg-yellow-300 px-1 rounded cursor-pointer"
      onMouseEnter={(e) => {
        setTooltipPosition({ x: e.clientX, y: e.clientY });
        setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      {content}
      {isHovered &&
        createPortal(
          <div
            className="fixed bg-black text-white text-xs px-2 py-1 rounded z-50"
            style={{
              top: tooltipPosition.y + 10,
              left: tooltipPosition.x + 10,
              pointerEvents: "none",
            }}
          >
            <div>Card: {card.name}</div>
            <div>
              Topics: {card.topics.map((topic) => topic.content).join(", ")}
            </div>
          </div>,
          document.body
        )}
    </span>
  );
}

export class DatapointNode extends DecoratorNode<React.ReactNode> {
  __content: string;
  __card: card;

  constructor(content: string, card: card, key?: string) {
    super(key);
    this.__content = content;
    this.__card = card;
  }

  static getType() {
    return "datapoint";
  }

  static clone(node: DatapointNode) {
    return new DatapointNode(node.__content, node.__card, node.__key);
  }

  createDOM() {
    return document.createElement("span");
  }

  updateDOM() {
    return false;
  }

  decorate() {
    return <DatapointComponent content={this.__content} card={this.__card} />;
  }

  exportJSON() {
    return {
      type: this.getType(),
      content: this.__content,
      card: this.__card,
      version: 1,
    };
  }

  static importJSON(serializedNode: SerializedLexicalNode): LexicalNode {
    const { content, card } = serializedNode as any;
    return new DatapointNode(content, card);
  }
}

// export function DatapointHighlightPlugin({ fileContent }) {
//   const [editor] = useLexicalComposerContext();
//   const { cardData } = useCardStore();
//   const [matchStats, setMatchStats] = useState({ total: 0, found: 0 });

//   // Helper function to normalize text for comparison - more aggressive cleaning
//   const normalizeText = (text) => {
//     return text
//       .replace(/\s+/g, " ") // Normalize all whitespace to single spaces
//       .replace(/[\u2018\u2019'']/g, "'") // Smart quotes to regular quotes
//       .replace(/[\u201C\u201D""]/g, '"') // Smart double quotes to regular double quotes
//       .replace(/[.,;:!?()[\]{}]/g, "") // Remove punctuation
//       .replace(/\u00A0/g, " ") // Replace non-breaking spaces
//       .toLowerCase() // Case insensitive matching
//       .trim(); // Remove leading/trailing whitespace
//   };

//   // Function to find the best approximate match
//   const findBestMatch = (needle, haystack) => {
//     // First try direct substring match with normalized text
//     const normalizedNeedle = normalizeText(needle);
//     const normalizedHaystack = normalizeText(haystack);

//     if (normalizedHaystack.includes(normalizedNeedle)) {
//       // Find the actual position in the original text
//       const approxPosition = haystack
//         .toLowerCase()
//         .indexOf(needle.toLowerCase());
//       return {
//         found: true,
//         position: approxPosition >= 0 ? approxPosition : 0,
//         confidence: "high",
//       };
//     }

//     // If no direct match, try word-by-word matching
//     const needleWords = normalizedNeedle.split(" ").filter((w) => w.length > 3);
//     if (needleWords.length > 0) {
//       // Look for the first substantial word
//       const firstWord = needleWords[0];
//       const lastWord = needleWords[needleWords.length - 1];

//       if (
//         normalizedHaystack.includes(firstWord) &&
//         normalizedHaystack.includes(lastWord)
//       ) {
//         const startPos = haystack
//           .toLowerCase()
//           .indexOf(firstWord.toLowerCase());
//         return {
//           found: true,
//           position: startPos,
//           confidence: "medium",
//           approximateLength: needle.length,
//         };
//       }
//     }

//     return { found: false };
//   };

//   useEffect(() => {
//     if (!fileContent || !cardData.length) return;

//     const highlightMatches = () => {
//       editor.update(() => {
//         const root = $getRoot();
//         const textNodes = [];

//         // Traverse all nodes to find text nodes
//         root.getChildren().forEach((node) => {
//           if ($isTextNode(node)) {
//             textNodes.push(node);
//           } else if (
//             "getChildren" in node &&
//             typeof node.getChildren === "function"
//           ) {
//             node.getChildren().forEach((child) => {
//               if ($isTextNode(child)) {
//                 textNodes.push(child);
//               }
//             });
//           }
//         });

//         let totalFound = 0;
//         const totalDatapoints = cardData.reduce(
//           (sum, card) => sum + card.topics.length,
//           0
//         );

//         // Process each datapoint against each text node
//         cardData.forEach((card) => {
//           card.topics.forEach((datapoint) => {
//             const content = datapoint.content;

//             // Try to find matches in each text node
//             for (const textNode of textNodes) {
//               const text = textNode.getTextContent();
//               const match = findBestMatch(content, text);

//               if (match.found) {
//                 totalFound++;

//                 // Select the text and apply highlighting
//                 textNode.select(
//                   match.position,
//                   match.position + match.approximateLength || content.length
//                 );

//                 // Create a DatapointNode to replace the selection
//                 const datapointNode = new DatapointNode(content, card);
//                 const selection = $getSelection();
//                 if (selection) {
//                   selection.insertNodes([datapointNode]);
//                 }

//                 break; // Found a match for this datapoint, move to next
//               }
//             }
//           });
//         });

//         setMatchStats({ total: totalDatapoints, found: totalFound });
//       });
//     };

//     // Run highlighting after a short delay to ensure editor is ready
//     const timer = setTimeout(highlightMatches, 100);
//     return () => clearTimeout(timer);
//   }, [fileContent, cardData, editor]);

//   // Add a small indicator to show matching stats
//   return (
//     <div className="text-xs text-gray-500 absolute top-2 right-2">
//       Datapoints matched: {matchStats.found}/{matchStats.total}
//     </div>
//   );
// }

// export function AddDatapointPlugin({ onAdd }) {
//   const [editor] = useLexicalComposerContext();

//   const handleAdd = () => {
//     editor.update(() => {
//       const selection = $getSelection();
//       if ($isRangeSelection(selection)) {
//         const selectedText = selection.getTextContent();
//         if (selectedText.trim().length > 0) {
//           onAdd(selectedText);
//         } else {
//           alert("Please choose text first");
//         }
//       } else {
//         alert("Please add chose text first");
//       }
//     });
//   };

//   return (
//     <button
//       onClick={handleAdd}
//       className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
//     >
//       Add Selected as Datapoint
//     </button>
//   );
// }

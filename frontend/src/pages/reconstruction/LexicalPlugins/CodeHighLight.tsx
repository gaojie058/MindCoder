/**
 * CodeHighLight.tsx — Entry point for the highlight system.
 *
 * Re-exports from modular files under ./highlights/.
 * Kept as the import path for backward compatibility.
 */
import HighlightEnginePlugin from "./highlights/HighlightEngine";
export { HighlightEnginePlugin };
export { HighlightEnginePlugin as DatapointHighlightPlugin };
export { HighlightEnginePlugin as DatapointTooltipPlugin };

// HighlightTextPlugin — simple search highlight (kept inline, rarely used)
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";
import { $getRoot, $isTextNode, $createTextNode } from "lexical";
import { registerCodeHighlighting } from "@lexical/code";

export const HighlightTextPlugin = ({ searchStr }: { searchStr: string }) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!searchStr) return;

    editor.update(() => {
      const root = $getRoot();
      const walk = (node: any) => {
        if ($isTextNode(node)) {
          const text = node.getTextContent();
          const idx = text.toLowerCase().indexOf(searchStr.toLowerCase());
          if (idx >= 0) {
            const before = $createTextNode(text.substring(0, idx));
            const match = $createTextNode(text.substring(idx, idx + searchStr.length));
            match.setStyle("background-color: #FBBF24");
            const after = $createTextNode(text.substring(idx + searchStr.length));
            if (node.isAttached()) {
              node.replace(before);
              before.insertAfter(match);
              match.insertAfter(after);
            }
          }
        } else if (node.getChildren) {
          node.getChildren().forEach(walk);
        }
      };
      root.getChildren().forEach(walk);
    });
    return registerCodeHighlighting(editor);
  }, [editor, searchStr]);

  return null;
};

// AddDatapointPlugin — legacy, replaced by right-click context menu in CardArea
export function AddDatapointPlugin({ currentFileName: _currentFileName }: { currentFileName: string }) {
  return null;
}

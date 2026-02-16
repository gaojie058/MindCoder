import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import useEditorStore from "@/stores/useEditorStore";
import useAppStore from "@/stores/useAppStore";
import { Select, MenuItem } from "@mui/material";
import { exampleTheme } from "./theme";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import {
  DatapointHighlightPlugin,
  DatapointTooltipPlugin,
  AddDatapointPlugin,
} from "./CodeHighLight";
import { DatapointNode } from "./DatapointView";
import ListMaxIndentLevelPlugin from "./ListMaxIndentLevel";
import { ListNode, ListItemNode } from "@lexical/list";
import { useGenerateStore } from "@/api/useGenerate";
import useCardStore from "@/stores/useCardStore";
import WordCoverage from "./WordCoverage";

const readFileContent = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

// Create a stable config object that won't change between renders
const createEditorConfig = (nodes) => ({
  namespace: "MindCoder",
  theme: exampleTheme,
  onError: (error) => {
    console.error("Lexical Editor Error: ", error);
  },
  nodes,
});

export default function LexicalEditor({ onHighlightReady = () => {} }) {
  const { uploadedFiles } = useAppStore();
  const {
    getEditorState,
    setEditorState,
    setSelectedFile,
    selectedFile,
    resetEditorState,
  } = useEditorStore();
  const [selectedFileLocal, setSelectedFileLocal] = useState("");
  const [fileContent, setFileContent] = useState(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileProcessingRef = useRef(new Set());
  const lastProcessedTimestampRef = useRef({});

  // Add a key to force editor remounting
  const [editorKey, setEditorKey] = useState(Date.now());

  // Get card data to detect changes
  const { cardData } = useCardStore();
  const lastCardDataLengthRef = useRef(-1);

  // Create a stable config object that won't cause re-renders
  const editorConfig = useMemo(
    () => createEditorConfig([DatapointNode, ListNode, ListItemNode]),
    []
  );

  // Get processed files info only once - prevent unnecessary re-renders
  const { hasFullGenerated, processedFiles } = useGenerateStore();

  // Memoize the createInitialEditorState function to avoid recreating it on every render
  const createInitialEditorState = useCallback((content) => {
    // Skip empty content
    if (!content) return "";

    // Split content by line breaks - handle both \r\n and \n
    const lines = content.split(/\r?\n/);

    // Create paragraph nodes for each line
    const children = lines.map((line) => {
      // Preserve original whitespace
      return {
        type: "paragraph",
        children: [
          {
            type: "text",
            text: line,
            format: 0,
            style: "",
            mode: "normal",
            detail: 0,
          },
        ],
        format: "",
        indent: 0,
        direction: null,
      };
    });

    return JSON.stringify({
      root: {
        type: "root",
        children: children,
        direction: null,
        format: "",
        indent: 0,
      },
    });
  }, []);

  // Monitor card data changes to completely remount the editor
  useEffect(() => {
    // Skip first render
    if (lastCardDataLengthRef.current === -1) {
      lastCardDataLengthRef.current = cardData.length;
      return;
    }

    // Detect significant changes in card data
    if (cardData.length !== lastCardDataLengthRef.current) {
      console.log("Card data changed significantly, forcing editor remount");

      // Reset editor state for the current file
      if (selectedFileLocal) {
        resetEditorState(selectedFileLocal);
      }

      // Force editor remount with a new key
      setEditorKey(Date.now());

      // Update card count reference
      lastCardDataLengthRef.current = cardData.length;
    }
  }, [cardData, selectedFileLocal, resetEditorState]);

  // Initial file loading with debounce protection
  useEffect(() => {
    if (uploadedFiles.length > 0 && !selectedFileLocal) {
      const initialFile = uploadedFiles[0];
      setSelectedFileLocal(initialFile.name);
      setSelectedFile(initialFile.name);

      if (!fileProcessingRef.current.has(initialFile.name)) {
        fileProcessingRef.current.add(initialFile.name);

        readFileContent(initialFile).then((content) => {
          setFileContent(content);
          fileProcessingRef.current.delete(initialFile.name);
        });
      }
    }
  }, [uploadedFiles, setSelectedFile, selectedFileLocal]);

  // Update when selected file changes - with debounce protection
  useEffect(() => {
    if (selectedFile && selectedFile !== selectedFileLocal) {
      const file = uploadedFiles.find((f) => f.name === selectedFile);
      if (file && !fileProcessingRef.current.has(selectedFile)) {
        setSelectedFileLocal(selectedFile);
        fileProcessingRef.current.add(selectedFile);

        readFileContent(file).then((content) => {
          setFileContent(content);
          fileProcessingRef.current.delete(selectedFile);
        });
      }
    }
  }, [selectedFile, uploadedFiles, selectedFileLocal]);

  // Only refresh editor on REAL generation completion with timestamp tracking
  useEffect(() => {
    if (hasFullGenerated && selectedFileLocal) {
      // Check if this file has been processed AND we haven't already handled this update
      const isFileProcessed = processedFiles.includes(selectedFileLocal);
      const currentTimestamp = Date.now();
      const lastProcessed =
        lastProcessedTimestampRef.current[selectedFileLocal] || 0;

      // Only process if we haven't handled this update recently (prevent duplicate processing)
      if (isFileProcessed && currentTimestamp - lastProcessed > 5000) {
        lastProcessedTimestampRef.current[selectedFileLocal] = currentTimestamp;

        // Find the file and update the content
        const file = uploadedFiles.find((f) => f.name === selectedFileLocal);
        if (file && !fileProcessingRef.current.has(selectedFileLocal)) {
          fileProcessingRef.current.add(selectedFileLocal);

          readFileContent(file).then((content) => {
            // Only update if content has actually changed
            if (content !== fileContent) {
              setFileContent(content);
              // Clear and reload editor state
              setEditorState(selectedFileLocal, null);
              // Create new state after a short delay
              setTimeout(() => {
                const newState = createInitialEditorState(content as string);
                setEditorState(selectedFileLocal, newState);
              }, 100);
            }
            fileProcessingRef.current.delete(selectedFileLocal);
          });
        }
      }
    }
  }, [
    hasFullGenerated,
    selectedFileLocal,
    uploadedFiles,
    processedFiles,
    createInitialEditorState,
    fileContent,
    setEditorState,
  ]);

  // Reset scroll position when changing files
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.scrollTop = 0;
    }
  }, [fileContent]);

  // Optimize onChange to reduce unnecessary updates
  const onChange = useCallback(
    (newEditorState) => {
      if (selectedFileLocal) {
        // Debounce editor state updates
        newEditorState.read(() => {
          // Only update if we actually have content
          const editorJSON = JSON.stringify(newEditorState.toJSON());
          const currentState = getEditorState(selectedFileLocal);

          // Only update if state has actually changed
          if (editorJSON !== currentState) {
            setEditorState(selectedFileLocal, editorJSON);
          }
        });
      }
    },
    [selectedFileLocal, getEditorState, setEditorState]
  );

  // Helper: find all editor elements belonging to a card ID
  const findCardElements = (codeId: string): Element[] => {
    if (!editorRef.current) return [];
    // Try data-card-id attribute first
    let elements = Array.from(editorRef.current.querySelectorAll(`[data-card-id="${codeId}"]`));
    if (elements.length > 0) return elements;
    // Fallback: scan for --card-id CSS custom property
    const allHighlighted = editorRef.current.querySelectorAll('[style*="background-color"]');
    elements = Array.from(allHighlighted).filter((el) => {
      const style = (el as HTMLElement).style.cssText;
      return style.includes(`--card-id: ${codeId}`) || style.includes(`--card-id:${codeId}`);
    });
    return elements;
  };

  // Listen for highlightInEditor — flash highlight using data-card-id attributes
  useEffect(() => {
    const handleHighlight = (e: CustomEvent) => {
      const { codeId, color } = e.detail;
      if (!editorRef.current) return;

      const elements = findCardElements(codeId);
      if (elements.length === 0) return;

      // Scroll to first element
      elements[0].scrollIntoView({ behavior: "smooth", block: "center" });

      // Flash all elements with the code's color
      elements.forEach((el: Element) => {
        const htmlEl = el as HTMLElement;
        const origBg = htmlEl.style.backgroundColor;
        const flashColor = color || "#E8B4B8";
        htmlEl.style.transition = "outline 0.2s";
        htmlEl.style.outline = `2px solid ${flashColor}`;
        setTimeout(() => {
          htmlEl.style.outline = "";
          htmlEl.style.transition = "";
        }, 1500);
      });
    };

    window.addEventListener("highlightInEditor", handleHighlight as EventListener);
    return () => window.removeEventListener("highlightInEditor", handleHighlight as EventListener);
  }, []);

  // Listen for selectCodeInEditor — persistent outline + pen indicator
  useEffect(() => {
    let activeElements: { el: HTMLElement; origOutline: string }[] = [];
    let penEl: HTMLElement | null = null;

    const handleSelect = (e: CustomEvent) => {
      // Clear previous — restore all modified elements
      activeElements.forEach((item: any) => {
        if (item.key === "opacity") item.el.style.opacity = item.orig;
        else if (item.key === "bg") item.el.style.backgroundColor = item.orig;
        else if (item.key === "boxShadow") item.el.style.boxShadow = item.orig;
      });
      activeElements = [];
      if (penEl) { penEl.remove(); penEl = null; }

      const { codeId, color } = e.detail;
      if (!codeId || !editorRef.current) return;

      const elements = findCardElements(codeId);
      if (elements.length === 0) return;

      // Scroll to first
      elements[0].scrollIntoView({ behavior: "smooth", block: "center" });

      // Add pen on first element
      const firstEl = elements[0] as HTMLElement;
      const pen = document.createElement("span");
      pen.textContent = "✏️";
      pen.style.cssText = "position:absolute;left:-18px;top:-2px;font-size:13px;pointer-events:none;z-index:20;";
      firstEl.style.position = "relative";
      firstEl.appendChild(pen);
      penEl = pen;

      // Apply persistent solid background to selected code's segments, dim others
      const selectColor = color || "#E8B4B8";
      const allHighlighted = editorRef.current.querySelectorAll('[style*="background-color"]');
      allHighlighted.forEach((el: Element) => {
        const htmlEl = el as HTMLElement;
        const isThisCode = htmlEl.getAttribute("data-card-id") === codeId ||
          htmlEl.style.cssText.includes(`--card-id: ${codeId}`) ||
          htmlEl.style.cssText.includes(`--card-id:${codeId}`);
        if (isThisCode) {
          // Solid background highlight with the code's color (60% opacity)
          const origBg = htmlEl.style.backgroundColor;
          const origShadow = htmlEl.style.boxShadow;
          htmlEl.style.backgroundColor = selectColor + "99";
          htmlEl.style.boxShadow = `inset 0 -2px 0 0 ${selectColor}`;
          activeElements.push({ el: htmlEl, orig: origBg, key: "bg" } as any);
          activeElements.push({ el: htmlEl, orig: origShadow, key: "boxShadow" } as any);
        } else {
          // Dim non-selected codes
          const origOpacity = htmlEl.style.opacity;
          htmlEl.style.opacity = "0.3";
          activeElements.push({ el: htmlEl, orig: origOpacity, key: "opacity" } as any);
        }
      });
    };

    window.addEventListener("selectCodeInEditor", handleSelect as EventListener);
    return () => {
      window.removeEventListener("selectCodeInEditor", handleSelect as EventListener);
      activeElements.forEach((item: any) => {
        if (item.key === "opacity") item.el.style.opacity = item.orig;
        else if (item.key === "bg") item.el.style.backgroundColor = item.orig;
        else if (item.key === "boxShadow") item.el.style.boxShadow = item.orig;
      });
      if (penEl) penEl.remove();
    };
  }, []);

  // Call onHighlightReady only once
  useEffect(() => {
    onHighlightReady();
  }, [onHighlightReady]);

  if (fileContent === null) {
    return <div>Loading...</div>;
  }

  // Get existing editor state for this file or create a new one
  const initialEditorState = getEditorState(selectedFileLocal);
  const editorStateToUse =
    initialEditorState || createInitialEditorState(fileContent);

  return (
    <div className="p-4 stick">
      <div className="pb-4 flex items-center justify-between sticky top-0 bg-white z-30 pt-4 -mt-4">
        <Select
          value={selectedFileLocal}
          onChange={async (e) => {
            const newFileName = e.target.value;
            const newFile = uploadedFiles.find((f) => f.name === newFileName);
            if (newFile && !fileProcessingRef.current.has(newFileName)) {
              fileProcessingRef.current.add(newFileName);

              const content = await readFileContent(newFile);
              setSelectedFileLocal(newFileName);
              setSelectedFile(newFileName);
              setFileContent(content);

              fileProcessingRef.current.delete(newFileName);
            }
          }}
          displayEmpty
        >
          {uploadedFiles.map((file) => (
            <MenuItem key={file.name} value={file.name}>
              {file.name}
            </MenuItem>
          ))}
        </Select>

        {/* Word Coverage Component */}
        <WordCoverage />
      </div>

      <LexicalComposer
        key={`editor-${selectedFileLocal}-${editorKey}`}
        initialConfig={{
          ...editorConfig,
          editorState: editorStateToUse,
        }}
      >
        <div
          ref={editorRef}
          style={{
            border: "1px solid #ddd",
            padding: "10px",
            // maxHeight: "70vh",
            // overflowY: "auto",
            position: "relative",
            fontFamily: "'Times New Roman', Times, serif",
            whiteSpace: "pre-wrap",
          }}
        >
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="editor-input outline-none focus:outline-none"
                style={{
                  whiteSpace: "pre-wrap",
                  fontFamily: "'Times New Roman', Times, serif",
                  lineHeight: "1.5",
                }}
              />
            }
            placeholder={<div className="text-gray-400">Please type ...</div>}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <OnChangePlugin onChange={onChange} />
          <HistoryPlugin />
          <ListPlugin />
          <ListMaxIndentLevelPlugin maxDepth={7} />

          {/* Only render these plugins when we have a selected file */}
          {selectedFileLocal && (
            <>
              <DatapointHighlightPlugin currentFileName={selectedFileLocal} />
              <DatapointTooltipPlugin currentFileName={selectedFileLocal} />
              <AddDatapointPlugin currentFileName={selectedFileLocal} />
            </>
          )}
        </div>
      </LexicalComposer>

      {/* Enhanced global styles for preserving formatting while supporting highlighting */}
      <style>{`
        .editor-input p {
          margin: 0; 
          padding: 0;
          line-height: 1.5;
          min-height: 1.5em;
          white-space: pre-wrap !important;
        }

        .editor-input {
          white-space: pre-wrap !important;
          tab-size: 4;
        }

        .editor-input span, .editor-input p {
          white-space: pre-wrap;
          font-family: inherit;
        }

        [style*="background-color"] {
          cursor: pointer !important;
          padding: 0 2px;
          border-radius: 2px;
          display: inline !important;
        }
        
        [style*="background-color"] span {
          white-space: pre-wrap !important;
          display: inline !important;
        }
      `}</style>
    </div>
  );
}

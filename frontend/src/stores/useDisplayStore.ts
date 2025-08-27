import { create } from "zustand";
import { graph, report } from "@/types/stores";
import { setWithExpiry, getWithExpiry } from "./utils";

export type DisplayStore = {
  report: report;
  graph: graph;
  renderedGraphSvg: string | null;
  activeGraphType?: string;
  graphs: {
    [key: string]: string | null;
  };
  initializedGraphs: {
    flowchart: boolean;
    patchwork: boolean;
    osage: boolean;
  };
  viewState: {
    transform?: {
      x: number;
      y: number;
      k: number;
    }
  };
  setReport: (report: report) => void;
  setGraph: (graph: graph) => void;
  setRenderedGraphSvg: (svg: string) => void;
  set: (data: Partial<DisplayStore>) => void;
  markGraphInitialized: (graphType: string) => void;
  resetGraphInitialization: () => void;
};

const useDisplayStore = create<DisplayStore>((set) => ({
  report: getWithExpiry("report") || { title: "", sections: [] },
  graph: getWithExpiry("graph") || { id: "graph", dot: "" },
  renderedGraphSvg: null,
  activeGraphType: "mindmap",
  graphs: getWithExpiry("graphs") || {},
  initializedGraphs: {
    flowchart: false,
    patchwork: false,
    osage: false
  },
  viewState: {},

  setReport: (newReport: report) => {
    set(() => {
      console.log("Setting report in store:", newReport);
      setWithExpiry("report", JSON.stringify(newReport));
      return { report: newReport };
    });
  },

  setGraph: (newGraph: graph) => {
    const wrappedGraph = {
      ...newGraph,
      dot: wrapTextInGraph(newGraph.dot, 50),
    };

    set(() => {
      // console.log("Setting graph in store:", wrappedGraph);
      setWithExpiry("graph", JSON.stringify(wrappedGraph));
      return { graph: wrappedGraph };
    });
  },

  setRenderedGraphSvg: (svg: string) => {
    set((state) => {
      if (state.renderedGraphSvg !== svg) {
        console.log("Storing rendered graph SVG in store");
        return { renderedGraphSvg: svg };
      }
      return {};
    });
  },

  set: (data) => {
    set((state) => {
      const newState = { ...state, ...data };

      if (data.graphs) {
        setWithExpiry("graphs", JSON.stringify(data.graphs));
      }

      return newState;
    });
  },

  markGraphInitialized: (graphType: string) => {
    set((state) => ({
      initializedGraphs: {
        ...state.initializedGraphs,
        [graphType]: true
      }
    }));
  },

  resetGraphInitialization: () => {
    set(() => ({
      initializedGraphs: {
        flowchart: false,
        patchwork: false,
        osage: false
      },
      graphs: {
        mindmap: getWithExpiry("graphs")?.mindmap || null
      },
      // Explicitly set activeGraphType back to mindmap during regeneration
      activeGraphType: "mindmap"
    }));
  }
}));

/** 
 * @param dotString
 * @param maxLength
 * @returns
 */
const wrapTextInGraph = (dotString: string, maxLength: number): string => {
  return dotString.replace(/(".*?")/g, (match) => {
    const content = match.slice(1, -1);
    if (content.length > maxLength) {
      const wrappedContent = wrapText(content, maxLength);
      return `"${wrappedContent}"`;
    }
    return match;
  });
};

/**
 * @param text
 * @param maxLength
 * @returns
 */
const wrapText = (text: string, maxLength: number): string => {
  const words = text.split(" ");
  let currentLine = "";
  const lines = [];

  for (const word of words) {
    if ((currentLine + word).length > maxLength) {
      lines.push(currentLine.trim());
      currentLine = "";
    }
    currentLine += word + " ";
  }

  if (currentLine) {
    lines.push(currentLine.trim());
  }

  return lines.join("\n");
};

export const updateDisplayStoreData = async (response: any): Promise<void> => {
  try {
    console.log("Received data:", response);

    const parsedData: { report?: report; graph?: string } = {};

    if (response.report && response.report.message) {
      try {
        const jsonMatch = response.report.message.match(
          /```json\s+([\s\S]*?)\s+```/
        );

        console.log("Check report message:", jsonMatch)

        if (jsonMatch) {
          const reportData = JSON.parse(jsonMatch[1]);
          parsedData.report = reportData;
        } else {
          // Try to parse the message directly as JSON
          const reportData = JSON.parse(response.report.message);
          // Check if the response has a Report property or is the report directly
          parsedData.report = reportData.Report || reportData;
        }
        console.log("Parsed report data:", parsedData.report);
      } catch (error) {
        console.error("Failed to parse report:", error);
        throw new Error("Failed to process report message: " + error);
      }
    }

    if (response.graph && response.graph.message) {
      try {
        console.log("Processing graph message:", response.graph.message);
        const dotMatch = response.graph.message.match(
          /```dot\s+([\s\S]*?)\s+```/
        );
        console.log("DOT match result:", dotMatch);
        if (dotMatch) {
          parsedData.graph = dotMatch[1];
          console.log("Parsed graph data:", dotMatch[1]);
        } else {
          // Fallback: check if the message itself is a valid DOT graph
          const messageContent = response.graph.message.trim();
          if (messageContent.startsWith('digraph') || messageContent.startsWith('graph')) {
            console.log("Using message content directly as DOT graph");
            parsedData.graph = messageContent;
          } else {
            console.error("No DOT code block found in message:", response.graph.message);
            throw new Error("No valid DOT found in graph message.");
          }
        }
      } catch (error) {
        console.error("Graph parsing error:", error);
        throw new Error("Failed to process graph message: " + error);
      }
    }

    console.log("Parsed data before setting store:", parsedData);

    if (parsedData.graph) {
      console.log("Setting graph data in store:", parsedData.graph);
      useDisplayStore.getState().set({
        renderedGraphSvg: null,
        viewState: {}
      });
    }

    if (parsedData.report) {
      console.log("Setting report data in store:", parsedData.report);
      useDisplayStore.getState().setReport(parsedData.report);
    }

    if (parsedData.graph) {
      console.log("Setting graph in store with id 'mindmap' and dot:", parsedData.graph);
      useDisplayStore.getState().setGraph({
        id: "mindmap",
        dot: parsedData.graph || "",
      });

      // Reset graph initialization state when regenerating the mindmap
      useDisplayStore.getState().resetGraphInitialization();
    }

    console.log("Processed data:", parsedData);
  } catch (error) {
    console.error("Error when updating display store:", error);
  }
};


export default useDisplayStore;

import React, { useState, useEffect, useRef } from "react";
import MindmapGraph from "./MindmapGraph";
import useDisplayStore from "@/stores/useDisplayStore";
import useConceptStore from "@/stores/useConceptStore";
import mindmap from "@/assets/mindmap.png";
import patchwork from "@/assets/patchwork.png";
import osage from "@/assets/osage.png";
import { sendRequest, promptGraph } from "./utils";
import Loading from "@/components/ui/Loading";
import { graphviz } from "d3-graphviz";
import * as d3 from "d3";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface DisplayProps {
  selectedNode: string | null;
  visibleNodes: string[];
  onNodesExtracted: (nodes: {
    conceptNodes: string[];
    codeNodes: string[];
  }) => void;
  onGraphTypeChange?: (graphType: string) => void;
  activeGraphType?: string;
}

const Display: React.FC<DisplayProps> = ({
  selectedNode,
  onNodesExtracted,
  visibleNodes,
}) => {
  // Get all necessary store values and functions in one place
  const {
    activeGraphType: storedActiveGraphType,
    graphs: storedGraphs,
    initializedGraphs,
    markGraphInitialized,
    set: setDisplayStore,
  } = useDisplayStore();

  // Local state
  const [activeGraph, setActiveGraph] = useState<string>(
    storedActiveGraphType || "mindmap"
  );
  const [graphType, setGraphType] = useState<string>(activeGraph);
  const [loading, setLoading] = useState(false);
  const [mindmapGraph, setMindmapGraph] = useState<string | null>(null);
  const [patchworkGraph, setPatchworkGraph] = useState<string | null>(
    storedGraphs?.patchwork || null
  );
  const [osageGraph, setOsageGraph] = useState<string | null>(
    storedGraphs?.osage || null
  );
  const [graphRendered, setGraphRendered] = useState(false);

  // Loading states
  const [graphLoadingStates, setGraphLoadingStates] = useState({
    patchwork: false,
    osage: false,
  });

  // Add state to track generation failures
  const [graphGenerationErrors, setGraphGenerationErrors] = useState({
    patchwork: false,
    osage: false,
  });

  // Add a ref to prevent infinite loops
  const preventStoreUpdateRef = useRef(false);
  const componentMountedRef = useRef(false);

  // Initialize on mount only
  useEffect(() => {
    if (componentMountedRef.current) return;
    componentMountedRef.current = true;

    console.log(
      "Component mounted, initializing with active graph:",
      storedActiveGraphType
    );

    // Set local state from store on mount
    setActiveGraph(storedActiveGraphType || "mindmap");
    setGraphType(storedActiveGraphType || "mindmap");

    // If active graph isn't mindmap and we don't have it, generate it
    if (storedActiveGraphType && storedActiveGraphType !== "mindmap") {
      const graphData = storedGraphs?.[storedActiveGraphType];

      if (
        !graphData &&
        !initializedGraphs[
          storedActiveGraphType as keyof typeof initializedGraphs
        ]
      ) {
        // Schedule after render
        setTimeout(() => {
          switch (storedActiveGraphType) {
            case "patchwork":
              if (!patchworkGraph)
                handleGenerate(promptGraph.patchWork, "patchwork");
              break;
            case "osage":
              if (!osageGraph) handleGenerate(promptGraph.osage, "osage");
              break;
          }
        }, 100);
      }
    }
  }, []);

  // Separate function to change the graph type without triggering generation
  const setGraphTypeOnly = (type: string) => {
    setGraphType(type);
    setActiveGraph(type);

    preventStoreUpdateRef.current = true;
    setDisplayStore({ activeGraphType: type });
    setTimeout(() => {
      preventStoreUpdateRef.current = false;
    }, 100);
  };

  // Graph generation
  const handleGenerate = async (
    promptTemplate: string,
    graphType: string,
    retryCount = 0
  ) => {
    console.log(
      `Generating ${graphType} graph${
        retryCount > 0 ? ` (retry ${retryCount})` : ""
      }`
    );

    // Mark as initialized and set loading states
    markGraphInitialized(graphType);
    setGraphLoadingStates((prev) => ({ ...prev, [graphType]: true }));
    setLoading(true);

    // Reset error state at the start of generation
    setGraphGenerationErrors((prev) => ({
      ...prev,
      [graphType]: false,
    }));

    let prompt = "";
    prompt = promptTemplate.replace("${codebook}", JSON.stringify(codebook));

    try {
      const response = await sendRequest({ prompt, files: [] });
      const dotData = extractDotFromResponse(response.message);

      // If no valid DOT data and we haven't exceeded max retries, try again
      if (!dotData) {
        if (retryCount < 3) {
          console.log(
            `No valid DOT data received for ${graphType}, retrying (${
              retryCount + 1
            }/3)...`
          );
          setGraphLoadingStates((prev) => ({ ...prev, [graphType]: false }));
          setTimeout(() => {
            handleGenerate(promptTemplate, graphType, retryCount + 1);
          }, 1000); // Wait 1 second before retrying
          return;
        } else {
          throw new Error("No valid DOT data received after multiple attempts");
        }
      }

      const worker = new Worker(new URL("./graphworker.ts", import.meta.url));
      worker.postMessage({ dotData });

      worker.onmessage = (event) => {
        const dotData = event.data;

        if (!dotData) {
          if (retryCount < 3) {
            console.log(
              `Failed to process ${graphType} graph data, retrying (${
                retryCount + 1
              }/3)...`
            );
            setGraphLoadingStates((prev) => ({ ...prev, [graphType]: false }));
            setTimeout(() => {
              handleGenerate(promptTemplate, graphType, retryCount + 1);
            }, 1000);
            return;
          } else {
            console.error(
              `Failed to process ${graphType} graph data after multiple attempts`
            );
            setGraphGenerationErrors((prev) => ({
              ...prev,
              [graphType]: true,
            }));
            setLoading(false);
            setGraphLoadingStates((prev) => ({ ...prev, [graphType]: false }));
            return;
          }
        }

        // Update store with new graph data
        preventStoreUpdateRef.current = true;
        setDisplayStore({
          activeGraphType: graphType,
          graphs: {
            ...storedGraphs,
            [graphType]: dotData,
          },
        });

        // Update local state
        switch (graphType) {
          case "mindmap":
            setMindmapGraph(dotData);
            break;
          case "patchwork":
            setPatchworkGraph(dotData);
            break;
          case "osage":
            setOsageGraph(dotData);
            break;
        }

        setActiveGraph(graphType);
        setLoading(false);
        setGraphLoadingStates((prev) => ({ ...prev, [graphType]: false }));

        // Reset prevention flag
        setTimeout(() => {
          preventStoreUpdateRef.current = false;
        }, 100);

        // Render the graph after it's updated in state
        setTimeout(() => {
          renderGraph(dotData, graphType);
        }, 200);
      };

      worker.onerror = (error) => {
        console.error("Error generating graph in worker:", error);
        if (retryCount < 3) {
          console.log(
            `Worker error for ${graphType}, retrying (${retryCount + 1}/3)...`
          );
          setGraphLoadingStates((prev) => ({ ...prev, [graphType]: false }));
          setTimeout(() => {
            handleGenerate(promptTemplate, graphType, retryCount + 1);
          }, 1000);
        } else {
          setGraphGenerationErrors((prev) => ({
            ...prev,
            [graphType]: true,
          }));
          setLoading(false);
          setGraphLoadingStates((prev) => ({ ...prev, [graphType]: false }));
        }
      };
    } catch (error) {
      console.error("Error generating visualization:", error);
      if (retryCount < 3) {
        console.log(
          `Error for ${graphType}, retrying (${retryCount + 1}/3)...`
        );
        setGraphLoadingStates((prev) => ({ ...prev, [graphType]: false }));
        setTimeout(() => {
          handleGenerate(promptTemplate, graphType, retryCount + 1);
        }, 1000);
      } else {
        setGraphGenerationErrors((prev) => ({
          ...prev,
          [graphType]: true,
        }));
        setLoading(false);
        setGraphLoadingStates((prev) => ({ ...prev, [graphType]: false }));
      }
    }
  };

  // Add this to the renderGraph function to ensure dialogs are properly managed
  const renderGraph = (dotData: string, graphType: string) => {
    if (!dotData) return;

    // console.log(`Rendering ${graphType} graph with graphviz`);
    const container = document.getElementById("other-graph-container");
    if (!container) return;

    // Completely reset the container to avoid any influence from previous graphs
    container.innerHTML = "";

    // Close any open dialogs in the document to prevent conflicts
    document.querySelectorAll("dialog[open]").forEach((dialog) => {
      try {
        (dialog as HTMLDialogElement).close();
      } catch (e) {
        console.warn("Failed to close dialog:", e);
      }
    });

    try {
      // Use a consistent width/height for the initial rendering
      graphviz(container)
        .width(1000)
        .height(750)
        .fit(true)
        .engine("dot")
        .renderDot(dotData)
        .on("end", function () {
          console.log(`${graphType} graph rendering completed`);
          setGraphRendered(true);

          const svg = container.querySelector("svg");
          if (svg) {
            // Apply graph-specific sizing and zoom
            setupGraphSvg(svg, graphType);
          }
        });
    } catch (error) {
      console.error(`Error rendering ${graphType} graph:`, error);
    }
  };

  // Separate function to setup SVG with graph-specific settings
  const setupGraphSvg = (svg: SVGElement, graphType: string) => {
    // First retrieve original dimensions
    const originalViewBox = svg.getAttribute("viewBox");
    const originalWidth = svg.getAttribute("width");
    const originalHeight = svg.getAttribute("height");

    console.log(
      `Original ${graphType} viewBox: ${originalViewBox}, width: ${originalWidth}, height: ${originalHeight}`
    );

    // Set consistent basic attributes for all graph types
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    // Get viewBox values
    let x = 0,
      y = 0,
      width = 1000,
      height = 750;

    if (originalViewBox) {
      [x, y, width, height] = originalViewBox.split(" ").map(Number);
    }

    // Apply graph-specific adjustments
    if (graphType === "patchwork") {
      // Patchwork often needs more space
      const padding = Math.max(width, height) * 0.1;
      svg.setAttribute(
        "viewBox",
        `${x - padding} ${y - padding} ${width + padding * 2} ${
          height + padding * 2
        }`
      );
    } else if (graphType === "osage") {
      // Osage graph handling
      if (width < 100 || height < 100) {
        // Small osage graphs need more space
        svg.setAttribute(
          "viewBox",
          `${x - width * 0.2} ${y - height * 0.2} ${width * 1.4} ${
            height * 1.4
          }`
        );
      } else {
        // Regular osage graphs
        const padding = Math.max(width, height) * 0.1;
        svg.setAttribute(
          "viewBox",
          `${x - padding} ${y - padding} ${width + padding * 2} ${
            height + padding * 2
          }`
        );
      }
    } else {
      // Default handling for mindmap and other graph types
      const padding = Math.max(width, height) * 0.1;
      svg.setAttribute(
        "viewBox",
        `${x - padding} ${y - padding} ${width + padding * 2} ${
          height + padding * 2
        }`
      );
    }

    console.log(
      `Adjusted ${graphType} viewBox: ${svg.getAttribute("viewBox")}`
    );

    // Apply zoom behavior with graph-specific initial transforms
    applyZoomBehavior(svg, graphType);
  };

  // Update zoom behavior to handle each graph type independently
  const applyZoomBehavior = (svg: SVGElement, graphType: string) => {
    if (!svg) return;

    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 8])
      .on("zoom", (event) => {
        const g = d3.select(svg).select("g");
        g.attr("transform", event.transform);
      });

    const svgElement = d3.select(svg);
    svgElement.call(zoom);

    // Calculate appropriate initial zoom/position based on graph contents
    const g = svgElement.select("g").node() as SVGGElement;
    if (g) {
      const bbox = g.getBBox();
      const viewBox = svg.getAttribute("viewBox");

      if (viewBox) {
        const [, , viewBoxWidth, viewBoxHeight] = viewBox
          .split(" ")
          .map(Number);

        // Calculate an appropriate scale that works well for this specific graph
        let scale = Math.min(
          viewBoxWidth / (bbox.width * 1.2),
          viewBoxHeight / (bbox.height * 1.2)
        );

        // Graph-specific scale adjustments
        if (graphType === "patchwork") {
          // Patchwork often needs a bit more space
          scale = Math.min(scale, 0.9);
        } else if (graphType === "osage") {
          // Adjust scale based on osage graph size
          if (bbox.width < 100 || bbox.height < 100) {
            scale = Math.min(scale, 1.5); // Allow more zoom for small osage graphs
          } else {
            scale = Math.min(scale, 0.8); // Standard scale for larger osage graphs
          }
        }

        // Create a transform that centers the graph
        const transform = d3.zoomIdentity
          .translate(
            viewBoxWidth / 2 - (bbox.x + bbox.width / 2) * scale,
            viewBoxHeight / 2 - (bbox.y + bbox.height / 2) * scale
          )
          .scale(scale);

        // Apply the transform
        svgElement.call(zoom.transform, transform);

        // Save this graph's transform in the store for future reference
        const viewState = {
          transform: {
            x: transform.x,
            y: transform.y,
            k: transform.k,
          },
          graphType,
        };

        setDisplayStore({
          viewState: viewState,
        });
      }
    }
  };

  useEffect(() => {
    if (activeGraph !== "mindmap") {
      let dotData = null;

      switch (activeGraph) {
        case "patchwork":
          dotData = patchworkGraph;
          break;
        case "osage":
          dotData = osageGraph;
          break;
      }

      if (dotData) {
        renderGraph(dotData, activeGraph);
      }
    }
  }, [activeGraph, patchworkGraph, osageGraph]);

  // Function to reset a specific graph type to allow regeneration
  const resetGraphType = (graphType: string) => {
    console.log(`Resetting graph type: ${graphType}`);

    // Reset initialization state in store
    setDisplayStore((prev) => ({
      initializedGraphs: {
        ...prev.initializedGraphs,
        [graphType]: false,
      },
    }));

    // Reset local state
    switch (graphType) {
      case "patchwork":
        setPatchworkGraph(null);
        break;
      case "osage":
        setOsageGraph(null);
        break;
    }

    // Reset error state
    setGraphGenerationErrors((prev) => ({
      ...prev,
      [graphType]: false,
    }));
  };

  // Update button click handlers
  const handlePatchworkClick = () => {
    // Allow regeneration if we have an error or no graph
    if (graphGenerationErrors.patchwork || !patchworkGraph) {
      resetGraphType("patchwork");
      handleGenerate(promptGraph.patchWork, "patchwork");
    } else if (
      !initializedGraphs.patchwork &&
      !loading &&
      !graphLoadingStates.patchwork
    ) {
      handleGenerate(promptGraph.patchWork, "patchwork");
    } else if (patchworkGraph) {
      setGraphTypeOnly("patchwork");
    }
  };

  const handleOsageClick = () => {
    // Allow regeneration if we have an error or no graph
    if (graphGenerationErrors.osage || !osageGraph) {
      resetGraphType("osage");
      handleGenerate(promptGraph.osage, "osage");
    } else if (
      !initializedGraphs.osage &&
      !loading &&
      !graphLoadingStates.osage
    ) {
      handleGenerate(promptGraph.osage, "osage");
    } else if (osageGraph) {
      setGraphTypeOnly("osage");
    }
  };

  // Listen for graph regeneration events
  useEffect(() => {
    const handleGraphRegenerated = () => {
      console.log("Graph regenerated, resetting to mindmap view");
      setActiveGraph("mindmap");
      setGraphType("mindmap");

      // Clear any existing graph from other-graph-container
      const otherGraphContainer = document.getElementById(
        "other-graph-container"
      );
      if (otherGraphContainer) {
        otherGraphContainer.innerHTML = "";
      }
    };

    window.addEventListener("graph-regenerated", handleGraphRegenerated);

    return () => {
      window.removeEventListener("graph-regenerated", handleGraphRegenerated);
    };
  }, []);

  const conceptStore = useConceptStore((state) => state.conceptData);
  const graph = useDisplayStore((state) => state.graph);

  // const generateCodebook = () => {
  //   const formattedConceptData = conceptStore.map((conceptItem) => {
  //     const { name, definition, codes } = conceptItem;
  //     const formattedCodes = Object.keys(codes || {})
  //       .map((codeKey) => {
  //         const codeItems = codes![codeKey];
  //         return codeItems.map((code) => ({
  //           name: code.name,
  //           datapoints: Object.values(code.data || {}).flatMap((cards) =>
  //             (cards as any[]).flatMap((cardItem) => {
  //               if (!cardItem?.cards) return [];
  //               return cardItem.cards.map((topics: any) => ({
  //                 content: topics?.content || "",
  //               }));
  //             })
  //           ),
  //         }));
  //       })
  //       .flat();

  //     return {
  //       name,
  //       definition,
  //       codes: formattedCodes,
  //     };
  //   });

  //   return formattedConceptData.map(({ name, codes }) => ({
  //     name,
  //     codes,
  //   }));
  // };

  const codebook = {};

  conceptStore.forEach(({ id, name, definition, codes }) => {
    const concept = { name, definition, codes: {} };

    for (const codeId in codes) {
      codes[codeId].forEach(({ name: codeName, data }) => {
        const clusters = {};

        for (const clusterId in data) {
          data[clusterId].forEach(({ name: clusterName, topics }) => {
            clusters[`Open Code ${clusterId}`] = {
              name: clusterName,
              chunks: topics.map((t) => t.content.trim()),
            };
          });
        }

        concept.codes[`Code${codeId}`] = { name: codeName, clusters };
      });
    }

    codebook[`Concept ${id}`] = concept;
  });

  const extractDotFromResponse = (message: string): string => {
    const dotMatches = [
      // Standard markdown code block format
      message.match(/```dot\n([\s\S]*?)\n```/),
      // Alternative format with spaces
      message.match(/```dot\s+([\s\S]*?)\s+```/),
      // Format without language specifier if dot isn't found
      !message.includes("```dot")
        ? message.match(/```\s*([\s\S]*?)\s*```/)
        : null,
      // Last resort: try to extract anything that looks like a graph definition
      message.match(/(?:digraph|graph)\s+\w*\s*\{([\s\S]*?)\}/),
    ];

    // Use the first successful match
    for (const match of dotMatches) {
      if (match && match[1]) {
        const dotContent = match[1].trim();

        // If we found a graph/digraph fragment without the declaration, add it
        if (dotContent.startsWith("{") && !dotContent.match(/^(di)?graph/)) {
          return `graph G ${dotContent}`;
        }

        // If we have a complete graph definition
        if (dotContent.match(/^(di)?graph/)) {
          return dotContent;
        }

        // Otherwise, wrap the content in a graph declaration
        return `graph G {\n${dotContent}\n}`;
      }
    }

    // If we found a graph definition in the whole message
    const graphMatch = message.match(/(?:digraph|graph)\s+\w*\s*\{[\s\S]*?\}/);
    if (graphMatch) {
      return graphMatch[0];
    }

    return "";
  };

  // Update renderCurrentGraphSVG for better mindmap handling
  const renderCurrentGraphSVG = () => {
    const graphContainer =
      activeGraph === "mindmap"
        ? document.getElementById("graph-container")
        : document.getElementById("other-graph-container");

    if (graphContainer) {
      const svg = graphContainer.querySelector("svg");
      if (svg) {
        // Create a deep clone to avoid affecting the display
        const svgClone = svg.cloneNode(true) as SVGElement;

        // Make all nodes and edges visible in the clone
        svgClone.querySelectorAll(".node").forEach((node) => {
          (node as HTMLElement).style.display = "block";
          (node as HTMLElement).style.opacity = "1";
        });

        svgClone.querySelectorAll(".edge").forEach((edge) => {
          (edge as HTMLElement).style.display = "block";
          (edge as HTMLElement).style.opacity = "1";
          const path = edge.querySelector("path");
          if (path) {
            path.setAttribute("stroke-width", "1");
            path.setAttribute("opacity", "1");
          }
        });

        // Use fixed dimensions for PDF, not affecting the display
        const pdfWidth = 800;
        const pdfHeight = 600;

        // Set dimensions on the clone only
        svgClone.setAttribute("width", pdfWidth.toString());
        svgClone.setAttribute("height", pdfHeight.toString());
        svgClone.setAttribute("preserveAspectRatio", "xMidYMid meet");

        // Store only the SVG string, not modifying the original graph
        const svgString = new XMLSerializer().serializeToString(svgClone);
        console.log(
          `Saving ${activeGraph} SVG for PDF, size: ${svgString.length} bytes`
        );
        useDisplayStore.getState().setRenderedGraphSvg(svgString);
        useDisplayStore.getState().set({ activeGraphType: activeGraph });
      }
    }
  };

  useEffect(() => {
    if (graphRendered) {
      const timer = setTimeout(() => {
        renderCurrentGraphSVG();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [graphRendered, activeGraph]);

  return (
    <div className="flex h-full flex-col border-r border-l overflow-hidden font-zen">
      {/* <h1 className="flex flex-col justify-around bg-gray-200 font-zen px-6 pt-8 pb-2 text-2xl font-extrabold text-[#707070]">
        Theme Map
      </h1> */}
      <div className="flex flex-row items-center justify-around pb-6">
        <button onClick={() => setGraphTypeOnly("mindmap")}>
          <img
            src={mindmap}
            alt="Concept Map"
            className="bg-[#FFF3EE] p-4 rounded-xl mb-4 w-24 h-24 shadow-[6.29px_6.29px_6.29px_0px_#00000040] object-contain"
          />
          <div className="text-[#C66B50] font-semibold">Theme Map</div>
        </button>
        {/* <button onClick={handlePatchworkClick}>
          <img
            src={patchwork}
            alt="Patchwork"
            className="bg-[#FFF3EE] p-4 rounded-xl mb-4 w-24 h-24 shadow-[6.29px_6.29px_6.29px_0px_#00000040] object-contain"
          />
          <div className="text-[#C66B50] font-semibold">Squarified Treemap of Sub-Themes</div>
          {(loading && activeGraph === "patchwork") ||
          graphLoadingStates.patchwork ? (
            <Loading progress={""} />
          ) : null}
        </button> */}
        <button onClick={handleOsageClick}>
          <img
            src={osage}
            alt="Osage"
            className="bg-[#FFF3EE] p-4 rounded-xl mb-4 w-24 h-24 shadow-[6.29px_6.29px_6.29px_0px_#00000040] object-contain"
          />
          <div className="text-[#C66B50] font-semibold">Hierarchical Box</div>
          {(loading && activeGraph === "osage") || graphLoadingStates.osage ? (
            <Loading progress={""} />
          ) : null}
        </button>
      </div>
      <div className="bg-[#FFFFFF] shadow-[0px 4px 4px rgba(0, 0, 0, 0.25)] border-t-2 border-gray-300" />

      {/* Error Alerts */}
      {graphGenerationErrors.patchwork && activeGraph === "patchwork" && (
        <Alert variant="destructive" className="m-4">
          <AlertTitle>Patchwork Generation Failed</AlertTitle>
          <AlertDescription>
            There was an error generating the patchwork visualization. Click the
            patchwork button above to try again.
          </AlertDescription>
        </Alert>
      )}

      {graphGenerationErrors.osage && activeGraph === "osage" && (
        <Alert variant="destructive" className="m-4">
          <AlertTitle>Osage Generation Failed</AlertTitle>
          <AlertDescription>
            There was an error generating the osage visualization. Click the
            osage button above to try again.
          </AlertDescription>
        </Alert>
      )}

      <div className="text-center">
        Drag or scroll to move and zoom the graph
      </div>
      <div className="w-full h-full">
        {activeGraph === "mindmap" ? (
          <MindmapGraph
            graph={graph}
            selectedNode={selectedNode}
            visibleNodes={visibleNodes}
            onNodesExtracted={onNodesExtracted}
          />
        ) : (
          <div
            id="other-graph-container"
            className="flex flex-col justify-start items-center w-full h-screen"
          >
            {(loading ||
              graphLoadingStates[
                activeGraph as keyof typeof graphLoadingStates
              ]) && <Loading progress={""} />}
          </div>
        )}
      </div>
    </div>
  );
};

export default Display;

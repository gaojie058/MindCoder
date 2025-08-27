import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { graphviz } from "d3-graphviz";
import { graph } from "@/types/stores";
import useDisplayStore from "@/stores/useDisplayStore";

interface MindmapGraphProps {
  graph: graph;
  selectedNode: string | null;
  onNodesExtracted: (nodesByLevel: {
    conceptNodes: string[];
    codeNodes: string[];
  }) => void;
  visibleNodes: string[];
}

const MindmapGraph: React.FC<MindmapGraphProps> = ({
  selectedNode,
  onNodesExtracted,
  visibleNodes,
}) => {
  const { graph, setRenderedGraphSvg } = useDisplayStore();
  const graphRef = useRef<HTMLDivElement | null>(null);
  const [nodesExtracted, setNodesExtracted] = useState(false);
  // const [rootNode, setRootNode] = useState<string | null>(null);
  // const [conceptNodes, setConceptNodes] = useState<Set<string>>(new Set());
  // const [rootEdges, setRootEdges] = useState<Set<string>>(new Set());

  // console.log("Visible Nodes before render:", visibleNodes);
  useEffect(() => {
    const renderGraph = (dotData: string) => {
      try {
        graphviz(graphRef.current!)
          .zoom(true)
          .width(700)
          .height(630)
          .engine("dot") 
          .renderDot(dotData)
          .on("end", () => {
            // Capture and store the rendered SVG
            if (graphRef.current) {
              const svgElement = graphRef.current.querySelector("svg");
              if (svgElement) {
                // Clone the SVG to avoid modifying the original
                const svgClone = svgElement.cloneNode(true) as SVGElement;

                // Make all nodes visible for the PDF
                svgClone.querySelectorAll(".node").forEach((node) => {
                  (node as HTMLElement).style.display = "block";
                  (node as HTMLElement).style.opacity = "1";
                });

                // Make all edges visible for the PDF
                svgClone.querySelectorAll(".edge").forEach((edge) => {
                  (edge as HTMLElement).style.display = "block";

                  const path = edge.querySelector("path");
                  if (path) {
                    path.setAttribute("stroke-width", "1");
                    path.setAttribute("opacity", "1");
                  }
                });

                // Set viewBox if not present to ensure proper scaling
                if (!svgClone.getAttribute("viewBox")) {
                  const bbox = svgClone.getBBox();
                  svgClone.setAttribute(
                    "viewBox",
                    `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`
                  );
                }

                // Ensure SVG has width and height
                svgClone.setAttribute("width", "600");
                svgClone.setAttribute("height", "400");

                const svgString = new XMLSerializer().serializeToString(
                  svgClone
                );

                const currentSvg = useDisplayStore.getState().renderedGraphSvg;
                if (currentSvg !== svgString) {
                  setRenderedGraphSvg(svgString);
                  console.log("Updated rendered SVG in store");
                }
              }
            }

            // Interactive nodes
            const highlightEdges = (nodeId: string) => {
              d3.selectAll(".edge path")
                .style("stroke-width", "1px")
                .style("opacity", "0.2");

              const traverse = (nodeId: string, direction: "start" | "end") => {
                d3.selectAll(".edge").each(function () {
                  const edge = d3.select(this);
                  const [startNode, endNode] = edge
                    .select("title")
                    .text()
                    .split("->")
                    .map((n) => n.trim());

                  if (
                    (direction === "start" && endNode === nodeId) ||
                    (direction === "end" && startNode === nodeId)
                  ) {
                    edge
                      .select("path")
                      .style("stroke-width", "3px")
                      .style("opacity", "1");
                    traverse(
                      direction === "start" ? startNode : endNode,
                      direction
                    );
                  }
                });
              };

              traverse(nodeId, "start");
              traverse(nodeId, "end");

              d3.selectAll(".node polygon").style("opacity", (d) =>
                d3.select(d).attr("stroke-width") !== "3px" ? "0.2" : "1"
              );
            };

            d3.selectAll(".node").on("click", function () {
              const nodeId = d3.select(this).select("title").text();

              d3.selectAll(".node polygon")
                .style("stroke-width", "1px")
                .style("opacity", "0.2");
              d3.selectAll(".edge path")
                .style("stroke-width", "1px")
                .style("opacity", "0.2");

              d3.select(this)
                .select("polygon")
                .style("stroke-width", "3px")
                .style("opacity", "1");

              highlightEdges(nodeId);
            });

            d3.selectAll(".node").style("cursor", "pointer");

            if (selectedNode) {
              d3.selectAll(".node").each(function () {
                const node = d3.select(this).select("title").text();
                if (node === selectedNode) {
                  d3.select(this)
                    .select("polygon")
                    .style("stroke-width", "3px")
                    .style("opacity", "1");
                }
              });

              highlightEdges(selectedNode);
            }

            //   if (!nodesExtracted) {
            //     const conceptNodes: Set<string> = new Set();
            //     const codeNodes: Set<string> = new Set();
            //     const edges: [string, string][] = [];

            //     const edgeRegex = /"([^"]+)" -> "([^"]+)"/g;
            //     let match;

            //     while ((match = edgeRegex.exec(dotData)) !== null) {
            //       const startNode = match[1];
            //       const endNode = match[2];
            //       edges.push([startNode, endNode]);
            //     }

            //     const endNodes = edges.map(([, endNode]) => endNode);
            //     const rootNode = edges.find(
            //       ([startNode]) => !endNodes.includes(startNode)
            //     )?.[0];

            //     if (rootNode) {
            //       setRootNode(rootNode);
            //       const connectedEdges: Set<string> = new Set();

            //       edges.forEach(([startNode, endNode]) => {
            //         if (startNode === rootNode) {
            //           conceptNodes.add(endNode);
            //           connectedEdges.add(`${startNode}->${endNode}`);
            //         }
            //       });

            //       edges.forEach(([startNode, endNode]) => {
            //         if (conceptNodes.has(startNode)) {
            //           codeNodes.add(endNode);
            //           connectedEdges.add(`${startNode}->${endNode}`);
            //         }
            //       });

            //       setRootEdges(connectedEdges);
            //       setConceptNodes(conceptNodes);

            //       const conceptNodesArray = Array.from(conceptNodes);
            //       const codeNodesArray = Array.from(codeNodes);

            //       if (conceptNodesArray.length > 0 || codeNodesArray.length > 0) {
            //         onNodesExtracted({
            //           conceptNodes: conceptNodesArray,
            //           codeNodes: codeNodesArray,
            //         });
            //         setNodesExtracted(true);
            //       }
            //     } else {
            //       console.log("Root node not found.");
            //     }
            //   }

            //   d3.selectAll(".node").style("display", function () {
            //     const nodeId = d3.select(this).select("title").text();
            //     if (nodeId === rootNode) {
            //       return "block";
            //     }
            //     return visibleNodes.includes(nodeId) ? "block" : "none";
            //   });

            //   d3.selectAll(".edge").style("display", function () {
            //     const edge = d3.select(this);
            //     const [startNode, endNode] = edge
            //       .select("title")
            //       .text()
            //       .split("->")
            //       .map((n) => n.trim());

            //     const anyConceptVisible = Array.from(conceptNodes).some(
            //       (concept) => visibleNodes.includes(concept)
            //     );

            //     if (rootEdges.has(`${startNode}->${endNode}`)) {
            //       return anyConceptVisible ? "block" : "none";
            //     }

            //     return visibleNodes.includes(startNode) &&
            //       visibleNodes.includes(endNode)
            //       ? "block"
            //       : "none";
            //   });
          });
      } catch (error) {
        console.error("Graphviz rendering error:", error);
      }
    };

    if (graphRef.current && graph && graph.dot) {
      renderGraph(graph.dot);
    }
  }, [
    graph,
    selectedNode,
    visibleNodes,
    nodesExtracted,
    onNodesExtracted,
    // setRenderedGraphSvg,
    // rootNode,
    // rootEdges,
    // conceptNodes,
  ]);

  return (
    <div
      ref={graphRef}
      id="graph-container"
      className="flex flex-col justify-start items-center w-full h-screen"
    ></div>
  );
};

export default MindmapGraph;

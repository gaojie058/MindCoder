import React, { useEffect, useRef } from "react";
import { graphviz } from "d3-graphviz";
import * as d3 from "d3";
import { graph } from "@/types/stores";

interface FlowchartProps {
  graph: graph;
}

const Flowchart: React.FC<FlowchartProps> = ({ graph }) => {
  const graphRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (graphRef.current && graph && graph.dot) {
      graphviz(graphRef.current)
        .zoom(true)
        .engine("dot") 
        .renderDot(graph.dot);
    }
  }, [graph]);

  return (
    <div
      ref={graphRef}
      id="graph-container"
      className="flex flex-col justify-start items-center w-full h-screen"
    >
      <div>Drag or scroll to move and zoom the graph</div>
    </div>
  );
};

export default Flowchart;

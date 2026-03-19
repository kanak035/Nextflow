"use client";

import React from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";

const initialNodes: Node[] = [
  {
    id: "1",
    position: { x: 250, y: 100 },
    data: { label: "Start" },
    type: "input",
  },
  {
    id: "2",
    position: { x: 250, y: 250 },
    data: { label: "LLM Node (placeholder)" },
  },
];

const initialEdges: Edge[] = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
    animated: true,
  },
];

let id = 3;
const getId = () => `${id++}`;

export default function Home() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const addNode = (label: string) => {
    const newNode: Node = {
      id: getId(),
      position: { x: 400, y: 200 },
      data: { label },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-50">
      <main className="flex h-full">
        {/* Left sidebar */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900/60 px-4 py-6">
          <div className="mb-6 text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
            Quick Access
          </div>
          <div className="space-y-2 text-sm">
            <button
              className="w-full rounded-md bg-slate-800 px-3 py-2 text-left text-slate-100"
              onClick={() => addNode("Text Node")}
            >
              Text Node
            </button>
            <button
              className="w-full rounded-md bg-slate-800 px-3 py-2 text-left text-slate-100"
              onClick={() => addNode("Upload Image Node")}
            >
              Upload Image
            </button>
            <button
              className="w-full rounded-md bg-slate-800 px-3 py-2 text-left text-slate-100"
              onClick={() => addNode("Upload Video Node")}
            >
              Upload Video
            </button>
            <button
              className="w-full rounded-md bg-slate-800 px-3 py-2 text-left text-slate-100"
              onClick={() => addNode("LLM Node")}
            >
              LLM
            </button>
            <button
              className="w-full rounded-md bg-slate-800 px-3 py-2 text-left text-slate-100"
              onClick={() => addNode("Crop Image Node")}
            >
              Crop Image
            </button>
            <button
              className="w-full rounded-md bg-slate-800 px-3 py-2 text-left text-slate-100"
              onClick={() => addNode("Extract Frame Node")}
            >
              Extract Frame
            </button>
          </div>
        </aside>

        {/* Center canvas with React Flow */}
        <section className="flex-1 border-r border-slate-800 bg-slate-950/70">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
          >
            <MiniMap />
            <Controls />
            <Background gap={20} size={1} />
          </ReactFlow>
        </section>

        {/* Right sidebar */}
        <aside className="w-80 bg-slate-900/60 px-4 py-6">
          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
            Workflow History
          </div>
          <p className="text-xs text-slate-500">
            Runs will appear here once you execute a workflow.
          </p>
        </aside>
      </main>
    </div>
  );
}

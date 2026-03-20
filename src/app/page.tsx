"use client";

import React from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  type Connection,
  type NodeTypes,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { BasicNode } from "../components/BasicNode";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";

type NodeKind =
  | "text"
  | "uploadImage"
  | "uploadVideo"
  | "llm"
  | "cropImage"
  | "extractFrame";

function createNodeData(kind: NodeKind) {
  switch (kind) {
    case "text":
      return {
        label: "Text Node",
        description: "Free-form text input (prompt or content).",
      };
    case "uploadImage":
      return {
        label: "Upload Image",
        description: "Upload an image via Transloadit.",
      };
    case "uploadVideo":
      return {
        label: "Upload Video",
        description: "Upload a video file for processing.",
      };
    case "llm":
      return {
        label: "LLM Node",
        description: "Runs a Gemini model via Trigger.dev.",
      };
    case "cropImage":
      return {
        label: "Crop Image",
        description: "Crop an image frame using FFmpeg.",
      };
    case "extractFrame":
      return {
        label: "Extract Frame",
        description: "Extract a frame from a video using FFmpeg.",
      };
    default: {
      // Makes the switch exhaustive when NodeKind changes.
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

const initialNodes: Node[] = [
  {
    id: "1",
    position: { x: 250, y: 100 },
    data: createNodeData("text"),
    type: "basic",
  },
  {
    id: "2",
    position: { x: 250, y: 250 },
    data: createNodeData("llm"),
    type: "basic",
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

const nodeTypes: NodeTypes = {
  basic: BasicNode,
};

export default function Home() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const addNode = (kind: NodeKind) => {
    const newNode: Node = {
      id: getId(),
      position: { x: 400, y: 200 },
      data: createNodeData(kind),
      type: "basic",
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const onConnect = React.useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: true }, eds));
    },
    [setEdges],
  );

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-50">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-2 text-xs">
        <div className="font-semibold tracking-[0.18em] text-slate-400">
          NEXTFLOW
        </div>
        <div>
          <Show when="signed-in">
            <UserButton />
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="rounded-md bg-slate-800 px-3 py-1 text-xs text-slate-100">
                Sign in
              </button>
            </SignInButton>
          </Show>
        </div>
      </header>
      <main className="flex h-[calc(100vh-2.5rem)]">
        {/* Left sidebar */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900/60 px-4 py-6">
          <div className="mb-6 text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
            Quick Access
          </div>
          <div className="space-y-2 text-sm">
            <button
              className="w-full rounded-md bg-slate-800 px-3 py-2 text-left text-slate-100"
              onClick={() => addNode("text")}
            >
              Text Node
            </button>
            <button
              className="w-full rounded-md bg-slate-800 px-3 py-2 text-left text-slate-100"
              onClick={() => addNode("uploadImage")}
            >
              Upload Image
            </button>
            <button
              className="w-full rounded-md bg-slate-800 px-3 py-2 text-left text-slate-100"
              onClick={() => addNode("uploadVideo")}
            >
              Upload Video
            </button>
            <button
              className="w-full rounded-md bg-slate-800 px-3 py-2 text-left text-slate-100"
              onClick={() => addNode("llm")}
            >
              LLM
            </button>
            <button
              className="w-full rounded-md bg-slate-800 px-3 py-2 text-left text-slate-100"
              onClick={() => addNode("cropImage")}
            >
              Crop Image
            </button>
            <button
              className="w-full rounded-md bg-slate-800 px-3 py-2 text-left text-slate-100"
              onClick={() => addNode("extractFrame")}
            >
              Extract Frame
            </button>
          </div>
        </aside>

        {/* Center canvas with React Flow, protected by auth */}
        <section className="flex-1 border-r border-slate-800 bg-slate-950/70">
          <Show when="signed-in">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              fitView
            >
              <MiniMap />
              <Controls />
              <Background gap={20} size={1} />
            </ReactFlow>
          </Show>
          <Show when="signed-out">
            <div className="flex h-full items-center justify-center text-xs text-slate-400">
              Please sign in to access the workflow builder.
            </div>
          </Show>
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

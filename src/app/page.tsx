"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type ReactFlowInstance,
  type NodeTypes,
} from "reactflow";
import "reactflow/dist/style.css";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { Download, Loader2, Play, Redo2, Save, Undo2, Upload } from "lucide-react";
import { TextNode } from "../components/nodes/TextNode";
import { UploadImageNode } from "../components/nodes/UploadImageNode";
import { UploadVideoNode } from "../components/nodes/UploadVideoNode";
import { LLMNode } from "../components/nodes/LLMNode";
import { CropImageNode } from "../components/nodes/CropImageNode";
import { ExtractFrameNode } from "../components/nodes/ExtractFrameNode";
import { HistorySidebar } from "../components/HistorySidebar";
import { useWorkflowStore } from "../lib/store";
import {
  createSampleWorkflowGraph,
  createNodeData,
  workflowGraphSchema,
  type WorkflowGraph,
  type WorkflowNodeKind,
} from "../lib/workflow-graph";
import {
  runSelectedNodesAction,
  runWorkflowAction,
  saveWorkflowAction,
} from "./actions/workflow";

const nodeTypes: NodeTypes = {
  text: TextNode,
  uploadImage: UploadImageNode,
  uploadVideo: UploadVideoNode,
  llm: LLMNode,
  cropImage: CropImageNode,
  extractFrame: ExtractFrameNode,
};

let nextId = 1000;
const getId = () => `${nextId++}`;

type WorkflowBootstrapResponse =
  | {
      workflowId: string;
      name: string;
      graph: WorkflowGraph;
    }
  | {
      error?: string;
    };

function isWorkflowBootstrapResponse(
  value: WorkflowBootstrapResponse
): value is Extract<WorkflowBootstrapResponse, { workflowId: string }> {
  return "workflowId" in value && "name" in value && "graph" in value;
}

export default function Home() {
  const [isRunning, startRunTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();
  const [isRunningSelected, startSelectedRunTransition] = useTransition();
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const {
    workflowId,
    workflowName,
    nodes,
    edges,
    canUndo,
    canRedo,
    onNodesChange,
    onEdgesChange,
    onConnect,
    isValidConnection,
    addNode,
    removeEdgeById,
    loadWorkflowGraph,
    setWorkflowMeta,
    setWorkflowName,
    undo,
    redo,
  } = useWorkflowStore();
  const selectedNodeIds = nodes.filter((node) => node.selected).map((node) => node.id);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const response = await fetch("/api/workflows/current", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        const workflow = (await response.json()) as WorkflowBootstrapResponse;

        if (!cancelled) {
          if (!response.ok || !workflow || !isWorkflowBootstrapResponse(workflow)) {
            const sample = createSampleWorkflowGraph();
            loadWorkflowGraph("sample-workflow", "Sample workflow", sample.nodes, sample.edges);
            setBootstrapError(
              workflow && "error" in workflow
                ? workflow.error ?? "Unknown bootstrap error"
                : `Failed to fetch workflow (${response.status})`
            );
          } else {
            loadWorkflowGraph(
              workflow.workflowId,
              workflow.name,
              workflow.graph.nodes,
              workflow.graph.edges
            );
          }
          setIsBootstrapping(false);
        }
      } catch (error) {
        if (!cancelled) {
          const sample = createSampleWorkflowGraph();
          loadWorkflowGraph("sample-workflow", "Sample workflow", sample.nodes, sample.edges);
          setBootstrapError(error instanceof Error ? error.message : String(error));
          setIsBootstrapping(false);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [loadWorkflowGraph]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isModifierPressed = event.metaKey || event.ctrlKey;
      if (!isModifierPressed) {
        return;
      }

      if (event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }

      if (
        event.key.toLowerCase() === "y" ||
        (event.key.toLowerCase() === "z" && event.shiftKey)
      ) {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [redo, undo]);

  const saveWorkflow = () => {
    startSaveTransition(async () => {
      const response = await saveWorkflowAction({
        workflowId: workflowId ?? undefined,
        name: workflowName,
        graph: {
          nodes: nodes as WorkflowGraph["nodes"],
          edges: edges as WorkflowGraph["edges"],
        },
      });

      if (response.success) {
        setWorkflowMeta(response.workflowId, response.name);
      }
    });
  };

  const runWorkflow = () => {
    startRunTransition(async () => {
      const response = await runWorkflowAction({
        workflowId: workflowId ?? undefined,
        name: workflowName,
        graph: {
          nodes: nodes as WorkflowGraph["nodes"],
          edges: edges as WorkflowGraph["edges"],
        },
      });

      if (response.workflowId) {
        setWorkflowMeta(response.workflowId, workflowName);
      }

      if (response.nodes && response.edges) {
        loadWorkflowGraph(
          response.workflowId,
          workflowName,
          response.nodes,
          response.edges
        );
      }
    });
  };

  const runSelectedNodes = () => {
    if (selectedNodeIds.length === 0) {
      return;
    }

    startSelectedRunTransition(async () => {
      const response = await runSelectedNodesAction({
        workflowId: workflowId ?? undefined,
        name: workflowName,
        selectedNodeIds,
        graph: {
          nodes: nodes as WorkflowGraph["nodes"],
          edges: edges as WorkflowGraph["edges"],
        },
      });

      if (response.workflowId) {
        setWorkflowMeta(response.workflowId, workflowName);
      }

      if (response.nodes && response.edges) {
        loadWorkflowGraph(
          response.workflowId,
          workflowName,
          response.nodes,
          response.edges
        );
      }
    });
  };

  const exportWorkflow = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            workflowId,
            name: workflowName,
            graph: { nodes, edges },
          },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${workflowName.replace(/\s+/g, "-").toLowerCase() || "workflow"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const loadSampleWorkflow = () => {
    const sample = createSampleWorkflowGraph();
    loadWorkflowGraph(
      workflowId ?? "sample-workflow",
      "Sample workflow",
      sample.nodes,
      sample.edges
    );
  };

  const importWorkflow = async (file: File) => {
    const content = await file.text();
    const parsed = JSON.parse(content) as unknown;
    const imported = workflowGraphSchema.parse(
      typeof parsed === "object" && parsed !== null && "graph" in parsed
        ? (parsed as { graph: unknown }).graph
        : parsed
    );
    const importedName = file.name.replace(/\.json$/i, "") || "Imported workflow";
    const response = await saveWorkflowAction({
      name: importedName,
      graph: imported,
    });
    loadWorkflowGraph(response.workflowId, response.name, imported.nodes, imported.edges);
  };

  const addNodeFromKind = (kind: WorkflowNodeKind, position?: { x: number; y: number }) => {
    addNode({
      id: getId(),
      position: position ?? { x: 400, y: 200 },
      data: createNodeData(kind),
      type: kind,
    });
  };

  const handleCanvasDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    const kind = event.dataTransfer.getData("application/reactflow") as WorkflowNodeKind;
    if (!kind || !reactFlowInstance) {
      return;
    }

    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    addNodeFromKind(kind, position);
  };

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-50">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-2 text-xs">
        <div className="flex items-center gap-4">
          <div className="font-semibold tracking-[0.18em] text-slate-400">
            NEXTFLOW
          </div>
          <input
            value={workflowName}
            onChange={(event) => setWorkflowName(event.target.value)}
            className="w-52 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-emerald-500"
            placeholder="Workflow name"
          />
          <button
            onClick={saveWorkflow}
            disabled={isSaving || isBootstrapping}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-white transition-colors hover:bg-slate-700 disabled:bg-slate-900 flex items-center gap-2"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
          <button
            onClick={undo}
            disabled={!canUndo || isBootstrapping}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-white transition-colors hover:bg-slate-700 disabled:bg-slate-900 flex items-center gap-2"
          >
            <Undo2 size={14} />
            Undo
          </button>
          <button
            onClick={redo}
            disabled={!canRedo || isBootstrapping}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-white transition-colors hover:bg-slate-700 disabled:bg-slate-900 flex items-center gap-2"
          >
            <Redo2 size={14} />
            Redo
          </button>
          <button
            onClick={loadSampleWorkflow}
            disabled={isBootstrapping}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-white transition-colors hover:bg-slate-700 disabled:bg-slate-900"
          >
            Load Sample
          </button>
          <button
            onClick={exportWorkflow}
            disabled={isBootstrapping || nodes.length === 0}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-white transition-colors hover:bg-slate-700 disabled:bg-slate-900 flex items-center gap-2"
          >
            <Download size={14} />
            Export JSON
          </button>
          <button
            onClick={() => importInputRef.current?.click()}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-white transition-colors hover:bg-slate-700 flex items-center gap-2"
          >
            <Upload size={14} />
            Import JSON
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                importWorkflow(file).catch((error) => {
                  console.error("Failed to import workflow:", error);
                });
              }
              event.target.value = "";
            }}
          />
          <button
            onClick={runSelectedNodes}
            disabled={isRunningSelected || isBootstrapping || selectedNodeIds.length === 0}
            className="rounded-md bg-sky-600 px-3 py-1.5 text-white transition-colors hover:bg-sky-700 disabled:bg-slate-800 flex items-center gap-2 font-medium"
          >
            {isRunningSelected ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Play size={14} fill="currentColor" />
            )}
            Run Selected ({selectedNodeIds.length})
          </button>
          <button
            onClick={runWorkflow}
            disabled={isRunning || isBootstrapping}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-white transition-colors hover:bg-emerald-700 disabled:bg-slate-800 flex items-center gap-2 font-medium"
          >
            {isRunning ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Play size={14} fill="currentColor" />
            )}
            Run Full Workflow
          </button>
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
      {bootstrapError ? (
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-[11px] text-amber-200">
          Workflow bootstrap failed: {bootstrapError}. The app loaded a local sample instead. Check Vercel environment variables like `DATABASE_URL`.
        </div>
      ) : null}
      <main className="flex h-[calc(100vh-2.5rem)]">
        <aside className="w-64 border-r border-slate-800 bg-slate-900/60 px-4 py-6">
          <div className="mb-6 text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
            Quick Access
          </div>
          <div className="space-y-2 text-sm">
            {(
              [
                "text",
                "uploadImage",
                "uploadVideo",
                "llm",
                "cropImage",
                "extractFrame",
              ] as WorkflowNodeKind[]
            ).map((kind) => (
              <button
                key={kind}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("application/reactflow", kind);
                  event.dataTransfer.effectAllowed = "move";
                }}
                className="w-full rounded-md bg-slate-800 px-3 py-2 text-left text-slate-100 cursor-grab active:cursor-grabbing"
                onClick={() => addNodeFromKind(kind)}
              >
                {createNodeData(kind).label}
              </button>
            ))}
          </div>
        </aside>

        <section
          className="flex-1 border-r border-slate-800 bg-slate-950/70"
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
          }}
          onDrop={handleCanvasDrop}
        >
          <Show when="signed-in">
            {isBootstrapping ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Loading workflow...
              </div>
            ) : (
              <ReactFlow
                onInit={setReactFlowInstance}
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onEdgeDoubleClick={(_, edge) => removeEdgeById(edge.id)}
                isValidConnection={isValidConnection}
                defaultEdgeOptions={{
                  animated: true,
                  style: { stroke: "#a855f7", strokeWidth: 2 },
                }}
                fitView
              >
                <MiniMap />
                <Controls />
                <Background gap={20} size={1} />
              </ReactFlow>
            )}
          </Show>
          <Show when="signed-out">
            <div className="flex h-full items-center justify-center text-xs text-slate-400">
              Please sign in to access the workflow builder.
            </div>
          </Show>
        </section>

        <aside className="w-96 border-l border-slate-800 bg-slate-900/60 px-4 py-6">
          <div className="mb-3 text-[10px] uppercase tracking-[0.16em] text-slate-500">
            Double-click any edge to remove it.
          </div>
          <HistorySidebar />
        </aside>
      </main>
    </div>
  );
}

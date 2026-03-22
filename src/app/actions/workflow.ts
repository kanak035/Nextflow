"use server";

import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { tasks } from "@trigger.dev/sdk/v3";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getExecutionOrder } from "@/lib/engine";
import {
  parseWorkflowGraph,
  saveWorkflowForOwner,
  getOrCreateWorkflowForOwner,
} from "@/lib/workflow-service";
import {
  syncDataFlow,
  type WorkflowGraph,
  type WorkflowGraphNode,
} from "@/lib/workflow-graph";

const DEFAULT_LLM_MODEL = "gemini-2.5-flash";
const NODE_RUN_TIMEOUT_MS = 120_000;

type NodeRunRecord = Awaited<ReturnType<typeof prisma.nodeRun.findUnique>>;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTaskIdForNode(nodeType: string) {
  switch (nodeType) {
    case "text":
      return "text-node-task";
    case "uploadImage":
      return "upload-image-node-task";
    case "uploadVideo":
      return "upload-video-node-task";
    case "llm":
      return "gemini-task";
    case "cropImage":
      return "crop-image-task";
    case "extractFrame":
      return "extract-frame-task";
    default:
      throw new Error(`Unsupported node type: ${nodeType}`);
  }
}

function getNodeTaskPayload(node: WorkflowGraphNode, workflowRunId: string, nodeRunId: string) {
  switch (node.type) {
    case "text":
      return {
        nodeId: node.id,
        text: String(node.data.text ?? ""),
        workflowRunId,
        nodeRunId,
      };
    case "uploadImage":
      return {
        nodeId: node.id,
        imageUrl: String(node.data.imageUrl ?? ""),
        workflowRunId,
        nodeRunId,
      };
    case "uploadVideo":
      return {
        nodeId: node.id,
        videoUrl: String(node.data.videoUrl ?? ""),
        workflowRunId,
        nodeRunId,
      };
    case "llm":
      return {
        nodeId: node.id,
        model: String(node.data.model ?? DEFAULT_LLM_MODEL),
        systemPrompt: String(node.data.systemPrompt ?? ""),
        userPrompt: String(node.data.userPrompt ?? ""),
        imageUrl: typeof node.data.imageInput === "string" ? node.data.imageInput : undefined,
        workflowRunId,
        nodeRunId,
      };
    case "cropImage":
      return {
        nodeId: node.id,
        imageUrl: String(node.data.inputImageUrl ?? ""),
        x: Number(node.data.x ?? 0),
        y: Number(node.data.y ?? 0),
        width: Number(node.data.width ?? 80),
        height: Number(node.data.height ?? 80),
        workflowRunId,
        nodeRunId,
      };
    case "extractFrame":
      return {
        nodeId: node.id,
        videoUrl: String(node.data.inputVideoUrl ?? ""),
        timestamp: Number(node.data.timestamp ?? 1),
        workflowRunId,
        nodeRunId,
      };
  }
}

function nodeHasRequiredInput(node: WorkflowGraphNode) {
  switch (node.type) {
    case "text":
      return true;
    case "uploadImage":
      return typeof node.data.imageUrl === "string" && node.data.imageUrl.length > 0;
    case "uploadVideo":
      return typeof node.data.videoUrl === "string" && node.data.videoUrl.length > 0;
    case "llm":
      return Boolean(node.data.userPrompt || node.data.systemPrompt || node.data.imageInput);
    case "cropImage":
      return typeof node.data.inputImageUrl === "string" && node.data.inputImageUrl.length > 0;
    case "extractFrame":
      return typeof node.data.inputVideoUrl === "string" && node.data.inputVideoUrl.length > 0;
    default:
      return false;
  }
}

function applyNodeRunOutput(node: WorkflowGraphNode, nodeRun: NonNullable<NodeRunRecord>) {
  const output = (nodeRun.output ?? {}) as Record<string, unknown>;

  switch (node.type) {
    case "text":
      return {
        ...node,
        data: {
          ...node.data,
          text: output.text ?? node.data.text,
          result: "Text ready",
          status: nodeRun.status,
        },
      };
    case "uploadImage":
      return {
        ...node,
        data: {
          ...node.data,
          imageUrl: output.imageUrl ?? node.data.imageUrl,
          result: output.imageUrl ? "Image uploaded" : "Image ready",
          status: nodeRun.status,
        },
      };
    case "uploadVideo":
      return {
        ...node,
        data: {
          ...node.data,
          videoUrl: output.videoUrl ?? node.data.videoUrl,
          result: output.videoUrl ? "Video uploaded" : "Video ready",
          status: nodeRun.status,
        },
      };
    case "llm":
      return {
        ...node,
        data: {
          ...node.data,
          result: output.text ?? "LLM completed",
          outputText: output.text,
          status: nodeRun.status,
        },
      };
    case "cropImage":
      return {
        ...node,
        data: {
          ...node.data,
          outputUrl: output.outputUrl,
          result: output.outputUrl ? "Crop complete." : "Crop completed",
          status: nodeRun.status,
        },
      };
    case "extractFrame":
      return {
        ...node,
        data: {
          ...node.data,
          outputUrl: output.outputUrl,
          result: output.outputUrl ? "Frame extracted." : "Extract completed",
          status: nodeRun.status,
        },
      };
    default:
      return node;
  }
}

async function waitForNodeRunCompletion(nodeRunId: string, timeoutMs = NODE_RUN_TIMEOUT_MS) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const nodeRun = await prisma.nodeRun.findUnique({
      where: { id: nodeRunId },
    });

    if (nodeRun && nodeRun.status !== "RUNNING") {
      return nodeRun;
    }

    await sleep(1000);
  }

  throw new Error(`Timed out waiting for node run ${nodeRunId}`);
}

async function triggerTrackedNodeRun(
  workflowRunId: string,
  node: WorkflowGraphNode
) {
  const nodeRun = await prisma.nodeRun.create({
    data: {
      workflowRunId,
      nodeId: node.id,
      status: "RUNNING",
    },
  });

  const payload = getNodeTaskPayload(node, workflowRunId, nodeRun.id);
  await prisma.nodeRun.update({
    where: { id: nodeRun.id },
    data: {
      input: payload as Prisma.InputJsonValue,
    },
  });
  await tasks.trigger(getTaskIdForNode(node.type), payload);

  const completedNodeRun = await waitForNodeRunCompletion(nodeRun.id);

  return {
    nodeRun: completedNodeRun,
  };
}

async function updateWorkflowRunStatus(
  workflowRunId: string,
  status: "RUNNING" | "SUCCESS" | "FAILED" | "PARTIAL",
  startedAt: number,
  errorMessage?: string
) {
  await prisma.workflowRun.update({
    where: { id: workflowRunId },
    data: {
      status,
      errorMessage,
      durationMs: Date.now() - startedAt,
    },
  });
}

async function ensureAuthorizedWorkflow(workflowId?: string) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  if (workflowId) {
    const saved = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        ownerId: userId,
      },
    });

    if (saved) {
      return { userId, workflow: saved };
    }
  }

  const workflow = await getOrCreateWorkflowForOwner(userId);
  return { userId, workflow };
}

export async function loadWorkflowAction() {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const workflow = await getOrCreateWorkflowForOwner(userId);
  const graph = parseWorkflowGraph(workflow.graph);
  return {
    workflowId: workflow.id,
    name: workflow.name,
    graph,
  };
}

export async function saveWorkflowAction(payload: {
  workflowId?: string;
  name: string;
  graph: WorkflowGraph;
}) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const workflow = await saveWorkflowForOwner(userId, payload);
  revalidatePath("/");

  return {
    success: true,
    workflowId: workflow.id,
    name: workflow.name,
  };
}

async function runSingleNode(node: WorkflowGraphNode, workflowId?: string) {
  const { userId, workflow } = await ensureAuthorizedWorkflow(workflowId);
  const startedAt = Date.now();

  const workflowRun = await prisma.workflowRun.create({
    data: {
      workflowId: workflow.id,
      ownerId: userId,
      scope: "SINGLE",
      status: "RUNNING",
    },
  });

  try {
    const { nodeRun } = await triggerTrackedNodeRun(workflowRun.id, node);
    const success = nodeRun.status === "SUCCESS";
    await updateWorkflowRunStatus(
      workflowRun.id,
      success ? "SUCCESS" : "FAILED",
      startedAt,
      nodeRun.errorMessage ?? undefined
    );

    const output = (nodeRun.output ?? {}) as Record<string, unknown>;

    return {
      success,
      workflowId: workflow.id,
      workflowRunId: workflowRun.id,
      nodeRunId: nodeRun.id,
      text: typeof output.text === "string" ? output.text : undefined,
      outputUrl: typeof output.outputUrl === "string" ? output.outputUrl : undefined,
      imageUrl: typeof output.imageUrl === "string" ? output.imageUrl : undefined,
      videoUrl: typeof output.videoUrl === "string" ? output.videoUrl : undefined,
      error: nodeRun.errorMessage ?? undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateWorkflowRunStatus(workflowRun.id, "FAILED", startedAt, message);
    return {
      success: false,
      workflowId: workflow.id,
      workflowRunId: workflowRun.id,
      error: message,
    };
  } finally {
    revalidatePath("/");
  }
}

export async function runLLMNodeAction(payload: {
  workflowId?: string;
  nodeId: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  imageUrl?: string;
}) {
  return runSingleNode(
    {
      id: payload.nodeId,
      type: "llm",
      position: { x: 0, y: 0 },
      data: {
        model: payload.model,
        systemPrompt: payload.systemPrompt,
        userPrompt: payload.userPrompt,
        imageInput: payload.imageUrl,
      },
    },
    payload.workflowId
  );
}

export async function runCropNodeAction(payload: {
  workflowId?: string;
  nodeId: string;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  return runSingleNode(
    {
      id: payload.nodeId,
      type: "cropImage",
      position: { x: 0, y: 0 },
      data: {
        inputImageUrl: payload.imageUrl,
        x: payload.x,
        y: payload.y,
        width: payload.width,
        height: payload.height,
      },
    },
    payload.workflowId
  );
}

export async function runExtractFrameAction(payload: {
  workflowId?: string;
  nodeId: string;
  videoUrl: string;
  timestamp: number;
}) {
  return runSingleNode(
    {
      id: payload.nodeId,
      type: "extractFrame",
      position: { x: 0, y: 0 },
      data: {
        inputVideoUrl: payload.videoUrl,
        timestamp: payload.timestamp,
      },
    },
    payload.workflowId
  );
}

export async function runWorkflowAction(payload: {
  workflowId?: string;
  name: string;
  graph: WorkflowGraph;
}) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const graph = parseWorkflowGraph(payload.graph);
  const workflow = await saveWorkflowForOwner(userId, {
    workflowId: payload.workflowId,
    name: payload.name,
    graph,
  });

  const startedAt = Date.now();
  const workflowRun = await prisma.workflowRun.create({
    data: {
      workflowId: workflow.id,
      ownerId: userId,
      scope: "FULL",
      status: "RUNNING",
    },
  });

  let workingNodes = syncDataFlow(graph.nodes, graph.edges);
  let hasFailure = false;

  for (const node of getExecutionOrder(workingNodes, graph.edges) as WorkflowGraphNode[]) {
    if (!nodeHasRequiredInput(node)) {
      workingNodes = syncDataFlow(
        workingNodes.map((candidate) =>
          candidate.id === node.id
            ? {
                ...candidate,
                data: {
                  ...candidate.data,
                  result: "Skipped: missing input",
                  status: "SKIPPED",
                },
              }
            : candidate
        ),
        graph.edges
      );
      continue;
    }

    try {
      const { nodeRun } = await triggerTrackedNodeRun(workflowRun.id, node);

      if (nodeRun.status !== "SUCCESS") {
        hasFailure = true;
      }

      workingNodes = syncDataFlow(
        workingNodes.map((candidate) =>
          candidate.id === node.id && nodeRun
            ? applyNodeRunOutput(candidate, nodeRun)
            : candidate
        ),
        graph.edges
      );
    } catch (error) {
      hasFailure = true;
      const message = error instanceof Error ? error.message : String(error);
      workingNodes = syncDataFlow(
        workingNodes.map((candidate) =>
          candidate.id === node.id
            ? {
                ...candidate,
                data: {
                  ...candidate.data,
                  result: `Error: ${message}`,
                  status: "FAILED",
                },
              }
            : candidate
        ),
        graph.edges
      );
      break;
    }
  }

  await updateWorkflowRunStatus(
    workflowRun.id,
    hasFailure ? "PARTIAL" : "SUCCESS",
    startedAt,
    hasFailure ? "One or more nodes failed during execution." : undefined
  );

  await prisma.workflow.update({
    where: { id: workflow.id },
    data: {
      graph: {
        nodes: workingNodes,
        edges: graph.edges,
      } as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/");

  return {
    success: !hasFailure,
    workflowId: workflow.id,
    workflowRunId: workflowRun.id,
    nodes: workingNodes,
    edges: graph.edges,
  };
}

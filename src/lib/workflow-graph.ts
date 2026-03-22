import { z } from "zod";

export type WorkflowNodeKind =
  | "text"
  | "uploadImage"
  | "uploadVideo"
  | "llm"
  | "cropImage"
  | "extractFrame";

export type WorkflowGraphNode = WorkflowGraph["nodes"][number];
export type WorkflowGraphEdge = WorkflowGraph["edges"][number];

type GraphNodeLike = {
  id: string;
  type?: string;
  data: Record<string, unknown>;
};

type GraphEdgeLike = {
  source: string;
  target: string;
  targetHandle?: string | null;
};

export const workflowGraphSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      type: z.enum([
        "text",
        "uploadImage",
        "uploadVideo",
        "llm",
        "cropImage",
        "extractFrame",
      ]),
      position: z.object({
        x: z.number(),
        y: z.number(),
      }),
      data: z.record(z.string(), z.unknown()),
    })
  ),
  edges: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      target: z.string(),
      sourceHandle: z.string().nullable().optional(),
      targetHandle: z.string().nullable().optional(),
      animated: z.boolean().optional(),
    })
  ),
});

export type WorkflowGraph = z.infer<typeof workflowGraphSchema>;

export function createNodeData(kind: WorkflowNodeKind) {
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
        model: "gemini-2.5-flash",
      };
    case "cropImage":
      return {
        label: "Crop Image",
        description: "Crop an image frame using FFmpeg.",
        x: 10,
        y: 10,
        width: 60,
        height: 60,
      };
    case "extractFrame":
      return {
        label: "Extract Frame",
        description: "Extract a frame from a video using FFmpeg.",
        timestamp: 1,
      };
  }
}

export function createSampleWorkflowGraph(): WorkflowGraph {
  const nodes: WorkflowGraph["nodes"] = [
    {
      id: "text-1",
      type: "text",
      position: { x: 120, y: 80 },
      data: {
        ...createNodeData("text"),
        text: "Describe the cropped image in one sentence.",
      },
    },
    {
      id: "upload-image-1",
      type: "uploadImage",
      position: { x: 120, y: 280 },
      data: createNodeData("uploadImage"),
    },
    {
      id: "crop-image-1",
      type: "cropImage",
      position: { x: 460, y: 280 },
      data: createNodeData("cropImage"),
    },
    {
      id: "llm-1",
      type: "llm",
      position: { x: 820, y: 160 },
      data: createNodeData("llm"),
    },
    {
      id: "upload-video-1",
      type: "uploadVideo",
      position: { x: 120, y: 540 },
      data: createNodeData("uploadVideo"),
    },
    {
      id: "extract-frame-1",
      type: "extractFrame",
      position: { x: 460, y: 540 },
      data: createNodeData("extractFrame"),
    },
  ];

  const edges: WorkflowGraph["edges"] = [
    {
      id: "edge-text-llm",
      source: "text-1",
      target: "llm-1",
      targetHandle: "user",
      animated: true,
    },
    {
      id: "edge-image-crop",
      source: "upload-image-1",
      target: "crop-image-1",
      targetHandle: "image",
      animated: true,
    },
    {
      id: "edge-crop-llm",
      source: "crop-image-1",
      target: "llm-1",
      targetHandle: "image",
      animated: true,
    },
    {
      id: "edge-video-extract",
      source: "upload-video-1",
      target: "extract-frame-1",
      targetHandle: "video",
      animated: true,
    },
  ];

  return {
    nodes: syncDataFlow(nodes, edges),
    edges,
  };
}

export function syncDataFlow<T extends GraphNodeLike, E extends GraphEdgeLike>(
  nodes: T[],
  edges: E[]
): T[] {
  return nodes.map((targetNode) => {
    const incomingEdges = edges.filter((edge) => edge.target === targetNode.id);
    const newData = { ...targetNode.data } as Record<string, unknown>;

    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((node) => node.id === edge.source);
      if (!sourceNode) continue;

      if (sourceNode.type === "text") {
        if (edge.targetHandle === "system") newData.systemPrompt = sourceNode.data.text;
        if (edge.targetHandle === "user") newData.userPrompt = sourceNode.data.text;
      }

      if (sourceNode.type === "uploadImage") {
        if (edge.targetHandle === "image") {
          newData.inputImageUrl = sourceNode.data.imageUrl;
          newData.imageInput = sourceNode.data.imageUrl;
        }
      }

      if (sourceNode.type === "uploadVideo" && edge.targetHandle === "video") {
        newData.inputVideoUrl = sourceNode.data.videoUrl;
      }

      if ((sourceNode.type === "cropImage" || sourceNode.type === "extractFrame") && edge.targetHandle === "image") {
        newData.inputImageUrl = sourceNode.data.outputUrl;
        newData.imageInput = sourceNode.data.outputUrl;
      }
    }

    return { ...targetNode, data: newData };
  });
}

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
  id?: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

type GraphConnectionLike = {
  source?: string | null;
  target?: string | null;
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
        timestamp: "1",
      };
  }
}

export function createSampleWorkflowGraph(): WorkflowGraph {
  const nodes: WorkflowGraph["nodes"] = [
    {
      id: "text-system-1",
      type: "text",
      position: { x: 80, y: 60 },
      data: {
        ...createNodeData("text"),
        text: "You are a professional marketing copywriter. Generate a compelling one-paragraph product description.",
      },
    },
    {
      id: "text-user-1",
      type: "text",
      position: { x: 80, y: 250 },
      data: {
        ...createNodeData("text"),
        text: "Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30-hour battery, foldable design.",
      },
    },
    {
      id: "text-system-2",
      type: "text",
      position: { x: 760, y: 60 },
      data: {
        ...createNodeData("text"),
        text: "You are a social media manager. Create a tweet-length marketing post based on the product image and video frame.",
      },
    },
    {
      id: "upload-image-1",
      type: "uploadImage",
      position: { x: 80, y: 470 },
      data: createNodeData("uploadImage"),
    },
    {
      id: "crop-image-1",
      type: "cropImage",
      position: { x: 430, y: 470 },
      data: createNodeData("cropImage"),
    },
    {
      id: "llm-1",
      type: "llm",
      position: { x: 760, y: 300 },
      data: createNodeData("llm"),
    },
    {
      id: "upload-video-1",
      type: "uploadVideo",
      position: { x: 80, y: 810 },
      data: createNodeData("uploadVideo"),
    },
    {
      id: "extract-frame-1",
      type: "extractFrame",
      position: { x: 430, y: 810 },
      data: {
        ...createNodeData("extractFrame"),
        timestamp: "50%",
      },
    },
    {
      id: "llm-2",
      type: "llm",
      position: { x: 1160, y: 520 },
      data: createNodeData("llm"),
    },
  ];

  const edges: WorkflowGraph["edges"] = [
    {
      id: "edge-text-system-1-llm-1",
      source: "text-system-1",
      target: "llm-1",
      targetHandle: "system",
      animated: true,
    },
    {
      id: "edge-text-user-1-llm-1",
      source: "text-user-1",
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
    {
      id: "edge-text-system-2-llm-2",
      source: "text-system-2",
      target: "llm-2",
      targetHandle: "system",
      animated: true,
    },
    {
      id: "edge-llm-1-llm-2",
      source: "llm-1",
      target: "llm-2",
      targetHandle: "user",
      animated: true,
    },
    {
      id: "edge-crop-llm-2",
      source: "crop-image-1",
      target: "llm-2",
      targetHandle: "image",
      animated: true,
    },
    {
      id: "edge-extract-llm-2",
      source: "extract-frame-1",
      target: "llm-2",
      targetHandle: "image",
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
    const newData = {
      ...targetNode.data,
      imageInputs: [],
      systemPromptConnected: false,
      userPromptConnected: false,
      imageInputConnected: false,
      inputImageConnected: false,
      inputVideoConnected: false,
      xConnected: false,
      yConnected: false,
      widthConnected: false,
      heightConnected: false,
      timestampConnected: false,
    } as Record<string, unknown>;

    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((node) => node.id === edge.source);
      if (!sourceNode) continue;

      const textValue = getNodeTextOutput(sourceNode);

      if (textValue !== undefined) {
        if (edge.targetHandle === "system") {
          newData.systemPrompt = textValue;
          newData.systemPromptConnected = true;
        }
        if (edge.targetHandle === "user") {
          newData.userPrompt = textValue;
          newData.userPromptConnected = true;
        }
        if (edge.targetHandle === "x") {
          newData.x = parseConnectedNumber(textValue, newData.x, 0);
          newData.xConnected = true;
        }
        if (edge.targetHandle === "y") {
          newData.y = parseConnectedNumber(textValue, newData.y, 0);
          newData.yConnected = true;
        }
        if (edge.targetHandle === "width") {
          newData.width = parseConnectedNumber(textValue, newData.width, 80);
          newData.widthConnected = true;
        }
        if (edge.targetHandle === "height") {
          newData.height = parseConnectedNumber(textValue, newData.height, 80);
          newData.heightConnected = true;
        }
        if (edge.targetHandle === "timestamp") {
          newData.timestamp = textValue;
          newData.timestampConnected = true;
        }
      }

      if (sourceNode.type === "uploadImage") {
        if (edge.targetHandle === "image") {
          const nextImage = sourceNode.data.imageUrl;
          newData.inputImageUrl = nextImage;
          newData.imageInput = nextImage;
          if (typeof nextImage === "string" && nextImage.length > 0) {
            newData.imageInputs = [...(newData.imageInputs as string[]), nextImage];
          }
          newData.inputImageConnected = true;
          newData.imageInputConnected = true;
        }
      }

      if (sourceNode.type === "uploadVideo" && edge.targetHandle === "video") {
        newData.inputVideoUrl = sourceNode.data.videoUrl;
        newData.inputVideoConnected = true;
      }

      if ((sourceNode.type === "cropImage" || sourceNode.type === "extractFrame") && edge.targetHandle === "image") {
        const nextImage = sourceNode.data.outputUrl;
        newData.inputImageUrl = nextImage;
        newData.imageInput = nextImage;
        if (typeof nextImage === "string" && nextImage.length > 0) {
          newData.imageInputs = [...(newData.imageInputs as string[]), nextImage];
        }
        newData.inputImageConnected = true;
        newData.imageInputConnected = true;
      }
    }

    return { ...targetNode, data: newData };
  });
}

function getNodeTextOutput(node: GraphNodeLike) {
  if (node.type === "text" && typeof node.data.text === "string") {
    return node.data.text;
  }

  if (node.type === "llm") {
    if (typeof node.data.outputText === "string") {
      return node.data.outputText;
    }

    if (typeof node.data.result === "string" && !node.data.result.startsWith("Error:")) {
      return node.data.result;
    }
  }

  return undefined;
}

function parseConnectedNumber(
  value: string,
  currentValue: unknown,
  fallback: number
) {
  const parsed = Number.parseFloat(value);
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  return typeof currentValue === "number" ? currentValue : fallback;
}

export function isValidWorkflowConnection<
  T extends GraphNodeLike,
  E extends GraphConnectionLike,
>(connection: E, nodes: T[]) {
  if (!connection.source || !connection.target || !connection.targetHandle) {
    return false;
  }

  if (connection.source === connection.target) {
    return false;
  }

  const sourceNode = nodes.find((node) => node.id === connection.source);
  const targetNode = nodes.find((node) => node.id === connection.target);

  if (!sourceNode || !targetNode || !sourceNode.type || !targetNode.type) {
    return false;
  }

  const targetHandle = connection.targetHandle;

  switch (sourceNode.type) {
    case "text":
      return (
        (targetNode.type === "llm" && (targetHandle === "system" || targetHandle === "user")) ||
        (targetNode.type === "cropImage" &&
          (targetHandle === "x" ||
            targetHandle === "y" ||
            targetHandle === "width" ||
            targetHandle === "height")) ||
        (targetNode.type === "extractFrame" && targetHandle === "timestamp")
      );
    case "llm":
      return targetNode.type === "llm" && (targetHandle === "system" || targetHandle === "user");
    case "uploadImage":
      return (
        (targetNode.type === "cropImage" && targetHandle === "image") ||
        (targetNode.type === "llm" && targetHandle === "image")
      );
    case "cropImage":
    case "extractFrame":
      return targetNode.type === "llm" && targetHandle === "image";
    case "uploadVideo":
      return targetNode.type === "extractFrame" && targetHandle === "video";
    default:
      return false;
  }
}

export function wouldCreateCycle<
  E extends GraphConnectionLike,
  T extends GraphEdgeLike,
>(connection: E, edges: T[]) {
  if (!connection.source || !connection.target) {
    return false;
  }

  const adjacency = new Map<string, string[]>();

  for (const edge of edges) {
    const neighbors = adjacency.get(edge.source) ?? [];
    neighbors.push(edge.target);
    adjacency.set(edge.source, neighbors);
  }

  const stack = [connection.target];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) {
      continue;
    }

    if (current === connection.source) {
      return true;
    }

    visited.add(current);
    const neighbors = adjacency.get(current) ?? [];
    stack.push(...neighbors);
  }

  return false;
}

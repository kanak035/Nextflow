import { task, logger } from "@trigger.dev/sdk/v3";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { runGeminiTask } from "../lib/gemini";
import { cropImage, extractFrame } from "../lib/ffmpeg";

async function completeNodeRun(
  nodeRunId: string,
  status: "SUCCESS" | "FAILED",
  output?: Prisma.InputJsonObject,
  errorMessage?: string
) {
  return prisma.nodeRun.update({
    where: { id: nodeRunId },
    data: {
      status,
      output,
      errorMessage,
      finishedAt: new Date(),
    },
  });
}

export const textNodeTask = task({
  id: "text-node-task",
  run: async (payload: {
    nodeId: string;
    text: string;
    workflowRunId: string;
    nodeRunId: string;
  }) => {
    logger.log("Running Text Node Task", { nodeId: payload.nodeId });
    await completeNodeRun(payload.nodeRunId, "SUCCESS", {
      text: payload.text,
    });
    return { text: payload.text };
  },
});

export const uploadImageNodeTask = task({
  id: "upload-image-node-task",
  run: async (payload: {
    nodeId: string;
    imageUrl: string;
    workflowRunId: string;
    nodeRunId: string;
  }) => {
    logger.log("Running Upload Image Node Task", { nodeId: payload.nodeId });
    await completeNodeRun(payload.nodeRunId, "SUCCESS", {
      imageUrl: payload.imageUrl,
    });
    return { imageUrl: payload.imageUrl };
  },
});

export const uploadVideoNodeTask = task({
  id: "upload-video-node-task",
  run: async (payload: {
    nodeId: string;
    videoUrl: string;
    workflowRunId: string;
    nodeRunId: string;
  }) => {
    logger.log("Running Upload Video Node Task", { nodeId: payload.nodeId });
    await completeNodeRun(payload.nodeRunId, "SUCCESS", {
      videoUrl: payload.videoUrl,
    });
    return { videoUrl: payload.videoUrl };
  },
});

export const geminiTask = task({
  id: "gemini-task",
  run: async (payload: {
    model: string;
    systemPrompt: string;
    userPrompt: string;
    imageUrl?: string;
    workflowRunId: string;
    nodeRunId: string;
  }) => {
    logger.log("Running Gemini Task", { nodeRunId: payload.nodeRunId });

    try {
      const text = await runGeminiTask(
        payload.model,
        payload.systemPrompt,
        payload.userPrompt,
        payload.imageUrl
      );

      await completeNodeRun(payload.nodeRunId, "SUCCESS", { text });
      return { text };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await completeNodeRun(payload.nodeRunId, "FAILED", undefined, message);
      throw error;
    }
  },
});

export const cropImageTask = task({
  id: "crop-image-task",
  run: async (payload: {
    imageUrl: string;
    x: number;
    y: number;
    width: number;
    height: number;
    workflowRunId: string;
    nodeRunId: string;
  }) => {
    logger.log("Running Crop Image Task", { nodeRunId: payload.nodeRunId });

    try {
      const outputUrl = await cropImage(
        payload.imageUrl,
        payload.x,
        payload.y,
        payload.width,
        payload.height
      );

      await completeNodeRun(payload.nodeRunId, "SUCCESS", { outputUrl });
      return { outputUrl };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await completeNodeRun(payload.nodeRunId, "FAILED", undefined, message);
      throw error;
    }
  },
});

export const extractFrameTask = task({
  id: "extract-frame-task",
  run: async (payload: {
    videoUrl: string;
    timestamp: number;
    workflowRunId: string;
    nodeRunId: string;
  }) => {
    logger.log("Running Extract Frame Task", { nodeRunId: payload.nodeRunId });

    try {
      const outputUrl = await extractFrame(payload.videoUrl, payload.timestamp);
      await completeNodeRun(payload.nodeRunId, "SUCCESS", { outputUrl });
      return { outputUrl };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await completeNodeRun(payload.nodeRunId, "FAILED", undefined, message);
      throw error;
    }
  },
});

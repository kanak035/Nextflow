import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import {
  createSampleWorkflowGraph,
  type WorkflowGraph,
  workflowGraphSchema,
} from "./workflow-graph";
import { z } from "zod";

export const workflowSaveSchema = z.object({
  workflowId: z.string().optional(),
  name: z.string().min(1).max(120).default("Untitled workflow"),
  graph: workflowGraphSchema,
});

export const workflowImportSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  graph: workflowGraphSchema,
});

type SaveWorkflowInput = z.infer<typeof workflowSaveSchema>;

export async function getLatestWorkflowForOwner(ownerId: string) {
  return prisma.workflow.findFirst({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getWorkflowForOwner(ownerId: string, workflowId: string) {
  return prisma.workflow.findFirst({
    where: {
      id: workflowId,
      ownerId,
    },
  });
}

export async function getOrCreateWorkflowForOwner(ownerId: string) {
  const existing = await getLatestWorkflowForOwner(ownerId);
  if (existing) {
    return existing;
  }

  const graph = createSampleWorkflowGraph();
  return prisma.workflow.create({
    data: {
      ownerId,
      name: "Sample workflow",
      graph: graph as Prisma.InputJsonValue,
    },
  });
}

export async function saveWorkflowForOwner(ownerId: string, input: SaveWorkflowInput) {
  const parsed = workflowSaveSchema.parse(input);

  if (parsed.workflowId) {
    const existing = await getWorkflowForOwner(ownerId, parsed.workflowId);
    if (existing) {
      return prisma.workflow.update({
        where: { id: existing.id },
        data: {
          name: parsed.name,
          graph: parsed.graph as Prisma.InputJsonValue,
        },
      });
    }
  }

  return prisma.workflow.create({
    data: {
      ownerId,
      name: parsed.name,
      graph: parsed.graph as Prisma.InputJsonValue,
    },
  });
}

export function parseWorkflowGraph(graph: unknown): WorkflowGraph {
  return workflowGraphSchema.parse(graph);
}

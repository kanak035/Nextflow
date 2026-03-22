"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function getWorkflowHistoryAction() {
  const { userId } = await auth();
  if (!userId) return [];

  try {
    const runs = await prisma.workflowRun.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        nodes: {
          orderBy: { startedAt: "asc" }
        }
      },
      take: 20
    });
    return runs;
  } catch (error) {
    console.error("Error fetching workflow history:", error);
    return [];
  }
}

export async function getNodeRunStatusAction(nodeRunId: string) {
  try {
    const nodeRun = await prisma.nodeRun.findUnique({
      where: { id: nodeRunId }
    });
    return nodeRun;
  } catch (error) {
    console.error("Error fetching node run status:", error);
    return null;
  }
}

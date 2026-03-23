import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  getOrCreateWorkflowForOwner,
  saveWorkflowForOwner,
  parseWorkflowGraph,
  workflowSaveSchema,
} from "@/lib/workflow-service";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const workflow = await getOrCreateWorkflowForOwner(userId);
    return NextResponse.json({
      workflowId: workflow.id,
      name: workflow.name,
      graph: parseWorkflowGraph(workflow.graph),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to load workflow: ${message}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = workflowSaveSchema.parse(await request.json());
    const workflow = await saveWorkflowForOwner(userId, body);

    return NextResponse.json({
      workflowId: workflow.id,
      name: workflow.name,
      graph: parseWorkflowGraph(workflow.graph),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Failed to save workflow" }, { status: 500 });
  }
}

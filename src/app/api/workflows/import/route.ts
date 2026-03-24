import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { saveWorkflowForOwner, workflowImportSchema } from "@/lib/workflow-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = workflowImportSchema.parse(await request.json());
    const workflow = await saveWorkflowForOwner(userId, {
      name: body.name ?? "Imported workflow",
      graph: body.graph,
    });

    return NextResponse.json({
      workflowId: workflow.id,
      name: workflow.name,
      graph: workflow.graph,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid workflow import payload", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Failed to import workflow" }, { status: 500 });
  }
}

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getWorkflowForOwner, parseWorkflowGraph } from "@/lib/workflow-service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workflowId } = await params;
  const workflow = await getWorkflowForOwner(userId, workflowId);

  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  return NextResponse.json({
    workflowId: workflow.id,
    name: workflow.name,
    graph: parseWorkflowGraph(workflow.graph),
  });
}

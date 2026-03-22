import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json([], { status: 200 });
  }

  try {
    const runs = await prisma.workflowRun.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        nodes: {
          orderBy: { startedAt: "asc" },
        },
      },
      take: 20,
    });

    return NextResponse.json(runs);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error fetching workflow history:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 👇 IMPORTANT for Clerk + Prisma (avoid edge issues)
export const runtime = "nodejs";

export async function GET() {
  try {
    // ✅ Clerk auth (middleware must be running)
    const { userId } = await auth();

    // ✅ Safety check (in case middleware fails)
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ✅ Fetch workflow history
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

    return NextResponse.json(runs, { status: 200 });

  } catch (error) {
    console.error("Error fetching workflow history:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
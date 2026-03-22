import ws from "ws";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";

// Configure WebSocket for Neon in Node.js
if (typeof window === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function makePrisma() {
  // Use the same URL from .env.local that Next.js loads
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Check your .env.local file."
    );
  }

  const adapter = new PrismaNeon({ connectionString: url });

  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
}

export const prisma = globalForPrisma.prisma ?? makePrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

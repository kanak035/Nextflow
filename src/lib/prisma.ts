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
  // Support standard Vercel environment variables as well as local ones.
  const url = process.env.DATABASE_URL || 
             process.env.POSTGRES_PRISMA_URL || 
             process.env.POSTGRES_URL;

  if (!url) {
    // If no URL is set, we throw a descriptive error to help identify the missing env var.
    throw new Error(
      "Database URL is not set. Please ensure DATABASE_URL or POSTGRES_URL is configured in your project settings/environment."
    );
  }

  const adapter = new PrismaNeon({ connectionString: url });

  // Typesafe initialization of the PrismaClient with the adapter.
  return new PrismaClient({ adapter } as never);
}

function getPrismaClient() {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const client = makePrisma();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = getPrismaClient();
    return Reflect.get(client, property, receiver);
  },
});

export function getPrisma() {
  return getPrismaClient();
}

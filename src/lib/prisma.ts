import { createRequire } from "module";
import { PrismaClient } from "@prisma/client";

const require = createRequire(import.meta.url);

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function makePrisma() {
  if (typeof window !== "undefined") {
    throw new Error("Prisma client cannot be created in the browser runtime.");
  }

  // Prefer the standard Prisma/Neon envs across local and deployed environments.
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL;

  if (!url) {
    throw new Error(
      "Database URL is not set. Please ensure DATABASE_URL or POSTGRES_URL is configured in your environment."
    );
  }

  // Disable optional ws native accelerators. They are unnecessary in serverless
  // and can cause bundle/runtime mismatches in deployed environments.
  process.env.WS_NO_BUFFER_UTIL = "1";
  process.env.WS_NO_UTF_8_VALIDATE = "1";

  const ws = require("ws") as typeof import("ws");
  const { PrismaNeon } = require("@prisma/adapter-neon") as typeof import("@prisma/adapter-neon");
  const { neonConfig } = require("@neondatabase/serverless") as typeof import("@neondatabase/serverless");

  neonConfig.webSocketConstructor = ws;
  const adapter = new PrismaNeon({ connectionString: url });

  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
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

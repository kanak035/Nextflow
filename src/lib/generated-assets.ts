import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

function resolveWorkspaceRoot() {
  const candidates = [process.env.INIT_CWD, process.env.PWD, process.cwd()].filter(
    Boolean
  ) as string[];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "package.json"))) {
      return candidate;
    }
  }

  return process.cwd();
}

export function saveGeneratedBuffer(buffer: Buffer, extension: "jpg" | "png") {
  // On Vercel or in production, we typically don't have a writable filesystem.
  // For a smooth deployment, we'll return a Base64 data URL if we're not in development.
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    const mimeType = extension === "jpg" ? "image/jpeg" : "image/png";
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  }

  const workspaceRoot = resolveWorkspaceRoot();
  const outputDir = path.join(workspaceRoot, "public", "generated");
  
  try {
    fs.mkdirSync(outputDir, { recursive: true });
    const filename = `${Date.now()}-${randomUUID()}.${extension}`;
    fs.writeFileSync(path.join(outputDir, filename), buffer);
    return `/generated/${filename}`;
  } catch (error) {
    console.warn("Failed to save asset to filesystem, falling back to Base64:", error);
    const mimeType = extension === "jpg" ? "image/jpeg" : "image/png";
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  }
}

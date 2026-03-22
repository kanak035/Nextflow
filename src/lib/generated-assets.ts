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
  const workspaceRoot = resolveWorkspaceRoot();
  const outputDir = path.join(workspaceRoot, "public", "generated");
  fs.mkdirSync(outputDir, { recursive: true });

  const filename = `${Date.now()}-${randomUUID()}.${extension}`;
  fs.writeFileSync(path.join(outputDir, filename), buffer);

  return `/generated/${filename}`;
}

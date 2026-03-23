import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import path from "path";
import fs from "fs";
import os from "os";
import { execFile } from "node:child_process";
import { saveGeneratedBuffer } from "./generated-assets";

function resolveFfmpegBinary() {
  const candidatePaths = new Set<string>();

  const workspaceCandidates = [
    process.env.INIT_CWD,
    process.env.PWD,
    process.cwd(),
  ].filter(Boolean) as string[];

  for (const baseDir of workspaceCandidates) {
    candidatePaths.add(path.resolve(baseDir, "node_modules/ffmpeg-static/ffmpeg"));
  }

  try {
    const packageRoot = path.dirname(require.resolve("ffmpeg-static/package.json"));
    candidatePaths.add(path.join(packageRoot, "ffmpeg"));
  } catch {
    // Ignore resolution failures and continue through other candidates.
  }

  if (ffmpegPath) {
    candidatePaths.add(ffmpegPath);
  }

  return [...candidatePaths].find((candidate) => fs.existsSync(candidate));
}

const resolvedFfmpegPath = resolveFfmpegBinary();

if (resolvedFfmpegPath) {
  ffmpeg.setFfmpegPath(resolvedFfmpegPath);
}

export async function cropImage(
  inputUrl: string,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<string> {
  const tempBase = `input-${Date.now()}`;
  const outputPath = path.join(os.tmpdir(), `output-${Date.now()}.jpg`);
  let inputPath = path.join(os.tmpdir(), `${tempBase}.jpg`);

  try {
    const response = await fetch(inputUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) {
      throw new Error("Downloaded image is empty.");
    }

    const extension = detectImageExtension(buffer, response.headers.get("content-type"), inputUrl);
    inputPath = path.join(os.tmpdir(), `${tempBase}.${extension}`);
    fs.writeFileSync(inputPath, buffer);

    const clampedX = clampPercentage(x);
    const clampedY = clampPercentage(y);
    const clampedWidth = clampPercentage(width);
    const clampedHeight = clampPercentage(height);

    await runFfmpegCommand([
      "-y",
      "-i",
      inputPath,
      "-vf",
      `crop=iw*${clampedWidth}/100:ih*${clampedHeight}/100:iw*${clampedX}/100:ih*${clampedY}/100`,
      "-frames:v",
      "1",
      outputPath,
    ]);

    const outBuffer = fs.readFileSync(outputPath);
    return saveGeneratedBuffer(outBuffer, "jpg");
  } catch (error) {
    console.error("FFmpeg Crop Error:", error);
    throw error;
  } finally {
    safeUnlink(inputPath);
    safeUnlink(outputPath);
  }
}

export async function extractFrame(
  videoUrl: string,
  timestamp: string | number
): Promise<string> {
  const inputPath = path.join(os.tmpdir(), `input-${Date.now()}.mp4`);
  const outputPath = path.join(os.tmpdir(), `frame-${Date.now()}.jpg`);

  try {
    const response = await fetch(videoUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(inputPath, buffer);

    const targetSeconds = await resolveFrameTimestampSeconds(inputPath, timestamp);

    await runFfmpegCommand([
      "-y",
      "-ss",
      targetSeconds.toFixed(3),
      "-i",
      inputPath,
      "-frames:v",
      "1",
      outputPath,
    ]);

    const outBuffer = fs.readFileSync(outputPath);
    return saveGeneratedBuffer(outBuffer, "jpg");
  } catch (error) {
    console.error("FFmpeg Extract Error:", error);
    throw error;
  } finally {
    safeUnlink(inputPath);
    safeUnlink(outputPath);
  }
}

function normalizeTimestamp(timestamp: string | number) {
  if (typeof timestamp === "number" && Number.isFinite(timestamp)) {
    return timestamp;
  }

  const normalized = String(timestamp).trim();
  if (normalized.endsWith("%")) {
    return normalized;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 1;
}

async function resolveFrameTimestampSeconds(
  inputPath: string,
  timestamp: string | number
) {
  const normalized = normalizeTimestamp(timestamp);
  if (typeof normalized === "number") {
    return Math.max(0, normalized);
  }

  const percentage = Number.parseFloat(normalized.replace("%", ""));
  const durationSeconds = await readVideoDurationSeconds(inputPath);
  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  return durationSeconds * (clampedPercentage / 100);
}

async function readVideoDurationSeconds(inputPath: string) {
  const { stderr } = await execFileAsync(
    resolvedFfmpegPath,
    ["-i", inputPath],
    { allowErrorOutput: true }
  );
  const durationMatch = stderr.match(/Duration:\s+(\d+):(\d+):(\d+(?:\.\d+)?)/);

  if (!durationMatch) {
    throw new Error("Could not determine video duration.");
  }

  const hours = Number.parseFloat(durationMatch[1] ?? "0");
  const minutes = Number.parseFloat(durationMatch[2] ?? "0");
  const seconds = Number.parseFloat(durationMatch[3] ?? "0");

  return hours * 3600 + minutes * 60 + seconds;
}

async function runFfmpegCommand(args: string[]) {
  await execFileAsync(resolvedFfmpegPath, args);
}

function execFileAsync(
  filePath: string | undefined,
  args: string[],
  options?: { allowErrorOutput?: boolean }
) {
  if (!filePath) {
    throw new Error("FFmpeg binary could not be resolved.");
  }

  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    execFile(filePath, args, (error, stdout, stderr) => {
      const output = {
        stdout: stdout.toString(),
        stderr: stderr.toString(),
      };

      if (error) {
        if (options?.allowErrorOutput) {
          resolve(output);
          return;
        }

        const message = output.stderr || output.stdout || error.message;
        reject(new Error(message));
        return;
      }

      resolve(output);
    });
  });
}

function safeUnlink(filePath: string) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}

function detectImageExtension(
  buffer: Buffer,
  contentType: string | null,
  inputUrl: string
) {
  const normalizedContentType = contentType?.toLowerCase() ?? "";

  if (normalizedContentType.includes("png") || isPng(buffer)) {
    return "png";
  }

  if (
    normalizedContentType.includes("jpeg") ||
    normalizedContentType.includes("jpg") ||
    isJpeg(buffer)
  ) {
    return "jpg";
  }

  if (normalizedContentType.includes("webp") || isWebp(buffer)) {
    return "webp";
  }

  if (normalizedContentType.includes("gif") || isGif(buffer)) {
    return "gif";
  }

  const extensionFromUrl = path.extname(new URL(inputUrl).pathname).replace(".", "").toLowerCase();
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(extensionFromUrl)) {
    return extensionFromUrl === "jpeg" ? "jpg" : extensionFromUrl;
  }

  throw new Error(
    `Unsupported or unreadable image format. Content-Type was "${contentType ?? "unknown"}".`
  );
}

function isPng(buffer: Buffer) {
  return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
}

function isJpeg(buffer: Buffer) {
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

function isGif(buffer: Buffer) {
  return buffer.length >= 6 && ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii"));
}

function isWebp(buffer: Buffer) {
  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

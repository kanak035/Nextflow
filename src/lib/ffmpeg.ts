import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import path from "path";
import fs from "fs";
import os from "os";

function resolveFfmpegBinary() {
  const candidatePaths = [
    path.resolve(process.cwd(), "node_modules/ffmpeg-static/ffmpeg"),
    ffmpegPath ?? "",
  ].filter(Boolean);

  return candidatePaths.find((candidate) => fs.existsSync(candidate));
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
  const inputPath = path.join(os.tmpdir(), `input-${Date.now()}.jpg`);
  const outputPath = path.join(os.tmpdir(), `output-${Date.now()}.jpg`);

  try {
    // 1. Download
    const response = await fetch(inputUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(inputPath, buffer);

    // 2. Process
    // Logic: x, y, width, height are percentages [0-100]
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .complexFilter([
          `crop=iw*${width}/100:ih*${height}/100:iw*${x}/100:ih*${y}/100`
        ])
        .on("end", () => {
          // In a real app, upload this to S3.
          // For this exercise, we'll return a base64 data URL to show the result
          const outBuffer = fs.readFileSync(outputPath);
          const base64 = outBuffer.toString("base64");
          resolve(`data:image/jpeg;base64,${base64}`);
          
          // Cleanup
          fs.unlinkSync(inputPath);
          fs.unlinkSync(outputPath);
        })
        .on("error", (err) => reject(err))
        .save(outputPath);
    });
  } catch (error) {
    console.error("FFmpeg Crop Error:", error);
    throw error;
  }
}

export async function extractFrame(
  videoUrl: string,
  timestamp: number
): Promise<string> {
  const inputPath = path.join(os.tmpdir(), `input-${Date.now()}.mp4`);
  const outputPath = path.join(os.tmpdir(), `frame-${Date.now()}.jpg`);

  try {
    const response = await fetch(videoUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(inputPath, buffer);

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: [timestamp],
          folder: os.tmpdir(),
          filename: path.basename(outputPath)
        })
        .on("end", () => {
          const outBuffer = fs.readFileSync(outputPath);
          const base64 = outBuffer.toString("base64");
          resolve(`data:image/jpeg;base64,${base64}`);
          
          fs.unlinkSync(inputPath);
          fs.unlinkSync(outputPath);
        })
        .on("error", (err) => reject(err));
    });
  } catch (error) {
    console.error("FFmpeg Extract Error:", error);
    throw error;
  }
}

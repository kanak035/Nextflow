import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

function resolveModelName(modelName: string) {
  switch (modelName) {
    case "gemini-1.5-flash":
    case "gemini-1.5-pro":
      return DEFAULT_GEMINI_MODEL;
    default:
      return modelName || DEFAULT_GEMINI_MODEL;
  }
}

export async function runGeminiTask(
  modelName: string,
  systemPrompt: string,
  userPrompt: string,
  imageUrls: string[] = []
) {
  const resolvedModelName = resolveModelName(modelName);
  const model = genAI.getGenerativeModel({ 
    model: resolvedModelName,
    systemInstruction: systemPrompt 
  });

  const promptParts: Array<string | { inlineData: { data: string; mimeType: string } }> = [
    userPrompt,
  ];

  for (const imageUrl of imageUrls) {
    try {
      const response = await fetch(imageUrl);
      const buffer = await response.arrayBuffer();
      promptParts.push({
        inlineData: {
          data: Buffer.from(buffer).toString("base64"),
          mimeType: "image/jpeg", // Assuming JPEG for now, ideally dynamic
        },
      });
    } catch (error) {
      console.error("Error fetching image for Gemini:", error);
    }
  }

  try {
    const result = await model.generateContent(promptParts);
    const response = await result.response;
    return response.text();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Gemini request failed for model "${resolvedModelName}". ${message}`
    );
  }
}

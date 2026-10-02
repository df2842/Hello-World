import { GoogleGenAI, Type } from "@google/genai";

/** Gemini 2.5 Flash: multimodal, fast, and on the Gemini API free tier. */
export const MODEL = "gemini-2.5-flash";

export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

let client: GoogleGenAI | null = null;
function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

/**
 * Prompt-chain step 1: look at the picture and describe it for a comedy writer.
 */
export async function describeImage(
  base64: string,
  mediaType: ImageMediaType,
): Promise<string> {
  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: [
      { inlineData: { mimeType: mediaType, data: base64 } },
      { text: "Describe this image." },
    ],
    config: {
      systemInstruction:
        "You describe photos for a comedy writer who cannot see them. Be concrete and vivid: " +
        "who or what is in the frame, expressions, body language, setting, text in the image, " +
        "and anything odd, awkward or surprising. Two to four sentences of plain prose, no lists.",
      temperature: 0.6,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const text = response.text?.trim();
  if (!text) throw new Error("The model returned an empty description.");
  return text;
}

/**
 * Prompt-chain step 2: turn the description into funny captions.
 * A JSON response schema guarantees we get an array of strings back.
 */
export async function writeCaptions(description: string): Promise<string[]> {
  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: `Photo description:\n${description}`,
    config: {
      systemInstruction:
        "You write meme captions. Given a description of a photo, write exactly four short, " +
        "genuinely funny captions that could be printed on the image. Mix styles: one deadpan, " +
        "one pun or wordplay, one absurd escalation, one painfully relatable. Each caption is a " +
        "single sentence under 90 characters, no hashtags, no emojis, no quotation marks. " +
        "Keep it PG-13 and never mock real people's appearance.",
      temperature: 1.0,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          captions: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["captions"],
      },
    },
  });

  const raw = response.text;
  if (!raw) throw new Error("The model returned no captions.");
  const parsed = JSON.parse(raw) as { captions?: unknown };
  const captions = (Array.isArray(parsed.captions) ? parsed.captions : [])
    .filter((c): c is string => typeof c === "string")
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 5);
  if (captions.length === 0) throw new Error("The model returned no captions.");
  return captions;
}

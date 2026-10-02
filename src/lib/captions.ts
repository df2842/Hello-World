import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export const MODEL = "claude-opus-5-5";

export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

let client: Anthropic | null = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }
  client ??= new Anthropic();
  return client;
}

/**
 * Prompt-chain step 1: look at the picture and describe it for a comedy writer.
 * Server-side refusal fallbacks are enabled so a rare safety decline is retried
 * on another model instead of failing the upload.
 */
export async function describeImage(
  base64: string,
  mediaType: ImageMediaType,
): Promise<string> {
  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" },
    system:
      "You describe photos for a comedy writer who cannot see them. Be concrete and vivid: " +
      "who or what is in the frame, expressions, body language, setting, text in the image, " +
      "and anything odd, awkward or surprising. Two to four sentences of plain prose, no lists.",
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: "Describe this image." },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("The model declined to describe this image. Try a different photo.");
  }
  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  if (!text) throw new Error("The model returned an empty description.");
  return text;
}

const CaptionsSchema = z.object({
  captions: z.array(z.string()),
});

/**
 * Prompt-chain step 2: turn the description into funny captions.
 * Structured output guarantees we get a JSON array back.
 */
export async function writeCaptions(description: string): Promise<string[]> {
  const response = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 8000,
    output_config: {
      effort: "low",
      format: zodOutputFormat(CaptionsSchema),
    },
    system:
      "You write meme captions. Given a description of a photo, write exactly four short, " +
      "genuinely funny captions that could be printed on the image. Mix styles: one deadpan, " +
      "one pun or wordplay, one absurd escalation, one painfully relatable. Each caption is a " +
      "single sentence under 90 characters, no hashtags, no emojis, no quotation marks. " +
      "Keep it PG-13 and never mock real people's appearance.",
    messages: [{ role: "user", content: `Photo description:\n${description}` }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("The model declined to write captions for this image.");
  }
  const captions = (response.parsed_output?.captions ?? [])
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 5);
  if (captions.length === 0) throw new Error("The model returned no captions.");
  return captions;
}

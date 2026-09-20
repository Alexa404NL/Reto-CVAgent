import { GoogleGenAI } from "@google/genai";

let client;
function getClient() {
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

function systemPrompt() {
  const b64 = process.env.SYSTEM_PROMPT_B64;
  if (!b64) throw new Error("Falta SYSTEM_PROMPT_B64 en el entorno.");
  return Buffer.from(b64, "base64").toString("utf8");
}

export async function generateReply(messages, context) {
  const model = process.env.GEMINI_MODEL;
  if (!model) throw new Error("Falta GEMINI_MODEL en el entorno.");

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.text }],
  }));
  const timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS ?? 15000);
  const maxOutputTokens = Number(process.env.GEMINI_MAX_OUTPUT_TOKENS ?? 512);
  try {
    const response = await getClient().models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: context
          ? `${systemPrompt()}\n\n<contexto>\n${context}\n</contexto>`
          : systemPrompt(),
        maxOutputTokens,
        abortSignal: AbortSignal.timeout(timeoutMs),
      },
    });
    const text = response.text?.trim();
    if (!text) throw new Error("Respuesta vacía del modelo.");
    const u = response.usageMetadata ?? {};
    return {
      text: redactSystemLeak(text),
      usage: {
        input_tokens: u.promptTokenCount ?? 0,
        output_tokens: u.candidatesTokenCount ?? 0,
        total_tokens: u.totalTokenCount ?? 0,
      },
      maxOutputTokens,
    };
  } catch (err) {
    if (err?.status === 429 || err?.code === 429) {
      const quotaErr = new Error("Cuota del modelo agotada.");
      quotaErr.type = "too_many_requests";
      throw quotaErr;
    }
    throw err;
  }
}

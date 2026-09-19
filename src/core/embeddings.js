import { GoogleGenAI } from "@google/genai";

let client;
function getClient() {
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

export async function embed(text) {
  const model = process.env.GEMINI_EMBEDDING_MODEL;
  const outputDimensionality = Number(process.env.EMBEDDING_DIM ?? 768);
  const response = await getClient().models.embedContent({
    model,
    contents: text,
    config: { outputDimensionality },
  });
  return response.embeddings[0].values;
}

import crypto from "node:crypto";

const MODEL_NAME = process.env.GEMINI_MODEL ?? "gemma-4";
const ZERO_USAGE = { input_tokens: 0, output_tokens: 0, total_tokens: 0 };

function buildResponseObject(text, usage = ZERO_USAGE, maxOutputTokens = null) {
  const itemId = `msg_${crypto.randomUUID()}`;
  const createdAt = Math.floor(Date.now() / 1000);
  return {
    id: `resp_${crypto.randomUUID()}`,
    object: "response",
    created_at: createdAt,
    completed_at: createdAt,
    status: "completed",
    incomplete_details: null,
    model: MODEL_NAME,
    previous_response_id: null,
    instructions: null,
    output: [
      {
        type: "message",
        id: itemId,
        status: "completed",
        role: "assistant",
        content: [{ type: "output_text", text, annotations: [] }],
      },
    ],
    error: null,
    tools: [],
    tool_choice: "none",
    truncation: "disabled",
    parallel_tool_calls: false,
    text: { format: { type: "text" } },
    top_p: 1,
    presence_penalty: 0,
    frequency_penalty: 0,
    top_logprobs: 0,
    temperature: 1,
    reasoning: null,
    usage: {
      ...usage,
      input_tokens_details: { cached_tokens: 0 },
      output_tokens_details: { reasoning_tokens: 0 },
    },
    max_output_tokens: maxOutputTokens,
    max_tool_calls: null,
    store: false,
    background: false,
    service_tier: "default",
    metadata: {},
    safety_identifier: null,
    prompt_cache_key: null,
  };
}

export function sendJson(res, text, usage, maxOutputTokens) {
  res.status(200).json(buildResponseObject(text, usage, maxOutputTokens));
}

export function sendSse(res, text, usage, maxOutputTokens) {
  res.status(200).set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  const response = buildResponseObject(text, usage, maxOutputTokens);
  const item = response.output[0];
  let seq = 0;
  const emit = (event, data) => {
    seq += 1;
    res.write(`event: ${event}\ndata: ${JSON.stringify({ type: event, sequence_number: seq, ...data })}\n\n`);
  };

  emit("response.created", { response: { ...response, output: [] } });
  emit("response.in_progress", { response: { ...response, output: [] } });
  emit("response.output_item.added", { output_index: 0, item: { ...item, content: [] } });
  emit("response.content_part.added", { item_id: item.id, output_index: 0, content_index: 0, part: { type: "output_text", text: "", annotations: [] } });
  emit("response.output_text.delta", { item_id: item.id, output_index: 0, content_index: 0, delta: text });
  emit("response.output_text.done", { item_id: item.id, output_index: 0, content_index: 0, text });
  emit("response.content_part.done", { item_id: item.id, output_index: 0, content_index: 0, part: item.content[0] });
  emit("response.output_item.done", { output_index: 0, item });
  emit("response.completed", { response });

  res.write("data: [DONE]\n\n");
  res.end();
}

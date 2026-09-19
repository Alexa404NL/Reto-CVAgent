const MAX_LENGTH = 2000;

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /olvida\s+(todas?\s+)?(las\s+)?instrucciones?\s+anteriores?/i,
  /you\s+are\s+now\s+/i,
  /ahora\s+(eres?|serás?)\s+/i,
  /new\s+system\s+prompt/i,
  /nuevo\s+system[\s_]?prompt/i,
  /pretend\s+(you\s+are|to\s+be)\s+/i,
  /finge\s+(que\s+eres?|ser)\s+/i,
  /do\s+anything\s+now/i,
  /\bDAN\b/,
  /developer\s+mode/i,
  /modo\s+desarrollador/i,
  /\[INST\]/i,
  /<\|.*?\|>/, // tokens estilo <|im_start|>
  /###\s*(system|instruction|prompt)/i,
  /```\s*system/i,
  /reveal\s+(your\s+)?(system\s+)?prompt/i,
  /muestra\s+(tu\s+)?prompt/i,
  /what\s+(are\s+)?your\s+(system\s+)?instructions/i,
  /cuáles\s+son\s+tus\s+instrucciones/i,
  /repeat\s+(everything|all)\s+(above|before)/i,
];

function removeInvisible(text) {
  return text.replace(/[​-‏‪-‮⁠-⁤﻿]/g, "");
}

function normalizeWhitespace(text) {
  return text.replace(/[^\S\n]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export function sanitize(rawInput) {
  if (typeof rawInput !== "string") {
    return { safe: false, text: "", reason: "Formato de mensaje inválido." };
  }
  if (rawInput.length > MAX_LENGTH) {
    return { safe: false, text: "", reason: "Tu mensaje es demasiado largo. Por favor, sé más breve." };
  }

  let text = rawInput.normalize("NFKC");
  text = removeInvisible(text);
  text = normalizeWhitespace(text);

  if (!text) {
    return { safe: false, text: "", reason: "El mensaje quedó vacío tras la revisión, intenta con otro." };
  }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return {
        safe: false,
        text: "",
        reason: "Lo siento, ese tipo de mensajes no está permitido. ¿En qué te puedo ayudar?",
      };
    }
  }

  return { safe: true, text };
}

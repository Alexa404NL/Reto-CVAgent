const MAX_TURNS = 20;
const MAX_TEXT_LENGTH = 2000;

export function validateRequest(body) {
  if (body?.previous_response_id) {
    return { ok: false, type: "not_found", message: "No se conserva historial entre respuestas.", code: "previous_response_not_found" };
  }

  if (!Array.isArray(body?.input) || body.input.length === 0) {
    return { ok: false, type: "invalid_request", message: "'input' debe ser un arreglo no vacío.", param: "input" };
  }

  if (body.input.length > MAX_TURNS) {
    return { ok: false, type: "invalid_request", message: `Máximo ${MAX_TURNS} turnos por solicitud.`, param: "input" };
  }

  const messages = [];
  for (const item of body.input) {
    if (item?.type !== "message" || !["user", "assistant"].includes(item?.role)) {
      return { ok: false, type: "invalid_request", message: "Cada item de 'input' debe ser un mensaje con rol user o assistant.", param: "input" };
    }

    if (typeof item.content !== "string" && !Array.isArray(item.content)) {
      return { ok: false, type: "invalid_request", message: "Mensaje sin contenido.", param: "input" };
    }

    const content = typeof item.content === "string" ? [{ type: "input_text", text: item.content }] : item.content;
    if (content.length === 0) {
      return { ok: false, type: "invalid_request", message: "Mensaje sin contenido.", param: "input" };
    }

    let text = "";
    for (const part of content) {
      if (part?.type !== "input_text" && part?.type !== "output_text") {
        return { ok: false, type: "invalid_request", message: "Este agente no acepta adjuntos, solo texto.", param: "input" };
      }
      text += part.text ?? "";
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return { ok: false, type: "invalid_request", message: "Un mensaje excede la longitud máxima.", param: "input" };
    }

    messages.push({ role: item.role, text });
  }

  return { ok: true, messages, stream: body.stream === true };
}

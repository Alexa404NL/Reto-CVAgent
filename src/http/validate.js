const MAX_TURNS = 20;

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
    messages.push({ role: item.role, text });
  }

  return { ok: true, messages, stream: body.stream === true };
}

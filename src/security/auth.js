import crypto from "node:crypto";
import { sendError } from "../http/errors.js";

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest();
}

export function requireAuth(req, res, next) {
  const header = req.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const expected = sha256(process.env.AGENT_TOKEN ?? "");
  const actual = sha256(token);

  if (!token || !crypto.timingSafeEqual(actual, expected)) {
    return sendError(res, "invalid_request", "Falta o es inválido el token de autorización.", {
      code: "unauthorized",
      status: 401,
    });
  }
  next();
}

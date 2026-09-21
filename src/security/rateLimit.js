import rateLimit from "express-rate-limit";
import { sendError } from "../http/errors.js";

export const perIpLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    sendError(res, "too_many_requests", "Demasiadas solicitudes, intenta de nuevo en un minuto."),
});

// * contador de proceso se reinicia si el dyno de Render reinicia
let dailyCount = 0;
let dailyResetAt = nextMidnightUTC();

function nextMidnightUTC() {
  const d = new Date();
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}

export function dailyCapLimiter(req, res, next) {
  if (Date.now() >= dailyResetAt) {
    dailyCount = 0;
    dailyResetAt = nextMidnightUTC();
  }
  const cap = Number(process.env.DAILY_REQUEST_CAP ?? 1000);
  if (dailyCount >= cap) {
    return sendError(res, "too_many_requests", "Se alcanzó el límite diario de solicitudes.");
  }
  dailyCount += 1;
  next();
}

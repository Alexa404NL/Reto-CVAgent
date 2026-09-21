import express from "express";
import helmet from "helmet";
import { requireAuth } from "../security/auth.js";
import { perIpLimiter, dailyCapLimiter } from "../security/rateLimit.js";
import { sanitize } from "../security/sanitizer.js";
import { validateRequest } from "./validate.js";
import { sendJson, sendSse } from "./responses.js";
import { sendError } from "./errors.js";
import { generateReply } from "../core/agent.js";
import { retrieve, formatContext } from "../core/retrieval.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(express.json({ limit: "16kb" }));

  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
  });

  app.get('/ping', (req, res) => {
    res.send('pong');
  });
  app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
  app.get("/.well-known/agent-card.json", (_req, res) => {
    res.status(200).sendFile("agent-card.json", { root: "docs" });
  });
  app.post("/v1/responses", requireAuth, perIpLimiter, dailyCapLimiter, async (req, res) => {
    if (req.get("content-type")?.includes("application/json") !== true) {
      return sendError(res, "invalid_request", "Content-Type debe ser application/json.", { param: "content-type" });
    }

    const validation = validateRequest(req.body);
    if (!validation.ok) {
      return sendError(res, validation.type, validation.message, { param: validation.param, code: validation.code });
    }

    const lastUser = [...validation.messages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      const clean = sanitize(lastUser.text);
      if (!clean.safe) {
        return validation.stream ? sendSse(res, clean.reason) : sendJson(res, clean.reason);
      }
      lastUser.text = clean.text;
    }

    let context;
    if (lastUser) {
      const result = await retrieve(lastUser.text);
      if (!result.degraded && result.chunks.length === 0) {
        const noInfo = "No tengo esa información en el perfil de Alexa. ¿Te puedo ayudar con algo más de su trayectoria?";
        return validation.stream ? sendSse(res, noInfo) : sendJson(res, noInfo);
      }
      if (!result.degraded) context = formatContext(result.chunks);
    }

    let reply;
    try {
      reply = await generateReply(validation.messages, context);
    } catch (err) {
      console.error(err);
      if (err?.type === "too_many_requests") {
        return sendError(res, "too_many_requests", "El modelo alcanzó su cuota, intenta más tarde.");
      }
      return sendError(res, "model_error", "El modelo no pudo generar una respuesta en este momento.");
    }

    return validation.stream
      ? sendSse(res, reply.text, reply.usage, reply.maxOutputTokens)
      : sendJson(res, reply.text, reply.usage, reply.maxOutputTokens);
  });

  app.use((_req, res) => sendError(res, "not_found", "Recurso no encontrado."));

  app.use((err, _req, res, _next) => {
    if (err?.type === "entity.too.large" || err?.status === 413) {
      return sendError(res, "invalid_request", "El cuerpo de la solicitud es demasiado grande.");
    }
    if (err?.type === "entity.parse.failed" || err instanceof SyntaxError) {
      return sendError(res, "invalid_request", "JSON inválido en el cuerpo de la solicitud.");
    }
    console.error(err);
    sendError(res, "server_error", "Error interno del servidor.");
  });

  return app;
}

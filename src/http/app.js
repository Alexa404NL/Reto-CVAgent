import express from "express";
import helmet from "helmet";
import { sanitize } from "../security/sanitizer.js";
import { validateRequest } from "./validate.js";
import { sendJson, sendSse } from "./responses.js";
import { sendError } from "./errors.js";

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

  return app;
}

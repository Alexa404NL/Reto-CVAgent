import express from "express";
import helmet from "helmet";
import { sanitize } from "../security/sanitizer.js";
import { validateRequest } from "./validate.js";

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
  return app;
}

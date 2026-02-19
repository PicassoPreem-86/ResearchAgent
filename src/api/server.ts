import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createRoutes } from "./routes.js";
import type { Broker } from "../broker/broker.js";
import type { BarManager } from "../data/bar-manager.js";
import type { AgentConfig } from "../types/config.js";
import type { PipelineResult } from "../engine/pipeline.js";
import { logger } from "../logger.js";
import fs from "node:fs";
import path from "node:path";

export interface AgentState {
  lastResults: Map<string, PipelineResult>;
  isRunning: boolean;
  lastRunAt: string | null;
}

export function startApiServer(
  config: AgentConfig,
  broker: Broker,
  barManager: BarManager,
  agentState: AgentState,
) {
  const app = new Hono();

  app.use("/*", cors());
  app.route("/api", createRoutes(config, broker, barManager, agentState));

  // In production, serve the built frontend from dist/
  const distPath = path.resolve(process.cwd(), "dist");
  if (fs.existsSync(distPath)) {
    app.use("/*", serveStatic({ root: "./dist" }));
    // SPA fallback: serve index.html for any non-API, non-static route
    app.get("*", (c) => {
      const html = fs.readFileSync(path.join(distPath, "index.html"), "utf-8");
      return c.html(html);
    });
    logger.info("Serving frontend from dist/");
  }

  serve({ fetch: app.fetch, port: config.apiPort }, () => {
    logger.info({ port: config.apiPort }, "API server started");
  });

  return app;
}

#!/usr/bin/env node
/**
 * Local development server for image-gen-proxy.
 * Simulates Vercel serverless functions locally using Express.
 * Usage: node local-server.js
 */

import express from "express";
import healthHandler from "./api/health.js";
import generateHandler from "./api/generate.js";
import midjourneyHandler from "./api/midjourney.js";

const app = express();
app.use(express.json());

// Wrap Vercel-style handler (req, res) for Express
app.all("/api/health", (req, res) => healthHandler(req, res));
app.all("/api/generate", (req, res) => generateHandler(req, res));
app.all("/api/midjourney", (req, res) => midjourneyHandler(req, res));

const PORT = process.env.PORT || 3456;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[image-gen-proxy] Local server running at http://localhost:${PORT}`);
  console.log(`  GET  http://localhost:${PORT}/api/health`);
  console.log(`  POST http://localhost:${PORT}/api/generate`);
  console.log(`  POST http://localhost:${PORT}/api/midjourney`);
});

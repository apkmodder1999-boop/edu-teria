import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { app } from "./server/index.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;
const HOST = "0.0.0.0";
const isProduction = process.env.NODE_ENV === "production";

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: HOST,
        port: PORT,
      },
      appType: "spa",
    });

    // 404 handler for unmatched API routes before Vite middleware
    app.use("/api", (req, res) => {
      res.status(404).json({ success: false, error: "API route not found" });
    });

    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, "dist");
    app.use(express.static(distDir));

    // Fallback for all other routes to SPA index.html
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api")) {
        return res.status(404).json({ success: false, error: "API route not found" });
      }
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`\x1b[36m✓ Multi-platform app running\x1b[0m at http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

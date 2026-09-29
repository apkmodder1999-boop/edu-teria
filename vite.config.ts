import { defineConfig } from "vite";

export default defineConfig({
  // In production all assets are served from root
  base: "/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: "src/modules/web/client",
  publicDir: "../public",
  resolve: {
    alias: {
      "@": resolve(__dirname, "src/modules/web/client"),
      "@openpos/shared": resolve(__dirname, "src/shared/src"),
    },
  },
  build: {
    outDir: resolve(__dirname, "dist/web"),
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: resolve(__dirname, "src/modules/web/client/index.html"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});

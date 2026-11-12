/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Lets the frontend call the API as "/api" in development (set VITE_API_URL=/api).
    proxy: { "/api": { target: process.env.VITE_PROXY_TARGET ?? "http://localhost:4000", changeOrigin: true } }
  },
  test: { environment: "node", include: ["src/**/*.test.ts"] }
});

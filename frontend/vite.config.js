import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev-server proxy: any /api request is forwarded to the FastAPI backend,
// so the frontend and backend feel like one app in development.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { "/api": "http://localhost:8000" },
  },
});

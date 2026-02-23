import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-192.svg", "icon-512.svg"],
      manifest: {
        name: "NeuroSprint",
        short_name: "NeuroSprint",
        description: "Когнитивный тренажер скорости мышления",
        theme_color: "#1e7f71",
        background_color: "#f2f8f6",
        display: "standalone",
        start_url: "/",
        lang: "ru",
        icons: [
          {
            src: "/icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml"
          },
          {
            src: "/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"]
      }
    })
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"]
  }
});

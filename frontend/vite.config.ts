import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["app-icon.svg", "icons/app-icon-192.png", "icons/app-icon-512.png"],
      manifest: {
        name: "Sổ Chi Tiêu Lite",
        short_name: "Sổ Chi Tiêu Lite",
        description: "Quản lý giao dịch, danh mục và báo cáo thu chi cá nhân.",
        theme_color: "#003f46",
        background_color: "#f5f8f7",
        display: "standalone",
        orientation: "any",
        start_url: "/",
        scope: "/",
        lang: "vi",
        categories: ["finance", "productivity"],
        icons: [
          {
            src: "/icons/app-icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/app-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/main.tsx", "src/types.ts", "src/test/**", "**/*.test.{ts,tsx}"],
      thresholds: {
        statements: 60,
        branches: 45,
        functions: 55,
        lines: 65,
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});

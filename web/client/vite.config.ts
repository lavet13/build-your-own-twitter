import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import topLevelAwait from "vite-plugin-top-level-await";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    topLevelAwait({
      promiseExportName: "__tla",
      promiseImportName: (i) => `__tla_${i}`,
    }),
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
  },
  build: {
    minify: "esbuild",
    cssMinify: "lightningcss",
    // https://vite.dev/config/build-options.html#build-rollupoptions
    rollupOptions: {
      input: "./index.html",
      output: {
        // https://rollupjs.org/configuration-options/#output-manualchunks
        manualChunks: {
          // Core react
          "react-core": ["react", "react-dom"],

          // Tanstack ecosystem (routing)
          "tanstack-router": [
            "@tanstack/react-router",
            "@tanstack/react-router-devtools",
          ],

          // UI components
          UI: ["@radix-ui/themes"],
        },
      },
    },
  },
});

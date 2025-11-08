import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: ["src/server.ts"],
  format: ["esm", "cjs"],
  target: "node18",
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: !options.watch && "terser",
}));

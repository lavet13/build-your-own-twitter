import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  target: "node18",
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: !options.watch && "terser",
}));

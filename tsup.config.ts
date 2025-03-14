import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  minify: true,
  dts: true,
  splitting: false,
  clean: true,
  esbuildOptions(options) {
    options.drop = ["console", "debugger"];
  },
});

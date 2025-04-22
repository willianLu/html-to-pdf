import { defineConfig } from "tsup";

export default defineConfig((options) => {
  const isProd = options.env?.NODE_ENV === "production";
  return {
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    minify: true,
    dts: true,
    splitting: false,
    clean: true,
    esbuildOptions(esbuildOptions) {
      if (isProd) {
        esbuildOptions.drop = ["console", "debugger"];
      }
    },
  };
});

import esbuild from "esbuild";
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const prod = process.argv[2] === "production";

// Find RDKit WASM files in node_modules
const rdkitDir = dirname(require.resolve("@rdkit/rdkit/dist/RDKit_minimal.js"));
const wasmFiles = ["RDKit_minimal.js", "RDKit_minimal.wasm"];

const outdir = ".";

// Copy WASM files post-build
function copyWasmPlugin() {
  return {
    name: "copy-wasm",
    setup(build) {
      build.onEnd(() => {
        for (const file of wasmFiles) {
          const src = resolve(rdkitDir, file);
          const dest = resolve(outdir, file);
          if (existsSync(src)) {
            copyFileSync(src, dest);
            console.log(`Copied ${file}`);
          } else {
            console.warn(`Warning: ${src} not found`);
          }
        }
      });
    },
  };
}

esbuild
  .build({
    entryPoints: ["src/main.ts"],
    bundle: true,
    external: [
      "obsidian",
      "electron",
      "@codemirror/autocomplete",
      "@codemirror/collab",
      "@codemirror/commands",
      "@codemirror/language",
      "@codemirror/lint",
      "@codemirror/search",
      "@codemirror/state",
      "@codemirror/view",
      "@lezer/common",
      "@lezer/highlight",
      "@lezer/lr",
    ],
    format: "cjs",
    target: "es2020",
    logLevel: "info",
    sourcemap: prod ? false : "inline",
    treeShaking: true,
    outfile: "main.js",
    minify: prod,
    plugins: [copyWasmPlugin()],
  })
  .catch(() => process.exit(1));

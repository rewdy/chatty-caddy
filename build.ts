import esbuild from "esbuild";
import { chmod, writeFile, rm } from "fs/promises";

await rm("dist", { recursive: true, force: true });

await esbuild.build({
  entryPoints: ["src/cli.ts"],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "esm",
  outfile: "dist/cli.mjs",
  // Keep node_modules external — they're installed by npm at runtime.
  // This sidesteps CJS/ESM interop issues in dependencies like gray-matter
  // and Ink, which cannot be reliably bundled together into a single file.
  packages: "external",
  define: {
    "process.env.DEV": JSON.stringify("false"),
  },
});

// Standard npm CLI shebang wrapper — bin entry points here.
await writeFile("dist/bin.js", `#!/usr/bin/env node\nimport "./cli.mjs";\n`);
await chmod("dist/bin.js", 0o755);

console.log("Built: dist/cli.mjs");

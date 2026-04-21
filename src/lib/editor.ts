import * as p from "@clack/prompts";
import chalk from "chalk";
import { tmpdir } from "os";
import { join } from "path";
import { unlink } from "fs/promises";

const EDITOR_FALLBACKS = ["vim", "nano", "vi"];

function resolveEditor(): { bin: string; args: string[] } | null {
  const editorEnv = process.env["EDITOR"] ?? process.env["VISUAL"];

  if (editorEnv) {
    const [bin, ...args] = editorEnv.split(" ");
    if (bin) return { bin, args };
  }

  for (const fallback of EDITOR_FALLBACKS) {
    const result = Bun.spawnSync(["which", fallback]);
    if (result.exitCode === 0) return { bin: fallback, args: [] };
  }

  return null;
}

export async function openInEditor(initialContent = ""): Promise<string | null> {
  const editor = resolveEditor();

  if (!editor) {
    p.log.error(
      chalk.red("No editor found. Set the ") +
        chalk.bold("$EDITOR") +
        chalk.red(" environment variable (e.g. ") +
        chalk.dim("export EDITOR=nano") +
        chalk.red(") and try again.")
    );
    return null;
  }

  const editorName = editor.bin.split("/").pop() ?? editor.bin;
  const tmpFile = join(tmpdir(), `chatty-caddy-${Date.now()}.md`);

  await Bun.write(tmpFile, initialContent);

  p.log.step(
    chalk.cyan(`Opening in ${chalk.bold(editorName)}`) +
      chalk.dim(" — save and close the file when done.")
  );

  // Small pause so the user can read the message before the editor takes over
  await Bun.sleep(600);

  const proc = Bun.spawn([editor.bin, ...editor.args, tmpFile], {
    stdio: ["inherit", "inherit", "inherit"],
  });
  await proc.exited;

  const content = await Bun.file(tmpFile).text();
  await unlink(tmpFile).catch(() => {});

  const trimmed = content.trim();

  if (!trimmed) {
    p.log.warn(chalk.yellow("Editor closed with no content."));
    return null;
  }

  p.log.success(
    chalk.green("Content captured") +
      chalk.dim(` — ${trimmed.split("\n").length} line${trimmed.split("\n").length !== 1 ? "s" : ""}`)
  );

  return trimmed;
}

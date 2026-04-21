import * as p from "@clack/prompts";
import chalk from "chalk";
import { tmpdir } from "os";
import { join } from "path";
import { unlink, writeFile, readFile } from "fs/promises";
import { spawnSync, spawn } from "child_process";

const EDITOR_FALLBACKS = ["vim", "nano", "vi"];

function resolveEditor(): { bin: string; args: string[] } | null {
  const editorEnv = process.env["EDITOR"] ?? process.env["VISUAL"];

  if (editorEnv) {
    const [bin, ...args] = editorEnv.split(" ");
    if (bin) return { bin, args };
  }

  for (const fallback of EDITOR_FALLBACKS) {
    const result = spawnSync("which", [fallback], { encoding: "utf8" });
    if (result.status === 0) return { bin: fallback, args: [] };
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
        chalk.red(") and try again."),
    );
    return null;
  }

  const editorName = editor.bin.split("/").pop() ?? editor.bin;
  const tmpFile = join(tmpdir(), `chatty-caddy-${Date.now()}.md`);

  await writeFile(tmpFile, initialContent, "utf8");

  p.log.step(
    chalk.cyan(`Opening in ${chalk.bold(editorName)}`) +
      chalk.dim(" — save and close the file when done."),
  );

  await new Promise<void>((resolve) => setTimeout(resolve, 600));

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(editor.bin, [...editor.args, tmpFile], { stdio: "inherit" });
    proc.on("close", resolve);
    proc.on("error", reject);
  });

  const content = await readFile(tmpFile, "utf8");
  await unlink(tmpFile).catch(() => {});

  const trimmed = content.trim();

  if (!trimmed) {
    p.log.warn(chalk.yellow("Editor closed with no content."));
    return null;
  }

  p.log.success(
    chalk.green("Content captured") +
      chalk.dim(
        ` — ${trimmed.split("\n").length} line${trimmed.split("\n").length !== 1 ? "s" : ""}`,
      ),
  );

  return trimmed;
}

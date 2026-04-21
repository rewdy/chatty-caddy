import * as p from "@clack/prompts";
import chalk from "chalk";
import Fuse from "fuse.js";
import { loadAllPrompts, deletePrompt, updatePrompt } from "../lib/storage";
import { AI_TOOLS } from "../lib/tools";
import type { Prompt } from "../types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function buildPromptChoices(prompts: Prompt[]): p.Option<string>[] {
  return prompts.map((prompt) => ({
    value: prompt.id,
    label: chalk.bold(prompt.label) + chalk.dim(` — ${formatDate(prompt.createdAt)}`),
    hint: chalk.italic.gray(prompt.description),
  }));
}

async function runInTool(prompt: Prompt): Promise<void> {
  const toolChoices = AI_TOOLS.map((t) => ({
    value: t.id,
    label: t.label,
  }));

  const toolId = await p.select({
    message: chalk.cyan("Run in which tool?"),
    options: toolChoices,
  });

  if (p.isCancel(toolId)) return;

  const tool = AI_TOOLS.find((t) => t.id === toolId)!;
  const parts = tool.command.split(" ");
  const cmd = parts[0]!;
  const cmdArgs = [...parts.slice(1)];

  console.log();
  console.log(chalk.dim(`  Running: ${chalk.bold(tool.command)} with your prompt...`));
  console.log();

  if (tool.inputMethod === "arg") {
    cmdArgs.push(prompt.body);
    const proc = Bun.spawn([cmd, ...cmdArgs], { stdio: ["inherit", "inherit", "inherit"] });
    await proc.exited;
  } else {
    const enc = new TextEncoder();
    const proc = Bun.spawn([cmd, ...cmdArgs], {
      stdin: new ReadableStream({
        start(controller) {
          controller.enqueue(enc.encode(prompt.body));
          controller.close();
        },
      }),
      stdio: [undefined, "inherit", "inherit"],
    });
    await proc.exited;
  }
}

async function viewPrompt(prompt: Prompt): Promise<void> {
  console.log();
  console.log(
    chalk.bgCyan.black.bold(` ${prompt.label} `) +
      chalk.dim(` · ${formatDate(prompt.createdAt)}`)
  );
  console.log(chalk.italic.gray(prompt.description));
  console.log();
  console.log(chalk.white(prompt.body));
  console.log();
}

async function editPrompt(prompt: Prompt): Promise<Prompt> {
  const updated = await p.group(
    {
      label: () =>
        p.text({
          message: chalk.cyan("Label"),
          initialValue: prompt.label,
          validate: (v) => (!v?.trim() ? "Label is required." : undefined),
        }),
      description: () =>
        p.text({
          message: chalk.cyan("What is it for?"),
          initialValue: prompt.description,
          validate: (v) => (!v?.trim() ? "Description is required." : undefined),
        }),
      body: () =>
        p.text({
          message: chalk.cyan("Prompt body"),
          initialValue: prompt.body,
          validate: (v) => (!v?.trim() ? "Prompt body is required." : undefined),
        }),
    },
    {
      onCancel: () => {
        p.cancel(chalk.yellow("Edit cancelled."));
      },
    }
  );

  const updatedPrompt: Prompt = {
    ...prompt,
    label: updated.label?.trim() ?? prompt.label,
    description: updated.description?.trim() ?? prompt.description,
    body: updated.body?.trim() ?? prompt.body,
  };

  await updatePrompt(updatedPrompt);
  p.log.success(chalk.green("✓ Updated: ") + chalk.bold(updatedPrompt.label));
  return updatedPrompt;
}

async function promptActionMenu(prompt: Prompt, allPrompts: Prompt[]): Promise<"deleted" | "back"> {
  const action = await p.select({
    message:
      chalk.bold(prompt.label) + chalk.dim(" — what would you like to do?"),
    options: [
      { value: "view", label: chalk.white("View full prompt") },
      { value: "edit", label: chalk.yellow("Edit") },
      ...AI_TOOLS.map((t) => ({
        value: `run:${t.id}`,
        label: chalk.magenta(`Run in ${t.label}`),
      })),
      { value: "delete", label: chalk.red("Delete") },
      { value: "back", label: chalk.dim("← Back to list") },
    ],
  });

  if (p.isCancel(action) || action === "back") return "back";

  if (action === "view") {
    await viewPrompt(prompt);
    return promptActionMenu(prompt, allPrompts);
  }

  if (action === "edit") {
    await editPrompt(prompt);
    return "back";
  }

  if (typeof action === "string" && action.startsWith("run:")) {
    const toolId = action.slice(4);
    const tool = AI_TOOLS.find((t) => t.id === toolId)!;
    const parts = tool.command.split(" ");
    const cmd = parts[0]!;
    const cmdArgs = [...parts.slice(1)];

    console.log();
    console.log(chalk.dim(`  Launching ${chalk.bold(tool.label)}...`));
    console.log();

    if (tool.inputMethod === "arg") {
      cmdArgs.push(prompt.body);
      const proc = Bun.spawn([cmd, ...cmdArgs], { stdio: ["inherit", "inherit", "inherit"] });
      await proc.exited;
    } else {
      const enc = new TextEncoder();
      const proc = Bun.spawn([cmd, ...cmdArgs], {
        stdin: new ReadableStream({
          start(controller) {
            controller.enqueue(enc.encode(prompt.body));
            controller.close();
          },
        }),
        stdio: [undefined, "inherit", "inherit"],
      });
      await proc.exited;
    }
    return "back";
  }

  if (action === "delete") {
    const confirm = await p.confirm({
      message: chalk.red(`Delete "${prompt.label}"? This cannot be undone.`),
      initialValue: false,
    });

    if (p.isCancel(confirm) || !confirm) {
      p.log.info("Delete cancelled.");
      return promptActionMenu(prompt, allPrompts);
    }

    await deletePrompt(prompt.id);
    p.log.success(chalk.red("✓ Deleted: ") + chalk.bold(prompt.label));
    return "deleted";
  }

  return "back";
}

export async function listCommand(): Promise<void> {
  console.log();
  p.intro(chalk.bgCyan.black.bold(" chatty-caddy ") + chalk.cyan(" your saved prompts"));

  let prompts = await loadAllPrompts();

  if (prompts.length === 0) {
    p.outro(
      chalk.yellow("No prompts saved yet. Run ") +
        chalk.bold("chatty-caddy add") +
        chalk.yellow(" to create one.")
    );
    return;
  }

  // Fuzzy search loop — keeps re-showing the list until user exits
  while (true) {
    const query = await p.text({
      message: chalk.cyan("Filter prompts") + chalk.dim(" (leave blank to show all, Ctrl+C to exit)"),
      placeholder: "Search by label, description, or body...",
    });

    if (p.isCancel(query)) {
      p.cancel(chalk.dim("Bye!"));
      process.exit(0);
    }

    let filtered = prompts;

    if (query.trim()) {
      const fuse = new Fuse(prompts, {
        keys: ["label", "description", "body"],
        threshold: 0.4,
        includeScore: true,
      });
      const results = fuse.search(query.trim());
      filtered = results.map((r) => r.item);
    }

    if (filtered.length === 0) {
      p.log.warn(chalk.yellow(`No prompts match "${query}". Try a different search.`));
      continue;
    }

    const selectedId = await p.select({
      message:
        chalk.cyan("Select a prompt") +
        chalk.dim(` (${filtered.length} result${filtered.length !== 1 ? "s" : ""})`),
      options: [
        ...buildPromptChoices(filtered),
        { value: "__search__", label: chalk.dim("← New search") },
      ],
    });

    if (p.isCancel(selectedId) || selectedId === "__search__") {
      continue;
    }

    const selected = prompts.find((p) => p.id === selectedId);
    if (!selected) continue;

    const result = await promptActionMenu(selected, prompts);

    if (result === "deleted") {
      // Reload from disk
      prompts = await loadAllPrompts();
    }
  }
}

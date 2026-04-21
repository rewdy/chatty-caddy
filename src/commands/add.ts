import * as p from "@clack/prompts";
import chalk from "chalk";
import { randomUUID } from "crypto";
import { savePrompt } from "../lib/storage";
import type { Prompt } from "../types";

export async function addCommand(): Promise<void> {
  console.log();
  p.intro(chalk.bgCyan.black.bold(" chatty-caddy ") + chalk.cyan(" add a new prompt"));

  const fields = await p.group(
    {
      label: () =>
        p.text({
          message: chalk.cyan("Label"),
          placeholder: "e.g. Refactor to functional",
          validate: (v) => (!v?.trim() ? "Label is required." : undefined),
        }),
      description: () =>
        p.text({
          message: chalk.cyan("What is it for?"),
          placeholder: "e.g. Converts a class component to a functional React component",
          validate: (v) => (!v?.trim() ? "Description is required." : undefined),
        }),
      body: () =>
        p.text({
          message: chalk.cyan("Prompt body"),
          placeholder: "Paste or type your prompt...",
          validate: (v) => (!v?.trim() ? "Prompt body is required." : undefined),
        }),
    },
    {
      onCancel: () => {
        p.cancel(chalk.yellow("Cancelled."));
        process.exit(0);
      },
    }
  );

  const prompt: Prompt = {
    id: randomUUID(),
    label: fields.label.trim(),
    description: fields.description.trim(),
    body: fields.body.trim(),
    createdAt: new Date().toISOString(),
  };

  await savePrompt(prompt);

  p.outro(
    chalk.green("✓ Saved: ") +
      chalk.bold(prompt.label) +
      chalk.dim(` (${prompt.id.slice(0, 8)})`)
  );
}

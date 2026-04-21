import * as p from "@clack/prompts";
import chalk from "chalk";
import { v5 as uuidv5 } from "uuid";
import { savePrompt } from "../lib/storage";
import { openInEditor } from "../lib/editor";
import type { Prompt } from "../types";

// Stable namespace for chatty-caddy prompt IDs
const NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"; // UUID v5 DNS namespace

export async function addCommand(): Promise<void> {
  console.log();
  p.intro(chalk.bgCyan.black.bold(" chatty-caddy ") + chalk.cyan(" add a new prompt"));

  const meta = await p.group(
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
      bodyInput: () =>
        p.select({
          message: chalk.cyan("How would you like to enter the prompt body?"),
          options: [
            {
              value: "editor",
              label: "Open in my default editor",
              hint: "recommended for longer prompts",
            },
            { value: "inline", label: "Type inline" },
          ],
        }),
    },
    {
      onCancel: () => {
        p.cancel(chalk.yellow("Cancelled."));
        process.exit(0);
      },
    },
  );

  let body: string | null = null;

  if (meta.bodyInput === "editor") {
    body = await openInEditor();
    if (!body) {
      p.cancel(chalk.yellow("No content entered. Prompt was not saved."));
      process.exit(0);
    }
  } else {
    const inlineBody = await p.text({
      message: chalk.cyan("Prompt body"),
      placeholder: "Type your prompt...",
      validate: (v) => (!v?.trim() ? "Prompt body is required." : undefined),
    });

    if (p.isCancel(inlineBody)) {
      p.cancel(chalk.yellow("Cancelled."));
      process.exit(0);
    }

    body = inlineBody.trim();
  }

  const label = meta.label.trim();
  const prompt: Prompt = {
    id: uuidv5(label, NAMESPACE),
    label,
    description: meta.description.trim(),
    body,
    createdAt: new Date().toISOString(),
  };

  await savePrompt(prompt);

  p.outro(
    chalk.green("✓ Saved: ") + chalk.bold(prompt.label) + chalk.dim(` (${prompt.id.slice(0, 8)})`),
  );
}

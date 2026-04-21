import React, { useState, useEffect } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import TextInput from "ink-text-input";
import Fuse from "fuse.js";
import chalk from "chalk";
import * as p from "@clack/prompts";
import { loadAllPrompts, deletePrompt, updatePrompt } from "../lib/storage";
import { openInEditor } from "../lib/editor";
import { AI_TOOLS } from "../lib/tools";
import { PromptView, type ViewResult } from "../components/PromptView";
import type { Prompt } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fuzzyFilter(prompts: Prompt[], query: string): Prompt[] {
  if (!query.trim()) return prompts;
  const fuse = new Fuse(prompts, {
    keys: ["label", "description", "body"],
    threshold: 0.4,
    includeScore: true,
  });
  return fuse.search(query).map((r) => r.item);
}

// ─── Table row ────────────────────────────────────────────────────────────────

function Row({
  prompt,
  isSelected,
  index,
}: {
  prompt: Prompt;
  isSelected: boolean;
  index: number;
}) {
  const bg = isSelected ? "cyan" : undefined;
  const fg = isSelected ? "black" : "white";
  const dim = isSelected ? "black" : undefined;

  return (
    <Box>
      <Box width={4}>
        <Text color={isSelected ? "black" : "cyan"} bold={isSelected} backgroundColor={bg}>
          {isSelected ? " ❯  " : `  ${index + 1} `}
        </Text>
      </Box>
      <Box width={32}>
        <Text color={fg} bold={isSelected} backgroundColor={bg} wrap="truncate">
          {` ${prompt.label} `}
        </Text>
      </Box>
      <Box width={42}>
        <Text color={dim ?? "gray"} backgroundColor={bg} wrap="truncate">
          {` ${prompt.description} `}
        </Text>
      </Box>
      <Box width={14}>
        <Text color={dim ?? "gray"} backgroundColor={bg}>
          {` ${formatDate(prompt.createdAt)} `}
        </Text>
      </Box>
    </Box>
  );
}

// ─── Header / footer ──────────────────────────────────────────────────────────

function Header() {
  return (
    <Box marginBottom={1}>
      <Text backgroundColor="cyan" color="black" bold>
        {" "}
        chatty-caddy{" "}
      </Text>
      <Text color="cyan"> your saved prompts</Text>
    </Box>
  );
}

function TableHeader() {
  return (
    <Box
      borderStyle="single"
      borderBottom={true}
      borderTop={false}
      borderLeft={false}
      borderRight={false}
    >
      <Box width={4}>
        <Text> </Text>
      </Box>
      <Box width={32}>
        <Text bold color="cyan">
          {" "}
          Label
        </Text>
      </Box>
      <Box width={42}>
        <Text bold color="cyan">
          {" "}
          Description
        </Text>
      </Box>
      <Box width={14}>
        <Text bold color="cyan">
          {" "}
          Created
        </Text>
      </Box>
    </Box>
  );
}

function Footer({ count, total }: { count: number; total: number }) {
  return (
    <Box marginTop={1}>
      <Text color="gray">
        {count < total
          ? `${count} of ${total} prompts`
          : `${total} prompt${total !== 1 ? "s" : ""}`}
        {"  "}
      </Text>
      <Text color="gray" dimColor>
        ↑↓ navigate{" "}
      </Text>
      <Text color="gray" dimColor>
        enter select{" "}
      </Text>
      <Text color="gray" dimColor>
        ctrl+c exit
      </Text>
    </Box>
  );
}

// ─── List App ─────────────────────────────────────────────────────────────────

interface ListAppProps {
  initialPrompts: Prompt[];
  onSelect: (prompt: Prompt) => void;
  onExit: () => void;
}

function ListApp({ initialPrompts, onSelect, onExit }: ListAppProps) {
  const { exit } = useApp();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [focused, setFocused] = useState<"search" | "list">("search");

  const filtered = fuzzyFilter(initialPrompts, query);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      exit();
      onExit();
      return;
    }

    if (focused === "list") {
      if (key.upArrow) {
        if (cursor === 0) {
          setFocused("search");
          return;
        }
        setCursor((c) => c - 1);
        return;
      }
      if (key.downArrow) {
        setCursor((c) => Math.min(filtered.length - 1, c + 1));
        return;
      }
      if (key.return && filtered.length > 0) {
        const selected = filtered[cursor];
        if (selected) {
          exit();
          onSelect(selected);
        }
        return;
      }
      if (input === "/" || input === "f") {
        setFocused("search");
        return;
      }
      if (key.escape || input === "q") {
        exit();
        onExit();
        return;
      }
    }

    if (focused === "search") {
      if (key.downArrow && filtered.length > 0) {
        setCursor(0);
        setFocused("list");
        return;
      }
      if (key.upArrow && filtered.length > 0) {
        setCursor(filtered.length - 1);
        setFocused("list");
        return;
      }
      if (key.return) {
        setFocused("list");
        return;
      }
      if (key.escape) {
        if (query.length > 0) {
          setQuery("");
          return;
        }
        exit();
        onExit();
        return;
      }
    }
  });

  return (
    <Box flexDirection="column">
      <Header />
      <Box marginBottom={1}>
        <Text color="cyan">Search: </Text>
        <TextInput
          value={query}
          onChange={(val) => {
            setQuery(val);
            setFocused("search");
          }}
          onSubmit={() => setFocused("list")}
          placeholder="type to filter..."
          focus={focused === "search"}
        />
        {query.length > 0 && (
          <Text color="gray" dimColor>
            {" "}
            (esc to clear)
          </Text>
        )}
      </Box>
      <TableHeader />
      {filtered.length === 0 ? (
        <Box marginTop={1}>
          <Text color="yellow">No prompts match "{query}"</Text>
        </Box>
      ) : (
        filtered.map((prompt, i) => (
          <Row
            key={prompt.id}
            prompt={prompt}
            isSelected={focused === "list" && i === cursor}
            index={i}
          />
        ))
      )}
      <Footer count={filtered.length} total={initialPrompts.length} />
    </Box>
  );
}

// ─── View App (wraps PromptView for rendering) ────────────────────────────────

function ViewApp({ prompt, onDone }: { prompt: Prompt; onDone: (r: ViewResult) => void }) {
  return <PromptView prompt={prompt} onDone={onDone} />;
}

// ─── Edit flow (clack) ────────────────────────────────────────────────────────

async function runEditFlow(prompt: Prompt): Promise<Prompt> {
  console.log();
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
      bodyInput: () =>
        p.select({
          message: chalk.cyan("How would you like to edit the prompt body?"),
          options: [
            {
              value: "editor",
              label: "Open in my default editor",
              hint: "recommended for longer prompts",
            },
            { value: "inline", label: "Edit inline" },
          ],
        }),
    },
    {
      onCancel: () => {
        p.cancel(chalk.yellow("Edit cancelled."));
      },
    },
  );

  let body = prompt.body;
  if (updated.bodyInput === "editor") {
    const edited = await openInEditor(prompt.body);
    if (edited) body = edited;
  } else {
    const inlineBody = await p.text({
      message: chalk.cyan("Prompt body"),
      initialValue: prompt.body,
      validate: (v) => (!v?.trim() ? "Prompt body is required." : undefined),
    });
    if (!p.isCancel(inlineBody) && inlineBody.trim()) body = inlineBody.trim();
  }

  const updatedPrompt: Prompt = {
    ...prompt,
    label: updated.label?.trim() ?? prompt.label,
    description: updated.description?.trim() ?? prompt.description,
    body,
  };

  await updatePrompt(updatedPrompt);
  p.log.success(chalk.green("✓ Updated: ") + chalk.bold(updatedPrompt.label));
  return updatedPrompt;
}

// ─── Run tool ─────────────────────────────────────────────────────────────────

async function runTool(prompt: Prompt, toolId: string): Promise<void> {
  const tool = AI_TOOLS.find((t) => t.id === toolId);
  if (!tool) return;

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
}

// ─── Render helpers ───────────────────────────────────────────────────────────

function renderListApp(prompts: Prompt[]): Promise<Prompt | null> {
  return new Promise((resolve) => {
    render(
      <ListApp
        initialPrompts={prompts}
        onSelect={(p) => resolve(p)}
        onExit={() => resolve(null)}
      />,
    );
  });
}

function renderViewApp(prompt: Prompt): Promise<ViewResult> {
  return new Promise((resolve) => {
    render(<ViewApp prompt={prompt} onDone={(r) => resolve(r)} />);
  });
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function listCommand(): Promise<void> {
  let prompts = await loadAllPrompts();

  if (prompts.length === 0) {
    console.log();
    console.log(
      chalk.bgCyan.black.bold(" chatty-caddy ") +
        chalk.yellow(" No prompts saved yet. Run ") +
        chalk.bold("chatty-caddy add") +
        chalk.yellow(" to create one."),
    );
    console.log();
    return;
  }

  while (true) {
    const selected = await renderListApp(prompts);
    if (!selected) break;

    // View loop — stay on the same prompt through edit cycles
    let current = selected;
    while (true) {
      const result = await renderViewApp(current);

      if (result.action === "back") break;

      if (result.action === "edit") {
        current = await runEditFlow(current);
        prompts = await loadAllPrompts();
        continue;
      }

      if (result.action === "run") {
        await runTool(current, result.toolId);
        break;
      }

      if (result.action === "deleted") {
        await deletePrompt(current.id);
        p.log.success(chalk.red("✓ Deleted: ") + chalk.bold(current.label));
        prompts = await loadAllPrompts();
        break;
      }
    }
  }
}

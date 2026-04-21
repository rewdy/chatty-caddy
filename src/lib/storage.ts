import { homedir } from "os";
import { join } from "path";
import { mkdir } from "fs/promises";
import matter from "gray-matter";
import type { Prompt } from "../types";

const CONFIG_DIR = join(homedir(), ".chatty-caddy");

async function ensureConfigDir(): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
}

function promptToFilename(id: string): string {
  return join(CONFIG_DIR, `${id}.md`);
}

function promptToMarkdown(prompt: Prompt): string {
  return matter.stringify(prompt.body, {
    id: prompt.id,
    label: prompt.label,
    description: prompt.description,
    createdAt: prompt.createdAt,
  });
}

function parsePrompt(content: string): Prompt | null {
  try {
    const { data, content: body } = matter(content);
    if (!data["id"] || !data["label"] || !data["description"] || !data["createdAt"]) return null;
    return {
      id: data["id"] as string,
      label: data["label"] as string,
      description: data["description"] as string,
      body: body.trim(),
      createdAt: data["createdAt"] as string,
    };
  } catch {
    return null;
  }
}

export async function savePrompt(prompt: Prompt): Promise<void> {
  await ensureConfigDir();
  await Bun.write(promptToFilename(prompt.id), promptToMarkdown(prompt));
}

export async function loadAllPrompts(): Promise<Prompt[]> {
  await ensureConfigDir();

  const glob = new Bun.Glob("*.md");
  const files = await Array.fromAsync(glob.scan({ cwd: CONFIG_DIR, absolute: true }));

  const prompts: Prompt[] = [];
  for (const file of files) {
    const content = await Bun.file(file).text();
    const prompt = parsePrompt(content);
    if (prompt) prompts.push(prompt);
  }

  return prompts.sort((a, b) => a.label.localeCompare(b.label));
}

export async function deletePrompt(id: string): Promise<void> {
  const proc = Bun.spawn(["rm", "-f", promptToFilename(id)]);
  await proc.exited;
}

export async function updatePrompt(prompt: Prompt): Promise<void> {
  await savePrompt(prompt);
}

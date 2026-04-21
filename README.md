# chatty-caddy

A CLI notebook for storing, browsing, and running your frequently used AI prompts.

Prompts are saved as Markdown files in `~/.chatty-caddy` with YAML frontmatter — human-readable, easy to back up, and version-controllable.

## Installation

```sh
npm install -g @rewdy/chatty-caddy
```

Requires [Bun](https://bun.sh) to be installed on your system.

## Usage

Both `chatty-caddy` and the shorter alias `chaca` work for all commands.

### Add a prompt

```sh
chaca add
```

Walks you through a prompt to enter a label, description, and body. The prompt is saved immediately to `~/.chatty-caddy`.

### Browse & manage prompts

```sh
chaca list
```

Opens an interactive browser with fuzzy search. From there you can:

- **View** the full prompt body
- **Edit** any field
- **Run** the prompt directly in Claude, Codex, or GitHub Copilot
- **Delete** a prompt

### Help

```sh
chaca help
```

## Prompt storage

Each prompt is saved as a Markdown file at `~/.chatty-caddy/<uuid>.md`:

```markdown
---
id: 3f2a1b4c-...
label: Refactor to functional
description: Converts a class component to a functional React component
createdAt: 2026-04-21T10:00:00.000Z
---

Refactor the following React class component into a functional component using hooks...
```

## Adding AI tools

Supported tools (Claude, Codex, GitHub Copilot) are defined in [`src/lib/tools.ts`](src/lib/tools.ts). Adding a new one is a single array entry:

```ts
{
  id: "my-tool",
  label: "My Tool",
  command: "my-tool-cli",
  inputMethod: "arg", // or "stdin"
}
```

## Development

```sh
bun install
bun src/cli.ts add
bun src/cli.ts list
```

export interface AiTool {
  id: string;
  label: string;
  command: string;
  // How the prompt is passed to the command.
  // "arg" = appended as a quoted argument: `command "prompt"`
  // "stdin" = written to stdin
  inputMethod: "arg" | "stdin";
}

export const AI_TOOLS: AiTool[] = [
  {
    id: "claude",
    label: "Claude",
    command: "claude",
    inputMethod: "arg",
  },
  {
    id: "codex",
    label: "Codex",
    command: "codex",
    inputMethod: "arg",
  },
  {
    id: "copilot",
    label: "GitHub Copilot",
    command: "gh copilot suggest",
    inputMethod: "arg",
  },
];

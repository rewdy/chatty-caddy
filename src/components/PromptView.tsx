import React, { useState } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { AI_TOOLS } from "../lib/tools.js";
import { copyToClipboard } from "../lib/clipboard.js";
import type { Prompt } from "../types.js";

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewState = "actions" | "run-picker" | "delete-confirm";
type CopyStatus = "idle" | "copied" | "error";

export type ViewResult =
  | { action: "edit" }
  | { action: "run"; toolId: string }
  | { action: "deleted" }
  | { action: "back" };

interface Props {
  prompt: Prompt;
  onDone: (result: ViewResult) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIONS = ["run", "copy", "edit", "delete", "back"] as const;
type ActionId = (typeof ACTIONS)[number];

const ACTION_META: Record<ActionId, { label: string; color: string }> = {
  run: { label: "Run", color: "magenta" },
  copy: { label: "Copy", color: "green" },
  edit: { label: "Edit", color: "yellow" },
  delete: { label: "Delete", color: "red" },
  back: { label: "← Back", color: "gray" },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function ActionBar({
  selected,
  state,
  copyStatus,
}: {
  selected: ActionId;
  state: ViewState;
  copyStatus: CopyStatus;
}) {
  const mainActions: ActionId[] = ["run", "copy", "edit", "delete"];
  const isActive = (id: ActionId) => selected === id && state === "actions";
  const isEngaged = (id: ActionId) =>
    (id === "run" && state === "run-picker") || (id === "delete" && state === "delete-confirm");

  const labelFor = (id: ActionId): string => {
    if (id === "copy") {
      if (copyStatus === "copied") return "Copied!";
      if (copyStatus === "error") return "Copy failed";
    }
    return ACTION_META[id].label;
  };

  return (
    <Box paddingX={1} paddingY={0} justifyContent="space-between">
      <Box gap={1}>
        {mainActions.map((id) => {
          const { color } = ACTION_META[id];
          const label = labelFor(id);
          const active = isActive(id);
          const engaged = isEngaged(id);
          const displayColor = id === "copy" && copyStatus === "error" ? "red" : color;
          return (
            <Box key={id}>
              {active || engaged ? (
                <Text
                  backgroundColor={displayColor}
                  color="black"
                  bold
                >{` ${label} `}</Text>
              ) : (
                <Text color={displayColor}>{`[ ${label} ]`}</Text>
              )}
            </Box>
          );
        })}
      </Box>
      <Box>
        {isActive("back") ? (
          <Text backgroundColor="gray" color="black" bold>{` ← Back `}</Text>
        ) : (
          <Text color="gray" dimColor>
            ← Back
          </Text>
        )}
      </Box>
    </Box>
  );
}

function Divider() {
  return (
    <Box>
      <Text color="gray" dimColor>
        {"─".repeat(88)}
      </Text>
    </Box>
  );
}

function PromptBody({ prompt }: { prompt: Prompt }) {
  const created = new Date(prompt.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1} gap={1}>
      <Box flexDirection="column">
        <Box gap={2}>
          <Text bold color="cyan">
            {prompt.label}
          </Text>
          <Text color="gray" dimColor>
            {created}
          </Text>
        </Box>
        <Text color="gray" italic>
          {prompt.description}
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text wrap="wrap">{prompt.body}</Text>
      </Box>
    </Box>
  );
}

function RunPicker({ cursor }: { cursor: number }) {
  return (
    <Box flexDirection="column" paddingX={2} paddingY={1} gap={1}>
      <Text bold color="magenta">
        Run in...
      </Text>
      <Box flexDirection="column">
        {AI_TOOLS.map((tool, i) => (
          <Box key={tool.id}>
            {i === cursor ? (
              <Text color="magenta" bold>{`  ❯ ${tool.label}`}</Text>
            ) : (
              <Text color="gray">{`    ${tool.label}`}</Text>
            )}
          </Box>
        ))}
      </Box>
      <Text color="gray" dimColor>
        ↑↓ select · enter launch · esc cancel
      </Text>
    </Box>
  );
}

function DeleteConfirm({ promptLabel, cursor }: { promptLabel: string; cursor: number }) {
  return (
    <Box flexDirection="column" paddingX={2} paddingY={1} gap={1}>
      <Text bold color="red">
        Delete "{promptLabel}"?
      </Text>
      <Text color="gray">This cannot be undone.</Text>
      <Box flexDirection="column" marginTop={1}>
        {["Yes, delete", "No, cancel"].map((opt, i) => (
          <Box key={opt}>
            {i === cursor ? (
              <Text color={i === 0 ? "red" : "cyan"} bold>{`  ❯ ${opt}`}</Text>
            ) : (
              <Text color="gray">{`    ${opt}`}</Text>
            )}
          </Box>
        ))}
      </Box>
      <Text color="gray" dimColor>
        ↑↓ select · enter confirm · esc cancel
      </Text>
    </Box>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PromptView({ prompt, onDone }: Props) {
  const { exit } = useApp();
  const [selectedAction, setSelectedAction] = useState<ActionId>("run");
  const [viewState, setViewState] = useState<ViewState>("actions");
  const [subCursor, setSubCursor] = useState(0);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");

  const actionIndex = ACTIONS.indexOf(selectedAction);

  const handleCopy = async () => {
    const ok = await copyToClipboard(prompt.body);
    setCopyStatus(ok ? "copied" : "error");
    setTimeout(() => setCopyStatus("idle"), 1500);
  };

  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      exit();
      onDone({ action: "back" });
      return;
    }

    // ── action bar navigation ──────────────────────────────────────────────
    if (viewState === "actions") {
      if (key.leftArrow) {
        const next = Math.max(0, actionIndex - 1);
        setSelectedAction(ACTIONS[next] ?? "edit");
        return;
      }
      if (key.rightArrow) {
        const next = Math.min(ACTIONS.length - 1, actionIndex + 1);
        setSelectedAction(ACTIONS[next] ?? "back");
        return;
      }
      if (key.escape) {
        exit();
        onDone({ action: "back" });
        return;
      }
      if (key.return) {
        if (selectedAction === "edit") {
          exit();
          onDone({ action: "edit" });
          return;
        }
        if (selectedAction === "back") {
          exit();
          onDone({ action: "back" });
          return;
        }
        if (selectedAction === "run") {
          setSubCursor(0);
          setViewState("run-picker");
          return;
        }
        if (selectedAction === "copy") {
          void handleCopy();
          return;
        }
        if (selectedAction === "delete") {
          setSubCursor(0);
          setViewState("delete-confirm");
          return;
        }
      }
      return;
    }

    // ── run picker ─────────────────────────────────────────────────────────
    if (viewState === "run-picker") {
      if (key.upArrow) {
        setSubCursor((c) => Math.max(0, c - 1));
        return;
      }
      if (key.downArrow) {
        setSubCursor((c) => Math.min(AI_TOOLS.length - 1, c + 1));
        return;
      }
      if (key.escape) {
        setViewState("actions");
        return;
      }
      if (key.return) {
        const tool = AI_TOOLS[subCursor];
        if (tool) {
          exit();
          onDone({ action: "run", toolId: tool.id });
        }
        return;
      }
      return;
    }

    // ── delete confirm ─────────────────────────────────────────────────────
    if (viewState === "delete-confirm") {
      if (key.upArrow || key.leftArrow) {
        setSubCursor(0);
        return;
      }
      if (key.downArrow || key.rightArrow) {
        setSubCursor(1);
        return;
      }
      if (key.escape || (key.return && subCursor === 1)) {
        setViewState("actions");
        return;
      }
      if (key.return && subCursor === 0) {
        exit();
        onDone({ action: "deleted" });
        return;
      }
    }
  });

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box marginBottom={1} paddingX={1}>
        <Text backgroundColor="cyan" color="black" bold>
          {" "}
          chatty-caddy{" "}
        </Text>
        <Text color="cyan"> prompt view</Text>
      </Box>

      <Divider />
      <ActionBar selected={selectedAction} state={viewState} copyStatus={copyStatus} />
      <Divider />

      {viewState === "actions" && <PromptBody prompt={prompt} />}
      {viewState === "run-picker" && <RunPicker cursor={subCursor} />}
      {viewState === "delete-confirm" && (
        <DeleteConfirm promptLabel={prompt.label} cursor={subCursor} />
      )}

      <Divider />
      <Box paddingX={2}>
        <Text color="gray" dimColor>
          ←→ navigate actions · enter select · esc back
        </Text>
      </Box>
    </Box>
  );
}

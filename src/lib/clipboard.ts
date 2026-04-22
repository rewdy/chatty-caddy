import { spawn } from "child_process";

type Candidate = { bin: string; args: string[] };

function candidates(): Candidate[] {
  if (process.platform === "darwin") {
    return [{ bin: "pbcopy", args: [] }];
  }
  if (process.platform === "win32") {
    return [{ bin: "clip", args: [] }];
  }
  return [
    { bin: "wl-copy", args: [] },
    { bin: "xclip", args: ["-selection", "clipboard"] },
    { bin: "xsel", args: ["--clipboard", "--input"] },
  ];
}

export async function copyToClipboard(text: string): Promise<boolean> {
  for (const { bin, args } of candidates()) {
    const ok = await tryCopy(bin, args, text);
    if (ok) return true;
  }
  return false;
}

function tryCopy(bin: string, args: string[], text: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const proc = spawn(bin, args, { stdio: ["pipe", "ignore", "ignore"] });
      proc.on("error", () => resolve(false));
      proc.on("close", (code) => resolve(code === 0));
      proc.stdin?.end(text);
    } catch {
      resolve(false);
    }
  });
}

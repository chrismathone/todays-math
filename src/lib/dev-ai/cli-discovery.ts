import { access, stat } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import type { DevAiProvider } from "./contracts";
import { envValue, type CliExecutable } from "./cli-process";

/** Resolve npm shims to their installed JS/native bin; never execute .cmd/.ps1. */
export function executableCandidates(
  provider: DevAiProvider,
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform = process.platform,
): CliExecutable[] {
  const p = platform === "win32" ? path.win32 : path.posix;
  const directories = (envValue(env, "PATH") ?? "")
    .split(p.delimiter)
    .map((directory) => directory.replace(/^"|"$/g, ""))
    .filter((directory) => p.isAbsolute(directory));
  const user = envValue(env, "USERPROFILE") ?? envValue(env, "HOME");
  const appData = envValue(env, "APPDATA");
  const localData = envValue(env, "LOCALAPPDATA");
  if (platform === "win32" && appData) directories.push(p.join(appData, "npm"));
  if (user) directories.push(p.join(user, ".local", "bin"));
  if (provider === "grok" && user)
    directories.push(p.join(user, ".grok", "bin"));
  if (provider === "antigravity" && localData)
    directories.push(p.join(localData, "agy", "bin"));
  const name = provider === "antigravity" ? "agy" : provider;
  const result: CliExecutable[] = [];
  for (const directory of new Set(
    directories.filter((entry) => p.isAbsolute(entry)),
  )) {
    result.push({
      command: p.join(directory, platform === "win32" ? `${name}.exe` : name),
      prefix: [],
    });
    if (provider === "codex") {
      result.push({
        command: process.execPath,
        prefix: [
          p.join(
            directory,
            "node_modules",
            "@openai",
            "codex",
            "bin",
            "codex.js",
          ),
        ],
      });
    } else if (provider === "claude") {
      if (platform === "win32")
        result.push({
          command: p.join(
            directory,
            "node_modules",
            "@anthropic-ai",
            "claude-code",
            "bin",
            "claude.exe",
          ),
          prefix: [],
        });
      result.push({
        command: process.execPath,
        prefix: [
          p.join(
            directory,
            "node_modules",
            "@anthropic-ai",
            "claude-code",
            "cli.js",
          ),
        ],
      });
    }
  }
  return result;
}

export async function discoverSubscriptionCli(
  provider: DevAiProvider,
  env: NodeJS.ProcessEnv,
): Promise<CliExecutable | undefined> {
  for (const candidate of executableCandidates(provider, env)) {
    try {
      const target = candidate.prefix[0] ?? candidate.command;
      await access(
        target,
        candidate.prefix.length ? constants.R_OK : constants.X_OK,
      );
      if ((await stat(target)).isFile()) return candidate;
    } catch {
      /* Try the next installed official CLI location. */
    }
  }
  return undefined;
}

import { readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  envValue,
  SubscriptionCliError,
  type CliEnvironment,
} from "./cli-process";
import { CLI_MODEL_ID } from "./contracts";

/**
 * 구독 CLI 모델 고르기 (원장님 2026-09-18 — «Codex 도 astra, sol · Claude 도 fable, opus, sonnet»).
 *
 * 구독 호출은 사용자 설정을 끄고 돈다(Codex `--ignore-user-config` · Claude `--setting-sources ""`) —
 * 훅·MCP·권한을 끌어오지 않으려고. 그래서 «원장님 CLI 설정의 모델»은 여기서 **모델 칸만** 읽어
 * 인자로 넘긴다(같은 날 확정 — 고르지 않으면 CLI 설정을 따른다). 인증 파일은 읽지 않는다.
 */
export interface CliModelSettings {
  /** 고를 수 있는 모델(표시 순서). */
  models: string[];
  /** 원장님 CLI 설정의 모델 — 없으면 CLI 자체 기본(모델 인자 없음). */
  defaultModel?: string;
  /** Codex 만: 설정의 추론 강도 — 그 모델이 받을 때만 넘긴다. */
  reasoningEffort?: string;
  /** Codex 만: 모델별로 받는 추론 강도(`models_cache.json`). */
  efforts: Record<string, string[]>;
}
export const CLAUDE_MODELS = ["fable", "opus", "sonnet"] as const;
const EFFORT = /^[a-z]{2,16}$/;

async function readSmall(file: string): Promise<string> {
  try {
    if ((await stat(file)).size > 2 * 1024 * 1024) return "";
    return await readFile(file, "utf8");
  } catch {
    return "";
  }
}
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
/** config.toml 의 맨 위(첫 [표] 앞) `key = "문자열"` 하나 — 프로필 안의 같은 이름은 보지 않는다. */
export function topLevelTomlString(text: string, key: string) {
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("[")) break;
    const match = trimmed.match(/^([A-Za-z0-9_]+)\s*=\s*"([^"]*)"\s*(?:#.*)?$/);
    if (match?.[1] === key) return match[2];
  }
  return undefined;
}
const valid = (value: unknown, pattern: RegExp): value is string =>
  typeof value === "string" && pattern.test(value);

export async function readCliModelSettings(
  provider: "codex" | "claude",
  env: CliEnvironment,
): Promise<CliModelSettings> {
  if (provider === "claude") {
    const home =
      envValue(env, "CLAUDE_CONFIG_DIR") ?? path.join(os.homedir(), ".claude");
    const settings = parseJson(
      await readSmall(path.join(home, "settings.json")),
    ) as { model?: unknown } | undefined;
    const configured = settings?.model;
    return {
      models: [...CLAUDE_MODELS],
      ...(valid(configured, CLI_MODEL_ID) ? { defaultModel: configured } : {}),
      efforts: {},
    };
  }
  const home = envValue(env, "CODEX_HOME") ?? path.join(os.homedir(), ".codex");
  const cache = parseJson(
    await readSmall(path.join(home, "models_cache.json")),
  ) as { models?: unknown } | undefined;
  const models: string[] = [];
  const efforts: Record<string, string[]> = {};
  for (const entry of Array.isArray(cache?.models) ? cache.models : []) {
    const item = entry as {
      slug?: unknown;
      visibility?: unknown;
      supported_reasoning_levels?: unknown;
    };
    if (item.visibility !== "list" || !valid(item.slug, CLI_MODEL_ID)) continue;
    models.push(item.slug);
    efforts[item.slug] = (
      Array.isArray(item.supported_reasoning_levels)
        ? item.supported_reasoning_levels
        : []
    )
      .map((level) => (level as { effort?: unknown }).effort)
      .filter((effort): effort is string => valid(effort, EFFORT));
  }
  const config = await readSmall(path.join(home, "config.toml"));
  const model = topLevelTomlString(config, "model");
  const effort = topLevelTomlString(config, "model_reasoning_effort");
  return {
    models,
    ...(valid(model, CLI_MODEL_ID) ? { defaultModel: model } : {}),
    ...(valid(effort, EFFORT) ? { reasoningEffort: effort } : {}),
    efforts,
  };
}

/** 고른 모델 → 없으면 CLI 설정 → 없으면 인자 없음(CLI 자체 기본). 목록 밖 모델은 추론 전에 거절한다. */
export function resolveCliModel(
  settings: CliModelSettings,
  requested: string | undefined,
): { model?: string; reasoningEffort?: string } {
  if (
    requested !== undefined &&
    requested !== settings.defaultModel &&
    !settings.models.includes(requested)
  )
    throw new SubscriptionCliError(
      "invalid-model",
      "이 CLI 에서 쓸 수 없는 모델입니다. 모델 칸을 «CLI 설정»으로 두거나 목록에서 골라 주세요.",
    );
  const model = requested ?? settings.defaultModel;
  if (!model) return {};
  const effort = settings.reasoningEffort;
  return effort && settings.efforts[model]?.includes(effort)
    ? { model, reasoningEffort: effort }
    : { model };
}

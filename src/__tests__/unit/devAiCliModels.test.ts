// @vitest-environment node
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  readCliModelSettings,
  resolveCliModel,
} from "../../lib/dev-ai/cli-models";
import { DevAiRequestSchema } from "../../lib/dev-ai/tasks";

/**
 * 원장님 2026-09-18 — *「내부 요금제로 그릴때 모델 지정 가능한가? codex도 astra, sol 이런거 그리고 claude에서도
 * fable, opus, sonnet」*. 모델을 따로 안 고르면 **원장님 CLI 설정**을 따른다(같은 날 확정 — 구독 호출은
 * 사용자 설정을 끄고 돌아서 설정의 모델을 우리가 읽어 넘긴다).
 */
describe("구독 CLI 모델 — 목록·기본값은 원장님 CLI 설정에서", () => {
  let home: string;
  beforeEach(async () => {
    home = await mkdtemp(path.join(os.tmpdir(), "dev-ai-models-"));
  });
  afterEach(async () => {
    await rm(home, { recursive: true, force: true });
  });
  const codexHome = () => path.join(home, ".codex");
  const claudeHome = () => path.join(home, ".claude");
  async function writeCodex() {
    await mkdir(codexHome());
    await writeFile(
      path.join(codexHome(), "config.toml"),
      'model = "gpt-6-astra"\nmodel_reasoning_effort = "xhigh"\n\n[profiles.fast]\nmodel = "gpt-5.5"\n',
    );
    await writeFile(
      path.join(codexHome(), "models_cache.json"),
      JSON.stringify({
        models: [
          {
            slug: "gpt-6-astra",
            visibility: "list",
            supported_reasoning_levels: [
              { effort: "high" },
              { effort: "xhigh" },
            ],
          },
          { slug: "gpt-reserve", visibility: "hide" },
          {
            slug: "gpt-5.6-sol",
            visibility: "list",
            supported_reasoning_levels: [
              { effort: "low" },
              { effort: "xhigh" },
            ],
          },
          {
            slug: "gpt-5.3-codex-spark",
            visibility: "list",
            supported_reasoning_levels: [{ effort: "high" }],
          },
          { slug: "bad slug; whoami", visibility: "list" },
        ],
      }),
    );
  }
  const env = () => ({
    CODEX_HOME: codexHome(),
    CLAUDE_CONFIG_DIR: claudeHome(),
  });

  it("Codex: 목록 표시 모델만 · 기본은 config.toml 의 모델과 추론 강도", async () => {
    await writeCodex();
    const settings = await readCliModelSettings("codex", env());
    expect(settings.models).toEqual([
      "gpt-6-astra",
      "gpt-5.6-sol",
      "gpt-5.3-codex-spark",
    ]);
    expect(settings.defaultModel).toBe("gpt-6-astra");
    expect(settings.reasoningEffort).toBe("xhigh");
  });

  it("Claude: fable·opus·sonnet · 기본은 settings.json 의 모델", async () => {
    await mkdir(claudeHome());
    await writeFile(
      path.join(claudeHome(), "settings.json"),
      JSON.stringify({ model: "opus[1m]", hooks: { secret: "x" } }),
    );
    const settings = await readCliModelSettings("claude", env());
    expect(settings.models).toEqual(["fable", "opus", "sonnet"]);
    expect(settings.defaultModel).toBe("opus[1m]");
  });

  it("설정 파일이 없으면 CLI 자체 기본(모델 인자 없음)", async () => {
    const codex = await readCliModelSettings("codex", env());
    expect(codex).toEqual({ models: [], efforts: {} });
    expect(resolveCliModel(codex, undefined)).toEqual({});
    const claude = await readCliModelSettings("claude", env());
    expect(claude.defaultModel).toBeUndefined();
    expect(resolveCliModel(claude, undefined)).toEqual({});
  });

  it("고른 모델이 이긴다 · 추론 강도는 그 모델이 받을 때만 · 목록 밖 모델은 거절", async () => {
    await writeCodex();
    const settings = await readCliModelSettings("codex", env());
    expect(resolveCliModel(settings, undefined)).toEqual({
      model: "gpt-6-astra",
      reasoningEffort: "xhigh",
    });
    expect(resolveCliModel(settings, "gpt-5.6-sol")).toEqual({
      model: "gpt-5.6-sol",
      reasoningEffort: "xhigh",
    });
    // spark 는 xhigh 를 받지 않는다 — CLI 가 모델 기본 강도로 돈다
    expect(resolveCliModel(settings, "gpt-5.3-codex-spark")).toEqual({
      model: "gpt-5.3-codex-spark",
    });
    expect(() => resolveCliModel(settings, "gpt-reserve")).toThrow(
      /쓸 수 없는 모델/,
    );
  });

  it("요청의 모델 칸은 이름 형식만 받는다", () => {
    const base = {
      provider: "codex",
      action: "solution",
      content: "1+1",
      grade: "중1",
    };
    expect(
      DevAiRequestSchema.safeParse({ ...base, model: "opus[1m]" }).success,
    ).toBe(true);
    expect(
      DevAiRequestSchema.safeParse({ ...base, model: "gpt-5.6-sol" }).success,
    ).toBe(true);
    for (const model of ["", "bad model", "x;whoami", "-m", "a".repeat(80)])
      expect(DevAiRequestSchema.safeParse({ ...base, model }).success).toBe(
        false,
      );
  });
});

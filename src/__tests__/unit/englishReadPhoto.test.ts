// @vitest-environment node
/**
 * 오늘의 영어 — 사진에서 글 읽기의 뒷단 (D-158 · 25 §13.8).
 * 프롬프트(손글씨는 옮기지 않는다 · 옮긴 글만) · 받은 글 다듬기 · 읽는 모델 고르기 · 모델 호출의 꼴.
 * 🔴 실호출 금지(절대 규칙 7) — 모델 호출은 인자로 넣은 대역이 받는다.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ENGLISH_MATERIAL_CONTENT_MAX } from "@/contracts/english.contract";
import {
  ENGLISH_READ_PROMPT_VERSION,
  buildEnglishReadPrompt,
} from "@/lib/ai/prompts/englishRead";
import {
  EnglishReadConfigError,
  EnglishReadEmptyError,
  cleanEnglishReadText,
  readEnglishPhoto,
  resolveEnglishReadModel,
} from "@/lib/english/readPhoto";

describe("읽기 프롬프트", () => {
  it("판 번호가 있고, 손글씨를 옮기지 않으며 옮긴 글만 내라고 한다", () => {
    expect(ENGLISH_READ_PROMPT_VERSION).toBe("r1");
    const prompt = buildEnglishReadPrompt();
    expect(prompt).toContain("손글씨");
    expect(prompt).toContain("옮기지 않습니다");
    expect(prompt).toContain("왼쪽 단");
    expect(prompt).toContain("옮긴 글만 출력합니다");
    // 고치거나 번역하지 않는다 — 전사 도구다
    expect(prompt).toMatch(/고치거나[^.]*번역/);
  });
});

describe("받은 글 다듬기", () => {
  it("코드펜스를 걷고, 줄끝을 맞추고, 빈 줄을 하나로 접는다", () => {
    expect(
      cleanEnglishReadText(
        "```text\r\nFirst line.\r\n\r\n\r\n\r\nSecond.\r\n```",
      ),
    ).toBe("First line.\n\nSecond.");
    expect(cleanEnglishReadText("  Plain text.  \n")).toBe("Plain text.");
  });

  it("자료 지문 상한(30,000자)에서 자른다", () => {
    const long = "a".repeat(ENGLISH_MATERIAL_CONTENT_MAX + 50);
    expect(cleanEnglishReadText(long)).toHaveLength(
      ENGLISH_MATERIAL_CONTENT_MAX,
    );
  });
});

describe("읽는 모델 고르기", () => {
  it("사진을 보는 키 가운데 Gemini → OpenAI → Claude 차례로 고른다", () => {
    expect(
      resolveEnglishReadModel({ GEMINI_API_KEY: "g", OPENAI_API_KEY: "o" })
        .vendor,
    ).toBe("gemini");
    expect(resolveEnglishReadModel({ OPENAI_API_KEY: "o" }).vendor).toBe(
      "openai",
    );
    expect(resolveEnglishReadModel({ ANTHROPIC_API_KEY: "a" }).vendor).toBe(
      "anthropic",
    );
  });

  it("사진을 못 보는 DeepSeek 키뿐이면 설정 오류다", () => {
    expect(() => resolveEnglishReadModel({ DEEPSEEK_API_KEY: "d" })).toThrow(
      EnglishReadConfigError,
    );
    expect(() => resolveEnglishReadModel({})).toThrow(EnglishReadConfigError);
  });

  it("ENGLISH_READ_VENDOR 로 고르고, 낯선 값은 설정 오류다", () => {
    expect(
      resolveEnglishReadModel({
        GEMINI_API_KEY: "g",
        OPENAI_API_KEY: "o",
        ENGLISH_READ_VENDOR: "openai",
      }).vendor,
    ).toBe("openai");
    expect(() =>
      resolveEnglishReadModel({
        GEMINI_API_KEY: "g",
        ENGLISH_READ_VENDOR: "deepseek",
      }),
    ).toThrow(EnglishReadConfigError);
  });
});

describe("readEnglishPhoto", () => {
  const photo = { mimeType: "image/jpeg", bytes: new Uint8Array([1, 2, 3, 4]) };
  const signal = new AbortController().signal;

  it("사진을 data URL 로 실어 한 번 부르고, 다듬은 글을 돌려준다", async () => {
    const run = vi.fn(async () => "```\nUpcycling is fun.\n```");
    const text = await readEnglishPhoto(photo, {
      env: { GEMINI_API_KEY: "g" },
      run,
      signal,
    });
    expect(text).toBe("Upcycling is fun.");
    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0]![0]).toMatchObject({
      vendor: "gemini",
      prompt: buildEnglishReadPrompt(),
      imageDataUrl: "data:image/jpeg;base64,AQIDBA==",
      signal,
    });
  });

  it("글이 비어 있으면 «읽지 못함»이다 — 빈 지문을 만들지 않는다", async () => {
    await expect(
      readEnglishPhoto(photo, {
        env: { GEMINI_API_KEY: "g" },
        run: async () => "```\n\n```",
        signal,
      }),
    ).rejects.toBeInstanceOf(EnglishReadEmptyError);
  });

  it("키가 없으면 모델을 부르지 않는다", async () => {
    const run = vi.fn(async () => "text");
    await expect(
      readEnglishPhoto(photo, { env: {}, run, signal }),
    ).rejects.toBeInstanceOf(EnglishReadConfigError);
    expect(run).not.toHaveBeenCalled();
  });
});

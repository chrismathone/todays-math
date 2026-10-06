// @vitest-environment node
/**
 * 오늘의 영어 — 사진에서 글 읽기의 뒷단 (D-158 · 25 §13.8).
 * 프롬프트(손글씨는 옮기지 않는다 · 옮긴 글만) · 받은 글 다듬기 · 읽는 모델 고르기 · 모델 호출의 꼴 ·
 * 한 번 더 대조(읽은 글을 사진과 다시 맞춰 보는 둘째 호출 — §13.9 의 측정에서 흠이 가장 많이 줄었다).
 * 🔴 실호출 금지(절대 규칙 7) — 모델 호출은 인자로 넣은 대역이 받는다.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ENGLISH_MATERIAL_CONTENT_MAX } from "@/contracts/english.contract";
import {
  ENGLISH_READ_PROMPT_VERSION,
  buildEnglishReadPrompt,
  buildEnglishReadVerifyPrompt,
} from "@/lib/ai/prompts/englishRead";
import {
  EnglishReadConfigError,
  EnglishReadEmptyError,
  EnglishReadNotPhotoError,
  cleanEnglishReadText,
  isReadablePhoto,
  readEnglishPhoto,
  resolveEnglishReadModel,
  resolveEnglishReadVerify,
  type ReadEnglishPhotoOptions,
} from "@/lib/english/readPhoto";
import { StudioApiError } from "@/lib/studio-ai/errors";

type Run = NonNullable<ReadEnglishPhotoOptions["run"]>;
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("읽기 프롬프트", () => {
  it("판 번호가 있고, 손글씨를 옮기지 않으며 옮긴 글만 내라고 한다", () => {
    expect(ENGLISH_READ_PROMPT_VERSION).toBe("r2");
    const prompt = buildEnglishReadPrompt();
    expect(prompt).toContain("나중에 써 넣은 글씨만 뺍니다");
    expect(prompt).toContain("왼쪽 단");
    expect(prompt).toContain("옮긴 글만 출력합니다");
    // 고치거나 번역하지 않는다 — 전사 도구다
    expect(prompt).toMatch(/고치거나[^.]*번역/);
  });

  it("r2 — 재어서 나온 흠을 짚는다(동그라미 친 인쇄 글자 · 첫 글자만 인쇄된 빈칸 · 밑줄 위의 인쇄된 말)", () => {
    const prompt = buildEnglishReadPrompt();
    // r1 은 «동그라미 낙서는 옮기지 않는다»여서 동그라미 친 낱말표의 뜻 칸이 통째로 빠졌다.
    // r2 는 틀을 뒤집었다 — 인쇄된 글자는 전부 옮기고, 손으로 써 넣은 것만 뺀다
    expect(prompt).not.toContain("동그라미와 밑줄 낙서");
    expect(prompt).toContain("종이에 인쇄된 글자는 전부 옮기고");
    expect(prompt).toContain("뺄 것은 손으로 써 넣은 글씨뿐입니다");
    expect(prompt).toMatch(/동그라미[^.]*겹쳐 있어도[^.]*활자면 옮깁니다/);
    expect(prompt).toContain("낱말표는 낱말마다 뜻을 같이 옮깁니다");
    // 빈칸에 쓴 답 · 첫 글자만 인쇄된 빈칸 · 밑줄 위에 인쇄된 말
    expect(prompt).toContain("빈칸에 손으로 쓴 답이 있어도 빈칸으로 둡니다");
    expect(prompt).toContain(
      "밑줄이 시작되기 전의 인쇄된 글자는 반드시 남기고",
    );
    expect(prompt).toContain("그 낱말을 완성하지 않습니다");
    expect(prompt).toContain(
      "밑줄 위에 활자로 인쇄된 말이 있으면 빈칸이 아닙니다",
    );
    // 없는 것을 더하지 않는다
    expect(prompt).toContain("없는 기호");
    expect(prompt).toContain(
      "인쇄된 밑줄이 없는 자리에는 빈칸을 만들지 않습니다",
    );
    expect(prompt).toContain("가장자리에서 잘린 글자");
    // 반 · 번호 칸의 손글씨까지
    expect(prompt).toContain("이름 · 반 · 번호 칸에 쓴 것");
    // 규칙에 번호가 차례로 붙는다
    expect(prompt).toMatch(/\n규칙:\n1\. [^\n]+\n2\. /);
    expect(prompt).toMatch(/\n9\. 옮긴 글만 출력합니다/);
    expect(prompt).not.toMatch(/\n10\. /);
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

  it("줄 끝의 빈칸을 걷는다", () => {
    expect(cleanEnglishReadText("First line.  \t\nSecond.")).toBe(
      "First line.\nSecond.",
    );
  });

  it("여는 펜스 줄에 글이 붙어 있으면 그 글은 남긴다 — 첫 줄을 잃지 않는다", () => {
    expect(cleanEnglishReadText("```Dear Mr. Kim,\nThank you.\n```")).toBe(
      "Dear Mr. Kim,\nThank you.",
    );
    // 백틱 넷으로 감싼 글 · 닫는 펜스 뒤의 빈칸
    expect(cleanEnglishReadText("````text\nBody.\n````  ")).toBe("Body.");
  });

  it("자료 지문 상한(30,000자)에서 자른다", () => {
    const long = "a".repeat(ENGLISH_MATERIAL_CONTENT_MAX + 50);
    expect(cleanEnglishReadText(long)).toHaveLength(
      ENGLISH_MATERIAL_CONTENT_MAX,
    );
  });

  it("상한이 서로게이트 쌍 가운데에 걸리면 반쪽을 남기지 않는다", () => {
    const text = "a".repeat(ENGLISH_MATERIAL_CONTENT_MAX - 1) + "😀";
    const cut = cleanEnglishReadText(text);
    expect(cut).toHaveLength(ENGLISH_MATERIAL_CONTENT_MAX - 1);
    expect(cut.endsWith("a")).toBe(true);
  });
});

describe("읽는 모델 고르기", () => {
  it("사진을 보는 키 가운데 Gemini → OpenAI → Claude 차례로 고른다", () => {
    expect(
      resolveEnglishReadModel({ GEMINI_API_KEY: "g", OPENAI_API_KEY: "o" }),
    ).toEqual({ vendor: "gemini", model: "gemini-3.8-flash" });
    // Claude 는 읽기를 잰 모델(Opus 5.5 — 가장 덜 틀렸다)이 기본이다. 작업실의 기본(Opus 5)이 아니다
    expect(resolveEnglishReadModel({ ANTHROPIC_API_KEY: "a" })).toEqual({
      vendor: "anthropic",
      model: "claude-opus-5-5",
    });
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
    // 대소문자 · 앞뒤 빈칸은 봐준다(운영 변수는 손으로 넣는다)
    expect(
      resolveEnglishReadModel({
        ANTHROPIC_API_KEY: "a",
        ENGLISH_READ_VENDOR: " Anthropic ",
      }).vendor,
    ).toBe("anthropic");
  });

  it("고른 제공자의 키가 없으면 다른 키로 넘어가지 않고 설정 오류다", () => {
    expect(() =>
      resolveEnglishReadModel({
        GEMINI_API_KEY: "g",
        ENGLISH_READ_VENDOR: "openai",
      }),
    ).toThrow(EnglishReadConfigError);
  });

  it("모델 이름 — 읽기는 제 설정(ENGLISH_READ_MODEL)만 따른다. 작업실의 모델 설정은 읽기를 바꾸지 않는다", () => {
    expect(
      resolveEnglishReadModel({
        ANTHROPIC_API_KEY: "a",
        STUDIO_AI_ANTHROPIC_MODEL: "claude-opus-4-7",
      }).model,
    ).toBe("claude-opus-5-5");
    expect(
      resolveEnglishReadModel({
        ANTHROPIC_API_KEY: "a",
        ENGLISH_READ_MODEL: "claude-sonnet-5-5",
      }).model,
    ).toBe("claude-sonnet-5-5");
    expect(
      resolveEnglishReadModel({
        GEMINI_API_KEY: "g",
        STUDIO_AI_GEMINI_MODEL: "gemini-2.5-pro",
      }).model,
    ).toBe("gemini-3.8-flash");
    expect(
      resolveEnglishReadModel({
        ANTHROPIC_API_KEY: "a",
        ENGLISH_READ_MODEL: " claude-opus-5 ",
      }).model,
    ).toBe("claude-opus-5");
    // 목록에 없는 이름 · 다른 제공자의 이름은 설정 오류 — 틀린 이름으로 모델을 부르지 않는다
    for (const env of [
      { GEMINI_API_KEY: "g", ENGLISH_READ_MODEL: "gemini-9" },
      { GEMINI_API_KEY: "g", ENGLISH_READ_MODEL: "claude-sonnet-5-5" },
    ])
      expect(() => resolveEnglishReadModel(env)).toThrow(
        EnglishReadConfigError,
      );
  });
});

describe("사진인가 — 바이트의 머리로 본다", () => {
  it("png · jpg 의 머리 바이트만 사진이다", () => {
    expect(isReadablePhoto({ mimeType: "image/jpeg", bytes: JPEG })).toBe(true);
    expect(isReadablePhoto({ mimeType: "image/png", bytes: PNG })).toBe(true);
    // 형과 바이트가 어긋나면 아니다(png 이름의 jpg · PDF)
    expect(isReadablePhoto({ mimeType: "image/png", bytes: JPEG })).toBe(false);
    expect(
      isReadablePhoto({
        mimeType: "image/png",
        bytes: new Uint8Array([37, 80, 68, 70]),
      }),
    ).toBe(false);
    expect(isReadablePhoto({ mimeType: "image/gif", bytes: JPEG })).toBe(false);
    expect(
      isReadablePhoto({ mimeType: "image/jpeg", bytes: new Uint8Array(0) }),
    ).toBe(false);
  });
});

describe("readEnglishPhoto", () => {
  const photo = { mimeType: "image/jpeg", bytes: JPEG };
  const signal = new AbortController().signal;
  /** 한 번만 읽는 설정 — 대조는 아래 «한 번 더 대조»에서 따로 본다 */
  const ONCE = { GEMINI_API_KEY: "g", ENGLISH_READ_VERIFY: "off" };

  it("사진을 data URL 로 실어 한 번 부르고, 다듬은 글을 돌려준다", async () => {
    const run = vi.fn<Run>(async () => "```\nUpcycling is fun.\n```");
    const text = await readEnglishPhoto(photo, { env: ONCE, run, signal });
    expect(text).toBe("Upcycling is fun.");
    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0]![0]).toMatchObject({
      vendor: "gemini",
      model: "gemini-3.8-flash",
      prompt: buildEnglishReadPrompt(),
      imageDataUrl: `data:image/jpeg;base64,${Buffer.from(JPEG).toString("base64")}`,
      signal,
    });
  });

  it("바이트 배열이 큰 버퍼의 한 조각이어도 그 조각만 싣는다", async () => {
    const whole = new Uint8Array([9, 9, ...JPEG, 9]);
    const run = vi.fn<Run>(async () => "Text.");
    await readEnglishPhoto(
      { mimeType: "image/jpeg", bytes: whole.subarray(2, 2 + JPEG.length) },
      { env: ONCE, run, signal },
    );
    expect(run.mock.calls[0]![0].imageDataUrl).toBe(
      `data:image/jpeg;base64,${Buffer.from(JPEG).toString("base64")}`,
    );
  });

  it("사진이 아니면 모델을 부르지 않는다 — 사진 없이 지시문만 나가지 않게", async () => {
    const run = vi.fn<Run>(async () => "text");
    await expect(
      readEnglishPhoto(
        { mimeType: "image/png", bytes: new Uint8Array([37, 80, 68, 70]) },
        { env: { GEMINI_API_KEY: "g" }, run, signal },
      ),
    ).rejects.toBeInstanceOf(EnglishReadNotPhotoError);
    expect(run).not.toHaveBeenCalled();
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
    const run = vi.fn<Run>(async () => "text");
    await expect(
      readEnglishPhoto(photo, { env: {}, run, signal }),
    ).rejects.toBeInstanceOf(EnglishReadConfigError);
    expect(run).not.toHaveBeenCalled();
  });
});

describe("한 번 더 대조", () => {
  const photo = { mimeType: "image/jpeg", bytes: JPEG };
  const signal = new AbortController().signal;
  const env = { GEMINI_API_KEY: "g" };
  const FIRST =
    "Droughts are caused by hot weather. Trees add water to the air.";
  const FIXED =
    "Droughts are caused by h________ weather. Trees add w________ to the air.";

  it("기본은 잰 대로다 — Gemini 는 켬(흠이 절반으로 줄었다), 다른 제공자는 끔. ENGLISH_READ_VERIFY 가 있으면 그것을 따른다", () => {
    expect(resolveEnglishReadVerify({}, "gemini")).toBe(true);
    expect(resolveEnglishReadVerify({}, "anthropic")).toBe(false);
    expect(resolveEnglishReadVerify({}, "openai")).toBe(false);
    expect(
      resolveEnglishReadVerify({ ENGLISH_READ_VERIFY: "" }, "gemini"),
    ).toBe(true);
    for (const value of ["off", "0", "false", " OFF "])
      expect(
        resolveEnglishReadVerify({ ENGLISH_READ_VERIFY: value }, "gemini"),
      ).toBe(false);
    for (const value of ["on", "1", "true", " ON "])
      expect(
        resolveEnglishReadVerify({ ENGLISH_READ_VERIFY: value }, "anthropic"),
      ).toBe(true);
  });

  it("Claude 로 읽으면 한 번만 부른다 — 켜면 두 번", async () => {
    const once = vi.fn<Run>(async () => FIRST);
    await readEnglishPhoto(photo, {
      env: { ANTHROPIC_API_KEY: "a" },
      run: once,
      signal,
    });
    expect(once).toHaveBeenCalledTimes(1);
    const twice = vi.fn<Run>(async () => FIRST);
    await readEnglishPhoto(photo, {
      env: { ANTHROPIC_API_KEY: "a", ENGLISH_READ_VERIFY: "on" },
      run: twice,
      signal,
    });
    expect(twice).toHaveBeenCalledTimes(2);
  });

  it("대조 지시문은 읽기 지시문과 읽은 글을 같이 싣는다", () => {
    const prompt = buildEnglishReadVerifyPrompt("  Read text.  ");
    expect(prompt).toContain("[지시문]\n" + buildEnglishReadPrompt());
    expect(prompt.endsWith("[옮긴 글]\nRead text.")).toBe(true);
    // 고친 글만 다시 낸다 — 설명을 달면 그 설명이 지문에 섞인다
    expect(prompt).toContain("고친 글만 출력합니다");
    expect(prompt).toContain("맞게 옮긴 곳은 한 글자도 바꾸지 않습니다");
  });

  it("읽은 글을 사진과 함께 다시 보내고, 고친 글을 돌려준다", async () => {
    const run = vi
      .fn<Run>()
      .mockResolvedValueOnce(FIRST)
      .mockResolvedValueOnce(`\`\`\`\n${FIXED}\n\`\`\``);
    const text = await readEnglishPhoto(photo, { env, run, signal });
    expect(text).toBe(FIXED);
    expect(run).toHaveBeenCalledTimes(2);
    const second = run.mock.calls[1]![0];
    expect(second.prompt).toBe(buildEnglishReadVerifyPrompt(FIRST));
    // 같은 사진 · 같은 모델로
    expect(second.imageDataUrl).toBe(run.mock.calls[0]![0].imageDataUrl);
    expect(second.model).toBe(run.mock.calls[0]![0].model);
  });

  it("Claude 5.5 는 생각 강도를 낮춰 부른다 — 잰 설정 그대로. Gemini · 다른 Claude 에는 강도를 싣지 않는다", async () => {
    const effortOf = async (env: Record<string, string>) => {
      const run = vi.fn<Run>(async () => FIRST);
      await readEnglishPhoto(photo, { env, run, signal });
      return run.mock.calls[0]![0].effort;
    };
    expect(await effortOf({ ANTHROPIC_API_KEY: "a" })).toBe("low");
    expect(
      await effortOf({
        ANTHROPIC_API_KEY: "a",
        ENGLISH_READ_MODEL: "claude-sonnet-5-5",
      }),
    ).toBe("low");
    // Opus 5 는 배관이 제 강도(medium)로 부른다 · Gemini 3.8 Flash 는 배관이 LOW 로 부른다
    expect(
      await effortOf({
        ANTHROPIC_API_KEY: "a",
        ENGLISH_READ_MODEL: "claude-opus-5",
      }),
    ).toBeUndefined();
    expect(
      await effortOf({ GEMINI_API_KEY: "g", ENGLISH_READ_VERIFY: "off" }),
    ).toBeUndefined();
  });

  it("끄면 한 번만 부른다", async () => {
    const run = vi.fn<Run>(async () => FIRST);
    const text = await readEnglishPhoto(photo, {
      env: { ...env, ENGLISH_READ_VERIFY: "off" },
      run,
      signal,
    });
    expect(text).toBe(FIRST);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("대조한 글이 비었거나 터무니없이 짧으면 처음 읽은 글을 쓴다", async () => {
    for (const second of ["", "고칠 곳이 없습니다.", "Droughts are"]) {
      const run = vi
        .fn<Run>()
        .mockResolvedValueOnce(FIRST)
        .mockResolvedValueOnce(second);
      expect(await readEnglishPhoto(photo, { env, run, signal })).toBe(FIRST);
    }
  });

  it("대조가 실패해도 읽기는 성공이다 — 처음 읽은 글을 돌려준다", async () => {
    for (const error of [
      new StudioApiError("모델 API 요청에 실패했습니다.", 503, true),
      new DOMException("The operation timed out.", "TimeoutError"),
    ]) {
      const run = vi
        .fn<Run>()
        .mockResolvedValueOnce(FIRST)
        .mockRejectedValueOnce(error);
      expect(await readEnglishPhoto(photo, { env, run, signal })).toBe(FIRST);
    }
  });

  it("화면이 요청을 끊었으면 처음 읽은 글을 돌려주지 않고 그대로 던진다", async () => {
    const controller = new AbortController();
    const run = vi
      .fn<Run>()
      .mockResolvedValueOnce(FIRST)
      .mockImplementationOnce(async () => {
        controller.abort();
        throw controller.signal.reason;
      });
    await expect(
      readEnglishPhoto(photo, { env, run, signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("처음 읽은 글이 비면 대조하지 않는다", async () => {
    const run = vi.fn<Run>(async () => "  ");
    await expect(
      readEnglishPhoto(photo, { env, run, signal }),
    ).rejects.toBeInstanceOf(EnglishReadEmptyError);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("대조 호출에는 제 시간 한도가 있다 — 처음 읽기가 길었어도 요청 전체가 끝없이 늘지 않는다", async () => {
    const run = vi.fn<Run>(async () => FIRST);
    await readEnglishPhoto(photo, { env, run, signal });
    const second = run.mock.calls[1]![0].signal;
    expect(second).not.toBe(signal);
    expect(second.aborted).toBe(false);
  });
});

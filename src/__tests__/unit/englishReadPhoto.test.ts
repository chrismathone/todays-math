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
import { CLAUDE_DEFAULT_MODEL } from "@/lib/ai/claudeModels";
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
  resolveEnglishReadTwice,
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
    // 첫 줄이 낱말 하나여도 글이다 — 언어 이름으로 알고 버리지 않는다(아는 이름만 걷는다)
    expect(cleanEnglishReadText("```Vocabulary\napple 사과")).toBe(
      "Vocabulary\napple 사과",
    );
    expect(cleanEnglishReadText("```Hello\n```")).toBe("Hello");
  });

  it("닫는 펜스 뒤에 붙은 설명은 버린다", () => {
    expect(
      cleanEnglishReadText(
        "```\nBody line.\n```\n위 글은 사진의 인쇄된 글자를 옮긴 것입니다.",
      ),
    ).toBe("Body line.");
    // 여는 펜스 없이 끝에만 남은 펜스
    expect(cleanEnglishReadText("Body line.\n```")).toBe("Body line.");
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
  it("기본은 Claude Sonnet 5.5 다 — 원장님 2026-11-11 «전부 sonnet 으로». 다른 키가 있어도 그리로 가지 않는다", () => {
    expect(resolveEnglishReadModel({ ANTHROPIC_API_KEY: "a" })).toEqual({
      vendor: "anthropic",
      model: CLAUDE_DEFAULT_MODEL,
    });
    expect(CLAUDE_DEFAULT_MODEL).toBe("claude-sonnet-5-5");
    expect(
      resolveEnglishReadModel({
        GEMINI_API_KEY: "g",
        OPENAI_API_KEY: "o",
        ANTHROPIC_API_KEY: "a",
      }),
    ).toEqual({ vendor: "anthropic", model: CLAUDE_DEFAULT_MODEL });
  });

  it("Claude 키가 없으면 설정 오류다 — Gemini · OpenAI 키가 있어도 조용히 넘어가지 않는다", () => {
    for (const env of [
      { GEMINI_API_KEY: "g", OPENAI_API_KEY: "o" },
      { DEEPSEEK_API_KEY: "d" },
      {},
    ])
      expect(() => resolveEnglishReadModel(env)).toThrow(
        EnglishReadConfigError,
      );
  });

  it("되돌리는 길 — ENGLISH_READ_VENDOR=gemini 면 잰 모델(Gemini 3.8 Flash)로 읽는다", () => {
    expect(
      resolveEnglishReadModel({
        GEMINI_API_KEY: "g",
        ENGLISH_READ_VENDOR: "gemini",
      }),
    ).toEqual({ vendor: "gemini", model: "gemini-3.8-flash" });
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
    ).toBe("claude-sonnet-5-5");
    expect(
      resolveEnglishReadModel({
        ANTHROPIC_API_KEY: "a",
        ENGLISH_READ_MODEL: "claude-opus-5-5",
      }).model,
    ).toBe("claude-opus-5-5");
    expect(
      resolveEnglishReadModel({
        GEMINI_API_KEY: "g",
        ENGLISH_READ_VENDOR: "gemini",
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
      {
        GEMINI_API_KEY: "g",
        ANTHROPIC_API_KEY: "a",
        ENGLISH_READ_VENDOR: "gemini",
        ENGLISH_READ_MODEL: "claude-opus-5-5",
      },
    ])
      expect(() => resolveEnglishReadModel(env)).toThrow(
        EnglishReadConfigError,
      );
  });

  it("모델만 적으면 그 모델의 제공자로 간다 — 제공자 변수를 따로 안 넣어도 된다", () => {
    expect(
      resolveEnglishReadModel({
        GEMINI_API_KEY: "g",
        ANTHROPIC_API_KEY: "a",
        ENGLISH_READ_MODEL: "claude-opus-5-5",
      }),
    ).toEqual({ vendor: "anthropic", model: "claude-opus-5-5" });
    expect(
      resolveEnglishReadModel({
        GEMINI_API_KEY: "g",
        ANTHROPIC_API_KEY: "a",
        ENGLISH_READ_MODEL: "gemini-3.8-flash",
      }),
    ).toEqual({ vendor: "gemini", model: "gemini-3.8-flash" });
  });

  it("Claude 는 읽기를 재서 쓸 만했던 것만 고를 수 있다 — Haiku 4.5 는 열한 장을 다 틀렸다", () => {
    for (const model of ["claude-haiku-4-5", "claude-opus-4-7"])
      expect(() =>
        resolveEnglishReadModel({
          ANTHROPIC_API_KEY: "a",
          ENGLISH_READ_MODEL: model,
        }),
      ).toThrow(EnglishReadConfigError);
    for (const model of ["claude-opus-5", "claude-sonnet-4-6"])
      expect(
        resolveEnglishReadModel({
          ANTHROPIC_API_KEY: "a",
          ENGLISH_READ_MODEL: model,
        }).model,
      ).toBe(model);
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
  /** 한 번만 읽는 설정 — 대조 · 두 번 읽기는 아래에서 따로 본다 */
  const ONCE = {
    ANTHROPIC_API_KEY: "a",
    ENGLISH_READ_VERIFY: "off",
    ENGLISH_READ_TWICE: "off",
  };

  it("사진을 data URL 로 실어 한 번 부르고, 다듬은 글을 돌려준다", async () => {
    const run = vi.fn<Run>(async () => "```\nUpcycling is fun.\n```");
    const text = await readEnglishPhoto(photo, { env: ONCE, run, signal });
    expect(text).toBe("Upcycling is fun.");
    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0]![0]).toMatchObject({
      vendor: "anthropic",
      model: "claude-sonnet-5-5",
      effort: "low",
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
        env: ONCE,
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

  it("읽은 글에는 늘 추측 보정이 걸린다 — 이름 줄의 손으로 쓴 숫자", async () => {
    const run = vi.fn<Run>(
      async () => "1학년 1반 15번 이름:\n\nUpcycling is fun.",
    );
    expect(await readEnglishPhoto(photo, { env: ONCE, run, signal })).toBe(
      "1학년 반 번 이름:\n\nUpcycling is fun.",
    );
  });
});

/** 지시문으로 호출을 가른다 — 읽기(둘이 나란히 나간다)와 대조 */
const isVerify = (prompt: string) => prompt.includes("[옮긴 글]");

describe("한 번 더 대조", () => {
  const photo = { mimeType: "image/jpeg", bytes: JPEG };
  const signal = new AbortController().signal;
  /** 대조만 본다 — 두 번 읽기는 끈다(기본 모델 Sonnet 5.5) */
  const env = { ANTHROPIC_API_KEY: "a", ENGLISH_READ_TWICE: "off" };
  const FIRST =
    "Droughts are caused by hot weather. Trees add water to the air.";
  const FIXED =
    "Droughts are caused by h________ weather. Trees add w________ to the air.";

  it("기본은 켬 — 기본 모델(Sonnet 5.5)과 Gemini 는 읽는 길(대조 · 따로 읽기 · 후보정)을 그대로 탄다. 그 밖은 끔. ENGLISH_READ_VERIFY 가 있으면 그것을 따른다", () => {
    expect(resolveEnglishReadVerify({})).toBe(true);
    expect(
      resolveEnglishReadVerify({}, "anthropic", CLAUDE_DEFAULT_MODEL),
    ).toBe(true);
    expect(resolveEnglishReadVerify({}, "gemini", "gemini-3.8-flash")).toBe(
      true,
    );
    // Opus 5.5 는 한 번으로 다 맞혔다(값만 두 배) · OpenAI 는 재지 않았다
    expect(resolveEnglishReadVerify({}, "anthropic", "claude-opus-5-5")).toBe(
      false,
    );
    expect(resolveEnglishReadVerify({}, "openai", "gpt-5.5")).toBe(false);
    expect(
      resolveEnglishReadVerify({ ENGLISH_READ_VERIFY: "" }, "gemini"),
    ).toBe(true);
    for (const value of ["off", "0", "false", " OFF "])
      expect(
        resolveEnglishReadVerify({ ENGLISH_READ_VERIFY: value }, "gemini"),
      ).toBe(false);
    for (const value of ["on", "1", "true", " ON "])
      expect(
        resolveEnglishReadVerify(
          { ENGLISH_READ_VERIFY: value },
          "anthropic",
          "claude-opus-5-5",
        ),
      ).toBe(true);
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

  it("Opus 5.5 로 읽으면 한 번만 부른다 — 켜면 두 번", async () => {
    const opus = {
      ANTHROPIC_API_KEY: "a",
      ENGLISH_READ_MODEL: "claude-opus-5-5",
    };
    const once = vi.fn<Run>(async () => FIRST);
    await readEnglishPhoto(photo, { env: opus, run: once, signal });
    expect(once).toHaveBeenCalledTimes(1);
    const twice = vi.fn<Run>(async () => FIRST);
    await readEnglishPhoto(photo, {
      env: { ...opus, ENGLISH_READ_VERIFY: "on" },
      run: twice,
      signal,
    });
    expect(twice).toHaveBeenCalledTimes(2);
  });

  it("Claude 5.5 는 생각 강도를 낮춰 부른다 — 잰 설정 그대로. Gemini · 다른 Claude 에는 강도를 싣지 않는다", async () => {
    const effortOf = async (vars: Record<string, string>) => {
      const run = vi.fn<Run>(async () => FIRST);
      await readEnglishPhoto(photo, { env: vars, run, signal });
      // 대조까지 같은 강도로 부른다
      expect(new Set(run.mock.calls.map(([input]) => input.effort)).size).toBe(
        1,
      );
      return run.mock.calls[0]![0].effort;
    };
    expect(await effortOf({ ANTHROPIC_API_KEY: "a" })).toBe("low");
    expect(
      await effortOf({
        ANTHROPIC_API_KEY: "a",
        ENGLISH_READ_MODEL: "claude-opus-5-5",
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
      await effortOf({
        GEMINI_API_KEY: "g",
        ENGLISH_READ_VENDOR: "gemini",
        ENGLISH_READ_VERIFY: "off",
        ENGLISH_READ_TWICE: "off",
      }),
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

  it("대조한 글이 같은 사진의 글로 보이지 않으면 처음 읽은 글을 쓴다", async () => {
    const reject = async (first: string, second: string) => {
      const run = vi
        .fn<Run>()
        .mockResolvedValueOnce(first)
        .mockResolvedValueOnce(second);
      return readEnglishPhoto(photo, { env, run, signal });
    };
    // 비었거나 터무니없이 짧다 · «고칠 곳이 없습니다» 같은 말이다
    for (const second of ["", "고칠 곳이 없습니다.", "Droughts are"])
      expect(await reject(FIRST, second)).toBe(FIRST);
    // 처음 글이 짧아도 딴말은 받지 않는다(길이만 보면 받게 된다)
    expect(await reject("Wet floor", "고칠 곳이 없습니다.")).toBe("Wet floor");
    // 지시문을 되뱉었다
    expect(await reject(FIRST, buildEnglishReadVerifyPrompt(FIRST))).toBe(
      FIRST,
    );
    // 표지만 되뱉었다 — 길이도 낱말도 비슷해서, 표지를 보지 않으면 그 줄이 지문에 섞인다
    expect(await reject(FIRST, `[옮긴 글]\n${FIXED}`)).toBe(FIRST);
    // 전혀 다른 글 · 터무니없이 긴 글
    expect(
      await reject(
        FIRST,
        "Earth Day is a special day to emphasize the importance of nature.",
      ),
    ).toBe(FIRST);
    expect(await reject(FIRST, `${FIRST} ${"extra words ".repeat(60)}`)).toBe(
      FIRST,
    );
  });

  it("빠뜨린 줄을 채워 길어진 글 · 손글씨를 걷어 짧아진 글은 받는다", async () => {
    const accept = async (first: string, second: string) => {
      const run = vi
        .fn<Run>()
        .mockResolvedValueOnce(first)
        .mockResolvedValueOnce(second);
      return readEnglishPhoto(photo, { env, run, signal });
    };
    const table = "period\ncover\nreason\nflood";
    const filled = "period 수업 시간\ncover 다루다\nreason 이유\nflood 홍수";
    expect(await accept(table, filled)).toBe(filled);
    const leaked = `${FIRST} 가뭄은 더운 날씨 때문이다 나무는 물을 더한다`;
    expect(await accept(leaked, FIRST)).toBe(FIRST);
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

  it("대조에서 난 우리 쪽 결함(모르는 예외)은 덮지 않는다", async () => {
    const run = vi
      .fn<Run>()
      .mockResolvedValueOnce(FIRST)
      .mockRejectedValueOnce(new TypeError("boom"));
    await expect(readEnglishPhoto(photo, { env, run, signal })).rejects.toThrow(
      "boom",
    );
  });

  it("화면이 요청을 끊으면 대조 호출도 끊기고, 처음 읽은 글을 돌려주지 않는다", async () => {
    const controller = new AbortController();
    const run = vi.fn<Run>(async (input) => {
      if (!isVerify(input.prompt)) return FIRST;
      // 배관처럼 신호가 끊길 때까지 기다린다 — 대조의 신호가 화면의 신호에 이어져 있어야 끝난다
      queueMicrotask(() => controller.abort());
      return new Promise<string>((_, reject) => {
        input.signal.addEventListener("abort", () =>
          reject(input.signal.reason),
        );
      });
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

  it("대조 호출에는 제 시간 한도가 있다 — 넘기면 끊기고 처음 읽은 글을 쓴다", async () => {
    let verifySignal: AbortSignal | undefined;
    const run = vi.fn<Run>(async (input) => {
      if (!isVerify(input.prompt)) return FIRST;
      verifySignal = input.signal;
      return new Promise<string>((_, reject) => {
        input.signal.addEventListener("abort", () =>
          reject(input.signal.reason),
        );
      });
    });
    const text = await readEnglishPhoto(photo, {
      env,
      run,
      signal,
      verifyBudgetMs: 20,
    });
    expect(text).toBe(FIRST);
    expect(verifySignal?.aborted).toBe(true);
    expect(signal.aborted).toBe(false);
  });
});

describe("두 번 읽어 빈칸 맞추기", () => {
  const photo = { mimeType: "image/jpeg", bytes: JPEG };
  const signal = new AbortController().signal;
  /** 기본 설정 그대로 — Sonnet 5.5 · 대조 켬 · 따로 읽기 켬 */
  const env = { ANTHROPIC_API_KEY: "a" };
  const A = "The Earth gets hot________. When the ________ goes up.";
  const B = "The Earth gets h________. When the t________ goes up.";
  const FIXED = "The Earth gets h________. When the t________ goes up.";

  /** 읽기 호출은 차례로 A · B 를, 대조는 받은 글을 그대로 돌려준다 */
  const reader = (reads: (string | Error)[]) => {
    let at = 0;
    return vi.fn<Run>(async (input) => {
      if (isVerify(input.prompt)) return input.prompt.split("[옮긴 글]\n")[1]!;
      const next = reads[at++]!;
      if (next instanceof Error) throw next;
      return next;
    });
  };

  it("기본은 켬 — 기본 모델(Sonnet 5.5)과 Gemini. 그 밖은 끔. ENGLISH_READ_TWICE 로 켜고 끈다", () => {
    expect(resolveEnglishReadTwice({})).toBe(true);
    expect(resolveEnglishReadTwice({}, "anthropic", CLAUDE_DEFAULT_MODEL)).toBe(
      true,
    );
    expect(resolveEnglishReadTwice({}, "gemini", "gemini-3.8-flash")).toBe(
      true,
    );
    expect(resolveEnglishReadTwice({}, "anthropic", "claude-opus-5-5")).toBe(
      false,
    );
    expect(
      resolveEnglishReadTwice(
        { ENGLISH_READ_TWICE: "off" },
        "anthropic",
        CLAUDE_DEFAULT_MODEL,
      ),
    ).toBe(false);
    expect(
      resolveEnglishReadTwice(
        { ENGLISH_READ_TWICE: "on" },
        "anthropic",
        "claude-opus-5-5",
      ),
    ).toBe(true);
  });

  it("기본 모델은 같은 사진을 따로 한 번 더 읽어, 빈칸 자리를 맞춘다 — 호출 셋(읽기 둘 + 대조)", async () => {
    const run = reader([A, B]);
    expect(await readEnglishPhoto(photo, { env, run, signal })).toBe(FIXED);
    expect(run).toHaveBeenCalledTimes(3);
    const prompts = run.mock.calls.map(([input]) => input.prompt);
    expect(prompts.filter((prompt) => !isVerify(prompt))).toEqual([
      buildEnglishReadPrompt(),
      buildEnglishReadPrompt(),
    ]);
    // 대조는 처음 읽은 글로 한다(따로 읽은 글은 맞출 때만 쓴다)
    expect(prompts.find(isVerify)).toBe(buildEnglishReadVerifyPrompt(A));
  });

  it("두 읽기는 나란히 나간다 — 처음 읽기를 기다렸다 띄우지 않는다", async () => {
    let release: (text: string) => void = () => undefined;
    let reads = 0;
    const run = vi.fn<Run>(async (input) => {
      if (isVerify(input.prompt)) return input.prompt.split("[옮긴 글]\n")[1]!;
      reads++;
      if (reads === 1)
        return new Promise<string>((resolve) => {
          release = resolve;
        });
      return B;
    });
    const pending = readEnglishPhoto(photo, { env, run, signal });
    await vi.waitFor(() => expect(reads).toBe(2));
    release(A);
    expect(await pending).toBe(FIXED);
  });

  it("따로 읽기가 실패해도 읽기는 성공이다 — 맞추지 않을 뿐이다", async () => {
    for (const error of [
      new StudioApiError("모델 API 요청에 실패했습니다.", 503, true),
      new DOMException("The operation timed out.", "TimeoutError"),
    ]) {
      const run = reader([A, error]);
      expect(await readEnglishPhoto(photo, { env, run, signal })).toBe(A);
    }
    // 따로 읽은 글이 비어도 같다
    expect(
      await readEnglishPhoto(photo, { env, run: reader([A, "  "]), signal }),
    ).toBe(A);
  });

  it("따로 읽기에서 난 우리 쪽 결함은 덮지 않는다", async () => {
    await expect(
      readEnglishPhoto(photo, {
        env,
        run: reader([A, new TypeError("boom")]),
        signal,
      }),
    ).rejects.toThrow("boom");
  });

  it("처음 읽기가 실패하면 따로 읽기도 끊는다 — 받을 쪽이 없는 호출을 남기지 않는다", async () => {
    let companion: AbortSignal | undefined;
    let reads = 0;
    const run = vi.fn<Run>(async (input) => {
      reads++;
      if (reads === 1) throw new StudioApiError("모델 실패", 500, true);
      companion = input.signal;
      return new Promise<string>((_, reject) => {
        input.signal.addEventListener("abort", () =>
          reject(input.signal.reason),
        );
      });
    });
    await expect(
      readEnglishPhoto(photo, { env, run, signal }),
    ).rejects.toBeInstanceOf(StudioApiError);
    expect(companion?.aborted).toBe(true);
  });

  it("끄면 따로 읽지 않는다", async () => {
    const run = reader([A, B]);
    expect(
      await readEnglishPhoto(photo, {
        env: { ...env, ENGLISH_READ_TWICE: "off" },
        run,
        signal,
      }),
    ).toBe(A);
    expect(run).toHaveBeenCalledTimes(2);
  });
});

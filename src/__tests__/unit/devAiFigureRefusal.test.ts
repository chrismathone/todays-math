// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runSubscriptionCli } from "@/lib/dev-ai/cli";
import { redrawDevAiFigure } from "@/lib/dev-ai/figure-engine";
import {
  FIGURE_CAPABILITY_REBUTTAL,
  isEngineCapabilityRefusal,
} from "@/lib/dev-ai/figure-refusal";
import { buildFigureSpecPrompt } from "@/lib/dev-ai/figure-prompt";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import { withLabelMetrics } from "@/lib/figure/mathjaxSubstitute";
import type { DevAiRequest } from "@/lib/dev-ai/contracts";
import catalog from "../../../scripts/figure/engine-catalog.json";
import conceptMap from "../fixtures/quadrilateral-concept-map.spec.json";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dev-ai/cli", () => ({ runSubscriptionCli: vi.fn() }));
vi.mock("@/lib/dev-ai/figure-comparison", () => ({
  buildFigureComparisonImage: vi.fn(
    async () => "data:image/png;base64,Y29tcGFyaXNvbg==",
  ),
}));

const input: DevAiRequest = {
  action: "figure-redraw",
  provider: "claude",
  grade: "초5",
  imageDataUrl: "data:image/png;base64,YWJj",
  content: "사각형 관계도를 또렷하게 재작도",
};
const run = vi.mocked(runSubscriptionCli);
const pass = JSON.stringify({ passed: true, issues: [] });
/** 원장님이 2026-09-20 에 실제로 받은 사유 — 화면에 422 로 떴다. */
const 원장님_사유 =
  "graph-1 엔진에서 한글 텍스트 및 특수문자 라벨 렌더링을 지원하지 않아 원본 다이어그램을 온전히 표현할 수 없습니다.";
const refused = (note: string) => JSON.stringify({ spec: null, note });
beforeEach(() => vi.clearAllMocks());

/**
 * 🔴 **모델이 «엔진이 못 한다»고 지어내 거절한다** (원장님 2026-09-20).
 *
 * 사각형 관계도(사다리꼴 → 평행사변형 → 직사각형/마름모 → 정사각형, 화살표 곁에 ㉠~㉤)를
 * 다시 그리기 했더니 422 와 함께 위 사유가 떴다. 그런데 그 사유는 **거짓이다**:
 * 지시문이 이 그림을 예시로 적어 두었고(figure-prompt.ts), graph-1 계약도 한글을 허용하며
 * (`scripts/figure/graph_scene.py` labels), 손으로 짠 사양을 태우니 엔진이 그대로 그렸다
 * (아래 픽스처). 막은 것은 엔진이 아니라 **모델**이다.
 *
 * 그래서 이런 거절에는 **딱 한 번** 반박해 다시 묻는다. 사람이 읽는 진짜 사유
 * (사진·삽화·손그림)는 그대로 422 로 보낸다 — 되물어 봐야 토큰만 쓴다.
 */
describe("«엔진이 못 한다» 류 거절 판정", () => {
  it.each([
    원장님_사유,
    "한글 라벨 렌더링을 지원하지 않습니다.",
    "엔진이 ㉠ 같은 특수문자를 표현할 수 없습니다.",
    "제공된 계약에는 화살표를 그리는 기능이 없습니다.",
    "elem-1 스펙으로는 한국어 텍스트 상자를 나타낼 수 없습니다.",
  ])("엔진 탓을 하면 되묻는다 — %s", (note) => {
    expect(isEngineCapabilityRefusal(note)).toBe(true);
  });

  it.each([
    "지원하지 않는 삽화입니다.",
    "원본이 사진이라 기하 요소로 옮길 수 없습니다.",
    "손으로 그린 그림이라 재현할 수 없습니다.",
    "원본이 흐릿해 라벨을 판독할 수 없습니다.",
    "",
    "   ",
  ])("사람이 읽는 진짜 사유는 되묻지 않는다 — %s", (note) => {
    expect(isEngineCapabilityRefusal(note)).toBe(false);
  });

  /** 사진이라는 진짜 사유가 섞이면 엔진 탓 낱말이 있어도 되묻지 않는다 — 되물어야 결과가 같다. */
  it("진짜 사유가 섞이면 엔진 탓 낱말이 있어도 되묻지 않는다", () => {
    expect(
      isEngineCapabilityRefusal(
        "원본이 실물 사진이라 엔진이 지원하는 텍스트 라벨로 옮길 수 없습니다.",
      ),
    ).toBe(false);
  });
});

describe("거절에 한 번만 반박해 다시 묻는다", () => {
  it("되물어 사양이 오면 그림이 나온다 — 생성 호출은 두 번", async () => {
    run
      .mockResolvedValueOnce(refused(원장님_사유))
      .mockResolvedValueOnce(JSON.stringify({ spec: conceptMap }))
      .mockResolvedValueOnce(pass);
    const result = await redrawDevAiFigure(input);
    expect(result.svg).toContain(">사다리꼴<");
    expect(run).toHaveBeenCalledTimes(3);
    const [first, second] = run.mock.calls.map(([args]) => args.prompt);
    expect(first).not.toContain(FIGURE_CAPABILITY_REBUTTAL);
    expect(second).toContain(FIGURE_CAPABILITY_REBUTTAL);
    // 모델이 낸 사유는 신뢰할 수 없는 자료로 싣는다 — 그 안의 지시는 따르지 않는다.
    expect(second).toContain("<refusal-note-data>");
    expect(second).toContain("refusal-note-data는");
  });

  it("되물어도 또 거절하면 422 에 사유를 싣고 원본을 유지한다", async () => {
    run
      .mockResolvedValueOnce(refused(원장님_사유))
      .mockResolvedValueOnce(refused("한글 라벨을 렌더링할 수 없습니다."));
    const error = await redrawDevAiFigure(input).catch((e) => e);
    expect(error).toMatchObject({ name: "FigureRedrawError", status: 422 });
    expect(error.message).toContain("한글 라벨을 렌더링할 수 없습니다.");
    expect(error.message).toContain("원본은 유지됩니다.");
    // 되묻기는 한 번뿐이다 — 세 번째 생성 호출은 없다(토큰·시간 예산 그대로).
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("진짜 사유는 되묻지 않고 바로 422 로 보낸다", async () => {
    run.mockResolvedValue(refused("원본이 손그림이라 옮길 수 없습니다."));
    await expect(redrawDevAiFigure(input)).rejects.toThrow("손그림");
    expect(run).toHaveBeenCalledTimes(1);
  });

  /**
   * 되묻기는 예산을 늘리지 않는다 — 기존 세 바퀴 안에서 한 칸을 쓸 뿐이다.
   * 거절 한 번 + 엔진 거절 한 번 + 성공 = 생성 세 번이 끝이고, 엔진 사유는 그대로 실린다.
   */
  it("되묻기가 엔진 재시도의 세 바퀴 안에서 한 칸을 쓴다", async () => {
    run
      .mockResolvedValueOnce(refused(원장님_사유))
      .mockResolvedValueOnce(JSON.stringify({ spec: { version: "graph-1" } }))
      .mockResolvedValueOnce(JSON.stringify({ spec: conceptMap }))
      .mockResolvedValueOnce(pass);
    const result = await redrawDevAiFigure(input);
    expect(result.svg).toContain(">정사각형<");
    expect(run).toHaveBeenCalledTimes(4);
    const prompts = run.mock.calls.map(([args]) => args.prompt);
    expect(prompts[1]).toContain(FIGURE_CAPABILITY_REBUTTAL);
    // 반박은 다음 한 번뿐 — 엔진이 거절한 바퀴에는 엔진 사유만 실린다.
    expect(prompts[2]).not.toContain(FIGURE_CAPABILITY_REBUTTAL);
    expect(prompts[2]).toContain("<engine-error-data>");
  });
});

describe("지시문이 «네가 판단하지 마라»를 한 벌로 말한다", () => {
  const prompt = () => buildFigureSpecPrompt({} as DevAiRequest);
  const count = (text: string, part: string) => text.split(part).length - 1;

  it("엔진이 판정한다고 못 박고 한글·㉠·①을 같은 줄에서 예로 든다", () => {
    const text = prompt();
    expect(text).toMatch(/Return spec:null ONLY when/);
    const line = text.split("\n").find((l) => /never decide yourself/.test(l));
    expect(line).toBeDefined();
    expect(line).toContain("㉠");
    expect(line).toContain("①");
    // 원문자는 ㉠(U+3260 원 문자 기역)이다. ㈠(U+3220 괄호 한자 일)로 잘못 박으면
    // 모델은 딴 글자를 예로 받는다 — 2026-09-20 에 실제로 한 번 그렇게 박혔다.
    expect(text).not.toContain("㈠");
  });

  it("같은 말을 두 벌로 적지 않는다", () => {
    const text = prompt();
    expect(count(text, "Engine validation is authoritative")).toBe(1);
    expect(count(text, "Return spec:null ONLY when")).toBe(1);
    expect(count(text, "never decide yourself")).toBe(1);
  });

  it("반박 문구도 지시문 안에 한 벌만 들어간다", () => {
    const text = buildFigureSpecPrompt(
      {} as DevAiRequest,
      undefined,
      원장님_사유,
    );
    expect(count(text, FIGURE_CAPABILITY_REBUTTAL)).toBe(1);
  });
});

/**
 * 🔴 **이 그림은 실제로 그려진다.** 리드가 손으로 짠 사양을 엔진에 태워 눈으로 확인했다
 * (scratchpad/quad-map.png). 그 사양을 픽스처로 옮겼다 — 유료 호출 없이 파이썬 엔진만 돈다.
 */
describe("한글 사각형 관계도 픽스처가 엔진에서 그려진다", () => {
  it("한글 다섯 낱말과 ㉠~㉤ 이 <text> 로 나온다", async () => {
    const rendered = await renderFigureSpec(withLabelMetrics(conceptMap), {
      typeset: false,
      strict: true,
    });
    expect(rendered.ok).toBe(true);
    const svg = rendered.ok ? rendered.svg : "";
    for (const text of [
      "사다리꼴",
      "평행사변형",
      "직사각형",
      "마름모",
      "정사각형",
      "㉠",
      "㉡",
      "㉢",
      "㉣",
      "㉤",
    ])
      expect(svg).toContain(`>${text}<`);
    expect((svg.match(/<text\b/g) ?? []).length).toBe(10);
  });

  it("상자 다섯과 화살표 다섯이 그려진다", async () => {
    const rendered = await renderFigureSpec(withLabelMetrics(conceptMap), {
      typeset: false,
      strict: true,
    });
    const svg = rendered.ok ? rendered.svg : "";
    // 상자 다각형 다섯 + 화살촉 다섯
    expect((svg.match(/<polygon\b/g) ?? []).length).toBe(10);
    expect((svg.match(/<line\b/g) ?? []).length).toBe(5);
  });

  /** graph-1 계약이 한글을 «$ 없이 보통 글자»로 쓰라고 모델에게 알린다 — 배선이 한쪽만 걸리면 안 된다. */
  it("모델이 받는 계약에도 한글 라벨 규칙이 들어 있다", () => {
    expect(JSON.stringify(catalog)).toContain("Korean text cannot be typeset");
    expect(buildFigureSpecPrompt({} as DevAiRequest)).toContain(
      "Korean text cannot be typeset",
    );
  });
});

/**
 * 문장만으로는 안 통했다 — 2026-09-20 운영에서 원장님이 첫 판(한 줄 반박)으로도
 * 「한글 및 원문자(㉠~㉤) 텍스트 렌더링 미지원」 거절을 다시 받으셨다.
 * 그래서 반박에 **엔진이 실제로 그려 낸 사양 한 벌**을 같이 싣는다.
 */
describe("반박에 실린 보기 사양", () => {
  const spec = JSON.parse(
    FIGURE_CAPABILITY_REBUTTAL.slice(
      FIGURE_CAPABILITY_REBUTTAL.indexOf("{"),
      FIGURE_CAPABILITY_REBUTTAL.lastIndexOf("}") + 1,
    ),
  );

  it("graph-1 사양이고 한글과 ㉠ 이 들어 있다", () => {
    expect(spec.version).toBe("graph-1");
    expect(spec.axes).toBe(false);
    const texts = spec.labels.map((label: { text: string }) => label.text);
    expect(texts).toContain("사다리꼴");
    expect(texts).toContain("㉠");
    expect(texts.every((text: string) => !text.includes("$"))).toBe(true);
  });

  it("그 사양을 엔진이 실제로 그린다 — 한글이 글자로 나온다", async () => {
    const rendered = await renderFigureSpec(withLabelMetrics(spec), {
      typeset: false,
      strict: true,
    });
    expect(rendered.ok).toBe(true);
    const svg = rendered.ok ? rendered.svg : "";
    expect(svg).toContain("사다리꼴");
    expect(svg).toContain("㉠");
  });

  it("🔴 원장님 문항과 **다른 그림**이다 — 베껴도 답이 안 된다", () => {
    // 상자 다섯짜리 관계도를 그대로 실으면 모델이 지금 그림을 안 보고 좌표를 베낀다.
    expect(spec.polygons).toHaveLength(2);
    expect(spec.segments).toHaveLength(1);
  });

  it("좌표를 베끼지 말라는 말이 같이 실린다", () => {
    expect(FIGURE_CAPABILITY_REBUTTAL).toContain("좌표를 베끼지 말고");
  });
});

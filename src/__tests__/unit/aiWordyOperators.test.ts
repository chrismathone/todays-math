// @vitest-environment node
/**
 * 🔴→🟢 **AI 가 낸 해설도 「말 대신 기호」를 안 쓴다** — 원장님 지시 2026-08-26.
 *
 * 구현: src/lib/ai/wordyOperators.ts · generator.ts · transformer.ts
 *       · prompts/{generate,transform}.ts
 *
 * ## 왜 AI 쪽에 따로 필요했나
 *
 * 해설표기 트랙이 그 지시를 전수로 고쳤지만, 그 판정기는 **결정적 엔진만** 훑는다.
 * 원장님이 짚으신 그 행의 출처는 `ai_generated` 였고, `src/lib/ai/**` 가 다시 `\min` 을
 * 내면 막을 것이 하나도 없었다.
 *
 * ## 이 파일이 지키는 것
 *
 *   ㉠ **일부러 걸리는 입력**으로 실제로 바뀐다 — 0 은 「깨끗」과 「못 셈」을 안 가른다
 *   ㉡ 교과 기호(`\sin`·`\log`·`\lim`·`\sum`)는 **안 건드린다**
 *   ㉢ `km/\min`(분)처럼 인자 없는 것은 **안 건드린다** — 「최솟값」으로 읽으면
 *      에러 없이 그럴듯하게 틀린다
 *   ㉣ 검산(`preservesValues`)에 걸리면 **원문을 그대로 둔다**
 *   ㉤ 규칙이 두 벌이 아니다 — 판정도 바꾸기도 `scripts/qa/wordyOperator.ts` 하나가 한다
 *   ㉥ 프롬프트도 같은 말을 한다(AI 는 지시를 어기지만, 안 시키면 반드시 어긴다)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

// 문항 AI 는 Claude(Anthropic Messages API)다(원장님 2026-11-11) — `fetch` 를 갈아 끼운다.
vi.mock("server-only", () => ({}));

import { claudeText, stubClaudeFetch } from "../helpers/claudeMessagesMock";

import { generateProblems } from "@/lib/ai/generator";
import {
  buildGenerateSystemPrompt,
  GENERATE_PROMPT_VERSION,
} from "@/lib/ai/prompts/generate";
import { buildTransformSystemPrompt } from "@/lib/ai/prompts/transform";
import { transformProblem } from "@/lib/ai/transformer";
import { speakWordyOperators } from "@/lib/ai/wordyOperators";
import { hasWordyOperator } from "../../../scripts/qa/wordyOperator";

const BS = String.fromCharCode(92);
/** 시험 본문에서 역슬래시가 한 겹 더 붙는 사고를 막는다 — 이 저장소가 반복해 겪은 자리. */
const tex = (s: string) => s.split("§").join(BS);

function aiTextResponse(text: string) {
  return claudeText(text);
}

const UNIT_ID = "00000000-0000-4000-8000-0000000000aa";

beforeEach(() => {
  mockCreate.mockReset();
  vi.unstubAllEnvs();
  vi.stubEnv("ANTHROPIC_API_KEY", "test-api-key");
  vi.stubEnv("PROBLEM_AI_VENDOR", "");
  stubClaudeFetch(mockCreate);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("speakWordyOperators — 걸리는 입력에서 실제로 바뀐다", () => {
  it("원장님이 짚으신 바로 그 글을 말로 바꾼다", () => {
    const before = tex("최대공약수에서 $2$의 지수는 $§min(a,3)=2$이므로 $a=2$");
    const result = speakWordyOperators(before);
    expect(result.changed).toBeGreaterThan(0);
    expect(hasWordyOperator(result.out)).toBe(false);
    expect(result.out).toContain("최솟값");
    expect(result.refused).toBeNull();
  });

  it("KaTeX 에 없는 `\\lcm` 도 잡는다 — 그대로 두면 학생 지면에 날 문자로 나간다", () => {
    const result = speakWordyOperators(tex("$§lcm(12,18)=36$"));
    expect(result.changed).toBe(1);
    expect(result.out).toContain("최소공배수");
    expect(result.out).not.toContain(tex("§lcm"));
  });

  it("`\\mathrm{lcm}` 처럼 피해 적은 것도 잡는다", () => {
    const result = speakWordyOperators(tex("$§mathrm{lcm}(8,12)=24$"));
    expect(result.changed).toBe(1);
    expect(result.out).toContain("최소공배수");
  });

  it("교과서가 가르치는 기호는 **안 건드린다**", () => {
    // 이 시험이 없으면 목록이 넓어져도 아무도 못 본다.
    for (const src of [
      "$§sin 30°=§frac{1}{2}$",
      "$§log_{2}8=3$",
      "$§lim_{n§to§infty} a_n=0$",
      "$§sum_{k=1}^{9} a_k=12$",
    ]) {
      const result = speakWordyOperators(tex(src));
      expect(result.changed).toBe(0);
      expect(result.out).toBe(tex(src));
    }
  });

  it("`km/\\min`(분)은 **안 건드린다** — 최솟값으로 읽으면 그럴듯하게 틀린다", () => {
    const before = tex("속력이 $60§,§text{km}/§min$ 이다");
    const result = speakWordyOperators(before);
    expect(result.changed).toBe(0);
    expect(result.out).toBe(before);
    // 손대지 않았다는 사실은 **세어서** 남긴다 — 조용히 넘기지 않는다.
    expect(result.leftover).toBeGreaterThan(0);
  });

  it("숫자가 하나도 안 든 글을 만들지 않는다 — 검산이 걸리면 원문을 그대로 둔다", () => {
    // `preservesValues` 가 수·한글·`$` 의 **차례**를 견준다. 여기서는 통과가 정상이다.
    const before = tex("$§gcd(12,18)=6$ 이고 $§lcm(12,18)=36$ 이다");
    const result = speakWordyOperators(before);
    expect(result.changed).toBe(2);
    expect((result.out.match(/\d/g) ?? []).join("")).toBe(
      (before.match(/\d/g) ?? []).join(""),
    );
  });
});

describe("생성물이 그 기호를 담고 오면 **받는 쪽에서** 잡는다", () => {
  it("AI 가 지시를 어겨도 해설·발문·정답이 말로 바뀐다", async () => {
    mockCreate.mockResolvedValueOnce(
      aiTextResponse(
        JSON.stringify([
          {
            problemType: "계산",
            content: tex("$§gcd(12,18)$의 값을 구하시오."),
            answer: tex("$§gcd(12,18)=6$"),
            solution: tex("$§min(a,3)=2$이므로 $a=2$"),
          },
        ]),
      ),
    );

    const [draft] = await generateProblems({
      unitId: UNIT_ID,
      unitLabel: "중1 1. 소인수분해 최대공약수와 최소공배수",
      difficulty: "기본",
      count: 1,
    });

    expect(hasWordyOperator(draft!.content)).toBe(false);
    expect(hasWordyOperator(draft!.answer)).toBe(false);
    expect(hasWordyOperator(draft!.solution ?? "")).toBe(false);
    expect(draft!.content).toContain("최대공약수");
    expect(draft!.solution).toContain("최솟값");
  });

  it("변형 후보도 같은 규칙을 받는다", async () => {
    mockCreate.mockResolvedValueOnce(
      aiTextResponse(
        JSON.stringify([
          {
            content: tex("$§lcm(8,12)$의 값을 구하시오."),
            answer: "24",
            solution: tex("$§lcm(8,12)=24$"),
            originalAnswerRecomputed: "0.28",
          },
        ]),
      ),
    );

    const candidates = await transformProblem({
      origin: {
        id: "00000000-0000-4000-8000-0000000000bb",
        unitId: UNIT_ID,
        difficulty: "기본",
        problemType: "계산",
        content: "원본",
        answer: "0.28",
        solution: null,
      },
      count: 1,
      mode: "numbers",
      difficultyShift: "keep",
    });

    expect(hasWordyOperator(candidates[0]!.content)).toBe(false);
    expect(hasWordyOperator(candidates[0]!.solution ?? "")).toBe(false);
  });

  it("`originalAnswerRecomputed` 는 **안 건드린다** — 원본과 글자로 견주는 값이다", async () => {
    // 이 칸은 「원본 정답을 스스로 다시 계산한 값」이라, 원장님이 원본과 **눈으로**
    // 견주는 자리다. 여기를 말로 바꾸면 견줄 짝이 달라진다.
    const recomputed = tex("$§gcd(12,18)=6$");
    mockCreate.mockResolvedValueOnce(
      aiTextResponse(
        JSON.stringify([
          {
            content: "변형 발문",
            answer: "24",
            solution: null,
            originalAnswerRecomputed: recomputed,
          },
        ]),
      ),
    );

    const candidates = await transformProblem({
      origin: {
        id: "00000000-0000-4000-8000-0000000000bb",
        unitId: UNIT_ID,
        difficulty: "기본",
        problemType: "계산",
        content: "원본",
        answer: recomputed,
        solution: null,
      },
      count: 1,
      mode: "numbers",
      difficultyShift: "keep",
    });

    expect(candidates[0]!.originalAnswerRecomputed).toBe(recomputed);
  });
});

describe("프롬프트도 같은 말을 한다", () => {
  it("생성 프롬프트가 기호를 말로 쓰라고 이르고, 교과 기호는 예외로 둔다", () => {
    const system = buildGenerateSystemPrompt();
    for (const op of ["\\min", "\\max", "\\gcd", "\\lcm", "\\deg"]) {
      expect(system).toContain(op);
    }
    expect(system).toContain("최솟값");
    expect(system).toContain("최소공배수");
    // 예외를 안 적으면 AI 가 `\sin` 까지 말로 풀어 쓴다.
    expect(system).toContain("\\sin");
    expect(system).toContain("\\lim");
  });

  it("변형 프롬프트도 같은 말을 한다", () => {
    const system = buildTransformSystemPrompt();
    expect(system).toContain("\\lcm");
    expect(system).toContain("최소공배수");
  });

  it("프롬프트를 고쳤으면 버전이 올라간다", () => {
    // 버전을 안 올리면 「어느 프롬프트로 만든 문항인가」를 나중에 못 되짚는다.
    expect(GENERATE_PROMPT_VERSION).toBe("v3");
  });
});

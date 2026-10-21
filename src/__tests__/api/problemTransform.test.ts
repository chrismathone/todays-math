/**
 * 🔴 RED → 🟢 GREEN — 변형 고도화 (원장님 확정 2026-08-19).
 *
 * 변형이 **두 단계**로 갈라진다.
 *   POST /api/problems/transform        → 후보만 만든다. **DB 를 건드리지 않는다.**
 *   POST /api/problems/transform/adopt  → 미리보기에서 채택한 것만 넣는다.
 *
 * 종전에는 한 번에 생성+적재라 원장님이 결과를 보기 전에 이미 은행에 쌓였다.
 * 단위 테스트(src/__tests__/unit/aiGenerator.test.ts)가 순수 래퍼를 검증하고,
 * 이 파일은 HTTP 계층(세션·계약·영속·에러 매핑)만 본다.
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/session", () => ({
  getSessionUser: vi.fn(async () => ({
    id: "10000000-0000-4000-8000-000000000001",
    email: "teacher@todaysmath.test",
    name: "테스트 강사",
  })),
}));

const { mockTransformProblem } = vi.hoisted(() => ({
  mockTransformProblem: vi.fn(),
}));

vi.mock("@/lib/ai/transformer", () => ({
  transformProblem: mockTransformProblem,
}));

import { POST as adoptRoute } from "@/app/api/problems/transform/adopt/route";
import { GET as getProblem } from "@/app/api/problems/[id]/route";
import { deriveQuestionType } from "@/lib/ai/questionType";
import { POST as transformRoute } from "@/app/api/problems/transform/route";
import { AI_BUSY_MESSAGE, resetAiAdmission } from "@/lib/aiAdmission";
import { errorResponseSchema } from "@/contracts/common.contract";
import {
  problemTransformAdoptResponseSchema,
  problemTransformResponseSchema,
  shiftDifficulty,
} from "@/contracts/problem.contract";
import {
  AiCapacityError,
  AiConfigError,
  AiGenerationError,
} from "@/lib/ai/errors";
import {
  MOCK_PROBLEM_OTHER_USER,
  MOCK_PROBLEMS,
  NOT_FOUND_ID,
  USER_TEACHER_ID,
} from "@/mocks/data";
import { prismaTestDouble } from "@/mocks/prismaTestDouble";

function jsonRequest(url: string, body?: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** 검사를 통과한 후보 하나. 도형은 없다(그림이 필요 없는 문항의 기본값). */
function passing(content = "변형된 문제") {
  return {
    content,
    answer: "2",
    solution: null,
    verified: true,
    originalAnswerRecomputed: "원본과 같은 값",
    figureSpec: null,
    figureSvg: null,
    figureError: null,
  };
}

/** **실제로 그려지는** FigureSpec — 이걸 넣으면 라우트가 진짜 엔진을 부른다. */
const DRAWABLE_SPEC = {
  version: 2,
  points: { A: [0, 0], B: [120, 0], C: [0, 90] },
  segments: { AB: ["A", "B"], BC: ["B", "C"], CA: ["C", "A"] },
  labels: { A: "A", B: "B", C: "C" },
};

/**
 * 채택 한 건 — `originalAnswerRecomputed` 는 **원본 정답과 같아야** 서버 검사를 통과한다.
 * 검사가 브라우저에만 있으면 없는 것과 같아서, 저장 직전에 서버가 다시 댄다.
 */
function adoptItem(content: string, recomputed = MOCK_PROBLEMS[0]!.answer) {
  return {
    content,
    answer: "2",
    solution: null,
    originalAnswerRecomputed: recomputed,
  };
}

beforeEach(() => {
  mockTransformProblem.mockReset();
});

describe("shiftDifficulty — 난이도 사다리 (계약 SSOT)", () => {
  it("한 단계 올리고 내리며, 양 끝에서는 제자리다", () => {
    expect(shiftDifficulty("기본", "up")).toBe("응용");
    expect(shiftDifficulty("응용", "up")).toBe("심화하");
    // D-113(2026-08-30) — 축이 여섯이 되며 **위로 둘이 열렸다.** 변형은 AI 가 만들고
    // 산출물은 `pending` 이라(D-22), 초등 엔진이 아직 안 채운 갈래도 목표가 될 수 있다.
    // ⚠️ 여기 값을 사다리에서 만들어 쓰면 동어반복이 된다 — **글자로 못 박는다.**
    expect(shiftDifficulty("심화하", "up")).toBe("심화중");
    expect(shiftDifficulty("심화중", "up")).toBe("심화상");
    expect(shiftDifficulty("심화상", "up")).toBe("심화상"); // 상한
    expect(shiftDifficulty("심화상", "down")).toBe("심화중");
    expect(shiftDifficulty("심화중", "down")).toBe("심화하");
    expect(shiftDifficulty("심화하", "down")).toBe("응용");
    expect(shiftDifficulty("응용", "down")).toBe("기본");
    expect(shiftDifficulty("기본", "down")).toBe("연산");
    expect(shiftDifficulty("연산", "down")).toBe("연산"); // 하한 (D-106: 밑단은 연산)
    expect(shiftDifficulty("응용", "keep")).toBe("응용");
  });
});

describe("POST /api/problems/transform — 후보만 만든다", () => {
  it("원본이 있으면 200과 후보 배열을 반환하고 **DB 는 그대로**다", async () => {
    const origin = MOCK_PROBLEMS[0]!;
    mockTransformProblem.mockResolvedValueOnce([passing()]);
    const before = await prismaTestDouble.problem.count({
      where: { userId: USER_TEACHER_ID },
    });

    const res = await transformRoute(
      jsonRequest("http://localhost/api/problems/transform", {
        originProblemId: origin.id,
        count: 1,
      }),
    );

    expect(res.status).toBe(200);
    const body = problemTransformResponseSchema.parse(await res.json());
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.verified).toBe(true);
    // 이게 이 엔드포인트의 전부다 — 채택 전에는 은행에 아무것도 쌓이지 않는다.
    expect(
      await prismaTestDouble.problem.count({
        where: { userId: USER_TEACHER_ID },
      }),
    ).toBe(before);
  });

  it("검사에 떨어진 후보도 사유와 함께 돌려준다 (걸러 보내지 않는다)", async () => {
    const origin = MOCK_PROBLEMS[0]!;
    mockTransformProblem.mockResolvedValueOnce([
      passing("통과한 변형"),
      {
        ...passing("떨어진 변형"),
        answer: "9.99",
        verified: false,
        originalAnswerRecomputed: "전혀 다른 값",
      },
    ]);

    const res = await transformRoute(
      jsonRequest("http://localhost/api/problems/transform", {
        originProblemId: origin.id,
        count: 2,
      }),
    );

    const body = problemTransformResponseSchema.parse(await res.json());
    // 걸러 보내면 화면은 「2개 요청했는데 1개만 왔다」만 알고 **이유를 못 본다**.
    expect(body.data).toHaveLength(2);
    expect(body.data[1]?.verified).toBe(false);
    expect(body.data[1]?.originalAnswerRecomputed).toBe("전혀 다른 값");
  });

  it("변형 방식·난이도 조정을 그대로 변형기에 넘긴다", async () => {
    const origin = MOCK_PROBLEMS[0]!;
    mockTransformProblem.mockResolvedValueOnce([passing()]);

    await transformRoute(
      jsonRequest("http://localhost/api/problems/transform", {
        originProblemId: origin.id,
        count: 1,
        mode: "conditions",
        difficultyShift: "up",
      }),
    );

    expect(mockTransformProblem).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "conditions", difficultyShift: "up" }),
    );
  });

  it("없는 originProblemId는 NOT_FOUND(404)를 반환한다", async () => {
    const res = await transformRoute(
      jsonRequest("http://localhost/api/problems/transform", {
        originProblemId: NOT_FOUND_ID,
      }),
    );
    expect(res.status).toBe(404);
    expect(errorResponseSchema.parse(await res.json()).error.code).toBe(
      "NOT_FOUND",
    );
  });

  it("타 사용자 원본은 FORBIDDEN(403)을 반환한다", async () => {
    const res = await transformRoute(
      jsonRequest("http://localhost/api/problems/transform", {
        originProblemId: MOCK_PROBLEM_OTHER_USER.id,
      }),
    );
    expect(res.status).toBe(403);
    expect(errorResponseSchema.parse(await res.json()).error.code).toBe(
      "FORBIDDEN",
    );
  });

  it("변형 실패 응답에 내부 오류 메시지를 노출하지 않는다", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockTransformProblem.mockRejectedValueOnce(
      new AiGenerationError("upstream request id secret-123"),
    );

    const res = await transformRoute(
      jsonRequest("http://localhost/api/problems/transform", {
        originProblemId: MOCK_PROBLEMS[0]!.id,
        count: 1,
      }),
    );

    expect(res.status).toBe(502);
    const body = errorResponseSchema.parse(await res.json());
    expect(JSON.stringify(body)).not.toContain("secret-123");
    log.mockRestore();
  });

  it("길이 한도(AiCapacityError)는 **무엇을 하면 되는지** 알려 주는 사유를 돌려준다", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockTransformProblem.mockRejectedValueOnce(
      new AiCapacityError("AI 응답이 최대 길이에서 잘렸습니다."),
    );

    const res = await transformRoute(
      jsonRequest("http://localhost/api/problems/transform", {
        originProblemId: MOCK_PROBLEMS[0]!.id,
        count: 1,
      }),
    );

    // AiCapacityError 도 AiGenerationError 의 하위 타입이다 — 검사 순서가 뒤집히면
    // 여기서 일반 문구가 나오고 원인이 사라진다(AiConfigError 와 같은 함정).
    const body = errorResponseSchema.parse(await res.json());
    expect(body.error.message).toContain("길이 한도");
    expect(body.error.message).toContain("개수를 줄이");
    log.mockRestore();
  });

  it("설정 누락(AiConfigError)은 503과 **무엇이 없는지** 알려 주는 사유를 돌려준다", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockTransformProblem.mockRejectedValueOnce(
      new AiConfigError("DEEPSEEK_API_KEY가 설정되어 있지 않습니다."),
    );

    const res = await transformRoute(
      jsonRequest("http://localhost/api/problems/transform", {
        originProblemId: MOCK_PROBLEMS[0]!.id,
        count: 1,
      }),
    );

    // AiConfigError 는 AiGenerationError 의 하위 타입이라, 라우트의 검사 순서가 뒤집히면
    // 여기서 502/일반 문구가 나온다 — 2026-08-19 에 실제로 원인을 가렸던 자리다.
    expect(res.status).toBe(503);
    const body = errorResponseSchema.parse(await res.json());
    expect(body.error.message).toContain("DEEPSEEK_API_KEY");
    log.mockRestore();
  });
});

describe("그림에 기대는 원본은 변형본을 채택할 수 없다 (2026-08-19)", () => {
  /**
   * 변형은 본문 글자만 오가고 **그림은 따라가지 않는다.** 그대로 두면 「본문은 그림을
   * 가리키는데 그림이 없는」 문항이 새로 태어난다 — 이 저장소가 856건 잠근 그 부류다.
   * 실측: 출제 가능 46,681건 중 9,419건(20.2%)이 이 통로였다.
   *
   * ⚠️ mock 문항에는 그림이 **하나도 없었다.** 그래서 이 결함을 테스트 1,794건이 전부
   *    놓쳤다(적대적 리뷰 2026-08-19). 없는 축은 변이시킬 수 없다 — 축을 만들어 둔다.
   */
  async function seedFigureProblem(figureUrls: string[], content: string) {
    // 이미 시드된 **DB 행**을 그대로 펼쳐 쓴다. 계약 형태(MOCK_PROBLEMS)는 DB 행보다
    // 필드가 적어서, 손으로 나열하면 스키마가 자랄 때마다 이 헬퍼가 먼저 깨진다.
    const seed = await prismaTestDouble.problem.findUnique({
      where: { id: MOCK_PROBLEMS[0]!.id },
    });
    const rest = { ...seed! } as Record<string, unknown>;
    delete rest.id;
    delete rest.createdAt;
    delete rest.updatedAt;
    // exam-wiring: 테스트 — 픽스처다. 기출이 아니라 시드 행을 펼쳐 만든 변형 원본이다.
    return prismaTestDouble.problem.create({
      data: {
        ...(rest as Parameters<
          typeof prismaTestDouble.problem.create
        >[0]["data"]),
        userId: USER_TEACHER_ID,
        content,
        figureUrls,
      },
    });
  }

  it("원본에 그림이 붙어 있으면 후보는 주되 채택 사유를 같이 보낸다", async () => {
    const seeded = await seedFigureProblem(
      ["/figures/3391/q12.png"],
      "다음 그림과 같이 $AC=4$, $BC=8$ 인 삼각형 ABC 의 넓이는?",
    );
    mockTransformProblem.mockResolvedValueOnce([passing()]);

    const res = await transformRoute(
      jsonRequest("http://localhost/api/problems/transform", {
        originProblemId: seeded.id,
        count: 1,
      }),
    );

    const body = problemTransformResponseSchema.parse(await res.json());
    expect(body.data).toHaveLength(1); // 후보는 보여 준다
    expect(body.meta.figureRequired).toBe(true);
    // 스펙이 없으면 도형이 없고, 사유가 남는다 — 조용히 통과하지 않는다.
    expect(body.data[0]?.figureSvg).toBeNull();
    expect(body.data[0]?.figureError).toContain("도형");
  });

  it("그림 없는 평범한 원본은 막지 않는다 (반대쪽)", async () => {
    mockTransformProblem.mockResolvedValueOnce([passing()]);

    const res = await transformRoute(
      jsonRequest("http://localhost/api/problems/transform", {
        originProblemId: MOCK_PROBLEMS[0]!.id,
        count: 1,
      }),
    );

    const body = problemTransformResponseSchema.parse(await res.json());
    expect(body.meta.figureRequired).toBe(false);
  });

  it("도형 스펙을 내면 **서버가 엔진으로 그려** 후보에 실어 준다", async () => {
    const seeded = await seedFigureProblem(
      ["/figures/3391/q12.png"],
      "다음 그림과 같이 $AC=4$, $BC=8$ 인 직각삼각형 ABC 의 넓이는?",
    );
    mockTransformProblem.mockResolvedValueOnce([
      { ...passing("도형 있는 변형"), figureSpec: DRAWABLE_SPEC },
    ]);

    const res = await transformRoute(
      jsonRequest("http://localhost/api/problems/transform", {
        originProblemId: seeded.id,
        count: 1,
      }),
    );

    const body = problemTransformResponseSchema.parse(await res.json());
    expect(body.meta.figureRequired).toBe(true);
    // SVG 의 유일한 생산자는 서버다 — AI 도 화면도 마크업을 만들지 않는다.
    expect(body.data[0]?.figureSvg).toMatch(/^<svg/);
    expect(body.data[0]?.figureError).toBeNull();
  });

  it("스펙이 엔진 규칙을 어기면 사유를 남기고 도형은 비운다", async () => {
    const seeded = await seedFigureProblem(
      ["/figures/3391/q12.png"],
      "다음 그림과 같이 $AC=4$ 인 삼각형 ABC 의 넓이는?",
    );
    mockTransformProblem.mockResolvedValueOnce([
      // 허용 키 밖 — 엔진이 FigureSpecError 를 던진다. 검증은 엔진이 정본이다.
      { ...passing("스펙 틀린 변형"), figureSpec: { version: 2, 몰라: 1 } },
    ]);

    const res = await transformRoute(
      jsonRequest("http://localhost/api/problems/transform", {
        originProblemId: seeded.id,
        count: 1,
      }),
    );

    const body = problemTransformResponseSchema.parse(await res.json());
    expect(body.data[0]?.figureSvg).toBeNull();
    expect(body.data[0]?.figureError).toContain("도형");
  });

  it("본문에 없는 값을 넣은 도형은 **그리기 전에** 잡아 사유를 남긴다", async () => {
    const seeded = await seedFigureProblem(
      ["/figures/3391/q12.png"],
      "오른쪽 그림과 같이 반지름의 길이가 $9cm$ 인 원에서 색칠한 부분의 넓이를 구하시오.",
    );
    mockTransformProblem.mockResolvedValueOnce([
      {
        ...passing("반지름 $12cm$ 인 원에서 색칠한 부분의 넓이를 구하시오."),
        // 2026-08-19 실제로 AI 가 낸 모양 — 본문에 없는 각도를 넣었고 엔진은 통과시켰다.
        figureSpec: {
          ...DRAWABLE_SPEC,
          angles: { a1: { vertex: "A", points: ["B", "C"], label: "35°" } },
        },
      },
    ]);

    const res = await transformRoute(
      jsonRequest("http://localhost/api/problems/transform", {
        originProblemId: seeded.id,
        count: 1,
      }),
    );

    const body = problemTransformResponseSchema.parse(await res.json());
    expect(body.data[0]?.figureSvg).toBeNull();
    expect(body.data[0]?.figureError).toContain("35");
  });

  it("지어낸 도형으로 채택을 시도하면 **서버가** 거부한다", async () => {
    const seeded = await seedFigureProblem(
      ["/figures/3391/q12.png"],
      "오른쪽 그림과 같이 반지름의 길이가 $9cm$ 인 원에서 색칠한 부분의 넓이를 구하시오.",
    );

    const res = await adoptRoute(
      jsonRequest("http://localhost/api/problems/transform/adopt", {
        originProblemId: seeded.id,
        items: [
          {
            ...adoptItem("반지름 $12cm$ 인 원의 넓이"),
            figureSpec: {
              ...DRAWABLE_SPEC,
              angles: { a1: { vertex: "A", points: ["B", "C"], label: "35°" } },
            },
          },
        ],
      }),
    );

    expect(res.status).toBe(409);
  });

  it("도형 스펙이 있으면 채택이 되고, **서버가 다시 그려** 저장한다", async () => {
    const seeded = await seedFigureProblem(
      ["/figures/3391/q12.png"],
      "다음 그림과 같이 $AC=4$ 인 삼각형 ABC 의 넓이는?",
    );

    const res = await adoptRoute(
      jsonRequest("http://localhost/api/problems/transform/adopt", {
        originProblemId: seeded.id,
        items: [{ ...adoptItem("도형 있는 변형"), figureSpec: DRAWABLE_SPEC }],
      }),
    );

    expect(res.status).toBe(201);
    const body = problemTransformAdoptResponseSchema.parse(await res.json());
    // 화면이 보낸 것은 스펙뿐이다. 저장된 SVG 는 서버가 만든 것이어야 한다.
    expect(body.data[0]!.figureSvg).toMatch(/^<svg/);
  });

  it("도형 스펙 없이 채택을 시도하면 **서버가** 409로 거부한다", async () => {
    const seeded = await seedFigureProblem(
      ["/figures/3391/q12.png"],
      "다음 그림과 같이 $AC=4$, $BC=8$ 인 삼각형 ABC 의 넓이는?",
    );

    const res = await adoptRoute(
      jsonRequest("http://localhost/api/problems/transform/adopt", {
        originProblemId: seeded.id,
        items: [adoptItem("그림 잃은 변형")],
      }),
    );

    // 화면도 막지만, 화면만 막으면 문지기가 브라우저에 있는 것이고 그건 없는 것과 같다.
    expect(res.status).toBe(409);
    expect(errorResponseSchema.parse(await res.json()).error.code).toBe(
      "CONFLICT",
    );
  });

  it("그림이 없어도 본문이 그림을 지목하면 막는다 (이미 깨진 원본)", async () => {
    const seeded = await seedFigureProblem(
      [],
      "다음 그림과 같이 $AC=4$ 인 삼각형 ABC 의 넓이는?",
    );

    const res = await adoptRoute(
      jsonRequest("http://localhost/api/problems/transform/adopt", {
        originProblemId: seeded.id,
        items: [adoptItem("깨진 원본의 변형")],
      }),
    );
    expect(res.status).toBe(409);
  });
});

describe("POST /api/problems/transform/adopt — 채택분만 넣는다", () => {
  /**
   * 원본의 그림 자리 `[그림:n]`(D-164 ③④)이 후보에 남으면 변형본에는 그 그림이 없다 — 저장하지 않는다(2026-10-21 Codex 검토).
   * 음성 대조: 같은 요청에서 자리 표기만 빼면 저장된다(아래 «201» 시험).
   */
  it("그림 자리 표기가 남은 후보는 400 으로 거부하고 아무것도 저장하지 않는다", async () => {
    const origin = MOCK_PROBLEMS[0]!;
    const before = await prismaTestDouble.problem.count();
    const res = await adoptRoute(
      jsonRequest("http://localhost/api/problems/transform/adopt", {
        originProblemId: origin.id,
        items: [adoptItem("다음 그림을 보고 답하시오.\n[그림:1] ⑴ (　　)")],
      }),
    );
    expect(res.status).toBe(400);
    expect(JSON.stringify(await res.json())).toContain("그림 자리 표기");
    expect(await prismaTestDouble.problem.count()).toBe(before);
  });

  it("201과 함께 transformed/pending 으로 저장하고, 분류는 원본에서 물려받는다", async () => {
    const origin = MOCK_PROBLEMS[0]!;

    const res = await adoptRoute(
      jsonRequest("http://localhost/api/problems/transform/adopt", {
        originProblemId: origin.id,
        items: [adoptItem("채택된 변형")],
      }),
    );

    expect(res.status).toBe(201);
    const body = problemTransformAdoptResponseSchema.parse(await res.json());
    const saved = body.data[0]!;
    expect(saved.source).toBe("transformed");
    expect(saved.originProblemId).toBe(origin.id);
    expect(saved.reviewStatus).toBe("pending");
    expect(saved.unitId).toBe(origin.unitId);
    expect(saved.problemType).toBe(origin.problemType);
    expect(saved.difficulty).toBe(origin.difficulty);
    expect(saved.sourceReference).toMatchObject({
      problemId: origin.id,
      problemCode: origin.problemCode,
      source: origin.source,
    });
  });

  it("변형 해설의 출처를 남기고 원본 시험 소속은 복사하지 않는다", async () => {
    const origin = MOCK_PROBLEMS[0]!;
    await prismaTestDouble.problem.update({
      where: { id: origin.id },
      data: {
        source: "past_exam",
        school: "가람중",
        examId: "garam-2025-1-mid",
        questionNumber: 12,
      },
    });
    const exam = await prismaTestDouble.exam.upsert({
      where: { externalExamId: "가람중|중1|2025-1-중간" },
      update: {},
      create: {
        externalExamId: "가람중|중1|2025-1-중간",
        school: "가람중",
        level: "중",
        grade: 1,
        subject: "중1",
        subjectRaw: "수학",
        year: 2025,
        semester: 1,
        round: "중간",
        totalScore: 100,
        questionCount: 20,
        sourceFile: null,
      },
    });
    await prismaTestDouble.examQuestion.createMany({
      data: [
        {
          examId: exam.id,
          number: 12,
          score: 5,
          qtype: "단답형",
          difficultyLabel: null,
          topicRaw: null,
          unitId: origin.unitId,
          answer: origin.answer,
          hasFigure: false,
          problemId: origin.id,
        },
      ],
    });
    const response = await adoptRoute(
      jsonRequest("http://localhost/api/problems/transform/adopt", {
        originProblemId: origin.id,
        items: [
          {
            ...adoptItem("해설이 있는 새 변형"),
            solution: "계산하면 2입니다.",
          },
        ],
      }),
    );
    expect(response.status).toBe(201);
    const { data } = problemTransformAdoptResponseSchema.parse(
      await response.json(),
    );
    expect(data[0].sourceReference).toMatchObject({
      school: "가람중",
      questionNumber: 12,
      exam: {
        school: "가람중",
        year: 2025,
        semester: 1,
        round: "중간",
        number: 12,
      },
    });
    const saved = await prismaTestDouble.problem.findUnique({
      where: { id: data[0].id },
    });
    expect(saved).toMatchObject({
      solutionSource: "ai",
      school: null,
      examId: null,
      questionNumber: null,
      reviewStatus: "pending",
    });
    const fetched = await getProblem(
      new NextRequest(`http://localhost/api/problems/${data[0].id}`),
      {
        params: Promise.resolve({ id: data[0].id }),
      },
    );
    expect(fetched.status).toBe(200);
    expect((await fetched.json()).data.sourceReference).toEqual(
      data[0].sourceReference,
    );
    expect(await prismaTestDouble.examQuestion.count()).toBe(1);
  });

  /**
   * 🔴 **형식(`questionType`)을 안 적으면 화면에 `[?형식]` 이 뜬다** (원장님 지적 2026-08-26).
   *
   * `classifyFormat` 은 주관식 문항을 가를 때 ㉠ `questionType` ㉡ `familyKey` 의 엔진
   * 표지(`elem:`/`mid:`) ㉢ `problemType==='서술형'` 순으로 본다. 변형본은 트리거가
   * `familyKey` 를 `solo:` 로 채우므로 ㉡ 로 구제되지 않는다 — 그래서 ㉠ 을 여기서
   * 적어야 한다. AI 생성 경로가 정확히 이걸 빠뜨려 8건이 `[?형식]` 으로 나갔다.
   *
   * 「빠뜨림」은 오류를 안 내므로 시험이 없으면 **조용히 다시 난다.**
   */
  it("🔴 형식(questionType)을 생성 쪽과 **같은 판정기**로 적는다 — 안 적으면 [?형식] 이다", async () => {
    const origin = MOCK_PROBLEMS[0]!;

    const res = await adoptRoute(
      jsonRequest("http://localhost/api/problems/transform/adopt", {
        originProblemId: origin.id,
        items: [adoptItem("채택된 변형")],
      }),
    );

    const body = problemTransformAdoptResponseSchema.parse(await res.json());
    // ⚠️ **저장된 행**을 본다. 응답이 아니다 — 응답에 `questionType` 을 싣는 것은
    //    직렬화 쪽 일이고(별도 트랙), 여기서 주장하는 것은 「DB 에 적혔는가」다.
    //    화면 라벨(`classifyFormat`)이 읽는 것도 DB 값이다.
    const saved = await prismaTestDouble.problem.findUnique({
      where: { id: body.data[0]!.id },
    });
    // 값 자체는 판정기가 정한다 — 여기서 옮겨 적으면 규칙이 두 벌이 된다.
    expect(saved!.questionType, "형식이 비면 화면이 [?형식] 을 그린다").toBe(
      deriveQuestionType({
        content: saved!.content,
        answer: saved!.answer,
        problemType: origin.problemType,
      }),
    );
    // 그리고 **비어 있으면 안 된다** — 위 대조만 두면 판정기가 널을 내도 통과한다.
    expect(saved!.questionType).not.toBeNull();
  });

  it("난이도 조정을 서버가 원본에 적용해 저장한다 (클라이언트 값을 믿지 않는다)", async () => {
    const origin = MOCK_PROBLEMS[0]!;

    const res = await adoptRoute(
      jsonRequest("http://localhost/api/problems/transform/adopt", {
        originProblemId: origin.id,
        difficultyShift: "up",
        items: [adoptItem("한 단계 올린 변형")],
      }),
    );

    const body = problemTransformAdoptResponseSchema.parse(await res.json());
    expect(body.data[0]!.difficulty).toBe(
      shiftDifficulty(origin.difficulty, "up"),
    );
  });

  it("클라이언트가 source/originProblemId 를 보내도 계약이 거부한다 (D-51 판별자 보호)", async () => {
    const origin = MOCK_PROBLEMS[0]!;

    const res = await adoptRoute(
      jsonRequest("http://localhost/api/problems/transform/adopt", {
        originProblemId: origin.id,
        items: [
          {
            ...adoptItem("위조 시도"),
            source: "manual",
          },
        ],
      }),
    );

    // strictObject — 모르는 키가 오면 400. originProblemId 가 NULL 인지 아닌지가
    // RPM 교재본과 AI 변형본을 가르는 유일한 값이라(D-51) 클라이언트가 정할 수 없다.
    expect(res.status).toBe(400);
    expect(errorResponseSchema.parse(await res.json()).error.code).toBe(
      "VALIDATION_ERROR",
    );
  });

  it("타 사용자 원본으로는 채택할 수 없다 (403)", async () => {
    const res = await adoptRoute(
      jsonRequest("http://localhost/api/problems/transform/adopt", {
        originProblemId: MOCK_PROBLEM_OTHER_USER.id,
        items: [adoptItem("남의 원본")],
      }),
    );
    expect(res.status).toBe(403);
  });

  it("원본 재현 검사를 통과 못 한 값을 보내면 **서버가** 400으로 거부한다", async () => {
    const res = await adoptRoute(
      jsonRequest("http://localhost/api/problems/transform/adopt", {
        originProblemId: MOCK_PROBLEMS[0]!.id,
        // 원본 정답과 다른 재현값 — 미리보기에서 「폐기」로 뜬 후보를 우회 저장하려는 꼴.
        items: [adoptItem("탈락 후보 우회", "전혀 다른 값")],
      }),
    );
    expect(res.status).toBe(400);
    expect(errorResponseSchema.parse(await res.json()).error.code).toBe(
      "VALIDATION_ERROR",
    );
  });

  it("빈 채택 목록은 400 이다", async () => {
    const res = await adoptRoute(
      jsonRequest("http://localhost/api/problems/transform/adopt", {
        originProblemId: MOCK_PROBLEMS[0]!.id,
        items: [],
      }),
    );
    expect(res.status).toBe(400);
  });

  it("DB 오류 시 일부만 남기지 않는다", async () => {
    const origin = MOCK_PROBLEMS[0]!;
    const before = await prismaTestDouble.problem.count({
      where: { userId: USER_TEACHER_ID },
    });

    const createManySpy = vi
      .spyOn(prismaTestDouble.problem, "createManyAndReturn")
      .mockRejectedValueOnce(new Error("묶음 저장 실패"));

    try {
      await expect(
        adoptRoute(
          jsonRequest("http://localhost/api/problems/transform/adopt", {
            originProblemId: origin.id,
            items: [adoptItem("첫 번째"), adoptItem("두 번째")],
          }),
        ),
      ).rejects.toThrow("묶음 저장 실패");

      expect(createManySpy).toHaveBeenCalledTimes(1);
      expect(createManySpy.mock.calls[0]![0]!.data).toHaveLength(2);
      expect(
        await prismaTestDouble.problem.count({
          where: { userId: USER_TEACHER_ID },
        }),
      ).toBe(before);
    } finally {
      createManySpy.mockRestore();
    }
  });
});

describe("🔴 한 사람이 동시에 띄우는 변형은 둘까지 (2026-10-07 검수)", () => {
  const call = () =>
    transformRoute(
      jsonRequest("http://localhost/api/problems/transform", {
        originProblemId: MOCK_PROBLEMS[0]!.id,
        count: 1,
      }),
    );

  it("셋째 요청은 AI 를 부르지 않고 429 — 앞의 것이 실패로 끝나도 자리는 돌아온다", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    resetAiAdmission();
    let fail!: (error: Error) => void;
    mockTransformProblem.mockReturnValue(
      new Promise<never>((_, reject) => {
        fail = reject;
      }),
    );

    const first = call();
    const second = call();
    await vi.waitFor(() =>
      expect(mockTransformProblem).toHaveBeenCalledTimes(2),
    );

    const third = await call();
    expect(third.status).toBe(429);
    expect(errorResponseSchema.parse(await third.json()).error.message).toBe(
      AI_BUSY_MESSAGE,
    );
    expect(mockTransformProblem).toHaveBeenCalledTimes(2);

    fail(new AiGenerationError("upstream"));
    expect((await first).status).toBe(502);
    expect((await second).status).toBe(502);

    mockTransformProblem.mockRejectedValueOnce(new AiGenerationError("again"));
    expect((await call()).status).toBe(502);
    expect(mockTransformProblem).toHaveBeenCalledTimes(3);
    log.mockRestore();
  });
});

/**
 * **GET /api/problems?format=… 가 화면 라벨과 같은 행을 내는가** (원장님 지시 2026-08-26).
 *
 * 위 단위 시험(`unit/problemFormatFilter.test.ts`)은 **규칙**이 서로 맞는지를 입력 공간
 * 전수로 본다. 여기서는 **배선**을 본다 — 라우트가 후보 집합을 긁고, 본문을 읽어 확정하고,
 * 어긋난 행을 빼는 세 걸음이 실제로 도는가.
 *
 * ## 「무엇이 참인가」를 라우트 밖에서 가져온다
 *
 * 기대값을 손으로 적지 않는다. **필터를 안 건 조회**로 전량을 받아 화면과 **똑같은
 * `classifyFormat`** 을 돌려 기대 집합을 만들고, 그것을 필터 결과와 맞댄다. 라벨이 바뀌면
 * 기대값도 같이 바뀌므로 「필터가 라벨을 따라가나」만 재게 된다.
 *
 * ## 뺄 행이 실제로 있어야 한다
 *
 * 이 대역의 픽스처에는 `questionType` 이 하나도 없어 **단답형이 0건**이고, **후보 집합에는
 * 들지만 라벨은 다른** 행도 없다. 그러면 「어긋난 행을 뺀다」는 걸음이 **한 번도 안 돌고**
 * 그 배선을 통째로 지워도 초록이다(2026-08-18 「지워도 초록이었다」). 그래서 네 행을 직접
 * 심는다 — 형식마다 «걸려야 하는 것» 하나와 «후보엔 들지만 빠져야 하는 것» 하나씩.
 *
 * ## 이 시험이 못 보는 것
 *
 * 엔진 문항(`familyKey` 가 `elem:`/`mid:`)이 여는 갈래는 여기서 못 심는다 — 이 대역의
 * `problem.create` 가 `familyKey` 를 **무조건 null 로** 덮는다. 그 갈래는 위 단위 시험이
 * 전수로, 그리고 `scripts/qa/probe-format-filter.ts` 가 실데이터로 본다.
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

import { GET as listProblems } from "@/app/api/problems/route";
import { errorResponseSchema } from "@/contracts/common.contract";
import {
  problemListResponseSchema,
  type ProblemEntity,
} from "@/contracts/problem.contract";
import { db } from "@/lib/db";
import {
  classifyFormat,
  FILTERABLE_FORMATS,
  formatSuperset,
  type FilterableFormat,
} from "@/lib/problem/provenance";
import { MOCK_UNITS, USER_TEACHER_ID } from "@/mocks/data";

/** 보기가 다섯 있는 본문 — 정답이 원문자면 `classifyFormat` 이 객관식으로 읽는다. */
const FIVE_CHOICES = "다음 중 옳은 것은?\n① 가\n② 나\n③ 다\n④ 라\n⑤ 마";

/** 심은 행의 id — 각 시험이 자기 몫을 다시 심는다(대역이 시험마다 초기화된다). */
const planted: Record<string, string> = {};

async function plant(
  key: string,
  data: {
    questionType: string | null;
    problemType: string;
    content: string;
    answer: string;
  },
) {
  // exam-wiring: 테스트 — 시험 대역(prismaTestDouble)에 픽스처를 심는다. 실 DB 가 아니고
  //   원본 시험지(examId·sourceFile)도 없다. `source: "past_exam"` 은 형식 판정과 무관한
  //   자리채움이다 — 판정이 보는 것은 questionType·problemType·content·answer 넷뿐이다.
  const row = await db.problem.create({
    data: {
      userId: USER_TEACHER_ID,
      unitId: MOCK_UNITS[0]!.id,
      source: "past_exam",
      difficulty: "기본",
      solution: null,
      reviewStatus: "approved",
      directUseAllowed: true,
      score: null,
      ...data,
    },
  });
  planted[key] = row.id;
  return row.id;
}

beforeEach(async () => {
  // 걸려야 하는 것 — 라벨이 그 형식인 행.
  await plant("단답형", {
    questionType: "단답형",
    problemType: "계산",
    content: "$3+4$ 를 계산하시오.",
    answer: "7",
  });
  await plant("서술형", {
    questionType: "서술형",
    problemType: "서술형",
    content: "풀이 과정을 쓰시오.",
    answer: "$x=2$",
  });
  // 빠져야 하는 것 — 후보 집합에는 들지만 본문을 읽어 보면 라벨이 [객] 인 행.
  await plant("단답형후보-객관식", {
    questionType: "단답형",
    problemType: "계산",
    content: FIVE_CHOICES,
    answer: "③",
  });
  await plant("서술형후보-객관식", {
    // `questionType` 이 없고 `problemType` 이 서술형이라 서술형 후보에 든다.
    questionType: null,
    problemType: "서술형",
    content: FIVE_CHOICES,
    answer: "①",
  });
});

function get(url: string) {
  return listProblems(new NextRequest(url, { method: "GET" }));
}

async function listAll(): Promise<ProblemEntity[]> {
  const res = await get("http://localhost/api/problems?pageSize=100");
  expect(res.status).toBe(200);
  return problemListResponseSchema.parse(await res.json()).data;
}

async function listWithFormat(format: string) {
  const res = await get(
    `http://localhost/api/problems?pageSize=100&format=${format}`,
  );
  expect(res.status).toBe(200);
  return problemListResponseSchema.parse(await res.json());
}

describe("[형식 필터] GET /api/problems?format", () => {
  it.each([
    ["short_answer", "단답형후보-객관식"],
    ["descriptive", "서술형후보-객관식"],
  ] as const)(
    "%s — 심은 «빠져야 하는 행»이 정말 후보 집합 안이고 라벨은 다르다 (표본이 경계를 가른다)",
    async (format, key) => {
      // 이 확인이 없으면 아래 「빼는 걸음」 시험이 아무것도 안 재는 시험이 된다.
      const row = (await listAll()).find((p) => p.id === planted[key]);
      expect(row, "심은 행이 목록에 있어야 한다").toBeDefined();
      expect(formatSuperset(row!, format as FilterableFormat)).toBe(true);
      expect(classifyFormat(row!)).toBe("multiple_choice");
    },
  );

  it.each(FILTERABLE_FORMATS)(
    "format=%s 결과가 화면 라벨과 **정확히** 같은 집합이다",
    async (format) => {
      const all = await listAll();
      const expected = all
        .filter((p) => classifyFormat(p) === format)
        .map((p) => p.id)
        .sort();
      const body = await listWithFormat(format);
      expect(body.data.map((p) => p.id).sort()).toEqual(expected);
      // 페이지 나눔이 쓰는 총계도 같은 규칙이어야 한다 — 여기가 갈리면 마지막 장이 빈다.
      expect(body.meta.total).toBe(expected.length);
    },
  );

  it.each([
    ["short_answer", "단답형", "단답형후보-객관식"],
    ["descriptive", "서술형", "서술형후보-객관식"],
  ] as const)(
    "%s — 어긋난 행은 **빼고** 맞는 행은 남긴다",
    async (format, keepKey, dropKey) => {
      const ids = (await listWithFormat(format)).data.map((p) => p.id);
      expect(ids, "라벨이 맞는 행").toContain(planted[keepKey]);
      expect(ids, "후보엔 들지만 라벨이 다른 행").not.toContain(
        planted[dropKey],
      );
      // 그리고 뺀 행은 필터를 풀면 그대로 보인다 — 「목록에서 사라진 것」이 아니다.
      expect((await listAll()).map((p) => p.id)).toContain(planted[dropKey]);
    },
  );

  it("각 형식이 한 건 이상 나온다 — 「전부 0건」으로는 위 시험이 아무것도 못 잰다", async () => {
    for (const format of FILTERABLE_FORMATS) {
      const body = await listWithFormat(format);
      expect(body.meta.total, `${format} 건수`).toBeGreaterThan(0);
    }
  });

  it("다른 필터와 **겹쳐** 걸린다 — 형식만 남고 나머지가 풀리지 않는다", async () => {
    const all = await listAll();
    const expected = all
      .filter(
        (p) => classifyFormat(p) === "descriptive" && p.problemType === "활용",
      )
      .map((p) => p.id)
      .sort();
    const res = await get(
      "http://localhost/api/problems?pageSize=100&format=descriptive&problemType=활용",
    );
    expect(res.status).toBe(200);
    const body = problemListResponseSchema.parse(await res.json());
    expect(body.data.map((p) => p.id).sort()).toEqual(expected);
    // 음성 대조: 유형을 안 걸었을 때보다 적어야 «겹쳐 걸렸다»가 사실이다.
    const wide = await listWithFormat("descriptive");
    expect(body.meta.total).toBeLessThan(wide.meta.total);
  });

  it("서버가 정확히 못 내는 갈래는 **400** 이다 — 조용히 0건이 되지 않는다", async () => {
    for (const kind of ["multiple_choice", "unknown", "서술형"]) {
      const res = await get(
        `http://localhost/api/problems?pageSize=100&format=${kind}`,
      );
      expect(res.status, kind).toBe(400);
      errorResponseSchema.parse(await res.json());
    }
  });

  it("응답이 형식 판정의 **증거를 다 싣는다** — 화면이 서버와 같은 답을 낸다", async () => {
    // 🔴 `serializeProblem` 이 `questionType` 을 안 실어 보내고 있었다(2026-08-26).
    //    계약은 그 필드를 갖고 있어 **에러가 안 났고**, 화면만 조용히 다른 라벨을 그렸다.
    //    그래서 「필드가 있나」가 아니라 **「같은 판정이 나오나」**로 못 박는다 — 증거가
    //    하나 더 늘어도 이 시험이 잡는다.
    const rows = await db.problem.findMany({ where: {} });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const drifted: string[] = [];
    for (const sent of await listAll()) {
      const row = byId.get(sent.id)!;
      if (classifyFormat(sent) !== classifyFormat(row)) {
        drifted.push(
          `${sent.problemCode}: 화면 ${classifyFormat(sent)} ≠ 서버 ${classifyFormat(row)}`,
        );
      }
    }
    expect(drifted).toEqual([]);
    // 음성 대조 — 증거를 빼면 정말로 갈리는 행이 이 표본에 있다(없으면 위가 공허하다).
    const blinded = (await listAll()).filter(
      (sent) =>
        classifyFormat({ ...sent, questionType: undefined }) !==
        classifyFormat(sent),
    );
    expect(blinded.length).toBeGreaterThan(0);
  });

  it("형식 판정 후에도 페이지가 겹치거나 두 번 건너뛰지 않는다", async () => {
    const all = await listWithFormat("descriptive");
    expect(all.data.length).toBeGreaterThan(1);
    const response = await get(
      "http://localhost/api/problems?format=descriptive&page=2&pageSize=1",
    );
    const page = problemListResponseSchema.parse(await response.json());
    expect(page.data.map((row) => row.id)).toEqual([all.data[1].id]);
    expect(page.meta.total).toBe(all.meta.total);
  });
  it("형식을 안 걸면 아무것도 안 거른다", async () => {
    const all = await listAll();
    const res = await get("http://localhost/api/problems?pageSize=100");
    const body = problemListResponseSchema.parse(await res.json());
    expect(body.meta.total).toBe(all.length);
  });
});

/**
 * 강의 등록 계획기 (D-123 ⑥′) — 수맥 `register-lectures.mts` 의 판단을 순수 함수로 뺀 것.
 *
 * 수맥 CLI 는 판단과 DB 쓰기가 한 파일에 섞여 있어 **시험이 없었다.** 여기서는 판단만
 * 떼어 시험하고, CLI(`scripts/concept/register-lectures.ts`)는 파일을 읽고 계획을 찍고
 * `--apply` 일 때만 초안을 쓰는 얇은 껍데기로 둔다.
 *
 * 수맥에서 **그대로** 가져온 것: 게시는 사람 버튼(초안까지만) · 같은 잡 ID·같은 영상 주소는
 * 건너뛴다 · 붙일 자리를 지어내지 않는다 · `--unit`·`--sort` 는 대상이 하나일 때만.
 * **바뀐** 것: 붙일 자리가 개념이 아니라 **차시**(`unitCode`) · 주소 없는 초안을 **만든다**
 * (수맥은 건너뛰었다) · 그래서 잡 ID 도 주소도 없으면 멱등 열쇠가 없어 **거절**한다.
 */
import { describe, expect, it } from "vitest";

import {
  planRegistration,
  summarizePlan,
  type ExistingLecture,
  type MetaSource,
  type PlanStep,
  type RegisterPlanInput,
} from "@/lib/concept/registerPlan";

const UNITS: ReadonlyMap<string, string> = new Map([
  ["J10101", "중1 · 1. 소인수분해 · 소수와 합성수"],
  ["J10102", "중1 · 1. 소인수분해 · 거듭제곱"],
]);

const meta = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    jobId: "job-a",
    lessonTitle: "소수와 합성수",
    disclosure: "선생님이 검수한 AI 보충 강의입니다.",
    fps: 30,
    totalFrames: 4166,
    unitCode: "J10101",
    ...extra,
  });

const src = (
  raw: string | null,
  source = "prime/output/meta.json",
): MetaSource => ({
  source,
  raw,
});

const existing = (extra: Partial<ExistingLecture> = {}): ExistingLecture => ({
  id: "0a8c2e1b-7a9d-4b5e-8f10-2b3c4d5e6f70",
  title: "소수와 합성수",
  status: "draft",
  sourceJobId: null,
  videoUrl: null,
  ...extra,
});

function plan(sources: MetaSource[], extra: Partial<RegisterPlanInput> = {}) {
  const r = planRegistration({ sources, units: UNITS, existing: [], ...extra });
  if (!r.ok) throw new Error(`계획 전체가 거절됐다: ${r.message}`);
  return r.steps;
}

const only = (steps: PlanStep[]) => {
  expect(steps).toHaveLength(1);
  return steps[0]!;
};

describe("등록 계획 — 만드는 것", () => {
  it("meta.json 한 편 → 초안 하나", () => {
    const step = only(plan([src(meta())]));
    expect(step).toEqual({
      kind: "create",
      source: "prime/output/meta.json",
      unitCode: "J10101",
      unitLabel: "중1 · 1. 소인수분해 · 소수와 합성수",
      draft: {
        title: "소수와 합성수",
        videoUrl: null,
        seconds: 139, // 4166 / 30 = 138.9
        disclosure: "선생님이 검수한 AI 보충 강의입니다.",
        sourceJobId: "job-a",
        sortOrder: 0,
      },
    });
  });

  it("🔴 만드는 것은 언제나 초안이다 — 계획에 상태 칸이 없고, 게시로 가는 길이 없다", () => {
    const step = only(plan([src(meta({ status: "published" }))]));
    expect(step.kind).toBe("create");
    if (step.kind !== "create") return;
    expect("status" in step.draft).toBe(false);
    expect(JSON.stringify(step)).not.toContain("published");
  });

  it("주소 없는 초안을 만든다 — 수맥은 건너뛰었지만 우리는 호스팅이 미정이다", () => {
    const step = only(plan([src(meta())]));
    expect(step.kind === "create" && step.draft.videoUrl).toBeNull();
  });

  it("video_url 이 있으면 정규형으로 싣는다", () => {
    const step = only(
      plan([src(meta({ video_url: "https://youtu.be/aQkPcPqTq4M" }))]),
    );
    expect(step.kind === "create" && step.draft.videoUrl).toBe(
      "https://www.youtube.com/watch?v=aQkPcPqTq4M",
    );
  });

  it("순서는 --sort > meta.json sortOrder > 0", () => {
    const fromMeta = only(plan([src(meta({ sortOrder: 3 }))]));
    expect(fromMeta.kind === "create" && fromMeta.draft.sortOrder).toBe(3);
    const fromFlag = only(
      plan([src(meta({ sortOrder: 3 }))], { sortOverride: 7 }),
    );
    expect(fromFlag.kind === "create" && fromFlag.draft.sortOrder).toBe(7);
  });
});

describe("등록 계획 — 두 번 만들지 않는다", () => {
  it("🔴 같은 잡 ID 가 이미 있으면 건너뛴다", () => {
    // 기존 행은 주소가 없다 — 주소로도 걸리면 잡 ID 가드를 꺼도 초록이 된다(변이 ④).
    const step = only(
      plan([src(meta({ video_url: "https://youtu.be/aQkPcPqTq4M" }))], {
        existing: [existing({ sourceJobId: "job-a", videoUrl: null })],
      }),
    );
    expect(step.kind).toBe("skip");
    if (step.kind === "skip") expect(step.reason).toContain("같은 잡 ID");
  });

  it("🔴 한 회차 안에서 같은 잡 ID 가 둘이면 둘째를 건너뛴다", () => {
    // 수맥은 한 건씩 넣고 다음 건에서 DB 를 다시 봐서 자연히 막혔다. 계획기는 쓰기 전에
    // 전부 정하므로 **회차 안의 중복**을 따로 봐야 한다 — 안 보면 `--apply` 에서 둘째가
    // unique 에 부딪쳐 트랜잭션째 실패한다.
    const steps = plan([
      src(meta(), "a/output/meta.json"),
      src(
        meta({ lessonTitle: "다시 렌더한 판" }),
        "a-rerender/output/meta.json",
      ),
    ]);
    expect(steps.map((s) => s.kind)).toEqual(["create", "skip"]);
    const second = steps[1]!;
    if (second.kind === "skip") expect(second.reason).toContain("같은 잡 ID");
  });

  it("같은 영상 주소가 이미 있으면 잡 ID 가 달라도 건너뛴다", () => {
    const step = only(
      plan(
        [
          src(
            meta({ jobId: "job-b", video_url: "https://youtu.be/aQkPcPqTq4M" }),
          ),
        ],
        {
          existing: [
            existing({
              sourceJobId: "job-a",
              videoUrl: "https://www.youtube.com/watch?v=aQkPcPqTq4M",
            }),
          ],
        },
      ),
    );
    expect(step.kind).toBe("skip");
    if (step.kind === "skip") expect(step.reason).toContain("같은 영상 주소");
  });

  it("잡 ID 도 주소도 없으면 멱등 열쇠가 없어 거절한다", () => {
    const step = only(plan([src(meta({ jobId: undefined }))]));
    expect(step.kind).toBe("fail");
    if (step.kind === "fail") expect(step.reason).toContain("두 번");
  });
});

describe("등록 계획 — 차시를 지어내지 않는다", () => {
  it("🔴 unitCode 가 없으면 실패하고 --unit 을 달라고 한다 — conceptSlug 로 짐작하지 않는다", () => {
    const step = only(
      plan([
        src(meta({ unitCode: undefined, conceptSlug: "m1-prime-composite" })),
      ]),
    );
    expect(step.kind).toBe("fail");
    if (step.kind === "fail") expect(step.reason).toContain("--unit");
  });

  it("--unit 이 meta.json 의 unitCode 를 이긴다 (대상이 하나일 때)", () => {
    const step = only(plan([src(meta())], { unitOverride: "J10102" }));
    expect(step.kind === "create" && step.unitCode).toBe("J10102");
  });

  it("없는 차시 코드면 실패한다", () => {
    const step = only(plan([src(meta({ unitCode: "J39999" }))]));
    expect(step.kind).toBe("fail");
    if (step.kind === "fail") expect(step.reason).toContain("J39999");
  });

  it("--unit·--sort 는 대상이 하나일 때만 — 여러 편에 같은 차시를 통째로 붙이는 사고를 막는다", () => {
    const two = [src(meta(), "a"), src(meta({ jobId: "job-b" }), "b")];
    for (const extra of [{ unitOverride: "J10101" }, { sortOverride: 1 }]) {
      const r = planRegistration({
        sources: two,
        units: UNITS,
        existing: [],
        ...extra,
      });
      expect(r.ok, JSON.stringify(extra)).toBe(false);
    }
  });

  it("--unit 형식이 틀리면 계획 전체를 거절한다", () => {
    const r = planRegistration({
      sources: [src(meta())],
      units: UNITS,
      existing: [],
      unitOverride: "m1-prime",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("--unit");
  });

  it("--sort 가 0~999 정수가 아니면 계획 전체를 거절한다", () => {
    for (const bad of [Number.NaN, -1, 1000, 2.5]) {
      const r = planRegistration({
        sources: [src(meta())],
        units: UNITS,
        existing: [],
        sortOverride: bad,
      });
      expect(r.ok, String(bad)).toBe(false);
    }
  });
});

describe("등록 계획 — 실패는 이유를 말한다", () => {
  it("meta.json 해석 실패는 해석기의 이유를 그대로 싣는다", () => {
    const step = only(
      plan([src(meta({ video_url: "https://vimeo.com/12345" }))]),
    );
    expect(step.kind).toBe("fail");
    if (step.kind === "fail") expect(step.reason).toContain("video_url");
  });

  it("파일을 못 읽었으면 실패", () => {
    const step = only(plan([src(null)]));
    expect(step.kind).toBe("fail");
    if (step.kind === "fail") expect(step.reason).toContain("읽을 수 없습니다");
  });

  it("입력 한계를 넘으면 실패 — 계약과 같은 수로 막는다", () => {
    const step = only(plan([src(meta({ lessonTitle: "가".repeat(201) }))]));
    expect(step.kind).toBe("fail");
    if (step.kind === "fail") expect(step.reason).toContain("title");
  });

  it("대상이 없으면 계획 전체를 거절한다", () => {
    expect(
      planRegistration({ sources: [], units: UNITS, existing: [] }).ok,
    ).toBe(false);
  });

  it("합계를 센다", () => {
    const steps = plan([
      src(meta(), "a"),
      src(meta(), "a-again"),
      src(null, "broken"),
    ]);
    expect(summarizePlan(steps)).toEqual({ create: 1, skip: 1, fail: 1 });
  });
});

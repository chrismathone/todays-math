import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { devPageVisible } from "@/lib/devPageAccess";

import { UiWireClient } from "./UiWireClient";

/**
 * 2026-09-07 디자인 리뷰 **UI-01 · UI-04 · UI-05 · UI-06** 와이어 시안 (D-07 1단계).
 *
 * 절대 규칙 1 — 형태를 정하는 것은 원장님 확정 없이 구현하지 않는다. 여기서는
 * **Wire 4안씩**만 낸다. 고르신 뒤에 Hi-fi 4안으로 간다.
 *
 * ## 🔴 실데이터로 세운다
 *
 * 2026-08-19 에 확인테스트 범위 시안을 **중2 17개짜리 픽스처**로 만들었다. 그 데이터에서는
 * 학년 열이 1행이라 높이 문제가 **구조적으로 안 보였고**, 실제 시드(735개)를 물리자
 * 폼이 통째로 화면 밖으로 밀렸다 — 원장님이 스크린샷으로 잡아 주셨다.
 * **시안은 모양을 보여 주는 물건인데, 모양을 정하는 것은 데이터의 크기다.**
 *
 * 그래서 여기서는 진짜를 읽는다:
 *   · 반 이름 — **가장 긴 것**이 헤더·머리말·표에서 어디까지 미는지
 *   · 시험 한 건 — 반·유형·시행일·문항 수·상태가 실제로 어떤 길이인지
 *   · 소단원 이름 — 확인테스트 범위 줄이 실제로 얼마나 긴지
 *   · 난이도 갈래 — `DIFFICULTY_LADDER` 정본(6칸이 아니라 **네 갈래 + 심화 3단**)
 *
 * ⚠️ 읽기만 한다. 아무것도 안 바꾼다.
 */
export const dynamic = "force-dynamic";

export default async function UiWirePage() {
  // 프록시가 `/dev/` 를 공개로 둔다 — production 에서는 **로그인한 원장에게만** 연다
  // (`src/lib/devPageAccess.ts`). 로그인 없는 요청은 DB 를 읽기 전에 여기서 끝난다.
  // 🔴 이 화면은 반 · 시험지를 **지점 구분 없이** 읽는다 — 가드를 걷으면 운영 데이터가 그대로 나간다.
  if (!(await devPageVisible({ directorOnly: true }))) notFound();

  const [classes, tests, units, allUnits] = await Promise.all([
    db.class.findMany({
      select: { id: true, name: true, grade: true },
      orderBy: { name: "asc" },
      take: 40,
    }),
    db.test.findMany({
      select: {
        id: true,
        testType: true,
        status: true,
        testDate: true,
        class: { select: { name: true } },
        _count: { select: { testProblems: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    db.unit.findMany({
      select: { id: true, grade: true, chapter: true, section: true },
      orderBy: { section: "asc" },
      take: 6,
    }),
    /**
     * 가장 긴 소단원 이름 — 범위 줄이 어디까지 미는지는 **가장 긴 것**이 정한다.
     * SQL 로 뽑지 않는다: 표·컬럼 이름을 손으로 적으면 매핑이 바뀐 날 조용히 죽는다.
     * 735행이라 전부 읽어 자바스크립트로 고르는 편이 싸고 안 깨진다.
     */
    db.unit.findMany({ select: { grade: true, chapter: true, section: true } }),
  ]);

  const longestUnit =
    allUnits.reduce<(typeof allUnits)[number] | null>(
      (a, b) =>
        !a ||
        b.grade.length + b.chapter.length + b.section.length >
          a.grade.length + a.chapter.length + a.section.length
          ? b
          : a,
      null,
    ) ?? null;

  return (
    <UiWireClient
      classes={classes}
      tests={tests.map((t) => ({
        id: t.id,
        testType: t.testType,
        status: t.status,
        testDate: t.testDate.toISOString().slice(0, 10),
        className: t.class.name,
        problemCount: t._count.testProblems,
      }))}
      units={units}
      unitCount={allUnits.length}
      longestUnit={longestUnit}
    />
  );
}

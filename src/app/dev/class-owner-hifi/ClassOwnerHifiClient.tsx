"use client";

/**
 * 개발용 확인 페이지의 몸 — Hi-fi 3 탭의 틀(반 표 · 반 고르기 · 반별 표 · 개념 판)과 같은 차례로 **실제 컴포넌트**를
 * 늘어놓는다. 시안에 없던 자리(카드 · 끝난 반 · 진도 입력 · 학생 칸 머리 · 작업실 개요 · 검토 머리)는 그 아래.
 *
 * 가로채기는 **첫 렌더 안에서** 건다 — 자식의 effect 가 부모의 effect 보다 먼저 돌아 첫 요청이 새어 나간다
 * (`dev/concept-hifi` 와 같은 까닭). 쓰기 요청은 409 로 거절한다.
 */
import { useState, type ReactNode } from "react";

import { ClassTable } from "@/components/class/ClassTable";
import { StudentList } from "@/components/class/StudentList";
import { ClassCard } from "@/components/main/ClassCard";
import { DoneSummaryRow } from "@/components/main/DoneSummaryRow";
import { LedgerTable } from "@/components/main/LedgerTable";
import { ProgressPanel } from "@/components/main/ProgressPanel";
import { BasketPanel } from "@/components/problem/BasketPanel";
import { GenerateSetup } from "@/components/test/GenerateSetup";
import { TestReview } from "@/components/test/TestReview";
import ConceptView from "@/components/unified/ConceptView";
import TeachingOverview from "@/components/unified/TeachingOverview";
import type { ClassEntity, ProgressEntity } from "@/contracts/class.contract";
import { buildClassRows } from "@/lib/main/pipeline";

import {
  hifiBoard,
  hifiUnitLectures,
  hifiUnits,
} from "../concept-hifi/fixture";

import { CONCEPT_BOARD_OWNERS, OWNER_CLASSES, plain } from "./fixture";

const REVIEW_TEST_ID = "6c000000-0000-4000-8000-000000000900";

/** 반별 표의 «현재 진도» — 시안 그대로(반 차례). null 이면 진도 없음 */
const PROGRESS_UNITS: (string | null)[] = [
  "연립방정식의 풀이",
  "일차부등식의 응용",
  "이차방정식의 근의 공식과 응용",
  "유리수의 덧셈과 뺄셈",
  null,
  "순환소수",
  "소인수분해",
  null,
];
const UNITS = PROGRESS_UNITS.flatMap((section, i) =>
  section
    ? [
        {
          id: `6d000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
          section,
          orderIndex: i + 1,
        },
      ]
    : [],
);

declare global {
  interface Window {
    __classOwnerHifiFetch?: typeof fetch;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function installFixtureFetch(admin: boolean, classes: ClassEntity[]) {
  const original = window.__classOwnerHifiFetch ?? window.fetch.bind(window);
  window.__classOwnerHifiFetch = original;
  const board = hifiBoard(admin ? { owners: CONCEPT_BOARD_OWNERS } : {});
  const review = OWNER_CLASSES[5]!; // 걷기반
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(
      typeof input === "string" || input instanceof URL
        ? String(input)
        : input.url,
      window.location.origin,
    );
    const p = url.pathname;
    if (!p.startsWith("/api/")) return original(input, init);
    if ((init?.method ?? "GET") !== "GET")
      return json(
        {
          error: {
            code: "CONFLICT",
            message: "확인 페이지에서는 저장하지 않습니다.",
          },
        },
        409,
      );
    if (p === "/api/classes")
      return json({
        data: classes,
        meta: { page: 1, pageSize: 100, total: classes.length },
      });
    if (p === "/api/units") return json({ data: [] });
    if (p === "/api/students")
      return json({ data: [], meta: { page: 1, pageSize: 100, total: 0 } });
    if (p === "/api/concept") return json({ data: board });
    if (p === "/api/concept/units") return json({ data: hifiUnits(admin) });
    if (p === "/api/concept/lectures") {
      const data = hifiUnitLectures(url.searchParams.get("unitId") ?? "");
      return data
        ? json({ data })
        : json({ error: { code: "NOT_FOUND", message: "없음" } }, 404);
    }
    if (p === "/api/dev/unified/overview" || p === "/api/studio/overview")
      return json({
        data: {
          user: { id: "admin", name: "관리자" },
          classCount: classes.length,
          studentCount: 29,
          classes: classes.slice(0, 3).map((c, i) => ({
            id: c.id,
            name: c.name,
            grade: c.grade,
            studentCount: [6, 1, 10][i]!,
            currentUnit: null,
            ...(c.owner ? { owner: c.owner } : {}),
          })),
        },
      });
    if (p === `/api/tests/${REVIEW_TEST_ID}`)
      return json({
        data: {
          test: {
            id: REVIEW_TEST_ID,
            userId: review.userId,
            classId: review.id,
            studentId: null,
            testType: "review",
            rangeStartUnitId: null,
            rangeEndUnitId: UNITS[0]!.id,
            status: "draft",
            modified: false,
            testDate: "2026-09-16",
            printedAt: null,
            createdAt: "2026-09-16T00:00:00.000Z",
          },
          className: review.name,
          studentName: "걷기학생",
          ...(admin && review.owner ? { classOwner: review.owner } : {}),
          problems: [],
        },
      });
    return json({ error: { code: "NOT_FOUND", message: "없음" } }, 404);
  };
}

function Frame({
  caption,
  wide,
  children,
}: {
  caption: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={caption}
      className={`grid min-w-0 gap-1.5 ${wide ? "lg:col-span-2" : ""}`}
    >
      <p className="text-[12px] text-text-2">{caption}</p>
      <div className="min-w-0 overflow-x-auto border border-divider bg-white p-3">
        {children}
      </div>
    </section>
  );
}

export function ClassOwnerHifiClient({ admin }: { admin: boolean }) {
  const classes = admin
    ? OWNER_CLASSES
    : (plain(OWNER_CLASSES) as ClassEntity[]);
  useState(() => {
    if (typeof window !== "undefined") installFixtureFetch(admin, classes);
    return true;
  });
  const [picked, setPicked] = useState(classes[1]!.id);

  const progressByClass: Record<string, ProgressEntity | null> =
    Object.fromEntries(
      classes.map((c, i) => {
        const unit = UNITS.find((u) => u.orderIndex === i + 1);
        return [
          c.id,
          unit
            ? {
                id: `6e000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
                classId: c.id,
                studentId: null,
                unitId: unit.id,
                recordedAt: "2026-09-15",
                createdAt: "2026-09-15T00:00:00.000Z",
              }
            : null,
        ];
      }),
    );
  const rows = buildClassRows(classes, [], progressByClass, UNITS);

  return (
    <main className="mx-auto grid max-w-[1180px] gap-4 px-4 py-6 sm:px-6">
      <h1 className="text-[15px] font-black">
        누구의 반 — {admin ? "관리자" : "관리자 아님"}
      </h1>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Frame caption="수업 · 학생 관리 › 반 · 학생 관리">
          <ClassTable
            classes={classes}
            selectedClassId={picked}
            onSelect={setPicked}
          />
        </Frame>
        <Frame caption="출제 · 장바구니 › 반 고르기">
          <BasketPanel
            items={[]}
            busy={false}
            onRemove={() => {}}
            onClear={() => {}}
            onMakeTest={() => {}}
            onClose={() => {}}
          />
        </Frame>
        <Frame caption="오늘의 작업 › 반별 표 (앞 다섯 줄)" wide>
          <LedgerTable
            rows={rows.slice(0, 5)}
            selectedClassId={picked}
            onSelect={setPicked}
            onProgress={setPicked}
          />
        </Frame>
        <Frame caption="오늘의 개념 판 (작업실 결)" wide>
          <ConceptView videoEmbed={false} />
        </Frame>
        <Frame caption="오늘의 작업 › 카드 · 끝난 반 한 줄 · 진도 입력 ★" wide>
          <div className="flex min-w-[720px]">
            <div className="min-w-0 flex-1">
              {rows.slice(0, 3).map((row, i) => (
                <ClassCard
                  key={row.classId}
                  row={row}
                  index={i + 1}
                  hot={row.classId === picked}
                  onSelect={setPicked}
                  onProgress={setPicked}
                />
              ))}
              <DoneSummaryRow
                row={{ ...rows[5]!, stage: "done" }}
                hot={false}
                onSelect={setPicked}
              />
            </div>
            <ProgressPanel
              classes={classes}
              units={UNITS}
              selectedClassId={picked}
              selectedUnitId={progressByClass[picked]?.unitId ?? null}
              printedDays={0}
              unmodifiedRate={0}
              error={null}
              canRecord={false}
              suggestion={null}
              onStep={() => {}}
              onRecord={() => {}}
            />
          </div>
        </Frame>
        <Frame caption="수업 · 학생 관리 › 학생 칸 머리 ★">
          <StudentList
            students={[]}
            selectedClass={classes.find((c) => c.id === picked)}
            status="ready"
            onRetry={() => {}}
          />
        </Frame>
        <Frame caption="작업실 개요 › 최근 등록한 반">
          <TeachingOverview onOpen={() => {}} />
        </Frame>
        <Frame caption="출제 설정 › 반" wide>
          <GenerateSetup />
        </Frame>
        <Frame caption="시험지 검토 머리" wide>
          <TestReview testId={REVIEW_TEST_ID} />
        </Frame>
      </div>
    </main>
  );
}

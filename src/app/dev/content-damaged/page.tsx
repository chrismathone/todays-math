import { readFile } from "node:fs/promises";
import path from "node:path";

import Link from "next/link";
import { notFound } from "next/navigation";

import { MathText } from "@/components/math/MathText";
import { db } from "@/lib/db";
import { devPageVisible } from "@/lib/devPageAccess";

import { NoteForm } from "./NoteForm";

/**
 * 본문 손상/누락 검수 목록 — AI 해설 생성 파이프라인(`scripts/qa/apply-ai-solutions.ts`)이
 * "본문만으로 못 풂"으로 건너뛴 문항 중, 사유가 본문 자체의 손상·누락 계열인 것만 모은다.
 * 정본(HWP/PDF) 대조로 복구할지, 출제 제외로 돌릴지 판단하는 자리다.
 *
 * 2026-08-23 원장님 지시로 이 목록 전량이 `directUseAllowed=false`(출제 보류) —
 * 되돌리기 원장: scripts/qa/reports/content-damaged-lock.json,
 * 스크립트: scripts/qa/apply-content-damaged-lock.ts.
 * 메모는 기존 검수 API(`POST /api/problems/{id}/review`, verdict=unsure)에 남긴다 —
 * 로그인 세션이 있어야 저장된다. 조회도 production 에서는 로그인한 원장만 한다
 * (`devPageVisible` — 2026-10-07 검수에서 로그인 없이 문항이 내려가는 것이 확인됐다).
 *
 * 학년 필터·페이지네이션은 URL 쿼리(`?grade=…&page=…`)로 — 서버 컴포넌트를
 * 유지해 클라이언트 상태 없이 링크만으로 동작한다.
 *
 * 🔴 "누락"은 본문 텍스트 손상과 그림 유실 둘 다에 쓰인다 — 「유리수 분류표
 *    이미지가 누락되어」는 본문은 멀쩡하고 그림만 없는 경우다(별도 결함,
 *    docs/planning/16 회수 트랙 대상). 2026-08-23 원장님 확인 후 그림/이미지/
 *    사진을 언급하는 사유는 여기서 뺀다 — "진짜 손상"만 남긴다.
 */
const DAMAGE_KEYWORDS = /손상|깨|누락|오타|결손|훼손/;
const FIGURE_MENTION = /그림|이미지|사진/;

const GRADE_ORDER = [
  "중1",
  "중2",
  "중3",
  "공통수학1",
  "공통수학2",
  "대수",
  "미적분1",
  "확률과 통계",
  "기하",
  "미적분2",
];

const PAGE_SIZE = 20;

async function loadDamagedReasons(): Promise<Map<string, string>> {
  const fp = path.join(
    process.cwd(),
    "scripts",
    "qa",
    "reports",
    "ai-solution-skip.json",
  );
  const raw = await readFile(fp, "utf8");
  const rows = JSON.parse(raw) as Array<{ id: string; reason: string }>;
  const map = new Map<string, string>();
  for (const r of rows) {
    if (DAMAGE_KEYWORDS.test(r.reason) && !FIGURE_MENTION.test(r.reason)) {
      map.set(r.id, r.reason);
    }
  }
  return map;
}

function hrefFor(grade: string | null, page: number): string {
  const params = new URLSearchParams();
  if (grade) params.set("grade", grade);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `?${qs}` : "?";
}

const badgeStyle = (active: boolean): React.CSSProperties => ({
  background: active ? "#1a56db" : "#f2f2f2",
  color: active ? "#fff" : "#333",
  borderRadius: 6,
  padding: "4px 10px",
  fontSize: 13,
  textDecoration: "none",
  fontWeight: active ? 600 : 400,
});

export const dynamic = "force-dynamic";

export default async function ContentDamagedPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string; page?: string }>;
}) {
  // 프록시가 `/dev/` 를 공개로 둔다 — production 에서는 **로그인한 원장에게만** 연다
  // (`src/lib/devPageAccess.ts`). 로그인 없는 요청은 DB 를 읽기 전에 여기서 끝난다.
  if (!(await devPageVisible({ directorOnly: true }))) notFound();

  const { grade: gradeParam, page: pageParam } = await searchParams;

  const reasons = await loadDamagedReasons();
  const ids = [...reasons.keys()];

  const rows = await db.problem.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      problemCode: true,
      content: true,
      answer: true,
      unit: { select: { grade: true, section: true } },
      school: true,
      examId: true,
      questionNumber: true,
      sourceFile: true,
      externalId: true,
      score: true,
    },
  });

  const allItems = rows
    .map((r) => ({
      id: r.id,
      problemCode: r.problemCode,
      content: r.content,
      answer: r.answer,
      grade: r.unit?.grade ?? "",
      unitName: r.unit ? `${r.unit.grade} · ${r.unit.section}` : "—",
      reason: reasons.get(r.id) ?? "",
      school: r.school,
      examId: r.examId,
      questionNumber: r.questionNumber,
      sourceFile: r.sourceFile,
      externalId: r.externalId,
      score: r.score,
    }))
    .sort((a, b) => {
      const ga = GRADE_ORDER.indexOf(a.grade);
      const gb = GRADE_ORDER.indexOf(b.grade);
      const oa = ga === -1 ? GRADE_ORDER.length : ga;
      const ob = gb === -1 ? GRADE_ORDER.length : gb;
      if (oa !== ob) return oa - ob;
      return a.problemCode.localeCompare(b.problemCode);
    });

  const byGrade = new Map<string, number>();
  for (const item of allItems) {
    const key = item.grade || "(단원없음)";
    byGrade.set(key, (byGrade.get(key) ?? 0) + 1);
  }

  const activeGrade = gradeParam && byGrade.has(gradeParam) ? gradeParam : null;
  const filtered = activeGrade
    ? allItems.filter((item) => (item.grade || "(단원없음)") === activeGrade)
    : allItems;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rawPage = Number(pageParam) || 1;
  const page = Math.min(Math.max(1, rawPage), totalPages);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const logs = await db.problemReviewLog.findMany({
    where: { problemId: { in: pageItems.map((item) => item.id) } },
    orderBy: { createdAt: "desc" },
    select: {
      problemId: true,
      note: true,
      verdict: true,
      createdAt: true,
      reviewer: { select: { name: true } },
    },
  });
  const logsByProblem = new Map<string, typeof logs>();
  for (const log of logs) {
    const list = logsByProblem.get(log.problemId) ?? [];
    list.push(log);
    logsByProblem.set(log.problemId, list);
  }

  return (
    <main
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "32px 24px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <header style={{ marginBottom: 32 }}>
        <p
          style={{
            fontSize: 12,
            letterSpacing: 1,
            color: "#888",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          DEV · 본문 손상 검수
        </p>
        <h1 style={{ fontSize: 24, margin: "4px 0 8px" }}>
          해설 생성 실패 — 본문 손상/누락 {allItems.length}건
        </h1>
        <p style={{ color: "#555", lineHeight: 1.6, margin: 0 }}>
          AI 해설 생성 파이프라인이 &ldquo;본문만으로 풀 수 없다&rdquo;고 건너뛴
          문항 중, 사유가 본문 손상·누락 계열인 것만 모았다. DB 정답은
          참고용으로 함께 표시한다 — 실제 정답 여부는 원본 대조로만 확정된다.
          <strong> 전량 출제 보류(directUseAllowed=false) 상태다.</strong> 각
          항목에 메모를 남기면 검수 기록(ProblemReviewLog)에 저장된다.
        </p>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginTop: 16,
          }}
        >
          <Link href={hrefFor(null, 1)} style={badgeStyle(!activeGrade)}>
            전체 {allItems.length}
          </Link>
          {[...byGrade.entries()].map(([g, count]) => (
            <Link
              key={g}
              href={hrefFor(g, 1)}
              style={badgeStyle(activeGrade === g)}
            >
              {g} {count}
            </Link>
          ))}
        </div>
      </header>

      <p style={{ fontSize: 13, color: "#888", margin: "0 0 12px" }}>
        {filtered.length}건 중{" "}
        {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
        {Math.min(page * PAGE_SIZE, filtered.length)}번째 · 페이지 {page}/
        {totalPages}
      </p>

      <ol
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {pageItems.map((item, i) => (
          <li
            key={item.id}
            style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                color: "#888",
                marginBottom: 8,
              }}
            >
              <span>
                #{(page - 1) * PAGE_SIZE + i + 1} · {item.problemCode} ·{" "}
                {item.unitName}
              </span>
              <span>정답(DB): {item.answer}</span>
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#666",
                marginBottom: 8,
                display: "flex",
                flexWrap: "wrap",
                gap: "4px 12px",
              }}
            >
              {item.school ? <span>학교: {item.school}</span> : null}
              {item.examId ? <span>시험: {item.examId}</span> : null}
              {item.questionNumber != null ? (
                <span>원본 문항번호: {item.questionNumber}</span>
              ) : null}
              {item.score != null ? <span>배점: {item.score}</span> : null}
              {item.sourceFile ? (
                <span>원본 경로: {item.sourceFile}</span>
              ) : null}
              {item.externalId ? (
                <span>external_id: {item.externalId}</span>
              ) : null}
              {!item.school &&
              !item.examId &&
              item.questionNumber == null &&
              !item.sourceFile &&
              !item.externalId ? (
                <span style={{ color: "#999" }}>원본 출처 메타데이터 없음</span>
              ) : null}
            </div>
            <MathText as="div" text={item.content} />
            <p
              style={{
                marginTop: 10,
                fontSize: 13,
                color: "#b3261e",
                background: "#fdecea",
                borderRadius: 6,
                padding: "8px 10px",
              }}
            >
              사유: {item.reason}
            </p>
            {(logsByProblem.get(item.id) ?? []).length > 0 ? (
              <ul
                style={{
                  listStyle: "none",
                  margin: "8px 0 0",
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {(logsByProblem.get(item.id) ?? []).map((log, logIndex) => (
                  <li
                    key={logIndex}
                    style={{
                      fontSize: 12,
                      color: "#444",
                      background: "#f7f7f2",
                      borderRadius: 6,
                      padding: "6px 8px",
                    }}
                  >
                    <strong>{log.reviewer?.name ?? "익명"}</strong>{" "}
                    <span style={{ color: "#999" }}>
                      {log.createdAt
                        .toISOString()
                        .slice(0, 16)
                        .replace("T", " ")}
                    </span>
                    {log.note ? <> — {log.note}</> : null}
                  </li>
                ))}
              </ul>
            ) : null}
            <NoteForm problemId={item.id} />
          </li>
        ))}
      </ol>

      <nav
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
          marginTop: 28,
        }}
      >
        {page > 1 ? (
          <Link href={hrefFor(activeGrade, page - 1)} style={pagerLinkStyle}>
            ← 이전
          </Link>
        ) : (
          <span style={pagerDisabledStyle}>← 이전</span>
        )}
        <span style={{ fontSize: 13, color: "#666" }}>
          {page} / {totalPages}
        </span>
        {page < totalPages ? (
          <Link href={hrefFor(activeGrade, page + 1)} style={pagerLinkStyle}>
            다음 →
          </Link>
        ) : (
          <span style={pagerDisabledStyle}>다음 →</span>
        )}
      </nav>
    </main>
  );
}

const pagerLinkStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#1a56db",
  textDecoration: "none",
  fontWeight: 600,
};

const pagerDisabledStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#ccc",
};

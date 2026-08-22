import { readFile } from "node:fs/promises";
import path from "node:path";

import Link from "next/link";

import { MathText } from "@/components/math/MathText";
import { db } from "@/lib/db";

/**
 * 본문 손상/누락 검수 목록 — AI 해설 생성 파이프라인(`scripts/qa/apply-ai-solutions.ts`)이
 * "본문만으로 못 풂"으로 건너뛴 문항 중, 사유가 본문 자체의 손상·누락 계열인 것만 모은다.
 * 정본(HWP/PDF) 대조로 복구할지, 출제 제외로 돌릴지 판단하는 자리다.
 *
 * ⚠️ 읽기만 한다. 아무것도 안 바꾼다.
 * 학년 필터·페이지네이션은 URL 쿼리(`?grade=…&page=…`)로 — 서버 컴포넌트를
 * 유지해 클라이언트 상태 없이 링크만으로 동작한다.
 */
const DAMAGE_KEYWORDS = /손상|깨|누락|오타|결손|훼손/;

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
    if (DAMAGE_KEYWORDS.test(r.reason)) map.set(r.id, r.reason);
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

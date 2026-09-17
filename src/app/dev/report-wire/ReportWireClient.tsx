"use client";

import { useMemo, useState } from "react";

import {
  bandSentence,
  driftSentence,
  outOfPhrase,
  scoreSentence,
} from "@/lib/achievement/sentences";
import {
  ACHIEVEMENT_BANDS,
  type AchievementBand,
  type AchievementFactors,
  type BandAccuracy,
  MIN_UNIT_PROBLEMS,
} from "@/lib/achievement/types";

/**
 * **성취 리포트 Wire 4안** (D-07, 2026-09-18).
 *
 * 🔴 ASCII 로 고른 것은 확정이 아니다(2026-08-19 교훈). 그래서 네 안을 **실제로 눌러** 보게
 *    만들고, ⓐ 지금 실데이터와 ⓑ 채점·영상이 찬 뒤를 **한 화면에서 갈아 끼우게** 한다.
 *
 * 네 안이 **전부** 답하는 물음 셋:
 *   ㉠ 비어 있는 영역을 어떻게 다루나  ㉡ 한 장인가 두 장인가  ㉢ 난이도 4단을 어떻게 말하나
 *
 * ⚠️ 읽기 전용이다 — 아무것도 저장하지 않는다.
 */

type Props = {
  real: AchievementFactors;
  /** 그 기간에 진도가 있는 학생 수 — 「가장 두꺼운 학생」이 몇 중 하나인가. */
  candidates: number;
  anchoredOnLastProgress: boolean;
  weeks: number;
};

/** 화면이 그리는 한 벌 — `teacherNote` 는 **아직 칸이 없어서** 팩터 밖에 있다. */
type View = {
  factors: AchievementFactors;
  teacherNote: string | null;
  example: boolean;
};

const WIRES = [
  {
    key: "A",
    label: "A. 있는 것만",
    empty: "빈 영역은 아예 안 그린다",
    sheets: "한 장",
    band: "문장으로만",
  },
  {
    key: "B",
    label: "B. 네 칸을 늘 그린다",
    empty: "칸은 두고 «아직 기록 없음»이라 적는다",
    sheets: "한 장",
    band: "가로 막대 넷",
  },
  {
    key: "C",
    label: "C. 두 장",
    empty: "원장 화면엔 적고 · 학부모 지면엔 안 그린다",
    sheets: "두 장",
    band: "사다리 그림",
  },
  {
    key: "D",
    label: "D. 문장 먼저",
    empty: "«아직 못 드리는 말씀»으로 따로 모은다",
    sheets: "한 장",
    band: "문장 + 작은 점수판",
  },
] as const;
type WireKey = (typeof WIRES)[number]["key"];

const NOTE = "text-[11.5px] leading-relaxed text-text-2";
const CARD = "border border-divider bg-white p-4";
const H2 = "text-[14px] font-bold";

// ─────────────────────────────────────────────
// ⓑ 예시 — **지어낸 값이다.** ①만 실제 기록이고 ②③④는 예시다.
// ─────────────────────────────────────────────

const EXAMPLE_NOTE =
  "수업 중 질문이 늘었습니다. 계산 실수를 스스로 되짚는 모습이 보입니다. 응용 문제에서 식을 세우기 전에 손이 멈추는 편이라, 다음 달에는 문제를 소리 내어 읽고 조건을 적는 연습을 함께 하겠습니다.";

function exampleOf(real: AchievementFactors): View {
  const units = real.learned.units ?? [];
  const ref = (i: number) =>
    units[i] ?? {
      unitId: `example-${i}`,
      grade: real.student.classGrade,
      chapter: "(예시 단원)",
      section: `(예시 소단원 ${i + 1})`,
    };
  const bare = (i: number) => {
    const u = ref(i);
    return {
      unitId: u.unitId,
      grade: u.grade,
      chapter: u.chapter,
      section: u.section,
    };
  };

  const round = (n: number, date: string, score: number) => ({
    testId: `example-test-${n}`,
    testDate: date,
    takenAt: `${date}T10:00:00.000Z`,
    score,
    maxScore: 100,
  });

  return {
    example: true,
    teacherNote: EXAMPLE_NOTE,
    factors: {
      ...real,
      scored: {
        rounds: [
          round(1, "2026-08-27", 75),
          round(2, "2026-09-03", 62),
          round(3, "2026-09-10", 88),
        ],
        absentRounds: [
          {
            testId: "example-test-4",
            testDate: "2026-09-07",
            takenAt: "2026-09-07T10:00:00.000Z",
            score: null,
            maxScore: 100,
          },
        ],
        averagePercent: 75,
        unitAccuracy: {
          reported: [
            { ...bare(0), correct: 13, total: 14, accuracy: 92.9 },
            { ...bare(1), correct: 7, total: 16, accuracy: 43.8 },
          ],
          underSampled: [{ ...bare(2), total: 5, needed: MIN_UNIT_PROBLEMS }],
        },
        bandAccuracy: {
          연산: { correct: 11, total: 12, accuracy: 91.7 },
          기본: { correct: 12, total: 14, accuracy: 85.7 },
          응용: { correct: 3, total: 8, accuracy: 37.5 },
          심화: null,
        },
        reviewUnits: [
          { ...bare(1), flaggedRounds: 2, problems: 16, accuracy: 43.8 },
          { ...bare(2), flaggedRounds: 1, problems: 5, accuracy: null },
        ],
      },
      selfStudy: {
        lectures: { assigned: 6, completed: 4, averagePercent: 78 },
        homework: null,
      },
    },
  };
}

// ─────────────────────────────────────────────
// 잔손
// ─────────────────────────────────────────────

function Empty({ what, why }: { what: string; why: string }) {
  return (
    <div className="border border-dashed border-control bg-side/40 px-3 py-4">
      <p className="text-[13px] text-text-2">{what} — 아직 기록이 없습니다.</p>
      <p className={`${NOTE} mt-1`}>{why}</p>
    </div>
  );
}

function BandBars({
  bands,
}: {
  bands: Record<AchievementBand, BandAccuracy | null>;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {ACHIEVEMENT_BANDS.map((band) => {
        const value = bands[band];
        return (
          <div key={band} className="flex items-center gap-2">
            <span className="w-9 shrink-0 text-[12.5px]">{band}</span>
            <span className="relative h-4 flex-1 bg-seg-empty">
              {value ? (
                <span
                  className="absolute inset-y-0 left-0 bg-blue"
                  style={{ width: `${value.accuracy}%` }}
                />
              ) : null}
            </span>
            <span className="w-[108px] shrink-0 text-right text-[12px] tabular-nums text-text-2">
              {value
                ? outOfPhrase(value.correct, value.total)
                : "아직 기록 없음"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function BandLadder({
  bands,
}: {
  bands: Record<AchievementBand, BandAccuracy | null>;
}) {
  return (
    <div className="flex items-end gap-1.5">
      {ACHIEVEMENT_BANDS.map((band, i) => {
        const value = bands[band];
        const height = 30 + i * 16;
        return (
          <div key={band} className="flex flex-1 flex-col items-center gap-1">
            <span
              className={`w-full border ${
                value
                  ? "border-ink bg-white"
                  : "border-dashed border-control bg-side/40"
              }`}
              style={{ height }}
            >
              {value ? (
                <span
                  className="block w-full bg-blue"
                  style={{
                    height: `${(value.accuracy / 100) * height}px`,
                    marginTop: `${height - (value.accuracy / 100) * height}px`,
                  }}
                />
              ) : null}
            </span>
            <span className="text-[12px]">{band}</span>
            <span className={`${NOTE} tabular-nums`}>
              {value ? outOfPhrase(value.correct, value.total) : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function BandBoard({
  bands,
}: {
  bands: Record<AchievementBand, BandAccuracy | null>;
}) {
  return (
    <div className="grid grid-cols-4 border border-divider">
      {ACHIEVEMENT_BANDS.map((band) => {
        const value = bands[band];
        return (
          <div
            key={band}
            className="border-r border-divider px-2 py-2 last:border-r-0"
          >
            <div className="text-[11.5px] text-text-2">{band}</div>
            <div className="text-[14px] font-bold tabular-nums">
              {value ? `${value.correct}/${value.total}` : "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LearnedBlock({ view }: { view: View }) {
  const { learned } = view.factors;
  if (learned.units === null || learned.lessons === null)
    return (
      <Empty
        what="이 기간에 나간 진도"
        why="진도를 입력하면 이 자리에 소단원 이름이 들어갑니다."
      />
    );
  const byChapter = new Map<string, string[]>();
  for (const u of learned.units) {
    const list = byChapter.get(u.chapter) ?? [];
    list.push(u.lessons > 1 ? `${u.section} (${u.lessons}회)` : u.section);
    byChapter.set(u.chapter, list);
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px]">
        <b>{learned.units.length}개 소단원</b> · {learned.lessons}차시
      </p>
      <ul className="flex flex-col gap-1">
        {[...byChapter.entries()].map(([chapter, sections]) => (
          <li key={chapter} className="text-[12.5px] leading-relaxed">
            <span className="font-bold">{chapter}</span>
            <span className="text-text-2"> — {sections.join(" · ")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RoundList({ view }: { view: View }) {
  const { rounds, absentRounds } = view.factors.scored;
  if (rounds === null) return null;
  return (
    <div className="flex flex-col gap-1">
      {rounds.map((r) => (
        <p key={r.testId} className="text-[12.5px] tabular-nums">
          {r.testDate} — {r.score ?? "—"}
          {r.maxScore === null ? "" : ` / ${r.maxScore}점`}
        </p>
      ))}
      {(absentRounds ?? []).map((r) => (
        <p key={r.testId} className="text-[12.5px] text-text-2 tabular-nums">
          {r.testDate} — 결시 (점수 없음)
        </p>
      ))}
    </div>
  );
}

function UnitAccuracyBlock({ view }: { view: View }) {
  const ua = view.factors.scored.unitAccuracy;
  if (ua === null) return null;
  return (
    <div className="flex flex-col gap-2">
      {ua.reported.map((u) => (
        <p key={u.unitId} className="text-[12.5px]">
          {u.section} — <b>{outOfPhrase(u.correct, u.total)}</b>
        </p>
      ))}
      {ua.underSampled.length > 0 ? (
        <p className={NOTE}>
          문제 수가 적어 아직 말씀드리기 어려운 단원:{" "}
          {ua.underSampled
            .map((u) => `${u.section} (${u.total}문제)`)
            .join(" · ")}{" "}
          — {MIN_UNIT_PROBLEMS}문제가 모이면 알려 드립니다.
        </p>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────
// A안 — 있는 것만 그린다
// ─────────────────────────────────────────────

function WireA({ view }: { view: View }) {
  const { factors } = view;
  const missing: string[] = [];
  if (factors.scored.rounds === null) missing.push("시험 점수");
  if (factors.selfStudy.lectures === null) missing.push("예습 영상");
  if (factors.selfStudy.homework === null) missing.push("숙제");
  if (view.teacherNote === null) missing.push("선생님 의견");
  const band = bandSentence(factors.scored.bandAccuracy);

  return (
    <section className={`${CARD} flex flex-col gap-4`}>
      <PaperHead view={view} />

      <div className="flex flex-col gap-2">
        <h2 className={H2}>무엇을 배웠나</h2>
        <LearnedBlock view={view} />
      </div>

      {factors.scored.rounds !== null ? (
        <div className="flex flex-col gap-2">
          <h2 className={H2}>얼마나 맞았나</h2>
          <p className="text-[13px]">
            {scoreSentence(factors.scored.averagePercent)}
          </p>
          <RoundList view={view} />
          <UnitAccuracyBlock view={view} />
          {band ? <p className="text-[13px]">{band}</p> : null}
        </div>
      ) : null}

      {factors.selfStudy.lectures !== null ? (
        <div className="flex flex-col gap-2">
          <h2 className={H2}>스스로 한 것</h2>
          <p className="text-[13px]">
            예습 영상 {factors.selfStudy.lectures.assigned}편 중{" "}
            {factors.selfStudy.lectures.completed}편을 끝까지 봤습니다.
          </p>
        </div>
      ) : null}

      {view.teacherNote !== null ? (
        <div className="flex flex-col gap-2">
          <h2 className={H2}>선생님 의견</h2>
          <p className="text-[13px] leading-relaxed">{view.teacherNote}</p>
        </div>
      ) : null}

      {missing.length > 0 ? (
        <p className={`${NOTE} border-t border-divider pt-3`}>
          아직 기록이 없어 이번 리포트에 담지 못한 것: {missing.join(" · ")}
        </p>
      ) : null}
    </section>
  );
}

// ─────────────────────────────────────────────
// B안 — 네 칸을 늘 그리고, 비면 «아직 기록 없음»이라 적는다
// ─────────────────────────────────────────────

function WireB({ view }: { view: View }) {
  const { factors } = view;
  return (
    <section className={`${CARD} flex flex-col gap-4`}>
      <PaperHead view={view} />

      <div className="flex flex-col gap-2 border-t border-divider pt-3">
        <h2 className={H2}>① 무엇을 배웠나</h2>
        <LearnedBlock view={view} />
        <p className={NOTE}>
          {driftSentence(factors.learned.planDriftDays) ??
            `계획 대비 밀림 — 아직 계산할 수 없습니다 (${factors.learned.planDriftGap}).`}
        </p>
      </div>

      <div className="flex flex-col gap-2 border-t border-divider pt-3">
        <h2 className={H2}>② 얼마나 맞았나</h2>
        {factors.scored.rounds === null ? (
          <Empty
            what="시험 점수"
            why="채점을 입력하면 회차별 점수와 단원별 정답 수가 이 자리에 들어갑니다."
          />
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[13px]">
              {scoreSentence(factors.scored.averagePercent)}
            </p>
            <RoundList view={view} />
            <UnitAccuracyBlock view={view} />
          </div>
        )}
        <div className="mt-1 flex flex-col gap-1">
          <p className="text-[12.5px] font-bold">난이도별</p>
          {factors.scored.bandAccuracy === null ? (
            <Empty
              what="난이도별 정답 수"
              why="연산 · 기본 · 응용 · 심화 네 단으로 나눠 보여 드립니다."
            />
          ) : (
            <BandBars bands={factors.scored.bandAccuracy} />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-divider pt-3">
        <h2 className={H2}>③ 스스로 한 것</h2>
        {factors.selfStudy.lectures === null ? (
          <Empty
            what="예습 영상"
            why="아직 올라간 강의가 없습니다. 강의가 생기면 편수와 시청률이 들어갑니다."
          />
        ) : (
          <p className="text-[13px]">
            예습 영상 {factors.selfStudy.lectures.assigned}편 중{" "}
            {factors.selfStudy.lectures.completed}편 완료 · 평균{" "}
            {factors.selfStudy.lectures.averagePercent}% 시청
          </p>
        )}
        <Empty
          what="숙제"
          why="숙제를 적어 두는 칸이 아직 없습니다 — 만들지 정하는 중입니다."
        />
      </div>

      <div className="flex flex-col gap-2 border-t border-divider pt-3">
        <h2 className={H2}>④ 선생님 의견</h2>
        {view.teacherNote === null ? (
          <Empty
            what="선생님 의견"
            why="원장님이 직접 쓰시는 칸입니다. 아직 만들지 않았습니다."
          />
        ) : (
          <p className="text-[13px] leading-relaxed">{view.teacherNote}</p>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// C안 — 두 장 (원장 화면 / 학부모 지면)
// ─────────────────────────────────────────────

function WireC({ view }: { view: View }) {
  const { factors } = view;
  const band = bandSentence(factors.scored.bandAccuracy);
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {/* 원장님 화면 — 숫자와 «못 재는 까닭»까지 전부 */}
      <div className={`${CARD} flex flex-col gap-3`}>
        <p className="text-[11.5px] font-bold tracking-wide text-blue">
          원장님 화면
        </p>
        <PaperHead view={view} />
        <LearnedBlock view={view} />
        <p className={NOTE}>
          계획 대비:{" "}
          {driftSentence(factors.learned.planDriftDays) ??
            `못 잽니다 (${factors.learned.planDriftGap})`}
        </p>
        <div className="border-t border-divider pt-2">
          <p className="text-[12.5px] font-bold">채점</p>
          {factors.scored.rounds === null ? (
            <p className={NOTE}>
              기록 없음 — `test_result` 0행. 채점 화면이 생기면 찹니다.
            </p>
          ) : (
            <div className="mt-1 flex flex-col gap-2">
              <RoundList view={view} />
              <UnitAccuracyBlock view={view} />
              <BandBars bands={factors.scored.bandAccuracy!} />
            </div>
          )}
        </div>
        <div className="border-t border-divider pt-2">
          <p className="text-[12.5px] font-bold">예습 영상 · 숙제 · 의견</p>
          <p className={NOTE}>
            영상{" "}
            {factors.selfStudy.lectures === null
              ? "대상 강의 0편 (기록 없음)"
              : `${factors.selfStudy.lectures.completed}/${factors.selfStudy.lectures.assigned}편`}{" "}
            · 숙제 기록할 칸 없음 ·{" "}
            {view.teacherNote === null ? "의견 칸 없음" : "의견 입력됨"}
          </p>
        </div>
      </div>

      {/* 학부모 지면 — 빈 영역은 아예 안 그린다 */}
      <div className={`${CARD} flex flex-col gap-3`}>
        <p className="text-[11.5px] font-bold tracking-wide text-text-2">
          학부모 지면 (A4)
        </p>
        <PaperHead view={view} parent />
        <div className="flex flex-col gap-2">
          <h2 className={H2}>이번 달에 배운 것</h2>
          <LearnedBlock view={view} />
        </div>
        {factors.scored.bandAccuracy !== null ? (
          <div className="flex flex-col gap-2 border-t border-divider pt-3">
            <h2 className={H2}>어디까지 되고 어디서 막히나</h2>
            <BandLadder bands={factors.scored.bandAccuracy} />
            {band ? <p className="text-[13px]">{band}</p> : null}
          </div>
        ) : null}
        {view.teacherNote !== null ? (
          <div className="flex flex-col gap-2 border-t border-divider pt-3">
            <h2 className={H2}>선생님 의견</h2>
            <p className="text-[13px] leading-relaxed">{view.teacherNote}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// D안 — 문장 먼저, 숫자는 그 밑에 근거로
// ─────────────────────────────────────────────

function WireD({ view }: { view: View }) {
  const { factors } = view;
  const lines: { text: string; evidence: React.ReactNode }[] = [];

  if (factors.learned.units !== null && factors.learned.lessons !== null)
    lines.push({
      text: `${factors.learned.units.length}개 소단원을 나갔습니다.`,
      evidence: <LearnedBlock view={view} />,
    });

  const score = scoreSentence(factors.scored.averagePercent);
  if (score)
    lines.push({
      text: score,
      evidence: (
        <div className="flex flex-col gap-2">
          <RoundList view={view} />
          <UnitAccuracyBlock view={view} />
        </div>
      ),
    });

  const band = bandSentence(factors.scored.bandAccuracy);
  if (band && factors.scored.bandAccuracy)
    lines.push({
      text: band,
      evidence: <BandBoard bands={factors.scored.bandAccuracy} />,
    });

  if (view.teacherNote !== null)
    lines.push({ text: view.teacherNote, evidence: null });

  const cannot: string[] = [];
  if (factors.scored.rounds === null)
    cannot.push("시험 점수 — 채점을 아직 입력하지 않았습니다");
  if (factors.learned.planDriftDays === null)
    cannot.push(`진도 계획 대비 — ${factors.learned.planDriftGap}`);
  if (factors.selfStudy.lectures === null)
    cannot.push("예습 영상 — 올라간 강의가 아직 없습니다");
  if (factors.selfStudy.homework === null)
    cannot.push("숙제 — 적어 두는 칸이 아직 없습니다");
  if (view.teacherNote === null)
    cannot.push("선생님 의견 — 쓰는 칸이 아직 없습니다");

  return (
    <section className={`${CARD} flex flex-col gap-4`}>
      <PaperHead view={view} />
      <div className="flex flex-col gap-4">
        {lines.map((line) => (
          <div key={line.text} className="flex flex-col gap-2">
            <p className="text-[15px] leading-relaxed font-bold">{line.text}</p>
            {line.evidence ? (
              <div className="border-l-2 border-divider pl-3">
                {line.evidence}
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {cannot.length > 0 ? (
        <div className="border-t border-divider pt-3">
          <p className="text-[12.5px] font-bold">아직 못 드리는 말씀</p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {cannot.map((c) => (
              <li key={c} className={NOTE}>
                · {c}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

// ─────────────────────────────────────────────

function PaperHead({ view, parent }: { view: View; parent?: boolean }) {
  const { student, period } = view.factors;
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b-2 border-ink pb-2">
      <span className="text-[17px] font-black">{student.name}</span>
      <span className="text-[12.5px] text-text-2">
        {student.className} · {student.classGrade}
      </span>
      <span className="ml-auto text-[12.5px] tabular-nums text-text-2">
        {period.from} ~ {period.to}
      </span>
      {parent ? null : (
        <span className="w-full text-[11.5px] text-text-3">
          학생별 성취 리포트
        </span>
      )}
    </div>
  );
}

export function ReportWireClient({
  real,
  candidates,
  anchoredOnLastProgress,
  weeks,
}: Props) {
  const [wire, setWire] = useState<WireKey>("A");
  const [mode, setMode] = useState<"real" | "example">("real");

  const realView = useMemo<View>(
    () => ({ factors: real, teacherNote: null, example: false }),
    [real],
  );
  const exampleView = useMemo(() => exampleOf(real), [real]);
  const view = mode === "real" ? realView : exampleView;
  const picked = WIRES.find((w) => w.key === wire)!;

  return (
    <main className="mx-auto flex max-w-[1180px] flex-col gap-5 bg-canvas px-4 py-8 text-ink sm:px-6">
      <header className="flex flex-col gap-3 border-b-[3px] border-ink pb-4">
        <h1 className="text-[22px] font-black">
          성취 리포트 — Wire 4안 (D-07)
        </h1>
        <p className={NOTE}>
          실데이터입니다. 최근 <b>{weeks}주</b> 진도가 가장 두꺼운 학생{" "}
          <b>{real.student.name}</b> ({real.student.className}) —{" "}
          {real.period.from}~{real.period.to}, 진도가 있는 학생{" "}
          <b>{candidates}</b>명 중 하나입니다.
          {anchoredOnLastProgress
            ? " (오늘 기준 최근 4주에 진도가 없어 마지막 진도 날짜에 기간을 걸었습니다.)"
            : ""}
        </p>
        <p className={NOTE}>
          🔴 지금 숫자를 댈 수 있는 팩터는 <b>진도 하나</b>입니다 — 채점 0건 ·
          분석 0건 · 예습 영상 0편 · 숙제와 선생님 의견은{" "}
          <b>칸 자체가 없습니다</b>. 네 안이 전부 답해야 하는 것:{" "}
          <b>㉠ 빈 영역을 어떻게 다루나</b> · <b>㉡ 한 장인가 두 장인가</b> ·{" "}
          <b>㉢ 난이도 4단을 어떻게 말하나</b>.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {WIRES.map((w) => (
            <button
              key={w.key}
              type="button"
              onClick={() => setWire(w.key)}
              aria-pressed={wire === w.key}
              className={`cursor-pointer border px-3 py-1 text-[13px] ${
                wire === w.key
                  ? "border-ink bg-ink font-bold text-white"
                  : "border-control bg-white"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12.5px] text-text-2">보는 상태</span>
          <button
            type="button"
            onClick={() => setMode("real")}
            aria-pressed={mode === "real"}
            className={`cursor-pointer border px-3 py-1 text-[13px] ${
              mode === "real"
                ? "border-ink bg-ink font-bold text-white"
                : "border-control bg-white"
            }`}
          >
            ⓐ 지금 실데이터
          </button>
          <button
            type="button"
            onClick={() => setMode("example")}
            aria-pressed={mode === "example"}
            className={`cursor-pointer border px-3 py-1 text-[13px] ${
              mode === "example"
                ? "border-ink bg-ink font-bold text-white"
                : "border-control bg-white"
            }`}
          >
            ⓑ 채점 · 영상이 찬 뒤
          </button>
        </div>

        <p className={NOTE}>
          <b>{picked.label}</b> — 빈 영역: {picked.empty} · 장수:{" "}
          {picked.sheets} · 난이도 4단: {picked.band}
        </p>
      </header>

      {view.example ? (
        <p className="border-2 border-g-red bg-white px-3 py-2 text-[13px] font-bold text-g-red-text">
          예시 데이터입니다 — 실제 기록이 아닙니다. ① 진도만 실제 기록이고 ②③④는
          「채점과 영상이 다 찬 뒤」를 보여 드리려고 지어낸 값입니다.
        </p>
      ) : (
        <p className="border border-divider bg-side/40 px-3 py-2 text-[13px]">
          지금 실데이터입니다 — 진도 말고는 기록이 없습니다. 네 안이 이 상태를
          어떻게 그리는지가 이 시안의 핵심입니다.
        </p>
      )}

      {wire === "A" ? <WireA view={view} /> : null}
      {wire === "B" ? <WireB view={view} /> : null}
      {wire === "C" ? <WireC view={view} /> : null}
      {wire === "D" ? <WireD view={view} /> : null}

      <p className={NOTE}>
        읽기 전용 시안입니다 — 아무것도 저장하지 않습니다. 비교군은 «미사용»이
        기본이고, 열어 둔 것은 «본인의 지난 같은 길이 기간»과 «같은 반 평균(표본
        수를 같이 적음)» 둘뿐입니다. 전국·석차는 표본이 없어 만들지 않습니다.
      </p>
    </main>
  );
}

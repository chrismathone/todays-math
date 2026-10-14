"use client";

import { useState } from "react";
import type {
  FadingTeacherDashboard,
  FadingTeacherFlag,
  FadingTeacherStudent,
} from "@/contracts/fadingTeacher.contract";
import { FADING_TEACHER_FLAGS } from "@/contracts/fadingTeacher.contract";
import { curriculumName } from "../labels";
import type { TeacherWireFixture } from "./fixture";
import {
  teacherWireKey,
  TEACHER_WIRE_VARIANTS,
  type TeacherWireVariant,
} from "./wireKey";
import s from "./TeacherWire.module.css";

type Row = FadingTeacherDashboard["students"][number];
const FLAG_LABELS: Record<FadingTeacherFlag, string> = {
  "no-account": "계정 없음",
  "not-started": "시작 전",
  overdue: "복습 밀림",
  idle: "오래 쉼",
};
const PROPOSALS = {
  A: {
    title: "명단 중심",
    intent: "모든 학생의 복습 상태를 같은 표에서 비교합니다.",
  },
  B: {
    title: "살펴볼 학생 먼저",
    intent: "확인할 학생을 먼저 보고 전체 명단을 이어 봅니다.",
  },
  C: {
    title: "반별 묶음",
    intent: "반의 인원과 현황을 확인한 뒤 학생을 봅니다.",
  },
  D: {
    title: "사유별 분류",
    intent: "계정·시작·밀림·쉼 가운데 확인할 사유부터 봅니다.",
  },
  E: {
    title: "학생 상세 중심",
    intent: "학생 한 명의 개념과 기록을 넓게 펼쳐 봅니다.",
  },
};

function Flags({ flags }: { flags: readonly FadingTeacherFlag[] }) {
  return flags.length ? (
    <span className={s.flags}>
      {flags.map((flag) => (
        <span className={s.flag} key={flag}>
          {FLAG_LABELS[flag]}
        </span>
      ))}
    </span>
  ) : (
    <span className={s.muted}>해당 없음</span>
  );
}

function RosterTable({
  rows,
  onSelect,
  selected,
  label = "학생 명단",
  limit = 5,
}: {
  rows: readonly Row[];
  onSelect: (row: Row) => void;
  selected: string | null;
  label?: string;
  limit?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!rows.length) return <p className={s.empty}>등록된 학생이 없습니다.</p>;
  const shown = expanded ? rows : rows.slice(0, limit);
  return (
    <>
      <table className={s.roster} aria-label={label}>
        <thead>
          <tr>
            <th scope="col">학생</th>
            <th scope="col">복습일 됨</th>
            <th scope="col">밀림</th>
            <th scope="col">살펴볼 까닭</th>
            <th scope="col">상세</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((row) => {
            const key = teacherWireKey(row.id, row.classId);
            return (
              <tr
                key={key}
                data-selected={selected === key ? "true" : undefined}
              >
                <th scope="row">
                  <span>{row.name}</span>
                  <small>{row.className}</small>
                </th>
                <td>{row.summary.due}개</td>
                <td>{row.summary.overdue}개</td>
                <td>
                  <Flags flags={row.summary.flags} />
                </td>
                <td>
                  <button
                    type="button"
                    className={s.detailButton}
                    aria-label={`${label === "학생 명단" ? "" : `${label} `}${row.name} 상세`}
                    aria-pressed={selected === key}
                    onClick={() => onSelect(row)}
                  >
                    보기
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length > limit ? (
        <button
          type="button"
          className={s.moreButton}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded
            ? "명단 접기"
            : `등록 ${rows.length - shown.length}건 더 보기`}
        </button>
      ) : null}
    </>
  );
}

function StudentDetail({
  detail,
  memberships,
}: {
  detail: FadingTeacherStudent | undefined;
  memberships: string[];
}) {
  if (!detail)
    return (
      <aside className={s.detail}>
        <p className={s.empty}>학생을 선택하면 상세가 표시됩니다.</p>
      </aside>
    );
  const { student, summary, concepts, days } = detail;
  return (
    <aside className={s.detail} aria-label={`${student.name} 학생 상세`}>
      <div className={s.detailHeading}>
        <p className={s.eyebrow}>학생 상세</p>
        <h3>{student.name}</h3>
        <p className={s.muted}>{memberships.join(" · ")}</p>
      </div>
      <Flags flags={summary.flags} />
      <dl className={s.metrics}>
        <div>
          <dt>고른 개념</dt>
          <dd>{summary.picked}개</dd>
        </div>
        <div>
          <dt>배운 개념</dt>
          <dd>{summary.learned}개</dd>
        </div>
        <div>
          <dt>복습일 된 개념</dt>
          <dd>{summary.due}개</dd>
        </div>
        <div>
          <dt>밀린 개념</dt>
          <dd>{summary.overdue}개</dd>
        </div>
        <div>
          <dt>오늘 마친 풀이</dt>
          <dd>{summary.reviewedToday}회</dd>
        </div>
        <div>
          <dt>오늘 처음 배움</dt>
          <dd>{summary.freshToday}개</dd>
        </div>
        <div>
          <dt>가장 오래 밀림</dt>
          <dd>{summary.longestOverdueDays}일</dd>
        </div>
        <div>
          <dt>마지막 평가</dt>
          <dd>{summary.lastOn ?? "기록 없음"}</dd>
        </div>
        <div>
          <dt>쉬어 간 날</dt>
          <dd>
            {summary.idleDays === null ? "기록 없음" : `${summary.idleDays}일`}
          </dd>
        </div>
        <div>
          <dt>‘다시’ 평가</dt>
          <dd>{summary.lapses}회</dd>
        </div>
        <div>
          <dt>지금 연속</dt>
          <dd>{summary.streak.current}일</dd>
        </div>
        <div>
          <dt>가장 긴 연속</dt>
          <dd>{summary.streak.best}일</dd>
        </div>
      </dl>
      <p className={s.note}>배운 개념은 첫 평가를 마친 개념입니다.</p>
      <div className={s.stepCounts} aria-label="단계별 개념 수">
        {([1, 2, 3, 4] as const).map((step) => (
          <span key={step}>
            {step}단계 <strong>{summary.stepCounts[step]}개</strong>
          </span>
        ))}
      </div>
      <h4>고른 개념</h4>
      {concepts.length ? (
        <ul className={s.concepts}>
          {concepts.map((concept) => (
            <li key={concept.id}>
              <strong>{concept.terms.join(" · ")}</strong>
              <span className={s.muted}>
                {concept.section
                  .split("::")
                  .slice(1)
                  .map(curriculumName)
                  .join(" · ")}
              </span>
              <span>
                {concept.step}단계 ·{" "}
                {concept.rated ? "첫 평가 마침" : "평가 전"}
              </span>
              <span>
                {concept.dueOn === null
                  ? "복습일 없음"
                  : concept.daysUntil !== null && concept.daysUntil < 0
                    ? `복습 ${-concept.daysUntil}일 밀림 · ${concept.dueOn}`
                    : concept.daysUntil === 0
                      ? `오늘 복습 · ${concept.dueOn}`
                      : `다음 복습 ${concept.dueOn}`}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={s.empty}>고른 개념이 없습니다.</p>
      )}
      <h4>최근 평가 기록</h4>
      <p className={s.note}>‘다시’ 외 평가는 학생이 매긴 평가 건수입니다.</p>
      {days.length ? (
        <table className={s.days} aria-label="최근 평가 집계">
          <thead>
            <tr>
              <th scope="col">날짜</th>
              <th scope="col">마친 풀이</th>
              <th scope="col">‘다시’ 외 평가</th>
              <th scope="col">처음 배움</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.date}>
                <th scope="row">{day.date}</th>
                <td>{day.reviews}회</td>
                <td>{day.passed}회</td>
                <td>{day.fresh}개</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className={s.empty}>평가 기록이 없습니다.</p>
      )}
    </aside>
  );
}

function Proposal({
  variant,
  fixture,
  initialClass,
}: {
  variant: TeacherWireVariant;
  fixture: TeacherWireFixture;
  initialClass?: string;
}) {
  const { dashboard, details } = fixture;
  const [classId, setClassId] = useState(initialClass ?? "all");
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<string | null>(null);
  const rows = dashboard.students.filter(
    (row) =>
      (classId === "all" || row.classId === classId) &&
      row.name.includes(search.trim()),
  );
  const flagged = rows.filter((row) => row.summary.flags.length > 0);
  const preferred =
    rows.find((row) => row.summary.flags.includes("overdue")) ?? rows[0];
  const selected =
    rows.find((row) => teacherWireKey(row.id, row.classId) === selection) ??
    preferred;
  const selectedKey = selected
    ? teacherWireKey(selected.id, selected.classId)
    : null;
  const onSelect = (row: Row) =>
    setSelection(teacherWireKey(row.id, row.classId));
  const unique = new Set(rows.map((row) => row.id)).size;
  const flaggedUnique = new Set(flagged.map((row) => row.id)).size;
  const memberships = selected
    ? [
        ...new Set(
          dashboard.students
            .filter((row) => row.id === selected.id)
            .map((row) => row.className),
        ),
      ]
    : [];
  const detail = (
    <StudentDetail
      detail={selectedKey ? details[selectedKey] : undefined}
      memberships={memberships}
    />
  );
  const table = (list: readonly Row[], label?: string, limit?: number) => (
    <RosterTable
      rows={list}
      onSelect={onSelect}
      selected={selectedKey}
      label={label}
      limit={limit}
    />
  );
  return (
    <section
      className={s.proposal}
      data-testid="teacher-wire-proposal"
      data-variant={variant}
    >
      <header className={s.proposalIntro}>
        <h2>
          {variant}안 · {PROPOSALS[variant].title}
        </h2>
        <p>{PROPOSALS[variant].intent}</p>
      </header>
      <div className={s.productHeader}>
        <div>
          <p className={s.eyebrow}>오늘의 기억 · SRS</p>
          <h3>학생 현황</h3>
        </div>
        <div className={s.previewSlot}>
          <a href="/dev/fading" className={s.previewLink}>
            미리 보기
          </a>
          <span>저장되지 않음</span>
        </div>
      </div>
      <div className={s.toolbar}>
        <label>
          반 선택
          <select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setSelection(null);
            }}
          >
            <option value="all">전체 반</option>
            {dashboard.classes.map((cls) => (
              <option value={cls.id} key={cls.id}>
                {cls.name} ·{" "}
                {
                  dashboard.students.filter((row) => row.classId === cls.id)
                    .length
                }
                명
              </option>
            ))}
          </select>
        </label>
        <label>
          학생 이름
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름 검색"
          />
        </label>
        <p className={s.scope}>
          학생 {unique}명 · 등록 {rows.length}건<br />
          <span>기준일 {dashboard.today}</span>
        </p>
      </div>
      {classId === "all" ? (
        <p className={s.registrationNote}>
          두 반에 등록된 학생은 반마다 표시됩니다. 학생 수는 한 번만 셉니다.
        </p>
      ) : null}
      <div className={`${s.body} ${variant === "E" ? s.detailFirst : ""}`}>
        <div className={s.rosterPanel}>
          {variant === "A" ? (
            <>
              <h4>전체 명단</h4>
              {table(rows)}
            </>
          ) : null}
          {variant === "B" ? (
            <>
              <div className={s.attentionHeading}>
                <h4>살펴볼 학생 {flaggedUnique}명</h4>
                <p>전체 학생 {unique}명</p>
              </div>
              {flagged.length ? (
                table(flagged, "살펴볼 학생")
              ) : (
                <p className={s.empty}>
                  {rows.length
                    ? "살펴볼 학생이 없습니다."
                    : "등록된 학생이 없습니다."}
                </p>
              )}
              <h4>전체 명단</h4>
              {table(rows)}
            </>
          ) : null}
          {variant === "C" ? (
            <>
              {dashboard.classes
                .filter((cls) => classId === "all" || cls.id === classId)
                .map((cls) => {
                  const members = rows.filter((row) => row.classId === cls.id);
                  return (
                    <section className={s.classGroup} key={cls.id}>
                      <div className={s.groupHeading}>
                        <h4>{cls.name}</h4>
                        <span>
                          {members.length}명 · 살펴볼 학생{" "}
                          {
                            members.filter((row) => row.summary.flags.length)
                              .length
                          }
                          명
                        </span>
                      </div>
                      {table(members, cls.name, 3)}
                    </section>
                  );
                })}
            </>
          ) : null}
          {variant === "D" ? (
            <>
              <p className={s.note}>여러 사유가 있으면 각 분류에 표시됩니다.</p>
              {FADING_TEACHER_FLAGS.map((flag) => {
                const members = rows.filter((row) =>
                  row.summary.flags.includes(flag),
                );
                return (
                  <section className={s.reasonGroup} key={flag}>
                    <div className={s.groupHeading}>
                      <h4>{FLAG_LABELS[flag]}</h4>
                      <span>
                        {new Set(members.map((row) => row.id)).size}명
                      </span>
                    </div>
                    {members.length ? (
                      table(members, FLAG_LABELS[flag], Infinity)
                    ) : (
                      <p className={s.empty}>해당 학생이 없습니다.</p>
                    )}
                  </section>
                );
              })}
              <h4>전체 명단</h4>
              {table(rows)}
            </>
          ) : null}
          {variant === "E" ? (
            <>
              <h4>학생 선택</h4>
              <ul className={s.studentList}>
                {rows.map((row) => {
                  const key = teacherWireKey(row.id, row.classId);
                  return (
                    <li key={key}>
                      <span>
                        <strong>{row.name}</strong>
                        <small>{row.className}</small>
                        <Flags flags={row.summary.flags} />
                      </span>
                      <button
                        type="button"
                        className={s.detailButton}
                        aria-label={`${row.name} 상세`}
                        aria-pressed={key === selectedKey}
                        onClick={() => onSelect(row)}
                      >
                        보기
                      </button>
                    </li>
                  );
                })}
              </ul>
              {rows.length ? null : (
                <p className={s.empty}>등록된 학생이 없습니다.</p>
              )}
            </>
          ) : null}
        </div>
        {detail}
      </div>
      <footer className={s.proposalFooter}>
        구조 시안 · 학생 현황이 첫 화면 · 정책 {dashboard.policy}판
      </footer>
    </section>
  );
}

export function TeacherWireGallery({
  fixture,
  only,
  initialClass,
}: {
  fixture: TeacherWireFixture;
  only?: TeacherWireVariant;
  initialClass?: string;
}) {
  return (
    <div className={s.root}>
      <aside className={s.workspaceRail} aria-label="작업실 위치">
        <strong>오늘 수학</strong>
        <p>작업실</p>
        <div>오늘의 작업</div>
        <div>오늘의 개념</div>
        <div className={s.currentMenu}>오늘의 기억 · SRS</div>
        <p className={s.railFoot}>학생 현황 구조 시안</p>
      </aside>
      <main className={s.main}>
        <header className={s.galleryHeading}>
          <p className={s.eyebrow}>원장 화면 · 구조 비교</p>
          <h1>학생 현황 · 5안</h1>
          <p>같은 표본으로 비교합니다. 선택 후 시각 시안을 진행합니다.</p>
          <nav aria-label="시안 이동">
            <a href="/dev/fading-teacher-wire">5안 함께 보기</a>
            {TEACHER_WIRE_VARIANTS.map((variant) => (
              <a
                href={`/dev/fading-teacher-wire?variant=${variant}`}
                key={variant}
              >
                {variant}안
              </a>
            ))}
          </nav>
        </header>
        {(only ? [only] : TEACHER_WIRE_VARIANTS).map((variant) => (
          <Proposal
            key={variant}
            variant={variant}
            fixture={fixture}
            initialClass={initialClass}
          />
        ))}
      </main>
    </div>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import type {
  MathGraphUnit,
  PrerequisiteSectionEvidence,
  PrerequisiteTeacherEvidence,
} from "@/contracts/mathPrerequisite.contract";
import { getCourseStudentDetail } from "@/components/math-srs/courseApi";
import {
  curriculumGraph,
  graphFilterOptions,
  graphUnitDetail,
  reviewCandidates,
  searchUnits,
  type MathGraphFilter,
  type MathGraphRelatedUnit,
  type MathGraphUnitDetail,
} from "@/lib/math-prerequisite/graph";
import {
  mappingInfo,
  PILOT_CHECK_SECTION_IDS,
  PILOT_TARGET_SECTION_IDS,
} from "@/lib/math-prerequisite/mapping";
import { getCourseSection } from "@/lib/math-srs/elementary/catalog";
import styles from "./curriculum-graph.module.css";

const SCHOOL: Record<MathGraphUnit["schoolLevel"], string> = {
  elementary: "초등",
  middle: "중학교",
  high: "고등학교",
};
const COURSE_RELATION = {
  course_sequence: "과목 순서",
  alternative_track: "다른 과정",
  recommended_foundation: "권하는 기초",
  recommended_before_or_concurrent: "먼저 또는 함께",
  conceptual_support: "개념상의 도움",
} as const;
const STATUS_TEXT: Record<PrerequisiteSectionEvidence["status"], string> = {
  unassessed: "아직 확인하지 않음",
  passed_recent: "최근 통과",
  not_passed_recent: "최근 통과하지 못함",
  stale: "기간이 지나 이번 판정에 쓰지 않음",
  inconclusive: "판정하지 못함",
};
const OUTCOME_TEXT = {
  passed: "통과",
  failed: "실패",
  inconclusive: "가르지 못함",
  unknown: "모름",
} as const;
const FROZEN_MISSION =
  "자동 확인을 끄거나 허용된 계획 변경을 하면 이후 계산만 바뀝니다. 이미 열린 탐험은 그대로 둡니다.";
const OUTSIDE_PILOT = ["5-2-2-3", "5-2-2-4"] as const;
const clock = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export type GraphStudentRef = { id: string; revision: number };

function supplyLabel(unitId: string): string | null {
  const info = mappingInfo(unitId);
  if (info.role === "target") return "문제를 낼 수 있음";
  if (info.role === "check") return "확인 범위";
  return null;
}

function metaLine(unit: MathGraphUnit): string {
  const domain =
    unit.schoolLevel === "high" ? `편집분류 · ${unit.domain}` : unit.domain;
  const parts = [unit.gradeBand, unit.course, domain];
  const supply = supplyLabel(unit.id);
  if (supply) parts.push(supply);
  return parts.join(" · ");
}

function sectionLine(sectionId: string): string {
  const section = getCourseSection(sectionId);
  return section ? `${sectionId} ${section.title}` : sectionId;
}

function when(value: string | null): string {
  return value ? clock.format(new Date(value)) : "기록 없음";
}

function RelatedJumps({
  items,
  onOpen,
}: {
  items: MathGraphRelatedUnit[];
  onOpen: (id: string) => void;
}) {
  if (items.length === 0) return <p className={styles.note}>없습니다.</p>;
  return (
    <div className={styles.jumps}>
      {items.map(({ unit, edge }) => (
        <button
          key={`${edge.relation}-${edge.from}-${edge.to}`}
          type="button"
          className={styles.jump}
          onClick={() => onOpen(unit.id)}
        >
          {unit.id} {unit.title}
          <span className={styles.reason}>{edge.reason}</span>
        </button>
      ))}
    </div>
  );
}

function UnitBody({
  detail,
  excluded,
  onOpen,
  onToggleExcluded,
}: {
  detail: MathGraphUnitDetail;
  excluded: readonly string[];
  onOpen: (id: string) => void;
  onToggleExcluded: (id: string) => void;
}) {
  const { unit } = detail;
  const info = mappingInfo(unit.id);
  const allCandidates = reviewCandidates(unit.id);
  const hidden = excluded.filter((id) =>
    allCandidates.some((candidate) => candidate.id === id),
  );
  const visibleCandidates = reviewCandidates(unit.id, hidden);
  const support = [...detail.incomingSupport, ...detail.outgoingSupport];
  return (
    <div className={styles.more} id={`graph-unit-${unit.id}-detail`}>
      {unit.schoolLevel === "middle" && unit.suggestedGrade !== null ? (
        <p>화면의 {unit.suggestedGrade}학년 자리는 공식 학년이 아닙니다.</p>
      ) : null}
      {unit.schoolLevel === "high" ? (
        <p className={styles.note}>
          분류 칸은 편집분류이며 공식 영역 이름이 아닙니다.
        </p>
      ) : null}
      {info.role === "target" ? (
        <>
          <h3 className={styles.subhead}>문제를 낼 수 있는 소단원</h3>
          <ul>
            {PILOT_TARGET_SECTION_IDS.map((id) => (
              <li key={id}>{sectionLine(id)}</li>
            ))}
          </ul>
          <p className={styles.note}>
            확인 차례는 {PILOT_CHECK_SECTION_IDS.map(sectionLine).join(", ")}
            입니다. 시범 밖은 {OUTSIDE_PILOT.map(sectionLine).join(", ")}{" "}
            입니다. 단원 전체를 아는 것으로 보지 않습니다.
          </p>
        </>
      ) : null}
      {info.role === "check" ? (
        <>
          <h3 className={styles.subhead}>확인 범위</h3>
          <ul>
            {PILOT_CHECK_SECTION_IDS.map((id) => (
              <li key={id}>{sectionLine(id)}</li>
            ))}
          </ul>
          <p className={styles.note}>
            이 범위는 확인용입니다. 단원 전체를 아는 것으로 보지 않습니다.
          </p>
        </>
      ) : null}
      {info.role === null ? (
        <p>
          찾을 수는 있고 자동으로 내지 않습니다. 시범 소단원은 없습니다. 낼
          문제가 없고, 성취기준 대조도 끝나지 않았습니다.
        </p>
      ) : null}
      <h3 className={styles.subhead}>학습 요소</h3>
      <ul>
        {detail.topics.map((topic) => (
          <li key={topic.id}>{topic.title}</li>
        ))}
      </ul>
      <h3 className={styles.subhead}>바로 앞 단원</h3>
      <RelatedJumps items={detail.directPrerequisites} onOpen={onOpen} />
      <h3 className={styles.subhead}>다음</h3>
      <p className={styles.note}>
        이어서 적힌 단원입니다. 여기서 자동으로 내지 않습니다.
      </p>
      <RelatedJumps items={detail.successors} onOpen={onOpen} />
      <h3 className={styles.subhead}>도움</h3>
      {support.length === 0 ? (
        <p>적힌 도움이 없습니다. 배울 필요가 없다는 뜻은 아닙니다.</p>
      ) : (
        <RelatedJumps items={support} onOpen={onOpen} />
      )}
      <h3 className={styles.subhead}>과목 관계</h3>
      <p className={styles.note}>
        과목 관계는 단원 관계와 따로입니다. 학습 순서를 만들지 않습니다.
      </p>
      {detail.courseRelations.length === 0 ? (
        <p>이 과목에 붙은 과목 관계는 없습니다.</p>
      ) : (
        <ul>
          {detail.courseRelations.map((relation) => (
            <li key={`${relation.relation}-${relation.from}-${relation.to}`}>
              {relation.from} → {relation.to} ·{" "}
              {COURSE_RELATION[relation.relation]}. {relation.note}
            </li>
          ))}
        </ul>
      )}
      <h3 className={styles.subhead}>다시 볼 후보 · 진단 아님</h3>
      <p>
        보이는 후보 {visibleCandidates.length} / {allCandidates.length}.
      </p>
      <p className={styles.note}>
        이미 본 단원에서 빼는 표시는 이 화면만 기억합니다. 학생 기록과 따로이며
        숙달로 저장하지 않습니다.
      </p>
      {visibleCandidates.length === 0 ? (
        <p>지금 보이는 후보는 없습니다.</p>
      ) : (
        <div className={styles.jumps}>
          {visibleCandidates.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              className={styles.jump}
              onClick={() => onOpen(candidate.id)}
            >
              {candidate.id} {candidate.title}
            </button>
          ))}
        </div>
      )}
      {allCandidates.map((candidate) => (
        <label key={candidate.id} className={styles.exclude}>
          <input
            type="checkbox"
            checked={hidden.includes(candidate.id)}
            onChange={() => onToggleExcluded(candidate.id)}
          />
          이미 본 단원에서 빼기 · {candidate.id} {candidate.title}
        </label>
      ))}
    </div>
  );
}

function StudentRecords({ student }: { student: GraphStudentRef | null }) {
  const request = useRef(0);
  const studentId = student?.id ?? null;
  const revision = student?.revision ?? null;
  // The record stays keyed to the request that produced it. A missing or
  // different student derives an empty view, so this effect never resets state.
  const [record, setRecord] = useState<{
    studentId: string;
    revision: number;
    name: string;
    evidence: PrerequisiteTeacherEvidence | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    if (!studentId || revision === null) return;
    const token = ++request.current;
    const requestedId = studentId;
    const requestedRevision = revision;
    void getCourseStudentDetail(requestedId).then((result) => {
      if (request.current !== token) return;
      if (!result.ok) {
        setRecord({
          studentId: requestedId,
          revision: requestedRevision,
          name: "",
          evidence: null,
          error: result.message,
        });
        return;
      }
      // A slower response for another student, or an older revision, must not paint.
      if (
        result.data.student.id !== requestedId ||
        result.data.student.revision < requestedRevision
      ) {
        setRecord({
          studentId: requestedId,
          revision: requestedRevision,
          name: "",
          evidence: null,
          error: "학생 기록이 바뀌어 방금 받은 내용을 표시하지 않습니다.",
        });
        return;
      }
      setRecord({
        studentId: requestedId,
        revision: result.data.student.revision,
        name: result.data.student.name,
        evidence: result.data.prerequisite ?? null,
        error: null,
      });
    });
    return () => {
      request.current += 1;
    };
  }, [studentId, revision]);

  const current =
    record &&
    studentId !== null &&
    revision !== null &&
    record.studentId === studentId &&
    record.revision >= revision
      ? record
      : null;
  const loading = studentId !== null && current === null;
  const error = current?.error ?? null;
  const view =
    current && !current.error
      ? { name: current.name, evidence: current.evidence }
      : null;
  const evidence = view?.evidence;
  const unavailable =
    evidence?.context?.kind === "unavailable" ? evidence.context : null;
  return (
    <section className={styles.student} aria-label="선택한 학생의 기록">
      <h2 className={styles.title}>선택한 학생의 기록</h2>
      <p className={styles.note}>
        교육과정 연결과 따로입니다. 다른 학생과 합치지 않고, 이 화면에서 학습을
        시작하지 않습니다.
      </p>
      {!student ? <p>선택된 학생 없음.</p> : null}
      {loading ? (
        <p role="status" className={styles.loading}>
          학생 기록을 불러오는 중…
        </p>
      ) : null}
      {error ? (
        <p role="alert" className={styles.note}>
          {error}
        </p>
      ) : null}
      {view ? (
        <>
          <p>
            {view.name}. 기준은 최근 완료한 5문항 세션 두 번입니다. 답 두 개로
            세지 않습니다.
          </p>
          {evidence ? (
            <>
              <p className={styles.note}>
                끝낸 초등 과정 기록의 일부입니다. 부분 범위{" "}
                {evidence.sections.length}
                줄이며 합산하지 않습니다.
                {evidence.configuredAt
                  ? ` 계획을 저장한 시각 ${when(evidence.configuredAt)}.`
                  : ""}
              </p>
              <ol className={styles.rows}>
                {evidence.sections.map((section) => (
                  <li key={section.sectionId}>
                    <p className={styles.scope}>
                      {section.sectionId} {section.title}
                    </p>
                    <p>
                      단원 {section.unitId} · {STATUS_TEXT[section.status]} ·
                      세션 결과 {OUTCOME_TEXT[section.outcome]}
                    </p>
                    <p>
                      직접 맞음 {section.independentCorrect} · 직접 틀림{" "}
                      {section.independentIncorrect}
                    </p>
                    <p>{when(section.lastObservedAt)}</p>
                    <p className={styles.note}>
                      소단원 일부입니다. 단원 숙달이 아닙니다.
                    </p>
                  </li>
                ))}
              </ol>
              {evidence.holdReason || evidence.heldSectionIds.length > 0 ? (
                <p>
                  {evidence.heldSectionIds.length > 0
                    ? `보류한 범위: ${evidence.heldSectionIds
                        .map((id) => {
                          const row = evidence.sections.find(
                            (section) => section.sectionId === id,
                          );
                          return row ? `${id} ${row.title}` : id;
                        })
                        .join(", ")}. `
                    : ""}
                  {evidence.holdReason}
                </p>
              ) : null}
              {evidence.context && evidence.context.kind !== "unavailable" ? (
                <p>이 학생에게 적힌 이유: {evidence.context.reason}</p>
              ) : null}
              {unavailable?.canStart ? (
                <p>
                  {unavailable.reason} 목표 학습은 이어 갈 수 있습니다. 이 조회
                  화면에서는 학습을 시작하지 않습니다. {FROZEN_MISSION}
                </p>
              ) : null}
              {unavailable && !unavailable.canStart ? (
                <p>
                  {unavailable.reason} 이 조회 화면에서는 학습을 시작하지
                  않습니다. {FROZEN_MISSION}
                </p>
              ) : null}
            </>
          ) : (
            <p>이 학생의 선수 기록은 오지 않았습니다.</p>
          )}
        </>
      ) : null}
    </section>
  );
}

export default function CurriculumGraphPanel({
  id,
  student,
  onClose,
}: {
  id: string;
  student: GraphStudentRef | null;
  onClose?: () => void;
}) {
  const graph = curriculumGraph();
  const options = graphFilterOptions();
  const noticeId = useId();
  const [query, setQuery] = useState("");
  const [schoolLevel, setSchoolLevel] = useState<
    "" | MathGraphUnit["schoolLevel"]
  >("");
  const [gradeBand, setGradeBand] = useState("");
  const [course, setCourse] = useState("");
  const [domain, setDomain] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [excludedByTarget, setExcludedByTarget] = useState<
    Record<string, string[]>
  >({});
  const filter: MathGraphFilter = {
    query,
    ...(schoolLevel ? { schoolLevel } : {}),
    ...(gradeBand ? { gradeBand } : {}),
    ...(course ? { course } : {}),
    ...(domain ? { domain } : {}),
  };
  const units = searchUnits(filter);

  useEffect(() => {
    if (!openId) return;
    const node = document.getElementById(`graph-unit-${openId}`);
    node?.focus();
    node?.scrollIntoView?.({ block: "nearest" });
  }, [openId]);

  function resetFilters() {
    setQuery("");
    setSchoolLevel("");
    setGradeBand("");
    setCourse("");
    setDomain("");
    setNotice("필터를 초기화했습니다.");
  }

  function openUnit(targetId: string) {
    const inside = units.some((unit) => unit.id === targetId);
    if (!inside) {
      setQuery("");
      setSchoolLevel("");
      setGradeBand("");
      setCourse("");
      setDomain("");
      const title = graphUnitDetail(targetId)?.unit.title ?? targetId;
      setNotice(`필터를 초기화하고 연 단원: ${title}.`);
    }
    setOpenId(targetId);
  }

  return (
    <section className={styles.panel} id={id} aria-label="교육과정 연결도">
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>교육과정 연결도</h2>
          <p className={styles.muted}>
            {graph.units.length}단원 · 읽기 전용
            {student ? "" : " · 선택된 학생 없음"}
          </p>
        </div>
        {onClose ? (
          <button type="button" className={styles.close} onClick={onClose}>
            접기
          </button>
        ) : null}
      </div>
      <p className={styles.status}>
        성취기준 대조는 끝나지 않았습니다. 문제는 일부 단원만 낼 수 있습니다.
      </p>
      <p className={styles.note}>{graph.scope.note}</p>
      <p className={styles.note}>단원 관계는 공식 이수 조건이 아닙니다.</p>
      <div className={styles.filters}>
        <label>
          학교급
          <select
            value={schoolLevel}
            onChange={(event) =>
              setSchoolLevel(
                event.target.value as "" | MathGraphUnit["schoolLevel"],
              )
            }
          >
            <option value="">전체</option>
            {options.schoolLevels.map((level) => (
              <option key={level} value={level}>
                {SCHOOL[level]}
              </option>
            ))}
          </select>
        </label>
        <label>
          학년군
          <select
            value={gradeBand}
            onChange={(event) => setGradeBand(event.target.value)}
          >
            <option value="">전체</option>
            {options.gradeBands.map((band) => (
              <option key={band} value={band}>
                {band}
              </option>
            ))}
          </select>
        </label>
        <label>
          과목
          <select
            value={course}
            onChange={(event) => setCourse(event.target.value)}
          >
            <option value="">전체</option>
            {options.courses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          영역
          <select
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
          >
            <option value="">전체</option>
            {options.domains.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.search}>
          검색
          <input
            type="search"
            value={query}
            placeholder="단원 이름 또는 코드"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      <button type="button" className={styles.reset} onClick={resetFilters}>
        필터 초기화
      </button>
      <p id={noticeId} className={styles.note} role="status">
        {notice}
      </p>
      <p className={styles.choices}>
        고를 수 없는 과목: {graph.scope.excluded.join(", ")}. 고등학교 단원의
        분류 칸은 편집분류이며 공식 영역 이름이 아닙니다.
      </p>
      <div className={styles.catalog}>
        <h3 className={styles.count}>
          단원 {units.length} / {graph.units.length}
        </h3>
        {units.length === 0 ? (
          <p className={styles.note}>조건에 맞는 단원이 없습니다.</p>
        ) : (
          units.map((unit) => {
            const open = openId === unit.id;
            const detail = open ? graphUnitDetail(unit.id) : null;
            return (
              <div key={unit.id} className={styles.unit}>
                <button
                  type="button"
                  id={`graph-unit-${unit.id}`}
                  className={styles.row}
                  aria-expanded={open}
                  aria-controls={`graph-unit-${unit.id}-detail`}
                  onClick={() => {
                    setOpenId(open ? null : unit.id);
                    setNotice("");
                  }}
                >
                  <span className={styles.name}>
                    {unit.id} {unit.title}
                  </span>
                  <span className={styles.meta}>{metaLine(unit)}</span>
                </button>
                {detail ? (
                  <UnitBody
                    detail={detail}
                    excluded={excludedByTarget[unit.id] ?? []}
                    onOpen={openUnit}
                    onToggleExcluded={(candidateId) =>
                      setExcludedByTarget((previous) => {
                        const current = new Set(previous[unit.id] ?? []);
                        if (current.has(candidateId))
                          current.delete(candidateId);
                        else current.add(candidateId);
                        return { ...previous, [unit.id]: [...current] };
                      })
                    }
                  />
                ) : null}
              </div>
            );
          })
        )}
      </div>
      <StudentRecords student={student} />
    </section>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import type {
  MathInsightInquiryResult,
  MathInsightSnapshot,
} from "@/contracts/mathInsight.contract";
import AutoGrowTextarea from "@/components/ui/AutoGrowTextarea";
import { MathText } from "@/components/math/MathText";
import { getCourseSection } from "@/lib/math-srs/elementary/catalog";
import { getLearningInsight, inquireLearningInsight } from "./courseApi";
import s from "./course-dashboard.module.css";
import p from "./LearningInsightPanel.module.css";

type Props = {
  studentId: string;
  classId: string;
  branchId?: string;
  refreshKey?: number;
};
const relations = {
  same: "같은 개념",
  "covers-part": "일부 범위",
  related: "관련 개념",
};
const reviews = {
  candidate: "관계 확인 전",
  confirmed: "검토한 관계",
  rejected: "관계 제외",
};
const states = {
  unassessed: "관찰 기록 없음",
  passed_recent: "최근 확인 기준 충족",
  not_passed_recent: "최근 확인 기준 미충족",
  stale: "최근 기록 부족",
  inconclusive: "판단 근거 부족",
};
const exclusions: Record<
  MathInsightSnapshot["evidence"][number]["exclusions"][number],
  string
> = {
  unfinished: "미완료",
  future: "기준 시각 이후",
  "before-plan": "현재 계획 이전",
  "outside-window": "관찰 기간 밖",
  superseded: "더 최근 기록이 있음",
  "hint-self-check-give-up-or-repeated":
    "힌트·자기평가·모르겠어요·반복 기록 제외",
  "retry-not-first-attempt": "첫 풀이 이후 재시도 제외",
  "no-plan": "계획 없음",
};
const time = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  dateStyle: "short",
  timeStyle: "short",
});
const date = (iso: string) => time.format(new Date(iso));
const title = (id: string) =>
  getCourseSection(id)?.title ?? "범위 이름 확인 필요";

// Check reference integrity only; all educational judgments remain server-owned.
function consistent(snapshot: MathInsightSnapshot, context: Props) {
  const evidence = new Map(snapshot.evidence.map((item) => [item.id, item]));
  return (
    snapshot.context?.studentId === context.studentId &&
    snapshot.context.classId === context.classId &&
    (!context.branchId || snapshot.context.branchId === context.branchId) &&
    evidence.size === snapshot.evidence.length &&
    new Set(snapshot.nextChecks.map((item) => item.id)).size ===
      snapshot.nextChecks.length &&
    snapshot.scope.graphHash === snapshot.scope.versions.graphContentHash &&
    snapshot.sections.every((item) =>
      item.evidenceIds.every(
        (id) =>
          evidence.has(id) && evidence.get(id)!.sectionId === item.sectionId,
      ),
    ) &&
    snapshot.nextChecks.every((item) =>
      item.evidenceIds.every((id) => evidence.has(id)),
    )
  );
}
function consistentInquiry(result: MathInsightInquiryResult, context: Props) {
  return (
    consistent(result.snapshot, context) &&
    result.facts.every(
      (fact) =>
        fact.evidenceIds.every((id) =>
          result.snapshot.evidence.some(
            (item) => item.id === id && item.included,
          ),
        ) &&
        fact.candidateIds.every((id) =>
          result.snapshot.nextChecks.some(
            (item) => item.id === id && item.eligible,
          ),
        ),
    )
  );
}

export default function LearningInsightPanel(props: Props) {
  // A changed scope cannot render old records, even before effect cleanup runs.
  return (
    <ScopedInsight
      key={JSON.stringify([
        props.studentId,
        props.classId,
        props.branchId,
        props.refreshKey,
      ])}
      {...props}
    />
  );
}

function ScopedInsight({ studentId, classId, branchId }: Props) {
  const [snapshot, setSnapshot] = useState<MathInsightSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<MathInsightInquiryResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const inquiry = useRef<AbortController | null>(null);
  const read = useRef<AbortController | null>(null);
  const id = useId();
  useEffect(() => {
    const controller = new AbortController();
    read.current = controller;
    void getLearningInsight(
      studentId,
      classId,
      branchId,
      controller.signal,
    ).then((result) => {
      if (controller.signal.aborted) return;
      setLoading(false);
      if (!result.ok) setError(result.message);
      else if (!consistent(result.data, { studentId, classId, branchId }))
        setError(
          "학생 또는 학습 근거의 연결이 일치하지 않습니다. 다시 불러와 주세요.",
        );
      else {
        setSnapshot(result.data);
        setError(null);
      }
    });
    return () => {
      controller.abort();
      inquiry.current?.abort();
    };
  }, [studentId, classId, branchId, reload]);

  const refresh = () => {
    read.current?.abort();
    inquiry.current?.abort();
    inquiry.current = null;
    setAsking(false);
    setAnswer(null);
    setAiError(null);
    setSnapshot(null);
    setError(null);
    setLoading(true);
    setReload((value) => value + 1);
  };
  const ask = async () => {
    if (
      !snapshot ||
      !query.trim() ||
      query.trim().length > 500 ||
      inquiry.current
    )
      return;
    const controller = new AbortController();
    inquiry.current = controller;
    setAsking(true);
    setAnswer(null);
    setAiError(null);
    const result = await inquireLearningInsight(
      studentId,
      classId,
      { query },
      branchId,
      controller.signal,
    );
    if (controller.signal.aborted || inquiry.current !== controller) return;
    inquiry.current = null;
    setAsking(false);
    if (!result.ok) setAiError(result.message);
    else if (!consistentInquiry(result.data, { studentId, classId, branchId }))
      setAiError(
        "응답의 근거가 일치하지 않습니다. 학습 근거를 다시 불러와 주세요.",
      );
    else {
      setSnapshot(result.data.snapshot);
      setAnswer(result.data);
    }
  };
  const evidenceLinks = (ids: string[], current = snapshot) =>
    ids.length ? (
      <span className={p.references}>
        근거 ·{" "}
        {ids.map((key, index) => {
          const position = current!.evidence.findIndex(
            (item) => item.id === key,
          );
          return (
            <span key={key}>
              {index ? " · " : ""}
              <a
                href={`#${id}-record-${position}`}
                onClick={() => {
                  const row = document.getElementById(
                    `${id}-record-${position}`,
                  );
                  const details = row?.closest("details");
                  if (details) details.open = true;
                  row?.focus({ preventScroll: true });
                }}
              >
                기록 {position + 1}
              </a>
            </span>
          );
        })}
      </span>
    ) : (
      <span className={p.references}>연결된 관찰 기록 없음</span>
    );

  return (
    <section className={p.panel} aria-labelledby={`${id}-heading`}>
      <div className={s.detailTools}>
        <h3 id={`${id}-heading`}>다시 살펴볼 학습 근거</h3>
        <button type="button" className={s.textButton} onClick={refresh}>
          {error ? "학습 근거 다시 불러오기" : "학습 근거 새로고침"}
        </button>
      </div>
      <p className={s.muted}>
        초등 분수 일부 범위의 읽기 전용 시범입니다. 학습 계획과 학생 기록은
        바꾸지 않습니다.
      </p>
      {loading ? (
        <p role="status" className={s.notice}>
          학습 근거를 불러오는 중…
        </p>
      ) : null}
      {error ? (
        <p role="alert" className={s.error}>
          {error}
        </p>
      ) : null}
      {snapshot && !loading && !error ? (
        <>
          <dl className={s.facts}>
            <div>
              <dt>기준 시각</dt>
              <dd>{date(snapshot.asOf)} · 한국 시간</dd>
            </div>
            <div>
              <dt>목표 범위</dt>
              <dd>
                {snapshot.goal?.title ?? "설정된 목표 없음"}
                {snapshot.goal?.mappingStatus === "unmapped"
                  ? " · 관계 확인 전"
                  : ""}
              </dd>
            </div>
            <div>
              <dt>기록 범위</dt>
              <dd>
                {snapshot.eligibility === "eligible"
                  ? "시범 범위의 관찰 기록"
                  : snapshot.eligibility === "out-of-scope"
                    ? "현재 목표는 시범 범위 밖"
                    : "학생별 판단 근거 부족"}
              </dd>
            </div>
          </dl>
          <h4>관찰한 학습 기록</h4>
          <p className={s.muted}>
            힌트 없이 푼 첫 답을 구분한 기록입니다. 확인 기준 충족은 전체 개념의
            숙달을 뜻하지 않습니다.
          </p>
          {snapshot.sections.length ? (
            <ul className={p.rows}>
              {snapshot.sections.map((item) => (
                <li key={item.sectionId}>
                  <strong>{item.title}</strong>
                  <p>
                    {states[item.status]} · {relations[item.relation]} · 범위
                    연결 확인
                  </p>
                  <p>
                    독립 정답 {item.independentCorrect} · 독립 오답{" "}
                    {item.independentIncorrect}
                    {item.lastObservedAt
                      ? ` · ${date(item.lastObservedAt)}`
                      : ""}
                  </p>
                  {evidenceLinks(item.evidenceIds)}
                </li>
              ))}
            </ul>
          ) : (
            <p className={s.emptyReport}>
              이 범위에서 살펴볼 학습 기록이 없습니다.
            </p>
          )}
          <h4>다음 확인 후보</h4>
          <p className={s.muted}>
            관계를 바탕으로 제안한 확인 범위입니다. 자동으로 배정하지 않으며
            학습 효과를 판정하지 않습니다.
          </p>
          {snapshot.nextChecks.length ? (
            <ul className={p.rows}>
              {snapshot.nextChecks.map((item, index) => (
                <li key={item.id} id={`${id}-candidate-${index}`}>
                  <strong>{item.title}</strong>
                  <p>
                    {relations[item.relation]} · {reviews[item.reviewStatus]} ·{" "}
                    {item.eligible
                      ? "현재 확인 후보"
                      : "현재 학생의 확인 후보로 고르지 않음"}
                  </p>
                  <MathText text={item.reason} as="p" />
                  {evidenceLinks(item.evidenceIds)}
                  {item.caveats.map((note, n) => (
                    <p className={s.muted} key={n}>
                      {note}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          ) : (
            <p className={s.emptyReport}>현재 제시할 확인 후보가 없습니다.</p>
          )}
          <details className={p.records}>
            <summary>
              근거 기록 {snapshot.evidence.length}건 · 포함·제외 이유
            </summary>
            {snapshot.evidence.length ? (
              <ol className={p.rows}>
                {snapshot.evidence.map((item, index) => (
                  <li id={`${id}-record-${index}`} key={item.id} tabIndex={-1}>
                    <strong>
                      기록 {index + 1} · {title(item.sectionId)}
                    </strong>
                    <p>
                      시작 {date(item.startedAt)} ·{" "}
                      {item.completedAt
                        ? `완료 ${date(item.completedAt)}`
                        : "미완료"}
                    </p>
                    <p>
                      {item.included ? "관찰에 포함" : "관찰에서 제외"} · 독립
                      정답 {item.independentCorrect} · 독립 오답{" "}
                      {item.independentIncorrect}
                    </p>
                    {item.exclusions.map((reason) => (
                      <p key={reason} className={s.muted}>
                        {exclusions[reason]}
                      </p>
                    ))}
                  </li>
                ))}
              </ol>
            ) : (
              <p className={s.muted}>보존된 관련 기록이 없습니다.</p>
            )}
          </details>
          <div className={p.limits}>
            <h4>출처와 해석 범위</h4>
            <p>
              단원 관계는 편집한 교육과정 요약입니다. 공식 성취기준 전체와의
              대조를 마친 자료가 아닙니다. 같은 개념·일부 범위·관련 개념은 서로
              구분합니다.
            </p>
            {[
              ...new Set([
                ...snapshot.scope.limitations,
                ...snapshot.limitations,
              ]),
            ].map((note, index) => (
              <p key={index}>{note}</p>
            ))}
          </div>
          <form
            className={p.question}
            onSubmit={(event) => {
              event.preventDefault();
              void ask();
            }}
          >
            <label htmlFor={`${id}-query`}>학습 근거에 관해 질문하기</label>
            <AutoGrowTextarea
              id={`${id}-query`}
              value={query}
              maxLength={500}
              disabled={asking}
              aria-describedby={`${id}-query-note`}
              onChange={(event) => setQuery(event.target.value)}
            />
            <p id={`${id}-query-note`} className={s.muted}>
              500자 이내. 질문 버튼을 누르면 AI가 위 기록과 후보에서 근거를
              고릅니다. 학생의 이름·연락처·답안은 입력하지 마세요.
            </p>
            <button
              type="submit"
              className={s.button}
              disabled={asking || !query.trim() || query.trim().length > 500}
            >
              {asking ? "근거 확인 중…" : "AI에 근거 질문하기"}
            </button>
          </form>
          {asking ? <p role="status">질문에 맞는 근거를 확인하는 중…</p> : null}
          {aiError ? (
            <p role="alert" className={s.error}>
              {aiError} 위 학습 근거는 계속 확인할 수 있습니다.
            </p>
          ) : null}
          {answer ? (
            <div className={s.recommendation} role="status">
              <strong>
                {answer.status === "insufficient"
                  ? "질문에 답할 근거가 부족합니다"
                  : "질문에 연결된 근거"}
              </strong>
              <p className={s.muted}>
                AI가 기존 기록과 확인 후보에서 고른 내용입니다. 새로운 진단이나
                학습 판정이 아닙니다.
              </p>
              {answer.facts.map((fact, index) => (
                <div key={index}>
                  <MathText text={fact.text} as="p" />
                  {evidenceLinks(fact.evidenceIds, answer.snapshot)}
                  {fact.candidateIds.map((key) => {
                    const n = answer.snapshot.nextChecks.findIndex(
                      (item) => item.id === key,
                    );
                    return (
                      <a
                        className={p.candidateLink}
                        href={`#${id}-candidate-${n}`}
                        key={key}
                      >
                        확인 후보 · {answer.snapshot.nextChecks[n].title}
                      </a>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

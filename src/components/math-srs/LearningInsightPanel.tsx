"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { MathInsightSnapshot } from "@/contracts/mathInsight.contract";
import type {
  MathInsightV2Snapshot,
  MathInsightV2InquiryResult,
} from "@/contracts/mathInsightV2.contract";
import AutoGrowTextarea from "@/components/ui/AutoGrowTextarea";
import { MathText } from "@/components/math/MathText";
import { getCourseSection } from "@/lib/math-srs/elementary/catalog";
import { getLearningInsightV2, inquireLearningInsightV2 } from "./courseApi";
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
const observationExclusions: Record<
  MathInsightV2Snapshot["observations"][number]["exclusions"][number],
  string
> = {
  unfinished: "미완료",
  future: "기준 시각 이후",
  "before-plan": "현재 저장 계획 이전",
  "outside-window": "관찰 기간 밖",
  "no-plan": "저장 계획 없음",
  "future-plan": "기준 시각 이후의 계획 설정",
  "source-missing": "세션 원천을 확인할 수 없음",
  "unsupported-section": "이 조회가 지원하는 단원 밖",
  "hint-self-check-give-up-or-repeated":
    "힌트·자기채점·포기·반복 본문은 독립 첫 풀이에서 제외",
  "retry-not-first-attempt": "재시도는 독립 첫 풀이에서 제외",
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
    snapshot.evidence.every(
      (item) =>
        item.included === item.purposes.length > 0 &&
        new Set(item.purposes).size === item.purposes.length,
    ) &&
    snapshot.sections.every((item) =>
      item.evidenceIds.every(
        (id) =>
          evidence.has(id) &&
          evidence.get(id)!.sectionId === item.sectionId &&
          evidence.get(id)!.purposes.includes("section-current"),
      ),
    ) &&
    snapshot.nextChecks.every((item) =>
      item.evidenceIds.every(
        (id) =>
          evidence.has(id) &&
          (!item.eligible ||
            evidence.get(id)!.purposes.includes("candidate-trigger")),
      ),
    )
  );
}
// Validate references and scope only. Text and educational meaning belong to the server.
function consistentV2(view: MathInsightV2Snapshot, context: Props) {
  const records = [...view.observations, ...view.pilot.evidence];
  const evidence = new Set(records.map((item) => item.id));
  const candidates = new Set(view.pilot.nextChecks.map((item) => item.id));
  return (
    consistent(view.pilot, context) &&
    view.context?.studentId === context.studentId &&
    view.context.classId === context.classId &&
    view.context.branchId === view.pilot.context?.branchId &&
    view.revision === view.pilot.revision &&
    view.asOf === view.pilot.asOf &&
    view.stateDigest === view.pilot.stateDigest &&
    evidence.size === records.length &&
    new Set(view.facts.map((fact) => fact.id)).size === view.facts.length &&
    view.facts.every(
      (fact) =>
        new Set(fact.evidenceIds).size === fact.evidenceIds.length &&
        new Set(fact.candidateIds).size === fact.candidateIds.length &&
        fact.evidenceIds.every((key) => evidence.has(key)) &&
        fact.candidateIds.every((key) => candidates.has(key)),
    )
  );
}
function consistentInquiry(result: MathInsightV2InquiryResult, context: Props) {
  return (
    consistentV2(result.snapshot, context) &&
    new Set(result.facts.map((fact) => fact.id)).size === result.facts.length &&
    result.facts.every((fact) =>
      result.snapshot.facts.some(
        (canonical) =>
          canonical.id === fact.id &&
          canonical.kind === fact.kind &&
          canonical.text === fact.text &&
          JSON.stringify(canonical.evidenceIds) ===
            JSON.stringify(fact.evidenceIds) &&
          JSON.stringify(canonical.candidateIds) ===
            JSON.stringify(fact.candidateIds),
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
  const [view, setSnapshot] = useState<MathInsightV2Snapshot | null>(null);
  const snapshot = view?.pilot;
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<MathInsightV2InquiryResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const inquiry = useRef<AbortController | null>(null);
  const read = useRef<AbortController | null>(null);
  const id = useId();
  useEffect(() => {
    const controller = new AbortController();
    read.current = controller;
    void getLearningInsightV2(
      studentId,
      classId,
      branchId,
      controller.signal,
    ).then((result) => {
      if (controller.signal.aborted) return;
      setLoading(false);
      if (!result.ok) {
        setSnapshot(null);
        setError(result.message);
      } else if (!consistentV2(result.data, { studentId, classId, branchId }))
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

  const refresh = (conflict = false) => {
    read.current?.abort();
    inquiry.current?.abort();
    inquiry.current = null;
    setAsking(false);
    setAnswer(null);
    setAiError(null);
    setSnapshot(null);
    setError(null);
    setLoading(true);
    setNotice(
      conflict
        ? "학습 기록이나 조회 맥락이 바뀌어 이전 답변과 근거를 닫았습니다. 최신 근거를 한 번 다시 불러옵니다. 질문은 남아 있으며, 새 근거를 확인한 뒤 직접 다시 질문해 주세요."
        : null,
    );
    setReload((value) => value + 1);
  };
  const ask = async () => {
    if (
      !view ||
      loading ||
      !!error ||
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
    const result = await inquireLearningInsightV2(
      studentId,
      classId,
      { query },
      branchId,
      controller.signal,
    );
    if (controller.signal.aborted || inquiry.current !== controller) return;
    inquiry.current = null;
    setAsking(false);
    if (!result.ok) {
      if (result.status === 409) refresh(true);
      else if ([401, 403, 404].includes(result.status)) {
        setSnapshot(null);
        setError(result.message);
        setAiError(null);
      } else setAiError(result.message);
    } else if (
      !consistentInquiry(result.data, { studentId, classId, branchId })
    )
      setAiError(
        "응답의 근거가 일치하지 않습니다. 학습 근거를 다시 불러와 주세요.",
      );
    else {
      setSnapshot(result.data.snapshot);
      setAnswer(result.data);
    }
  };
  const cancel = () => {
    inquiry.current?.abort();
    inquiry.current = null;
    setAsking(false);
    setAiError(null);
    setNotice("질문 확인을 취소했습니다. 입력한 질문은 남아 있습니다.");
  };
  const evidenceLinks = (ids: string[], current = view) =>
    ids.length ? (
      <span className={p.references}>
        근거 ·{" "}
        {ids.map((key, index) => {
          const position = [
            ...current!.observations,
            ...current!.pilot.evidence,
          ].findIndex((item) => item.id === key);
          return (
            <span key={key}>
              {index ? " · " : ""}
              <a
                href={`#${id}-record-${position}`}
                onClick={() => {
                  const row = document.getElementById(
                    `${id}-record-${position}`,
                  );
                  let ancestor = row?.parentElement;
                  while (ancestor) {
                    if (ancestor instanceof HTMLDetailsElement)
                      ancestor.open = true;
                    ancestor = ancestor.parentElement;
                  }
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
        <button
          type="button"
          className={s.textButton}
          onClick={() => refresh()}
        >
          {error ? "학습 근거 다시 불러오기" : "학습 근거 새로고침"}
        </button>
      </div>
      <p className={s.muted}>
        초3~초6 코스에 보존된 사실을 읽기 전용으로 확인합니다. 분수 일부 범위의
        관계와 확인 후보는 별도로 보여 드립니다.
      </p>
      {notice ? (
        <p role="status" className={s.notice}>
          {notice}
        </p>
      ) : null}
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
              <dt>관찰 기간</dt>
              <dd>
                {date(view!.scope.windowStart)} ~ {date(view!.scope.windowEnd)}{" "}
                · 한국 시간
              </dd>
            </div>
            <div>
              <dt>보존된 원천</dt>
              <dd>
                세션 {view!.retention.retainedSessionCount}건 · 최근 풀이{" "}
                {view!.retention.recentAttemptCount}건
              </dd>
            </div>
          </dl>
          <h4>저장 계획과 현재 코스 목표</h4>
          {view!.facts
            .filter((fact) =>
              ["plan-context", "course-goal"].includes(fact.kind),
            )
            .map((fact) => (
              <div className={p.fact} key={fact.id}>
                <MathText text={fact.text} as="p" />
                {fact.evidenceIds.length
                  ? evidenceLinks(fact.evidenceIds)
                  : null}
              </div>
            ))}
          <h4>보존된 코스 관찰</h4>
          {view!.facts
            .filter(
              (fact) =>
                ["availability", "observation"].includes(fact.kind) &&
                // Core-owned IDs also identify held-candidate facts without citations.
                !fact.id.startsWith("fact:candidate:") &&
                !fact.candidateIds.length &&
                fact.evidenceIds.every((key) =>
                  view!.observations.some((item) => item.id === key),
                ),
            )
            .map((fact) => (
              <div className={p.fact} key={fact.id}>
                <MathText text={fact.text} as="p" />
                {fact.evidenceIds.length
                  ? evidenceLinks(fact.evidenceIds)
                  : null}
              </div>
            ))}
          <details className={p.records}>
            <summary>
              코스 원천 {view!.observations.length}건 · 수량과 포함·제외 이유
            </summary>
            <ol className={p.rows}>
              {view!.observations.map((item, index) => (
                <li key={item.id} id={`${id}-record-${index}`} tabIndex={-1}>
                  <strong>
                    기록 {index + 1} · {item.grade ? `초${item.grade} · ` : ""}
                    {item.title}
                  </strong>
                  <p>
                    {item.source === "retained-session"
                      ? "보존 세션"
                      : "세션 원천 없는 요약"}
                    {item.startedAt ? ` · 시작 ${date(item.startedAt)}` : ""}
                    {item.completedAt
                      ? ` · 완료 ${date(item.completedAt)}`
                      : ""}
                  </p>
                  {item.source === "retained-session" && item.completedAt ? (
                    <>
                      <p>
                        원천의 독립 첫 정답 {item.independentCorrect} · 독립 첫
                        오답 {item.independentIncorrect}
                      </p>
                      <p>
                        독립 첫 풀이에서 제외 {item.excludedFirstAttempts} ·
                        재시도 {item.retryAttempts}
                      </p>
                    </>
                  ) : null}
                  <p className={s.muted}>
                    {item.included
                      ? "현재 계획·관찰 기간에 포함"
                      : "현재 계획·관찰 기간의 관찰에서 제외"}
                  </p>
                  {item.exclusions.map((reason) => (
                    <p className={s.muted} key={reason}>
                      {observationExclusions[reason]}
                    </p>
                  ))}
                </li>
              ))}
            </ol>
          </details>
          <div className={p.limits}>
            <h4>보존 자료의 한계</h4>
            {view!.scope.limitations.map((note, index) => (
              <p key={index}>{note}</p>
            ))}
          </div>
          <div className={p.pilot}>
            <h4>분수 일부 범위의 관계와 확인 후보</h4>
            <p className={s.muted}>
              아래 네 소단원의 관계·판정은 위 코스 원천의 수량과 구분합니다.
              다른 학년·단원의 정답 수를 이 판정에 더하지 않습니다.
            </p>
            <dl className={s.facts}>
              <div>
                <dt>기준 시각</dt>
                <dd>{date(snapshot.asOf)} · 한국 시간</dd>
              </div>
              <div>
                <dt>코스 목표의 관계 연결</dt>
                <dd>
                  {snapshot.goal?.title ?? "이 조회에 표시할 코스 목표 없음"}
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
              힌트 없이 푼 첫 답을 구분한 기록입니다. 확인 기준 충족은 전체
              개념의 숙달을 뜻하지 않습니다.
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
                    {item.evidenceIds.length ? (
                      <p>
                        독립 정답 {item.independentCorrect} · 독립 오답{" "}
                        {item.independentIncorrect}
                        {item.lastObservedAt
                          ? ` · ${date(item.lastObservedAt)}`
                          : ""}
                      </p>
                    ) : null}
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
                {snapshot.nextChecks.map((item, index) => {
                  const fact = view!.facts.find(
                    (entry) => entry.id === `fact:candidate:${item.id}`,
                  );
                  return (
                    <li
                      key={item.id}
                      id={`${id}-candidate-${index}`}
                      tabIndex={-1}
                    >
                      <strong>{item.title}</strong>
                      <p>
                        {relations[item.relation]} ·{" "}
                        {reviews[item.reviewStatus]} ·{" "}
                        {item.eligible
                          ? "현재 확인 후보"
                          : "현재 학생의 확인 후보로 고르지 않음"}
                      </p>
                      <MathText text={fact?.text ?? item.reason} as="p" />
                      {evidenceLinks(item.evidenceIds)}
                      {(fact ? [] : item.caveats).map((note, n) => (
                        <p className={s.muted} key={n}>
                          {note}
                        </p>
                      ))}
                    </li>
                  );
                })}
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
                    <li
                      id={`${id}-record-${view!.observations.length + index}`}
                      key={item.id}
                      tabIndex={-1}
                    >
                      <strong>
                        기록 {view!.observations.length + index + 1} ·{" "}
                        {title(item.sectionId)}
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
                      {item.purposes.includes("section-current") ? (
                        <p className={s.muted}>
                          {item.purposes.includes("candidate-trigger")
                            ? "최근 상태와 확인 후보 판단에 사용"
                            : "최근 상태에 사용"}
                        </p>
                      ) : item.purposes.includes("candidate-trigger") ? (
                        <p className={s.muted}>
                          확인 후보 판단에만 사용 · 최근 상태 수치에 더하지 않음
                        </p>
                      ) : null}
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
                대조를 마친 자료가 아닙니다. 같은 개념·일부 범위·관련 개념은
                서로 구분합니다.
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
          </div>
        </>
      ) : null}
      {view || query ? (
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
            disabled={asking || loading || !!error || !view}
            aria-describedby={`${id}-query-note`}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing &&
                event.keyCode !== 229
              ) {
                event.preventDefault();
                void ask();
              }
            }}
          />
          <p id={`${id}-query-note`} className={s.muted}>
            Enter로 질문 · Shift+Enter로 줄바꿈. 500자 이내. 질문 버튼을 누르면
            AI가 위 기록과 후보에서 근거를 고릅니다. 학생의 이름·연락처·답안은
            입력하지 마세요.
          </p>
          <button
            type="submit"
            className={s.button}
            disabled={
              asking ||
              loading ||
              !!error ||
              !view ||
              !query.trim() ||
              query.trim().length > 500
            }
          >
            {asking ? "근거 확인 중…" : "AI에 근거 질문하기"}
          </button>
          {asking ? (
            <button type="button" className={s.textButton} onClick={cancel}>
              질문 취소
            </button>
          ) : null}
        </form>
      ) : null}
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
            AI가 기존 기록과 확인 후보에서 고른 내용입니다. 새로운 진단이나 학습
            판정이 아닙니다.
          </p>
          {answer.facts.map((fact, index) => (
            <div key={index}>
              <MathText text={fact.text} as="p" />
              {evidenceLinks(fact.evidenceIds, answer.snapshot)}
              {fact.candidateIds.map((key) => {
                const n = answer.snapshot.pilot.nextChecks.findIndex(
                  (item) => item.id === key,
                );
                return (
                  <a
                    className={p.candidateLink}
                    href={`#${id}-candidate-${n}`}
                    onClick={() =>
                      document
                        .getElementById(`${id}-candidate-${n}`)
                        ?.focus({ preventScroll: true })
                    }
                    key={key}
                  >
                    확인 후보 · {answer.snapshot.pilot.nextChecks[n].title}
                  </a>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

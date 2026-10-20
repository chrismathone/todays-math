import type { ReactNode } from "react";

import {
  CATALOG_SIZE,
  FORMATS,
  LESSONS,
  SCENARIOS,
  SOURCE_COUNTS,
  TIERS,
  outputReasons,
  questionsFor,
  type Scenario,
  type VariantId,
  type WireQuestion,
} from "./fixtures";
import s from "./SimpleWire.module.css";

/**
 * D-07: 흑백 구조 그림. 제품 컴포넌트·데이터·저장·통신과 연결하지 않는다.
 * 상자 속 입력/실행은 그림이며 pointer/hover/가짜 이벤트를 주지 않는다.
 * 실제 조작은 장면 이동 링크와 native details(펼침·정답·상태 예)뿐이다.
 */
function Action({
  children,
  strong,
  blocked,
}: {
  children: ReactNode;
  strong?: boolean;
  blocked?: boolean;
}) {
  return (
    <span
      className={`${s.action} ${strong ? s.primary : ""} ${blocked ? s.blocked : ""}`}
      aria-disabled={blocked || undefined}
    >
      {children}
    </span>
  );
}

function Check({
  children,
  checked = false,
  unavailable = false,
}: {
  children: ReactNode;
  checked?: boolean;
  unavailable?: boolean;
}) {
  return (
    <span className={`${s.check} ${unavailable ? s.muted : ""}`}>
      <span className={checked ? s.checked : s.checkBox} aria-hidden="true">
        {checked ? "✓" : ""}
      </span>
      {children}
    </span>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${s.panel} ${className}`}>
      <h4>{title}</h4>
      {children}
    </section>
  );
}

function Steps({ step }: { step: 1 | 2 }) {
  return (
    <ol className={s.steps} aria-label="시안의 제작 단계">
      {["범위 설정", "문항 검토", "양식 구성·출력"].map((label, index) => {
        return (
          <li
            key={label}
            aria-current={step === index + 1 ? "step" : undefined}
          >
            <span>{index + 1}</span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

function Sheet({
  scenario,
  step,
  children,
}: {
  scenario: Scenario;
  step: 1 | 2;
  children: ReactNode;
}) {
  return (
    <figure
      className={s.figure}
      id={`${scenario.id}-${step}`}
      data-wire-screen={`${scenario.id}-${step}`}
    >
      <figcaption>
        {scenario.id} · {step}단계 — {step === 1 ? "범위 설정" : "문항 검토"}
        <span>
          독립 상태 예 ·{" "}
          {step === 1
            ? `${scenario.target}문항 지정`
            : `${questionsFor(scenario).length}문항 담음`}
        </span>
      </figcaption>
      <div className={s.screen}>
        <header className={s.screenHead}>
          <h3>시험지 만들기</h3>
          <Steps step={step} />
        </header>
        {children}
      </div>
    </figure>
  );
}

function SavedConditions() {
  return (
    <details className={s.disclosure}>
      <summary>저장한 조건 · 3</summary>
      <div className={s.savedList}>
        {[
          [
            "초3 덧셈·뺄셈 확인",
            "초3 · 덧셈과 뺄셈 4범위",
            "40문항 · 난이도 지정 없음 · 최근 14일 출제 뺌",
          ],
          [
            "초3 나눗셈 보충",
            "초3 · 나눗셈 4범위",
            "36문항 · 기본 18 · 응용 18 · 최근 14일 출제 뺌",
          ],
          [
            "초3 1학기 마무리",
            "초3 · 덧셈과 뺄셈 외 5단원",
            "50문항 · 난이도 지정 없음 · 최근 14일 출제 뺌",
          ],
        ].map(([name, scope, detail]) => (
          <div key={name}>
            <strong>{name}</strong>
            <span>{scope}</span>
            <small>{detail}</small>
            <div className={s.row}>
              <Action>적용</Action>
              <Action>이름 바꾸기</Action>
              <Action>삭제</Action>
            </div>
            <details className={s.disclosure}>
              <summary>이 줄의 삭제 확인 예</summary>
              <p>‘{name}’ 조건을 삭제할까요?</p>
              <div className={s.row}>
                <Action>취소</Action>
                <Action>삭제</Action>
              </div>
            </details>
          </div>
        ))}
        <p className={s.small}>조건만 가져옵니다. 문항은 다시 구성합니다.</p>
        <p className={s.small}>
          적용 뒤 한 줄 · 출제 조건 — 초3 덧셈·뺄셈 확인 적용함
        </p>
      </div>
    </details>
  );
}

function TitleContext() {
  return (
    <div className={s.titleContext}>
      <div className={s.field}>
        <span>제목</span>
        <span className={s.input}>3학년 덧셈과 뺄셈 확인</span>
      </div>
      <SavedConditions />
      <span className={s.small}>출제 조건 · 직접 정함</span>
    </div>
  );
}

function GradeFilters({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${s.filters} ${compact ? s.compactFilters : ""}`}>
      <div className={s.field}>
        <span>학교급</span>
        <div className={s.segments}>
          <span className={s.selected}>초등</span>
          <span>중등</span>
          <span>고등</span>
        </div>
      </div>
      <div className={s.field}>
        <span>학년·과정</span>
        <span className={s.input}>초3 ▾</span>
      </div>
      <div className={s.field}>
        <span>학기</span>
        <div className={s.segments}>
          <span>전체 학기</span>
          <span className={s.selected}>1학기</span>
          <span>2학기</span>
        </div>
      </div>
      <div className={`${s.field} ${s.grow}`}>
        <span>범위 검색</span>
        <span className={`${s.input} ${s.muted}`}>
          단원·차시·자료 이름으로 검색
        </span>
      </div>
    </div>
  );
}

function TextbookSelection() {
  return (
    <div className={s.bookChoice}>
      <span className={s.input}>초3 · 초등학교 수학 3-1 ▾</span>
      <span className={s.input}>자료 종류 · 전체 ▾</span>
      <span className={s.small}>
        책·자료 종류를 바꿔도 고른 범위는 확인 후 유지합니다.
      </span>
    </div>
  );
}

function OtherSources() {
  return (
    <details className={s.disclosure}>
      <summary>추가 출처 · 엔진·기출·그 밖</summary>
      <div className={s.row}>
        <Action>엔진만</Action>
        <Action>기출만</Action>
        <Action>그 밖만</Action>
        <Action>전체로 풀기</Action>
      </div>
    </details>
  );
}

function SourceSelection({ variant }: { variant: VariantId }) {
  if (variant === "A")
    return (
      <div className={s.sourceBlock}>
        <b>출처</b>
        <div className={s.segments}>
          <span className={s.selected}>전체 출처</span>
          <span>교과서만</span>
        </div>
        <details className={s.disclosure}>
          <summary>교과서만 고를 때의 책·자료 선택</summary>
          <TextbookSelection />
        </details>
        <OtherSources />
      </div>
    );
  if (variant === "B")
    return (
      <div className={s.sourceBlock}>
        <div className={s.field}>
          <span>출처</span>
          <span className={s.input}>교과서 ▾</span>
        </div>
        <TextbookSelection />
        <p className={s.small}>
          출처 선택: 전체 · 엔진 · 교과서 · 기출 · 그 밖
        </p>
      </div>
    );
  if (variant === "C")
    return (
      <div className={s.sourceBlock}>
        <div className={s.row}>
          <b>전체 출처</b>
          <span className={s.muted}>
            출처를 고르지 않아도 범위로 시작합니다.
          </span>
        </div>
        <details className={s.disclosure}>
          <summary>출처 제한</summary>
          <div className={s.row}>
            <Action>전체</Action>
            <Action>엔진</Action>
            <Action strong>교과서</Action>
            <Action>기출</Action>
            <Action>그 밖</Action>
          </div>
          <TextbookSelection />
        </details>
      </div>
    );
  return (
    <div className={s.sourceBlock}>
      <div className={s.startPaths}>
        <div>
          <Action>범위로 시작</Action>
          <small>학년·단원을 바로 고릅니다.</small>
        </div>
        <div>
          <Action strong>교과서로 시작</Action>
          <small>책을 고른 뒤 단원을 고릅니다.</small>
        </div>
      </div>
      <div className={s.row}>
        <b>교과서 · 초등학교 수학 3-1 · 자료 종류 전체</b>
        <Action>책 변경</Action>
      </div>
      <details className={s.disclosure}>
        <summary>범위로 시작할 때의 출처</summary>
        <div className={s.row}>
          <Action strong>전체</Action>
          <Action>엔진</Action>
          <Action>기출</Action>
          <Action>그 밖</Action>
        </div>
      </details>
    </div>
  );
}

function RangeTree({ narrow = false }: { narrow?: boolean }) {
  const chapters = [...new Set(LESSONS.map((lesson) => lesson.chapter))];
  return (
    <div className={s.rangeTree}>
      <div className={s.listMeta}>
        <b>전체 범위 {CATALOG_SIZE}개</b>
        <span>초3 · 1학기 · 20개 표시 · 4개 선택</span>
      </div>
      <div className={s.row}>
        <Check>담은 범위만 보기</Check>
        <Action>선택 비우기</Action>
      </div>
      {chapters.map((chapter, index) => (
        <details className={s.chapter} key={chapter} open={index === 0}>
          <summary>
            <span>{chapter}</span>
            <span>
              {LESSONS.filter((l) => l.chapter === chapter).length}범위
              {index === 0 ? " · 4개 선택" : ""}
            </span>
          </summary>
          <ul>
            {LESSONS.filter((lesson) => lesson.chapter === chapter).map(
              (lesson) => (
                <li key={lesson.id}>
                  <Check
                    checked={lesson.chapter === chapters[0]}
                    unavailable={!lesson.available}
                  >
                    <span>
                      <small>{lesson.id}</small>
                      {lesson.name}
                    </span>
                  </Check>
                  <span className={s.availability}>
                    {lesson.available
                      ? `${lesson.available}문항 가능`
                      : "출제 가능 문항 없음"}
                  </span>
                </li>
              ),
            )}
          </ul>
        </details>
      ))}
      <div className={s.pagination}>
        <Action>이전 범위</Action>
        <span>{narrow ? "1 / 2" : "1–20 / 29범위"}</span>
        <Action>다음 범위</Action>
      </div>
      <p className={s.small}>
        가능 수는 선택한 범위의 수입니다. 최근 14일 출제를 뺀 예입니다.
      </p>
    </div>
  );
}

function CountField({ scenario }: { scenario: Scenario }) {
  return (
    <div className={s.countField}>
      <div className={s.row}>
        <b>총 문항</b>
        <span className={s.numberInput}>{scenario.target}</span>
        <span>문항</span>
      </div>
      <div className={s.presets}>
        {[25, 50, 75, 100].map((count) => (
          <span
            className={scenario.target === count ? s.selected : ""}
            key={count}
          >
            {count}
          </span>
        ))}
      </div>
      <div
        className={s.ruler}
        aria-label={`총 문항 ${scenario.target}, 최대 100`}
      >
        <span style={{ left: `${scenario.target}%` }} />
      </div>
      <div className={s.rulerLabels}>
        <span>1문항</span>
        <span>최대 100문항</span>
      </div>
    </div>
  );
}

function ConditionsFields({ scenario }: { scenario: Scenario }) {
  return (
    <div className={s.conditionsFields}>
      <CountField scenario={scenario} />
      <div className={s.field}>
        <b>난이도</b>
        <span className={s.small}>현재 지정 없음</span>
        <div className={s.tierSteps}>
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <span key={step}>{step}단계</span>
          ))}
          <span>직접</span>
        </div>
        <div className={s.tierInputs}>
          {TIERS.map((tier) => (
            <span key={tier}>
              {tier}
              <b>–</b>
            </span>
          ))}
        </div>
      </div>
      <div className={s.field}>
        <b>형식별 수</b>
        <div className={s.formatInputs}>
          {FORMATS.map((format, i) => (
            <span key={format}>
              {format}
              <b>{scenario.requestedFormats?.[i] ?? "–"}</b>
            </span>
          ))}
        </div>
        <small>– 지정 없음 · 0 내지 않음</small>
      </div>
      <Check checked>객관식을 앞에</Check>
      <Check checked>최근 14일 출제 빼기</Check>
      <Check checked>같은 문항류는 하나만</Check>
    </div>
  );
}

function QuickConditions({ scenario }: { scenario: Scenario }) {
  return (
    <div className={s.conditionsFields}>
      <CountField scenario={scenario} />
      <div className={s.field}>
        <b>난이도 · 지정 없음</b>
        <div className={s.tierSteps}>
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <span key={step}>{step}단계</span>
          ))}
          <span>직접</span>
        </div>
      </div>
      <details className={s.disclosure}>
        <summary>난이도별 수·형식별 수</summary>
        <div className={s.quotaDetail}>
          <b>난이도별 수</b>
          <div className={s.tierInputs}>
            {TIERS.map((tier) => (
              <span key={tier}>
                {tier}
                <b>–</b>
              </span>
            ))}
          </div>
          <b>형식별 수</b>
          <div className={s.formatInputs}>
            {FORMATS.map((format, i) => (
              <span key={format}>
                {format}
                <b>{scenario.requestedFormats?.[i] ?? "–"}</b>
              </span>
            ))}
          </div>
          <small>– 지정 없음 · 0 내지 않음</small>
        </div>
      </details>
      <Check checked>최근 14일 출제 빼기</Check>
      <details className={s.disclosure}>
        <summary>추가 선택 · 2개 켬</summary>
        <div className={s.quotaDetail}>
          <Check checked>객관식을 앞에</Check>
          <Check checked>같은 문항류는 하나만</Check>
        </div>
      </details>
    </div>
  );
}

function AllocationRows({ scenario }: { scenario: Scenario }) {
  return (
    <div className={s.tableScroll}>
      <table className={`${s.table} ${s.allocationTable}`}>
        <thead>
          <tr>
            <th>선택한 출제 범위</th>
            <th>구성 수</th>
            <th>배분</th>
          </tr>
        </thead>
        <tbody>
          {LESSONS.slice(0, 4).map((lesson, index) => (
            <tr key={lesson.id}>
              <td>
                <small>{lesson.id}</small>
                {lesson.name}
              </td>
              <td>
                <span className={s.quantity}>
                  − <b>{scenario.requestedRows[index]}</b> ＋
                </span>
              </td>
              <td>
                {index === 0 ? "고정 · 풀기" : "자동 · 고정"}
                <span className={s.remove}>제거</span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th>합계</th>
            <td>{scenario.target}문항</td>
            <td>4범위</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function ConditionSummary({ scenario }: { scenario: Scenario }) {
  return (
    <div className={s.collapsedConditions}>
      <span>
        총 {scenario.target}문항 · 난이도 지정 없음 ·{" "}
        {scenario.requestedFormats ? "형식 지정 있음" : "형식 지정 없음"}
      </span>
      <Action>구성 조건</Action>
    </div>
  );
}

function ConditionDialogExample({ scenario }: { scenario: Scenario }) {
  return (
    <details className={`${s.disclosure} ${s.conditionExample}`}>
      <summary>유지하는 구성 조건 창 · 조건과 배정 미리보기</summary>
      <p className={s.small}>
        화면 안의 ‘구성 조건’으로 여는 넓은 창의 배치입니다. 좁은 화면에서는 두
        칸을 쌓습니다.
      </p>
      <div className={s.conditionDialog}>
        <div>
          <h4>구성 조건</h4>
          <ConditionsFields scenario={scenario} />
        </div>
        <div>
          <h4>적용하면 구성할 수</h4>
          <AllocationRows scenario={scenario} />
          <p>고정이 아닌 행만 다시 나눕니다.</p>
          <p className={s.small}>
            모자란 범위는 다른 범위에서 채우지 않습니다.
          </p>
          <div className={s.row}>
            <Action>취소</Action>
            <Action strong>적용</Action>
          </div>
        </div>
      </div>
    </details>
  );
}

function ScopeFooter({ scenario }: { scenario: Scenario }) {
  return (
    <footer className={s.scopeFooter}>
      <div>
        <strong>문항 {scenario.target}개 · 범위 4개</strong>
        <small>조건을 정했으면 문항을 구성합니다.</small>
      </div>
      <div className={s.row}>
        <Action>조건 저장</Action>
        <Action strong>문항 검토 →</Action>
      </div>
    </footer>
  );
}

function ScopeScreen({ scenario }: { scenario: Scenario }) {
  const id = scenario.id;
  return (
    <Sheet scenario={scenario} step={1}>
      <TitleContext />
      {id === "A" ? (
        <div className={s.scopeA}>
          <Panel title="출제할 범위">
            <GradeFilters />
            <SourceSelection variant={id} />
            <RangeTree />
            <details className={s.disclosure}>
              <summary>선택한 범위별 수·고정 · 4범위</summary>
              <AllocationRows scenario={scenario} />
            </details>
          </Panel>
          <aside className={s.rail}>
            <Panel title="이번 시험지의 조건">
              <QuickConditions scenario={scenario} />
              <ScopeFooter scenario={scenario} />
            </Panel>
          </aside>
        </div>
      ) : id === "B" ? (
        <>
          <div className={s.scopeB}>
            <Panel title="범위 고르기">
              <GradeFilters compact />
              <SourceSelection variant={id} />
              <RangeTree />
            </Panel>
            <Panel title="선택한 범위 · 4개">
              <p className={s.small}>
                왼쪽에서 체크하면 이 구성표에 바로 들어갑니다.
              </p>
              <ConditionSummary scenario={scenario} />
              <AllocationRows scenario={scenario} />
              <p className={s.small}>
                최근 14일 출제 뺌 · 고정 1행 · 나머지 자동 배분
              </p>
              <ScopeFooter scenario={scenario} />
            </Panel>
          </div>
        </>
      ) : id === "C" ? (
        <div className={s.scopeC}>
          <Panel title="학년과 학기">
            <GradeFilters />
            <SourceSelection variant={id} />
          </Panel>
          <Panel title="출제할 범위">
            <RangeTree />
            <details className={s.disclosure}>
              <summary>선택한 4범위의 수·고정</summary>
              <AllocationRows scenario={scenario} />
            </details>
          </Panel>
          <Panel title="문항 수와 추가 조건">
            <div className={s.horizontalConditions}>
              <CountField scenario={scenario} />
              <div>
                <p>난이도 지정 없음 · 객관식 24 · 단답형 20 · 서술형 6</p>
                <Check checked>최근 14일 출제 빼기</Check>
                <Check checked>같은 문항류는 하나만</Check>
                <ConditionSummary scenario={scenario} />
              </div>
            </div>
          </Panel>
          <ScopeFooter scenario={scenario} />
        </div>
      ) : (
        <>
          <SourceSelection variant={id} />
          <div className={s.scopeD}>
            <Panel title="범위 찾기">
              <GradeFilters compact />
              <RangeTree narrow />
            </Panel>
            <Panel title="이 시험지에 담은 범위">
              <p>초3 · 1학기 · 덧셈과 뺄셈</p>
              <AllocationRows scenario={scenario} />
              <p className={s.small}>
                체크 즉시 담깁니다. 범위별 수와 고정을 이 자리에서 바꿉니다.
              </p>
              <ConditionSummary scenario={scenario} />
            </Panel>
          </div>
          <div className={s.conditionDock}>
            <b>총 36문항</b>
            <span>난이도·형식 지정 없음</span>
            <Check checked>최근 14일 출제 빼기</Check>
            <Check checked>객관식을 앞에</Check>
            <Check checked>같은 문항류는 하나만</Check>
          </div>
          <ScopeFooter scenario={scenario} />
        </>
      )}
    </Sheet>
  );
}

function Distribution({ questions }: { questions: WireQuestion[] }) {
  return (
    <div className={s.distribution} aria-label="현재 문항 난이도 분포">
      {TIERS.map((tier, i) => {
        const count = questions.filter((q) => q.tier === tier).length;
        return (
          <div key={tier}>
            <span>{tier}</span>
            <span className={s.barTrack}>
              <span
                style={{ width: `${(count / questions.length) * 100}%` }}
                data-tone={i}
              />
            </span>
            <b>{count}</b>
          </div>
        );
      })}
    </div>
  );
}

function Statistics({
  questions,
  horizontal = false,
}: {
  questions: WireQuestion[];
  horizontal?: boolean;
}) {
  return (
    <section
      className={`${s.statistics} ${horizontal ? s.horizontalStats : ""}`}
      aria-label="현재 담은 문항 통계"
    >
      <div className={s.statTotal}>
        <small>담은 문항</small>
        <strong>
          {questions.length}
          <span>문항</span>
        </strong>
        <span>4범위</span>
      </div>
      <dl>
        {FORMATS.map((format) => (
          <div key={format}>
            <dt>{format}</dt>
            <dd>{questions.filter((q) => q.format === format).length}</dd>
          </div>
        ))}
      </dl>
      <Distribution questions={questions} />
    </section>
  );
}

function OrderTable({ questions }: { questions: WireQuestion[] }) {
  return (
    <div>
      <div className={s.tableScroll}>
        <table className={`${s.table} ${s.orderTable}`}>
          <thead>
            <tr>
              <th>순서</th>
              <th>형식</th>
              <th>난이도</th>
              <th>유형명·차시</th>
            </tr>
          </thead>
          <tbody>
            {questions.slice(0, 6).map((q, index) => (
              <tr key={q.id}>
                <td>
                  <span aria-hidden="true">⠿ </span>
                  {String(index + 1).padStart(2, "0")}
                </td>
                <td>{q.format}</td>
                <td>{q.tier}</td>
                <td>
                  {q.lesson.id} {q.lesson.name}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={s.pagination}>
        <Action>이전</Action>
        <span>1–6 / {questions.length}문항</span>
        <Action>다음</Action>
      </div>
      <p className={s.small}>
        손잡이로 순서를 옮깁니다. 키보드로는 위·아래 이동을 씁니다.
      </p>
    </div>
  );
}

function QuestionCard({
  question,
  index,
}: {
  question: WireQuestion;
  index: number;
}) {
  return (
    <article className={s.questionCard} data-wire-question={question.id}>
      <header>
        <strong>{String(index + 1).padStart(2, "0")}</strong>
        <span>
          {question.format} · {question.tier}
        </span>
        <div className={s.row}>
          <Action>비슷한 문항으로 교체</Action>
          <Action>빼기</Action>
        </div>
      </header>
      <p className={s.questionScope}>
        {question.lesson.id} {question.lesson.name}
      </p>
      <p className={s.questionBody}>
        {question.body}
        {question.format === "서술형" ? " 계산 과정을 쓰시오." : ""}
      </p>
      {question.format === "객관식" ? (
        <p className={s.choices}>
          {[
            question.answer - 20,
            question.answer - 10,
            question.answer,
            question.answer + 10,
            question.answer + 20,
          ].map((answer, i) => (
            <span key={answer}>
              {["①", "②", "③", "④", "⑤"][i]} {answer}
            </span>
          ))}
        </p>
      ) : (
        <div className={s.answerSpace}>풀이 공간</div>
      )}
      <footer>
        <div className={s.row}>
          <Action>위로</Action>
          <Action>아래로</Action>
        </div>
        <details className={s.answerDisclosure}>
          <summary>정답·해설 보기</summary>
          <div>
            <b>
              정답 {question.format === "객관식" ? "③ · " : ""}
              {question.answer}
            </b>
            <p>
              일의 자리부터 같은 자리끼리 계산합니다. 계산 결과는{" "}
              {question.answer}입니다.
            </p>
          </div>
        </details>
      </footer>
    </article>
  );
}

function QuestionList({ questions }: { questions: WireQuestion[] }) {
  return (
    <div className={s.questionList}>
      <div className={s.row}>
        <b>담은 문항 {questions.length}개</b>
        <Action>문항 추가</Action>
        <Action>되돌리기</Action>
      </div>
      {questions.slice(0, 3).map((q, i) => (
        <QuestionCard key={q.id} question={q} index={i} />
      ))}
      <div className={s.pagination}>
        <Action>이전 문항</Action>
        <span>1–3 / {questions.length}문항</span>
        <Action>다음 문항</Action>
      </div>
    </div>
  );
}

function ReviewContext({
  scenario,
  questions,
}: {
  scenario: Scenario;
  questions: WireQuestion[];
}) {
  return (
    <div className={s.reviewContext}>
      <div>
        <b>3학년 덧셈과 뺄셈 확인</b>
        <span>
          초3 · 1학기 · 4범위 · 총 {scenario.target}문항 지정 · 현재{" "}
          {questions.length}문항
        </span>
      </div>
      <a href={`#${scenario.id}-1`}>범위 설정 고치기</a>
    </div>
  );
}

function ReviewFooter({
  scenario,
  questions,
}: {
  scenario: Scenario;
  questions: WireQuestion[];
}) {
  const reasons = outputReasons(scenario, questions);
  return (
    <footer
      className={s.reviewFooter}
      data-output-status={reasons.length ? "blocked" : "ready"}
    >
      <div
        className={reasons.length ? s.reasonBox : s.readyBox}
        id={`reason-${scenario.id}`}
        role="status"
      >
        <b>
          {reasons.length
            ? "다음 단계로 가기 전에"
            : "정한 문항 수와 일치합니다."}
        </b>
        {reasons.length ? (
          <ul>
            {reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        ) : (
          <p>문항을 검토한 뒤 양식 구성으로 이동하세요.</p>
        )}
        {scenario.id === "A" ? (
          <div className={s.row}>
            <Action>6문항 더 담기</Action>
            <a href="#A-1">총 문항 수 바꾸기</a>
          </div>
        ) : scenario.id === "C" ? (
          <div className={s.row}>
            <Action>문항 바꾸기</Action>
            <a href="#C-1">형식별 수 바꾸기</a>
          </div>
        ) : null}
      </div>
      <div className={s.footerActions}>
        <a href={`#${scenario.id}-1`}>← 범위 설정</a>
        <strong>문항 {questions.length}개 · 범위 4개</strong>
        <span aria-describedby={`reason-${scenario.id}`}>
          <Action strong blocked={reasons.length > 0}>
            다음: 양식 구성·출력 →
          </Action>
        </span>
      </div>
    </footer>
  );
}

function ReviewScreen({ scenario }: { scenario: Scenario }) {
  const questions = questionsFor(scenario);
  return (
    <Sheet scenario={scenario} step={2}>
      <ReviewContext scenario={scenario} questions={questions} />
      {scenario.id === "A" ? (
        <>
          <p className={s.small}>
            문항 6개를 뺀 상태입니다. 처음 정한 40문항을 현재 수로 낮추지
            않습니다.
          </p>
          <div className={s.reviewA}>
            <aside className={s.reviewRail}>
              <Panel title="문항 통계와 순서">
                <Statistics questions={questions} />
                <OrderTable questions={questions} />
              </Panel>
            </aside>
            <QuestionList questions={questions} />
          </div>
          <ReviewFooter scenario={scenario} questions={questions} />
        </>
      ) : scenario.id === "B" ? (
        <>
          <div className={s.collapsedConditions}>
            <span>총 40문항 · 난이도·형식 지정 없음 · 최근 14일 출제 뺌</span>
            <details className={s.disclosure}>
              <summary>선택한 4범위 보기</summary>
              <AllocationRows scenario={scenario} />
            </details>
          </div>
          <Statistics questions={questions} horizontal />
          <QuestionList questions={questions} />
          <ReviewFooter scenario={scenario} questions={questions} />
        </>
      ) : scenario.id === "C" ? (
        <>
          <Statistics questions={questions} horizontal />
          <Panel title="문항 순서표">
            <OrderTable questions={questions} />
          </Panel>
          <QuestionList questions={questions} />
          <ReviewFooter scenario={scenario} questions={questions} />
        </>
      ) : (
        <div className={s.reviewD}>
          <section className={s.groupedQuestions} aria-label="차시별 문항 검토">
            <div className={s.row}>
              <b>차시별 검토 · 4범위</b>
              <Action>문항 추가</Action>
              <Action>되돌리기</Action>
            </div>
            {LESSONS.slice(0, 4).map((lesson) => {
              const group = questions.filter((q) => q.lesson.id === lesson.id);
              const first = group[0];
              return (
                <section className={s.questionGroup} key={lesson.id}>
                  <h4>
                    {lesson.id} {lesson.name}
                    <small>{group.length}문항</small>
                  </h4>
                  <QuestionCard
                    question={first}
                    index={questions.indexOf(first)}
                  />
                  <div className={s.row}>
                    <span>이 차시 1 / {group.length}문항</span>
                    <Action>나머지 {group.length - 1}문항 보기</Action>
                  </div>
                </section>
              );
            })}
          </section>
          <aside className={s.reviewRail}>
            <Panel title="현재 구성">
              <Statistics questions={questions} />
              <ReviewFooter scenario={scenario} questions={questions} />
            </Panel>
          </aside>
        </div>
      )}
    </Sheet>
  );
}

function LoadingExample({ variant }: { variant: VariantId }) {
  const location = {
    A: "교과서만 아래의 책 선택 영역",
    B: "범위 칸 안의 책·자료 목록",
    C: "출처 제한을 펼친 영역",
    D: "교과서 전용 책 고르기 창",
  }[variant];
  return (
    <details className={s.loadingExample}>
      <summary>{variant} · 출처·범위·문항의 대기/실패 배치 보기</summary>
      <div className={s.loadingExamples}>
        <div>
          <b>{location}</b>
          <div className={s.sourceLoading}>
            {variant === "D" ? (
              <div className={s.loadingColumns} aria-hidden="true">
                <span>과목</span>
                <span>책</span>
                <span>자료 종류</span>
              </div>
            ) : null}
            <div className={s.centeredLoading} role="status">
              <span className={s.loadingGlyph} aria-hidden="true" />
              <b>교과서 목록을 불러오는 중입니다.</b>
              <span>선택한 범위는 유지됩니다.</span>
            </div>
          </div>
          <p className={s.small}>
            내용 칸의 가로·세로 중앙. 제목·닫기는 제자리, 목록 높이 확보.
          </p>
        </div>
        <div>
          <b>범위 목록</b>
          <div className={s.loadingRow} role="status">
            <span className={s.loadingGlyph} aria-hidden="true" />
            범위를 불러오는 중입니다.
          </div>
          <b>문항 추가·교체 후보</b>
          <div className={s.loadingRow} role="status">
            <span className={s.loadingGlyph} aria-hidden="true" />
            문항을 불러오는 중입니다.
          </div>
          <div className={s.failureBox}>
            <b>목록을 불러오지 못했습니다.</b>
            <p>선택한 범위와 문항은 유지됩니다.</p>
            <Action>다시 불러오기</Action>
          </div>
        </div>
      </div>
    </details>
  );
}

function ReplacementExample() {
  return (
    <details className={s.disclosure}>
      <summary>유지하는 교체 창 · 원문과 후보 대조 배치</summary>
      <div className={s.replacement}>
        <div>
          <h4>07번 원문</h4>
          <p>231 + 142를 계산하시오.</p>
          <hr />
          <h4>선택한 후보와 대조</h4>
          <p>241 + 152를 계산하시오.</p>
          <small>바뀐 수 · 231 → 241 · 142 → 152</small>
        </div>
        <div>
          <h4>교체 후보</h4>
          <div className={s.row}>
            <Action strong>같은 문항류</Action>
            <Action>같은 차시의 다른 문항</Action>
          </div>
          <p>후보 1 · 객관식 · 기본</p>
          <p>241 + 152를 계산하시오.</p>
          <Action strong>이 문항으로 교체</Action>
          <p className={s.small}>
            자리·순서를 유지하고 되돌릴 수 있습니다. 지정 복습 변형은 별도로
            둡니다.
          </p>
        </div>
      </div>
    </details>
  );
}

function ProposalNotes({ scenario }: { scenario: Scenario }) {
  return (
    <div className={s.proposalNotes}>
      <dl>
        <div>
          <dt>보유 수 줄</dt>
          <dd>
            작업 화면에서 뺍니다. 공용 풀의 수는 아래 ‘출처 판단 근거’에만
            둡니다. 선택 범위의 가능 수와 담은 수는 남깁니다.
          </dd>
        </div>
        <div>
          <dt>출처 고르기</dt>
          <dd>{scenario.sourceIdea}</dd>
        </div>
        <div>
          <dt>장점</dt>
          <dd>{scenario.sourceBenefit}</dd>
        </div>
        <div>
          <dt>대가</dt>
          <dd>{scenario.sourceCost}</dd>
        </div>
        <div>
          <dt>막힌 까닭</dt>
          <dd>
            {scenario.id === "D"
              ? "오른쪽 다음 버튼 바로 위"
              : "검토 하단의 다음 버튼 바로 위"}
            에 원인과 가능한 해결 행동을 함께 둡니다. 비활성 버튼만 단독으로
            놓지 않습니다.
          </dd>
        </div>
        <div className={s.changeNote}>
          <dt>바뀌는 것</dt>
          <dd>
            {scenario.changes} 이번 비교의 제안이며 제품에는 적용하지 않습니다.
          </dd>
        </div>
      </dl>
      <LoadingExample variant={scenario.id} />
      <ConditionDialogExample scenario={scenario} />
      <ReplacementExample />
    </div>
  );
}

const BLOCKED_STATES = [
  [
    "2 → 3 · 문항 없음",
    "담은 문항이 없습니다. 범위를 정하고 문항을 구성해 주세요.",
    "범위 설정으로",
  ],
  [
    "2 → 3 · 준비 중",
    "출력할 문항을 확인하는 중입니다. 확인이 끝나면 다음 단계로 이동합니다.",
    "확인 중…",
  ],
  ["1 → 2 · 범위 없음", "출제할 범위를 한 개 이상 골라 주세요.", "범위 고르기"],
  [
    "1 → 2 · 수 미확인",
    "출제 가능 수를 확인하는 중입니다. 확인이 끝나면 문항을 구성할 수 있습니다.",
    "확인 중…",
  ],
  [
    "1 → 2 · 범위 부족",
    "이 범위는 8문항을 고를 수 있는데 10문항으로 정했습니다. 문항 수를 줄여 주세요.",
    "구성 수 바꾸기",
  ],
  [
    "1 → 2 · 합 불일치",
    "난이도 합(34)이 총 문항(40)과 다릅니다. 수를 맞추거나 한 칸을 ‘–’로 비우세요.",
    "구성 조건",
  ],
  [
    "누른 뒤 확인 실패",
    "출력할 문항을 확인하지 못했습니다. 담은 문항은 유지됩니다. 다시 확인해 주세요.",
    "다시 확인",
  ],
] as const;

export function SimpleWire() {
  return (
    <main className={s.shell}>
      <header className={s.intro}>
        <p className={s.eyebrow}>오늘의 수학 · 시험지 만들기 · D-07 / Wire</p>
        <h1>시험지 만들기, 간단하게</h1>
        <p>
          서로 다른 네 가지 짜임입니다. 안마다 범위 설정·문항 검토 두 장을
          비교합니다.
        </p>
        <p className={s.small}>
          흑백 구조 그림입니다. 상자 안의 입력·실행은 그림이며, 장면 이동과
          펼침만 동작합니다. 문항·수·상태는 독립 픽스처로 저장하거나 호출하지
          않습니다. 3단계는 기존 양식 구성·출력을 유지합니다.
        </p>
        <nav className={s.jump} aria-label="Wire 안별 이동">
          {SCENARIOS.map((scenario) => (
            <a key={scenario.id} href={`#option-${scenario.id}`}>
              {scenario.id} · {scenario.title}
            </a>
          ))}
          <a href="#states">다른 차단 상태</a>
        </nav>
        <details className={s.disclosure}>
          <summary>기존 선택에서 유지하는 것</summary>
          <ul className={s.preserved}>
            <li>
              범위 설정과 문항 검토는 별도 화면입니다. 체크하면 구성표에 바로
              반영합니다.
            </li>
            <li>
              W3 B / Hi-fi 1: 원문·후보 대조, 명시적 교체, 자리·순서·되돌리기를
              유지합니다.
            </li>
            <li>
              W4 D / Hi-fi 2: 구성 조건은 한 줄 요약에서 열고 조건과 배정
              미리보기를 나란히 둡니다. A에서 빠른 조작을 꺼내는 제안은 따로
              적었습니다.
            </li>
            <li>
              W5 B / Hi-fi 1+4: 이름 붙인 조건과 적용한 조건 한 줄을 유지합니다.
              v1은 문항·양식·형식·차례를 저장하지 않습니다.
            </li>
            <li>
              난이도 1~6단계·직접, 실제 사다리 여섯 칸, 객관식·단답형·서술형을
              유지합니다.
            </li>
            <li>
              최근 14일 출제 빼기·같은 문항류 하나·객관식 먼저는 켬입니다. 총
              문항·난이도는 첫 진입 시 지정 없음이며, 이 그림의 36·40·50문항은
              이미 정한 상태 예입니다.
            </li>
            <li>
              정답·해설은 처음에 접혀 있습니다. 로딩은 해당 목록 안에, 실패는
              선택을 보존하는 안내로 둡니다.
            </li>
          </ul>
        </details>
      </header>
      {SCENARIOS.map((scenario) => (
        <section
          key={scenario.id}
          className={s.option}
          id={`option-${scenario.id}`}
          data-wire-option={scenario.id}
        >
          <header className={s.optionHead}>
            <p>{scenario.id}안</p>
            <div>
              <h2>{scenario.title}</h2>
              <p>{scenario.idea}</p>
              <p className={s.small}>
                <b>약점</b> · {scenario.weakness}
              </p>
            </div>
            <nav className={s.row} aria-label={`${scenario.id}안 장면 이동`}>
              <a href={`#${scenario.id}-1`}>1 범위 설정</a>
              <a href={`#${scenario.id}-2`}>2 문항 검토</a>
            </nav>
          </header>
          <ScopeScreen scenario={scenario} />
          <ReviewScreen scenario={scenario} />
          <ProposalNotes scenario={scenario} />
        </section>
      ))}
      <section id="source-evidence" className={s.appendix}>
        <h2>출처 판단 근거</h2>
        <p>
          2026-10-18 지시서의 관측값입니다. 현재 고른 범위의 출제 가능 수를
          뜻하지 않습니다.
        </p>
        <div className={s.sourceEvidence}>
          {SOURCE_COUNTS.map((source) => (
            <div key={source.label}>
              <span>{source.label}</span>
              <b>{source.count.toLocaleString("ko-KR")}문항</b>
            </div>
          ))}
        </div>
        <p className={s.small}>
          이 수는 네 안의 장단을 비교하는 근거에만 씁니다. 제작 화면의 보유 수
          줄은 네 안 모두 제거했습니다.
        </p>
      </section>
      <section id="states" className={s.appendix}>
        <h2>다른 차단 상태의 문구와 자리</h2>
        <p>
          원인·해결 행동은 다음 버튼과 같은 영역에 둡니다. A의 총수 불일치, C의
          형식 불일치, D의 권한 제한에 더해 아래 상태를 구분합니다.
        </p>
        <div className={s.stateGrid}>
          {BLOCKED_STATES.map(([title, message, action]) => (
            <div key={title} className={s.stateCard}>
              <h3>{title}</h3>
              <p>{message}</p>
              <div className={s.row}>
                <Action blocked={title !== "누른 뒤 확인 실패"}>
                  {title.startsWith("1")
                    ? "문항 검토 →"
                    : "다음: 양식 구성·출력 →"}
                </Action>
                <Action blocked={action === "확인 중…"}>{action}</Action>
              </div>
            </div>
          ))}
        </div>
        <p className={s.small}>
          누른 뒤의 통신·출제 가능 여부 확인 실패는 문항 검토에 오류로 남깁니다.
          저장 성공을 다음 단계의 조건으로 새로 붙이지 않습니다. 세부 차단 식과
          조건 창의 적용 제한은 작업 보고서에 코드 위치와 함께 기록합니다.
        </p>
      </section>
      <footer className={s.endNote}>
        Wire A–D · 1·2단계 8장 · 구조 선택 전 · 제품 코드 변경 없음
      </footer>
    </main>
  );
}

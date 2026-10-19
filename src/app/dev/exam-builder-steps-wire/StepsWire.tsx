import type { ReactNode } from "react";

import s from "./StepsWire.module.css";

/**
 * 시험지 만들기 1 · 2단계 분리 Wire — 네 안 (원장님 2026-10-17 «1단계와 2단계를 완전히 분리된 화면이었으면»).
 *
 * 지금은 한 화면(왼쪽 «시험지 설정» · 오른쪽 «문항 검토»)이고 단계 줄만 1 · 2 로 바뀐다. 안끼리 다른 것은
 * **1단계 화면에 무엇을 두나**와 **2단계에서 1단계 내용을 얼마나 보이나**다. 3단계(양식 구성 · 출력)는 그대로다.
 * 지어낸 작은 픽스처다. 아무것도 저장 · 호출하지 않는다. 그림 속 단추는 누를 수 없다.
 */

const RANGES = [
  ["1-1-1 받아올림이 없는, 한 번 있는 (세 자리 수)+(세 자리 수)", 10, "고정"],
  ["1-1-2 받아올림이 두 번, 세 번 있는 (세 자리 수)+(세 자리 수)", 5, "고정"],
  ["1-1-3 받아내림이 없는, 한 번 있는 (세 자리 수)-(세 자리 수)", 5, "고정"],
  ["1-1-4 받아내림이 두 번 있는 (세 자리 수)-(세 자리 수)", 5, "자동"],
] as const;

function Btn({ children, strong }: { children: ReactNode; strong?: boolean }) {
  return (
    <span className={[s.btn, strong ? s.btnStrong : ""].join(" ")}>
      {children}
    </span>
  );
}
function Added({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className={s.added}>
      {label ? <span className={s.addedLabel}>{label}</span> : null}
      {children}
    </div>
  );
}

function StepBar({ on }: { on: 1 | 2 }) {
  return (
    <div className={s.stepBar}>
      <span className={s.frameTitle}>시험지 만들기</span>
      <span className={on === 1 ? s.stepOn : s.stepOff}>1 범위 설정</span>
      <span className={on === 2 ? s.stepOn : s.stepOff}>2 문항 검토</span>
      <span className={s.stepOff}>3 양식 구성·출력</span>
      <span className={s.spacer} />
      {on === 1 ? (
        <Btn strong>문항 구성 →</Btn>
      ) : (
        <Btn strong>다음: 양식 구성·출력 →</Btn>
      )}
    </div>
  );
}

function Frame({ step, children }: { step: 1 | 2; children: ReactNode }) {
  return (
    <div className={s.scrollX}>
      <p className={s.frameLabel}>
        {step === 1 ? "1단계 화면" : "2단계 화면"} · 작업실 본문 1040
      </p>
      <div className={s.teacher}>
        <StepBar on={step} />
        {children}
      </div>
    </div>
  );
}

function Conditions() {
  return (
    <div className={s.box}>
      <div className={s.fieldRow}>
        <span className={s.fieldLabel}>제목</span>
        <span className={s.select}>3학년 덧셈과 뺄셈 확인</span>
      </div>
      <div className={s.fieldRow}>
        <span className={s.fieldLabel}>출제 조건</span>
        <span>직접 정함 — 저장한 조건을 쓰지 않음</span>
        <span className={s.spacer} />
        <Btn>저장한 조건 · 0</Btn>
      </div>
    </div>
  );
}

function CompositionTable() {
  return (
    <div className={s.box}>
      <div className={s.fieldRow}>
        <span className={s.muted}>
          행의 합 25문항 · 난이도 지정 없음 · 최근 14일 출제 뺌 · 고정 3행
        </span>
        <span className={s.spacer} />
        <Btn>구성 조건</Btn>
      </div>
      <table className={s.table}>
        <thead>
          <tr>
            <th>선택한 출제 범위</th>
            <th>구성 수</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {RANGES.map(([name, n, mode]) => (
            <tr key={name}>
              <td>{name}</td>
              <td>− {n} +</td>
              <td>
                {mode} {mode === "고정" ? "· 풀기" : ""} · 제거
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        <b>합계 25문항</b>{" "}
        <span className={s.muted}>
          고정이 아닌 행은 총 문항에 맞춰 다시 나눕니다.
        </span>
      </p>
    </div>
  );
}

function ReviewList({ compact }: { compact?: boolean }) {
  return (
    <div className={s.box}>
      <div className={s.fieldRow}>
        <b>문항 검토 · 25문항</b>
        <span className={s.spacer} />
        <Btn>순서 바꾸기</Btn>
      </div>
      {RANGES.slice(0, compact ? 2 : 3).map(([name], gi) => (
        <div key={name}>
          <p className={s.muted}>{name}</p>
          {[1, 2].map((n) => (
            <div className={s.qRow} key={n}>
              <span>{String(gi * 2 + n).padStart(2, "0")}</span>
              <span>문항 본문 미리 보기 · 난이도 · 코드</span>
              <Btn>교체</Btn>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Option({
  id,
  title,
  step1,
  step2,
  pro,
  con,
  children,
}: {
  id: string;
  title: string;
  step1: string;
  step2: string;
  pro: string;
  con: string;
  children: ReactNode;
}) {
  return (
    <section className={s.option} id={id}>
      <h3 className={s.h3}>{title}</h3>
      <dl className={s.caption}>
        <dt>1단계</dt>
        <dd>{step1}</dd>
        <dt>2단계</dt>
        <dd>{step2}</dd>
        <dt>좋은 점</dt>
        <dd>{pro}</dd>
        <dt>대가</dt>
        <dd>{con}</dd>
      </dl>
      {children}
    </section>
  );
}

/* ───────────── 네 안 ───────────── */

function OptionA() {
  return (
    <Option
      id="a"
      title="A안 — 지금 왼쪽 칸을 넓게 펴서 1단계, 문항 목록을 넓게 펴서 2단계"
      step1="제목 · 출제 조건 · 출제 범위(범위 변경 창) · 구성표가 화면 폭 전체. 문항 목록은 보이지 않는다."
      step2="문항 목록이 화면 폭 전체. 맨 위에 1단계 요약 한 줄 «범위 4 · 25문항 · 구성 조건» + «범위 설정 고치기»."
      pro="지금 부품을 그대로 쓰고 배치만 바꾼다. 두 화면이 확실히 다르다."
      con="범위 고르기는 지금처럼 창으로 연다 — 1단계 안에서 한 번 더 창이 뜬다."
    >
      <div className={s.pair}>
        <Frame step={1}>
          <Conditions />
          <div className={s.box}>
            <div className={s.fieldRow}>
              <b>출제 범위</b>{" "}
              <span className={s.muted}>
                4개 선택 · 1-1-1 받아올림이 없는… 외 3
              </span>
              <span className={s.spacer} />
              <Btn>범위 변경</Btn>
            </div>
          </div>
          <CompositionTable />
        </Frame>
        <Frame step={2}>
          <Added label="1단계 요약">
            <div className={s.summaryBar}>
              범위 4개 · 25문항 · 난이도 지정 없음 · 최근 14일 출제 뺌
              <span className={s.spacer} />
              <Btn>범위 설정 고치기</Btn>
            </div>
          </Added>
          <ReviewList />
        </Frame>
      </div>
    </Option>
  );
}

function OptionB() {
  return (
    <Option
      id="b"
      title="B안 — 1단계는 «범위 고르기 + 구성표» 두 칸 (Claude 추천)"
      step1="왼쪽에 학년 → 단원 → 소단원 고르기(지금 «범위 변경» 창의 속을 화면에 편다), 오른쪽에 고른 범위의 구성표. 창 없이 한 화면에서 고르고 나눈다."
      step2="A안과 같다 — 문항 목록이 화면 폭 전체, 맨 위에 요약 한 줄."
      pro="«범위 설정»이라는 이름에 맞는 화면이 생긴다 — 고르면 바로 옆 구성표에 줄이 생긴다. 창을 여닫지 않는다."
      con="범위 고르기 부품(지금은 창)을 화면 안 칸으로 옮기는 일이 가장 크다."
    >
      <div className={s.pair}>
        <Frame step={1}>
          <Conditions />
          <Added label="두 칸">
            <div className={s.split}>
              <div className={s.box}>
                <b>범위 고르기</b>
                <div className={s.tree}>
                  <span>▾ 초3-1</span>
                  <span className={s.treeIndent}>▾ 1. 덧셈과 뺄셈</span>
                  {RANGES.map(([name]) => (
                    <span key={name} className={s.treeIndent}>
                      ■ {name.slice(0, 22)}…
                    </span>
                  ))}
                  <span className={s.treeIndent}>□ 1-1-5 …</span>
                  <span>▸ 초3-2</span>
                </div>
              </div>
              <CompositionTable />
            </div>
          </Added>
        </Frame>
        <Frame step={2}>
          <div className={s.summaryBar}>
            범위 4개 · 25문항 · 난이도 지정 없음
            <span className={s.spacer} />
            <Btn>범위 설정 고치기</Btn>
          </div>
          <ReviewList />
        </Frame>
      </div>
    </Option>
  );
}

function OptionC() {
  return (
    <Option
      id="c"
      title="C안 — 1단계는 차례대로 접히는 카드 셋"
      step1="① 출제 조건 → ② 출제 범위 → ③ 문항 구성. 앞 카드를 마치면 한 줄로 접히고 다음 카드가 펼쳐진다."
      step2="문항 목록이 넓게. 왼쪽 좁은 칸에 1단계 세 카드의 한 줄 요약(누르면 1단계 그 카드로)."
      pro="처음 쓰는 선생님도 차례를 놓치지 않는다. 저장한 조건을 쓰면 ① 에서 바로 ③ 으로 간다."
      con="익숙한 원장님에게는 접고 펴는 동작이 하나 늘어난다."
    >
      <div className={s.pair}>
        <Frame step={1}>
          <Added label="접힌 카드">
            <p className={s.collapsed}>
              <span className={s.cardNo}>①</span>출제 조건 — 직접 정함 · 제목
              «3학년 덧셈과 뺄셈 확인» ✓
            </p>
            <p className={s.collapsed}>
              <span className={s.cardNo}>②</span>출제 범위 — 4개 선택 ✓
            </p>
          </Added>
          <Added label="펼친 카드">
            <p>
              <span className={s.cardNo}>③</span>
              <b>문항 구성</b>
            </p>
            <CompositionTable />
          </Added>
        </Frame>
        <Frame step={2}>
          <div className={s.splitWide}>
            <ReviewList />
            <Added label="1단계 요약 칸">
              <p>① 직접 정함</p>
              <p>② 범위 4개</p>
              <p>③ 25문항 · 고정 3행</p>
              <Btn>1단계로</Btn>
            </Added>
          </div>
        </Frame>
      </div>
    </Option>
  );
}

function OptionD() {
  return (
    <Option
      id="d"
      title="D안 — 2단계 옆에 «구성 대비 실제» 칸을 둔다"
      step1="A안과 같다 — 조건 · 범위 · 구성표가 화면 폭 전체."
      step2="문항 목록 + 오른쪽 좁은 칸에 범위마다 «목표 10 · 담김 10»(교체 · 빼기로 어긋나면 표시). 범위를 고치려면 1단계로."
      pro="검토하면서 «구성대로 담겼나»를 계속 본다 — 교체 · 빼기 뒤의 어긋남이 보인다."
      con="2단계에 칸이 하나 더 생겨 문항 목록이 조금 좁아진다."
    >
      <div className={s.pair}>
        <Frame step={1}>
          <Conditions />
          <div className={s.box}>
            <div className={s.fieldRow}>
              <b>출제 범위</b> <span className={s.muted}>4개 선택</span>
              <span className={s.spacer} />
              <Btn>범위 변경</Btn>
            </div>
          </div>
          <CompositionTable />
        </Frame>
        <Frame step={2}>
          <div className={s.splitWide}>
            <ReviewList />
            <Added label="구성 대비 실제">
              {RANGES.map(([name, n], i) => (
                <p key={name}>
                  {name.slice(0, 5)} · 목표 {n} · 담김 {i === 1 ? n - 1 : n}
                  {i === 1 ? " · 1 모자람" : ""}
                </p>
              ))}
              <Btn>1단계로</Btn>
            </Added>
          </div>
        </Frame>
      </div>
    </Option>
  );
}

export function StepsWire() {
  return (
    <main className={s.shell}>
      <header className={s.head}>
        <h1 className={s.h1}>시험지 만들기 · 1 · 2단계 분리 — Wire 4안</h1>
        <p className={s.note}>
          지금은 1단계와 2단계가 같은 화면이라 «1 범위 설정»을 눌러도 달라지는
          것이 없습니다. 네 안 모두 두 단계를 다른 화면으로 나눕니다. 안끼리
          다른 것은 1단계에 무엇을 두나와 2단계에서 1단계 내용을 얼마나
          보이나입니다. 굵은 테두리가 지금 화면에 없던 부분입니다. 3단계는
          그대로입니다.
        </p>
        <nav className={s.jump}>
          <a href="#a">A안</a>
          <a href="#b">B안</a>
          <a href="#c">C안</a>
          <a href="#d">D안</a>
          <a href="#ask">여쭐 것</a>
        </nav>
        <h2 className={s.h2}>네 안이 같은 것</h2>
        <ol className={s.must}>
          <li>
            <b>1단계 → 2단계</b>는 «문항 구성 →» 하나 — 지금처럼 범위 · 구성에
            맞춰 문항을 뽑고 2단계로 넘어갑니다.
          </li>
          <li>
            <b>2단계 → 1단계</b>로 돌아가 범위 · 구성을 바꾸면, 다시 «문항 구성
            →»을 눌러야 문항이 바뀝니다. 바꾸지 않고 2단계로 돌아가면 검토하던
            문항이 그대로입니다.
          </li>
          <li>제목 · 저장한 조건 · 구성 조건 창은 지금 그대로입니다.</li>
        </ol>
      </header>

      <section className={s.topic}>
        <h2 className={s.h2}>네 안</h2>
        <OptionA />
        <OptionB />
        <OptionC />
        <OptionD />
      </section>

      <section className={s.topic} id="ask">
        <h2 className={s.h2}>원장님께 여쭐 것 (제안한 기본값)</h2>
        <table className={s.simTable}>
          <tbody>
            {(
              [
                ["화면", "A · B · C · D 가운데 하나 — 추천 B"],
                [
                  "1단계로 돌아가 범위를 바꿨을 때",
                  "다시 «문항 구성 →» — 교체 · 순서를 바꾼 문항 가운데 범위에 남은 것은 그대로 두고 모자란 자리만 채움",
                ],
                [
                  "2단계 맨 위 요약 한 줄",
                  "넣음 — «범위 설정 고치기»가 1단계로",
                ],
              ] as const
            ).map(([k, v]) => (
              <tr key={k}>
                <th scope="row">{k}</th>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

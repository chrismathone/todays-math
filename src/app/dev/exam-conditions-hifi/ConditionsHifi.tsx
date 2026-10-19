"use client";

import { useState, type ReactNode } from "react";

import c from "@/components/exam-builder/ComposeConditions.module.css";
import eb from "@/components/exam-builder/ExamBuilder.module.css";
import pd from "@/components/picker-dialog/picker-dialog.module.css";

import k from "./ConditionsHifi.module.css";

/**
 * M3 Hi-fi 4안 — Wire A(창 안에 «단계» 칩 · «형식» 칸 · «객관식을 앞에»)를 실제 창 부품 위에.
 *
 * | 안 | 바꾼 한 축 |
 * | H1 | 기준 — 단계는 칩 한 줄, 형식 · 차례는 따로 두 칸 |
 * | H2 | 단계를 «쉬움 ↔ 어려움» 이어 붙인 띠로 |
 * | H3 | 형식과 차례를 한 칸(«형식 · 차례»)으로 |
 * | H4 | 단계 칩마다 채워질 수(기본 · 응용 · 심화)를 작게 |
 *
 * 지어낸 픽스처다. 단계 → 칸 숫자는 Wire 의 «난이도 이름 맞추기» 표(25문항)와 같다.
 */

const TIERS = ["연산", "기본", "응용", "심화하", "심화중", "심화상"] as const;
const TOTAL = 25;
/** Wire `/dev/exam-conditions-wire` 의 표 — 매쓰홀릭 단계표를 우리 칸으로 옮겨 25문항에 맞춘 값. */
const STEP_LADDERS: number[][] = [
  [0, 20, 5, 0, 0, 0],
  [0, 16, 7, 2, 0, 0],
  [0, 12, 8, 5, 0, 0],
  [0, 8, 10, 7, 0, 0],
  [0, 5, 11, 7, 2, 0],
  [0, 0, 10, 10, 3, 2],
];
const FORMATS = ["객관식", "단답형", "서술형"] as const;
const ROWS = [
  { label: "닮은 도형", usable: 41, count: 5 },
  { label: "삼각형의 닮음 조건", usable: 63, count: 6 },
  { label: "평행선 사이의 선분의 길이의 비", usable: 58, count: 5 },
  { label: "삼각형의 무게중심", usable: 47, count: 5 },
  { label: "닮은 도형의 넓이의 비와 부피의 비", usable: 36, count: 4 },
];

type State = {
  step: number | null;
  ladder: (number | null)[];
  formats: (number | null)[];
  mcFirst: boolean;
};

function useConditions() {
  const [state, setState] = useState<State>({
    step: 3,
    ladder: STEP_LADDERS[3],
    formats: [18, 7, 0],
    mcFirst: true,
  });
  return {
    state,
    pickStep: (step: number | null) =>
      setState((s) => ({
        ...s,
        step,
        ladder: step === null ? s.ladder : STEP_LADDERS[step],
      })),
    setTier: (i: number, v: number | null) =>
      setState((s) => ({
        ...s,
        step: null, // 손으로 고치면 «직접»
        ladder: s.ladder.map((x, j) => (j === i ? v : x)),
      })),
    setFormat: (i: number, v: number | null) =>
      setState((s) => ({
        ...s,
        formats: s.formats.map((x, j) => (j === i ? v : x)),
      })),
    setMcFirst: (v: boolean) => setState((s) => ({ ...s, mcFirst: v })),
  };
}
type Conditions = ReturnType<typeof useConditions>;

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <span className={c.stepper}>
      <button
        type="button"
        aria-label={`${label} 하나 빼기`}
        onClick={() => onChange(value === null ? 0 : Math.max(0, value - 1))}
      >
        −
      </button>
      <input
        aria-label={label}
        inputMode="numeric"
        placeholder="–"
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "");
          onChange(v === "" ? null : Math.min(100, Number(v)));
        }}
      />
      <button
        type="button"
        aria-label={`${label} 하나 더하기`}
        onClick={() => onChange(value === null ? 1 : Math.min(100, value + 1))}
      >
        +
      </button>
    </span>
  );
}

function Cell({
  name,
  value,
  onChange,
}: {
  name: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div
      className={
        value === null
          ? c.ladderCellNone
          : value > 0
            ? c.ladderCellOn
            : c.ladderCell
      }
    >
      <span>{name}</span>
      <Stepper label={`${name} 문항 수`} value={value} onChange={onChange} />
      {value === null ? (
        <small className={c.meta}>지정 없음</small>
      ) : (
        <button
          type="button"
          className={c.noneToggle}
          onClick={() => onChange(null)}
        >
          비우기
        </button>
      )}
    </div>
  );
}

const groupOf = (l: number[]) =>
  `${l[0] + l[1]} · ${l[2]} · ${l[3] + l[4] + l[5]}`;

function StepChips({ x, mini }: { x: Conditions; mini?: boolean }) {
  return (
    <div
      className={`${k.steps} ${mini ? k.stepsMini : ""}`}
      role="group"
      aria-label="난이도 단계"
    >
      {STEP_LADDERS.map((l, i) => (
        <button
          key={i}
          type="button"
          aria-pressed={x.state.step === i}
          onClick={() => x.pickStep(i)}
        >
          {i + 1}단계
          {mini && <small>{groupOf(l)}</small>}
        </button>
      ))}
      <button
        type="button"
        aria-pressed={x.state.step === null}
        onClick={() => x.pickStep(null)}
      >
        직접
        {mini && <small>손으로</small>}
      </button>
    </div>
  );
}

function StepSegment({ x }: { x: Conditions }) {
  return (
    <div className={k.segment} role="group" aria-label="난이도 단계">
      <span>쉬움</span>
      {STEP_LADDERS.map((_, i) => (
        <button
          key={i}
          type="button"
          aria-pressed={x.state.step === i}
          onClick={() => x.pickStep(i)}
        >
          {i + 1}
        </button>
      ))}
      <span>어려움</span>
      <button
        type="button"
        className={k.direct}
        aria-pressed={x.state.step === null}
        onClick={() => x.pickStep(null)}
      >
        직접
      </button>
    </div>
  );
}

function Ladder({ x }: { x: Conditions }) {
  return (
    <div className={c.ladderGrid} role="group" aria-label="난이도별 문항 수">
      {TIERS.map((t, i) => (
        <Cell
          key={t}
          name={t}
          value={x.state.ladder[i]}
          onChange={(v) => x.setTier(i, v)}
        />
      ))}
    </div>
  );
}

function Formats({ x }: { x: Conditions }) {
  return (
    <div className={k.formatGrid} role="group" aria-label="형식별 문항 수">
      {FORMATS.map((f, i) => (
        <Cell
          key={f}
          name={f}
          value={x.state.formats[i]}
          onChange={(v) => x.setFormat(i, v)}
        />
      ))}
    </div>
  );
}

function McFirst({ x }: { x: Conditions }) {
  return (
    <label className={c.checkRow}>
      <input
        type="checkbox"
        checked={x.state.mcFirst}
        onChange={(e) => x.setMcFirst(e.target.checked)}
      />
      객관식을 앞에 — 그 안에서는 쉬운 것부터
    </label>
  );
}

function sumOf(list: (number | null)[]) {
  return list.reduce<number>((a, b) => a + (b ?? 0), 0);
}

function Right({ x }: { x: Conditions }) {
  const ladderSum = sumOf(x.state.ladder);
  const formatSum = sumOf(x.state.formats);
  const formatsSet = x.state.formats.every((v) => v !== null);
  const problems = [
    ladderSum !== TOTAL &&
      `난이도 합(${ladderSum})이 총 문항(${TOTAL})과 다릅니다.`,
    formatsSet &&
      formatSum !== TOTAL &&
      `형식 합(${formatSum})이 총 문항(${TOTAL})과 다릅니다. 한 칸을 «–»(지정 없음)로 비우거나 수를 맞추세요.`,
  ].filter(Boolean) as string[];
  return (
    <div className={c.right}>
      <p className={c.sectionLabel}>적용하면 이렇게 나뉩니다</p>
      <table className={c.previewTable}>
        <thead>
          <tr>
            <th>범위</th>
            <th className={c.n}>출제 가능</th>
            <th className={c.n}>적용 후</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.label}>
              <td>{r.label}</td>
              <td className={c.n}>{r.usable}</td>
              <td className={c.n}>{r.count}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>합계</td>
            <td />
            <td className={c.n}>
              <b>{TOTAL}</b>
            </td>
          </tr>
        </tfoot>
      </table>
      {problems.length ? (
        <div className={c.error} role="status">
          <strong>적용할 수 없습니다</strong>
          <ul>
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className={c.notice} role="status">
          총 문항 · 난이도 · 형식 · 범위 행이 서로 맞습니다.
          {x.state.mcFirst ? " 구성하면 객관식이 앞에 옵니다." : ""}
        </p>
      )}
    </div>
  );
}

function Frame({ x, children }: { x: Conditions; children: ReactNode }) {
  return (
    <section className={eb.root} aria-label="구성 조건 창(그림)">
      <dialog open className={`${pd.dialog} ${k.frame}`} data-size="fit">
        <header>
          <h2>구성 조건</h2>
          <div className={pd.headActions}>
            <button type="button" data-tone="plain">
              취소
            </button>
            <button type="button">적용</button>
          </div>
        </header>
        <div className={pd.body}>
          <div className={`${c.root} ${c.two}`}>
            <div>
              <section className={c.section}>
                <h3>총 문항</h3>
                <div className={c.fieldRow}>
                  <input
                    className={c.totalInput}
                    aria-label="총 문항"
                    value={TOTAL}
                    readOnly
                  />
                  <span className={c.rule}>
                    고정이 아닌 행에 고르게 나눕니다.
                  </span>
                </div>
              </section>
              {children}
              <section className={c.section}>
                <h3>최근 출제</h3>
                <label className={c.checkRow}>
                  <input type="checkbox" checked readOnly />
                  최근 출제 문항 빼기
                  <span className={c.badgeMuted}>지금 해당 31문항</span>
                </label>
              </section>
            </div>
            <Right x={x} />
          </div>
        </div>
      </dialog>
    </section>
  );
}

const RULE_STEP = (
  <span className={c.rule}>
    단계를 고르면 칸이 채워집니다. 칸을 손으로 고치면 «직접»이 됩니다.
  </span>
);
const RULE_FORMAT = (
  <span className={c.rule}>
    «–»는 지정 없음(남는 자리를 아무 형식으로), 0 은 그 형식을 내지 않는다는
    뜻입니다.
  </span>
);

function H1() {
  const x = useConditions();
  return (
    <Frame x={x}>
      <section className={c.section}>
        <h3>난이도</h3>
        <StepChips x={x} />
        <Ladder x={x} />
        {RULE_STEP}
      </section>
      <section className={c.section}>
        <h3>형식</h3>
        <Formats x={x} />
        {RULE_FORMAT}
      </section>
      <section className={c.section}>
        <h3>차례</h3>
        <McFirst x={x} />
      </section>
    </Frame>
  );
}
function H2() {
  const x = useConditions();
  return (
    <Frame x={x}>
      <section className={c.section}>
        <h3>난이도</h3>
        <StepSegment x={x} />
        <Ladder x={x} />
        {RULE_STEP}
      </section>
      <section className={c.section}>
        <h3>형식</h3>
        <Formats x={x} />
        {RULE_FORMAT}
      </section>
      <section className={c.section}>
        <h3>차례</h3>
        <McFirst x={x} />
      </section>
    </Frame>
  );
}
function H3() {
  const x = useConditions();
  return (
    <Frame x={x}>
      <section className={c.section}>
        <h3>난이도</h3>
        <StepChips x={x} />
        <Ladder x={x} />
        {RULE_STEP}
      </section>
      <section className={c.section}>
        <h3>형식 · 차례</h3>
        <Formats x={x} />
        <McFirst x={x} />
        {RULE_FORMAT}
      </section>
    </Frame>
  );
}
function H4() {
  const x = useConditions();
  return (
    <Frame x={x}>
      <section className={c.section}>
        <h3>난이도</h3>
        <StepChips x={x} mini />
        <Ladder x={x} />
        <span className={c.rule}>
          단계 밑의 작은 수는 기본 · 응용 · 심화로 채워질 수입니다(
          {TOTAL}문항). 칸을 손으로 고치면 «직접»이 됩니다.
        </span>
      </section>
      <section className={c.section}>
        <h3>형식</h3>
        <Formats x={x} />
        {RULE_FORMAT}
      </section>
      <section className={c.section}>
        <h3>차례</h3>
        <McFirst x={x} />
      </section>
    </Frame>
  );
}

const OPTIONS = [
  {
    id: "H1",
    title: "H1 · 기준 (Claude 추천)",
    idea: "난이도 위에 단계 칩 한 줄(1~6 · 직접). 그 밑에 «형식» 칸 셋, «차례» 체크 한 줄. 창의 왼쪽이 총 문항 → 난이도 → 형식 → 차례 → 최근 출제로 내려 읽힌다.",
    cost: "창의 왼쪽이 길어진다 — 1280 화면에서 최근 출제가 접힘선 아래로 내려간다.",
    view: <H1 />,
  },
  {
    id: "H2",
    title: "H2 · 단계를 이어 붙인 띠로",
    idea: "H1 에서 하나만 — 단계 칩을 «쉬움 1 2 3 4 5 6 어려움» 이어 붙인 띠로. 고른 칸은 파랑으로 찬다.",
    cost: "«직접»이 띠 밖에 따로 붙어 하나의 고르기로 덜 보인다.",
    view: <H2 />,
  },
  {
    id: "H3",
    title: "H3 · 형식과 차례를 한 칸으로",
    idea: "H1 에서 하나만 — «형식»과 «차례»를 «형식 · 차례» 한 칸으로 합쳐 창을 한 칸 줄인다.",
    cost: "«객관식을 앞에»가 형식 칸 밑에 묻혀 덜 보인다.",
    view: <H3 />,
  },
  {
    id: "H4",
    title: "H4 · 단계 칩에 채워질 수",
    idea: "H1 에서 하나만 — 단계 칩마다 «기본 · 응용 · 심화» 수(예: 8 · 10 · 7)를 작게 적어, 누르기 전에 무엇이 채워질지 보인다.",
    cost: "칩이 두 줄 높이가 되고 숫자가 많아 칩 줄이 무거워 보인다.",
    view: <H4 />,
  },
];

export function ConditionsHifi() {
  return (
    <div className={k.page}>
      <header className={k.head}>
        <p className={k.muted}>시험지 만들기 · 구성 조건 보강(M3) · Wire A</p>
        <h1>구성 조건 보강 · Hi-fi 4안</h1>
        <p>
          실제 «구성 조건» 창의 부품 위에 단계 · 형식 · 차례를 더했습니다. 단계
          칩 · 칸 · 체크는 실제로 눌러 볼 수 있고, 오른쪽 상자가 합이 맞는지
          바로 알려 줍니다(형식 합을 25 와 다르게 해 보세요). 안끼리는 한 축만
          다릅니다.
        </p>
        <nav className={k.nav} aria-label="시안 이동">
          {OPTIONS.map((o) => (
            <a key={o.id} href={`#${o.id}`}>
              {o.title}
            </a>
          ))}
          <a href="/dev/exam-conditions-wire#a">Wire A 보기</a>
        </nav>
      </header>
      {OPTIONS.map((o) => (
        <section key={o.id} id={o.id} className={k.option}>
          <h2>{o.title}</h2>
          <p className={k.idea}>
            {o.idea} <b>대가</b> — {o.cost}
          </p>
          {o.view}
        </section>
      ))}
    </div>
  );
}

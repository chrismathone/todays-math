import type { ReactNode } from "react";

import s from "./NumberLineWire.module.css";

/**
 * 수의 범위 수직선 Wire — 정할 것 둘.
 *  1. 범위를 그리는 모양(R1 ~ R4) — 이상 · 이하 · 초과 · 미만을 점과 선으로.
 *  2. 수직선이 보기일 때 놓는 자리(L1 ~ L4) — 우리 시험지 한 단은 338px, 그림 보기 칸(D-156 2열)은 그 절반이다.
 * 그림은 엔진(`scripts/figure/elementary.py` `numberLine`)과 같은 치수로 손으로 그렸다 — 글꼴 Batang · 눈금 숫자 11.
 */

type Range = {
  /** null 이면 왼쪽 끝까지(미만 · 이하). */
  from: number | null;
  /** null 이면 오른쪽 끝까지(이상 · 초과). */
  to: number | null;
  fromIn?: boolean;
  toIn?: boolean;
};
type Style = "R1" | "R2" | "R3" | "R4";

const INK = "#111111";
const ACCENT = "#a8432f";
const BAND = "#e2b48a";

function NumberLine({
  min,
  max,
  tick,
  labelEvery,
  range,
  style,
  width = 268,
  labels = "all",
}: {
  min: number;
  max: number;
  tick: number;
  labelEvery: number;
  range?: Range;
  style: Style;
  width?: number;
  /** "ends" 면 양 끝 숫자만 · "none" 이면 숫자 없음. */
  labels?: "all" | "ends" | "none";
}) {
  const pad = 14;
  const span = width - pad * 2;
  const y = 22;
  const xp = (v: number) => pad + ((v - min) / (max - min)) * span;
  const ticks: number[] = [];
  for (let v = min; v <= max + 1e-9; v += tick) ticks.push(+v.toFixed(6));
  const onLabel = (v: number) =>
    Math.abs((v - min) / labelEvery - Math.round((v - min) / labelEvery)) <
    1e-6;
  const color = style === "R2" ? INK : ACCENT;
  const lineY = style === "R3" ? y - 9 : y;
  const out: ReactNode[] = [];
  if (range) {
    const x1 = range.from === null ? xp(min) - 6 : xp(range.from);
    const x2 = range.to === null ? xp(max) + 6 : xp(range.to);
    if (style === "R4") {
      out.push(
        <rect
          key="band"
          x={x1}
          y={y - 5}
          width={x2 - x1}
          height={10}
          fill={BAND}
          opacity={0.75}
        />,
      );
    } else {
      out.push(
        <line
          key="bar"
          x1={x1}
          y1={lineY}
          x2={x2}
          y2={lineY}
          stroke={color}
          strokeWidth={style === "R2" ? 3 : 3.2}
          strokeLinecap="butt"
        />,
      );
      if (style === "R3") {
        for (const [v, k] of [
          [range.from, "a"],
          [range.to, "b"],
        ] as const) {
          if (v === null) continue;
          out.push(
            <line
              key={`drop-${k}`}
              x1={xp(v)}
              y1={lineY}
              x2={xp(v)}
              y2={y}
              stroke={color}
              strokeWidth={1.2}
            />,
          );
        }
      }
    }
    const dot = (v: number, filled: boolean, k: string) => (
      <circle
        key={k}
        cx={xp(v)}
        cy={style === "R3" ? lineY : y}
        r={3.6}
        fill={filled ? (style === "R4" ? INK : color) : "#ffffff"}
        stroke={style === "R4" ? INK : color}
        strokeWidth={1.5}
      />
    );
    if (range.from !== null)
      out.push(dot(range.from, range.fromIn ?? true, "d1"));
    if (range.to !== null) out.push(dot(range.to, range.toIn ?? true, "d2"));
  }
  return (
    <svg
      viewBox={`0 0 ${width} 44`}
      width={width}
      className={s.svg}
      role="img"
      aria-label="수직선"
    >
      <line
        x1={xp(min) - 8}
        y1={y}
        x2={xp(max) + 8}
        y2={y}
        stroke={INK}
        strokeWidth={1.3}
      />
      {ticks.map((v) => (
        <line
          key={v}
          x1={xp(v)}
          y1={y - (onLabel(v) ? 5 : 3.5)}
          x2={xp(v)}
          y2={y + (onLabel(v) ? 5 : 3.5)}
          stroke={INK}
          strokeWidth={1}
        />
      ))}
      {style === "R4" ? out : null}
      <line
        x1={xp(min) - 8}
        y1={y}
        x2={xp(max) + 8}
        y2={y}
        stroke={INK}
        strokeWidth={style === "R4" ? 1.3 : 0}
      />
      {style !== "R4" ? out : null}
      {ticks
        .filter(
          (v) =>
            labels !== "none" &&
            onLabel(v) &&
            (labels === "all" || v === min || Math.abs(v - max) < 1e-9),
        )
        .map((v) => (
          <text
            key={`t${v}`}
            x={xp(v)}
            y={y + 15}
            fontSize={11}
            fontWeight={600}
            fontFamily="Batang, serif"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={INK}
          >
            {v}
          </text>
        ))}
    </svg>
  );
}

const CASES: { name: string; range: Range }[] = [
  { name: "27 이상", range: { from: 27, to: null, fromIn: true } },
  { name: "27 미만", range: { from: null, to: 27, toIn: false } },
  {
    name: "25 이상 28 이하",
    range: { from: 25, to: 28, fromIn: true, toIn: true },
  },
  {
    name: "25 초과 28 미만",
    range: { from: 25, to: 28, fromIn: false, toIn: false },
  },
];

const STYLES: { id: Style; title: string; what: string; why: string }[] = [
  {
    id: "R1",
    title: "R1 · 교과서형 — 축 위 진한 색 선",
    what: "범위를 축 위에 굵은 진한 적갈색 선으로 · 포함 ● · 불포함 ○(속 흰색) · 끝없는 쪽은 축 끝까지.",
    why: "교과서 · 매쓰홀릭과 같은 읽기. 진한 색이라 흑백 인쇄에서도 검게 나온다. 다만 축과 선이 겹쳐 선의 끝이 눈금과 붙어 보인다.",
  },
  {
    id: "R2",
    title: "R2 · 검정 굵은 선",
    what: "R1 과 같은 자리 · 색 없이 검정 3px.",
    why: "흑백 인쇄와 똑같다. 축(1.3px)과 굵기로만 갈려 작게 줄면 범위 끝이 덜 보인다.",
  },
  {
    id: "R3",
    title: "R3 · 띄운 선",
    what: "범위 선을 축 위로 9px 띄우고 점도 그 높이에 · 끝에서 축으로 짧은 수직선.",
    why: "축 눈금과 범위가 겹치지 않아 끝 자리가 또렷하다. 일부 문제집 모양 — 우리 교과서(2022 개정)는 축 위에 바로 그린다.",
  },
  {
    id: "R4",
    title: "R4 · 엷은 띠 + 검정 점",
    what: "축을 덮는 엷은 황토 띠(그림 엔진의 채움색) · 점은 검정 ●/○.",
    why: "점이 가장 잘 보인다. 흑백 인쇄에서 띠가 옅은 회색이 돼 범위가 약해진다.",
  },
];

function Option({
  id,
  title,
  rec,
  children,
}: {
  id: string;
  title: string;
  rec?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={s.option} id={id}>
      <h3>
        {title}
        {rec ? <span className={s.rec}>추천</span> : null}
      </h3>
      {children}
    </section>
  );
}

/** 단 하나(338px)에 놓인 문항 — 우리 기출 2단 지면의 한 단(`EXAM_MEASURED_PX.problemColumn`). */
function Column({
  no,
  stem,
  children,
}: {
  no: number;
  stem: string;
  children: ReactNode;
}) {
  return (
    <div className={s.column}>
      <div className={s.qHead}>
        <b>{no}</b>
      </div>
      <p className={s.stem}>{stem}</p>
      {children}
    </div>
  );
}

const CHOICE_RANGES: Range[] = [
  { from: 550, to: 650, fromIn: true, toIn: true },
  { from: 550, to: 650, fromIn: true, toIn: false },
  { from: 550, to: 650, fromIn: false, toIn: true },
  { from: 550, to: 650, fromIn: false, toIn: false },
];
const MARKS = ["①", "②", "③", "④"];
const LAYOUT_STEM =
  "반올림하여 백의 자리까지 나타내면 600 이 되는 수의 범위를 수직선에 바르게 나타낸 것은 어느 것입니까?";

export function NumberLineWire() {
  return (
    <main className={s.shell}>
      <header className={s.head}>
        <div className={s.h1}>초등 수직선 — 수의 범위 · 수직선 보기 (Wire)</div>
        <p className={s.note}>
          매쓰홀릭 10월 월말평가 초3 ~ 초6 100문항을 우리 그림 종류에 대 보니,
          초5 «수의 범위와 어림하기» 여섯 소단원(우리 문항 1,524개 · 그림 0%)이
          수직선 범위 표시와 «수직선이 보기»를 씁니다(초5 1 · 7 · 9번). 우리
          수직선에는 범위를 그리는 칸이 없습니다. 정할 것은 둘입니다.
        </p>
        <ol className={s.must}>
          <li>
            <b>범위 모양</b> — R1 ~ R4. 네 경우(이상 · 미만 · 이상 이하 · 초과
            미만)를 같은 눈금에 그렸습니다.
          </li>
          <li>
            <b>수직선 보기 놓기</b> — L1 ~ L4. 우리 시험지 한 단(338px)에 놓은
            실제 크기입니다. 그림 보기는 지금 2열 칸에 넣습니다(D-156) —
            수직선은 넓어서 그 칸에서 줄어듭니다.
          </li>
        </ol>
        <p className={s.note}>
          고르신 뒤 Hi-fi 를 같은 방식(4안)으로 보여 드리고, 그다음 엔진에
          넣습니다. 이 화면은 손으로 그린 시안이고 DB 를 읽지 않습니다.
        </p>
      </header>

      <section className={s.topic}>
        <div className={s.h2}>1. 범위 모양</div>
        <div className={s.grid}>
          {STYLES.map((st) => (
            <Option
              key={st.id}
              id={st.id}
              title={st.title}
              rec={st.id === "R1"}
            >
              <div className={s.cases}>
                {CASES.map((c) => (
                  <div key={c.name} className={s.case}>
                    <span className={s.caseName}>{c.name}</span>
                    <NumberLine
                      min={24}
                      max={30}
                      tick={0.5}
                      labelEvery={1}
                      range={c.range}
                      style={st.id}
                    />
                  </div>
                ))}
              </div>
              <p className={s.small}>{st.what}</p>
              <p className={s.small}>{st.why}</p>
            </Option>
          ))}
        </div>
      </section>

      <section className={s.topic}>
        <div className={s.h2}>
          2. 수직선이 보기일 때 (범위 모양은 R1 로 그렸습니다)
        </div>
        <div className={s.grid}>
          <Option id="L1" title="L1 · 지금 규칙 그대로 — 2열 그림 칸">
            <Column no={9} stem={LAYOUT_STEM}>
              <div className={s.choiceGrid2}>
                {CHOICE_RANGES.map((r, i) => (
                  <div key={i} className={s.choiceCell}>
                    <span className={s.mark}>{MARKS[i]}</span>
                    <NumberLine
                      min={500}
                      max={700}
                      tick={10}
                      labelEvery={50}
                      range={r}
                      style="R1"
                      width={150}
                    />
                  </div>
                ))}
              </div>
            </Column>
            <p className={s.small}>
              다른 그림 보기와 같은 규칙(번호는 칸 왼쪽 위 · 그림은 칸 폭). 바꿀
              것이 없다. 수직선이 칸 폭 150px 로 줄어 눈금 숫자가 붙고 ● 와 ○ 가
              작아진다 — 이 문항이 가리려는 것이 바로 그 점이다.
            </p>
          </Option>

          <Option id="L2" title="L2 · 넓은 그림은 1열 — 보기마다 한 줄" rec>
            <Column no={9} stem={LAYOUT_STEM}>
              <div className={s.choiceList}>
                {CHOICE_RANGES.map((r, i) => (
                  <div key={i} className={s.choiceRow}>
                    <span className={s.mark}>{MARKS[i]}</span>
                    <NumberLine
                      min={500}
                      max={700}
                      tick={10}
                      labelEvery={50}
                      range={r}
                      style="R1"
                      width={290}
                    />
                  </div>
                ))}
              </div>
            </Column>
            <p className={s.small}>
              교과서 · 매쓰홀릭과 같은 모양. 그림이 줄지 않는다. 그림 칸 규칙에
              «넓은 그림(가로 ÷ 세로가 큰 것)은 1열»을 하나 더한다 — 수직선 · 띠
              막대가 이쪽. 세로를 가장 많이 쓴다(보기 넷 ≈ 문항 한 개 반).
            </p>
          </Option>

          <Option id="L3" title="L3 · 1열 + 보기 줄은 양 끝 숫자만">
            <Column no={9} stem={LAYOUT_STEM}>
              <div className={s.choiceList}>
                <div className={s.choiceRow}>
                  <span className={s.markGhost} />
                  <NumberLine
                    min={500}
                    max={700}
                    tick={10}
                    labelEvery={50}
                    style="R1"
                    width={290}
                  />
                </div>
                {CHOICE_RANGES.map((r, i) => (
                  <div key={i} className={s.choiceRowTight}>
                    <span className={s.mark}>{MARKS[i]}</span>
                    <NumberLine
                      min={500}
                      max={700}
                      tick={10}
                      labelEvery={50}
                      range={r}
                      style="R1"
                      width={290}
                      labels="none"
                    />
                  </div>
                ))}
              </div>
            </Column>
            <p className={s.small}>
              눈금 숫자는 맨 위 빈 수직선에 한 번만 적고, 보기 줄은 선과 점만.
              세로가 L2 의 3분의 2. 보기 줄에 숫자가 없어 학생이 위로 눈을 옮겨
              읽어야 한다.
            </p>
          </Option>

          <Option id="L4" title="L4 · 한 그림에 층으로 — ①~④ 를 한 축 위에">
            <Column no={9} stem={LAYOUT_STEM}>
              <div className={s.layered}>
                {CHOICE_RANGES.map((r, i) => (
                  <div key={i} className={s.layerRow}>
                    <span className={s.mark}>{MARKS[i]}</span>
                    <NumberLine
                      min={500}
                      max={700}
                      tick={10}
                      labelEvery={50}
                      range={r}
                      style="R3"
                      width={290}
                      labels={i === 3 ? "all" : "none"}
                    />
                  </div>
                ))}
              </div>
            </Column>
            <p className={s.small}>
              그림 하나(엔진이 한 장으로 그린다) · 보기는 층마다 번호. 가장
              작다. 다만 지금 그림 보기 규칙(번호는 칸 안)과 다른 새 모양이고,
              층끼리 붙어 ○ 와 ● 를 헷갈리기 쉽다.
            </p>
          </Option>
        </div>
      </section>

      <section className={s.topic}>
        <div className={s.h2}>이 시안 밖 — 그대로 쓰는 것</div>
        <ul className={s.must}>
          <li>
            〈보기〉 상자의 ㄱ ㄴ ㄷ 진술 · «㉠, ㉡» 조합 보기는 이미 있는 지면
            모양(〈보기〉 상자 · 글 보기) 그대로 씁니다 — 새 모양이 아니라
            엔진이 그 문항을 내게 하는 일입니다.
          </li>
          <li>
            «모두 고르시오»는 채점이 정답 하나만 받아 아직 내지 않습니다(D-156 ·
            복수 정답 계약).
          </li>
        </ul>
      </section>
    </main>
  );
}

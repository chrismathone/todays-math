import type { ReactNode } from "react";

import s from "./ConditionsWire.module.css";

/**
 * M3 «구성 조건» 보강 Wire 4안 — 난이도 단계(기본/실력/심화) · 형식별 개수 · 객관식 먼저.
 * 안끼리 다른 것은 **세 가지를 어디에 · 어떤 모양으로 두나**다. 숫자는 25문항 월말평가 예시.
 */

const TIERS = ["연산", "기본", "응용", "심화하", "심화중", "심화상"] as const;
/** 매쓰홀릭 프리셋(15문항 기준: 기본 · 실력하 · 실력중 · 심화하 · 심화중 · 고난도)을 우리 칸으로 옮겨 담는다. */
const MH_STEPS: [number, number, number, number, number, number][] = [
  [12, 3, 0, 0, 0, 0],
  [10, 3, 1, 1, 0, 0],
  [7, 4, 1, 3, 0, 0],
  [5, 3, 3, 4, 0, 0],
  [3, 4, 3, 4, 1, 0],
  [0, 3, 3, 6, 2, 1],
];
/** 매쓰홀릭 칸 → 우리 칸: 기본→기본 · 실력하+실력중→응용 · 심화하→심화하 · 심화중→심화중 · 고난도→심화상 · 연산 0. */
function toOurs(step: number[], total: number): number[] {
  const ours = [0, step[0], step[1] + step[2], step[3], step[4], step[5]];
  const sum = ours.reduce((a, b) => a + b, 0);
  const raw = ours.map((v) => (v / sum) * total);
  const floor = raw.map(Math.floor);
  let left = total - floor.reduce((a, b) => a + b, 0);
  const order = raw
    .map((v, i) => [v - Math.floor(v), i] as const)
    .sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (!left) break;
    floor[i] += 1;
    left -= 1;
  }
  return floor;
}
const PICKED_STEP = 3; // 4단계
const TOTAL = 25;
const PICKED = toOurs(MH_STEPS[PICKED_STEP], TOTAL);
const FORMATS: [string, number | null][] = [
  ["객관식", 18],
  ["단답형", 7],
  ["서술형", 0],
];

function Dialog({ children }: { children: ReactNode }) {
  return (
    <div className={s.dialog}>
      <div className={s.dlgHead}>
        <span>구성 조건</span>
        <span className={s.btnRow}>
          <span className={s.fakeBtn}>취소</span>
          <span className={s.fakeBtn}>적용</span>
        </span>
      </div>
      <div className={s.dlgSection}>
        <b>총 문항</b>
        <span>{TOTAL} — 고정이 아닌 행에 고르게 나눕니다.</span>
      </div>
      {children}
      <div className={s.dlgSection}>
        <b>최근 출제</b>
        <span className={s.check}>
          <i /> 최근 출제 문항 빼기 — 지금 그대로
        </span>
      </div>
      <div className={s.dlgSection}>
        <b>적용하면 이렇게 나뉩니다</b>
        <span className={s.ghost}>범위별 표 — 지금 그대로</span>
      </div>
    </div>
  );
}

function StepChips({ withNames }: { withNames: boolean }) {
  return (
    <div className={`${s.chips} ${s.newPart}`}>
      {MH_STEPS.map((_, i) => (
        <span key={i} className={i === PICKED_STEP ? s.chipOn : s.chip}>
          {i + 1}단계
        </span>
      ))}
      <span className={s.chip}>직접</span>
      {withNames && (
        <span className={s.small}>
          쉬움 ← → 어려움 · 고르면 아래 칸이 채워지고, 손으로 고칠 수 있음
        </span>
      )}
    </div>
  );
}

function TierCells({ grouped }: { grouped?: boolean }) {
  if (grouped)
    return (
      <div className={s.cells} style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        {[
          ["기본", PICKED[0] + PICKED[1], "연산 · 기본"],
          ["실력", PICKED[2], "응용"],
          ["심화", PICKED[3] + PICKED[4] + PICKED[5], "심화하 · 중 · 상"],
        ].map(([name, n, inner]) => (
          <div key={name} className={s.cell}>
            {name}
            <b>{n}</b>
            <span className={s.small}>{inner}</span>
          </div>
        ))}
      </div>
    );
  return (
    <div className={s.cells} style={{ gridTemplateColumns: "repeat(6,1fr)" }}>
      {TIERS.map((t, i) => (
        <div key={t} className={PICKED[i] ? s.cell : s.cellOff}>
          {t}
          <b>{PICKED[i]}</b>
        </div>
      ))}
    </div>
  );
}

function FormatCells() {
  return (
    <div
      className={`${s.cells} ${s.newPart}`}
      style={{ gridTemplateColumns: "repeat(3,1fr)" }}
    >
      {FORMATS.map(([f, n]) => (
        <div key={f} className={n ? s.cell : s.cellOff}>
          {f}
          <b>{n ?? "–"}</b>
        </div>
      ))}
    </div>
  );
}

function OrderCheck() {
  return (
    <span className={`${s.check} ${s.newPart}`}>
      <i /> 객관식을 앞에 — 그 안에서는 쉬운 것부터
    </span>
  );
}

const OPTIONS: {
  id: string;
  title: string;
  idea: string;
  pro: string;
  con: string;
  body: ReactNode;
}[] = [
  {
    id: "a",
    title: "A안 · 창 안에 줄 둘 더 (Claude 추천)",
    idea: "난이도 칸 위에 «단계» 칩(1~6 · 직접), 난이도 밑에 «형식» 칸 셋, 그 밑에 «객관식을 앞에» 체크. 나머지는 지금 창 그대로.",
    pro: "지금 창의 차례(총 문항 → 난이도 → 최근 출제 → 나뉠 모습)에 끼워 넣기만 한다. 고칠 곳이 가장 적다.",
    con: "창이 세로로 더 길어진다 — 나뉠 모습이 더 아래로 밀린다.",
    body: (
      <Dialog>
        <div className={s.dlgSection}>
          <b>난이도</b>
          <StepChips withNames />
          <TierCells />
        </div>
        <div className={s.dlgSection}>
          <b>형식</b>
          <FormatCells />
          <span className={s.small}>
            «–»는 지정 없음. 합이 총 문항과 다르면 창 아래에서 막는다.
          </span>
        </div>
        <div className={s.dlgSection}>
          <b>차례</b>
          <OrderCheck />
        </div>
      </Dialog>
    ),
  },
  {
    id: "b",
    title: "B안 · «시험 틀»을 맨 위에서 고른다",
    idea: "창 맨 위에 «시험 틀» 줄 — 월말평가 25(4단계 · 객관식 18 · 객관식 앞) · 단원평가 20 · 주간 10 · 직접. 틀을 고르면 아래 칸이 다 채워진다. 틀은 원장님이 저장 · 이름 바꾸기.",
    pro: "매달 같은 모양의 시험을 한 번 눌러 맞춘다. «저장한 조건»(W5)과 같은 결이다.",
    con: "«저장한 조건»과 «시험 틀» 둘이 비슷해 헷갈릴 수 있다 — 범위까지 담나 · 안 담나로만 갈린다.",
    body: (
      <Dialog>
        <div className={`${s.dlgSection} ${s.newPart}`}>
          <b>시험 틀</b>
          <div className={s.chips}>
            <span className={s.chipOn}>월말평가 25</span>
            <span className={s.chip}>단원평가 20</span>
            <span className={s.chip}>주간 10</span>
            <span className={s.chip}>직접</span>
          </div>
          <span className={s.small}>
            월말평가 25 = 25문항 · 난이도 4단계 · 객관식 18 · 단답형 7 · 객관식
            앞
          </span>
        </div>
        <div className={s.dlgSection}>
          <b>난이도</b>
          <TierCells />
        </div>
        <div className={s.dlgSection}>
          <b>형식 · 차례</b>
          <FormatCells />
          <OrderCheck />
        </div>
      </Dialog>
    ),
  },
  {
    id: "c",
    title: "C안 · 난이도 × 형식 표",
    idea: "난이도와 형식을 한 표로 — 칸마다 개수(«심화하 객관식 3»). 매쓰홀릭 «맞춤 출제»의 칸 넣기와 같은 결. 단계 칩은 표의 합만 채운다.",
    pro: "가장 세밀하다 — «심화는 단답형으로»를 정할 수 있다.",
    con: "칸이 18개 — 매번 채우기 무겁고, 재료가 모자란 칸이 많아진다(서버가 두 축을 다 맞추는 계산도 무겁다).",
    body: (
      <Dialog>
        <div className={s.dlgSection}>
          <b>난이도 × 형식</b>
          <StepChips withNames={false} />
          <table className={`${s.mx} ${s.newPart}`}>
            <thead>
              <tr>
                <th />
                {TIERS.map((t) => (
                  <th key={t}>{t}</th>
                ))}
                <th>합</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["객관식", [0, 8, 6, 4, 0, 0]],
                ["단답형", [0, 0, 4, 3, 0, 0]],
                ["서술형", [0, 0, 0, 0, 0, 0]],
              ].map(([f, row]) => (
                <tr key={f as string}>
                  <th>{f as string}</th>
                  {(row as number[]).map((n, i) => (
                    <td key={i}>{n || "–"}</td>
                  ))}
                  <td>{(row as number[]).reduce((a, b) => a + b, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <OrderCheck />
        </div>
      </Dialog>
    ),
  },
  {
    id: "d",
    title: "D안 · 창에는 단계만, 형식 · 차례는 2단계에서",
    idea: "창에는 «단계» 칩만 더한다(난이도 이름은 기본 · 실력 · 심화 세 칸으로 묶어 보임). 형식 개수는 정하지 않고, 2단계 문항 검토 맨 위에 형식 요약 + «객관식 위로» 단추.",
    pro: "출제 계산을 안 바꾼다 — 서버는 지금 그대로. 차례는 검토하며 한 번 누르면 된다.",
    con: "객관식이 몇 개 나올지 미리 못 정한다 — 모자라면 교체로 손으로 맞춘다.",
    body: (
      <>
        <Dialog>
          <div className={s.dlgSection}>
            <b>난이도</b>
            <StepChips withNames />
            <TierCells grouped />
          </div>
        </Dialog>
        <div className={`${s.reviewBar} ${s.newPart}`}>
          <b>2단계 문항 검토 맨 위</b>
          <div className={s.btnRow}>
            <span>객관식 16 · 단답형 9 · 서술형 0</span>
            <span className={s.fakeBtn}>객관식 위로</span>
            <span className={s.fakeBtn}>쉬운 것부터</span>
          </div>
        </div>
      </>
    ),
  },
];

export function ConditionsWire() {
  return (
    <main className={s.shell}>
      <header className={s.head}>
        <p className={s.note}>시험지 만들기 · 구성 조건 보강(M3) · Wire</p>
        <h1 className={s.h1}>구성 조건 보강 — Wire 4안</h1>
        <p className={s.note}>
          매쓰홀릭 10월 월말평가처럼{" "}
          <b>난이도 단계 · 형식별 개수 · 객관식 먼저</b>를 정할 수 있게 합니다.
          바탕은 지금 «구성 조건» 창이고, 점선 테두리가 더하는 것입니다. 안끼리
          다른 것은 세 가지를 어디에 · 어떤 모양으로 두나입니다.
        </p>
        <nav className={s.jump} aria-label="시안 이동">
          <a href="#a">A안</a>
          <a href="#b">B안</a>
          <a href="#c">C안</a>
          <a href="#d">D안</a>
          <a href="#map">난이도 이름 맞추기</a>
          <a href="#ask">여쭐 것</a>
        </nav>
        <h2 className={s.h2}>네 안이 같은 것</h2>
        <ol className={s.must}>
          <li>
            단계를 고르면 난이도 칸이 숫자로 채워지고, 손으로 고칠 수 있다 —
            결과는 지금처럼 «개수»로 보인다.
          </li>
          <li>
            재료가 모자라면 지금처럼 «부족»을 알린다 — 다른 난이도 · 형식으로
            조용히 채우지 않는다.
          </li>
          <li>
            «객관식을 앞에»는 문항 검토 → 직후 차례에만 쓴다. 그 뒤 손으로 옮긴
            차례는 건드리지 않는다.
          </li>
        </ol>
      </header>

      <section className={s.topic}>
        <h2 className={s.h2}>네 안</h2>
        <div className={s.grid}>
          {OPTIONS.map((o) => (
            <div
              key={o.id}
              id={o.id}
              className={s.option}
              style={{ width: 640 }}
            >
              <h3>{o.title}</h3>
              <p className={s.note}>{o.idea}</p>
              <p className={s.small}>
                <b>좋은 점</b> — {o.pro}
                <br />
                <b>대가</b> — {o.con}
              </p>
              {o.body}
            </div>
          ))}
        </div>
      </section>

      <section className={s.topic} id="map">
        <h2 className={s.h2}>난이도 이름 맞추기 (네 안 공통)</h2>
        <p className={s.note}>
          매쓰홀릭 단계표(15문항 기준)를 우리 칸으로 옮겨 {TOTAL}문항에 맞춘
          값입니다. 기본 → 기본 · 실력(하+중) → 응용 · 심화하 → 심화하 · 심화중
          → 심화중 · 고난도 → 심화상 · 연산은 0. 🔴 §11 에서 본 대로 우리
          «심화하»는 매쓰홀릭 «실력»쯤이라, 사다리 보정(제안 5번) 뒤에 이 표를
          다시 맞춥니다.
        </p>
        <table className={s.mx}>
          <thead>
            <tr>
              <th>단계</th>
              {TIERS.map((t) => (
                <th key={t}>{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MH_STEPS.map((step, i) => (
              <tr key={i}>
                <th>{i + 1}단계</th>
                {toOurs(step, TOTAL).map((n, j) => (
                  <td key={j}>{n || "–"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={s.topic} id="ask">
        <h2 className={s.h2}>원장님께 여쭐 것 (제안한 기본값)</h2>
        <table className={s.ask}>
          <tbody>
            {(
              [
                ["안", "A · B · C · D 가운데 하나 — 추천 A"],
                ["단계 수", "매쓰홀릭과 같은 6단계 + 직접"],
                [
                  "난이도 이름",
                  "칸은 우리 이름 그대로(연산 · 기본 · 응용 · 심화하 · 중 · 상) — 단계 칩만 쉬움 → 어려움",
                ],
                ["«객관식을 앞에» 기본값", "켬 — 월말평가 지면이 그렇다"],
                [
                  "형식 «–»",
                  "지정 없음(남는 자리를 아무 형식으로) · 0 은 «내지 않음»",
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

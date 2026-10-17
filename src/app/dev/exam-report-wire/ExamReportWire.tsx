import type { ReactNode } from "react";

import s from "./ExamReportWire.module.css";

/**
 * 월말평가 성적표 Wire — 학생 «요약 한 장» 4안 · «여러 장» 4안 · 넣고 빼는 단추 · 반 성적표 4안.
 * 숫자는 지어낸 값이지만 한 원천(QUESTIONS · CLASS)에서 계산한다 — 칸끼리 합이 어긋나지 않게(23 §7.2 의 교훈).
 */

const BANDS = ["연산", "기본", "응용", "심화"] as const;
const UNITS = [
  "부등식의 성질",
  "일차부등식의 풀이",
  "일차부등식의 활용",
  "연립방정식의 풀이",
];
/** 20문항 · 5점씩. [단원 번호, 난이도 번호] */
const QUESTIONS: [number, number][] = [
  [0, 0],
  [0, 0],
  [0, 1],
  [0, 1],
  [1, 0],
  [1, 1],
  [1, 1],
  [1, 2],
  [1, 2],
  [2, 1],
  [2, 1],
  [2, 2],
  [2, 2],
  [2, 3],
  [3, 0],
  [3, 1],
  [3, 1],
  [3, 2],
  [3, 2],
  [3, 3],
];
const POINT = 5;
/** 반 8명의 정오 — 1 맞음 · 0 틀림 · null 결시. 첫 줄이 이 성적표의 학생이다. */
const CLASS: { name: string; marks: (0 | 1)[] | null }[] = [
  "학생 A",
  "학생 B",
  "학생 C",
  "학생 D",
  "학생 E",
  "학생 F",
  "학생 G",
  "학생 H",
].map((name, k) => ({
  name,
  marks:
    k === 6
      ? null
      : (QUESTIONS.map(([, band], i) =>
          // 난이도가 높을수록 · 학생 번호에 따라 틀린다 — 지어낸 규칙.
          (i * 7 + k * 3) % 10 < band * 2 + (k % 3) ? 0 : 1,
        ) as (0 | 1)[]),
}));
const ME = CLASS[0].marks!;
const score = (m: (0 | 1)[]) => m.reduce<number>((a, b) => a + b, 0) * POINT;
const taken = CLASS.filter((c) => c.marks) as {
  name: string;
  marks: (0 | 1)[];
}[];
const CLASS_AVG = (
  taken.reduce((a, c) => a + score(c.marks), 0) / taken.length
).toFixed(1);
const MY_SCORE = score(ME);
const PREV_MONTHLY = 70;
const WRONG = ME.flatMap((m, i) => (m ? [] : [i + 1]));
const rateOf = (i: number) =>
  Math.round((taken.filter((c) => c.marks[i]).length / taken.length) * 100);
const group = (key: 0 | 1) =>
  (key === 0 ? UNITS : BANDS).map((label, idx) => {
    const items = QUESTIONS.flatMap((q, i) => (q[key] === idx ? [i] : []));
    const right = items.filter((i) => ME[i]).length;
    return { label, right, total: items.length };
  });
const BY_BAND = group(1);
/** 처음으로 4분의 3 아래로 떨어지는 난이도 — 문장을 숫자에서 만든다(지어 쓰지 않는다). */
const WEAK = BY_BAND.findIndex((b) => b.right / b.total < 0.75);
const WEAK_SENTENCE =
  WEAK <= 0
    ? "난이도에 따라 크게 갈리지 않습니다."
    : `${BANDS[WEAK - 1]}까지는 잘 풀고, ${BANDS[WEAK]}에서 막힙니다.`;
const BY_UNIT = group(0);
const AGAIN = BY_UNIT.filter((u) => u.right < u.total)
  .sort((a, b) => a.right / a.total - b.right / b.total)
  .slice(0, 3)
  .map((u) => ({
    ...u,
    wrong: WRONG.filter((n) => UNITS[QUESTIONS[n - 1][0]] === u.label),
  }));

function Head() {
  return (
    <div className={s.sheetHead}>
      <span>10월 월말평가 · 중2 A반</span>
      <span>학생 A · 10/24</span>
    </div>
  );
}
function BigRow() {
  return (
    <div className={s.bigRow}>
      <div>
        점수<b>{MY_SCORE}</b>
        <span className={s.small}>100점 만점</span>
      </div>
      <div>
        반 평균<b>{CLASS_AVG}</b>
        <span className={s.small}>응시 {taken.length}명</span>
      </div>
      <div>
        맞힌 문항<b>{ME.filter(Boolean).length}</b>
        <span className={s.small}>/ {QUESTIONS.length}</span>
      </div>
      <div>
        지난 월말평가<b>{PREV_MONTHLY}</b>
        <span className={s.small}>9월</span>
      </div>
    </div>
  );
}
function Sentences() {
  return (
    <div className={s.sentences}>
      <span>
        100점 만점에 {MY_SCORE}점입니다. 반 평균은 {CLASS_AVG}점, 지난
        월말평가는 {PREV_MONTHLY}점이었습니다.
      </span>
      <span>
        {QUESTIONS.length}문제 중 {ME.filter(Boolean).length}문제를 맞혔습니다.
        {WEAK_SENTENCE}
      </span>
      <span>
        {AGAIN.map((u) => u.label).join(" · ")}을(를) 다시 보면 좋겠습니다.
      </span>
    </div>
  );
}
function BandBoard() {
  return (
    <>
      <div className={s.label}>난이도별</div>
      <div className={s.board} style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        {BY_BAND.map((b) => (
          <div key={b.label}>
            {b.label}{" "}
            <b>
              {b.right}/{b.total}
            </b>
            <div className={s.bar}>
              <i style={{ width: `${(b.right / b.total) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
function UnitTable() {
  return (
    <>
      <div className={s.label}>단원별</div>
      <table className={s.table}>
        <thead>
          <tr>
            <th className={s.left}>단원</th>
            <th>맞힘</th>
            <th>반 정답률</th>
          </tr>
        </thead>
        <tbody>
          {BY_UNIT.map((u, idx) => {
            const items = QUESTIONS.flatMap((q, i) =>
              q[0] === idx ? [i] : [],
            );
            const classRate = Math.round(
              items.reduce((a, i) => a + rateOf(i), 0) / items.length,
            );
            return (
              <tr key={u.label}>
                <td className={s.left}>{u.label}</td>
                <td>
                  {u.right} / {u.total}
                </td>
                <td>{classRate}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
function OxGrid({ cols = 10 }: { cols?: number }) {
  return (
    <>
      <div className={s.label}>문항별 정오</div>
      <div
        className={s.ox}
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {ME.map((m, i) => (
          <div key={i} className={m ? undefined : s.wrongCell}>
            {i + 1} {m ? "○" : "✕"}
          </div>
        ))}
      </div>
    </>
  );
}
function ItemTable({ rows }: { rows?: number }) {
  const list = QUESTIONS.map((q, i) => i).slice(0, rows ?? QUESTIONS.length);
  return (
    <>
      <div className={s.label}>문항별 분석</div>
      <table className={s.table}>
        <thead>
          <tr>
            <th>번호</th>
            <th className={s.left}>단원</th>
            <th>난이도</th>
            <th>정오</th>
            <th>반 정답률</th>
          </tr>
        </thead>
        <tbody>
          {list.map((i) => (
            <tr key={i} className={ME[i] ? undefined : s.wrongCell}>
              <td>{i + 1}</td>
              <td className={s.left}>{UNITS[QUESTIONS[i][0]]}</td>
              <td>{BANDS[QUESTIONS[i][1]]}</td>
              <td>{ME[i] ? "○" : "✕"}</td>
              <td>{rateOf(i)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
function Again() {
  return (
    <div className={s.box}>
      <b>다음에 다시 볼 단원</b>
      {AGAIN.map((u) => (
        <span key={u.label}>
          · {u.label} — 틀린 문항 {u.wrong.join(" · ")}번
        </span>
      ))}
    </div>
  );
}
function Comment() {
  return <div className={s.ghost}>선생님 코멘트 — 원장님이 직접 씀(2~3줄)</div>;
}

const ONE_PAGE: {
  id: string;
  title: string;
  idea: string;
  sheet: ReactNode;
}[] = [
  {
    id: "s1",
    title: "S1 · 숫자 먼저 (Claude 추천)",
    idea: "큰 숫자 넷(점수 · 반 평균 · 맞힌 문항 · 지난 월말) → 난이도 → 단원 → 문항 정오 한 줄 → 다시 볼 단원 → 코멘트. 매쓰플랫 원클릭의 차례에 등수만 뺐다.",
    sheet: (
      <>
        <Head />
        <BigRow />
        <BandBoard />
        <UnitTable />
        <OxGrid />
        <Again />
        <Comment />
      </>
    ),
  },
  {
    id: "s2",
    title: "S2 · 문장 먼저",
    idea: "맨 위 세 줄 문장(23번 월간 리포트와 같은 말투) → 그 근거로 난이도 · 단원 · 정오. 숫자를 읽는 법을 문장이 먼저 알려 준다.",
    sheet: (
      <>
        <Head />
        <Sentences />
        <BandBoard />
        <UnitTable />
        <OxGrid />
        <Again />
        <Comment />
      </>
    ),
  },
  {
    id: "s3",
    title: "S3 · 두 열",
    idea: "큰 숫자 줄 밑을 두 열로 — 왼쪽 난이도 · 다시 볼 단원, 오른쪽 단원 · 정오. 한 장에 가장 많이 들어간다.",
    sheet: (
      <>
        <Head />
        <BigRow />
        <div className={s.twoCol}>
          <div>
            <BandBoard />
            <Again />
          </div>
          <div>
            <UnitTable />
            <OxGrid cols={5} />
          </div>
        </div>
        <Comment />
      </>
    ),
  },
  {
    id: "s4",
    title: "S4 · 문항표 중심",
    idea: "큰 숫자 줄 밑에 문항 20개 표(단원 · 난이도 · 정오 · 반 정답률)를 크게. 매쓰홀릭 «문항별 분석»을 요약 장에 올렸다. 난이도 · 단원 요약은 뺀다.",
    sheet: (
      <>
        <Head />
        <BigRow />
        <ItemTable />
        <Again />
        <Comment />
      </>
    ),
  },
];

function Thumb({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className={s.thumb}>
      <b>{title}</b>
      {lines.map((l) => (
        <span key={l}>{l}</span>
      ))}
      <i />
      <i />
    </div>
  );
}
const WRONG_PAGES = Math.ceil(WRONG.length / 2);
const MULTI: {
  id: string;
  title: string;
  idea: string;
  pages: [string, string[]][];
}[] = [
  {
    id: "m1",
    title: "M1 · 요약 + 틀린 문항 풀이 (Claude 추천)",
    idea: `요약 한 장 뒤에 틀린 문항마다 «문제 · 학생이 고른 답이 아니라 정답 · 해설». 한 쪽에 두 문항 — 이 학생은 ${WRONG.length}문항이라 ${1 + WRONG_PAGES}쪽.`,
    pages: [
      ["요약", ["S1~S4 중 고른 것"]],
      ...Array.from({ length: WRONG_PAGES }, (_, p): [string, string[]] => [
        "틀린 문항 풀이",
        WRONG.slice(p * 2, p * 2 + 2).map((n) => `${n}번 문제 · 정답 · 해설`),
      ]),
    ],
  },
  {
    id: "m2",
    title: "M2 · 매쓰홀릭형 — 장마다 한 주제",
    idea: "표지 → 요약 → 난이도 · 단원 상세 → 문항별 분석 → 틀린 문항 풀이 → 지난 월말평가들과의 추이. 가장 두껍다.",
    pages: [
      ["표지", ["10월 월말평가", "학생 A", "학원 이름"]],
      ["요약", ["큰 숫자 · 문장"]],
      ["난이도 · 단원", ["숫자판 · 단원표"]],
      ["문항별 분석", ["20문항 표"]],
      ["틀린 문항 풀이", [`${WRONG.length}문항 · ${WRONG_PAGES}쪽`]],
      ["추이", ["지난 월말평가들"]],
    ],
  },
  {
    id: "m3",
    title: "M3 · 다시 풀기 쪽 + 맨 끝 해설",
    idea: "요약 → 틀린 문항을 «문제와 풀이 칸»만 다시 싣고(학생이 다시 푼다) → 맨 끝에 정답 · 해설. 성적표가 숙제가 된다.",
    pages: [
      ["요약", ["S1~S4 중 고른 것"]],
      ["다시 풀기", WRONG.slice(0, 3).map((n) => `${n}번 · 풀이 칸`)],
      ["정답 · 해설", WRONG.map((n) => `${n}번`)],
    ],
  },
  {
    id: "m4",
    title: "M4 · 틀린 문항 + 비슷한 새 문항",
    idea: "요약 → 틀린 문항 풀이 → 같은 단원 · 유형의 새 문항(재시험이 이미 고르는 방식)을 몇 개. 다음 시간 재시험지와 같은 원천이다.",
    pages: [
      ["요약", ["S1~S4 중 고른 것"]],
      ["틀린 문항 풀이", [`${WRONG.length}문항`]],
      ["비슷한 새 문항", AGAIN.map((u) => u.label)],
      ["새 문항 정답", ["맨 끝 한 쪽"]],
    ],
  },
];

const TOGGLES: [string, [string, boolean][]][] = [
  [
    "앞",
    [
      ["표지", false],
      ["요약 한 장", true],
    ],
  ],
  [
    "요약 안의 칸",
    [
      ["반 평균", true],
      ["지난 월말평가 점수", true],
      ["세 줄 문장", false],
      ["난이도별", true],
      ["단원별(반 정답률 열 포함)", true],
      ["문항별 정오", true],
      ["다음에 다시 볼 단원", true],
      ["선생님 코멘트", true],
    ],
  ],
  [
    "뒤에 붙는 장",
    [
      ["문항별 분석 표", false],
      ["틀린 문항 풀이(문제 · 정답 · 해설)", true],
      ["다시 풀기 쪽", false],
      ["비슷한 새 문항", false],
      ["지난 월말평가들과의 추이", false],
    ],
  ],
];

function Settings() {
  return (
    <div className={s.settings}>
      <b>성적표 넣을 것 — 원장 화면(그림)</b>
      {TOGGLES.map(([g, items]) => (
        <div key={g}>
          <div className={s.group}>{g}</div>
          {items.map(([label, on]) => (
            <div key={label} className={s.toggle}>
              <span>{label}</span>
              <span className={on ? s.switchOn : s.switchOff} />
            </div>
          ))}
        </div>
      ))}
      <div className={s.small}>
        켜고 끈 것은 학원 기본값으로 저장된다 — 다음 월말평가에도 그대로.
        시험마다 바꿀 수도 있다.
      </div>
      <div className={s.fakeButton}>반 전체 인쇄 · 8명</div>
    </div>
  );
}

function ClassHead() {
  return (
    <div className={s.sheetHead}>
      <span>10월 월말평가 · 중2 A반 · 반 성적표</span>
      <span>
        응시 {taken.length} · 결시 {CLASS.length - taken.length} · 평균{" "}
        {CLASS_AVG}
      </span>
    </div>
  );
}
function StudentScores({ bands }: { bands: boolean }) {
  return (
    <table className={s.table}>
      <thead>
        <tr>
          <th className={s.left}>학생(가나다)</th>
          <th>점수</th>
          {bands && BANDS.map((b) => <th key={b}>{b}</th>)}
          <th>지난 월말</th>
        </tr>
      </thead>
      <tbody>
        {CLASS.map((c, k) => (
          <tr key={c.name}>
            <td className={s.left}>{c.name}</td>
            <td>{c.marks ? score(c.marks) : "결시"}</td>
            {bands &&
              BANDS.map((b, bi) => {
                if (!c.marks) return <td key={b}>—</td>;
                const items = QUESTIONS.flatMap((q, i) =>
                  q[1] === bi ? [i] : [],
                );
                return (
                  <td key={b}>
                    {items.filter((i) => c.marks![i]).length}/{items.length}
                  </td>
                );
              })}
            <td>{[70, 85, 60, 90, 75, 80, 65, 55][k]}</td>
          </tr>
        ))}
        <tr>
          <td className={s.left}>
            <b>반 평균</b>
          </td>
          <td>
            <b>{CLASS_AVG}</b>
          </td>
          {bands &&
            BANDS.map((b, bi) => {
              const items = QUESTIONS.flatMap((q, i) =>
                q[1] === bi ? [i] : [],
              );
              const avg =
                items.reduce((a, i) => a + rateOf(i), 0) / items.length;
              return <td key={b}>{Math.round(avg)}%</td>;
            })}
          <td>72.5</td>
        </tr>
      </tbody>
    </table>
  );
}
function RateRow() {
  // 20칸을 한 줄에 두면 세로 A4 에서 넘친다 — 10칸씩 두 줄.
  const halves = [0, 10].map((start) =>
    QUESTIONS.map((_, i) => i).slice(start, start + 10),
  );
  return (
    <table className={s.table}>
      <tbody>
        {halves.map((half) => [
          <tr key={`n${half[0]}`}>
            <th>문항</th>
            {half.map((i) => (
              <th key={i}>{i + 1}</th>
            ))}
          </tr>,
          <tr key={`r${half[0]}`}>
            <th>정답률</th>
            {half.map((i) => (
              <td key={i} className={rateOf(i) < 50 ? s.wrongCell : undefined}>
                {rateOf(i)}
              </td>
            ))}
          </tr>,
        ])}
      </tbody>
    </table>
  );
}
function OxMatrix() {
  return (
    <table className={s.table}>
      <thead>
        <tr>
          <th className={s.left}>학생</th>
          {QUESTIONS.map((_, i) => (
            <th key={i}>{i + 1}</th>
          ))}
          <th>점수</th>
        </tr>
      </thead>
      <tbody>
        {CLASS.map((c) => (
          <tr key={c.name}>
            <td className={s.left}>{c.name}</td>
            {c.marks
              ? c.marks.map((m, i) => <td key={i}>{m ? "○" : "✕"}</td>)
              : QUESTIONS.map((_, i) => <td key={i}>·</td>)}
            <td>{c.marks ? score(c.marks) : "결시"}</td>
          </tr>
        ))}
        <tr>
          <td className={s.left}>
            <b>정답률</b>
          </td>
          {QUESTIONS.map((_, i) => (
            <td key={i} className={rateOf(i) < 50 ? s.wrongCell : undefined}>
              {rateOf(i)}
            </td>
          ))}
          <td>
            <b>{CLASS_AVG}</b>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
function HardItems() {
  const order = QUESTIONS.map((_, i) => i)
    .sort((a, b) => rateOf(a) - rateOf(b))
    .slice(0, 8);
  return (
    <>
      <div className={s.label}>반이 막힌 문항 — 정답률 낮은 차례</div>
      <table className={s.table}>
        <thead>
          <tr>
            <th>번호</th>
            <th className={s.left}>단원</th>
            <th>난이도</th>
            <th className={s.left}>정답률</th>
          </tr>
        </thead>
        <tbody>
          {order.map((i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td className={s.left}>{UNITS[QUESTIONS[i][0]]}</td>
              <td>{BANDS[QUESTIONS[i][1]]}</td>
              <td className={s.left}>
                {rateOf(i)}%
                <div className={s.bar}>
                  <i style={{ width: `${rateOf(i)}%` }} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
function UnitMatrix() {
  return (
    <>
      <div className={s.label}>단원 × 학생 — 맞힌 수</div>
      <table className={s.table}>
        <thead>
          <tr>
            <th className={s.left}>학생</th>
            {UNITS.map((u) => (
              <th key={u}>{u}</th>
            ))}
            <th>점수</th>
          </tr>
        </thead>
        <tbody>
          {CLASS.map((c) => (
            <tr key={c.name}>
              <td className={s.left}>{c.name}</td>
              {UNITS.map((u, ui) => {
                const items = QUESTIONS.flatMap((q, i) =>
                  q[0] === ui ? [i] : [],
                );
                return (
                  <td key={u}>
                    {c.marks
                      ? `${items.filter((i) => c.marks![i]).length}/${items.length}`
                      : "—"}
                  </td>
                );
              })}
              <td>{c.marks ? score(c.marks) : "결시"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={s.label}>점수 분포</div>
      <div className={s.board} style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        {["90~100", "80~89", "70~79", "60~69", "~59"].map((band, bi) => {
          const lo = [90, 80, 70, 60, 0][bi];
          const hi = [100, 89, 79, 69, 59][bi];
          const n = taken.filter((c) => {
            const v = score(c.marks);
            return v >= lo && v <= hi;
          }).length;
          return (
            <div key={band}>
              {band}
              <br />
              <b>{n}명</b>
            </div>
          );
        })}
      </div>
    </>
  );
}

const CLASS_SHEETS: {
  id: string;
  title: string;
  idea: string;
  wide?: boolean;
  sheet: ReactNode;
}[] = [
  {
    id: "c1",
    title: "C1 · 학생 점수표 + 문항 정답률 한 줄",
    idea: "학생마다 점수 · 난이도별 맞힌 수 · 지난 월말. 아래에 문항 20개 정답률 한 줄. A4 세로 한 장.",
    sheet: (
      <>
        <ClassHead />
        <StudentScores bands />
        <div className={s.label}>문항별 정답률(%) — 50 미만 밑줄</div>
        <RateRow />
      </>
    ),
  },
  {
    id: "c2",
    title: "C2 · 정오 격자 (Claude 추천)",
    idea: "학생 × 문항 ○✕ 격자, 오른쪽 끝 점수, 맨 아래 정답률. 지금 채점표를 종이로 옮긴 모양 — 누가 어디서 틀렸는지가 한눈에. A4 가로.",
    wide: true,
    sheet: (
      <>
        <ClassHead />
        <OxMatrix />
      </>
    ),
  },
  {
    id: "c3",
    title: "C3 · 막힌 문항 먼저",
    idea: "정답률 낮은 문항 8개를 단원 · 난이도와 함께 위에, 학생 점수는 아래 짧은 표. 다음 수업에서 무엇을 다시 할지가 먼저 보인다.",
    sheet: (
      <>
        <ClassHead />
        <HardItems />
        <StudentScores bands={false} />
      </>
    ),
  },
  {
    id: "c4",
    title: "C4 · 단원 × 학생 + 점수 분포",
    idea: "학생마다 단원별 맞힌 수, 아래에 점수대별 인원. 문항이 아니라 단원으로 본다.",
    sheet: (
      <>
        <ClassHead />
        <UnitMatrix />
      </>
    ),
  },
];

export function ExamReportWire() {
  return (
    <main className={s.shell}>
      <header className={s.head}>
        <p className={s.note}>월말평가 · 학생 성적표 · 반 성적표 · Wire</p>
        <h1 className={s.h1}>월말평가 성적표 — Wire</h1>
        <p className={s.note}>
          월말평가는 학생 성적표를 따로 냅니다(일일 · 주간 시험은 그 달 리포트에
          회차 하나로). 아래는 <b>요약 한 장 4안</b> · <b>여러 장 4안</b> ·{" "}
          <b>넣고 빼는 단추</b> · <b>반 성적표 4안</b>
          입니다. 숫자는 지어낸 값이지만 한 원천에서 계산해 칸끼리 맞습니다.
        </p>
        <nav className={s.jump} aria-label="시안 이동">
          <a href="#one">요약 한 장</a>
          <a href="#multi">여러 장</a>
          <a href="#toggles">넣고 빼기</a>
          <a href="#class">반 성적표</a>
          <a href="#ask">여쭐 것</a>
        </nav>
        <h2 className={s.h2}>모든 안이 같은 것</h2>
        <ol className={s.must}>
          <li>
            «반에 낸» 월말평가의 채점이 끝나면 학생마다 성적표가 생긴다 — 따로
            «만들기» 단계가 없다(매쓰홀릭 진단지처럼). 반 전체를 한 번에
            인쇄한다.
          </li>
          <li>
            등수 · 백분위 · 등급은 없다(전국 표본이 없고, 반 10~20명의 백분위는
            흔들린다). 반 평균과 지난 월말평가 점수로 견준다.
          </li>
          <li>
            결시는 «결시»로 적고 평균에서 뺀다. 결시 학생은 성적표를 만들지
            않는다.
          </li>
          <li>
            «다음에 다시 볼 단원»은 틀린 문항의 단원에서, 덜 맞힌 차례로 최대
            3개 — 재시험이 고르는 단원과 같은 원천이다.
          </li>
          <li>
            색으로 잘함 · 못함을 가르지 않는다 — 틀린 칸은 굵은 글자와 밑줄이다.
          </li>
        </ol>
      </header>

      <section className={s.topic} id="one">
        <h2 className={s.h2}>학생 성적표 — 요약 한 장 (A4 세로)</h2>
        <div className={s.grid}>
          {ONE_PAGE.map((o) => (
            <div key={o.id} id={o.id} className={s.option}>
              <h3>{o.title}</h3>
              <p className={s.note}>{o.idea}</p>
              <div className={s.sheet}>{o.sheet}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={s.topic} id="multi">
        <h2 className={s.h2}>학생 성적표 — 여러 장</h2>
        <p className={s.note}>
          첫 장은 위의 요약 한 장(고른 안)이고, 뒤에 붙는 장이 안마다 다릅니다.
          쪽 그림은 차례만 보여 줍니다.
        </p>
        {MULTI.map((m) => (
          <div key={m.id} id={m.id} className={s.multi}>
            <h3>{m.title}</h3>
            <p className={s.note}>{m.idea}</p>
            <div className={s.strip}>
              {m.pages.map(([title, lines], i) => (
                <div key={i}>
                  <Thumb title={title} lines={lines} />
                  <div className={s.small}>{i + 1}쪽</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className={s.topic} id="toggles">
        <h2 className={s.h2}>넣고 빼기 — 미리 켜고 끄는 단추</h2>
        <p className={s.note}>
          원장님 말씀대로 넣을 것 · 뺄 것을 단추로 미리 정합니다. 매쓰홀릭은
          바꾼 설정이 저장되지 않아 매번 다시 끄는데, 여기서는 학원 기본값으로
          남깁니다. 켜진 값은 «여러 장 M1»의 기본입니다.
        </p>
        <div className={s.grid}>
          <Settings />
        </div>
      </section>

      <section className={s.topic} id="class">
        <h2 className={s.h2}>반 성적표 — 교사용 한 장</h2>
        <p className={s.note}>
          두 서비스 모두 반 성적표 «지면»은 없고 화면의 정오표뿐이었습니다.
          학생은 가나다 차례(성적순이 아님)로 놓았습니다.
        </p>
        <div className={s.grid}>
          {CLASS_SHEETS.map((c) => (
            <div
              key={c.id}
              id={c.id}
              className={s.option}
              style={c.wide ? { width: 640 } : undefined}
            >
              <h3>{c.title}</h3>
              <p className={s.note}>{c.idea}</p>
              <div className={`${s.sheet} ${c.wide ? s.landscape : ""}`}>
                {c.sheet}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={s.topic} id="ask">
        <h2 className={s.h2}>원장님께 여쭐 것 (제안한 기본값)</h2>
        <table className={s.ask}>
          <tbody>
            {(
              [
                ["요약 한 장", "S1 · S2 · S3 · S4 — 추천 S1(숫자 먼저)"],
                [
                  "여러 장",
                  "M1 · M2 · M3 · M4 — 추천 M1(요약 + 틀린 문항 풀이). M3 · M4 의 장은 단추로 켜서 덧붙일 수 있다",
                ],
                [
                  "반 성적표",
                  "C1 · C2 · C3 · C4 — 추천 C2(정오 격자 · A4 가로)",
                ],
                [
                  "반 성적표의 학생 차례",
                  "가나다 — 성적순으로 바꾸는 단추는 두지 않는다",
                ],
                [
                  "넣고 빼기 저장",
                  "학원 기본값으로 저장 · 시험마다 바꿀 수 있음",
                ],
                [
                  "내신",
                  "나중에 «내신» 시험끼리 따로 묶는다 — 이번 범위가 아니다",
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

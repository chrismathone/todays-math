import type { ReactNode } from "react";

import s from "./ReportExamWire.module.css";

/**
 * 월말평가 → 학부모 A4 리포트 Wire 4안. 바탕은 23번 합의 H3(시험 근거: 난이도 → 회차 → 단원).
 * 안끼리 다른 것은 **틀린 문항 번호 · 다음 달에 다시 볼 단원**을 어디에 두나다. 지어낸 값이다.
 */

type Round = {
  date: string;
  name: string;
  score: string;
  avg: string;
  wrong: string;
  monthly?: boolean;
};
const ROUNDS: Round[] = [
  { date: "10/3", name: "주간", score: "7 / 8", avg: "6.1", wrong: "5번" },
  {
    date: "10/10",
    name: "주간",
    score: "6 / 8",
    avg: "6.4",
    wrong: "3 · 6번",
  },
  { date: "10/17", name: "주간", score: "결시", avg: "6.0", wrong: "—" },
  {
    date: "10/24",
    name: "월말평가",
    score: "82 / 100",
    avg: "74.5",
    wrong: "7 · 12 · 18번",
    monthly: true,
  },
  { date: "10/31", name: "주간", score: "7 / 8", avg: "6.6", wrong: "2번" },
];
const AGAIN = [
  {
    unit: "일차부등식의 활용",
    from: "10/24 월말평가 12 · 18번 · 10/10 6번",
  },
  { unit: "연립방정식의 활용", from: "10/24 월말평가 7번 · 10/10 3번" },
];

function Sheet({
  children,
  top,
}: {
  children: ReactNode;
  /** 맨 위 요약 바로 밑에 끼우는 것(D안). */
  top?: ReactNode;
}) {
  return (
    <div className={s.sheet}>
      <div className={s.sheetHead}>
        <span>김○○ · 중2 A반</span>
        <span>2026년 10월</span>
      </div>
      <div className={s.ghost}>
        요약 문장 — 영역마다 한 줄(23번 합의 그대로)
      </div>
      {top}
      <div className={s.ghost}>① 진도 — 그대로</div>
      {children}
      <div className={s.ghost}>③ 스스로 한 것 — 그대로</div>
      <div className={s.ghost}>
        ④ 선생님 의견 — 원장님이 직접 씀 · 인쇄 전까지 고칠 수 있음
      </div>
      <div className={s.small}>
        이번 기간 기록 현황 한 줄 — 23번 합의 그대로
      </div>
    </div>
  );
}

function TestArea({
  wrongColumn,
  monthlyRow = true,
  children,
}: {
  wrongColumn: boolean;
  monthlyRow?: boolean;
  children?: ReactNode;
}) {
  const rounds = monthlyRow ? ROUNDS : ROUNDS.filter((r) => !r.monthly);
  return (
    <div className={s.area}>
      <div className={s.areaTitle}>② 시험</div>
      <div className={s.summary}>
        각 회 평균 … · 기본까지는 잘 풀고, 응용에서 막힙니다.
      </div>
      <div className={s.label}>난이도</div>
      <div className={s.ghost}>숫자판 + 얇은 막대(23번 합의 H3 그대로)</div>
      <div className={s.label}>회차</div>
      <table className={s.rounds}>
        <thead>
          <tr>
            <th>날짜</th>
            <th>시험</th>
            <th>점수</th>
            <th>반 평균</th>
            {wrongColumn && <th className={s.new}>틀린 문항</th>}
          </tr>
        </thead>
        <tbody>
          {rounds.map((r) => (
            <tr key={r.date} className={r.monthly ? s.monthly : undefined}>
              <td>{r.date}</td>
              <td>{r.name}</td>
              <td>{r.score}</td>
              <td>{r.avg}</td>
              {wrongColumn && <td>{r.wrong}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {children}
      <div className={s.label}>단원</div>
      <div className={s.ghost}>단원별 근거(23번 합의 그대로)</div>
    </div>
  );
}

function AgainBox({ withWrong }: { withWrong: boolean }) {
  return (
    <div className={`${s.box} ${s.new}`}>
      <b>다음 달에 다시 볼 단원</b>
      {AGAIN.map((a) => (
        <div key={a.unit}>
          · {a.unit}
          {withWrong && <span className={s.small}> — 틀린 문항 {a.from}</span>}
        </div>
      ))}
    </div>
  );
}

function TeacherGrid() {
  const rows = [
    ["학생 1", "○", "○", "×", "○", "○", "×", "○", "○"],
    ["학생 2", "○", "×", "×", "○", "○", "○", "×", "○"],
    ["학생 3", "○", "○", "○", "○", "×", "×", "○", "○"],
    ["학생 4", "○", "○", "×", "○", "○", "×", "○", "결시"],
  ];
  const rate = ["100%", "75%", "25%", "100%", "75%", "25%", "75%", "100%"];
  return (
    <div className={s.screen}>
      <div className={s.caption}>
        교사 화면(네 안 공통) — 반 시험 채점표 맨 아래에 «정답률» 한 줄
      </div>
      <table className={s.grid}>
        <thead>
          <tr>
            <th>학생</th>
            {rate.map((_, i) => (
              <th key={i}>{i + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]}>
              {r.map((c, i) => (
                <td key={i}>{c}</td>
              ))}
            </tr>
          ))}
          <tr className={`${s.rate} ${s.new}`}>
            <td>정답률</td>
            {rate.map((v, i) => (
              <td key={i} className={parseInt(v) < 50 ? s.low : undefined}>
                {v}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <div className={s.small}>
        결시 · 미채점은 분모에서 뺀다 · 50% 미만은 밑줄(색 없음) · 학부모
        지면에는 나가지 않는다
      </div>
    </div>
  );
}

const OPTIONS: {
  id: string;
  title: string;
  idea: string;
  pro: string;
  con: string;
  sheet: ReactNode;
}[] = [
  {
    id: "a",
    title: "A안 · 회차 줄에 «틀린 문항» 칸",
    idea: "회차 표에 «틀린 문항» 칸을 하나 더한다. 다시 볼 단원은 따로 두지 않는다 — 단원별 근거가 그 일을 한다.",
    pro: "늘어나는 것이 칸 하나라 한 장에 가장 잘 들어간다.",
    con: "«다음에 무엇을 하나»가 지면에 문장으로 없다 — 부모가 번호에서 단원을 거꾸로 찾아야 한다.",
    sheet: (
      <Sheet>
        <TestArea wrongColumn />
      </Sheet>
    ),
  },
  {
    id: "b",
    title: "B안 · 시험 영역 끝에 «다시 볼 단원» 칸 (Claude 추천)",
    idea: "회차 표는 지금 그대로. 시험 영역 끝(단원 근거 앞)에 굵은 테두리 칸 하나 — 다시 볼 단원 2~3개, 각 단원 옆에 그 단원에서 틀린 문항(회차 · 번호).",
    pro: "«다음 할 일»이 단원 이름으로 한눈에 — 틀린 번호는 그 근거로 따라 붙는다. 재시험이 고르는 단원과 같은 원천이다.",
    con: "칸 하나가 늘어 넘침 규칙(23 §7.3)의 첫 단계가 더 자주 돈다.",
    sheet: (
      <Sheet>
        <TestArea wrongColumn={false}>
          <AgainBox withWrong />
        </TestArea>
      </Sheet>
    ),
  },
  {
    id: "c",
    title: "C안 · «다음 달 할 일»을 맨 위로",
    idea: "요약 문장 바로 밑에 «다음 달 할 일» 칸(다시 볼 단원). 틀린 문항 번호는 회차 줄의 칸으로.",
    pro: "연구가 말하는 «다음 할 일 먼저»에 가장 가깝다 — 부모가 첫눈에 본다.",
    con: "근거(시험)보다 처방이 먼저 나와, 23번 합의의 «요약 → 근거» 차례가 깨진다. 두 군데를 오가며 읽는다.",
    sheet: (
      <Sheet top={<AgainBox withWrong={false} />}>
        <TestArea wrongColumn />
      </Sheet>
    ),
  },
  {
    id: "d",
    title: "D안 · 월말평가만 따로 작은 칸",
    idea: "회차 표에서 월말평가를 빼서 시험 영역 안에 작은 칸으로 — 점수 · 반 평균 · 틀린 문항 · 다시 볼 단원. 주간 시험은 지금 표 그대로.",
    pro: "월말평가가 그 달의 큰 시험이라는 것이 지면에서 보인다.",
    con: "주간 시험에서 틀린 것은 다시 볼 단원에 안 들어간다. 월말평가가 없는 달은 칸이 빈다(그때는 그리지 않는다).",
    sheet: (
      <Sheet>
        <TestArea wrongColumn={false} monthlyRow={false}>
          <div className={`${s.box} ${s.new}`}>
            <b>10/24 월말평가 — 82 / 100 · 반 평균 74.5</b>
            <div>틀린 문항 7 · 12 · 18번</div>
            <div>다시 볼 단원 · 일차부등식의 활용 · 연립방정식의 활용</div>
          </div>
        </TestArea>
      </Sheet>
    ),
  },
];

export function ReportExamWire() {
  return (
    <main className={s.shell}>
      <header className={s.head}>
        <p className={s.note}>월말평가 M5 · 학부모 리포트 · Wire</p>
        <h1 className={s.h1}>월말평가를 학부모 리포트에 — Wire 4안</h1>
        <p className={s.note}>
          바탕은 23번 문서에서 합의한 A4 한 장(H3)입니다. 회색 칸은 바뀌지 않는
          자리이고, 점선 테두리가 이번에 더하는 것입니다. 안끼리 다른 것은{" "}
          <b>틀린 문항 번호와 «다음 달에 다시 볼 단원»을 어디에 두나</b>
          뿐입니다.
        </p>
        <nav className={s.jump} aria-label="시안 이동">
          <a href="#a">A안</a>
          <a href="#b">B안</a>
          <a href="#c">C안</a>
          <a href="#d">D안</a>
          <a href="#teacher">교사 화면</a>
          <a href="#ask">여쭐 것</a>
        </nav>
        <h2 className={s.h2}>네 안이 같은 것 (원장님 «추천으로 진행»)</h2>
        <ol className={s.must}>
          <li>
            월말평가 뒤 학생 성적표를 따로 내지 않는다 — 그 달 리포트의 «시험»
            영역에 회차 하나로 들어간다.
          </li>
          <li>등수 · 백분위 · 반 최고점은 없다. 반 평균은 있다.</li>
          <li>
            선생님 의견은 원장님이 직접 쓴다(AI 초안 없음). 인쇄 전까지 고칠 수
            있고, 발행하면 그 판을 보관한다.
          </li>
          <li>
            «다시 볼 단원»은 틀린 문항의 단원에서 고른다 — 재시험이 고르는
            단원과 같은 원천이다. 많이 틀린 차례로 2~3개.
          </li>
          <li>색으로 잘함 · 못함을 가르지 않는다 — 글자와 테두리뿐이다.</li>
        </ol>
      </header>

      <section className={s.topic}>
        <h2 className={s.h2}>네 안 — 학부모 A4</h2>
        {OPTIONS.map((o) => (
          <div key={o.id} id={o.id} className={s.option}>
            <h3>{o.title}</h3>
            <p className={s.note}>{o.idea}</p>
            <div className={s.proCon}>
              <span>
                <b>좋은 점</b> — {o.pro}
              </span>
              <span>
                <b>대가</b> — {o.con}
              </span>
            </div>
            <div className={s.row}>{o.sheet}</div>
          </div>
        ))}
      </section>

      <section className={s.topic} id="teacher">
        <h2 className={s.h2}>교사 화면 — 문항별 반 정답률 (네 안 공통)</h2>
        <p className={s.note}>
          이미 있는 반 시험 채점표(학생 × 문항) 맨 아래에 정답률 한 줄을
          더합니다. 어느 문항에서 반 전체가 막혔는지를 원장님만 봅니다.
        </p>
        <div className={s.row}>
          <TeacherGrid />
        </div>
      </section>

      <section className={s.topic} id="ask">
        <h2 className={s.h2}>원장님께 여쭐 것 (제안한 기본값)</h2>
        <table className={s.ask}>
          <tbody>
            {(
              [
                ["안", "A · B · C · D 가운데 하나 — 추천 B"],
                [
                  "다시 볼 단원의 수",
                  "많이 틀린 차례로 최대 3개 · 틀린 것이 없으면 칸을 그리지 않는다",
                ],
                [
                  "틀린 문항 번호에 회차를 붙이나",
                  "붙인다(«10/24 월말평가 12번») — 한 달에 시험이 여럿이라 번호만으로는 어느 시험인지 모른다",
                ],
                [
                  "교사 화면의 낮은 정답률 표시",
                  "50% 미만에 밑줄 — 색은 쓰지 않는다",
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

import type { ReactNode } from "react";

import s from "./ExamReportScreenWire.module.css";

/**
 * 월말평가 성적표 — 원장님 화면 Wire 4안. 지면(H1)은 정해졌고, 여기서는 «열기 · 문장 쓰기 · 확정»의 짜임만 본다.
 * 반 하나 · 낸 시험 한 회. 학생 상태는 한 원천(STUDENTS)에서 센다 — 안마다 숫자가 어긋나지 않게.
 */

type Status = "none" | "draft" | "confirmed" | "stale" | "absent";
const STATUS_LABEL: Record<Status, string> = {
  none: "문장 없음",
  draft: "문장 씀",
  confirmed: "확정",
  stale: "다시 확정",
  absent: "결시 — 성적표 없음",
};
const STUDENTS: { name: string; score: number | null; wrong: number; status: Status; note?: string }[] = [
  { name: "학생 A", score: 80, wrong: 4, status: "confirmed", note: "양변에 같은 수를 더하고 빼는 과정을 한 줄씩 적어 보세요." },
  { name: "학생 B", score: 65, wrong: 7, status: "draft", note: "활용 문제에서 식 세우기를 먼저 연습합니다." },
  { name: "학생 C", score: 95, wrong: 1, status: "none" },
  { name: "학생 D", score: 70, wrong: 6, status: "stale", note: "부호를 옮길 때 실수가 잦습니다." },
  { name: "학생 E", score: 85, wrong: 3, status: "none" },
  { name: "학생 F", score: null, wrong: 0, status: "absent" },
  { name: "학생 G", score: 60, wrong: 8, status: "none" },
  { name: "학생 H", score: 90, wrong: 2, status: "confirmed", note: "풀이 순서가 깔끔합니다. 검산을 습관으로." },
];
const graded = STUDENTS.filter((x) => x.status !== "absent");
const confirmed = graded.filter((x) => x.status === "confirmed").length;
const COUNT_LINE = `채점 ${graded.length}명 · 결시 ${STUDENTS.length - graded.length}명 · 확정 ${confirmed} / ${graded.length}`;

/** 누를 것처럼 보이는 자리 — Wire 라 실제로 누르지 않는다(D-30). */
function Btn({ children, strong }: { children: ReactNode; strong?: boolean }) {
  return <span className={strong ? s.btnStrong : s.btn}>{children}</span>;
}
function Badge({ status }: { status: Status }) {
  return <span className={`${s.badge} ${s[`b_${status}`]}`}>{STATUS_LABEL[status]}</span>;
}
function Screen({ children }: { children: ReactNode }) {
  return (
    <div className={s.screen}>
      <div className={s.crumb}>작업실 › 낸 시험 › 10월 월말평가 · 중1 가람반 › 성적표</div>
      <div className={s.screenHead}>
        <div>
          <b className={s.screenTitle}>10월 월말평가 성적표 · 가람반</b>
          <div className={s.small}>{COUNT_LINE}</div>
        </div>
        <div className={s.row}>
          <Btn>지면 설정 · S1 요약 한 장</Btn>
          <Btn>반 성적표 인쇄</Btn>
          <Btn strong>확정된 {confirmed}명 인쇄</Btn>
        </div>
      </div>
      {children}
    </div>
  );
}
function Paper({ big, label }: { big?: boolean; label?: string }) {
  return (
    <div className={big ? s.paperBig : s.paper}>
      <div className={s.pLine} />
      <div className={s.pName} />
      <div className={s.pNums}>
        <span />
        <span />
      </div>
      <div className={s.pTable} />
      <div className={s.pNote}>{label ?? "원장님 문장"}</div>
    </div>
  );
}
function Note({ text, rows = 3 }: { text?: string; rows?: number }) {
  return (
    <div className={s.note} style={{ minHeight: rows * 18 + 12 }}>
      {text ?? <span className={s.placeholder}>이 학생에게 남길 문장</span>}
    </div>
  );
}

const OPTIONS: { id: string; title: string; idea: string; good: string; bad: string; view: ReactNode }[] = [
  {
    id: "A",
    title: "A · 목록 + 미리보기 (추천)",
    idea: "왼쪽에 반 학생 목록(점수 · 상태), 오른쪽에 고른 학생의 H1 지면 미리보기와 그 아래 문장 칸 · [확정].",
    good: "쓰는 문장이 지면 어디에 어떻게 들어가는지 바로 보인다. 목록의 상태로 남은 학생이 한눈에.",
    bad: "학생마다 한 번씩 눌러 옮겨 가야 한다.",
    view: (
      <Screen>
        <div className={s.split}>
          <div className={s.list}>
            {STUDENTS.map((x, i) => (
              <div key={x.name} className={i === 1 ? s.listRowOn : s.listRow}>
                <span>{x.name}</span>
                <span className={s.small}>{x.score === null ? "" : `${x.score}점`}</span>
                <Badge status={x.status} />
              </div>
            ))}
          </div>
          <div className={s.detail}>
            <div className={s.small}>학생 B · 65점 · 틀린 문항 7 · 지면 띠(쪽을 누르면 크게)</div>
            <div className={s.strip}>
              <Paper />
              <Paper label="틀린 문항 풀이" />
            </div>
            <div className={s.fieldLabel}>원장님 문장</div>
            <Note text={STUDENTS[1].note} />
            <div className={s.rowEnd}>
              <span className={s.small}>저장됨 · 아직 확정 전</span>
              <Btn strong>확정</Btn>
            </div>
          </div>
        </div>
      </Screen>
    ),
  },
  {
    id: "B",
    title: "B · 문장 표",
    idea: "학생 한 줄마다 이름 · 점수 · 틀린 수 · 문장 칸 · 상태 · [미리보기]. 위에 [쓴 문장 모두 확정].",
    good: "반 전체 문장을 한 화면에서 이어 쓴다. 학생이 많을 때 가장 빠르다.",
    bad: "지면에 들어간 모양은 [미리보기]를 눌러야 보인다. 줄마다 칸이 길어 화면이 길어진다.",
    view: (
      <Screen>
        <div className={s.rowEnd}>
          <Btn strong>쓴 문장 모두 확정</Btn>
        </div>
        <div className={s.table}>
          <div className={s.tHead}>
            <span>학생</span>
            <span>점수</span>
            <span>틀림</span>
            <span>원장님 문장</span>
            <span>상태</span>
            <span />
          </div>
          {STUDENTS.slice(0, 6).map((x) => (
            <div key={x.name} className={s.tRow}>
              <span>{x.name}</span>
              <span>{x.score ?? "—"}</span>
              <span>{x.status === "absent" ? "—" : x.wrong}</span>
              {x.status === "absent" ? <span className={s.small}>결시</span> : <Note text={x.note} rows={2} />}
              <Badge status={x.status} />
              {x.status === "absent" ? <span /> : <Btn>미리보기</Btn>}
            </div>
          ))}
        </div>
      </Screen>
    ),
  },
  {
    id: "C",
    title: "C · 지면 위에서 쓰기",
    idea: "화면 가운데 큰 H1 지면. 원장님 문장 자리를 지면 위에서 바로 고친다. 학생은 «고르기 창»(한 줄 + 단추)으로 바꾼다.",
    good: "종이에 나갈 모습 그대로 쓴다 — 넘침 · 줄바꿈을 쓰면서 본다.",
    bad: "반 전체의 진행 상태는 고르기 창을 열어야 보인다. 지면 위 편집은 화면 폭이 좁으면 작아진다.",
    view: (
      <Screen>
        <div className={s.picker}>
          <span>학생 B · 65점 · 문장 씀</span>
          <Btn>학생 고르기</Btn>
          <span className={s.small}>확정 {confirmed} / {graded.length}</span>
        </div>
        <div className={s.center}>
          <div className={s.paperEdit}>
            <div className={s.pLine} />
            <div className={s.pName} />
            <div className={s.pNums}>
              <span />
              <span />
            </div>
            <div className={s.pTable} />
            <div className={s.pEditNote}>{STUDENTS[1].note}</div>
          </div>
        </div>
        <div className={s.rowEnd}>
          <Btn strong>확정</Btn>
        </div>
      </Screen>
    ),
  },
  {
    id: "D",
    title: "D · 채점표에 이어서",
    idea: "새 화면 없이 채점 저장 뒤의 학생별 점수 목록에 «문장 · 확정» 열을 붙인다. 미리보기는 줄의 단추로 창.",
    good: "채점 → 문장 → 확정이 한 화면에서 끝난다. 새로 익힐 화면이 없다.",
    bad: "채점표가 무거워진다. 여러 반을 낸 시험은 반마다 따로 들어가야 한다. 재채점과 확정이 한 화면에 섞인다.",
    view: (
      <div className={s.screen}>
        <div className={s.crumb}>시험 › 10월 월말평가 · 가람반 › 채점</div>
        <div className={s.box}>채점표 (지금 그대로)</div>
        <div className={s.fieldLabel}>채점 7명 · 결시 1명 — 저장됨</div>
        <div className={s.table}>
          {STUDENTS.slice(0, 5).map((x) => (
            <div key={x.name} className={s.tRowD}>
              <span>{x.name}</span>
              <span>{x.score ?? "결시"}</span>
              {x.status === "absent" ? <span /> : <Note text={x.note} rows={1} />}
              <Badge status={x.status} />
              {x.status === "absent" ? <span /> : <Btn>성적표</Btn>}
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

export function ExamReportScreenWire() {
  return (
    <main className={s.shell}>
      <header className={s.head}>
        <p className={s.muted}>월말평가 · 성적표 · 원장님 화면 · Wire</p>
        <h1 className={s.h1}>성적표를 열고 · 문장을 쓰고 · 확정하는 화면 — Wire 4안</h1>
        <p className={s.muted}>
          지면은 H1 «시험지 얼굴»로 정해졌습니다. 아래는 그 지면을 다루는 원장님 화면의 짜임입니다. 반 하나 · 낸 시험 한
          회 · 지어낸 학생 8명.
        </p>
        <h2 className={s.h2}>모든 안이 같은 것</h2>
        <ol className={s.must}>
          <li>
            들어오는 길: 낸 시험 줄의 반마다 «성적표»(채점이 끝난 반만) · 채점 저장 뒤 점수 목록 아래 «성적표로».
          </li>
          <li>
            학생 상태는 넷 — <b>문장 없음 · 문장 씀 · 확정 · 다시 확정</b>(확정 뒤 재채점이나 문장 수정). 결시 학생은 성적표가
            없다.
          </li>
          <li>지면 설정(S1 · M1, 넣고 빼기)은 반에 한 번 — 학생마다 고르지 않는다.</li>
          <li>
            <b>확정한 성적표만</b> 에이와로 간다(학원이 테스트 · 그날 안 보낸 수업보고서에 첨부). 확정 = 그 순간의 PDF 를
            보관.
          </li>
          <li>반 성적표(C2)는 같은 화면 위 단추로 인쇄한다 — 학부모에게 가지 않는다.</li>
        </ol>
      </header>

      {OPTIONS.map((o) => (
        <section key={o.id} className={s.topic} id={o.id}>
          <h2 className={s.h2}>{o.title}</h2>
          <p className={s.muted}>{o.idea}</p>
          <div className={s.pros}>
            <span>
              <b>좋은 점</b> {o.good}
            </span>
            <span>
              <b>아쉬운 점</b> {o.bad}
            </span>
          </div>
          {o.view}
        </section>
      ))}

      <section className={s.topic} id="ask">
        <h2 className={s.h2}>여쭐 것</h2>
        <ol className={s.must}>
          <li>문장 없이도 확정할 수 있게 할까요? (추천: 됨 — 지면의 «원장님 문장» 칸은 빠진다)</li>
          <li>확정 전에도 인쇄할 수 있게 할까요? (추천: 됨 — 다만 인쇄 단추의 기본은 «확정된 학생만»)</li>
          <li>문장 길이 상한 — H1 한 장 안에 들어가는 길이로 막을까요? (추천: 막는다 · 남은 글자 수 표시)</li>
        </ol>
      </section>
    </main>
  );
}

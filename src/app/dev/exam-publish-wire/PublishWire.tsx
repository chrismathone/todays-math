import type { ReactNode } from "react";

import s from "./PublishWire.module.css";

/**
 * 월말평가 M1 «반에 내기» Wire — 네 안 (`docs/planning/monthly-exam-plan-20261017.md` §4 M1 · 원장님 «진행해» 2026-10-17).
 *
 * 설계는 B(따로 발행 — 낸 그대로 고정 · 지금 채점표 재사용)로 정해졌다. 안끼리 다른 것은 **반에 내는 자리**다 —
 * 출력 단계의 단추(A) · 내 시험지 보관함(B) · 시험지 만들기의 넷째 단계(C) · 반 화면(D). 낸 뒤의 채점표 · 재시험은 네 안이 같다(지금 화면).
 * 덧붙인 자리는 굵은 테두리로 가른다. 문구는 실제로 쓸 말로 적는다(D-08 — 간결 · 사무적 · 느낌표 없음).
 * 지어낸 작은 픽스처다 — 실제 학생 · 반이 아니다. 아무것도 저장 · 호출하지 않는다. 그림 속 단추는 누를 수 없다.
 */

/* ───────────── 픽스처 ───────────── */

const SHEET = {
  title: "중2 10월 월말평가",
  range: "중2-1 Ⅱ. 식의 계산 ~ Ⅲ. 부등식과 연립방정식",
  count: 25,
  kinds: "객관식 18 · 단답형 4 · 서술형 3",
  total: 100,
};
const CLASSES = [
  { name: "중2 A반", students: 12, on: true },
  { name: "중2 B반", students: 9, on: true },
  { name: "중3 A반", students: 11, on: false },
];
const ISSUED = [
  { cls: "중2 A반", date: "10/30", graded: "12 / 12", absent: 0 },
  { cls: "중2 B반", date: "10/30", graded: "4 / 9", absent: 1 },
];

/* ───────────── 그림 조각 ───────────── */

function Btn({
  children,
  strong,
  small,
}: {
  children: ReactNode;
  strong?: boolean;
  small?: boolean;
}) {
  return (
    <span
      className={[s.btn, strong ? s.btnStrong : "", small ? s.btnSmall : ""]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}

function Check({ on, children }: { on?: boolean; children: ReactNode }) {
  return (
    <span className={s.radio}>
      <span className={on ? s.checkOn : s.checkOff} aria-hidden="true" />
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

function Frame({
  label = "원장 · 작업실 본문 1040",
  tabs,
  children,
}: {
  label?: string;
  tabs: string[];
  children: ReactNode;
}) {
  return (
    <div className={s.scrollX}>
      <p className={s.frameLabel}>{label}</p>
      <div className={s.teacher}>
        <div className={s.tabs}>
          {tabs.map((tab, i) => (
            <span key={tab} className={i === 0 ? s.tabOn : undefined}>
              {tab}
            </span>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}

/** 반에 내기 창 — 네 안이 같은 속을 쓴다(자리만 다르다). */
function PublishDialog({ fromLibrary }: { fromLibrary?: boolean }) {
  return (
    <div className={s.dialog}>
      <div className={s.dialogHead}>
        <b>반에 내기</b>
        <Btn small>닫기</Btn>
      </div>
      {fromLibrary ? (
        <p>
          <b>{SHEET.title}</b> · {SHEET.count}문항 · 총점 {SHEET.total}점
        </p>
      ) : null}
      <div className={s.fieldRow}>
        <span className={s.fieldLabel}>시험 종류</span>
        <span className={s.select}>월말평가 ▾</span>
        <span className={s.muted}>단원평가 · 내신 대비 · 기타</span>
      </div>
      <div className={s.fieldRow}>
        <span className={s.fieldLabel}>시험일</span>
        <span className={s.select}>2026-10-30 ▾</span>
      </div>
      <div className={s.fieldRow}>
        <span className={s.fieldLabel}>반</span>
        <span className={s.checks}>
          {CLASSES.map((c) => (
            <Check key={c.name} on={c.on}>
              {c.name} · {c.students}명
            </Check>
          ))}
        </span>
      </div>
      <p className={s.muted}>
        낸 시험지는 고칠 수 없습니다. 고치려면 작업실에서 고친 뒤 다시 냅니다.
        반마다 채점표가 하나씩 생깁니다.
      </p>
      <div className={s.dialogFoot}>
        <Btn>취소</Btn>
        <Btn strong>2개 반에 내기</Btn>
      </div>
    </div>
  );
}

/** 낸 뒤 — 반마다 채점 진행과 채점하기(지금 채점표로 간다). */
function IssuedList({ compact }: { compact?: boolean }) {
  return (
    <table className={s.table}>
      <thead>
        <tr>
          <th>반</th>
          <th>시험일</th>
          <th>채점</th>
          {compact ? null : <th>결시</th>}
          <th />
        </tr>
      </thead>
      <tbody>
        {ISSUED.map((row) => (
          <tr key={row.cls}>
            <th scope="row">{row.cls}</th>
            <td>{row.date}</td>
            <td>{row.graded}명</td>
            {compact ? null : <td>{row.absent}명</td>}
            <td>
              <Btn small>채점하기</Btn>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Option({
  id,
  title,
  where,
  after,
  pro,
  con,
  children,
}: {
  id: string;
  title: string;
  where: string;
  after: string;
  pro: string;
  con: string;
  children: ReactNode;
}) {
  return (
    <section className={s.option} id={id}>
      <h3 className={s.h3}>{title}</h3>
      <dl className={s.caption}>
        <dt>내는 자리</dt>
        <dd>{where}</dd>
        <dt>낸 뒤</dt>
        <dd>{after}</dd>
        <dt>좋은 점</dt>
        <dd>{pro}</dd>
        <dt>대가</dt>
        <dd>{con}</dd>
      </dl>
      {children}
    </section>
  );
}

const OUTPUT_TABS = ["시험지 만들기", "내 시험지", "문제은행"];

/* ───────────── 네 안 ───────────── */

function OptionA() {
  return (
    <Option
      id="a"
      title="A안 — 출력 단계의 단추"
      where="시험지 만들기 3단계(출력)의 도구 줄에 «반에 내기». 인쇄하기 옆이다."
      after="창이 닫히면 «2개 반에 냈습니다 · 채점하기» 한 줄. 낸 기록은 그 시험지를 다시 열면 머리 아래에 보인다."
      pro="만들고 · 인쇄하고 · 내는 일이 한 화면에서 끝난다. 지금 흐름에 단추 하나만 더한다."
      con="다른 날 채점하러 올 때 시험지를 찾아 열어야 한다. 낸 시험만 모아 보는 자리가 없다."
    >
      <Frame tabs={OUTPUT_TABS}>
        <div className={s.toolbar}>
          <span className={s.muted}>범위 → 검토 → 출력</span>
          <span className={s.spacer} />
          <Btn>작업 저장</Btn>
          <Btn>인쇄 / PDF 저장</Btn>
          <Btn>HWPX 내보내기</Btn>
          <Added>
            <Btn strong>반에 내기</Btn>
          </Added>
        </div>
        <div className={s.paperStub}>
          {SHEET.title} · 지면 미리 보기(지금과 같다)
        </div>
        <PublishDialog />
        <Added label="낸 뒤">
          <p>
            중2 A반 · 중2 B반에 냈습니다. <Btn small>중2 A반 채점하기</Btn>{" "}
            <Btn small>중2 B반 채점하기</Btn>
          </p>
        </Added>
      </Frame>
    </Option>
  );
}

function OptionB() {
  return (
    <Option
      id="b"
      title="B안 — 내 시험지 보관함에서 (Claude 추천)"
      where="내 시험지 표의 줄마다 «반에 내기». 저장한 시험지만 낼 수 있다(낸 그대로를 고정하려면 저장본이 있어야 한다)."
      after="표에 «낸 기록» 칸이 생기고, 줄을 펼치면 반마다 채점 진행 · 채점하기. 보관함이 «만든 것과 낸 것»을 한곳에 모은다."
      pro="채점하러 올 때 들어갈 자리가 하나다. 같은 시험지를 다른 날 · 다른 반에 다시 내기 쉽다. 시험지 만들기 화면은 바꾸지 않는다."
      con="만든 직후 내려면 저장 → 보관함으로 한 번 옮겨야 한다. 보관함 표가 한 칸 넓어진다."
    >
      <Frame tabs={["내 시험지", "시험지 만들기", "문제은행"]}>
        <div className={s.toolbar}>
          <span className={s.muted}>종류 · 태그 · 검색 (지금과 같다)</span>
        </div>
        <table className={s.table}>
          <thead>
            <tr>
              <th>번호</th>
              <th>종류</th>
              <th>제목</th>
              <th>문항</th>
              <th>수정일</th>
              <th className={s.addedCol}>낸 기록</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            <tr className={s.rowOn}>
              <td>1</td>
              <td>시험지</td>
              <td>{SHEET.title}</td>
              <td>{SHEET.count}</td>
              <td>10/28</td>
              <td className={s.addedCol}>2개 반 · 10/30 ▾</td>
              <td>
                <Btn small>열기</Btn>{" "}
                <Btn small strong>
                  반에 내기
                </Btn>
              </td>
            </tr>
            <tr>
              <td colSpan={7}>
                <Added label="펼친 낸 기록">
                  <IssuedList />
                </Added>
              </td>
            </tr>
            <tr>
              <td>2</td>
              <td>시험지</td>
              <td>중1 9월 단원평가</td>
              <td>20</td>
              <td>09/25</td>
              <td className={s.addedCol}>1개 반 · 09/27 ▾</td>
              <td>
                <Btn small>열기</Btn>{" "}
                <Btn small strong>
                  반에 내기
                </Btn>
              </td>
            </tr>
          </tbody>
        </table>
        <PublishDialog fromLibrary />
      </Frame>
    </Option>
  );
}

function OptionC() {
  return (
    <Option
      id="c"
      title="C안 — 시험지 만들기의 넷째 단계 «내기»"
      where="단계 줄이 범위 → 검토 → 출력 → 내기. 넷째 단계는 왼쪽에 시험 요약, 오른쪽에 반 · 시험일 · 종류."
      after="같은 단계에 «낸 시험» 카드가 반마다 남고 거기서 채점하기."
      pro="«내기»가 만들기의 마지막 순서로 늘 보인다 — 처음 쓰는 원장님도 길을 잃지 않는다."
      con="인쇄만 할 시험지(숙제 · 연습)에도 넷째 단계가 보인다. 시험지 만들기 화면의 단계 줄을 바꾼다."
    >
      <Frame tabs={OUTPUT_TABS}>
        <div className={s.toolbar}>
          <span className={s.muted}>범위 → 검토 → 출력 →</span>
          <Added>
            <b>내기</b>
          </Added>
        </div>
        <Added label="넷째 단계">
          <div className={s.body2}>
            <div className={s.review}>
              <b>{SHEET.title}</b>
              <span>{SHEET.range}</span>
              <span>
                {SHEET.count}문항 · {SHEET.kinds}
              </span>
              <span>총점 {SHEET.total}점</span>
              <span className={s.muted}>
                낸 시험지는 고칠 수 없습니다. 고치려면 출력 단계로 돌아가 고친
                뒤 다시 냅니다.
              </span>
            </div>
            <div className={s.review}>
              <div className={s.fieldRow}>
                <span className={s.fieldLabel}>시험 종류</span>
                <span className={s.select}>월말평가 ▾</span>
              </div>
              <div className={s.fieldRow}>
                <span className={s.fieldLabel}>시험일</span>
                <span className={s.select}>2026-10-30 ▾</span>
              </div>
              <span className={s.checks}>
                {CLASSES.map((c) => (
                  <Check key={c.name} on={c.on}>
                    {c.name} · {c.students}명
                  </Check>
                ))}
              </span>
              <span className={s.alignStart}>
                <Btn strong>2개 반에 내기</Btn>
              </span>
            </div>
          </div>
          <p className={s.sectionHead}>낸 시험</p>
          <IssuedList compact />
        </Added>
      </Frame>
    </Option>
  );
}

function OptionD() {
  return (
    <Option
      id="d"
      title="D안 — 반 화면에서"
      where="수업 · 학생 관리의 반 화면에 «시험 내기» → 고르기 창(PickerDialog)에서 저장한 시험지 고르기 → 시험일 · 종류."
      after="반 화면에 «이 반의 시험» 목록 — 확인테스트와 같은 줄에 월말평가가 섞여 채점 진행이 보인다."
      pro="반 단위로 일하는 원장님 습관에 맞는다. 한 반의 시험 기록이 한곳에 모인다."
      con="여러 반에 같은 시험을 내려면 반마다 한 번씩 낸다. 시험지 만들기와 화면이 떨어져 있다."
    >
      <Frame
        tabs={["중2 A반", "학생", "진도", "시험"]}
        label="원장 · 수업 · 학생 관리 · 반 화면 1040"
      >
        <div className={s.toolbar}>
          <span className={s.muted}>중2 A반 · 학생 12명</span>
          <span className={s.spacer} />
          <Added>
            <Btn strong>시험 내기</Btn>
          </Added>
        </div>
        <p className={s.sectionHead}>이 반의 시험</p>
        <table className={s.table}>
          <thead>
            <tr>
              <th>시험일</th>
              <th>종류</th>
              <th>제목</th>
              <th>채점</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr className={s.rowOn}>
              <td>10/30</td>
              <td className={s.addedCol}>월말평가</td>
              <td>{SHEET.title}</td>
              <td>12 / 12명</td>
              <td>
                <Btn small>채점하기</Btn>
              </td>
            </tr>
            <tr>
              <td>10/29</td>
              <td>확인테스트</td>
              <td>2-3 연립방정식</td>
              <td>12 / 12명</td>
              <td>
                <Btn small>채점하기</Btn>
              </td>
            </tr>
          </tbody>
        </table>
        <Added label="시험 내기 — 고르기 창">
          <p>
            저장한 시험지 고르기 · 지금 고른 것: <b>{SHEET.title}</b>{" "}
            <Btn small>바꾸기</Btn>
          </p>
          <div className={s.fieldRow}>
            <span className={s.fieldLabel}>시험 종류</span>
            <span className={s.select}>월말평가 ▾</span>
            <span className={s.fieldLabel}>시험일</span>
            <span className={s.select}>2026-10-30 ▾</span>
          </div>
          <span className={s.alignStart}>
            <Btn strong>중2 A반에 내기</Btn>
          </span>
        </Added>
      </Frame>
    </Option>
  );
}

/* ───────────── 페이지 ───────────── */

export function PublishWire() {
  return (
    <main className={s.shell}>
      <header className={s.head}>
        <h1 className={s.h1}>월말평가 M1 · 시험지를 반에 내기 — Wire 4안</h1>
        <p className={s.note}>
          작업실에서 만든 시험지를 반에 내면, 지금 확인테스트와 같은 채점표 ·
          재시험 · 기록으로 이어집니다. 설계는 «낸 그대로 고정»(계획서 M1
          B)입니다. 안끼리 다른 것은 내는 자리입니다. 굵은 테두리가 지금 화면에
          덧붙이는 부분입니다. 색 · 글꼴 · 모서리는 Hi-fi 단계에서 정합니다.
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
            <b>낸 시험지는 고정</b> — 문항 글 · 정답 · 배점 · 차례를 낸 그대로
            묶어 둡니다. 작업실 원본을 고쳐도 낸 시험은 바뀌지 않고, 다시 내면
            새 시험입니다.
          </li>
          <li>
            <b>반 여럿에 한 번에</b> — 반마다 채점표가 하나씩 생깁니다. 학생
            하나에게만 내는 것은 이번에 넣지 않습니다.
          </li>
          <li>
            <b>채점 · 재시험은 지금 화면</b> — 학생 × 문항 표 · 결시 · 미채점이
            그대로입니다. 새 채점 화면을 짓지 않습니다.
          </li>
          <li>
            <b>확인테스트와 섞이지 않음</b> — 낸 월말평가는 다음 확인테스트의
            범위와 아침 자동 초안을 바꾸지 않습니다.
          </li>
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
                ["내는 자리", "A · B · C · D 가운데 하나 — 추천 B"],
                [
                  "시험 종류",
                  "월말평가(기본) · 단원평가 · 내신 대비 · 기타 — 이름은 «시험»으로 넓게",
                ],
                ["시험일 기본값", "오늘"],
                ["학생 하나에게 내기", "이번에 넣지 않음"],
                [
                  "낸 시험 지우기",
                  "채점 전이면 지울 수 있음 · 채점이 시작되면 못 지움",
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

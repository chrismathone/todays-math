import type { ReactNode } from "react";

import s from "./QuotaWire.module.css";

/**
 * «오늘의 기억» 학생별 하루 분량 손잡이 Wire — 네 안.
 *
 * 바탕은 **지금 교사 현황 그대로**다(`TeacherFadingStatus` — 반 · 검색 → 살펴볼 학생 · 전체 명단 → 학생 상세)와
 * 학생 탐험 홈의 «오늘의 학습» 칸(`ExplorerConceptMemory` `DailyPlanCards`). 안끼리 다른 것은
 * **분량을 바꾸는 자리**(명단 줄 · 학생 상세 · 일괄 창 · 점검 순서)와 **멈춤 신호가 보이는 자리**다.
 * 덧붙인 자리는 굵은 테두리로 가른다. 문구는 실제로 쓸 말로 적는다(D-08 — 간결 · 사무적 · 느낌표 없음).
 */

/* ───────────── 픽스처 (지어낸 예 — 실제 학생 · 계정이 아니다) ───────────── */

type Quota = "기본" | 10 | 15 | 20;

type Row = {
  name: string;
  due: number;
  overdue: number;
  reason?: string;
  quota: Quota;
  /** 오늘 추가 확인 — 판정을 마친 수 / 상한 30. */
  checks: number;
  /** 오늘 멈춘 문장(같은 문장 3회 틀림). */
  stopped: number;
  /** 내일 이어서 할 문장. */
  carry: number;
  /** 최근 7일 가운데 상한에 닿은 날. */
  capDays: number;
};

const SERVICE_DEFAULT = 15;
const DAILY_CHECK_CAP = 30;

const ROWS: Row[] = [
  {
    name: "김민수",
    due: 6,
    overdue: 3,
    reason: "분량 점검 필요",
    quota: "기본",
    checks: 30,
    stopped: 2,
    carry: 8,
    capDays: 3,
  },
  {
    name: "이지수",
    due: 2,
    overdue: 0,
    reason: "보충 필요",
    quota: 10,
    checks: 14,
    stopped: 1,
    carry: 1,
    capDays: 0,
  },
  {
    name: "박서연",
    due: 4,
    overdue: 1,
    quota: "기본",
    checks: 9,
    stopped: 0,
    carry: 0,
    capDays: 0,
  },
  {
    name: "최도윤",
    due: 1,
    overdue: 0,
    quota: 20,
    checks: 6,
    stopped: 0,
    carry: 0,
    capDays: 0,
  },
  {
    name: "정하린",
    due: 3,
    overdue: 2,
    reason: "7일 넘게 쉼",
    quota: "기본",
    checks: 0,
    stopped: 0,
    carry: 0,
    capDays: 0,
  },
];

const quotaText = (q: Quota) =>
  q === "기본" ? `서비스 기본 ${SERVICE_DEFAULT}칸` : `학생 지정 ${q}칸`;

const relearnText = (r: Row) => {
  const parts: string[] = [];
  if (r.checks >= DAILY_CHECK_CAP)
    parts.push(`상한 ${r.checks}/${DAILY_CHECK_CAP}회`);
  else if (r.checks > 0) parts.push(`${r.checks}회`);
  if (r.stopped > 0) parts.push(`오늘 멈춤 ${r.stopped}문장`);
  if (r.carry > 0) parts.push(`내일 이어서 ${r.carry}문장`);
  return parts.length ? parts.join(" · ") : "없음";
};

/* ───────────── 공용 그림 조각 ───────────── */

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

function Select({ value }: { value: string }) {
  return <span className={s.select}>{value} ▾</span>;
}

function Radio({ on, children }: { on?: boolean; children: ReactNode }) {
  return (
    <span className={s.radio}>
      <span className={on ? s.radioOn : s.radioOff} aria-hidden="true" />
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

/** 작업실 본문(1040) 틀 — 지금 교사 현황의 머리와 도구 줄. */
function TeacherFrame({ children }: { children: ReactNode }) {
  return (
    <div className={s.scrollX}>
      <p className={s.frameLabel}>교사 · 작업실 본문 1040</p>
      <div className={s.teacher}>
        <div className={s.tabs}>
          <span>개념 카드</span>
          <span className={s.tabOn}>오늘의 기억 · 학생 현황</span>
          <span>진도 계획</span>
        </div>
        <div className={s.toolbar}>
          <span>
            반 <Select value="중2 A반" />
          </span>
          <span>
            학생 검색 <span className={s.input}>이름</span>
          </span>
          <span className={s.scope}>현재 반 5명 · 2026-10-17 기준</span>
        </div>
        {children}
      </div>
    </div>
  );
}

/** 폰(390) 틀 — 학생 탐험 홈의 «오늘의 학습» 칸. */
function StudentFrame({
  children,
  label = "학생 · 탐험 홈 390",
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <div>
      <p className={s.frameLabel}>{label}</p>
      <div className={s.phone}>
        <div className={s.phoneTop}>
          <span>수학 탐험</span>
          <span className={s.muted}>김민수</span>
        </div>
        {children}
      </div>
    </div>
  );
}

function DailyCard({
  quota,
  planned,
  done,
  extra,
}: {
  quota: string;
  planned: number;
  done: number;
  extra?: ReactNode;
}) {
  return (
    <section className={s.daily}>
      <h4>오늘의 학습</h4>
      <p className={s.muted}>
        기본 분량 {done} / {quota} · 오늘 배정 {planned}개
      </p>
      <dl className={s.dailyCounts}>
        <div>
          <dt>개념 묶음</dt>
          <dd>1 / 3묶음</dd>
        </div>
        <div>
          <dt>떠올릴 문장</dt>
          <dd>4 / 11문장</dd>
        </div>
        <div>
          <dt>문제 풀이</dt>
          <dd>0 / 2문제</dd>
        </div>
      </dl>
      <div className={s.bar} />
      {extra}
      <Btn strong>다음 활동</Btn>
    </section>
  );
}

function RelearnCard({ children }: { children: ReactNode }) {
  return (
    <section className={s.relearnCard}>
      <h4>추가 확인</h4>
      {children}
    </section>
  );
}

/* ───────────── 지금 화면의 명단 · 상세(덧붙이지 않은 부분) ───────────── */

function Roster({
  extraHead,
  extraCell,
  rows = ROWS,
  selected,
}: {
  extraHead?: string[];
  extraCell?: (r: Row) => ReactNode[];
  rows?: Row[];
  selected?: string;
}) {
  return (
    <table className={s.table}>
      <thead>
        <tr>
          <th>학생</th>
          <th>복습일 됨</th>
          <th>밀림</th>
          <th>살펴볼 까닭</th>
          {extraHead?.map((h) => (
            <th key={h} className={s.addedCol}>
              {h}
            </th>
          ))}
          <th>상세</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name} className={r.name === selected ? s.rowOn : ""}>
            <th scope="row">{r.name}</th>
            <td>{r.due}개</td>
            <td>{r.overdue}개</td>
            <td>{r.reason ?? "—"}</td>
            {extraCell?.(r).map((cell, i) => (
              <td key={i} className={s.addedCol}>
                {cell}
              </td>
            ))}
            <td>
              <Btn small>보기</Btn>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DetailMetrics({ r }: { r: Row }) {
  return (
    <>
      <header className={s.detailHead}>
        <p className={s.eyebrow}>학생 상세</p>
        <h4>{r.name}</h4>
        <small className={s.muted}>중2 A반 기준</small>
      </header>
      <dl className={s.metrics}>
        <div>
          <dt>복습일 된 개념</dt>
          <dd>{r.due}개</dd>
        </div>
        <div>
          <dt>밀린 개념</dt>
          <dd>{r.overdue}개</dd>
        </div>
        <div>
          <dt>최근 7일</dt>
          <dd>평가한 날 5일 · 첫 평가 2개</dd>
        </div>
        <div>
          <dt>추가 확인 남음</dt>
          <dd>{r.carry + 3}문장</dd>
        </div>
      </dl>
    </>
  );
}

/* ───────────── 안 넷 ───────────── */

function OptionA() {
  return (
    <Option
      id="a"
      title="A안 — 명단 줄에서 바로 바꾸기"
      where="전체 명단에 «하루 분량» · «오늘 추가 확인» 두 칸. 분량 칸의 고르기에서 바로 바꾼다."
      student="«오늘의 학습» 아래 한 줄: 남은 확인은 내일 이어서."
      pro="학생끼리 분량과 멈춤을 한 표에서 견준다. 한 명을 바꾸는 데 누름 둘."
      con="근거(최근 7일 · 밀림 추이)를 안 보고 바꾸기 쉽다. 표가 넓어져 좁은 창에서 가로로 민다."
    >
      <div className={s.pair}>
        <TeacherFrame>
          <div className={s.rosterOnly}>
            <h5 className={s.sectionHead}>전체 명단</h5>
            <Roster
              extraHead={["하루 분량 (내일부터)", "오늘 추가 확인"]}
              extraCell={(r) => [
                <span key="q" className={s.inlineQuota}>
                  <Select
                    value={
                      r.quota === "기본"
                        ? `기본 ${SERVICE_DEFAULT}`
                        : `${r.quota}칸`
                    }
                  />
                </span>,
                <span key="r">{relearnText(r)}</span>,
              ]}
            />
            <Added label="바꾸면 그 줄에 «저장 · 취소»">
              <p>
                김민수 · 서비스 기본 15칸 → <b>10칸</b> · 내일(10/18)부터{" "}
                <Btn small strong>
                  저장
                </Btn>{" "}
                <Btn small>취소</Btn>
              </p>
            </Added>
          </div>
        </TeacherFrame>
        <StudentFrame>
          <DailyCard quota="15개" planned={13} done={4} />
          <RelearnCard>
            <Added>
              <p>
                오늘 추가 확인은 여기까지예요. 남은 8문장은 내일 이어서 해요.
              </p>
            </Added>
          </RelearnCard>
        </StudentFrame>
      </div>
    </Option>
  );
}

function OptionB() {
  const r = ROWS[0];
  return (
    <Option
      id="b"
      title="B안 — 학생 상세에서 근거를 보고 바꾸기 (codex · Claude 추천)"
      where="지금 학생 상세 오른쪽 칸에 «오늘 추가 확인» 묶음과 «하루 분량» 칸을 더한다. 명단은 그대로."
      student="추가 확인 칸에 «지금 확인 · 내일 이어서» 수. 멈춘 문장에는 그 문장 자리에서 한 줄."
      pro="멈춤(보충 필요)과 상한 도달(분량 점검)을 갈라 보고 정한다. 지금 값 · 내일부터 값 · 적용일이 한곳에."
      con="여러 학생을 바꾸려면 상세를 한 명씩 연다."
    >
      <div className={s.pair}>
        <TeacherFrame>
          <div className={s.body}>
            <div className={s.rosterPanel}>
              <h5 className={s.sectionHead}>살펴볼 학생</h5>
              <Roster rows={ROWS.filter((x) => x.reason)} selected={r.name} />
              <h5 className={s.sectionHead}>전체 명단</h5>
              <p className={s.muted}>5명 · 지금과 같다</p>
            </div>
            <aside className={s.detail}>
              <DetailMetrics r={r} />
              <Added label="오늘 추가 확인">
                <dl className={s.metrics}>
                  <div>
                    <dt>판정한 확인</dt>
                    <dd>
                      {r.checks} / {DAILY_CHECK_CAP}회 · 상한 도달
                    </dd>
                  </div>
                  <div>
                    <dt>오늘 멈춤</dt>
                    <dd>{r.stopped}문장 · 보충 필요</dd>
                  </div>
                  <div>
                    <dt>내일 이어서</dt>
                    <dd>{r.carry}문장</dd>
                  </div>
                  <div>
                    <dt>최근 7일 상한 도달</dt>
                    <dd>{r.capDays}일 · 분량 점검 필요</dd>
                  </div>
                </dl>
                <p className={s.muted}>
                  멈춘 문장: 일차부등식의 해 · 부등호의 방향이 바뀌는 경우
                </p>
              </Added>
              <Added label="하루 분량">
                <p>지금 {quotaText(r.quota)}</p>
                <div className={s.radios}>
                  <Radio>서비스 기본({SERVICE_DEFAULT})</Radio>
                  <Radio on>10칸</Radio>
                  <Radio>15칸</Radio>
                  <Radio>20칸</Radio>
                </div>
                <p className={s.muted}>
                  내일(10/18)부터 학생 지정 10칸 · 칸은 문장 · 문제 · 활동
                  하나씩입니다.
                </p>
                <Btn strong>저장</Btn>
              </Added>
            </aside>
          </div>
        </TeacherFrame>
        <StudentFrame>
          <DailyCard quota="15개" planned={13} done={4} />
          <RelearnCard>
            <Added>
              <p>오늘 30회를 마쳤어요 · 내일 이어서 8문장</p>
              <p className={s.muted}>
                «부등호의 방향…» 이 문장은 오늘 여기까지예요. 내일 다시
                확인해요.
              </p>
            </Added>
          </RelearnCard>
        </StudentFrame>
      </div>
    </Option>
  );
}

function OptionC() {
  return (
    <Option
      id="c"
      title="C안 — 학생을 골라 한꺼번에 바꾸기"
      where="도구 줄에 «분량 바꾸기» 단추 → 고르기 창(PickerDialog)에서 학생을 고르고 값 하나를 정한 뒤 전후를 검토해 저장."
      student="«오늘의 학습»에 «내일부터 기본 분량 10개» 예고 한 줄."
      pro="처음 들일 때 · 학기 초에 반 전체를 빠르게 맞춘다. 반 기본값을 따로 만들지 않고 학생마다 값을 둔다."
      con="개별 근거를 놓치기 쉽다 — 검토 단계를 빼면 안 된다. 두 반에 든 학생은 한 번만 센다."
    >
      <div className={s.pair}>
        <TeacherFrame>
          <div className={s.rosterOnly}>
            <Added label="도구 줄 끝">
              <span className={s.alignStart}>
                <Btn>분량 바꾸기</Btn>
              </span>
            </Added>
            <div className={s.dialog}>
              <div className={s.dialogHead}>
                <b>하루 분량 바꾸기</b>
                <span className={s.muted}>중2 A반 · 3명 고름</span>
              </div>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>고름</th>
                    <th>학생</th>
                    <th>지금</th>
                    <th>오늘 추가 확인</th>
                    <th>바꾼 뒤</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.slice(0, 4).map((r, i) => (
                    <tr key={r.name}>
                      <td>{i < 3 ? "☑" : "☐"}</td>
                      <th scope="row">{r.name}</th>
                      <td>{quotaText(r.quota)}</td>
                      <td>{relearnText(r)}</td>
                      <td>{i < 3 ? "학생 지정 10칸" : "그대로"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>
                고른 학생의 분량 <Select value="10칸" /> · 내일(10/18)부터
              </p>
              <div className={s.dialogFoot}>
                <Btn>취소</Btn>
                <Btn strong>3명 저장</Btn>
              </div>
            </div>
          </div>
        </TeacherFrame>
        <StudentFrame>
          <DailyCard
            quota="15개"
            planned={13}
            done={4}
            extra={
              <Added>
                <p>내일부터 기본 분량이 10개예요.</p>
              </Added>
            }
          />
          <RelearnCard>
            <p className={s.muted}>남은 확인 8문장은 내일 이어서 해요.</p>
          </RelearnCard>
        </StudentFrame>
      </div>
    </Option>
  );
}

function OptionD() {
  const r = ROWS[0];
  return (
    <Option
      id="d"
      title="D안 — 살펴볼 학생부터 차례로 점검"
      where="«살펴볼 학생» 위에 «보충 필요 · 분량 점검 필요» 두 갈래 단추. 누르면 그 학생들을 한 명씩 넘기며 근거를 보고 분량을 정한다."
      student="계획을 다 마친 화면에 «오늘 멈춤 · 내일 이어서» 한 줄."
      pro="교사가 손댈 학생부터 본다. 보충과 분량 조정을 한 흐름에서."
      con="«최근 7일 상한 도달» 같은 날짜별 집계가 새로 있어야 한다. 아무 학생이나 바꾸려면 한 단계 더 든다."
    >
      <div className={s.pair}>
        <TeacherFrame>
          <div className={s.rosterOnly}>
            <Added label="살펴볼 학생 위">
              <div className={s.chips}>
                <Btn>보충 필요 2</Btn>
                <Btn strong>분량 점검 필요 1</Btn>
                <Btn>전체 학생</Btn>
              </div>
            </Added>
            <div className={s.review}>
              <div className={s.reviewHead}>
                <b>분량 점검 1 / 1 · {r.name}</b>
                <span>
                  <Btn small>이전</Btn> <Btn small>다음 학생</Btn>
                </span>
              </div>
              <dl className={s.metrics}>
                <div>
                  <dt>최근 7일 상한 도달</dt>
                  <dd>{r.capDays}일</dd>
                </div>
                <div>
                  <dt>내일 이어서</dt>
                  <dd>{r.carry}문장 · 10/14부터</dd>
                </div>
                <div>
                  <dt>오늘 멈춤</dt>
                  <dd>{r.stopped}문장</dd>
                </div>
                <div>
                  <dt>밀린 개념</dt>
                  <dd>{r.overdue}개</dd>
                </div>
              </dl>
              <p>
                지금 {quotaText(r.quota)} · 내일부터 <Select value="10칸" />{" "}
                <Btn small strong>
                  저장
                </Btn>
              </p>
            </div>
          </div>
        </TeacherFrame>
        <StudentFrame label="학생 · 오늘 계획을 마친 화면 390">
          <section className={s.daily}>
            <h4>오늘의 학습</h4>
            <p className={s.muted}>기본 분량 13 / 15개 · 오늘 배정 13개</p>
            <p>오늘 배정된 학습을 마쳤어요.</p>
            <Added>
              <p>
                추가 확인은 오늘 여기까지예요. 남은 8문장은 내일 이어서 해요.
              </p>
            </Added>
          </section>
        </StudentFrame>
      </div>
    </Option>
  );
}

function Option({
  id,
  title,
  where,
  student,
  pro,
  con,
  children,
}: {
  id: string;
  title: string;
  where: string;
  student: string;
  pro: string;
  con: string;
  children: ReactNode;
}) {
  return (
    <section className={s.option} id={id}>
      <h3 className={s.h3}>{title}</h3>
      <dl className={s.caption}>
        <dt>자리</dt>
        <dd>{where}</dd>
        <dt>학생 화면</dt>
        <dd>{student}</dd>
        <dt>좋은 점</dt>
        <dd>{pro}</dd>
        <dt>대가</dt>
        <dd>{con}</dd>
      </dl>
      {children}
    </section>
  );
}

/* ───────────── 머리 — 합의한 손잡이 · 모의 수치 · 여쭐 것 ───────────── */

const SIM: [string, string, string, string, string][] = [
  ["초등 성실", "17.6~22.0", "13.3~16.5", "13.3~16.3", "12.0~15.2 → 11.8~15.2"],
  [
    "초등 자주 틀림",
    "59.9~77.7",
    "44.5~56.8",
    "28.5~31.3",
    "4.2~4.8 → 4.0~5.0",
  ],
  ["중등 성실", "30.1~36.2", "22.9~27.5", "23.4~26.5", "8.4~11.2 → 9.6~10.6"],
  ["중등 불규칙", "69.8~87.1", "54.7~61.7", "37.0~39.3", "3.0~3.4 → 3.0~3.4"],
  [
    "중등 자주 틀림",
    "113.7~136.4",
    "81.1~95.4",
    "38.1~41.7",
    "3.6~4.2 → 3.8~4.4",
  ],
];

export function QuotaWire() {
  return (
    <main className={s.shell}>
      <header className={s.head}>
        <h1 className={s.h1}>오늘의 기억 · 학생별 하루 분량 — Wire 4안</h1>
        <p className={s.note}>
          손잡이 묶음은 codex 와 두 차례 협의해 정했습니다. 안끼리 다른 것은
          교사가 분량을 바꾸는 자리와 멈춤 신호가 보이는 자리입니다. 굵은
          테두리가 지금 화면에 덧붙이는 부분입니다. 색 · 글꼴 · 모서리는 Hi-fi
          단계에서 정합니다.
        </p>
        <nav className={s.jump}>
          <a href="#a">A안</a>
          <a href="#b">B안</a>
          <a href="#c">C안</a>
          <a href="#d">D안</a>
          <a href="#ask">여쭐 것</a>
        </nav>

        <h2 className={s.h2}>합의한 손잡이</h2>
        <ol className={s.must}>
          <li>
            <b>학생별 하루 분량</b> — 10 · 15 · 20칸 가운데 하나, 또는 서비스
            기본을 따름. 서비스 기본은 20 → <b>15칸</b>. 칸은 떠올릴 문장 · 문제
            · 탐험 활동 하나씩입니다. 바꾸면 <b>다음 날부터</b> 적용합니다.
            학생은 스스로 바꾸지 못합니다.
          </li>
          <li>
            <b>추가 확인 하루 30회 상한</b>(모든 학생 공통) — 30회를 마치면 그날
            추가 확인을 더 띄우지 않고, 남은 문장은 지우지 않고 내일로 넘깁니다.
          </li>
          <li>
            <b>같은 문장 하루 3회 틀림이면 그날 멈춤</b>(공통) — 교사에게 «보충
            필요»로 알립니다. 시간 단축 효과는 작고, 수업에서 설명할 학생을 찾는
            신호입니다.
          </li>
          <li>
            <b>시간(분) 예산은 이번에 하지 않습니다</b> — 실제 학습 시간을 재는
            장치가 없습니다.
          </li>
        </ol>

        <h2 className={s.h2}>모의 학습 결과 (35일 · 씨앗 5 · 가정 모형)</h2>
        <p className={s.note}>
          공부한 날 평균 분입니다. 학년 사이의 범위입니다. 행동 시간과 정답
          확률을 가정한 값이고, 탐험 문제 · 활동은 넣지 않았습니다. 실제
          시간이나 기억 효과를 잰 값이 아닙니다.
        </p>
        <div className={s.scrollX}>
          <table className={s.simTable}>
            <thead>
              <tr>
                <th>학생 유형</th>
                <th>지금 (20칸)</th>
                <th>15칸</th>
                <th>15칸 + 확인 30회 상한</th>
                <th>35일 배운 개념 (15칸 → 15칸 + 상한)</th>
              </tr>
            </thead>
            <tbody>
              {SIM.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, i) =>
                    i === 0 ? (
                      <th key={i} scope="row">
                        {cell}
                      </th>
                    ) : (
                      <td key={i}>{cell}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={s.note}>
          20칸 → 15칸에서 배운 개념은 줄어듭니다(중등 성실 11.8~13.4 →
          8.4~11.2). 30회 상한은 배운 개념을 거의 바꾸지 않습니다. 첫날은
          15칸에서도 중등이 40분 안팎이라, 첫 학습일 새 개념을 2묶음까지로 두는
          규칙을 함께 여쭙니다.
        </p>
      </header>

      <section className={s.topic}>
        <h2 className={s.h2}>교사 화면 · 학생 화면 — 네 안</h2>
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
                ["서비스 기본 분량", "15칸 (지금 20)"],
                ["학생별 선택지", "10 · 15 · 20칸 · 서비스 기본"],
                ["누가 바꾸나", "원장 · 지점 관리자 (강사는 보기만)"],
                ["추가 확인 상한", "하루 30회 · 모든 학생 공통"],
                ["같은 문장 멈춤", "그날 3회 틀림 · 교사에게 «보충 필요»"],
                [
                  "분량 점검 신호",
                  "최근 7일 중 3일 이상 상한 도달 + 남은 확인 있음",
                ],
                ["첫 학습일", "새 개념 2묶음까지"],
                ["적용 시점", "바꾼 다음 날부터"],
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

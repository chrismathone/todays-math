"use client";

import { useId, useState, type ReactNode } from "react";

import t from "@/components/fading/teacher/TeacherFadingStatus.module.css";
import e from "@/components/math-explorers/explorer-concept-memory.module.css";
import r from "@/components/fading/FadingRelearnCheck.module.css";

import h from "./QuotaHifi.module.css";

/**
 * 하루 분량 손잡이 Hi-fi 4안. 교사 쪽은 제품 H2 의 클래스, 학생 쪽은 탐험 홈 · 추가 확인 칸의 클래스를 그대로 쓴다.
 * 덧붙는 부분(«오늘 추가 확인» 묶음 · «하루 분량» 고르기 · 학생 알림)만 안마다 다르다.
 */

/* ───────────── 픽스처 (지어낸 예 — 실제 학생 · 계정이 아니다) ───────────── */

const TODAY = "10/17";
const TOMORROW = "10/18";
const SERVICE_DEFAULT = 15;

type Quota = "default" | 10 | 15 | 20;
const QUOTAS: Quota[] = ["default", 10, 15, 20];
const quotaName = (q: Quota) =>
  q === "default"
    ? `서비스 기본(현재 ${SERVICE_DEFAULT}칸)`
    : `학생 지정 ${q}칸`;
const quotaChip = (q: Quota) =>
  q === "default" ? `기본(${SERVICE_DEFAULT})` : `${q}칸`;

const STUDENT = {
  name: "김민수",
  className: "중2 A반",
  due: 6,
  overdue: 3,
  checksToday: 30,
  stopped: ["일차부등식의 해", "부등호의 방향이 바뀌는 경우"],
  carry: 8,
};

/** 최근 7일 — null 은 그날 기록 없음(쉰 날). */
const WEEK: { date: string; checks: number | null }[] = [
  { date: "10/11", checks: 12 },
  { date: "10/12", checks: null },
  { date: "10/13", checks: 30 },
  { date: "10/14", checks: 18 },
  { date: "10/15", checks: 30 },
  { date: "10/16", checks: 22 },
  { date: "10/17", checks: 30 },
];
const CAP = 30;
const capDays = WEEK.filter((d) => d.checks === CAP).length;

type Row = {
  name: string;
  cls: string;
  due: number;
  overdue: number;
  flags: string[];
};
const ROWS: Row[] = [
  {
    name: "김민수",
    cls: "중2 A반",
    due: 6,
    overdue: 3,
    flags: ["복습 밀림", "분량 점검 필요"],
  },
  { name: "이지수", cls: "중2 A반", due: 2, overdue: 0, flags: ["보충 필요"] },
  {
    name: "정하린",
    cls: "중2 B반",
    due: 3,
    overdue: 2,
    flags: ["복습 밀림", "오래 쉼"],
  },
];

/* ───────────── 저장 상태 — 네 안이 같다 ───────────── */

type SaveState =
  "idle" | "draft" | "saving" | "saved" | "failed" | "conflict" | "readonly";
const SAVE_STATES: { key: SaveState; label: string }[] = [
  { key: "idle", label: "바꾸기 전" },
  { key: "draft", label: "고른 뒤 · 저장 전" },
  { key: "saving", label: "저장 중" },
  { key: "saved", label: "저장됨" },
  { key: "failed", label: "저장 실패" },
  { key: "conflict", label: "다른 사람이 먼저 바꿈" },
  { key: "readonly", label: "강사 · 보기만" },
];

const DRAFT: Quota = 10;
const OTHER: Quota = 20;

type Knob = {
  state: SaveState;
  value: Quota;
  setValue: (q: Quota) => void;
};

function knobValue(state: SaveState, picked: Quota | null): Quota {
  if (picked !== null && state !== "idle" && state !== "readonly")
    return picked;
  return state === "idle" || state === "readonly" ? "default" : DRAFT;
}

/** 오늘 적용 · 내일 적용 · 저장 결과. 안마다 위치만 다르고 문구는 같다. */
function SaveLines({ state, value }: { state: SaveState; value: Quota }) {
  return (
    <div className={h.saveLines}>
      <p>
        오늘 적용 <strong>{quotaName("default")}</strong>
      </p>
      {state === "draft" || state === "failed" || state === "saving" ? (
        <p>
          변경안{" "}
          <strong>
            {TOMORROW}부터 {quotaName(value)}
          </strong>{" "}
          · 저장 전
        </p>
      ) : null}
      {state === "saving" ? (
        <p role="status" className={h.quiet}>
          저장 중
        </p>
      ) : null}
      {state === "saved" ? (
        <p role="status" className={h.saved}>
          저장됨 · {TOMORROW}부터 {quotaName(value)}
        </p>
      ) : null}
      {state === "failed" ? (
        <p role="alert" className={h.alert}>
          저장하지 못했습니다. 다시 시도해 주세요.
        </p>
      ) : null}
      {state === "conflict" ? (
        <div role="alert" className={h.alert}>
          <p>
            분량 설정이 변경되었습니다. 최신 설정을 확인한 뒤 다시 저장해
            주세요.
          </p>
          <p>
            최신 {TOMORROW}부터 {quotaName(OTHER)} · 내 변경안{" "}
            {quotaName(value)}
          </p>
        </div>
      ) : null}
      {state === "readonly" ? (
        <p className={h.quiet}>
          분량 변경은 원장 · 지점 관리자가 할 수 있습니다.
        </p>
      ) : null}
    </div>
  );
}

function SaveButton({ state }: { state: SaveState }) {
  if (state === "readonly") return null;
  const label =
    state === "saving"
      ? "저장 중"
      : state === "failed"
        ? "다시 저장"
        : state === "conflict"
          ? "최신 설정 불러오기"
          : "저장";
  return (
    <button
      type="button"
      className={state === "conflict" ? t.button : h.save}
      disabled={state === "idle" || state === "saving" || state === "saved"}
    >
      {label}
    </button>
  );
}

function Radios({
  knob,
  legend,
  chips,
}: {
  knob: Knob;
  legend: string;
  chips?: boolean;
}) {
  const name = useId();
  if (knob.state === "readonly") return null;
  return (
    <fieldset className={chips ? h.chips : h.radioList}>
      <legend>{legend}</legend>
      {QUOTAS.map((q) => (
        <label key={String(q)}>
          <input
            type="radio"
            name={name}
            checked={knob.value === q}
            disabled={knob.state === "saving"}
            onChange={() => knob.setValue(q)}
          />
          <span>{chips ? quotaChip(q) : quotaName(q)}</span>
        </label>
      ))}
    </fieldset>
  );
}

/* ───────────── 교사 틀 (제품 H2 그대로) ───────────── */

function Roster() {
  return (
    <div className={t.rosterPanel}>
      <section className={t.attention}>
        <header className={t.sectionHeading}>
          <h4>살펴볼 학생</h4>
          <span>3명</span>
        </header>
        <table className={t.roster} aria-label="살펴볼 학생">
          <thead>
            <tr>
              <th scope="col">학생</th>
              <th scope="col">복습일 됨</th>
              <th scope="col">밀림</th>
              <th scope="col">살펴볼 까닭</th>
              <th scope="col">상세</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr key={row.name} data-selected={i === 0 ? "true" : undefined}>
                <th scope="row">
                  <span>{row.name}</span>
                  <small>{row.cls}</small>
                </th>
                <td>
                  {row.due}
                  <span className={t.unit}>개</span>
                </td>
                <td>
                  {row.overdue}
                  <span className={t.unit}>개</span>
                </td>
                <td>
                  <span className={t.flags}>
                    {row.flags.map((f) => (
                      <span className={t.flag} key={f}>
                        {f}
                      </span>
                    ))}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className={t.viewButton}
                    aria-pressed={i === 0}
                  >
                    보기
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className={t.allRoster}>
        <header className={t.sectionHeading}>
          <h4>전체 명단</h4>
          <span>등록 12건</span>
        </header>
        <p className={t.muted}>지금 화면과 같습니다.</p>
      </section>
    </div>
  );
}

function DetailTop({ extra }: { extra?: ReactNode }) {
  return (
    <>
      <header className={t.detailHeader}>
        <p className={t.eyebrow}>학생 상세</p>
        <h3>{STUDENT.name}</h3>
        <p>{STUDENT.className}</p>
        <small>현재 {STUDENT.className} 기준</small>
        {extra}
      </header>
      <span className={t.flags}>
        {ROWS[0].flags.map((f) => (
          <span className={t.flag} key={f}>
            {f}
          </span>
        ))}
      </span>
      <dl className={t.primaryMetrics}>
        <div>
          <dt>복습일 된 개념</dt>
          <dd>
            {STUDENT.due}
            <span>개</span>
          </dd>
        </div>
        <div>
          <dt>밀린 개념</dt>
          <dd>
            {STUDENT.overdue}
            <span>개</span>
          </dd>
        </div>
      </dl>
    </>
  );
}

function BaseMetrics({ children }: { children?: ReactNode }) {
  return (
    <dl className={t.metrics}>
      <div>
        <dt>배운 개념</dt>
        <dd>11개</dd>
      </div>
      <div>
        <dt>오늘 마친 풀이</dt>
        <dd>13회</dd>
      </div>
      <div>
        <dt>추가 확인 남음</dt>
        <dd>{STUDENT.carry}문장</dd>
      </div>
      <div>
        <dt>최근 7일</dt>
        <dd>평가한 날 6일 · 첫 평가 2개</dd>
      </div>
      {children}
    </dl>
  );
}

function TeacherFrame({ detail }: { detail: ReactNode }) {
  return (
    <div className={h.teacherScroll}>
      <p className={h.frameLabel}>원장 · 작업실 본문 1040</p>
      <section
        className={`${t.root} ${h.teacher}`}
        data-hifi="H2"
        aria-label="오늘의 기억 학생 현황"
      >
        <header className={t.productHeader}>
          <div>
            <p className={t.eyebrow}>오늘의 기억 · SRS</p>
            <h2>학생 현황</h2>
          </div>
        </header>
        <div className={t.body}>
          <Roster />
          <aside className={t.detail} aria-label={`${STUDENT.name} 학생 상세`}>
            {detail}
          </aside>
        </div>
      </section>
    </div>
  );
}

/* ───────────── 학생 틀 (탐험 홈 그대로) ───────────── */

function StudentFrame({
  notice,
  belowDaily,
}: {
  notice: ReactNode;
  belowDaily?: ReactNode;
}) {
  return (
    <div>
      <p className={h.frameLabel}>학생 · 탐험 홈 390</p>
      <div className={h.phone}>
        <section className={e.panel} aria-label="오늘의 기억">
          <header className={e.header}>
            <div>
              <p className={e.eyebrow}>오늘의 기억</p>
              <h2>개념 복습</h2>
            </div>
            <span className={e.streak}>연속 4일</span>
          </header>
          <aside className={r.status} aria-label="추가 재학습 현황">
            <strong>추가 확인 · 오늘 {STUDENT.checksToday}회</strong>
            <span>기본 분량과 따로 확인해요.</span>
            {notice}
          </aside>
          <section className={e.daily} aria-label="오늘의 자동 학습 계획">
            <h3>오늘의 학습</h3>
            <p className={e.note}>기본 분량 4 / 15개 · 오늘 배정 13개</p>
            <dl className={e.dailyCounts}>
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
              <div>
                <dt>탐험 카드</dt>
                <dd>0 / 0활동</dd>
              </div>
            </dl>
            <div className={e.nextCard}>
              <p className={e.eyebrow}>복습할 개념</p>
              <strong>연립방정식의 해</strong>
              <p className={e.note}>복습할 때가 지났어요.</p>
              <button type="button" className={e.primary}>
                다음 활동
              </button>
            </div>
            {belowDaily}
          </section>
        </section>
      </div>
    </div>
  );
}

const CAP_LINE =
  "오늘 추가 확인은 여기까지예요. 남은 문장은 내일부터 이어서 확인해요.";
const STOP_LINE = "이 문장은 오늘 여기까지예요. 내일부터 다시 확인해요.";

/* ───────────── 안 넷 ───────────── */

/** Q1 — 지표 줄에 잇기: 새 수치는 기존 지표 칸의 소제목 아래 줄, 분량은 칩 넷. */
function Q1({ knob }: { knob: Knob }) {
  return (
    <div className={h.pair}>
      <TeacherFrame
        detail={
          <>
            <DetailTop />
            <BaseMetrics />
            <h4 className={h.subhead}>오늘 추가 확인</h4>
            <dl className={t.metrics}>
              <div>
                <dt>판정한 확인</dt>
                <dd>{STUDENT.checksToday}회 · 하루 상한 도달</dd>
              </div>
              <div>
                <dt>오늘 멈춘 문장</dt>
                <dd>{STUDENT.stopped.length}문장 · 보충 필요</dd>
              </div>
              <div>
                <dt>내일 이어서</dt>
                <dd>{STUDENT.carry}문장</dd>
              </div>
              <div>
                <dt>최근 7일 상한 도달</dt>
                <dd>{capDays}일</dd>
              </div>
            </dl>
            <p className={t.note}>멈춘 문장 · {STUDENT.stopped.join(" · ")}</p>
            <div className={h.knobQ1}>
              <Radios knob={knob} legend="하루 분량" chips />
              {knob.state === "readonly" ? (
                <h4 className={h.subhead}>하루 분량</h4>
              ) : null}
              <SaveLines state={knob.state} value={knob.value} />
              <SaveButton state={knob.state} />
            </div>
          </>
        }
      />
      <StudentFrame
        notice={<span className={h.studentLine}>{CAP_LINE}</span>}
      />
    </div>
  );
}

/** Q2 — 신호 카드: «오늘 추가 확인»을 흰 묶음으로, 필요한 상태에만 호박색 딱지. 분량은 select. */
function Q2({ knob }: { knob: Knob }) {
  const selectId = useId();
  return (
    <div className={h.pair}>
      <TeacherFrame
        detail={
          <>
            <DetailTop />
            <BaseMetrics />
            <section className={h.card} aria-label="오늘 추가 확인">
              <header className={h.cardHead}>
                <h4>오늘 추가 확인</h4>
                <span className={t.flag}>하루 상한 도달</span>
              </header>
              <dl className={h.cardRows}>
                <div>
                  <dt>판정한 확인</dt>
                  <dd>{STUDENT.checksToday}회</dd>
                </div>
                <div>
                  <dt>내일 이어서</dt>
                  <dd>{STUDENT.carry}문장</dd>
                </div>
                <div>
                  <dt>
                    오늘 멈춘 문장 <span className={t.flag}>보충 필요</span>
                  </dt>
                  <dd>{STUDENT.stopped.length}문장</dd>
                </div>
              </dl>
              <ul className={h.stopList}>
                {STUDENT.stopped.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <p className={h.cardFoot}>
                최근 7일 중 {capDays}일 상한 도달{" "}
                <span className={t.flag}>분량 점검 필요</span>
              </p>
            </section>
            <section className={h.card} aria-label="하루 분량">
              <header className={h.cardHead}>
                <h4>하루 분량</h4>
              </header>
              {knob.state === "readonly" ? null : (
                <label className={h.selectLabel} htmlFor={selectId}>
                  {TOMORROW}부터
                  <select
                    id={selectId}
                    value={String(knob.value)}
                    disabled={knob.state === "saving"}
                    onChange={(ev) =>
                      knob.setValue(
                        ev.target.value === "default"
                          ? "default"
                          : (Number(ev.target.value) as Quota),
                      )
                    }
                  >
                    {QUOTAS.map((q) => (
                      <option key={String(q)} value={String(q)}>
                        {quotaName(q)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <SaveLines state={knob.state} value={knob.value} />
              <p className={t.note}>
                칸은 떠올릴 문장 · 문제 · 활동 하나씩입니다.
              </p>
              <SaveButton state={knob.state} />
            </section>
          </>
        }
      />
      <StudentFrame
        notice={
          <div className={h.studentBlock}>
            <p>{CAP_LINE}</p>
            <p>
              오늘 멈춘 문장 {STUDENT.stopped.length} · 내일부터 다시 확인해요.
            </p>
          </div>
        }
      />
    </div>
  );
}

/** Q3 — 머리줄 분량: 이름 아래 지금 분량 한 줄 + 바꾸기, 그 자리에서 펼친다. 추가 확인은 짧은 수치 줄. */
function Q3({ knob }: { knob: Knob }) {
  const [open, setOpen] = useState(true);
  const panelId = useId();
  const scheduled = knob.state === "saved";
  return (
    <div className={h.pair}>
      <TeacherFrame
        detail={
          <>
            <DetailTop
              extra={
                <div className={h.headKnob}>
                  <p>
                    하루 분량 <strong>{quotaName("default")}</strong>
                    {scheduled ? (
                      <span className={h.scheduled}>
                        {TOMORROW}부터 {quotaName(knob.value)}
                      </span>
                    ) : null}
                  </p>
                  {knob.state === "readonly" ? null : (
                    <button
                      type="button"
                      className={t.button}
                      aria-expanded={open}
                      aria-controls={panelId}
                      onClick={() => setOpen((v) => !v)}
                    >
                      {open ? "닫기" : "바꾸기"}
                    </button>
                  )}
                </div>
              }
            />
            {open || knob.state === "readonly" ? (
              <div id={panelId} className={h.headPanel}>
                <Radios knob={knob} legend={`${TOMORROW}부터 하루 분량`} />
                <SaveLines state={knob.state} value={knob.value} />
                <SaveButton state={knob.state} />
              </div>
            ) : null}
            <p className={h.factLine}>
              오늘 추가 확인{" "}
              <strong>{STUDENT.checksToday}회 · 상한 도달</strong>
              <span aria-hidden="true">·</span>
              멈춘 문장 <strong>{STUDENT.stopped.length}</strong>
              <span aria-hidden="true">·</span>
              내일 이어서 <strong>{STUDENT.carry}문장</strong>
            </p>
            <p className={t.note}>
              최근 7일 중 {capDays}일 상한 도달 · 멈춘 문장{" "}
              {STUDENT.stopped.join(" · ")}
            </p>
            <BaseMetrics />
          </>
        }
      />
      <StudentFrame
        notice={<span className={h.studentLine}>{CAP_LINE}</span>}
        belowDaily={
          <p className={e.note}>
            추가 확인은 내일부터 이어서 해요. 오늘의 학습은 계속할 수 있어요.
          </p>
        }
      />
    </div>
  );
}

/** Q4 — 최근 7일 띠: 날짜별 상한 도달을 근거로 옆에서 분량을 정한다. */
function Q4({ knob }: { knob: Knob }) {
  return (
    <div className={h.pair}>
      <TeacherFrame
        detail={
          <>
            <DetailTop />
            <section className={h.weekBlock} aria-label="최근 7일 추가 확인">
              <h4 className={h.subhead}>최근 7일 추가 확인</h4>
              <ol className={h.week}>
                {WEEK.map((d) => (
                  <li
                    key={d.date}
                    data-cap={d.checks === CAP ? "true" : undefined}
                    data-empty={d.checks === null ? "true" : undefined}
                  >
                    <span>{d.date}</span>
                    <strong>
                      {d.checks === null ? "기록 없음" : `${d.checks}회`}
                    </strong>
                    <small>
                      {d.checks === CAP
                        ? "상한 도달"
                        : d.checks === null
                          ? ""
                          : "미도달"}
                    </small>
                  </li>
                ))}
              </ol>
              <p className={t.note}>
                {capDays}일 상한 도달 · 오늘 멈춘 문장 {STUDENT.stopped.length}(
                {STUDENT.stopped.join(" · ")}) · 내일 이어서 {STUDENT.carry}문장
              </p>
            </section>
            <div className={h.knobQ4}>
              <Radios knob={knob} legend="하루 분량" chips />
              {knob.state === "readonly" ? (
                <h4 className={h.subhead}>하루 분량</h4>
              ) : null}
              <SaveLines state={knob.state} value={knob.value} />
              <SaveButton state={knob.state} />
            </div>
            <BaseMetrics />
          </>
        }
      />
      <StudentFrame
        notice={
          <div className={h.studentBlock}>
            <p>{CAP_LINE}</p>
            <ul className={h.studentStops}>
              {STUDENT.stopped.map((p) => (
                <li key={p}>
                  «{p}» — {STOP_LINE}
                </li>
              ))}
            </ul>
          </div>
        }
      />
    </div>
  );
}

const OPTIONS = [
  {
    id: "Q1",
    title: "지표 줄에 잇기",
    body: "새 수치를 지금 지표 칸의 «오늘 추가 확인» 소제목 아래 줄로 잇고, 분량은 칩 넷으로 고릅니다. 가장 조용합니다.",
    View: Q1,
  },
  {
    id: "Q2",
    title: "신호 카드",
    body: "«오늘 추가 확인»과 «하루 분량»을 흰 묶음 둘로 둡니다. 상한 도달 · 보충 필요 · 분량 점검 필요에만 호박색 딱지를 붙입니다.",
    View: Q2,
  },
  {
    id: "Q3",
    title: "머리줄 분량",
    body: "학생 이름 아래에 지금 분량 한 줄과 «바꾸기». 누르면 그 자리에서 펼쳐집니다. 추가 확인은 짧은 수치 한 줄입니다.",
    View: Q3,
  },
  {
    id: "Q4",
    title: "최근 7일 띠",
    body: "날짜별 추가 확인 수와 상한 도달을 띠로 보이고, 바로 아래에서 분량을 정합니다. 날짜별 집계가 따로 있어야 합니다.",
    View: Q4,
  },
] as const;

export function QuotaHifi() {
  const [state, setState] = useState<SaveState>("draft");
  const [picked, setPicked] = useState<Quota | null>(null);
  const knob: Knob = {
    state,
    value: knobValue(state, picked),
    setValue: (q) => {
      setPicked(q);
      if (state === "idle") setState("draft");
    },
  };
  return (
    <div className={h.root}>
      <header className={h.heading}>
        <p className={h.kicker}>오늘의 기억 · 하루 분량 손잡이 · Wire B</p>
        <h1>하루 분량 · Hi-fi 4안</h1>
        <p>
          김민수 학생이 {TODAY} 추가 확인 하루 상한(30회)에 닿았고, 같은 문장
          «틀림» 3회로 두 문장이 멈췄습니다. 최근 7일 중 {capDays}일 상한에 닿아
          «분량 점검 필요»입니다. 원장이 {TOMORROW}부터 10칸으로 바꾸는
          장면입니다.
        </p>
        <p className={h.quiet}>
          교사 쪽은 지금 학생 현황(H2), 학생 쪽은 탐험 홈 그대로입니다. 안끼리
          다른 것은 덧붙는 부분뿐이고, 저장 상태 문구는 네 안이 같습니다.
          아무것도 저장하지 않습니다.
        </p>
        <nav className={h.nav} aria-label="시안 이동">
          {OPTIONS.map((o) => (
            <a key={o.id} href={`#${o.id}`}>
              {o.id} {o.title}
              {o.id === "Q2" ? " · 추천" : ""}
            </a>
          ))}
          <a href="/dev/fading-quota-wire#b">Wire B 보기</a>
        </nav>
        <label className={h.statePicker}>
          저장 상태 표본
          <select
            value={state}
            onChange={(ev) => {
              setState(ev.target.value as SaveState);
              setPicked(null);
            }}
          >
            {SAVE_STATES.map((st) => (
              <option key={st.key} value={st.key}>
                {st.label}
              </option>
            ))}
          </select>
        </label>
      </header>
      {OPTIONS.map(({ id, title, body, View }) => (
        <section
          key={id}
          id={id}
          className={h.option}
          data-testid="quota-hifi-option"
        >
          <header className={h.optionHead}>
            <div>
              <h2>
                {id} · {title}
              </h2>
              <p>{body}</p>
            </div>
            {id === "Q2" ? <span className={h.badge}>추천</span> : null}
          </header>
          <View knob={knob} />
        </section>
      ))}
      <footer className={h.footNote}>
        <h2>모든 안에 공통</h2>
        <ul>
          <li>
            바꾼 분량은 다음 한국 날짜부터 적용됩니다. 오늘 적용 값은 저장한
            뒤에도 그대로 보입니다.
          </li>
          <li>
            강사는 지금 값과 예약된 값만 봅니다. 다른 사람이 먼저 바꿨으면
            덮어쓰지 않고 최신 값과 내 변경안을 함께 보입니다.
          </li>
          <li>
            학생에게는 상한 수(30)를 보이지 않습니다. 기본 분량은 상한과 따로
            계속할 수 있습니다.
          </li>
          <li>
            첫 학습일 새 개념 2묶음 · 30회 상한 · 3회 멈춤은 공통 규칙이라
            화면에서 바꾸지 않습니다.
          </li>
        </ul>
      </footer>
    </div>
  );
}

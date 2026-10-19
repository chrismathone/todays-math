"use client";

import { useState, type ReactNode } from "react";

import eb from "@/components/exam-builder/ExamBuilder.module.css";

import { Builder, ReviewColumn, TitleBar } from "../exam-builder-hifi/parts";
import { ScopeTableStatic } from "../exam-builder-hifi/W4Compose";
import { SCOPES } from "../exam-builder-hifi/fixtures";
import h from "../exam-builder-hifi/hifi.module.css";
import k from "./StepsHifi.module.css";

/**
 * 시험지 만들기 1 · 2단계 분리 Hi-fi 4안 — Wire B(1단계 = 범위 고르기 + 구성표 두 칸 · 원장님 «추천으로 진행» 2026-10-17).
 *
 * 바탕은 실제 `ExamBuilder.module.css` · `StudioStepBar` · 지금 구성표 · 검토 칸(이전 시안 부품) 그대로다. 상단 줄은 오늘 걷었으므로 그리지 않는다.
 * 1단계 왼쪽 칸은 지금 «범위 변경» 창의 속(학년 · 과정 / 단원 묶음 / 검색 / 담은 범위만 · 체크 목록)을 화면에 편 것이다 —
 * **«적용» 단추가 없다**: 체크하면 바로 오른쪽 구성표에 줄이 생긴다. 안끼리 다른 것은 왼쪽 칸의 모양과 2단계 맨 위 요약의 모양뿐이다.
 * 지어낸 픽스처다. 아무것도 저장 · 호출하지 않는다.
 */

const MENU = [
  "오늘의 작업",
  "시험지 만들기",
  "연산대장",
  "문제 추출",
  "내 시험지",
  "교재 제작",
  "수업 · 학생 관리",
];

/** 상단 줄 없는 작업실 틀(2026-10-17 상단 줄을 걷은 뒤의 모양). */
function Frame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={h.frameBlock}>
      <p className={h.frameLabel}>{label}</p>
      <div className={h.scrollX}>
        <div className={`${h.desktop} ${k.desktop}`} data-hifi-frame="desktop">
          <nav className={h.side} aria-label="작업실 메뉴(그림)">
            <b className={h.brand}>오늘의 수학</b>
            <ul>
              {MENU.map((item) => (
                <li
                  key={item}
                  className={item === "시험지 만들기" ? h.sideOn : undefined}
                >
                  {item}
                </li>
              ))}
            </ul>
          </nav>
          <div className={h.main}>
            <div className={h.page}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 범위 고르기의 목록 — 고른 셋(구성표에 있는 범위)과 고르지 않은 둘, 문항이 없는 하나. */
const PICK = [
  ...SCOPES.map((s) => ({
    id: s.id,
    label: s.label,
    detail: s.detail,
    count: s.avail,
    on: true,
  })),
  {
    id: "s4",
    label: "연립방정식의 풀이",
    detail: "중2-1 · 연립방정식",
    count: 71,
    on: false,
  },
  {
    id: "s5",
    label: "연립방정식의 활용",
    detail: "중2-1 · 연립방정식",
    count: 39,
    on: false,
  },
  {
    id: "s6",
    label: "일차함수와 그래프 (심화)",
    detail: "중2-1 · 일차함수",
    count: 0,
    on: false,
  },
];

function Filters({ chips }: { chips?: boolean }) {
  if (chips)
    return (
      <div className={k.chipBlock}>
        <div className={k.chips} role="group" aria-label="학년 · 과정(그림)">
          {["중1-1", "중1-2", "중2-1", "중2-2", "중3-1"].map((g) => (
            <button key={g} type="button" aria-pressed={g === "중2-1"}>
              {g}
            </button>
          ))}
        </div>
        <div className={k.chips} role="group" aria-label="단원 묶음(그림)">
          {["전체", "부등식", "연립방정식", "일차함수"].map((g) => (
            <button key={g} type="button" aria-pressed={g === "전체"}>
              {g}
            </button>
          ))}
        </div>
        <div className={eb.dialogFilters}>
          <label className={eb.grow}>
            범위 검색
            <input placeholder="단원·차시·자료 이름으로 검색" readOnly />
          </label>
        </div>
      </div>
    );
  return (
    <div className={eb.dialogFilters}>
      <label>
        학년·과정
        <select defaultValue="중2-1">
          <option>중2-1</option>
        </select>
      </label>
      <label>
        단원·자료 묶음
        <select defaultValue="">
          <option value="">전체</option>
        </select>
      </label>
      <label className={eb.grow}>
        범위 검색
        <input placeholder="단원·차시·자료 이름으로 검색" readOnly />
      </label>
      <label className={eb.check}>
        <input type="checkbox" readOnly />
        담은 범위만 보기
      </label>
    </div>
  );
}

function ScopeList({
  highlight,
  compact,
}: {
  highlight?: boolean;
  compact?: boolean;
}) {
  const [on, setOn] = useState(
    () => new Set(PICK.filter((p) => p.on).map((p) => p.id)),
  );
  return (
    <>
      <div className={eb.scopeActions}>
        <label className={eb.check}>
          <input type="checkbox" readOnly />
          현재 결과 전체 선택
        </label>
        <span>
          {PICK.length}개 범위 · {on.size}개 선택
        </span>
        <button type="button" onClick={() => setOn(new Set())}>
          선택 비우기
        </button>
      </div>
      <ul className={`${eb.scopeList} ${compact ? k.compact : ""}`}>
        {PICK.map((p) => (
          <li
            key={p.id}
            className={highlight && on.has(p.id) ? k.chosen : undefined}
          >
            <label>
              <input
                type="checkbox"
                checked={on.has(p.id)}
                disabled={p.count === 0}
                onChange={() =>
                  setOn((now) => {
                    const next = new Set(now);
                    if (next.has(p.id)) next.delete(p.id);
                    else next.add(p.id);
                    return next;
                  })
                }
              />
              <span>
                <strong>{p.label}</strong>{" "}
                {compact ? null : <small>{p.detail}</small>}
              </span>
              <small>
                {p.count ? `${p.count}문항` : "출제 가능 문항 없음"}
              </small>
            </label>
          </li>
        ))}
      </ul>
    </>
  );
}

function Step1({ left, narrow }: { left: ReactNode; narrow?: boolean }) {
  return (
    <Builder step="scope">
      <div className={k.step1}>
        <TitleBar />
        <div className={eb.toolbar}>
          <label>출제 조건</label>
          <span className={k.muted}>직접 정함 — 저장한 조건을 쓰지 않음</span>
          <button type="button">저장한 조건 · 0</button>
        </div>
        <div className={narrow ? k.twoNarrow : k.two}>
          <section
            className={`${eb.panel} ${k.picker}`}
            aria-label="범위 고르기(그림)"
          >
            <header className={eb.panelHeader}>
              <strong>범위 고르기</strong>
              <span className={eb.summary}>
                체크하면 오른쪽 구성표에 바로 들어갑니다.
              </span>
            </header>
            {left}
          </section>
          <ScopeTableStatic change={false} />
        </div>
      </div>
    </Builder>
  );
}

function Step2({ summary }: { summary: ReactNode }) {
  return (
    <Builder step="review">
      <div className={k.step2}>
        {summary}
        <ReviewColumn />
      </div>
    </Builder>
  );
}

const PlainSummary = (
  <div className={k.summaryBar}>
    <span>
      <b>{SCOPES.length}개 범위</b> · 18문항 · 난이도 지정 없음 · 최근 14일 출제
      뺌
    </span>
    <button type="button">범위 설정 고치기</button>
  </div>
);
const ChipSummary = (
  <div className={k.summaryBar}>
    <span className={k.badges}>
      {SCOPES.map((s) => (
        <span key={s.id} className={eb.badge}>
          {s.label} {s.count}
        </span>
      ))}
    </span>
    <button type="button">범위 설정 고치기</button>
  </div>
);
const TableSummary = (
  <details className={k.summaryCard} open>
    <summary>
      <b>1단계 — {SCOPES.length}개 범위 · 18문항</b>
      <span className={k.muted}>펼쳐 보기</span>
    </summary>
    <table className={eb.table}>
      <tbody>
        {SCOPES.map((s) => (
          <tr key={s.id}>
            <td>{s.label}</td>
            <td>{s.count}문항</td>
            <td>{s.fixed ? "고정" : "자동"}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <button type="button">범위 설정 고치기</button>
  </details>
);

const OPTIONS = [
  {
    id: "H1",
    title: "H1 · 창의 속 그대로 (Claude 추천)",
    idea: "지금 «범위 변경» 창의 필터 · 목록을 그대로 왼쪽 칸에 편다. 2단계 맨 위는 글 한 줄 요약.",
    cost: "왼쪽 칸이 좁아 필터 넷이 두 줄로 내려앉는다.",
    one: (
      <Step1
        left={
          <>
            <Filters />
            <ScopeList />
          </>
        }
      />
    ),
    two: <Step2 summary={PlainSummary} />,
  },
  {
    id: "H2",
    title: "H2 · 학년 · 단원 칩",
    idea: "학년 · 과정과 단원 묶음을 고르기 상자 대신 칩 두 줄로. 2단계 요약은 범위마다 딱지.",
    cost: "학년 · 단원이 많은 선생님에게는 칩 줄이 길어진다.",
    one: (
      <Step1
        left={
          <>
            <Filters chips />
            <ScopeList />
          </>
        }
      />
    ),
    two: <Step2 summary={ChipSummary} />,
  },
  {
    id: "H3",
    title: "H3 · 고른 범위 강조",
    idea: "목록에서 고른 줄은 옅은 파랑 바탕. 2단계 요약은 접고 펴는 표(범위 · 문항 수 · 고정).",
    cost: "강조 색이 구성표의 색과 겹쳐 보일 수 있다.",
    one: (
      <Step1
        left={
          <>
            <Filters />
            <ScopeList highlight />
          </>
        }
      />
    ),
    two: <Step2 summary={TableSummary} />,
  },
  {
    id: "H4",
    title: "H4 · 왼쪽 좁게 · 구성표 넓게",
    idea: "왼쪽은 이름과 문항 수만 촘촘하게(360px), 구성표는 넓게. 2단계 요약은 글 한 줄.",
    cost: "범위의 단원 이름(작은 글씨)이 빠져 같은 이름의 차시를 가르기 어렵다.",
    one: (
      <Step1
        narrow
        left={
          <>
            <Filters />
            <ScopeList compact />
          </>
        }
      />
    ),
    two: <Step2 summary={PlainSummary} />,
  },
] as const;

export function StepsHifi() {
  return (
    <div className={k.root}>
      <header className={k.heading}>
        <p className={k.kicker}>시험지 만들기 · 1 · 2단계 분리 · Wire B</p>
        <h1>1 · 2단계 분리 · Hi-fi 4안</h1>
        <p>
          1단계는 «범위 고르기 + 구성표» 두 칸, 2단계는 문항 검토만 넓게 둡니다.
          바탕은 지금 시험지 만들기의 부품 그대로이고, 안끼리 다른 것은 왼쪽
          범위 고르기의 모양과 2단계 맨 위 요약의 모양입니다. 체크하면 바로
          오른쪽 구성표에 들어가는 것으로 그렸습니다(«적용» 단추 없음).
        </p>
        <nav className={k.nav} aria-label="시안 이동">
          {OPTIONS.map((o) => (
            <a key={o.id} href={`#${o.id}`}>
              {o.title}
            </a>
          ))}
          <a href="/dev/exam-builder-steps-wire#b">Wire B 보기</a>
        </nav>
      </header>
      {OPTIONS.map((o) => (
        <section key={o.id} id={o.id} className={k.option}>
          <h2>{o.title}</h2>
          <p className={k.muted}>
            {o.idea} <b>대가</b> — {o.cost}
          </p>
          <Frame label="1단계 · 1280">{o.one}</Frame>
          <Frame label="2단계 · 1280">{o.two}</Frame>
        </section>
      ))}
    </div>
  );
}

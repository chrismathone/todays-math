"use client";

import { useState, type ReactNode } from "react";

import eb from "@/components/exam-builder/ExamBuilder.module.css";

import {
  LADDER,
  RECENT_RULE,
  SCOPES,
  START_LADDER,
  START_TOTAL,
  type ScopeRow,
  type Tier,
} from "./fixtures";
import h from "./hifi.module.css";
import {
  Builder,
  DesktopFrame,
  MockDialog,
  Option,
  PhoneFrame,
  TitleBar,
} from "./parts";

/**
 * W4 범위 구성 — Wire D(구성표 위 한 줄 요약 + [구성 조건] 창)의 Hi-fi 4안.
 * 네 안이 같은 계산(나뉠 모습 · 모자람 · 어긋남)을 쓰고, 다른 것은 **요약이 읽히는 꼴과 창의 폭 · 나눔**이다.
 * 창 안의 값은 실제로 움직이고, [적용]을 누르면 표와 요약 줄이 바뀐다.
 */

type Mode = "sheet" | "scope";
type Ladder = Record<Tier, number | null>;

type Draft = {
  total: number | null;
  mode: Mode;
  ladder: Ladder;
  perRow: Record<string, Ladder>;
  recent: boolean;
  fixed: Record<string, boolean>;
};

const emptyLadder = (): Ladder =>
  Object.fromEntries(LADDER.map((t) => [t, null])) as Ladder;

const START_PER_ROW: Record<string, Ladder> = {
  s1: { ...emptyLadder(), 기본: 3, 응용: 2 },
  s2: { ...emptyLadder(), 기본: 3, 응용: 3, 심화하: 2 },
  s3: { ...emptyLadder(), 응용: 3, 심화하: 2 },
};

const START: Draft = {
  total: START_TOTAL,
  mode: "sheet",
  ladder: START_LADDER,
  perRow: START_PER_ROW,
  recent: true,
  fixed: Object.fromEntries(SCOPES.map((r) => [r.id, r.fixed])),
};

type PlanRow = ScopeRow & { usable: number; want: number; next: number };
type Plan = {
  rows: PlanRow[];
  total: number;
  /** 적용을 막는 것 */
  block: string[];
  /** 알리고 적용하는 것 */
  note: string[];
};

const sumL = (l: Ladder) => LADDER.reduce((acc, t) => acc + (l[t] ?? 0), 0);
const anyL = (l: Ladder) => LADDER.some((t) => l[t] !== null);

/** 나뉠 모습 — 고정 행은 그대로, 나머지에 고르게. 모자라도 다른 범위에서 채우지 않는다. */
function plan(d: Draft, rows: ScopeRow[]): Plan {
  const usable = (r: ScopeRow) => (d.recent ? r.avail - r.recentHit : r.avail);
  const block: string[] = [];
  const note: string[] = [];
  let wants: number[];
  if (d.mode === "scope") {
    wants = rows.map((r) =>
      anyL(d.perRow[r.id]) ? sumL(d.perRow[r.id]) : r.count,
    );
  } else if (d.total === null) {
    wants = rows.map((r) => r.count);
  } else {
    const fixedSum = rows.reduce(
      (acc, r) => acc + (d.fixed[r.id] ? r.count : 0),
      0,
    );
    const free = rows.filter((r) => !d.fixed[r.id]);
    if (d.total < fixedSum) {
      block.push(
        `고정한 행의 합(${fixedSum})이 총 문항(${d.total})보다 큽니다. 총 문항을 올리거나 고정을 푸세요.`,
      );
      wants = rows.map((r) => r.count);
    } else if (!free.length && d.total !== fixedSum) {
      block.push(
        `모든 행이 고정이라 총 문항(${d.total})에 맞춰 나눌 행이 없습니다. 고정을 하나 푸세요.`,
      );
      wants = rows.map((r) => r.count);
    } else {
      const rest = d.total - fixedSum;
      const base = free.length ? Math.floor(rest / free.length) : 0;
      let extra = free.length ? rest % free.length : 0;
      wants = rows.map((r) => {
        if (d.fixed[r.id]) return r.count;
        const w = base + (extra > 0 ? 1 : 0);
        extra -= 1;
        return w;
      });
    }
  }
  const out = rows.map((r, i) => {
    const u = usable(r);
    return { ...r, usable: u, want: wants[i], next: Math.min(wants[i], u) };
  });
  out.forEach((r) => {
    if (r.want > r.usable)
      note.push(
        `${r.label} — ${d.recent ? "최근 출제를 빼면 " : ""}${r.usable}문항뿐이라 ${r.want - r.usable}문항 모자랍니다. 다른 범위에서 채우지 않습니다.`,
      );
  });
  const total = out.reduce((acc, r) => acc + r.next, 0);
  // 난이도 합은 «요청한 수»와 견준다 — 범위의 모자람은 위에서 따로 한 번만 말한다.
  const requested = wants.reduce((acc, w) => acc + w, 0);
  if (d.mode === "sheet" && anyL(d.ladder)) {
    const ls = sumL(d.ladder);
    if (ls > requested)
      block.push(
        `난이도 합(${ls})이 총 문항(${requested})보다 큽니다. 난이도 수를 줄이거나 총 문항을 올리세요.`,
      );
    else if (ls < requested)
      note.push(
        `난이도를 정하지 않은 ${requested - ls}문항은 난이도 구분 없이 고릅니다.`,
      );
  }
  return { rows: out, total, block, note };
}

function ladderText(l: Ladder): string {
  const set = LADDER.filter((t) => l[t] !== null);
  return set.length
    ? set.map((t) => `${t} ${l[t]}`).join(" · ")
    : "난이도 지정 없음";
}

function summary(d: Draft, p: Plan) {
  return {
    total:
      d.mode === "scope"
        ? `${p.total}문항`
        : d.total === null
          ? `행의 합 ${p.total}문항`
          : `${d.total}문항`,
    ladder: d.mode === "scope" ? "난이도 범위마다 따로" : ladderText(d.ladder),
    recent: d.recent ? "최근 14일 출제 뺌" : "최근 출제 포함",
    fixed: `고정 ${Object.values(d.fixed).filter(Boolean).length}행`,
  };
}

function useCompose() {
  const [applied, setApplied] = useState<Draft>(START);
  const [rows, setRows] = useState<ScopeRow[]>(SCOPES);
  const [draft, setDraft] = useState<Draft>(START);
  const [open, setOpen] = useState(true);
  const preview = plan(draft, rows);
  const current = plan(applied, rows);
  return {
    draft,
    preview,
    applied,
    current,
    rows,
    open,
    set(patch: Partial<Draft>) {
      setDraft((d) => ({ ...d, ...patch }));
    },
    setTier(t: Tier, v: number | null) {
      setDraft((d) => ({ ...d, ladder: { ...d.ladder, [t]: v } }));
    },
    setCell(id: string, t: Tier, v: number | null) {
      setDraft((d) => ({
        ...d,
        perRow: { ...d.perRow, [id]: { ...d.perRow[id], [t]: v } },
      }));
    },
    unfix(id: string) {
      setRows((rs) =>
        rs.map((r) => (r.id === id ? { ...r, fixed: false } : r)),
      );
      setApplied((d) => ({ ...d, fixed: { ...d.fixed, [id]: false } }));
      setDraft((d) => ({ ...d, fixed: { ...d.fixed, [id]: false } }));
    },
    toggleFixed(id: string) {
      setDraft((d) => ({ ...d, fixed: { ...d.fixed, [id]: !d.fixed[id] } }));
    },
    apply() {
      if (preview.block.length) return;
      setApplied(draft);
      setRows((rs) =>
        rs.map((r, i) => ({
          ...r,
          count: preview.rows[i].next,
          fixed: draft.fixed[r.id],
        })),
      );
      setOpen(false);
    },
    cancel() {
      setDraft(applied);
      setOpen(false);
    },
    openDialog() {
      setDraft(applied);
      setOpen(true);
    },
    reset() {
      setApplied(START);
      setDraft(START);
      setRows(SCOPES);
      setOpen(true);
    },
  };
}
type ComposeState = ReturnType<typeof useCompose>;

/* ───────────── 구성표(실제 ExamBuilder 표) ───────────── */

function ScopeTable({
  rows,
  caption,
  recent = true,
  onUnfix,
}: {
  rows: ScopeRow[];
  caption?: ReactNode;
  recent?: boolean;
  onUnfix?: (id: string) => void;
}) {
  return (
    <div className={eb.tableWrap}>
      <table className={eb.table}>
        {caption}
        <thead>
          <tr>
            <th>선택한 출제 범위</th>
            <th>구성 수</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={r.fixed ? h.fixedRow : undefined}>
              <td>
                <strong>{r.label}</strong>
                <small>
                  {r.detail} · 출제 가능{" "}
                  {recent
                    ? `${r.avail - r.recentHit}문항(최근 출제 뺀 뒤)`
                    : `${r.avail}문항`}
                </small>
              </td>
              <td>
                <div className={eb.stepper}>
                  <button type="button" aria-label="하나 빼기">
                    −
                  </button>
                  <input value={r.count} readOnly aria-label="구성 수" />
                  <button type="button" aria-label="하나 더하기">
                    +
                  </button>
                </div>
              </td>
              <td>
                {r.fixed ? (
                  <div className={eb.scopeRowActions}>
                    <span className={h.badgeMuted}>고정</span>
                    <button
                      type="button"
                      className={eb.textButton}
                      onClick={() => onUnfix?.(r.id)}
                    >
                      풀기
                    </button>
                  </div>
                ) : (
                  <small>자동</small>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PanelHead({ change = true }: { change?: boolean }) {
  return (
    <header className={eb.panelHeader}>
      <strong>
        출제 범위 <span className={eb.badge}>3개 선택</span>
      </strong>
      <span className={eb.summary}>
        일차부등식의 해와 성질 · 일차부등식의 풀이 외 1개
      </span>
      {change && <button type="button">범위 변경</button>}
    </header>
  );
}

function PanelFoot({ total, extra }: { total: number; extra?: ReactNode }) {
  return (
    <footer className={eb.panelFooter}>
      <div className={eb.compositionTotal}>
        <strong>합계 {total}문항</strong>
        <small>고정이 아닌 행은 총 문항에 맞춰 다시 나눕니다.</small>
      </div>
      <div className={eb.actions} style={{ marginLeft: "auto", gap: 8 }}>
        {extra}
        <button type="button" className={eb.primary}>
          문항 구성 →
        </button>
      </div>
    </footer>
  );
}

/** W3 · W5 의 배경용 — 지금 구성표 그대로. W5 는 위 · 아래 · 바닥 단추 칸을 끼운다. */
export function ScopeTableStatic({
  top,
  footExtra,
  bottom,
  change = true,
}: {
  top?: ReactNode;
  footExtra?: ReactNode;
  bottom?: ReactNode;
  /** «범위 변경» 단추 — 범위 고르기가 화면 안에 펴져 있으면(1 · 2단계 분리 시안) 없다. */
  change?: boolean;
}) {
  return (
    <section className={eb.panel} aria-label="출제 구성표(그림)">
      <PanelHead change={change} />
      {top}
      <ScopeTable rows={SCOPES} />
      <PanelFoot total={18} extra={footExtra} />
      {bottom}
    </section>
  );
}

/* ───────────── 창 안의 조각 ───────────── */

function TotalField({ c }: { c: ComposeState }) {
  const disabled = c.draft.mode === "scope";
  return (
    <div className={h.fieldRow}>
      <input
        className={h.totalInput}
        inputMode="numeric"
        aria-label="총 문항"
        placeholder="지정 없음"
        disabled={disabled}
        value={disabled ? "" : (c.draft.total ?? "")}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "");
          c.set({ total: v === "" ? null : Number(v) });
        }}
      />
      <span className={h.rule}>
        {disabled
          ? "범위마다 따로 정하면 총 문항은 행의 합입니다."
          : c.draft.total === null
            ? "지정 없음 — 범위 행의 합으로 갑니다."
            : "고정이 아닌 행에 고르게 나눕니다."}
      </span>
      {!disabled && c.draft.total !== null && (
        <button
          type="button"
          className={`${h.text} ${h.small}`}
          onClick={() => c.set({ total: null })}
        >
          지정 없음으로
        </button>
      )}
    </div>
  );
}

function ModeSwitch({ c }: { c: ComposeState }) {
  return (
    <div className={h.segJoined} role="group" aria-label="난이도를 정하는 방식">
      <button
        type="button"
        aria-pressed={c.draft.mode === "sheet"}
        onClick={() => c.set({ mode: "sheet" })}
      >
        시험지 전체에 한 번
      </button>
      <button
        type="button"
        aria-pressed={c.draft.mode === "scope"}
        onClick={() => c.set({ mode: "scope" })}
      >
        범위마다 따로
      </button>
    </div>
  );
}

function TierStepper({
  value,
  onChange,
  label,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  label: string;
}) {
  return (
    <span className={h.stepper}>
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
          onChange(v === "" ? null : Number(v));
        }}
      />
      <button
        type="button"
        aria-label={`${label} 하나 더하기`}
        onClick={() => onChange(value === null ? 1 : value + 1)}
      >
        +
      </button>
    </span>
  );
}

/** 사다리 여섯 칸 — 빈칸(–)은 «지정 없음», 0 은 «한 문항도 안 냄». */
function LadderCells({ c, cols = 6 }: { c: ComposeState; cols?: 3 | 6 }) {
  return (
    <div className={cols === 3 ? h.ladderGrid3 : h.ladderGrid}>
      {LADDER.map((t) => {
        const v = c.draft.ladder[t];
        return (
          <div
            key={t}
            className={
              v === null
                ? h.ladderCellNone
                : v > 0
                  ? h.ladderCellOn
                  : h.ladderCell
            }
          >
            <span>{t}</span>
            <TierStepper
              label={`${t} 문항 수`}
              value={v}
              onChange={(nv) => c.setTier(t, nv)}
            />
            {v === null ? (
              <small className={h.meta}>지정 없음</small>
            ) : (
              <button
                type="button"
                className={h.noneToggle}
                aria-label={`${t} 지정 없음으로`}
                onClick={() => c.setTier(t, null)}
              >
                비우기
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PerRowMatrix({ c }: { c: ComposeState }) {
  return (
    <table className={`${h.previewTable} ${h.matrix}`}>
      <thead>
        <tr>
          <th style={{ width: "34%" }}>범위</th>
          {LADDER.map((t) => (
            <th key={t} className={h.n}>
              {t}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {c.rows.map((r) => (
          <tr key={r.id}>
            <td>{r.label}</td>
            {LADDER.map((t) => (
              <td key={t}>
                <input
                  aria-label={`${r.label} ${t}`}
                  inputMode="numeric"
                  placeholder="–"
                  value={c.draft.perRow[r.id][t] ?? ""}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    c.setCell(r.id, t, v === "" ? null : Number(v));
                  }}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DifficultyField({ c, cols }: { c: ComposeState; cols?: 3 | 6 }) {
  return (
    <>
      <ModeSwitch c={c} />
      {c.draft.mode === "sheet" ? (
        <>
          <LadderCells c={c} cols={cols} />
          <span className={h.rule}>
            «–»는 지정 없음, 0 은 그 난이도를 한 문항도 내지 않는다는 뜻입니다.
          </span>
        </>
      ) : (
        <>
          <PerRowMatrix c={c} />
          <span className={h.rule}>
            빈칸은 지정 없음입니다. 행마다 칸의 합이 그 범위의 문항 수가 됩니다.
          </span>
        </>
      )}
    </>
  );
}

function RecentField({ c, short }: { c: ComposeState; short?: boolean }) {
  const hits = c.rows.reduce((acc, r) => acc + r.recentHit, 0);
  return (
    <>
      <label className={h.checkRow}>
        <input
          type="checkbox"
          checked={c.draft.recent}
          onChange={(e) => c.set({ recent: e.target.checked })}
        />
        최근 출제 문항 빼기
        <span className={h.badgeMuted}>지금 해당 {hits}문항</span>
      </label>
      {!short && <span className={h.rule}>{RECENT_RULE}</span>}
    </>
  );
}

function Issues({ p }: { p: Plan }) {
  if (!p.block.length && !p.note.length)
    return (
      <p className={h.notice}>
        총 문항 · 난이도 · 범위 행이 서로 맞습니다. 적용하면 위 수대로 문항을
        고릅니다.
      </p>
    );
  return (
    <div className={p.block.length ? h.error : h.warn} role="status">
      <strong>{p.block.length ? "적용할 수 없습니다" : "확인할 것"}</strong>
      <ul>
        {[...p.block, ...p.note].map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    </div>
  );
}

function PreviewTable({ c }: { c: ComposeState }) {
  return (
    <table className={h.previewTable}>
      <thead>
        <tr>
          <th>범위</th>
          <th className={h.n} style={{ width: 76 }}>
            출제 가능
          </th>
          <th className={h.n} style={{ width: 52 }}>
            지금
          </th>
          <th className={h.n} style={{ width: 64 }}>
            적용 후
          </th>
          <th style={{ width: 84 }} />
        </tr>
      </thead>
      <tbody>
        {c.preview.rows.map((r) => (
          <tr key={r.id}>
            <td>
              {r.label}
              {c.draft.fixed[r.id] && <small>고정 — 다시 나누지 않음</small>}
            </td>
            <td className={h.n}>{r.usable}</td>
            <td className={h.n}>{r.count}</td>
            <td className={h.n}>
              <span
                className={
                  r.want > r.usable
                    ? h.short
                    : r.next !== r.count
                      ? h.changed
                      : undefined
                }
              >
                {r.next}
                {r.want > r.usable ? ` / ${r.want}` : ""}
              </span>
            </td>
            <td className={h.n}>
              <button
                type="button"
                className={`${h.text} ${h.small}`}
                onClick={() => c.toggleFixed(r.id)}
                disabled={c.draft.mode === "scope"}
              >
                {c.draft.fixed[r.id] ? "고정 풀기" : "고정"}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td>합계</td>
          <td />
          <td className={h.n}>{c.rows.reduce((a, r) => a + r.count, 0)}</td>
          <td className={h.n}>
            <b>{c.preview.total}</b>
          </td>
          <td />
        </tr>
      </tfoot>
    </table>
  );
}

function DialogHead({ c }: { c: ComposeState }) {
  return (
    <>
      <button type="button" onClick={c.cancel}>
        취소
      </button>
      <button
        type="button"
        className={h.primary}
        onClick={c.apply}
        disabled={c.preview.block.length > 0}
      >
        적용
      </button>
    </>
  );
}

function Behind({
  c,
  sumLine,
  caption,
}: {
  c: ComposeState;
  sumLine?: ReactNode;
  caption?: ReactNode;
}) {
  return (
    <Builder step="scope">
      <aside className={h.stack} aria-label="시험지 설정(그림)">
        <TitleBar />
        <section className={eb.panel} aria-label="출제 구성표(그림)">
          <PanelHead />
          {sumLine}
          <ScopeTable
            rows={c.rows}
            caption={caption}
            recent={c.applied.recent}
            onUnfix={c.unfix}
          />
          <PanelFoot total={c.rows.reduce((a, r) => a + r.count, 0)} />
        </section>
      </aside>
      <section className={eb.review} aria-label="문항 검토(그림)">
        <div className={eb.toolbar}>
          <h2>
            구성한 문항 <span className={eb.badge}>0</span>
          </h2>
        </div>
        <section className={eb.panel}>
          <div className={eb.empty}>
            <h2>범위를 정하고 문항을 구성하세요.</h2>
            <p>왼쪽 구성표의 [문항 구성 →]을 누르면 여기에 문항이 놓입니다.</p>
          </div>
        </section>
      </section>
    </Builder>
  );
}

function Tools({ c }: { c: ComposeState }) {
  return (
    <>
      <button type="button" onClick={c.open ? c.cancel : c.openDialog}>
        {c.open ? "창 닫고 요약 줄 보기" : "[구성 조건] 창 열기"}
      </button>
      <button type="button" onClick={c.reset}>
        처음 상태로
      </button>
    </>
  );
}

/* ───────────── H1 — 글 한 줄 · 한 칸 창 ───────────── */

function W4H1() {
  const c = useCompose();
  const s = summary(c.applied, c.current);
  return (
    <Option
      id="w4-1"
      title="1 · 요약은 글 한 줄, 창은 위에서 아래로 한 칸"
      idea="구성표 머리 아래에 «구성 조건 18문항 · 기본 6 · 응용 8 · … · 최근 14일 출제 뺌» 한 줄과 [구성 조건]. 창(880)은 총 문항 → 난이도 → 최근 출제 → 나뉠 모습의 차례로 내려 읽는다. 확인할 것은 맨 아래 한 상자에만."
      cost="창이 세로로 길어 나뉠 모습이 아래로 밀린다 — 난이도를 고치며 결과를 보려면 오르내린다. 요약 줄은 글이라 수가 많으면 두 줄이 된다."
      tools={<Tools c={c} />}
    >
      <DesktopFrame
        label="1280 화면 · 사이드바 240 · [구성 조건] 창을 연 상태"
        overlay={
          c.open && (
            <MockDialog title="구성 조건" head={<DialogHead c={c} />}>
              <section className={h.dlgSection}>
                <h3>총 문항</h3>
                <TotalField c={c} />
              </section>
              <section className={h.dlgSection}>
                <h3>난이도</h3>
                <DifficultyField c={c} />
              </section>
              <section className={h.dlgSection}>
                <h3>최근 출제</h3>
                <RecentField c={c} />
              </section>
              <section className={h.dlgSection}>
                <h3>적용하면 이렇게 나뉩니다</h3>
                <PreviewTable c={c} />
                <Issues p={c.preview} />
              </section>
            </MockDialog>
          )
        }
      >
        <Behind
          c={c}
          sumLine={
            <div className={h.sumLine}>
              <p className={h.sumText}>
                <span className={h.sumLabel}>구성 조건</span>
                {[s.total, s.ladder, s.recent, s.fixed].join(" · ")}
              </p>
              <button type="button" className={h.ctl} onClick={c.openDialog}>
                구성 조건
              </button>
            </div>
          }
        />
      </DesktopFrame>
    </Option>
  );
}

/* ───────────── H2 — 칩 · 두 칸 창(왼쪽 조건 · 오른쪽 결과) ───────────── */

function W4H2() {
  const c = useCompose();
  const s = summary(c.applied, c.current);
  return (
    <Option
      id="w4-2"
      title="2 · 요약은 낱칸 넷, 창은 왼쪽 조건 · 오른쪽 나뉠 모습"
      idea="요약을 «18문항 | 기본 6 · 응용 8 … | 최근 14일 출제 뺌 | 고정 1행» 낱칸으로 끊어 한눈에 센다(누르는 것이 아님 — 손가락 커서 없음). 창은 두 칸이라 왼쪽에서 수를 바꾸면 오른쪽 표가 바로 바뀐다."
      cost="창 안이 두 칸이라 사다리 여섯 칸이 좁다(칸당 60px 남짓). 낱칸이 단추처럼 보일 수 있어 테두리를 옅게 둔다."
      tools={<Tools c={c} />}
    >
      <DesktopFrame
        label="1280 화면 · 사이드바 240 · 고친 값이 오른쪽에 바로 비친다"
        overlay={
          c.open && (
            <MockDialog title="구성 조건" head={<DialogHead c={c} />}>
              <div className={h.w4Two}>
                <div>
                  <section className={h.dlgSection}>
                    <h3>총 문항</h3>
                    <TotalField c={c} />
                  </section>
                  <section className={h.dlgSection}>
                    <h3>난이도</h3>
                    <DifficultyField c={c} cols={3} />
                  </section>
                  <section className={h.dlgSection}>
                    <h3>최근 출제</h3>
                    <RecentField c={c} />
                  </section>
                </div>
                <div className={h.w4TwoRight}>
                  <p className={h.sectionLabel}>적용하면 이렇게 나뉩니다</p>
                  <PreviewTable c={c} />
                  <Issues p={c.preview} />
                </div>
              </div>
            </MockDialog>
          )
        }
      >
        <Behind
          c={c}
          sumLine={
            <div className={h.sumLine}>
              <div className={h.sumChips}>
                <span className={h.chip}>{s.total}</span>
                <span className={h.chip}>{s.ladder}</span>
                <span className={h.chip}>{s.recent}</span>
                <span className={h.chip}>
                  <em>고정</em> {s.fixed.replace("고정 ", "")}
                </span>
              </div>
              <button type="button" className={h.ctl} onClick={c.openDialog}>
                구성 조건
              </button>
            </div>
          }
        />
      </DesktopFrame>
    </Option>
  );
}

/* ───────────── H3 — 사다리 막대 요약 · 사다리가 주인공인 창 ───────────── */

function LadderMini({ d }: { d: Draft }) {
  if (d.mode === "scope")
    return <span className={h.chip}>난이도 범위마다 따로</span>;
  return (
    <span className={h.ladderMini} aria-label="난이도별 문항 수">
      {LADDER.map((t) => {
        const v = d.ladder[t];
        return (
          <span
            key={t}
            className={v === null ? h.lNone : v > 0 ? h.lOn : h.lZero}
          >
            {t}
            <b>{v ?? "–"}</b>
          </span>
        );
      })}
    </span>
  );
}

function W4H3() {
  const c = useCompose();
  const s = summary(c.applied, c.current);
  return (
    <Option
      id="w4-3"
      title="3 · 요약에 사다리 막대, 창은 사다리 여섯 칸이 맨 위"
      idea="요약 줄에 난이도 사다리를 여섯 칸 그대로 그려 «어디에 몰았나 · 어디를 0 으로 막았나 · 어디는 안 정했나»를 칸의 바탕으로 가른다(코발트 = 수 있음 · 흰 = 0 · 회색 = 지정 없음). 창도 사다리를 큰 칸으로 맨 위에."
      cost="요약 줄이 가장 높다(두 줄). 사다리를 «범위마다 따로»로 바꾸면 막대 대신 글이 서서 모양이 바뀐다."
      tools={<Tools c={c} />}
    >
      <DesktopFrame
        label="1280 화면 · 사이드바 240 · 사다리 칸의 바탕이 수 · 0 · 지정 없음을 가른다"
        overlay={
          c.open && (
            <MockDialog title="구성 조건" head={<DialogHead c={c} />}>
              <section className={h.dlgSection}>
                <div className={h.between}>
                  <h3>난이도</h3>
                  <ModeSwitch c={c} />
                </div>
                {c.draft.mode === "sheet" ? (
                  <LadderCells c={c} />
                ) : (
                  <PerRowMatrix c={c} />
                )}
              </section>
              <section className={h.dlgSection}>
                <div className={h.fieldRow}>
                  <h3 style={{ minWidth: 64 }}>총 문항</h3>
                  <TotalField c={c} />
                </div>
                <RecentField c={c} short />
                <span className={h.rule}>{RECENT_RULE}</span>
              </section>
              <section className={h.dlgSection}>
                <h3>적용하면 이렇게 나뉩니다</h3>
                <PreviewTable c={c} />
                <Issues p={c.preview} />
              </section>
            </MockDialog>
          )
        }
      >
        <Behind
          c={c}
          sumLine={
            <div className={h.sumLine}>
              <div className={h.sumChips}>
                <span className={h.chip}>{s.total}</span>
                <LadderMini d={c.applied} />
                <span className={h.chip}>{s.recent}</span>
              </div>
              <button type="button" className={h.ctl} onClick={c.openDialog}>
                구성 조건
              </button>
            </div>
          }
        />
      </DesktopFrame>
    </Option>
  );
}

/* ───────────── H4 — 표 머리의 한 줄 · 좁은 창(570) · 바뀌는 행만 ───────────── */

function DiffList({ c }: { c: ComposeState }) {
  const changed = c.preview.rows.filter((r) => r.next !== r.count);
  const same = c.preview.rows.filter((r) => r.next === r.count);
  return (
    <ul className={h.diffList}>
      {changed.map((r) => (
        <li key={r.id}>
          <span>{r.label}</span>
          <span className={h.num}>
            {r.count} →{" "}
            <b className={r.want > r.usable ? h.short : h.changed}>{r.next}</b>
            {r.want > r.usable ? ` (필요 ${r.want})` : ""}
          </span>
        </li>
      ))}
      {same.length > 0 && (
        <li>
          <span className={h.meta}>
            그대로 —{" "}
            {same
              .map(
                (r) =>
                  `${r.label} ${r.count}${c.draft.fixed[r.id] ? "(고정)" : ""}`,
              )
              .join(" · ")}
          </span>
        </li>
      )}
      <li>
        <span>합계</span>
        <b className={h.num}>{c.preview.total}문항</b>
      </li>
    </ul>
  );
}

function W4H4() {
  const c = useCompose();
  const s = summary(c.applied, c.current);
  return (
    <Option
      id="w4-4"
      title="4 · 요약은 표의 머리 줄, 창은 좁게(570) · 바뀌는 행만 보인다"
      idea="요약을 구성표 바로 위 옅은 코발트 머리 줄로 표에 붙여 «이 표가 이 조건으로 나뉘었다»를 읽게 한다. 창은 짧은 설정 창 폭(570)이고, 사다리는 3칸 × 2줄, 나뉠 모습은 «바뀌는 행만» 줄로. 고정 행은 표에서 회색 바탕으로 다르다."
      cost="좁은 창이라 «범위마다 따로» 표가 빽빽하다. 바뀌지 않는 행은 한 줄로 묶여 출제 가능 수가 안 보인다 — 모자라면 그 행만 경고로 나온다."
      tools={<Tools c={c} />}
    >
      <DesktopFrame
        label="1280 화면 · 사이드바 240 · 좁은 [구성 조건] 창"
        overlay={
          c.open && (
            <MockDialog
              title="구성 조건"
              width={570}
              head={<DialogHead c={c} />}
            >
              <section className={h.dlgSection}>
                <h3>총 문항</h3>
                <TotalField c={c} />
              </section>
              <section className={h.dlgSection}>
                <h3>난이도</h3>
                <DifficultyField c={c} cols={3} />
              </section>
              <section className={h.dlgSection}>
                <RecentField c={c} />
              </section>
              <section className={h.dlgSection}>
                <h3>적용하면</h3>
                <DiffList c={c} />
                <Issues p={c.preview} />
              </section>
            </MockDialog>
          )
        }
      >
        <Behind
          c={c}
          caption={
            <caption className={h.sumCaption}>
              <div>
                <b>{s.total}</b>
                <span>{s.ladder}</span>
                <span>· {s.recent}</span>
                <span className={h.grow} />
                <button
                  type="button"
                  className={`${h.ctl} ${h.small}`}
                  onClick={c.openDialog}
                >
                  구성 조건
                </button>
              </div>
            </caption>
          }
        />
      </DesktopFrame>
    </Option>
  );
}

/* ───────────── 390 ───────────── */

function W4Phone() {
  const c = useCompose();
  const s = summary(c.applied, c.current);
  return (
    <Option
      id="w4-phone"
      title="390 · 폰 — 요약 줄은 감싸 내리고, 창은 화면 전체"
      idea="1안의 글 한 줄이 폰에서는 두세 줄로 감긴다. 창은 화면을 덮고 사다리는 3칸 × 2줄, 나뉠 모습은 표 그대로(열 다섯)."
      cost="나뉠 모습까지 꽤 내려가야 한다. 범위가 많으면 창이 더 길어진다."
      tools={<Tools c={c} />}
    >
      <PhoneFrame
        label="390 화면 · [구성 조건] 창(화면 전체)"
        overlay={
          c.open && (
            <MockDialog phone title="구성 조건" head={<DialogHead c={c} />}>
              <section className={h.dlgSection} style={{ padding: 12 }}>
                <h3>총 문항</h3>
                <TotalField c={c} />
              </section>
              <section className={h.dlgSection} style={{ padding: 12 }}>
                <h3>난이도</h3>
                <DifficultyField c={c} cols={3} />
              </section>
              <section className={h.dlgSection} style={{ padding: 12 }}>
                <RecentField c={c} />
              </section>
              <section className={h.dlgSection} style={{ padding: 12 }}>
                <h3>적용하면</h3>
                <DiffList c={c} />
                <Issues p={c.preview} />
              </section>
            </MockDialog>
          )
        }
      >
        <Builder step="scope">
          <section className={eb.panel} aria-label="출제 구성표(그림)">
            <PanelHead />
            <div className={h.sumLine}>
              <p className={h.sumText}>
                <span className={h.sumLabel}>구성 조건</span>
                {[s.total, s.ladder, s.recent, s.fixed].join(" · ")}
              </p>
              <button type="button" className={h.ctl} onClick={c.openDialog}>
                구성 조건
              </button>
            </div>
            <ScopeTable
              rows={c.rows}
              recent={c.applied.recent}
              onUnfix={c.unfix}
            />
            <PanelFoot total={c.rows.reduce((a, r) => a + r.count, 0)} />
          </section>
        </Builder>
      </PhoneFrame>
    </Option>
  );
}

export function W4Section() {
  return (
    <>
      <W4H1 />
      <W4H2 />
      <W4H3 />
      <W4H4 />
      <W4Phone />
    </>
  );
}

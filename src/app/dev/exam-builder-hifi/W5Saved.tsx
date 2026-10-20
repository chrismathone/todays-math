"use client";

import { useState, type ReactNode } from "react";

import eb from "@/components/exam-builder/ExamBuilder.module.css";

import { RESTORE_RULE, SAVED, type Saved } from "./fixtures";
import h from "./hifi.module.css";
import {
  Builder,
  DesktopFrame,
  MockDialog,
  Option,
  PhoneFrame,
  TitleBar,
} from "./parts";
import { ScopeTableStatic } from "./W4Compose";

/**
 * W5 이름 붙인 출제 조건 — Wire B([조건 저장] → 이름 · 목록에서 적용 / 이름 바꾸기 / 삭제)의 Hi-fi 4안.
 * 네 안이 같은 동작(적용은 조건만 · 문항은 새로 · 삭제는 한 번 묻는다)을 쓰고, 다른 것은 **목록의 밀도와 내용을 보이는 꼴**이다.
 * 목록이 양식 모음이 되지 않게 — 마지막으로 쓴 차례로 세우고, 각 줄에 «무엇이 들었나»를 적는다.
 */

const TODAY = "10/16";

function contents(c: Saved) {
  return `${c.total} · ${c.ladder} · ${c.recent ? "최근 출제 뺌" : "최근 출제 포함"}`;
}
function scopeLine(c: Saved) {
  return `${c.source} · 범위 ${c.scopes.length} — ${c.scopes
    .map((s) => `${s.label} ${s.count}${s.fixed ? "(고정)" : ""}`)
    .join(" · ")}`;
}

type Report = { name: string; dropped: string[]; short: string[] };

function useSaved() {
  const [items, setItems] = useState<Saved[]>(SAVED);
  const [listOpen, setListOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState("중2 확인 · 부등식 18 (2)");
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [confirming, setConfirming] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const sorted = [...items].sort((a, b) => b.order - a.order);
  const nameTaken = (name: string, except?: string) =>
    items.some((i) => i.name === name.trim() && i.id !== except);
  return {
    items: sorted,
    listOpen,
    saving,
    saveName,
    renaming,
    confirming,
    report,
    expanded,
    nameTaken,
    setSaveName,
    setRenaming,
    setConfirming,
    setExpanded,
    openList() {
      setListOpen(true);
      setSaving(false);
    },
    closeList() {
      setListOpen(false);
      setRenaming(null);
      setConfirming(null);
    },
    startSave() {
      setSaving(true);
      setListOpen(false);
    },
    cancelSave() {
      setSaving(false);
    },
    save() {
      const name = saveName.trim();
      if (!name || nameTaken(name)) return;
      setItems((list) => [
        {
          ...SAVED[0],
          id: `c${Date.now()}`,
          name,
          lastUsed: TODAY,
          order: 1016,
        },
        ...list,
      ]);
      setSaving(false);
    },
    apply(c: Saved) {
      setItems((list) =>
        list.map((i) =>
          i.id === c.id ? { ...i, lastUsed: TODAY, order: 1016 } : i,
        ),
      );
      setReport({
        name: c.name,
        dropped: c.applyNote?.dropped ?? [],
        short: c.applyNote?.short ?? [],
      });
      setListOpen(false);
    },
    rename() {
      if (!renaming) return;
      const name = renaming.name.trim();
      if (!name || nameTaken(name, renaming.id)) return;
      setItems((list) =>
        list.map((i) => (i.id === renaming.id ? { ...i, name } : i)),
      );
      setRenaming(null);
    },
    remove(id: string) {
      setItems((list) => list.filter((i) => i.id !== id));
      setConfirming(null);
    },
    reset() {
      setItems(SAVED);
      setListOpen(true);
      setSaving(false);
      setRenaming(null);
      setConfirming(null);
      setReport(null);
      setExpanded(null);
    },
  };
}
type SavedState = ReturnType<typeof useSaved>;

/* ───────────── 공통 조각 ───────────── */

function RenameRow({ s }: { s: SavedState }) {
  if (!s.renaming) return null;
  const taken = s.nameTaken(s.renaming.name, s.renaming.id);
  return (
    <div className={h.renameRow}>
      <input
        aria-label="새 이름"
        value={s.renaming.name}
        maxLength={40}
        onChange={(e) =>
          s.setRenaming({ id: s.renaming!.id, name: e.target.value })
        }
      />
      <button
        type="button"
        className={h.primary}
        onClick={s.rename}
        disabled={!s.renaming.name.trim() || taken}
      >
        이름 저장
      </button>
      <button type="button" onClick={() => s.setRenaming(null)}>
        취소
      </button>
      {taken && <small className={h.meta}>같은 이름이 있습니다.</small>}
    </div>
  );
}

function ConfirmRow({ s, c }: { s: SavedState; c: Saved }) {
  return (
    <div className={h.confirm} role="alert">
      <span>
        «{c.name}»을 지울까요? 이 조건으로 만든 시험지와 문항은 그대로입니다.
      </span>
      <button type="button" className={h.danger} onClick={() => s.remove(c.id)}>
        지우기
      </button>
      <button type="button" onClick={() => s.setConfirming(null)}>
        취소
      </button>
    </div>
  );
}

function RowActions({
  s,
  c,
  apply = "적용",
  small,
}: {
  s: SavedState;
  c: Saved;
  apply?: string;
  small?: boolean;
}) {
  const sm = small ? ` ${h.small}` : "";
  return (
    <div
      className={h.savedActions}
      style={small ? { flexWrap: "nowrap" } : undefined}
    >
      <button
        type="button"
        className={`${h.primary}${sm}`}
        onClick={() => s.apply(c)}
      >
        {apply}
      </button>
      <button
        type="button"
        className={`${h.text}${sm}`}
        onClick={() => {
          s.setConfirming(null);
          s.setRenaming({ id: c.id, name: c.name });
        }}
      >
        이름 바꾸기
      </button>
      <button
        type="button"
        className={`${h.text} ${h.danger}${sm}`}
        onClick={() => {
          s.setRenaming(null);
          s.setConfirming(c.id);
        }}
      >
        삭제
      </button>
    </div>
  );
}

function ListHead({ s }: { s: SavedState }) {
  return (
    <div className={h.listHead}>
      <span>
        저장한 조건 <b className={h.num}>{s.items.length}</b> · 마지막으로 쓴
        차례
      </span>
      <span className={h.grow} />
      <span>조건만 담습니다 — 문항 · 지면 양식은 담지 않습니다.</span>
    </div>
  );
}

function ListFoot() {
  return <span className={h.grow}>{RESTORE_RULE}</span>;
}

/** 적용한 뒤 — 구성표 위에 무엇을 가져왔고 무엇이 빠졌나. */
function ApplyReport({ s }: { s: SavedState }) {
  if (!s.report) return null;
  const r = s.report;
  const issues = [...r.dropped, ...r.short];
  return (
    <div
      className={`${h.report} ${issues.length ? h.warn : h.notice}`}
      role="status"
      style={{ borderRadius: 0 }}
    >
      <span>
        «{r.name}»의 조건을 가져왔습니다. 문항은 아직 고르지 않았습니다 — [문항
        구성 →]을 누르면 새로 고릅니다.
      </span>
      {issues.length > 0 && (
        <ul>
          {r.dropped.map((d) => (
            <li key={d}>
              <span className={h.struck}>{d.split(" — ")[0]}</span> — 범위에서
              뺐습니다({d.split(" — ")[1]}).
            </li>
          ))}
          {r.short.map((d) => (
            <li key={d}>모자람: {d}. 다른 범위에서 채우지 않습니다.</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SaveInline({ s }: { s: SavedState }) {
  if (!s.saving) return null;
  const taken = s.nameTaken(s.saveName);
  return (
    <div className={h.saveBox}>
      <strong>조건 저장</strong>
      <div className={h.row}>
        <input
          className={h.input}
          aria-label="조건 이름"
          value={s.saveName}
          maxLength={40}
          onChange={(e) => s.setSaveName(e.target.value)}
        />
        <button
          type="button"
          className={`${h.ctl} ${h.primary}`}
          onClick={s.save}
          disabled={!s.saveName.trim() || taken}
        >
          저장
        </button>
        <button type="button" className={h.ctl} onClick={s.cancelSave}>
          취소
        </button>
      </div>
      <small className={h.meta}>
        {taken ? "같은 이름이 있습니다 — " : ""}담는 것: {contents(SAVED[0])} ·{" "}
        {scopeLine(SAVED[0])}
      </small>
    </div>
  );
}

function SourceBar({ s, label }: { s: SavedState; label?: ReactNode }) {
  return (
    <div className={eb.toolbar}>
      <label>출처</label>
      <input value="교과서 비상 · 자체 문항" readOnly aria-label="출처" />
      <button
        type="button"
        onClick={s.openList}
        style={{ whiteSpace: "nowrap", flexShrink: 0 }}
      >
        {label ?? <>저장한 조건 · {s.items.length}</>}
      </button>
    </div>
  );
}

function Behind({
  s,
  top,
  footExtra,
}: {
  s: SavedState;
  top?: ReactNode;
  footExtra?: ReactNode;
}) {
  return (
    <Builder step="scope">
      <aside className={h.stack} aria-label="시험지 설정(그림)">
        <TitleBar />
        {top ?? <SourceBar s={s} />}
        <ScopeTableStatic
          top={s.report && <ApplyReport s={s} />}
          footExtra={
            footExtra ?? (
              <button type="button" onClick={s.startSave}>
                조건 저장
              </button>
            )
          }
          bottom={<SaveInline s={s} />}
        />
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
            <p>조건을 적용해도 문항은 [문항 검토 →]을 눌러야 고릅니다.</p>
          </div>
        </section>
      </section>
    </Builder>
  );
}

function Tools({ s }: { s: SavedState }) {
  return (
    <>
      <button type="button" onClick={s.listOpen ? s.closeList : s.openList}>
        {s.listOpen ? "목록 닫기" : "저장한 조건 목록 열기"}
      </button>
      <button type="button" onClick={s.startSave}>
        [조건 저장] 눌러 보기
      </button>
      <button type="button" onClick={s.reset}>
        처음 상태로
      </button>
    </>
  );
}

function ListDialog({
  s,
  width,
  children,
  phone,
}: {
  s: SavedState;
  width?: number;
  children: ReactNode;
  phone?: boolean;
}) {
  return (
    <MockDialog
      phone={phone}
      width={width}
      title="저장한 조건"
      head={
        <button type="button" onClick={s.closeList}>
          닫기
        </button>
      }
      foot={<ListFoot />}
    >
      <ListHead s={s} />
      {s.items.length === 0 && (
        <p className={h.empty}>
          저장한 조건이 없습니다. 구성표 아래 [조건 저장]으로 만듭니다.
        </p>
      )}
      {children}
    </MockDialog>
  );
}

/* ───────────── H1 — 줄 목록 · 세 줄(이름 / 내용 / 범위) ───────────── */

function W5H1() {
  const s = useSaved();
  return (
    <Option
      id="w5-1"
      title="1 · 줄 목록 — 이름 · 내용 · 범위를 세 줄로"
      idea="고르기 창(880)에 한 조건이 한 줄 묶음 — 굵은 이름과 «마지막 사용 10/14», 그 아래 «18문항 · 기본 6 · …», 맨 아래 흐린 글로 출처와 범위 이름 전부. 오른쪽에 [적용](주 단추) · 이름 바꾸기 · 삭제(글 단추). 삭제는 그 줄 안에서 한 번 묻는다."
      cost="한 줄이 세 줄 높이라 한 화면에 여섯 남짓. 범위가 많은 조건은 셋째 줄이 길게 감긴다."
      tools={<Tools s={s} />}
    >
      <DesktopFrame
        label="1280 화면 · 사이드바 240 · [저장한 조건 · 4]를 연 상태"
        overlay={
          s.listOpen && (
            <ListDialog s={s}>
              {s.items.map((c) => (
                <div key={c.id} className={h.savedRow}>
                  <div>
                    <div className={h.savedName}>
                      <strong>{c.name}</strong>
                      <small className={h.meta}>마지막 사용 {c.lastUsed}</small>
                    </div>
                    <div className={h.savedLines}>
                      <span>{contents(c)}</span>
                      <span>{scopeLine(c)}</span>
                    </div>
                  </div>
                  <RowActions s={s} c={c} />
                  {s.renaming?.id === c.id && <RenameRow s={s} />}
                  {s.confirming === c.id && <ConfirmRow s={s} c={c} />}
                </div>
              ))}
            </ListDialog>
          )
        }
      >
        <Behind s={s} />
      </DesktopFrame>
    </Option>
  );
}

/* ───────────── H2 — 촘촘한 표 ───────────── */

function W5H2() {
  const s = useSaved();
  return (
    <Option
      id="w5-2"
      title="2 · 촘촘한 표 — 열로 견준다"
      idea="이름 | 문항 · 난이도 | 범위 | 최근 출제 | 마지막 사용 | 단추. 조건끼리 «몇 문항 · 어떤 난이도»를 위아래로 견주기 쉽다. 이름 바꾸기 · 삭제 확인은 그 행 바로 아래에 한 줄로 끼어든다."
      cost="열이 여섯이라 범위 이름이 좁은 칸에서 여러 줄로 감긴다. 표는 폰에서 그대로 못 쓴다(폰은 1안 꼴)."
      tools={<Tools s={s} />}
    >
      <DesktopFrame
        label="1280 화면 · 사이드바 240 · 표로 늘어놓은 목록"
        overlay={
          s.listOpen && (
            <ListDialog s={s}>
              <table className={h.savedTable}>
                <thead>
                  <tr>
                    <th style={{ width: 140 }}>이름</th>
                    <th style={{ width: 140 }}>문항 · 난이도</th>
                    <th>범위</th>
                    <th style={{ width: 64 }}>최근 출제</th>
                    <th style={{ width: 84 }}>마지막 사용</th>
                    <th style={{ width: 214 }} />
                  </tr>
                </thead>
                <tbody>
                  {s.items.map((c) => (
                    <FragmentRows key={c.id} s={s} c={c} />
                  ))}
                </tbody>
              </table>
            </ListDialog>
          )
        }
      >
        <Behind s={s} />
      </DesktopFrame>
    </Option>
  );
}

function FragmentRows({ s, c }: { s: SavedState; c: Saved }) {
  const extra =
    s.renaming?.id === c.id ? (
      <RenameRow s={s} />
    ) : s.confirming === c.id ? (
      <ConfirmRow s={s} c={c} />
    ) : null;
  return (
    <>
      <tr>
        <td>
          <strong>{c.name}</strong>
          <small>{c.source}</small>
        </td>
        <td>
          {c.total}
          <small>{c.ladder}</small>
        </td>
        <td>
          {c.scopes.map((x) => (
            <small key={x.label}>
              {x.label} {x.count}
              {x.fixed ? "(고정)" : ""}
            </small>
          ))}
        </td>
        <td>{c.recent ? "뺌" : "포함"}</td>
        <td className={h.num}>{c.lastUsed}</td>
        <td>
          <RowActions s={s} c={c} small />
        </td>
      </tr>
      {extra && (
        <tr className={h.inline}>
          <td colSpan={6}>{extra}</td>
        </tr>
      )}
    </>
  );
}

/* ───────────── H3 — 접힌 줄 · [내용 보기]로 펼침 · 저장은 작은 창 ───────────── */

function W5H3() {
  const s = useSaved();
  const [saveDlg, setSaveDlg] = useState(false);
  const taken = s.nameTaken(s.saveName);
  return (
    <Option
      id="w5-3"
      title="3 · 접힌 줄 — 이름과 한 줄 요약, [내용 보기]로 펼친다"
      idea="평소에는 이름 · 한 줄 요약 · [적용]만 보여 목록이 짧다. [내용 보기]를 누르면 그 줄이 열려 출처 · 범위 행 전부와 이름 바꾸기 · 삭제가 나온다(관리는 한 번 더 들어가야 보인다). 저장은 작은 창(570)에서 «담기는 것»을 다 보여 준 뒤 이름을 받는다."
      cost="범위 이름을 보려면 펼쳐야 한다 — 비슷한 이름의 조건 둘을 가를 때 한 번 더 누른다."
      tools={
        <>
          <Tools s={s} />
          <button type="button" onClick={() => setSaveDlg(true)}>
            저장 창 열기
          </button>
        </>
      }
    >
      <DesktopFrame
        label="1280 화면 · 사이드바 240 · 둘째 줄을 펼친 상태"
        overlay={
          saveDlg ? (
            <MockDialog
              title="조건 저장"
              width={570}
              head={
                <>
                  <button type="button" onClick={() => setSaveDlg(false)}>
                    취소
                  </button>
                  <button
                    type="button"
                    className={h.primary}
                    disabled={!s.saveName.trim() || taken}
                    onClick={() => {
                      s.save();
                      setSaveDlg(false);
                    }}
                  >
                    저장
                  </button>
                </>
              }
            >
              <section className={h.dlgSection}>
                <h3>이름</h3>
                <input
                  aria-label="조건 이름"
                  value={s.saveName}
                  maxLength={40}
                  onChange={(e) => s.setSaveName(e.target.value)}
                />
                {taken && (
                  <small className={h.meta}>같은 이름이 있습니다.</small>
                )}
              </section>
              <section className={h.dlgSection}>
                <h3>담기는 것</h3>
                <ul className={h.diffList}>
                  <li>
                    <span>출처</span>
                    <span>{SAVED[0].source}</span>
                  </li>
                  {SAVED[0].scopes.map((x) => (
                    <li key={x.label}>
                      <span>{x.label}</span>
                      <span className={h.num}>
                        {x.count}문항{x.fixed ? " · 고정" : ""}
                      </span>
                    </li>
                  ))}
                  <li>
                    <span>총 문항 · 난이도</span>
                    <span>
                      {SAVED[0].total} · {SAVED[0].ladder}
                    </span>
                  </li>
                  <li>
                    <span>최근 출제 빼기</span>
                    <span>켬(시험 날짜 기준 14일)</span>
                  </li>
                </ul>
                <span className={h.rule}>
                  문항과 지면 양식은 담지 않습니다.
                </span>
              </section>
            </MockDialog>
          ) : (
            s.listOpen && (
              <ListDialog s={s}>
                {s.items.map((c, i) => {
                  const open =
                    s.expanded === c.id || (s.expanded === null && i === 1);
                  return (
                    <div key={c.id} className={h.savedRow}>
                      <div>
                        <div className={h.savedName}>
                          <strong>{c.name}</strong>
                          <small className={h.meta}>{c.lastUsed}</small>
                        </div>
                        <div className={h.savedLines}>
                          <span>{contents(c)}</span>
                        </div>
                      </div>
                      <div className={h.savedActions}>
                        <button
                          type="button"
                          className={h.text}
                          aria-expanded={open}
                          onClick={() => s.setExpanded(open ? "" : c.id)}
                        >
                          {open ? "내용 접기" : "내용 보기"}
                        </button>
                        <button
                          type="button"
                          className={h.primary}
                          onClick={() => s.apply(c)}
                        >
                          적용
                        </button>
                      </div>
                      {open && (
                        <div
                          className={h.renameRow}
                          style={{
                            display: "grid",
                            gap: 8,
                            padding: "10px 12px",
                            borderRadius: 8,
                            background: "var(--learn-bg)",
                          }}
                        >
                          <span className={h.rule}>{scopeLine(c)}</span>
                          <div className={h.row}>
                            <button
                              type="button"
                              className={`${h.text} ${h.small}`}
                              onClick={() =>
                                s.setRenaming({ id: c.id, name: c.name })
                              }
                            >
                              이름 바꾸기
                            </button>
                            <button
                              type="button"
                              className={`${h.text} ${h.small} ${h.danger}`}
                              onClick={() => s.setConfirming(c.id)}
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      )}
                      {s.renaming?.id === c.id && <RenameRow s={s} />}
                      {s.confirming === c.id && <ConfirmRow s={s} c={c} />}
                    </div>
                  );
                })}
              </ListDialog>
            )
          )
        }
      >
        <Behind
          s={s}
          footExtra={
            <button type="button" onClick={() => setSaveDlg(true)}>
              조건 저장
            </button>
          }
        />
      </DesktopFrame>
    </Option>
  );
}

/* ───────────── H4 — 고른 것 한 줄(D-159) · 줄마다 «지금 적용하면» ───────────── */

function W5H4() {
  const s = useSaved();
  const current = s.report?.name;
  return (
    <Option
      id="w5-4"
      title="4 · 고른 것 한 줄 + 줄마다 «지금 적용하면»"
      idea="출처 칸 아래에 «출제 조건 — 직접 정함 / 중2 확인 · 부등식 18 적용함»을 한 줄로 두고 [저장한 조건]을 붙인다(D-159 고르기 창의 «지금 고른 것 한 줄»). 목록의 줄마다 지금 적용하면 생길 일(빠질 범위 · 모자람)을 노란 딱지로 미리 적어, 낡은 조건이 스스로 드러난다."
      cost="«지금 적용하면»은 창을 열 때마다 범위 가용량을 다시 세야 한다(조회 비용). 딱지가 많으면 목록이 시끄럽다."
      tools={<Tools s={s} />}
    >
      <DesktopFrame
        label="1280 화면 · 사이드바 240 · 줄마다 지금 적용하면 생길 일"
        overlay={
          s.listOpen && (
            <ListDialog s={s}>
              {s.items.map((c) => {
                const issues = [
                  ...(c.applyNote?.dropped ?? []).map(
                    (d) => `범위 빠짐: ${d.split(" — ")[0]}`,
                  ),
                  ...(c.applyNote?.short ?? []).map(
                    (d) => `모자람: ${d.split(" — ")[0]}`,
                  ),
                ];
                return (
                  <div key={c.id} className={h.savedRow}>
                    <div>
                      <div className={h.savedName}>
                        <strong>{c.name}</strong>
                        {issues.length ? (
                          issues.map((x) => (
                            <span key={x} className={h.badgeWarn}>
                              {x}
                            </span>
                          ))
                        ) : (
                          <span className={h.badgeDone}>그대로 적용됨</span>
                        )}
                      </div>
                      <div className={h.savedLines}>
                        <span>{contents(c)}</span>
                        <span>
                          {scopeLine(c)} · 마지막 사용 {c.lastUsed}
                        </span>
                      </div>
                    </div>
                    <RowActions s={s} c={c} apply="이 조건 적용" />
                    {s.renaming?.id === c.id && <RenameRow s={s} />}
                    {s.confirming === c.id && <ConfirmRow s={s} c={c} />}
                  </div>
                );
              })}
            </ListDialog>
          )
        }
      >
        <Behind
          s={s}
          top={
            <section className={eb.panel} aria-label="출처와 조건(그림)">
              <div className={h.condLine}>
                <span className={h.meta} style={{ flex: "0 0 auto" }}>
                  출처
                </span>
                <span>교과서 비상 · 자체 문항</span>
              </div>
              <div className={h.condLine} style={{ borderBottom: 0 }}>
                <span className={h.meta} style={{ flex: "0 0 auto" }}>
                  출제 조건
                </span>
                <span>
                  {current ? (
                    <>
                      <b>{current}</b> 적용함
                    </>
                  ) : (
                    "직접 정함 — 저장한 조건을 쓰지 않음"
                  )}
                </span>
                <button type="button" className={h.ctl} onClick={s.openList}>
                  저장한 조건 · {s.items.length}
                </button>
              </div>
            </section>
          }
        />
      </DesktopFrame>
    </Option>
  );
}

/* ───────────── 390 ───────────── */

function W5Phone() {
  const s = useSaved();
  return (
    <Option
      id="w5-phone"
      title="390 · 폰 — 고르기 창이 화면을 덮고, 줄 목록(1안 꼴)"
      idea="표(2안)는 폰에서 못 쓰므로 폰은 어느 안이든 줄 목록이다. 단추 셋은 이름 아래로 감겨 내려간다."
      cost="한 화면에 조건 셋 남짓."
      tools={<Tools s={s} />}
    >
      <PhoneFrame
        label="390 화면 · 저장한 조건(화면 전체)"
        overlay={
          s.listOpen && (
            <ListDialog s={s} phone>
              {s.items.map((c) => (
                <div
                  key={c.id}
                  className={h.savedRow}
                  style={{ gridTemplateColumns: "1fr", padding: "12px 14px" }}
                >
                  <div>
                    <div className={h.savedName}>
                      <strong>{c.name}</strong>
                      <small className={h.meta}>마지막 사용 {c.lastUsed}</small>
                    </div>
                    <div className={h.savedLines}>
                      <span>{contents(c)}</span>
                      <span>{scopeLine(c)}</span>
                    </div>
                  </div>
                  <RowActions s={s} c={c} />
                  {s.renaming?.id === c.id && <RenameRow s={s} />}
                  {s.confirming === c.id && <ConfirmRow s={s} c={c} />}
                </div>
              ))}
            </ListDialog>
          )
        }
      >
        <Behind s={s} />
      </PhoneFrame>
    </Option>
  );
}

export function W5Section() {
  return (
    <>
      <W5H1 />
      <W5H2 />
      <W5H3 />
      <W5H4 />
      <W5Phone />
    </>
  );
}

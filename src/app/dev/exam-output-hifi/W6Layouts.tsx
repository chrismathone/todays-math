"use client";

import { useState, type ReactNode } from "react";

import sc from "@/components/exam-builder/SavedConditions.module.css";

import {
  CARRIED_META,
  changedFields,
  DEFAULT_LAYOUT_ID,
  headLine,
  headOf,
  LAYOUTS,
  NOT_CARRIED,
  optionRows,
  optionsLine,
  SHEET_META,
  type Layout,
} from "./fixtures";
import h from "./hifi.module.css";
import {
  DesktopFrame,
  MockDialog,
  Option,
  PhoneFrame,
  SettingsPanel,
  Step3,
  useSheet,
} from "./parts";

/**
 * W6 내 양식 — Wire A(설정 칸 맨 위 한 줄 + 고르기 창 · W5 와 같은 틀)의 Hi-fi 4안.
 * 네 안이 같은 동작을 쓴다: 적용은 담긴 값을 통째로 덮고, 무엇이든 바꾸면 «직접 정함»,
 * 같은 이름으로 저장하면 바꿀지 한 번 묻고, 삭제도 그 줄에서 한 번 묻는다. 기본 양식은 한 사람에 하나.
 * 다른 것은 **한 줄이 놓이는 자리 · 목록의 꼴 · «기본»의 표시 · 저장 창의 나눔**이다.
 */

const TODAY = "10/16";
const NAME_MAX = 40;
const LIMIT = 50;

export const APPLY_RULE =
  "양식은 서식과 머리 정보의 고정 값만 바꿉니다. 문항 · 순서 · 제목 · 시험일 · 학년 · 학기는 그대로입니다.";

/** 새 시험지가 기본 양식으로 열린 상태 — 머리 정보의 고정 값도 그 양식 것. */
function startSheet() {
  const l = LAYOUTS.find((x) => x.id === DEFAULT_LAYOUT_ID)!;
  return { options: { ...l.options }, head: l.head };
}

function useLayouts(init: { listOpen?: boolean } = {}) {
  const start = startSheet();
  const sheet = useSheet({
    options: start.options,
    meta: { ...SHEET_META, ...start.head },
  });
  const [items, setItems] = useState<Layout[]>(LAYOUTS);
  const [appliedId, setAppliedId] = useState<string | null>(DEFAULT_LAYOUT_ID);
  const [defaultId, setDefaultId] = useState<string | null>(DEFAULT_LAYOUT_ID);
  const [listOpen, setListOpen] = useState(init.listOpen ?? false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDefault, setSaveDefault] = useState(false);
  const [replacing, setReplacing] = useState<Layout | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [confirming, setConfirming] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [flash, setFlash] = useState("");

  const sorted = [...items].sort((a, b) => b.order - a.order);
  const applied = items.find((i) => i.id === appliedId) ?? null;
  const changed = applied
    ? changedFields(applied, sheet.options, sheet.meta)
    : [];
  const state: "applied" | "changed" | "none" = !applied
    ? "none"
    : changed.length
      ? "changed"
      : "applied";
  const nameTaken = (name: string, except?: string) =>
    items.find((i) => i.name === name.trim() && i.id !== except) ?? null;

  function closeAll() {
    setListOpen(false);
    setSaveOpen(false);
    setRenaming(null);
    setConfirming(null);
    setReplacing(null);
  }

  return {
    sheet,
    items: sorted,
    applied,
    changed,
    state,
    defaultId,
    listOpen,
    saveOpen,
    saveName,
    saveDefault,
    replacing,
    renaming,
    confirming,
    expanded,
    flash,
    nameTaken,
    setSaveName(v: string) {
      setSaveName(v);
      setReplacing(null);
    },
    setSaveDefault,
    setRenaming,
    setConfirming,
    setExpanded,
    openList() {
      closeAll();
      setListOpen(true);
    },
    closeList: closeAll,
    openSave() {
      closeAll();
      setSaveName(applied?.name ?? "");
      setSaveDefault(false);
      setSaveOpen(true);
    },
    closeSave: closeAll,
    apply(l: Layout) {
      sheet.setOptions({ ...l.options });
      sheet.patchMeta({ ...l.head });
      setAppliedId(l.id);
      setItems((list) =>
        list.map((i) =>
          i.id === l.id ? { ...i, lastUsed: TODAY, order: 1016 } : i,
        ),
      );
      setFlash(`«${l.name}»을 적용했습니다.`);
      closeAll();
    },
    /** [저장] — 같은 이름이 있으면 먼저 묻는다. `confirm` 은 [바꾸기]. */
    save(confirm = false) {
      const name = saveName.trim();
      if (!name) return;
      const taken = nameTaken(name);
      if (taken && !confirm) {
        setReplacing(taken);
        return;
      }
      if (!taken && items.length >= LIMIT) return;
      const id = taken?.id ?? `l${Date.now()}`;
      const next: Layout = {
        id,
        name,
        lastUsed: TODAY,
        order: 1016,
        saved: TODAY,
        options: { ...sheet.options },
        head: headOf(sheet.meta),
      };
      setItems((list) =>
        taken ? list.map((i) => (i.id === id ? next : i)) : [next, ...list],
      );
      if (saveDefault) setDefaultId(id);
      setAppliedId(id);
      setFlash(
        taken
          ? `«${name}»을 지금 설정으로 바꿨습니다.`
          : `«${name}»을 저장했습니다.`,
      );
      closeAll();
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
    setDefault(id: string | null) {
      setDefaultId(id);
    },
    remove(id: string) {
      setItems((list) => list.filter((i) => i.id !== id));
      if (defaultId === id) setDefaultId(null);
      if (appliedId === id) setAppliedId(null);
      setConfirming(null);
    },
    /** 칸 하나 바꾸기 — «적용함»이 «직접 정함»으로 바뀌는 것을 보인다. */
    nudge() {
      sheet.patchOptions({ columns: sheet.options.columns === 2 ? 1 : 2 });
    },
    reset() {
      closeAll();
      setItems(LAYOUTS);
      setAppliedId(DEFAULT_LAYOUT_ID);
      setDefaultId(DEFAULT_LAYOUT_ID);
      setExpanded(null);
      setFlash("");
      sheet.setOptions({ ...start.options });
      sheet.setMeta((m) => ({ ...m, ...start.head }));
    },
  };
}
type L = ReturnType<typeof useLayouts>;

/* ───────────── 공통 조각 ───────────── */

function Tools({ l }: { l: L }) {
  return (
    <>
      <button type="button" onClick={l.openList}>
        저장한 양식 목록 열기
      </button>
      <button type="button" onClick={l.openSave}>
        [양식 저장] 눌러 보기
      </button>
      <button type="button" onClick={l.nudge}>
        칸 하나 바꾸기 (1단 ↔ 2단)
      </button>
      <button type="button" onClick={l.reset}>
        처음 상태로
      </button>
    </>
  );
}

function RenameRow({ l }: { l: L }) {
  if (!l.renaming) return null;
  const taken = !!l.nameTaken(l.renaming.name, l.renaming.id);
  return (
    <div className={sc.renameRow}>
      <input
        aria-label="새 이름"
        value={l.renaming.name}
        maxLength={NAME_MAX}
        onChange={(e) =>
          l.setRenaming({ id: l.renaming!.id, name: e.target.value })
        }
      />
      <button
        type="button"
        className={h.primary}
        disabled={!l.renaming.name.trim() || taken}
        onClick={l.rename}
      >
        이름 저장
      </button>
      <button type="button" onClick={() => l.setRenaming(null)}>
        취소
      </button>
      {taken && <small className={sc.meta}>같은 이름이 있습니다.</small>}
    </div>
  );
}

function DeleteConfirm({ l, item }: { l: L; item: Layout }) {
  return (
    <div className={sc.confirm} role="alert">
      <span>
        «{item.name}»을 지울까요? 이 양식으로 만든 시험지는 그대로입니다.
        {l.defaultId === item.id &&
          " 새 시험지는 처음 값(정통 · 1단)으로 시작합니다."}
      </span>
      <button
        type="button"
        className={h.danger}
        onClick={() => l.remove(item.id)}
      >
        지우기
      </button>
      <button type="button" onClick={() => l.setConfirming(null)}>
        취소
      </button>
    </div>
  );
}

function RowExtras({ l, item }: { l: L; item: Layout }) {
  return (
    <>
      {l.renaming?.id === item.id && <RenameRow l={l} />}
      {l.confirming === item.id && <DeleteConfirm l={l} item={item} />}
    </>
  );
}

function RenameDelete({
  l,
  item,
  small,
  between,
}: {
  l: L;
  item: Layout;
  small?: boolean;
  /** 이름 바꾸기와 삭제 사이 — 위험한 단추가 늘 맨 끝이게. */
  between?: ReactNode;
}) {
  const sm = small ? ` ${h.small}` : "";
  return (
    <>
      <button
        type="button"
        className={`${h.text}${sm}`}
        onClick={() => {
          l.setConfirming(null);
          l.setRenaming({ id: item.id, name: item.name });
        }}
      >
        이름 바꾸기
      </button>
      {between}
      <button
        type="button"
        className={`${h.text} ${h.danger}${sm}`}
        onClick={() => {
          l.setRenaming(null);
          l.setConfirming(item.id);
        }}
      >
        삭제
      </button>
    </>
  );
}

function ReplaceConfirm({ l }: { l: L }) {
  if (!l.replacing) return null;
  return (
    <div className={sc.confirmWarn} role="alert">
      <span>
        «{l.replacing.name}»을 지금 설정으로 바꿀까요? 지난 저장{" "}
        {l.replacing.saved}의 내용은 남지 않습니다.
      </span>
      <button type="button" className={h.primary} onClick={() => l.save(true)}>
        바꾸기
      </button>
      <button type="button" onClick={() => l.setSaveName(l.saveName)}>
        취소
      </button>
    </div>
  );
}

function NameField({ l, label = "양식 이름" }: { l: L; label?: string }) {
  const taken = !!l.nameTaken(l.saveName);
  return (
    <label className={h.fieldLabel}>
      {label}
      <input
        value={l.saveName}
        maxLength={NAME_MAX}
        placeholder="예: 일일TEST 2단"
        onChange={(e) => l.setSaveName(e.target.value)}
      />
      <small className={h.meta}>
        {taken
          ? "같은 이름이 있습니다 — 저장하면 바꿀지 묻습니다."
          : `${NAME_MAX}자까지 · 저장한 양식 ${l.items.length}/${LIMIT}`}
      </small>
    </label>
  );
}

function DefaultCheck({ l }: { l: L }) {
  const current = l.items.find((i) => i.id === l.defaultId);
  return (
    <label className={h.checkRow}>
      <input
        type="checkbox"
        checked={l.saveDefault}
        onChange={(e) => l.setSaveDefault(e.target.checked)}
      />
      <span>
        새 시험지의 기본 양식으로
        {current && (
          <small className={h.meta}>
            지금 기본은 «{current.name}» — 고르면 이 양식으로 바뀝니다.
          </small>
        )}
      </span>
    </label>
  );
}

function SaveHead({ l }: { l: L }) {
  return (
    <>
      <button type="button" onClick={l.closeSave}>
        취소
      </button>
      <button
        type="button"
        className={h.primary}
        disabled={!l.saveName.trim() || !!l.replacing}
        onClick={() => l.save()}
      >
        저장
      </button>
    </>
  );
}

function Flash({ l }: { l: L }) {
  if (!l.flash) return null;
  return (
    <p className={h.flash} role="status">
      {l.flash}
    </p>
  );
}

/** 지면 그림 — 템플릿 · 단 · 풀이 공간 · 강조 색을 작은 종이에(4안). */
function MiniPaper({ o }: { o: Layout["options"] }) {
  return (
    <span
      className={h.mini}
      data-template={o.template}
      aria-hidden
      style={{ ["--mini-accent" as string]: o.color }}
    >
      <span className={h.miniHead} />
      <span className={h.miniBody} data-cols={o.columns}>
        <span />
        {o.columns === 2 ? (
          <span />
        ) : (
          o.solvingArea !== "off" && <span className={h.miniSolve} />
        )}
      </span>
    </span>
  );
}

/* ───────────── 1안 — 띠 한 줄 · 세 줄 목록(W5 와 같은 꼴) ───────────── */

function Line1({ l }: { l: L }) {
  return (
    <div className={h.layoutBar} data-layout-line>
      <div className={h.layoutBarText}>
        <span className={sc.condLabel}>양식</span>
        <span className={sc.condText}>
          {l.state === "applied" ? (
            <>
              <b>{l.applied!.name}</b> 적용함
            </>
          ) : l.state === "changed" ? (
            <>
              직접 정함 — <b>{l.applied!.name}</b>에서 바꿈
            </>
          ) : (
            "직접 정함 — 저장한 양식을 쓰지 않음"
          )}
        </span>
      </div>
      <div className={h.layoutBarActions}>
        <button type="button" onClick={l.openList}>
          저장한 양식 · {l.items.length}
        </button>
        <button type="button" onClick={l.openSave}>
          양식 저장
        </button>
      </div>
    </div>
  );
}

function List1({ l, phone }: { l: L; phone?: boolean }) {
  return (
    <MockDialog
      phone={phone}
      title="저장한 양식"
      head={
        <button type="button" onClick={l.closeList}>
          닫기
        </button>
      }
      foot={<span className={h.grow}>{APPLY_RULE}</span>}
    >
      <div className={sc.listHead}>
        <span>
          저장한 양식 <b className={sc.num}>{l.items.length}</b> · 마지막으로 쓴
          차례
        </span>
        <span className={sc.grow} />
        <span>서식과 머리 정보만 담습니다.</span>
      </div>
      {!l.items.length && (
        <p className={sc.empty}>
          저장한 양식이 없습니다. 설정 칸 맨 위 [양식 저장]으로 만듭니다.
        </p>
      )}
      <ul className={sc.list}>
        {l.items.map((item) => (
          <li
            key={item.id}
            className={`${sc.savedRow} ${phone ? h.rowPhone : ""}`}
          >
            <div>
              <div className={sc.savedName}>
                <strong>{item.name}</strong>
                {l.defaultId === item.id && (
                  <span className={h.badge}>새 시험지 기본</span>
                )}
                <small className={sc.meta}>마지막 사용 {item.lastUsed}</small>
              </div>
              <div className={sc.savedLines}>
                <span>서식 · {optionsLine(item.options)}</span>
                <span>머리 정보 · {headLine(item.head)}</span>
              </div>
            </div>
            <div className={sc.savedActions}>
              <button
                type="button"
                className={h.primary}
                onClick={() => l.apply(item)}
              >
                적용
              </button>
              <RenameDelete
                l={l}
                item={item}
                between={
                  <button
                    type="button"
                    className={h.text}
                    onClick={() =>
                      l.setDefault(l.defaultId === item.id ? null : item.id)
                    }
                  >
                    {l.defaultId === item.id ? "기본 해제" : "기본으로"}
                  </button>
                }
              />
            </div>
            <RowExtras l={l} item={item} />
          </li>
        ))}
      </ul>
    </MockDialog>
  );
}

function Save1({ l, phone }: { l: L; phone?: boolean }) {
  return (
    <MockDialog
      phone={phone}
      title="양식 저장"
      width={570}
      head={<SaveHead l={l} />}
    >
      <div className={h.dlgPad}>
        <NameField l={l} />
        <ReplaceConfirm l={l} />
        <dl className={h.facts}>
          <dt>담는 서식</dt>
          <dd>{optionsLine(l.sheet.options)}</dd>
          <dt>담는 머리 정보</dt>
          <dd>{headLine(headOf(l.sheet.meta))}</dd>
          <dt>담지 않음</dt>
          <dd>{NOT_CARRIED} — 시험지마다 다릅니다.</dd>
        </dl>
        <DefaultCheck l={l} />
      </div>
    </MockDialog>
  );
}

function W6H1() {
  const l = useLayouts();
  return (
    <Option
      id="w6-1"
      title="1 · 띠 한 줄 — 1단계 «출제 조건» 줄과 같은 꼴, 목록은 세 줄"
      idea="설정 칸 맨 위, 안내 글 위에 흰 띠 한 줄 — 작은 «양식» 글 · «일일TEST 2단 적용함» · 아래로 [저장한 양식 · 4] [양식 저장]. 목록은 1단계 «저장한 조건»과 같은 고르기 창(880 · 내용만큼)의 세 줄(이름 · 기본 · 마지막 사용 / 서식 / 머리 정보). «기본»은 이름 옆 파란 딱지. 저장 창(570)은 이름 · «담는 서식 / 담는 머리 정보 / 담지 않음» 세 줄 · 기본 체크."
      cost="띠가 템플릿을 약 100px 밀어 내린다. 서식 줄이 길어 한 양식이 세 줄 반쯤 된다 — 한 화면에 다섯 남짓. 저장 창의 요약은 글이라 «무엇이 들었나»를 읽어야 안다."
      tools={<Tools l={l} />}
    >
      <DesktopFrame
        label="1280 · 사이드바 240 · 설정 칸 340 — 띠는 안내 글 위"
        overlay={
          l.listOpen ? <List1 l={l} /> : l.saveOpen ? <Save1 l={l} /> : null
        }
      >
        <Step3
          sheet={l.sheet}
          settings={
            <SettingsPanel
              sheet={l.sheet}
              top={
                <>
                  <Line1 l={l} />
                  <Flash l={l} />
                </>
              }
            />
          }
        />
      </DesktopFrame>
    </Option>
  );
}

/* ───────────── 2안 — 템플릿 머리에 붙은 띠 · 표 목록 · «기본»은 라디오 ───────────── */

function Line2({ l }: { l: L }) {
  return (
    <div className={h.tplStrip} data-layout-line>
      <span className={h.tplStripText}>
        <span className={h.tplStripLabel}>내 양식</span>
        {l.state === "applied" ? (
          <b>{l.applied!.name}</b>
        ) : (
          <span>직접 정함</span>
        )}
        {l.state === "changed" && (
          <small className={h.meta}>«{l.applied!.name}»에서 바꿈</small>
        )}
      </span>
      <span className={h.tplStripActions}>
        <button type="button" onClick={l.openList}>
          목록 · {l.items.length}
        </button>
        <button type="button" onClick={l.openSave}>
          저장
        </button>
      </span>
    </div>
  );
}

function List2({ l }: { l: L }) {
  return (
    <MockDialog
      title="저장한 양식"
      head={
        <button type="button" onClick={l.closeList}>
          닫기
        </button>
      }
      foot={<span className={h.grow}>{APPLY_RULE}</span>}
    >
      <fieldset className={h.radioHead}>
        <legend>새 시험지 기본 양식 — 하나만 고릅니다</legend>
        <label className={h.checkRow}>
          <input
            type="radio"
            name="w6-2-default"
            checked={l.defaultId === null}
            onChange={() => l.setDefault(null)}
          />
          기본 양식 없음 — 새 시험지는 처음 값(정통 · 1단)
        </label>
      </fieldset>
      <table className={h.layoutTable}>
        <thead>
          <tr>
            <th style={{ width: 56 }}>기본</th>
            <th style={{ width: 168 }}>이름</th>
            <th>서식</th>
            <th style={{ width: 168 }}>머리 정보</th>
            <th style={{ width: 236 }} />
          </tr>
        </thead>
        <tbody>
          {l.items.map((item) => {
            const extra =
              l.renaming?.id === item.id || l.confirming === item.id;
            return (
              <FragmentRow
                key={item.id}
                extra={extra && <RowExtras l={l} item={item} />}
              >
                <td>
                  <input
                    type="radio"
                    name="w6-2-default"
                    aria-label={`${item.name} 기본 양식으로`}
                    checked={l.defaultId === item.id}
                    onChange={() => l.setDefault(item.id)}
                  />
                </td>
                <td>
                  <strong>{item.name}</strong>
                  <small>마지막 사용 {item.lastUsed}</small>
                </td>
                <td>{optionsLine(item.options)}</td>
                <td>
                  <small>{headLine(item.head)}</small>
                </td>
                <td>
                  <div className={h.rowActions}>
                    <button
                      type="button"
                      className={`${h.primary} ${h.small}`}
                      onClick={() => l.apply(item)}
                    >
                      적용
                    </button>
                    <RenameDelete l={l} item={item} small />
                  </div>
                </td>
              </FragmentRow>
            );
          })}
        </tbody>
      </table>
    </MockDialog>
  );
}

function FragmentRow({
  extra,
  children,
}: {
  extra: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <tr>{children}</tr>
      {extra && (
        <tr className={h.inlineRow}>
          <td colSpan={5}>{extra}</td>
        </tr>
      )}
    </>
  );
}

function Save2({ l }: { l: L }) {
  const head = headOf(l.sheet.meta);
  return (
    <MockDialog title="양식 저장" width={640} head={<SaveHead l={l} />}>
      <div className={h.dlgPad}>
        <NameField l={l} />
        <ReplaceConfirm l={l} />
        <table className={h.valueTable}>
          <caption>담는 것 — 지금 값 그대로</caption>
          <tbody>
            {optionRows(l.sheet.options).map(([k, v]) => (
              <tr key={k}>
                <th>{k}</th>
                <td>{v}</td>
              </tr>
            ))}
            {CARRIED_META.map(([key, label]) => (
              <tr key={key}>
                <th>{label}</th>
                <td>
                  {head[key] === "" || head[key] === undefined ? (
                    <span className={h.meta}>
                      비어 있음 — 비운 채로 담습니다
                    </span>
                  ) : (
                    String(head[key])
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={h.notCarried}>
          <b>담지 않음</b> {NOT_CARRIED}
        </p>
        <DefaultCheck l={l} />
      </div>
    </MockDialog>
  );
}

function W6H2() {
  const l = useLayouts();
  return (
    <Option
      id="w6-2"
      title="2 · 템플릿 머리에 붙은 띠 — 표 목록 · «기본»은 라디오"
      idea="띠를 «템플릿» 제목과 여섯 칸 사이에 붙인다(옅은 파랑 면) — «양식은 템플릿을 포함한 한 벌»로 읽히게. 단추는 작게 [목록 · 4] [저장]. 목록은 표 — 기본 · 이름 · 서식 · 머리 정보 · 관리. «기본»은 라디오 한 열이라 «하나만»이 모양으로 보이고, 맨 위 «기본 양식 없음»으로 끈다. 저장 창(640)은 담는 값을 «항목 | 지금 값» 표로 다 보인다."
      cost="띠가 템플릿 묶음 안에 들어가 «템플릿을 고르는 칸»과 헷갈릴 수 있다. 작은 글(13px) 단추 둘이 다른 칸의 단추보다 가볍게 보여 지나치기 쉽다. 표는 폰에서 그대로 못 써서 폰은 1안 꼴로 따로 그려야 한다. 저장 창이 길다(항목 15줄)."
      tools={<Tools l={l} />}
    >
      <DesktopFrame
        label="1280 · 띠는 템플릿 제목 아래 · 여섯 칸 바로 위"
        overlay={
          l.listOpen ? <List2 l={l} /> : l.saveOpen ? <Save2 l={l} /> : null
        }
      >
        <Step3
          sheet={l.sheet}
          settings={
            <SettingsPanel
              sheet={l.sheet}
              top={<Flash l={l} />}
              templateHead={<Line2 l={l} />}
            />
          }
        />
      </DesktopFrame>
    </Option>
  );
}

/* ───────────── 3안 — 이름이 큰 카드 · 바뀐 곳을 센다 · 접힌 목록 ───────────── */

function Line3({ l }: { l: L }) {
  return (
    <div className={h.layoutCard} data-layout-line>
      <span className={h.layoutCardLabel}>양식</span>
      <strong className={h.layoutCardName}>
        {l.applied ? l.applied.name : "직접 정함"}
      </strong>
      <span className={h.row}>
        {l.state === "applied" && <span className={h.badgeDone}>적용함</span>}
        {l.state === "changed" && (
          <>
            <span className={h.badgeWarn}>{l.changed.length}곳 바뀜</span>
            <small className={h.meta}>{l.changed.join(" · ")}</small>
          </>
        )}
        {l.state === "none" && (
          <small className={h.meta}>저장한 양식을 쓰지 않음</small>
        )}
      </span>
      <div className={h.layoutCardActions}>
        <button type="button" onClick={l.openList}>
          다른 양식 · {l.items.length}
        </button>
        <button type="button" onClick={l.openSave}>
          {l.state === "changed" ? "바뀐 대로 저장" : "양식 저장"}
        </button>
      </div>
    </div>
  );
}

function List3({ l }: { l: L }) {
  return (
    <MockDialog
      title="저장한 양식"
      width={720}
      head={
        <button type="button" onClick={l.closeList}>
          닫기
        </button>
      }
      foot={<span className={h.grow}>{APPLY_RULE}</span>}
    >
      <ul className={h.slimList}>
        {l.items.map((item) => {
          const open = l.expanded === item.id;
          const isDefault = l.defaultId === item.id;
          return (
            <li key={item.id} className={isDefault ? h.slimDefault : undefined}>
              <div className={h.slimRow}>
                <span className={h.slimName}>
                  <strong>{item.name}</strong>
                  {isDefault && <span className={h.defaultText}>기본</span>}
                </span>
                <small className={h.meta}>{item.lastUsed}</small>
                <button
                  type="button"
                  className={`${h.text} ${h.small}`}
                  aria-expanded={open}
                  onClick={() => l.setExpanded(open ? null : item.id)}
                >
                  {open ? "내용 접기" : "내용 보기"}
                </button>
                <button
                  type="button"
                  className={`${h.primary} ${h.small}`}
                  onClick={() => l.apply(item)}
                >
                  적용
                </button>
              </div>
              {open && (
                <div className={h.slimMore}>
                  <span>서식 · {optionsLine(item.options)}</span>
                  <span className={h.meta}>
                    머리 정보 · {headLine(item.head)}
                  </span>
                  <div className={h.row}>
                    <RenameDelete
                      l={l}
                      item={item}
                      small
                      between={
                        <button
                          type="button"
                          className={`${h.text} ${h.small}`}
                          onClick={() =>
                            l.setDefault(isDefault ? null : item.id)
                          }
                        >
                          {isDefault ? "기본 해제" : "새 시험지 기본으로"}
                        </button>
                      }
                    />
                  </div>
                  <RowExtras l={l} item={item} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </MockDialog>
  );
}

function Save3({ l }: { l: L }) {
  const head = headOf(l.sheet.meta);
  const t = l.sheet;
  return (
    <MockDialog title="양식 저장" width={880} head={<SaveHead l={l} />}>
      <div className={h.dlgPad}>
        <NameField l={l} />
        <ReplaceConfirm l={l} />
        <div className={h.saveSplit}>
          <section>
            <h3 className={h.sectionLabel}>담는 것</h3>
            <dl className={h.kv}>
              {optionRows(t.options).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
              {CARRIED_META.filter(([key]) => head[key] !== "").map(
                ([key, label]) => (
                  <div key={key}>
                    <dt>{label}</dt>
                    <dd>{String(head[key])}</dd>
                  </div>
                ),
              )}
            </dl>
          </section>
          <section className={h.saveSplitOff}>
            <h3 className={h.sectionLabel}>담지 않음 — 시험지마다 다름</h3>
            <dl className={h.kv}>
              <div>
                <dt>문항 · 순서</dt>
                <dd>5문항</dd>
              </div>
              <div>
                <dt>제목</dt>
                <dd>{t.title}</dd>
              </div>
              <div>
                <dt>시험일</dt>
                <dd>{t.meta.examDate || "비움 — 그날 날짜"}</dd>
              </div>
              <div>
                <dt>학년 · 학기</dt>
                <dd>비움 — 범위의 학년</dd>
              </div>
              <div>
                <dt>태그</dt>
                <dd>시험지에 붙음</dd>
              </div>
            </dl>
          </section>
        </div>
        <DefaultCheck l={l} />
      </div>
    </MockDialog>
  );
}

function W6H3() {
  const l = useLayouts();
  return (
    <Option
      id="w6-3"
      title="3 · 이름이 큰 카드 — 바뀐 곳을 세고, 목록은 접힌 한 줄"
      idea="설정 칸 맨 위 카드에 양식 이름을 크게. 적용한 그대로면 초록 «적용함», 칸을 바꾸면 노랑 «2곳 바뀜 · 단 · 보기 번호 배치»로 무엇이 달라졌는지 적고, 단추가 [바뀐 대로 저장]으로 바뀐다. 목록(720)은 한 줄(이름 · 날짜 · [내용 보기] · [적용])이고 «기본»은 왼쪽 파란 막대와 글. 관리는 [내용 보기]를 펴야 나온다. 저장 창(880)은 왼쪽 «담는 것», 오른쪽 «담지 않음 — 지금 값»으로 나눈다."
      cost="카드가 가장 크다(약 150px). 바뀐 곳 이름이 길면 두 줄. 목록에서 서식을 보려면 한 번 더 눌러야 한다 — 비슷한 이름 둘을 가를 때 손이 더 간다. 1단계 «출제 조건» 줄과 모양이 달라진다(규칙 11)."
      tools={<Tools l={l} />}
    >
      <DesktopFrame
        label="1280 · 카드는 설정 칸 맨 위"
        overlay={
          l.listOpen ? <List3 l={l} /> : l.saveOpen ? <Save3 l={l} /> : null
        }
      >
        <Step3
          sheet={l.sheet}
          settings={
            <SettingsPanel
              sheet={l.sheet}
              top={
                <>
                  <Line3 l={l} />
                  <Flash l={l} />
                </>
              }
            />
          }
        />
      </DesktopFrame>
    </Option>
  );
}

/* ───────────── 4안 — 고르는 칸 모양 · 지면 그림이 있는 목록 ───────────── */

function Line4({ l }: { l: L }) {
  return (
    <div className={h.layoutPick} data-layout-line>
      <span className={h.layoutPickLabel}>양식</span>
      <div className={h.layoutPickRow}>
        <button type="button" className={h.selectLike} onClick={l.openList}>
          <span>{l.state === "applied" ? l.applied!.name : "직접 정함"}</span>
          <span aria-hidden>▾</span>
        </button>
        <button type="button" className={h.ctl} onClick={l.openSave}>
          저장
        </button>
      </div>
      <small className={h.meta}>
        {l.state === "applied"
          ? `적용함 · ${l.applied!.saved} 저장`
          : l.state === "changed"
            ? `«${l.applied!.name}»에서 바꿈 — 저장하면 바꿀지 묻습니다`
            : "저장한 양식을 쓰지 않음"}
      </small>
    </div>
  );
}

function List4({ l }: { l: L }) {
  return (
    <MockDialog
      title="저장한 양식"
      head={
        <button type="button" onClick={l.closeList}>
          닫기
        </button>
      }
      foot={<span className={h.grow}>{APPLY_RULE}</span>}
    >
      <ul className={h.thumbList}>
        {l.items.map((item) => (
          <li key={item.id} className={h.thumbRow}>
            <MiniPaper o={item.options} />
            <div className={h.thumbText}>
              <span className={h.row}>
                <strong>{item.name}</strong>
                <small className={h.meta}>마지막 사용 {item.lastUsed}</small>
              </span>
              <span>{optionsLine(item.options)}</span>
              <small className={h.meta}>{headLine(item.head)}</small>
              <label className={h.checkRow}>
                <input
                  type="checkbox"
                  checked={l.defaultId === item.id}
                  onChange={(e) =>
                    l.setDefault(e.target.checked ? item.id : null)
                  }
                />
                새 시험지 기본
              </label>
            </div>
            <div className={h.thumbActions}>
              <button
                type="button"
                className={h.primary}
                onClick={() => l.apply(item)}
              >
                적용
              </button>
              <RenameDelete l={l} item={item} small />
            </div>
            <RowExtras l={l} item={item} />
          </li>
        ))}
      </ul>
    </MockDialog>
  );
}

function Save4({ l }: { l: L }) {
  return (
    <MockDialog
      title="양식 저장"
      width={640}
      head={<SaveHead l={l} />}
      foot={
        l.replacing ? (
          <ReplaceConfirm l={l} />
        ) : (
          <span className={h.grow}>{APPLY_RULE}</span>
        )
      }
    >
      <div className={`${h.dlgPad} ${h.saveThumb}`}>
        <MiniPaper o={l.sheet.options} />
        <div className={h.stack}>
          <NameField l={l} />
          <p className={h.saveLine}>
            <b>서식</b> {optionsLine(l.sheet.options)}
          </p>
          <p className={h.saveLine}>
            <b>머리 정보</b> {headLine(headOf(l.sheet.meta))}
          </p>
          <p className={h.notCarried}>
            <b>담지 않음</b> {NOT_CARRIED}
          </p>
          <DefaultCheck l={l} />
        </div>
      </div>
    </MockDialog>
  );
}

function W6H4() {
  const l = useLayouts();
  return (
    <Option
      id="w6-4"
      title="4 · 고르는 칸 모양 — 지면 그림이 있는 목록"
      idea="한 줄을 입력 칸처럼 짓는다 — «양식» 라벨 아래 [일일TEST 2단 ▾](누르면 목록)와 [저장], 그 밑에 «적용함 · 10/12 저장» 한 줄. 다른 칸들과 같은 «라벨 + 칸» 꼴이라 설정 칸에 섞인다. 목록은 줄마다 작은 지면 그림(템플릿 머리 · 1단/2단 · 풀이 공간 · 강조 색)이 있어 이름을 안 읽어도 고른다. «기본»은 줄마다 «새 시험지 기본» 체크 — 하나를 켜면 다른 것이 꺼진다. 같은 이름 확인은 저장 창 바닥 줄에 뜬다."
      cost="고르는 칸처럼 보여 «펼치면 바로 바뀌는 칸»으로 읽힐 수 있다(실제로는 창이 열린다). 지면 그림은 실제 지면이 아니라 그림이라 여백 · 보기 배치 같은 차이는 안 보인다. 체크 여러 개가 «여러 개 켤 수 있다»로 읽힐 수 있다."
      tools={<Tools l={l} />}
    >
      <DesktopFrame
        label="1280 · «양식» 칸은 설정 칸 맨 위"
        overlay={
          l.listOpen ? <List4 l={l} /> : l.saveOpen ? <Save4 l={l} /> : null
        }
      >
        <Step3
          sheet={l.sheet}
          settings={
            <SettingsPanel
              sheet={l.sheet}
              top={
                <>
                  <Line4 l={l} />
                  <Flash l={l} />
                </>
              }
            />
          }
        />
      </DesktopFrame>
    </Option>
  );
}

/* ───────────── 폰 390 — 1안 ───────────── */

function W6Phone() {
  const l = useLayouts({ listOpen: true });
  return (
    <Option
      id="w6-phone"
      title="폰 390 · 1안 — 띠는 그대로, 창은 화면을 다 덮는다"
      idea="설정 칸이 미리보기 위로 쌓이고 띠는 그 맨 위. 목록 창은 화면을 다 덮고, 줄의 단추 넷은 이름 아래로 감겨 내려간다(«저장한 조건» 폰과 같은 규칙)."
      cost="창을 닫아야 미리보기가 보인다 — 적용한 뒤 지면은 아래로 내려가 확인한다."
      tools={<Tools l={l} />}
    >
      <PhoneFrame
        label="390 · 목록을 연 상태"
        overlay={
          l.listOpen ? (
            <List1 l={l} phone />
          ) : l.saveOpen ? (
            <Save1 l={l} phone />
          ) : null
        }
      >
        <Step3
          sheet={l.sheet}
          settings={
            <SettingsPanel
              sheet={l.sheet}
              top={
                <>
                  <Line1 l={l} />
                  <Flash l={l} />
                </>
              }
            />
          }
        />
      </PhoneFrame>
    </Option>
  );
}

export function W6Section() {
  return (
    <>
      <W6H1 />
      <W6H2 />
      <W6H3 />
      <W6H4 />
      <W6Phone />
    </>
  );
}

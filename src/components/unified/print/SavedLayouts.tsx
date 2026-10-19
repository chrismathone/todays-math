"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { PickerDialog } from "@/components/picker-dialog/PickerDialog";
import sc from "@/components/exam-builder/SavedConditions.module.css";
import {
  PRINT_PRESET_LIMIT,
  PRINT_PRESET_NAME_MAX,
  PRINT_PRESET_VERSION,
  applyPresetTo,
  presetContentOf,
  presetDiffers,
  type PrintPreset,
} from "@/contracts/printPreset.contract";
import type { PrintMeta, PrintOptions } from "./types";
import {
  PrintPresetError,
  type PrintPresetsClient,
} from "./printPresetsClient";
import { dayLabel, headLine, optionsLine } from "./printPresetText";
import o from "./OutputExtras.module.css";

/**
 * 시험지 만들기 3단계 «내 양식»(W6 · Hi-fi 1안 — 원장님 2026-10-16).
 * `src/app/dev/exam-output-hifi/W6Layouts.tsx` 의 1안 — 설정 칸 맨 위 띠 한 줄(«양식 — ○○ 적용함 / 직접 정함»)과
 * [저장한 양식 · n](공용 고르기 창 · 세 줄 목록 · «새 시험지 기본» 딱지) · [양식 저장](담는 서식 / 담는 머리 정보 / 담지 않음).
 * 적용은 담긴 값을 통째로 덮는다. 담는 칸을 하나라도 바꾸면 «직접 정함»(담지 않는 칸은 바꿔도 그대로).
 */

export const APPLY_RULE =
  "양식은 서식과 머리 정보의 고정 값만 바꿉니다. 문항 · 순서 · 제목 · 시험일 · 학년 · 학기는 그대로입니다.";
export const NOT_CARRIED =
  "문항 · 문제 순서 · 제목 · 시험일 · 학년 · 학기 · 오늘의 목표 · 개념 정리 · 유형명 · 핵심 전략 · 태그";

const byUse = (a: PrintPreset, b: PrintPreset) =>
  Date.parse(b.preset.lastUsedAt) - Date.parse(a.preset.lastUsedAt);
const errorText = (cause: unknown, fallback: string) =>
  cause instanceof Error ? cause.message : fallback;

export default function SavedLayouts({
  client,
  options,
  meta,
  onApply,
  onDefaultChange,
}: {
  client: PrintPresetsClient;
  options: PrintOptions;
  meta: PrintMeta;
  /** 담긴 값으로 덮은 서식 전부와 머리 정보(담지 않는 칸은 지금 값 그대로). */
  onApply: (next: { options: PrintOptions; meta: PrintMeta }) => void;
  /** 목록을 읽었거나 기본이 바뀌었을 때 — 새 시험지가 이 양식으로 열린다. */
  onDefaultChange?: (preset: PrintPreset | null) => void;
}) {
  const [items, setItems] = useState<PrintPreset[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  /** undefined = 아직 못 정함(목록 전) · null = 저장한 양식을 쓰지 않음. */
  const [appliedId, setAppliedId] = useState<string | null | undefined>();
  const [open, setOpen] = useState<"list" | "save" | null>(null);
  const [flash, setFlash] = useState("");
  const listOpener = useRef<HTMLButtonElement>(null);
  const saveOpener = useRef<HTMLButtonElement>(null);
  const defaultChange = useRef(onDefaultChange);
  useEffect(() => {
    defaultChange.current = onDefaultChange;
  });
  const sheet = useRef({ options, meta });
  useEffect(() => {
    sheet.current = { options, meta };
  });

  useEffect(() => {
    const controller = new AbortController();
    void client
      .list(controller.signal)
      .then((list) => {
        if (controller.signal.aborted) return;
        const sorted = [...list].sort(byUse);
        setItems(sorted);
        setLoadError("");
        // 다시 연 시험지 — 지금 값과 똑같은 양식이 있으면(기본을 먼저) «적용함»으로 읽는다.
        setAppliedId((current) => {
          if (current !== undefined) return current;
          const { options: o, meta: m } = sheet.current;
          const same = (item: PrintPreset) => !presetDiffers(item.preset, o, m);
          return (
            sorted.find((item) => item.preset.isDefault && same(item))?.id ??
            sorted.find(same)?.id ??
            null
          );
        });
        defaultChange.current?.(
          sorted.find((item) => item.preset.isDefault) ?? null,
        );
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setLoadError(errorText(cause, "저장한 양식을 불러오지 못했습니다."));
      });
    return () => controller.abort();
  }, [client, retry]);

  const list = items ?? [];
  const applied = list.find((item) => item.id === appliedId) ?? null;
  const state: "applied" | "changed" | "none" = !applied
    ? "none"
    : presetDiffers(applied.preset, options, meta)
      ? "changed"
      : "applied";

  function update(next: PrintPreset[]) {
    const sorted = [...next].sort(byUse);
    setItems(sorted);
    defaultChange.current?.(
      sorted.find((item) => item.preset.isDefault) ?? null,
    );
  }
  /** 서버가 돌려준 한 줄로 바꾼다 — 기본이 섰으면 다른 줄의 기본은 내린다(서버가 한 일과 같다). */
  function put(saved: PrintPreset) {
    const rest = list.filter((item) => item.id !== saved.id);
    update([
      saved,
      ...rest.map((item) =>
        saved.preset.isDefault && item.preset.isDefault
          ? {
              ...item,
              revision: item.revision + 1,
              preset: { ...item.preset, isDefault: false },
            }
          : item,
      ),
    ]);
  }
  function apply(item: PrintPreset) {
    onApply(applyPresetTo(item.preset, meta));
    setAppliedId(item.id);
    setFlash(`«${item.preset.name}»을 적용했습니다.`);
    setOpen(null);
    // 적용하면 «마지막 사용»이 오늘이 되어 목록 맨 위로 온다.
    update(
      list.map((row) =>
        row.id === item.id
          ? {
              ...row,
              preset: { ...row.preset, lastUsedAt: new Date().toISOString() },
            }
          : row,
      ),
    );
    void client
      .touch(item.id)
      .then((saved) =>
        setItems((current) =>
          current
            ? current.map((row) => (row.id === saved.id ? saved : row))
            : current,
        ),
      )
      .catch(() => {});
  }

  return (
    <>
      <div className={o.layoutBar} data-layout-line>
        <div className={o.layoutBarText}>
          <span className={sc.condLabel}>양식</span>
          <span className={sc.condText}>
            {state === "applied" ? (
              <>
                <b>{applied!.preset.name}</b> 적용함
              </>
            ) : state === "changed" ? (
              <>
                직접 정함 — <b>{applied!.preset.name}</b>에서 바꿈
              </>
            ) : (
              "직접 정함 — 저장한 양식을 쓰지 않음"
            )}
          </span>
        </div>
        <div className={o.layoutBarActions}>
          <button
            type="button"
            ref={listOpener}
            onClick={() => {
              setFlash("");
              setOpen("list");
            }}
          >
            {items ? `저장한 양식 · ${items.length}` : "저장한 양식"}
          </button>
          <button
            type="button"
            ref={saveOpener}
            onClick={() => {
              setFlash("");
              setOpen("save");
            }}
          >
            양식 저장
          </button>
        </div>
      </div>
      {flash && (
        <p className={o.flash} role="status">
          {flash}
        </p>
      )}
      {open === "list" && (
        <LayoutListDialog
          items={list}
          loading={!items && !loadError}
          error={loadError}
          returnFocus={listOpener}
          onRetry={() => setRetry((value) => value + 1)}
          onClose={() => setOpen(null)}
          onApply={apply}
          onRename={async (item, name) =>
            put(await client.rename(item.id, name, item.revision))
          }
          onDefault={async (item, isDefault) =>
            put(await client.setDefault(item.id, isDefault))
          }
          onRemove={async (item) => {
            await client.remove(item.id, item.revision);
            if (appliedId === item.id) setAppliedId(null);
            update(list.filter((row) => row.id !== item.id));
          }}
        />
      )}
      {open === "save" && (
        <SaveLayoutDialog
          items={list}
          defaultName={applied?.preset.name ?? ""}
          options={options}
          meta={meta}
          returnFocus={saveOpener}
          onClose={() => setOpen(null)}
          onSave={async (name, makeDefault, replace) => {
            const saved = await client.save(
              {
                v: PRINT_PRESET_VERSION,
                name,
                ...presetContentOf(options, meta),
              },
              { makeDefault, replace },
            );
            put(saved);
            setAppliedId(saved.id);
            setFlash(
              replace
                ? `«${name}»을 지금 설정으로 바꿨습니다.`
                : `«${name}»을 저장했습니다.`,
            );
            setOpen(null);
          }}
        />
      )}
    </>
  );
}

/** [저장한 양식] — 공용 고르기 창(D-159)에 1안의 세 줄 목록. */
function LayoutListDialog({
  items,
  loading,
  error,
  returnFocus,
  onRetry,
  onClose,
  onApply,
  onRename,
  onDefault,
  onRemove,
}: {
  items: PrintPreset[];
  loading: boolean;
  error: string;
  returnFocus: RefObject<HTMLButtonElement | null>;
  onRetry: () => void;
  onClose: () => void;
  onApply: (item: PrintPreset) => void;
  onRename: (item: PrintPreset, name: string) => Promise<void>;
  onDefault: (item: PrintPreset, isDefault: boolean) => Promise<void>;
  onRemove: (item: PrintPreset) => Promise<void>;
}) {
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [confirming, setConfirming] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{
    id: string;
    message: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const nameTaken = (name: string, except: string) =>
    items.some(
      (item) => item.preset.name === name.trim() && item.id !== except,
    );
  async function act(id: string, run: () => Promise<void>, fallback: string) {
    setBusy(true);
    setRowError(null);
    try {
      await run();
      setRenaming(null);
      setConfirming(null);
    } catch (cause) {
      setRowError({ id, message: errorText(cause, fallback) });
    } finally {
      setBusy(false);
    }
  }
  return (
    <PickerDialog
      title="저장한 양식"
      doneTone="plain"
      size="fit"
      returnFocus={returnFocus}
      onClose={onClose}
      footer={<span className={o.grow}>{APPLY_RULE}</span>}
    >
      <div className={o.scope}>
        <div className={sc.listHead}>
          <span>
            저장한 양식 <b className={sc.num}>{items.length}</b> · 마지막으로 쓴
            차례
          </span>
          <span className={sc.grow} />
          <span>서식과 머리 정보만 담습니다.</span>
        </div>
        {loading ? (
          <p className={sc.empty} role="status">
            저장한 양식을 불러오는 중입니다…
          </p>
        ) : error ? (
          <div className={sc.empty} role="alert">
            <p>{error}</p>
            <button type="button" onClick={onRetry}>
              다시 시도
            </button>
          </div>
        ) : !items.length ? (
          <p className={sc.empty}>
            저장한 양식이 없습니다. 설정 칸 맨 위 [양식 저장]으로 만듭니다.
          </p>
        ) : (
          <ul className={sc.list}>
            {items.map((item) => {
              const p = item.preset;
              const rename = renaming?.id === item.id ? renaming : null;
              const taken = rename ? nameTaken(rename.name, item.id) : false;
              return (
                <li key={item.id} className={sc.savedRow}>
                  <div>
                    <div className={sc.savedName}>
                      <strong>{p.name}</strong>
                      {p.isDefault && (
                        <span className={o.badge}>새 시험지 기본</span>
                      )}
                      <small className={sc.meta}>
                        마지막 사용 {dayLabel(p.lastUsedAt)}
                      </small>
                    </div>
                    <div className={sc.savedLines}>
                      <span>서식 · {optionsLine(p.options)}</span>
                      <span>머리 정보 · {headLine(p.head)}</span>
                    </div>
                  </div>
                  <div className={sc.savedActions}>
                    <button
                      type="button"
                      className={o.primary}
                      disabled={busy}
                      onClick={() => onApply(item)}
                    >
                      적용
                    </button>
                    <button
                      type="button"
                      className={o.text}
                      disabled={busy}
                      onClick={() => {
                        setConfirming(null);
                        setRowError(null);
                        setRenaming({ id: item.id, name: p.name });
                      }}
                    >
                      이름 바꾸기
                    </button>
                    <button
                      type="button"
                      className={o.text}
                      disabled={busy}
                      onClick={() =>
                        void act(
                          item.id,
                          () => onDefault(item, !p.isDefault),
                          "기본 양식을 바꾸지 못했습니다.",
                        )
                      }
                    >
                      {p.isDefault ? "기본 해제" : "기본으로"}
                    </button>
                    <button
                      type="button"
                      className={`${o.text} ${o.danger}`}
                      disabled={busy}
                      onClick={() => {
                        setRenaming(null);
                        setRowError(null);
                        setConfirming(item.id);
                      }}
                    >
                      삭제
                    </button>
                  </div>
                  {rename && (
                    <div className={sc.renameRow}>
                      <input
                        aria-label="새 이름"
                        value={rename.name}
                        maxLength={PRINT_PRESET_NAME_MAX}
                        disabled={busy}
                        onChange={(event) =>
                          setRenaming({ id: item.id, name: event.target.value })
                        }
                      />
                      <button
                        type="button"
                        className={o.primary}
                        disabled={busy || !rename.name.trim() || taken}
                        onClick={() =>
                          void act(
                            item.id,
                            () => onRename(item, rename.name.trim()),
                            "이름을 바꾸지 못했습니다.",
                          )
                        }
                      >
                        이름 저장
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setRenaming(null)}
                      >
                        취소
                      </button>
                      {taken && (
                        <small className={sc.meta}>같은 이름이 있습니다.</small>
                      )}
                    </div>
                  )}
                  {confirming === item.id && (
                    <div className={sc.confirm} role="alert">
                      <span>
                        «{p.name}»을 지울까요? 이 양식으로 만든 시험지는
                        그대로입니다.
                        {p.isDefault &&
                          " 새 시험지는 처음 값(정통 · 1단)으로 시작합니다."}
                      </span>
                      <button
                        type="button"
                        className={o.danger}
                        disabled={busy}
                        onClick={() =>
                          void act(
                            item.id,
                            () => onRemove(item),
                            "양식을 지우지 못했습니다.",
                          )
                        }
                      >
                        지우기
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirming(null)}
                      >
                        취소
                      </button>
                    </div>
                  )}
                  {rowError?.id === item.id && (
                    <p className={sc.rowError} role="alert">
                      {rowError.message}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PickerDialog>
  );
}

/** [양식 저장] — 이름 · 담는 것 세 줄 · 기본 체크. 같은 이름이면 바꿀지 한 번 묻는다. */
function SaveLayoutDialog({
  items,
  defaultName,
  options,
  meta,
  returnFocus,
  onClose,
  onSave,
}: {
  items: PrintPreset[];
  defaultName: string;
  options: PrintOptions;
  meta: PrintMeta;
  returnFocus: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onSave: (
    name: string,
    makeDefault: boolean,
    replace?: { id: string; expectedRevision: number },
  ) => Promise<void>;
}) {
  const [name, setName] = useState(defaultName.slice(0, PRINT_PRESET_NAME_MAX));
  const [makeDefault, setMakeDefault] = useState(false);
  const [replacing, setReplacing] = useState<{
    id: string;
    revision: number;
    name: string;
    savedAt?: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const trimmed = name.trim();
  const taken = items.find((item) => item.preset.name === trimmed);
  const current = items.find((item) => item.preset.isDefault);
  const content = presetContentOf(options, meta);
  async function submit(replace?: { id: string; expectedRevision: number }) {
    if (!trimmed || busy) return;
    if (!replace && taken) {
      setReplacing({
        id: taken.id,
        revision: taken.revision,
        name: trimmed,
        savedAt: taken.preset.savedAt,
      });
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave(trimmed, makeDefault, replace);
    } catch (cause) {
      if (
        cause instanceof PrintPresetError &&
        cause.nameTaken &&
        cause.existing
      )
        setReplacing({ ...cause.existing, name: trimmed });
      else setError(errorText(cause, "양식을 저장하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={o.saveWidth}>
      <PickerDialog
        title="양식 저장"
        size="fit"
        cancelLabel="취소"
        doneLabel="저장"
        doneDisabled={!trimmed || !!replacing || busy}
        returnFocus={returnFocus}
        onCancel={onClose}
        onClose={() => void submit()}
      >
        <div className={`${o.scope} ${o.dlgPad}`}>
          <label className={o.fieldLabel}>
            양식 이름
            <input
              value={name}
              maxLength={PRINT_PRESET_NAME_MAX}
              placeholder="예: 일일TEST 2단"
              disabled={busy}
              onChange={(event) => {
                setName(event.target.value);
                setReplacing(null);
              }}
            />
            <small className={o.meta}>
              {taken
                ? "같은 이름이 있습니다 — 저장하면 바꿀지 묻습니다."
                : `${PRINT_PRESET_NAME_MAX}자까지 · 저장한 양식 ${items.length}/${PRINT_PRESET_LIMIT}`}
            </small>
          </label>
          {replacing && (
            <div className={sc.confirmWarn} role="alert">
              <span>
                «{replacing.name}»을 지금 설정으로 바꿀까요?{" "}
                {replacing.savedAt
                  ? `지난 저장 ${dayLabel(replacing.savedAt)}의 내용은 남지 않습니다.`
                  : "지난 저장의 내용은 남지 않습니다."}
              </span>
              <button
                type="button"
                className={o.primary}
                disabled={busy}
                onClick={() =>
                  void submit({
                    id: replacing.id,
                    expectedRevision: replacing.revision,
                  })
                }
              >
                바꾸기
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setReplacing(null)}
              >
                취소
              </button>
            </div>
          )}
          {error && (
            <p className={sc.error} role="alert">
              {error}
            </p>
          )}
          <dl className={o.facts}>
            <dt>담는 서식</dt>
            <dd>{optionsLine(content.options)}</dd>
            <dt>담는 머리 정보</dt>
            <dd>{headLine(content.head)}</dd>
            <dt>담지 않음</dt>
            <dd>{NOT_CARRIED} — 시험지마다 다릅니다.</dd>
          </dl>
          <label className={o.checkRow}>
            <input
              type="checkbox"
              checked={makeDefault}
              disabled={busy}
              onChange={(event) => setMakeDefault(event.target.checked)}
            />
            <span>
              새 시험지의 기본 양식으로
              {current && (
                <small className={o.meta}>
                  지금 기본은 «{current.preset.name}» — 고르면 이 양식으로
                  바뀝니다.
                </small>
              )}
            </span>
          </label>
        </div>
      </PickerDialog>
    </div>
  );
}

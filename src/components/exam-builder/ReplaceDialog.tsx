"use client";

import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { PickerDialog } from "@/components/picker-dialog/PickerDialog";
import type { ExamBuilderSource, ExamQuestionInfo } from "./types";
import r from "./ReplaceDialog.module.css";

/**
 * «문항 교체»(W3 · Hi-fi 1 — 원장님 2026-10-16). 왼쪽에 바꿀 문항(위)과 대조할 후보(아래), 오른쪽에 후보 줄(두 줄까지).
 * 후보는 두 층 — «같은 문항류»(같은 `(unitId, familyKey)` 의 다른 문항 · `familyOf`)와 «같은 차시의 다른 문항»
 * (범위 + 난이도 — 난이도는 바꿀 문항의 것에서 시작).
 *
 *   D-111 — 바꾸는 자리의 문항류는 남기고, 시험지의 다른 자리와 같은 문항류는 뺀다(«1문항만»이 켜져 있으면).
 *   교과서의 «지정 복습 변형»은 이 후보에 섞지 않는다(문항 카드에 따로 — `renderQuestion` 이 그린다).
 *   교체는 [이 문항으로 교체] 단추로만 — 줄 · 판을 누르는 곳은 없다(D-30). 자리 · 순서 · ↶ 되돌리기는 제작기가 지킨다.
 *   창은 공용 고르기 창(`PickerDialog`, D-159)을 넓혀 쓴다(밝은 닫기 · 바닥 줄).
 */

type Layer = "family" | "others";
const PAGE_SIZE = 10;
/** 같은 문항류의 형제는 한 번에 — 서버 상한(100). */
const FAMILY_PAGE = 100;

type Result<T> = {
  key: string;
  items: T[];
  total: number;
  page: number;
  error?: string;
};

export default function ReplaceDialog<T>({
  source,
  original,
  slot,
  questions,
  scopeIds,
  sameScope,
  difficulties,
  excludeRecent,
  recentDays,
  renderQuestion,
  renderCandidate,
  returnFocus,
  onChoose,
  onClose,
}: {
  source: ExamBuilderSource<T>;
  original: T;
  /** 시험지의 자리 «07» — 창의 제목 · 안내에 쓴다. */
  slot: string;
  questions: T[];
  /** 둘째 층의 범위 — 바꿀 문항의 범위가 구성표에 있으면 그것 하나, 없으면 선택 범위 전체. */
  scopeIds: string[];
  sameScope: boolean;
  difficulties: readonly string[];
  excludeRecent: boolean;
  recentDays?: number;
  renderQuestion: (item: T) => ReactNode;
  /** 후보 줄의 두 줄 — 본문만(출제 순위 · 출처 줄 없이). 없으면 `renderQuestion`. */
  renderCandidate?: (item: T) => ReactNode;
  returnFocus: RefObject<HTMLButtonElement | null>;
  onChoose: (item: T) => void;
  onClose: () => void;
}) {
  const head = source.info(original);
  const [layer, setLayer] = useState<Layer>("family");
  const [switched, setSwitched] = useState(false);
  const [tier, setTier] = useState(
    difficulties.includes(head.difficulty) ? head.difficulty : "",
  );
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [compareId, setCompareId] = useState<string | null>(null);
  // 열 때의 시험지 — 창이 열린 동안 제외가 흔들리지 않게(추가 창과 같다).
  const [excluded] = useState(() =>
    questions.map((item) => source.info(item).id),
  );
  const [excludedFamilies] = useState(() =>
    excluded.filter((id) => id !== head.id),
  );
  const blockedFamilies = new Set(
    questions.flatMap((item) => {
      const info = source.info(item);
      return info.familyId && info.id !== head.id ? [info.familyId] : [];
    }),
  );
  const [family, setFamily] = useState<Result<T>>();
  const [others, setOthers] = useState<Result<T>>();
  const othersKey = JSON.stringify([scopeIds, tier, query]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const controller = new AbortController();
    void source
      .list(
        {
          scopeIds: [head.scopeId],
          difficulty: "",
          query: "",
          page: 1,
          pageSize: FAMILY_PAGE,
          excludeIds: excluded,
          excludeFamiliesOf: excludedFamilies,
          familyOf: head.id,
          ...(excludeRecent ? { excludeRecent } : {}),
        },
        controller.signal,
      )
      .then((data) => {
        if (!controller.signal.aborted)
          setFamily({ key: "family", page: 1, ...data });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setFamily({
            key: "family",
            page: 1,
            items: [],
            total: 0,
            error:
              error instanceof Error
                ? error.message
                : "문항을 불러오지 못했습니다.",
          });
      });
    return () => controller.abort();
  }, [
    source,
    head.id,
    head.scopeId,
    excluded,
    excludedFamilies,
    excludeRecent,
  ]);
  useEffect(() => {
    if (!scopeIds.length) return;
    const controller = new AbortController();
    void source
      .list(
        {
          scopeIds,
          difficulty: tier,
          query,
          page,
          pageSize: PAGE_SIZE,
          excludeIds: excluded,
          excludeFamiliesOf: excludedFamilies,
          ...(excludeRecent ? { excludeRecent } : {}),
        },
        controller.signal,
      )
      .then((data) => {
        if (controller.signal.aborted) return;
        // «더 보기»는 이어 붙이고, 조건이 바뀌면 처음부터.
        setOthers((current) => ({
          key: othersKey,
          page,
          total: data.total,
          items:
            page > 1 && current?.key === othersKey
              ? [...current.items, ...data.items]
              : data.items,
        }));
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setOthers({
            key: othersKey,
            page,
            items: [],
            total: 0,
            error:
              error instanceof Error
                ? error.message
                : "문항을 불러오지 못했습니다.",
          });
      });
    return () => controller.abort();
    // othersKey 는 scopeIds · tier · query 를 담는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, othersKey, page, excluded, excludedFamilies, excludeRecent]);
  // 혼자인 문항(형제 없음)은 첫 층이 비어 있다 — 손대기 전이면 둘째 층으로 연다.
  const shownLayer: Layer =
    !switched && family && !family.error && family.total === 0
      ? "others"
      : layer;
  const othersReady = others?.key === othersKey;
  const loading = shownLayer === "family" ? !family : !othersReady;
  const current =
    shownLayer === "family" ? family : othersReady ? others : undefined;
  const list = current?.items ?? [];
  const compare =
    list.find((item) => source.info(item).id === compareId) ?? list[0] ?? null;
  const compareInfo = compare ? source.info(compare) : null;
  const sameFamily = (info: ExamQuestionInfo) =>
    !!info.familyId && info.familyId === head.familyId;
  const blocked = (info: ExamQuestionInfo) =>
    !!info.familyId && blockedFamilies.has(info.familyId);
  const meta = (info: ExamQuestionInfo, index?: number) =>
    [
      shownLayer === "family" && index !== undefined
        ? `같은 문항류 ${index + 2}/${(family?.total ?? 0) + 1}`
        : sameFamily(info) && info.id !== head.id
          ? "같은 문항류"
          : "",
      info.difficulty || "난이도 미지정",
      info.format,
      info.origin,
    ]
      .filter(Boolean)
      .join(" · ");
  const scopeName = head.scopeLabel || "선택 범위";
  const othersTitle = sameScope
    ? "같은 차시의 다른 문항"
    : "선택 범위의 다른 문항";
  const familyRule = !!head.familyId;
  const switchLayer = (next: Layer) => {
    setSwitched(true);
    setLayer(next);
    setCompareId(null);
  };
  return (
    <PickerDialog
      title={`문항 교체 · ${slot}번`}
      doneTone="plain"
      size="fit"
      returnFocus={returnFocus}
      onClose={onClose}
      footer={
        <>
          <span className={r.footNote}>
            {familyRule
              ? `${slot}번의 문항류는 남깁니다. 시험지의 다른 자리와 같은 문항류는 후보에서 뺍니다(D-111).`
              : "«같은 문항류는 1문항만»이 꺼져 있어 다른 자리와 같은 문항류도 후보에 둡니다."}
            {excludeRecent
              ? ` 최근 ${recentDays ?? 14}일 출제 문항도 뺐습니다.`
              : ""}
          </span>
          <button type="button" onClick={onClose}>
            취소
          </button>
        </>
      }
    >
      <div className={`${r.root} ${r.split}`}>
        <div className={r.left}>
          <section className={r.pane} aria-label="바꿀 문항">
            <div className={r.paneHead}>
              <strong>바꿀 문항 · {slot}번</strong>
              <small className={r.meta}>{meta(head)}</small>
            </div>
            <div className={r.body}>{renderQuestion(original)}</div>
          </section>
          <section className={r.paneCompare} aria-label="대조할 후보">
            {compare && compareInfo ? (
              <>
                <div className={r.paneHead}>
                  <strong>대조할 후보</strong>
                  <small className={r.meta}>
                    {meta(
                      compareInfo,
                      shownLayer === "family"
                        ? list.indexOf(compare)
                        : undefined,
                    )}
                  </small>
                </div>
                <div className={r.body}>{renderQuestion(compare)}</div>
                <div className={r.paneFoot}>
                  <button
                    type="button"
                    className={r.primary}
                    disabled={blocked(compareInfo)}
                    title={
                      blocked(compareInfo)
                        ? "같은 문항류는 한 시험지에 1문항만 담습니다."
                        : undefined
                    }
                    onClick={() => onChoose(compare)}
                  >
                    {blocked(compareInfo)
                      ? "같은 문항류 있음"
                      : "이 문항으로 교체"}
                  </button>
                </div>
              </>
            ) : (
              <p className={r.empty}>
                {loading
                  ? "후보를 불러오는 중입니다…"
                  : "오른쪽에서 [대조]를 누르면 여기 놓입니다."}
              </p>
            )}
          </section>
        </div>
        <div className={r.right}>
          <div className={r.tools}>
            <div className={r.seg} role="group" aria-label="후보 층">
              <button
                type="button"
                aria-pressed={shownLayer === "family"}
                onClick={() => switchLayer("family")}
              >
                같은 문항류{" "}
                <span className={r.num}>{family ? family.total : "…"}</span>
              </button>
              <button
                type="button"
                aria-pressed={shownLayer === "others"}
                onClick={() => switchLayer("others")}
              >
                {othersTitle}{" "}
                <span className={r.num}>
                  {othersReady ? others!.total : "…"}
                </span>
              </button>
            </div>
            {shownLayer === "others" && (
              <>
                <div className={r.seg} role="group" aria-label="난이도">
                  {["", ...difficulties].map((value) => (
                    <button
                      key={value || "all"}
                      type="button"
                      className={r.small}
                      aria-pressed={tier === value}
                      onClick={() => {
                        setTier(value);
                        setPage(1);
                        setCompareId(null);
                      }}
                    >
                      {value || "전체"}
                    </button>
                  ))}
                </div>
                <input
                  value={search}
                  maxLength={200}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="문제 내용으로 검색"
                  aria-label="문항 검색"
                />
              </>
            )}
            <small className={r.meta}>
              {shownLayer === "family"
                ? familyRule || family?.total
                  ? `${scopeName} · ${slot}번과 같은 문항류의 다른 변형입니다.`
                  : `${scopeName} · ${slot}번은 같은 문항류가 없는 문항입니다.`
                : `${sameScope ? scopeName : "선택 범위"} · ${tier || "전체 난이도"}${familyRule ? " · 다른 자리와 같은 문항류는 뺐습니다." : ""}`}
            </small>
          </div>
          {current?.error ? (
            <p className={r.empty} role="alert">
              {current.error}
            </p>
          ) : loading ? (
            <p className={r.empty} role="status">
              조건에 맞는 문항을 불러오는 중입니다…
            </p>
          ) : !list.length ? (
            <p className={r.empty}>
              {shownLayer === "family"
                ? "같은 문항류의 남은 문항이 없습니다. 다른 문항 층에서 찾아 보세요."
                : "조건에 맞는 남은 문항이 없습니다. 난이도를 바꿔 보세요."}
            </p>
          ) : (
            list.map((item, index) => {
              const info = source.info(item);
              const on = item === compare;
              return (
                <div key={info.id} className={on ? r.candRowOn : r.candRow}>
                  <div>
                    <small className={r.candMeta}>
                      {meta(info, shownLayer === "family" ? index : undefined)}
                    </small>
                    <div className={r.clamp}>
                      {(renderCandidate ?? renderQuestion)(item)}
                    </div>
                  </div>
                  {on ? (
                    <span className={r.badge}>대조 중</span>
                  ) : (
                    <button type="button" onClick={() => setCompareId(info.id)}>
                      대조
                    </button>
                  )}
                </div>
              );
            })
          )}
          {shownLayer === "others" &&
            othersReady &&
            list.length < others!.total && (
              <div className={r.more}>
                <button
                  type="button"
                  onClick={() => setPage((value) => value + 1)}
                >
                  더 보기
                </button>
              </div>
            )}
        </div>
      </div>
    </PickerDialog>
  );
}

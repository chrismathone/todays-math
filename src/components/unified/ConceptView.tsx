"use client";

/**
 * 원장님 «오늘의 개념» 메뉴 — 05 §8.9 시안 1안 «작업실 그대로»(D-124 · D-125).
 *
 * 머리(제목 · 날짜 · 전체 차시 · meta.json 으로 등록) → 요약(이번 주 닿는 차시) → 반별 표 +
 * 오른쪽 차시 판. «전체 차시» 는 한 번 더 누르면 나온다(D-124 ⑴).
 *
 * 🔴 **이 화면은 계산하지 않는다.** 게시 판정(`gate`)·끝까지 본 학생 n/m·안 본 학생 이름은
 *    서버가 낸 것을 그린다(`/api/concept` — `countWatchedToEnd` · `checkPublish`). 화면이 따로
 *    세면 버튼·라우트·표가 갈라진다(브리프 §0-7). 쓰기 단추는 `canEdit`(isAdmin)일 때만 그리고,
 *    라우트가 따로 또 막는다.
 */
import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  conceptBoardResponseSchema,
  conceptUnitLecturesResponseSchema,
  conceptUnitsResponseSchema,
  type ConceptBoard,
  type ConceptBoardRow,
  type ConceptLectureAction,
  type ConceptLectureAdmin,
  type ConceptUnit,
  type ConceptUnitLectures,
  type ConceptUnits,
  type ConceptWatch,
} from "@/contracts/conceptAdmin.contract";

import { OwnerTag } from "@/components/ui/OwnerTag";
import { hasOwners } from "@/lib/class/ownerLabel";

import ConceptUnitPanel, { type PanelNotice } from "./ConceptUnitPanel";
import ConceptUnitTree from "./ConceptUnitTree";
import {
  formatDay,
  formatDayWithWeekday,
  unitStateLabel,
} from "./conceptFormat";
import WorkProgress from "./WorkProgress";
import WorkspacePageHeader from "./WorkspacePageHeader";
import ws from "./Workroom.module.css";
import s from "./ConceptView.module.css";

type Load<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

const LOAD_ERROR = "오늘의 개념을 불러오지 못했습니다. 다시 시도해 주세요.";

const messageOf = (error: unknown) =>
  error instanceof Error && error.message ? error.message : LOAD_ERROR;

/** 서버의 오류 문구(`{ error: { message } }`)를 그대로 올린다 — 화면이 이유를 지어내지 않는다 */
async function requestJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
    ...init,
  });
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    /* 본문 없는 응답 — 아래에서 상태 코드로 판단한다 */
  }
  if (!response.ok) {
    const message = (body as { error?: { message?: unknown } } | null)?.error
      ?.message;
    throw new Error(
      typeof message === "string" && message ? message : LOAD_ERROR,
    );
  }
  return body;
}

const ACTION_DONE: Record<ConceptLectureAction["action"], string> = {
  publish: "게시했습니다.",
  archive: "게시를 내렸습니다.",
  review: "끝까지 봤다고 표시했습니다.",
  video: "영상 주소를 넣었습니다.",
};

/** 처음 고를 반 — 최근 진도 차시에 강의가 있는 첫 반(시안이 연 자리), 없으면 진도가 있는 첫 반 */
function defaultClassId(board: ConceptBoard): string | null {
  const withLectures = board.rows.find(
    (r) =>
      r.progress && board.lectures.some((l) => l.unitId === r.progress!.unitId),
  );
  return (
    (withLectures ?? board.rows.find((r) => r.progress) ?? board.rows[0])
      ?.classId ?? null
  );
}

/** 영상 임베드를 켤까 — 기본은 켠다. 개발용 시안 페이지(가짜 영상 ID)만 끈다 */
export const ConceptVideoEmbedContext = createContext(true);

export default function ConceptView({
  videoEmbed: videoEmbedProp,
}: {
  /** 없으면 `ConceptVideoEmbedContext`(기본 켬)를 따른다 */
  videoEmbed?: boolean;
}) {
  const embedFromContext = useContext(ConceptVideoEmbedContext);
  const videoEmbed = videoEmbedProp ?? embedFromContext;
  const [board, setBoard] = useState<Load<ConceptBoard>>({ status: "loading" });
  const [view, setView] = useState<"board" | "tree">("board");
  const [classId, setClassId] = useState<string | null>(null);
  const [units, setUnits] = useState<Load<ConceptUnits> | null>(null);
  const [treeUnitId, setTreeUnitId] = useState<string | null>(null);
  const [treeUnit, setTreeUnit] = useState<Load<ConceptUnitLectures> | null>(
    null,
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<PanelNotice | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const writing = useRef(false);
  const writeOutcome = useRef<"saved" | "unknown">("saved");
  const boardVersion = useRef(0);
  const treeVersion = useRef(0);

  const loadBoard = useCallback(async () => {
    const version = ++boardVersion.current;
    try {
      const body = conceptBoardResponseSchema.parse(
        await requestJson("/api/concept"),
      );
      if (version === boardVersion.current)
        setBoard({ status: "ready", data: body.data });
    } catch (error) {
      if (version === boardVersion.current)
        setBoard((previous) =>
          previous.status === "ready"
            ? previous
            : { status: "error", message: messageOf(error) },
        );
      throw error;
    }
  }, []);

  const loadUnits = useCallback(async () => {
    try {
      const body = conceptUnitsResponseSchema.parse(
        await requestJson("/api/concept/units"),
      );
      setUnits({ status: "ready", data: body.data });
      return true;
    } catch (error) {
      setUnits({ status: "error", message: messageOf(error) });
      return false;
    }
  }, []);

  const loadTreeUnit = useCallback(async (unitId: string) => {
    const version = ++treeVersion.current;
    try {
      const body = conceptUnitLecturesResponseSchema.parse(
        await requestJson(
          `/api/concept/lectures?unitId=${encodeURIComponent(unitId)}`,
        ),
      );
      if (version === treeVersion.current)
        setTreeUnit({ status: "ready", data: body.data });
      return true;
    } catch (error) {
      if (version === treeVersion.current)
        setTreeUnit({ status: "error", message: messageOf(error) });
      return false;
    }
  }, []);

  useEffect(() => {
    // 첫 화면을 불러온다 — 상태는 응답이 온 뒤에만 바뀐다.
    void loadBoard().catch(() => {});
  }, [loadBoard]);

  /** 쓰기 뒤 — 지금 보는 것을 다시 불러온다 */
  const refresh = useCallback(async () => {
    const reads: Promise<unknown>[] = [loadBoard()];
    if (view === "tree") reads.push(loadUnits());
    if (view === "tree" && treeUnitId) reads.push(loadTreeUnit(treeUnitId));
    const results = await Promise.allSettled(reads);
    const failed = results.some(
      (result) => result.status === "rejected" || result.value === false,
    );
    setRefreshError(
      failed
        ? writeOutcome.current === "unknown"
          ? "저장 결과를 확인하지 못했습니다. 연결을 확인한 뒤 최신 상태를 다시 조회해 주세요."
          : "변경은 저장했습니다. 최신 조회에 실패해 화면이 이전 상태일 수 있습니다."
        : null,
    );
  }, [loadBoard, loadTreeUnit, loadUnits, treeUnitId, view]);

  if (board.status !== "ready") {
    return (
      <div className={s.concept}>
        <WorkspacePageHeader
          title="오늘의 개념"
          description="이번 주 진도에 닿는 차시와 그 강의"
        />
        {board.status === "loading" ? (
          <WorkProgress label="오늘의 개념을 불러오는 중입니다…" />
        ) : (
          <div className={s.errorPanel}>
            <p role="alert">{board.message}</p>
            <button
              type="button"
              className={ws.outlineButton}
              onClick={() => {
                setBoard({ status: "loading" });
                void loadBoard().catch(() => {});
              }}
            >
              다시 불러오기
            </button>
          </div>
        )}
      </div>
    );
  }

  const data = board.data;
  const selectedId = classId ?? defaultClassId(data);
  const selectedRow = data.rows.find((r) => r.classId === selectedId) ?? null;
  const unitById = new Map(data.units.map((u) => [u.id, u]));
  const lectureById = new Map(data.lectures.map((l) => [l.id, l]));
  // «담당» 열은 서버가 담당을 실어 보낼 때만(관리자 — D-132). 반 바로 뒤(Hi-fi 3).
  const withOwner = hasOwners(data.rows);

  // 오른쪽 판에 설 차시 — 표에서는 고른 반의 최근 진도 차시, 전체 차시에서는 고른 차시
  let panelUnit: ConceptUnit | null = null;
  let panelLectures: ConceptLectureAdmin[] = [];
  let panelContext = "";
  let panelWatch: ReadonlyMap<string, ConceptWatch> = new Map();
  let panelLoading = false;
  if (view === "board") {
    if (selectedRow?.progress) {
      panelUnit = unitById.get(selectedRow.progress.unitId) ?? null;
      panelLectures = data.lectures.filter((l) => l.unitId === panelUnit?.id);
      panelContext = `${selectedRow.className} · ${formatDay(selectedRow.progress.recordedAt)} 진도`;
      panelWatch = new Map(selectedRow.watch.map((w) => [w.lectureId, w]));
    } else if (selectedRow) {
      panelContext = `${selectedRow.className} · 진도 기록 없음`;
    }
  } else if (treeUnitId) {
    panelContext = "전체 차시";
    if (treeUnit?.status === "ready" && treeUnit.data.unit.id === treeUnitId) {
      panelUnit = treeUnit.data.unit;
      panelLectures = treeUnit.data.lectures;
    } else {
      panelLoading = treeUnit?.status !== "error";
    }
  }

  function selectClass(id: string) {
    if (writing.current) return;
    setClassId(id);
    setRegisterOpen(false);
    setNotice(null);
  }

  function openTree() {
    if (writing.current) return;
    setView("tree");
    setRegisterOpen(false);
    setNotice(null);
    if (units?.status !== "ready") {
      setUnits({ status: "loading" });
      void loadUnits();
    }
  }

  function selectTreeUnit(unitId: string) {
    if (writing.current) return;
    setTreeUnitId(unitId);
    setTreeUnit({ status: "loading" });
    setRegisterOpen(false);
    setNotice(null);
    void loadTreeUnit(unitId);
  }

  async function write(run: () => Promise<unknown>, done: string) {
    if (writing.current) return;
    writing.current = true;
    setBusy(true);
    setNotice(null);
    try {
      await run();
      writeOutcome.current = "saved";
      setRegisterOpen(false);
      setNotice({ kind: "status", text: done });
      await refresh();
    } catch (error) {
      if (
        error instanceof TypeError ||
        error instanceof SyntaxError ||
        (error instanceof DOMException &&
          (error.name === "AbortError" || error.name === "TimeoutError"))
      ) {
        writeOutcome.current = "unknown";
        setNotice({ kind: "error", text: "저장 결과 확인이 필요합니다." });
        setRefreshError(
          "저장 결과를 확인하지 못했습니다. 최신 상태를 조회해 주세요.",
        );
      } else setNotice({ kind: "error", text: messageOf(error) });
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }

  const act = (lecture: ConceptLectureAdmin, action: ConceptLectureAction) =>
    write(
      () =>
        requestJson(`/api/concept/lectures/${encodeURIComponent(lecture.id)}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(action),
        }),
      action.action === "publish" && lecture.status === "archived"
        ? "다시 게시했습니다."
        : ACTION_DONE[action.action],
    );

  const register = (raw: string) =>
    write(
      () =>
        requestJson("/api/concept/lectures", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ raw, unitId: panelUnit?.id ?? null }),
        }),
      "초안으로 등록했습니다.",
    );

  const showWatchNote =
    data.watchRecords === 0 && data.rows.some((r) => r.watch.length > 0);

  return (
    <div className={s.concept}>
      <WorkspacePageHeader
        title="오늘의 개념"
        description={
          view === "board"
            ? `${formatDayWithWeekday(data.today)} · 이번 주 진도에 닿는 차시와 그 강의`
            : "학년 › 단원 › 차시 전체와 차시마다 강의 상태"
        }
      >
        {view === "board" ? (
          <button
            type="button"
            className={s.quietButton}
            onClick={openTree}
            disabled={busy}
          >
            전체 차시 {data.unitTotal}
          </button>
        ) : (
          <button
            type="button"
            className={s.quietButton}
            disabled={busy}
            onClick={() => {
              if (writing.current) return;
              setView("board");
              setRegisterOpen(false);
              setNotice(null);
            }}
          >
            이번 주 진도
          </button>
        )}
        {data.canEdit ? (
          <button
            type="button"
            className={ws.primaryButton}
            disabled={busy}
            onClick={() => {
              if (writing.current) return;
              setRegisterOpen(true);
              setNotice(null);
            }}
          >
            meta.json 으로 등록
          </button>
        ) : null}
      </WorkspacePageHeader>

      {refreshError ? (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-control p-4 text-sm"
        >
          <span>{refreshError}</span>
          <button
            type="button"
            className={ws.outlineButton}
            disabled={busy}
            onClick={() => {
              void refresh();
            }}
          >
            최신 상태 다시 조회
          </button>
        </div>
      ) : null}

      {view === "board" ? (
        <section className={s.summary} aria-label="이번 주 요약">
          <div className={s.summaryLead}>
            <span>이번 주 닿는 차시</span>
            <b>{data.summary.units}</b>
            <span>{`개 · 반 ${data.summary.classes}개`}</span>
          </div>
          <ul className={s.summaryParts}>
            <li className={s.pub}>
              <b>{data.summary.published}</b>
              <span>게시</span>
            </li>
            <li className={s.draft}>
              <b>{data.summary.draftOnly}</b>
              <span>초안만</span>
            </li>
            <li className={s.none}>
              <b>{data.summary.none}</b>
              <span>영상 없음</span>
            </li>
          </ul>
        </section>
      ) : null}

      <div className={view === "tree" ? `${s.split} ${s.splitTree}` : s.split}>
        {view === "board" ? (
          <div className={s.tableCard}>
            <div className={s.tableScroll}>
              <table className={s.table}>
                <caption className={s.visuallyHidden}>
                  반별 이번 주 차시
                </caption>
                <thead>
                  <tr>
                    <th scope="col">반</th>
                    {withOwner ? <th scope="col">담당</th> : null}
                    <th scope="col">최근 진도</th>
                    <th scope="col">강의</th>
                    <th scope="col">다음 차시</th>
                    <th scope="col">강의</th>
                    <th scope="col">끝까지 본 학생</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.length === 0 ? (
                    <tr>
                      <td colSpan={withOwner ? 7 : 6} className={s.emptyCell}>
                        반이 없습니다. «수업 · 학생 관리»에서 반을 만들면 진도
                        차시가 여기에 나옵니다.
                      </td>
                    </tr>
                  ) : null}
                  {data.rows.map((row) => (
                    <BoardRow
                      key={row.classId}
                      row={row}
                      withOwner={withOwner}
                      selected={row.classId === selectedId}
                      current={
                        row.progress
                          ? unitById.get(row.progress.unitId)
                          : undefined
                      }
                      next={
                        row.nextUnitId
                          ? unitById.get(row.nextUnitId)
                          : undefined
                      }
                      titleOf={(id) => lectureById.get(id)?.title ?? ""}
                      expanded={expanded}
                      onSelect={() => selectClass(row.classId)}
                      onToggle={(key) =>
                        setExpanded((open) => (open === key ? null : key))
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {showWatchNote ? (
              <p className={s.tableNote}>
                아직 학생 시청 기록이 없습니다. 학생 로그인이 열리면 끝까지 본
                학생이 여기에 쌓입니다.
              </p>
            ) : null}
          </div>
        ) : units?.status === "ready" ? (
          <ConceptUnitTree
            units={units.data.units}
            selectedUnitId={treeUnitId}
            onSelect={selectTreeUnit}
          />
        ) : units?.status === "error" ? (
          <div className={s.errorPanel}>
            <p role="alert">{units.message}</p>
            <button
              type="button"
              className={ws.outlineButton}
              onClick={() => {
                setUnits({ status: "loading" });
                void loadUnits();
              }}
            >
              전체 차시 다시 불러오기
            </button>
          </div>
        ) : (
          <WorkProgress label="전체 차시를 불러오는 중입니다…" />
        )}

        <ConceptUnitPanel
          key={`${view}:${panelUnit?.id ?? selectedId ?? "none"}`}
          context={panelContext}
          unit={panelUnit}
          lectures={panelLectures}
          watch={panelWatch}
          loading={panelLoading}
          loadError={
            view === "tree" && treeUnit?.status === "error"
              ? treeUnit.message
              : null
          }
          onRetry={() => {
            if (treeUnitId) {
              setTreeUnit({ status: "loading" });
              void loadTreeUnit(treeUnitId);
            }
          }}
          emptyHint={
            view === "tree" && !treeUnitId
              ? "왼쪽에서 차시를 고르면 그 차시의 강의가 여기에 나옵니다."
              : null
          }
          canEdit={data.canEdit}
          videoEmbed={videoEmbed}
          registerOpen={registerOpen}
          busy={busy}
          notice={notice}
          onOpenRegister={() => {
            setRegisterOpen(true);
            setNotice(null);
          }}
          onCloseRegister={() => {
            setRegisterOpen(false);
            setNotice(null);
          }}
          onRegister={register}
          onAction={act}
        />
      </div>
    </div>
  );
}

function BoardRow({
  row,
  withOwner,
  selected,
  current,
  next,
  titleOf,
  expanded,
  onSelect,
  onToggle,
}: {
  row: ConceptBoardRow;
  /** «담당» 열이 섰나 — 서버가 담당을 실어 보낼 때만(관리자, D-132) */
  withOwner: boolean;
  selected: boolean;
  current: ConceptUnit | undefined;
  next: ConceptUnit | undefined;
  titleOf: (lectureId: string) => string;
  expanded: string | null;
  onSelect: () => void;
  onToggle: (key: string) => void;
}) {
  const open = row.watch.find(
    (w) => expanded === `${row.classId}:${w.lectureId}`,
  );
  const detailId = (lectureId: string) =>
    `concept-watch-${row.classId}-${lectureId}`;
  return (
    <Fragment>
      <tr className={selected ? s.on : undefined}>
        <td>
          <button
            type="button"
            className={s.classButton}
            aria-pressed={selected}
            onClick={onSelect}
          >
            <strong>{row.className}</strong>
            <span className={s.sub}>{row.enrolled}명</span>
          </button>
        </td>
        {withOwner ? (
          <td className={s.ownerCell}>
            {row.owner ? <OwnerTag owner={row.owner} tone="workroom" /> : null}
          </td>
        ) : null}
        <td>
          {row.progress && current ? (
            <>
              <span className={s.sub}>
                {formatDay(row.progress.recordedAt)}
              </span>
              <span className={s.unit}>{current.section}</span>
            </>
          ) : (
            <>
              <span className={s.dash}>—</span>
              <span className={s.sub}>진도 기록 없음</span>
            </>
          )}
        </td>
        <td>
          {current ? (
            <StatePill unit={current} />
          ) : (
            <span className={s.dash}>—</span>
          )}
        </td>
        <td>
          {next ? (
            <span className={s.unit}>{next.section}</span>
          ) : (
            <span className={s.dash}>—</span>
          )}
        </td>
        <td>
          {next ? <StatePill unit={next} /> : <span className={s.dash}>—</span>}
        </td>
        <td>
          {row.watch.length === 0 ? (
            <span className={s.dash}>—</span>
          ) : (
            <div className={s.watchStack}>
              {row.watch.map((w) => {
                const key = `${row.classId}:${w.lectureId}`;
                if (w.total === 0)
                  return (
                    <span key={key} className={s.sub}>
                      학생 없음
                    </span>
                  );
                return (
                  <button
                    key={key}
                    type="button"
                    className={s.watchButton}
                    aria-expanded={expanded === key}
                    aria-controls={detailId(w.lectureId)}
                    aria-label={`«${titleOf(w.lectureId)}» 끝까지 본 학생 ${w.watched}/${w.total}명`}
                    onClick={() => onToggle(key)}
                  >
                    <span className={s.cells} aria-hidden="true">
                      {Array.from({ length: w.total }, (_, i) => (
                        <i
                          key={i}
                          className={i < w.watched ? s.cellOn : undefined}
                        />
                      ))}
                    </span>
                    <span className={s.seenText}>
                      {w.watched}/{w.total}명
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </td>
      </tr>
      {open ? (
        <tr className={s.detailRow}>
          <td colSpan={6} id={detailId(open.lectureId)}>
            <p className={s.detailTitle}>
              «{titleOf(open.lectureId)}» 아직 끝까지 안 본 학생{" "}
              {open.pending.length}명
            </p>
            {open.pending.length > 0 ? (
              <ul
                className={s.names}
                aria-label={`«${titleOf(open.lectureId)}» 아직 끝까지 안 본 학생`}
              >
                {open.pending.map((p) => (
                  <li key={p.id}>{p.name}</li>
                ))}
              </ul>
            ) : (
              <p className={s.sub}>모두 끝까지 봤습니다.</p>
            )}
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

function StatePill({ unit }: { unit: ConceptUnit }) {
  const state = unitStateLabel(unit.lectures);
  return <span className={`${s.pill} ${s[state.key]}`}>{state.label}</span>;
}

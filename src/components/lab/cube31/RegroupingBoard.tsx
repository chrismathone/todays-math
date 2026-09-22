"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import type { CSSProperties, DragEvent, PointerEvent } from "react";
import {
  BLOCK_NAMES,
  PLACE_NAMES,
  VALUES,
  canRemove,
  canRestore,
  canSplit,
  checkNotation,
  createManipulative,
  isManipulationComplete,
  manipulate,
  manipulationHint,
  notationRequirements,
  suggestsSplit,
  toBlocks,
} from "@/lib/lab/cube31/manipulative";
import type {
  ManipulativeAction,
  ManipulativeState,
  Place,
  RegroupingProblem,
} from "@/lib/lab/cube31/manipulative";
import styles from "./RegroupingBoard.module.css";
import { createBlockMotion } from "./blockMotion";

export type { RegroupingProblem } from "@/lib/lab/cube31/manipulative";

type Session = {
  board: ManipulativeState;
  history: ManipulativeState[];
  message: string;
  digits: string[];
  marks: string[];
  checked: boolean;
};
type BoardEvent =
  | { type: "action"; action: ManipulativeAction }
  | { type: "undo" }
  | { type: "reset" }
  | { type: "feedback"; message: string; checked?: boolean }
  | { type: "entry"; row: "digits" | "marks"; place: Place; value: string };

function newSession(problem: RegroupingProblem): Session {
  return {
    board: createManipulative(problem),
    history: [],
    message: "",
    digits: ["", "", "", ""],
    marks: ["", "", "", ""],
    checked: false,
  };
}

function updateSession(
  problem: RegroupingProblem,
  session: Session,
  event: BoardEvent,
): Session {
  if (event.type === "reset") return newSession(problem);
  if (event.type === "feedback")
    return {
      ...session,
      message: event.message,
      checked: event.checked ?? false,
    };
  if (event.type === "entry") {
    const entries = [...session[event.row]];
    entries[event.place] = event.value;
    return { ...session, [event.row]: entries, checked: false };
  }
  if (event.type === "undo") {
    const previous = session.history.at(-1);
    return previous
      ? {
          ...session,
          board: previous,
          history: session.history.slice(0, -1),
          message: "마지막 블록 움직임을 되돌렸어요.",
          checked: false,
        }
      : session;
  }
  const result = manipulate(problem, session.board, event.action);
  return {
    ...session,
    board: result.state,
    message: result.message,
    checked: false,
    history: result.changed
      ? [...session.history, session.board]
      : session.history,
  };
}

/** A 10×10 plate, a rod of 10 cells, and a unit share the same unit scale. */
function Block({ place }: { place: Place }) {
  if (place === 3)
    return (
      <svg className={styles.thousand} viewBox="0 0 70 72" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => (
          <rect
            key={i}
            x={2 + i * 1.5}
            y={20 - i * 1.6}
            width="48"
            height="48"
            rx="1"
            fill="currentColor"
            stroke="var(--block-line)"
          />
        ))}
        <path
          d="M19 10H64M19 15H64M19 20H64M19 25H64M19 30H64M19 35H64M19 40H64M19 45H64M24 6V53M29 6V53M34 6V53M39 6V53M44 6V53M49 6V53M54 6V53M59 6V53"
          stroke="var(--block-line)"
          strokeWidth=".5"
        />
      </svg>
    );
  if (place === 2)
    return (
      <svg className={styles.hundred} viewBox="0 0 52 52" aria-hidden="true">
        <rect
          x="1"
          y="1"
          width="50"
          height="50"
          rx="1"
          fill="currentColor"
          stroke="var(--block-line)"
        />
        {Array.from({ length: 9 }, (_, i) => (
          <path
            key={i}
            d={`M${6 + 5 * i} 1V51M1 ${6 + 5 * i}H51`}
            stroke="var(--block-line)"
            strokeWidth=".6"
          />
        ))}
      </svg>
    );
  if (place === 1)
    return (
      <svg className={styles.ten} viewBox="0 0 7 52" aria-hidden="true">
        <rect
          x="1"
          y="1"
          width="5"
          height="50"
          rx=".7"
          fill="currentColor"
          stroke="var(--block-line)"
        />
        {Array.from({ length: 9 }, (_, i) => (
          <path
            key={i}
            d={`M1 ${6 + 5 * i}H6`}
            stroke="var(--block-line)"
            strokeWidth=".6"
          />
        ))}
      </svg>
    );
  return (
    <svg className={styles.one} viewBox="0 0 8 9" aria-hidden="true">
      <path
        d="M1 2L3 1L7 2V7L5 8L1 7Z"
        fill="currentColor"
        stroke="var(--block-line)"
        strokeWidth=".8"
      />
      <path
        d="M1 2L5 3L7 2M5 3V8"
        fill="none"
        stroke="var(--block-line)"
        strokeWidth=".6"
      />
    </svg>
  );
}

type MovingBlock = {
  place: Place;
  /** 준비판(덧셈) → 작업판 · 작업판 → 빼기 상자 · 빼기 상자 → 작업판(다시 넣기) */
  source: "tray" | "workspace" | "removed";
  element?: HTMLElement;
};
const DESTINATION = {
  tray: "workspace",
  workspace: "removed",
  removed: "workspace",
} as const;
const ACTION = {
  tray: "move",
  workspace: "remove",
  removed: "restore",
} as const;
const VERB = { tray: "옮기기", workspace: "빼기", removed: "넣기" } as const;
type TouchDrag = { block: MovingBlock; x: number; y: number; moved: boolean };

/** Mount with an activity key to start a fresh problem and completion lifecycle. */
export default function RegroupingBoard({
  problem,
  onComplete,
  onAttempt,
  disabled = false,
}: {
  problem: RegroupingProblem;
  onComplete: () => void;
  onAttempt?: () => void;
  disabled?: boolean;
}) {
  const [session, dispatch] = useReducer(
    (state: Session, event: BoardEvent) => updateSession(problem, state, event),
    problem,
    newSession,
  );
  const [dragging, setDragging] = useState<MovingBlock | null>(null);
  const completed = useRef(false);
  const dragRef = useRef<MovingBlock | null>(null);
  const touchRef = useRef<TouchDrag | null>(null);
  const suppressClick = useRef(false);
  const rootRef = useRef<HTMLElement>(null);
  const currentBoard = useRef(session.board);
  const [motion] = useState(createBlockMotion);
  const id = useId();
  const { board } = session;
  const required = notationRequirements(problem);
  const ready = isManipulationComplete(problem, board);
  const addition = problem.operation === "add";
  const a = toBlocks(problem.a);
  const b = toBlocks(problem.b);
  const hasMarks = required.marks.some((n) => n !== null);

  useEffect(() => motion.watchPreference(), [motion]);
  useLayoutEffect(() => {
    currentBoard.current = board;
    if (rootRef.current) motion.play(rootRef.current);
  }, [board, motion]);

  function clearMotion() {
    motion.clear();
    dragRef.current = null;
    touchRef.current = null;
    suppressClick.current = false;
    setDragging(null);
  }

  function act(action: ManipulativeAction, source?: HTMLElement) {
    if (disabled) return;
    const before = currentBoard.current;
    const result = manipulate(problem, before, action);
    if (result.changed && rootRef.current) {
      motion.capture(rootRef.current, action, before, result.state, source);
      currentBoard.current = result.state;
    }
    dispatch({ type: "action", action });
  }

  function finishDrop(
    block: MovingBlock,
    destination: string | undefined,
    place: Place,
  ) {
    if (disabled) return;
    if (destination !== DESTINATION[block.source]) {
      dispatch({
        type: "feedback",
        message: addition
          ? "준비판에서 작업판의 같은 자리로 옮겨 주세요."
          : block.source === "removed"
            ? "뺀 블록은 같은 자리의 작업판으로 옮겨 다시 넣어요."
            : "작업판에서 같은 자리의 빼기 상자로 옮겨 주세요.",
      });
      return;
    }
    act(
      { type: ACTION[block.source], place: block.place, toPlace: place },
      block.element,
    );
  }

  function nativeDrop(event: DragEvent<HTMLElement>, place: Place) {
    event.preventDefault();
    if (dragRef.current)
      finishDrop(dragRef.current, event.currentTarget.dataset.drop, place);
    dragRef.current = null;
    setDragging(null);
  }

  function pointerStart(
    event: PointerEvent<HTMLButtonElement>,
    block: MovingBlock,
  ) {
    suppressClick.current = false;
    if (disabled || event.pointerType === "mouse") return;
    touchRef.current = {
      block: { ...block, element: event.currentTarget },
      x: event.clientX,
      y: event.clientY,
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const touch = touchRef.current;
    if (
      !touch ||
      Math.hypot(event.clientX - touch.x, event.clientY - touch.y) < 8
    )
      return;
    touch.moved = true;
    setDragging(touch.block);
  }

  function pointerEnd(event: PointerEvent<HTMLButtonElement>) {
    const touch = touchRef.current;
    touchRef.current = null;
    setDragging(null);
    if (!touch?.moved) return;
    suppressClick.current = true;
    const zone = document
      .elementFromPoint?.(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-drop]");
    const place = Number(zone?.dataset.place);
    if (
      zone?.closest("[data-regrouping-board]")?.id === id &&
      [0, 1, 2, 3].includes(place)
    )
      finishDrop(touch.block, zone.dataset.drop, place as Place);
  }

  function renderBlocks(
    place: Place,
    count: number,
    source: MovingBlock["source"],
    interactive: boolean,
  ) {
    if (count === 0) return <span className={styles.empty}>0개</span>;
    return Array.from({ length: count }, (_, index) =>
      interactive ? (
        <button
          key={index}
          type="button"
          className={styles.blockButton}
          data-block-index={index}
          aria-label={`${VERB[source]}: ${PLACE_NAMES[place]} ${BLOCK_NAMES[place]} ${index + 1}번`}
          disabled={
            disabled ||
            (source === "workspace" && !canRemove(problem, board, place)) ||
            (source === "removed" && !canRestore(problem, board, place))
          }
          draggable={!disabled}
          onClick={(event) => {
            if (suppressClick.current && event.detail !== 0) {
              suppressClick.current = false;
              return;
            }
            act({ type: ACTION[source], place }, event.currentTarget);
          }}
          onDragStart={(event) => {
            touchRef.current = null;
            const block = { place, source, element: event.currentTarget };
            dragRef.current = block;
            setDragging(block);
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", `${source}:${place}`);
          }}
          onDragEnd={() => {
            dragRef.current = null;
            setDragging(null);
          }}
          onPointerDown={(event) => pointerStart(event, { place, source })}
          onPointerMove={pointerMove}
          onPointerUp={pointerEnd}
          onPointerCancel={() => {
            touchRef.current = null;
            setDragging(null);
          }}
        >
          <Block place={place} />
        </button>
      ) : (
        <span
          className={styles.staticBlock}
          key={index}
          data-block-index={index}
        >
          <Block place={place} />
        </span>
      ),
    );
  }

  return (
    <section
      ref={rootRef}
      className={styles.board}
      aria-label="수 모형으로 덧셈과 뺄셈"
      id={id}
      data-regrouping-board=""
    >
      <div className={styles.topline}>
        <div>
          <span className={styles.eyebrow}>직접 움직이는 수 모형</span>
          <h3>
            {problem.a} <span>{addition ? "+" : "−"}</span> {problem.b}
          </h3>
        </div>
        <div className={styles.tools}>
          <button
            type="button"
            disabled={disabled || session.history.length === 0}
            onClick={() => {
              clearMotion();
              dispatch({ type: "undo" });
            }}
          >
            한 번 되돌리기
          </button>
          <button
            type="button"
            disabled={
              disabled ||
              (board.moves === 0 &&
                !session.digits.some(Boolean) &&
                !session.marks.some(Boolean))
            }
            onClick={() => {
              clearMotion();
              dispatch({ type: "reset" });
            }}
          >
            처음부터
          </button>
        </div>
      </div>

      <p className={styles.instruction} id={`${id}-instructions`}>
        <span className={styles.step}>1</span>
        {manipulationHint(problem, board)}
      </p>
      <div
        className={styles.columns}
        data-place-count={required.places.length}
        style={{ "--places": required.places.length } as CSSProperties}
      >
        {required.places.map((place) => (
          <section
            className={styles.column}
            data-place={place}
            key={place}
            aria-label={`${PLACE_NAMES[place]} 수 모형`}
          >
            <header className={styles.columnHead}>
              <strong>{PLACE_NAMES[place]}</strong>
              <span>{VALUES[place]}씩 세어요</span>
            </header>
            <div
              className={`${styles.workspace} ${dragging?.place === place && dragging.source !== "workspace" ? styles.dropReady : ""}`}
              data-drop="workspace"
              data-place={place}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => nativeDrop(event, place)}
              aria-label={`${PLACE_NAMES[place]} 작업판`}
            >
              <div className={styles.zoneLabel}>
                <span>작업판</span>
                <strong
                  aria-label={`${PLACE_NAMES[place]} 작업판 ${board.workspace[place]}개`}
                >
                  {board.workspace[place]}
                  <small>개</small>
                </strong>
              </div>
              <div
                className={styles.blocks}
                data-block-zone="workspace"
                data-place={place}
              >
                {renderBlocks(
                  place,
                  board.workspace[place],
                  "workspace",
                  !addition,
                )}
              </div>
            </div>
            <div className={styles.trade}>
              {addition && place < 3 ? (
                <button
                  type="button"
                  disabled={disabled || board.workspace[place] < 10}
                  data-suggested=""
                  onClick={() => act({ type: "bundle", place })}
                  aria-label={`${PLACE_NAMES[place]} 10개 묶기`}
                >
                  10개 → {VALUES[place + 1]} 블록 1개
                  <span>왼쪽 자리로 받아올림</span>
                </button>
              ) : null}
              {!addition && place > 0 ? (
                <button
                  type="button"
                  disabled={disabled || !canSplit(problem, board, place)}
                  // 풀기는 언제든 되지만, 빛은 받아내림이 필요한 자리에만
                  data-suggested={
                    suggestsSplit(problem, board, place) ? "" : undefined
                  }
                  onClick={() => act({ type: "split", place })}
                  aria-label={`${PLACE_NAMES[place]} 1개 풀기`}
                >
                  1개 → {VALUES[place - 1]} 블록 10개
                  <span>오른쪽 자리로 받아내림</span>
                </button>
              ) : null}
            </div>
            {addition ? (
              <div className={styles.tray}>
                <div className={styles.zoneLabel}>
                  <span>더할 {problem.b}의 블록</span>
                  <strong>
                    {board.tray[place]}
                    <small>개</small>
                  </strong>
                </div>
                <div
                  className={styles.trayBlocks}
                  data-block-zone="tray"
                  data-place={place}
                >
                  {renderBlocks(place, board.tray[place], "tray", true)}
                </div>
                <button
                  type="button"
                  className={styles.moveButton}
                  disabled={disabled || board.tray[place] === 0}
                  onClick={() => act({ type: "move", place })}
                  aria-label={`${PLACE_NAMES[place]} 1개 옮기기`}
                >
                  ↑ 1개 옮기기
                </button>
              </div>
            ) : (
              <div
                className={`${styles.tray} ${dragging?.place === place && dragging.source === "workspace" ? styles.dropReady : ""}`}
                data-drop="removed"
                data-place={place}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => nativeDrop(event, place)}
                aria-label={`${PLACE_NAMES[place]} 빼기 상자`}
              >
                {/* 빼야 할 개수를 미리 보여 주지 않는다 — 뺀 만큼만 센다(원장님 2026-09-22) */}
                <div className={styles.zoneLabel}>
                  <span>뺀 {BLOCK_NAMES[place]}</span>
                  <strong
                    aria-label={`${PLACE_NAMES[place]} 뺀 블록 ${board.removed[place]}개`}
                  >
                    {board.removed[place]}
                    <small>개</small>
                  </strong>
                </div>
                <div
                  className={styles.removedBlocks}
                  data-block-zone="removed"
                  data-place={place}
                >
                  {renderBlocks(place, board.removed[place], "removed", true)}
                </div>
                <div className={styles.removeActions}>
                  <button
                    type="button"
                    className={styles.moveButton}
                    disabled={disabled || !canRemove(problem, board, place)}
                    onClick={() => act({ type: "remove", place })}
                    aria-label={`${PLACE_NAMES[place]} 1개 빼기`}
                  >
                    ↓ 1개 빼기
                  </button>
                  <button
                    type="button"
                    className={styles.moveButton}
                    disabled={disabled || !canRestore(problem, board, place)}
                    onClick={() => act({ type: "restore", place })}
                    aria-label={`${PLACE_NAMES[place]} 1개 넣기`}
                  >
                    ↑ 1개 넣기
                  </button>
                </div>
              </div>
            )}
          </section>
        ))}
      </div>
      {problem.b === 0 ? (
        <button
          type="button"
          className={styles.zeroButton}
          disabled={disabled || board.zeroConfirmed}
          onClick={() => act({ type: "confirm-zero" })}
        >
          옮기거나 뺄 블록이 0개임을 확인
        </button>
      ) : null}
      <p className={styles.accessHint}>
        블록을 누르거나 끌어 보세요. 키보드에서는 Tab으로 고르고 Enter 또는
        Space로 옮겨요.
      </p>
      <div
        className={`${styles.feedback} ${session.checked ? styles.success : ""}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {session.message ||
          "묶거나 풀기 전과 후를 비교하며 수의 크기가 같은지 살펴봐요."}
      </div>

      <form
        className={styles.notation}
        onSubmit={(event) => {
          event.preventDefault();
          if (disabled) return;
          const result = checkNotation(problem, board, session);
          if (!result.correct) onAttempt?.();
          dispatch({
            type: "feedback",
            message: result.message,
            checked: result.correct,
          });
          if (result.correct && !completed.current) {
            completed.current = true;
            onComplete();
          }
        }}
      >
        <div className={styles.notationIntro}>
          <h4>
            <span className={styles.step}>2</span>블록을 세로셈으로
          </h4>
          <p>
            {hasMarks
              ? addition
                ? "작은 칸에는 왼쪽 자리로 받아올린 블록 수를 써요. 그 자리의 1은 얼마를 뜻할까요?"
                : "작은 칸에는 바꾼 뒤의 수를 써요. 이 자리의 남은 블록과 빼낸 블록을 합해 보세요."
              : "같은 자리끼리 계산해요. 블록이 없는 자리도 0을 써 주세요."}
          </p>
          {/* 뺄셈은 조작 중에 «준비 완료»로 정답을 먼저 알려 주지 않는다 — 맞는지는 확인할 때 */}
          <span
            className={ready && addition ? styles.readyBadge : styles.waitBadge}
          >
            {board.moves === 0
              ? "블록을 먼저 움직여요"
              : !addition
                ? "남은 블록을 세어 써요"
                : ready
                  ? "블록 준비 완료"
                  : "블록을 먼저 움직여요"}
          </span>
        </div>
        <div className={styles.algorithmWrap}>
          <table className={styles.algorithm} aria-label="블록과 연결된 세로셈">
            <thead>
              <tr>
                <th scope="col">
                  <span className={styles.srOnly}>구분</span>
                </th>
                {required.places.map((p) => (
                  <th scope="col" key={p}>
                    {PLACE_NAMES[p].replace("의 자리", "")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hasMarks ? (
                <tr className={styles.markRow}>
                  <th scope="row">{addition ? "받아올림" : "바꾼 수"}</th>
                  {required.places.map((p) => (
                    <td key={p}>
                      {required.marks[p] !== null ? (
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          maxLength={2}
                          aria-label={`${PLACE_NAMES[p]} ${addition ? "받아올린 수" : "바꾼 뒤의 수"}`}
                          value={session.marks[p]}
                          disabled={disabled}
                          onChange={(event) =>
                            dispatch({
                              type: "entry",
                              row: "marks",
                              place: p,
                              value: event.target.value,
                            })
                          }
                        />
                      ) : (
                        <span aria-hidden="true">·</span>
                      )}
                    </td>
                  ))}
                </tr>
              ) : null}
              <tr>
                <th scope="row">
                  <span className={styles.srOnly}>처음 수</span>
                </th>
                {required.places.map((p) => (
                  <td key={p}>
                    <span
                      className={
                        !addition &&
                        board.workspace[p] + board.removed[p] !== a[p]
                          ? styles.originalDigit
                          : ""
                      }
                    >
                      {p === 3 && a[p] === 0 ? "" : a[p]}
                    </span>
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className={styles.operator}>
                  {addition ? "+" : "−"}
                </th>
                {required.places.map((p) => (
                  <td key={p}>{p === 3 && b[p] === 0 ? "" : b[p]}</td>
                ))}
              </tr>
              <tr className={styles.answerRow}>
                <th scope="row">답</th>
                {required.places.map((p) => (
                  <td key={p}>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={1}
                      aria-label={`${PLACE_NAMES[p]} 답`}
                      value={session.digits[p]}
                      disabled={disabled}
                      onChange={(event) =>
                        dispatch({
                          type: "entry",
                          row: "digits",
                          place: p,
                          value: event.target.value,
                        })
                      }
                    />
                  </td>
                ))}
              </tr>
              <tr className={styles.syncRow}>
                <th scope="row">작업판</th>
                {required.places.map((p) => (
                  <td key={p}>{board.workspace[p]}개</td>
                ))}
              </tr>
            </tbody>
          </table>
          <button
            type="submit"
            className={styles.checkButton}
            disabled={disabled}
          >
            {session.checked
              ? "블록과 세로셈 확인 완료 ✓"
              : "블록과 세로셈 확인하기"}
          </button>
        </div>
      </form>
    </section>
  );
}

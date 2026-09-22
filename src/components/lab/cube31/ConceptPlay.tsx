"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import {
  PLAY_MISSIONS,
  canPlayExchange,
  canPlayPrimary,
  createPlayState,
  reducePlay,
  playExchange,
} from "@/lib/lab/cube31/conceptPlay";
import type { PlayEvent, PlayPlace } from "@/lib/lab/cube31/conceptPlay";
import { BLOCK_NAMES, VALUES, blockValue } from "@/lib/lab/cube31/manipulative";
import styles from "./ConceptPlay.module.css";
import ConceptTranscript, {
  type ConversationMessage,
} from "./ConceptTranscript";

const KEYS = ["3", "2", "1"] as const;
const COLOR_CLASSES = [styles.ones, styles.tens, styles.hundreds];
const NEXT_DELAY = 900;

/** All blocks use the same grid: a rod has ten cells, a plate has 100. */
function Block({ place }: { place: PlayPlace }) {
  return (
    <span
      aria-hidden="true"
      className={`${styles.block} ${COLOR_CLASSES[place]}`}
    />
  );
}

export default function ConceptPlay({ onClose }: { onClose: () => void }) {
  const [state, dispatch] = useReducer(reducePlay, undefined, () =>
    createPlayState(),
  );
  const [conversationKey, setConversationKey] = useState(0);
  const [spokenDiscovery, setSpokenDiscovery] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const root = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closed = useRef(false);
  const held = useRef(new Set<string>());
  const mission = PLAY_MISSIONS[state.round];
  const complete = state.phase === "complete";
  const success = state.phase === "success";
  const discoveryId = `discovery-${state.round}-${state.revision}`;
  const discoveryReady = spokenDiscovery === discoveryId;
  const messages: ConversationMessage[] = [];
  PLAY_MISSIONS.slice(0, state.round + 1).forEach((scene, index) => {
    const previous = index < state.round;
    const immediate = previous || complete;
    messages.push(
      {
        id: `intro-${index}-duri`,
        speaker: "두리",
        text: scene.chat[0],
        scene: {
          id: String(index),
          label: `${String(index + 1).padStart(2, "0")} · ${scene.title}`,
        },
        immediate,
      },
      {
        id: `intro-${index}-moa`,
        speaker: "모아",
        text: scene.chat[1],
        immediate,
      },
    );
    if (previous || success || complete) {
      messages.push({
        id: previous ? `discovery-${index}-past` : discoveryId,
        speaker: "두리",
        text: scene.discovery,
        immediate,
      });
    } else if (state.feedback) {
      messages.push({
        id: `reaction-${index}`,
        speaker: "모아",
        text: `직접 움직이니 ${state.feedback}`,
      });
    }
  });
  const locked = state.paused || state.phase !== "playing";
  const stars = complete ? PLAY_MISSIONS.length : state.round + Number(success);
  const value = blockValue(state.board.workspace);
  const exchangeReady = canPlayExchange(mission, state.board);
  const conversion = playExchange(mission, state.board);
  const exchangePlace = conversion?.place ?? 0;
  const exchangeLabel =
    mission.exchange === "bundle" || mission.kind === "build"
      ? `${BLOCK_NAMES[exchangePlace]} 10개 → ${BLOCK_NAMES[exchangePlace + 1]} 1개로 묶기`
      : "십 막대 1개 → 낱개 10개로 풀기";

  useEffect(() => {
    closed.current = false;
    root.current?.focus({ preventScroll: true });
    const keys = held.current;
    return () => {
      closed.current = true;
      keys.clear();
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    if (
      state.phase !== "success" ||
      !discoveryReady ||
      state.paused ||
      closing ||
      closed.current
    )
      return;
    timer.current = setTimeout(() => {
      if (!closed.current)
        dispatch({ type: "advance", revision: state.revision });
    }, NEXT_DELAY);
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [state.phase, state.paused, state.revision, discoveryReady, closing]);

  function act(event: PlayEvent) {
    if (!closed.current) {
      if (
        event.type === "replay" ||
        (event.type === "reset" && !state.paused && !complete)
      ) {
        setConversationKey((key) => key + 1);
      }
      dispatch(event);
      // A used-up supply button becomes disabled; keep keyboard play inside
      // the game even when the browser would otherwise drop focus to body.
      root.current?.focus({ preventScroll: true });
    }
  }

  function close() {
    if (closed.current) return;
    closed.current = true;
    setClosing(true);
    if (timer.current !== null) clearTimeout(timer.current);
    held.current.clear();
    onClose();
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    // Shortcuts are scoped to this surface, never installed on window/document.
    const target = event.target as HTMLElement;
    if (
      target.closest(
        "input, textarea, select, [contenteditable]:not([contenteditable='false'])",
      ) ||
      event.nativeEvent.isComposing ||
      event.keyCode === 229 ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;
    const key = event.key.toLowerCase();
    if (!["1", "2", "3", "e", "p", "u", "r", "escape"].includes(key)) return;
    event.stopPropagation();
    event.preventDefault();
    if (event.repeat || held.current.has(key) || closed.current) return;
    held.current.add(key);
    if (key === "escape") {
      close();
      return;
    }
    if (key === "p") {
      act({ type: "pause" });
      return;
    }
    if (key === "u") {
      act({ type: "undo" });
      return;
    }
    if (key === "r") {
      act({ type: "reset" });
      return;
    }
    if (key === "e") {
      act({ type: "exchange" });
      return;
    }
    act({ type: "primary", place: (3 - Number(key)) as PlayPlace });
  }

  return (
    <section
      ref={root}
      className={styles.game}
      tabIndex={-1}
      aria-label="모아와 두리의 블록 가게 게임"
      onKeyDown={onKeyDown}
      onKeyUp={(event) => held.current.delete(event.key.toLowerCase())}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          held.current.clear();
      }}
    >
      <header className={styles.header}>
        <div className={styles.title}>
          <span className={styles.shopIcon} aria-hidden="true">
            ▦
          </span>
          <div>
            <strong>모아와 두리의 블록 가게</strong>
            <span>대화하고, 움직이고, 발견해!</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.stars} aria-label={`발견한 별 ${stars}개`}>
            ★ {stars}
          </span>
          {!complete && (
            <button
              type="button"
              onClick={() => act({ type: "pause" })}
              aria-pressed={state.paused}
              aria-label={state.paused ? "계속하기" : "잠깐 멈추기"}
            >
              {state.paused ? "계속" : "잠깐"}
            </button>
          )}
          <button type="button" onClick={close} aria-label="게임 닫기">
            ✕
          </button>
        </div>
      </header>

      <div className={styles.content}>
        <aside className={styles.chatPane} aria-label="모아와 두리의 대화">
          <div className={styles.chatHeading}>
            <span>블록 가게 친구들</span>
            <span>2명</span>
          </div>
          <ConceptTranscript
            messages={messages}
            paused={state.paused || closing}
            conversationKey={conversationKey}
            onMessageComplete={(id) => {
              if (id === discoveryId && !closed.current) setSpokenDiscovery(id);
            }}
          />
        </aside>

        <main className={styles.scene}>
          {complete ? (
            <div className={styles.ending}>
              <div className={styles.endingStars} aria-hidden="true">
                ✦ ★ ✦
              </div>
              <span className={styles.eyebrow}>발견한 별 8 / 8</span>
              <h2>오늘의 블록 가게, 성공!</h2>
              <p>“이제 알겠어. 묶거나 풀어도 값은 같아!”</p>
              <div className={styles.keepsake}>
                <strong>10개의 낱개 = 1개의 십 막대</strong>
                <span>같은 자리끼리 더하고 · 모자라면 풀어서 빼기</span>
              </div>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => {
                  act({ type: "replay" });
                  root.current?.focus({ preventScroll: true });
                }}
              >
                한 번 더 놀기
              </button>
              <button
                type="button"
                className={styles.returnButton}
                onClick={close}
              >
                랩실로 돌아가기
              </button>
            </div>
          ) : (
            <>
              <div className={styles.goal}>
                <span className={styles.eyebrow}>
                  장면 {state.round + 1} / 8 · {mission.title}
                </span>
                <h2>{mission.goal}</h2>
              </div>
              <div className={styles.counter}>
                <span>
                  진열대 전체 값{" "}
                  <strong
                    key={`${state.round}-${value}`}
                    className={!state.paused ? styles.numberPop : ""}
                    data-testid="play-value"
                  >
                    {value}
                  </strong>
                </span>
                <span className={styles.equation} aria-label="블록의 값">
                  {mission.places.map((place, i) => (
                    <span key={place}>
                      {i > 0 ? " + " : ""}
                      {state.board.workspace[place]} × {VALUES[place]}
                    </span>
                  ))}
                  {" = "}
                  {value}
                </span>
              </div>

              <div
                className={`${styles.board} ${success ? styles.solvedBoard : ""}`}
                style={{
                  gridTemplateColumns: `repeat(${mission.places.length}, minmax(0, 1fr))`,
                }}
                aria-label="진열대"
              >
                {mission.places.map((place) => {
                  const count = state.board.workspace[place];
                  // Reserve room for the whole move, so receiving another block
                  // does not suddenly shrink the models already on the shelf.
                  const anticipated =
                    mission.kind === "build"
                      ? place === 2
                        ? 4
                        : 12
                      : mission.problem
                        ? (Math.floor(mission.problem.a / VALUES[place]) % 10) +
                          (mission.kind === "add"
                            ? (Math.floor(mission.problem.b / VALUES[place]) %
                                10) +
                              Number(place > 0 && !!mission.exchange)
                            : Number(
                                mission.exchange === "split" && place === 0,
                              ) * 10)
                        : mission.kind === "split" && place === 0
                          ? 10
                          : mission.initial[place];
                  const capacity = Math.max(1, anticipated, count);
                  const columns = Math.min(
                    place === 2 ? 2 : place === 1 ? 6 : 5,
                    capacity,
                  );
                  const interactive =
                    mission.kind === "build" ||
                    mission.kind === "subtract" ||
                    (mission.kind === "bundle" && place === 0) ||
                    (mission.kind === "split" && place === 1);
                  const takingBack = mission.kind === "build";
                  const enabled = takingBack
                    ? count > 0
                    : canPlayPrimary(mission, state.board, place);
                  const actionName = takingBack
                    ? `${BLOCK_NAMES[place]} 1개 치우기`
                    : mission.kind === "subtract"
                      ? `${BLOCK_NAMES[place]} 1개 건네기`
                      : `${BLOCK_NAMES[place]} 눌러 ${mission.kind === "bundle" ? "묶기" : "풀기"}`;
                  const inside = (
                    <>
                      <span className={styles.placeTitle}>
                        {VALUES[place]} 블록 <strong>{count}개</strong>
                      </span>
                      <span
                        className={styles.pile}
                        key={`${state.round}-${place}-${count}`}
                        style={
                          {
                            "--pile-columns": columns,
                            "--pile-rows": Math.ceil(capacity / columns),
                          } as CSSProperties
                        }
                        data-motion={
                          !state.paused && state.motion?.place === place
                            ? state.motion.kind
                            : undefined
                        }
                      >
                        {Array.from({ length: count }, (_, i) => (
                          <Block key={i} place={place} />
                        ))}
                        {count === 0 && (
                          <span className={styles.empty}>빈 자리</span>
                        )}
                      </span>
                      <span className={styles.placeValue}>
                        {count} × {VALUES[place]} ={" "}
                        <b>{count * VALUES[place]}</b>
                      </span>
                      {interactive && (
                        <span className={styles.boardHint}>
                          {takingBack ? (
                            "누르면 1개 치우기"
                          ) : mission.kind === "subtract" ? (
                            <>
                              <kbd>{KEYS[place]}</kbd> 눌러 1개 건네기
                            </>
                          ) : enabled ? (
                            "눌러 바꾸기"
                          ) : (
                            "바뀐 블록이 놓이는 자리"
                          )}
                        </span>
                      )}
                    </>
                  );
                  return interactive ? (
                    <button
                      type="button"
                      key={place}
                      className={`${styles.column} ${COLOR_CLASSES[place]}`}
                      disabled={locked || !enabled}
                      aria-label={actionName}
                      onClick={() =>
                        act({
                          type: takingBack ? "take-back" : "primary",
                          place,
                        })
                      }
                    >
                      {inside}
                    </button>
                  ) : (
                    <div
                      key={place}
                      className={`${styles.column} ${COLOR_CLASSES[place]}`}
                    >
                      {inside}
                    </div>
                  );
                })}
              </div>

              {(mission.kind === "build" || mission.kind === "add") && (
                <div
                  className={styles.supply}
                  aria-label={
                    mission.kind === "build" ? "블록 선반" : "도착한 블록"
                  }
                >
                  <span className={styles.supplyLabel}>
                    {mission.kind === "build"
                      ? "눌러서 진열하기"
                      : `도착한 블록 · ${blockValue(state.board.tray)} 남음`}
                  </span>
                  <div className={styles.supplyButtons}>
                    {mission.places.map((place) => (
                      <button
                        type="button"
                        className={`${styles.supplyButton} ${COLOR_CLASSES[place]}`}
                        key={place}
                        disabled={
                          locked || !canPlayPrimary(mission, state.board, place)
                        }
                        onClick={() => act({ type: "primary", place })}
                        aria-label={`${BLOCK_NAMES[place]} 1개 놓기`}
                      >
                        <Block place={place} />
                        <span>
                          <strong>+{VALUES[place]}</strong>
                          <small>
                            {mission.kind === "add"
                              ? `${state.board.tray[place]}개 남음`
                              : BLOCK_NAMES[place]}
                          </small>
                        </span>
                        <kbd>{KEYS[place]}</kbd>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mission.kind === "subtract" && (
                <div
                  className={styles.delivery}
                  aria-label="손님에게 건넨 블록"
                >
                  <span>
                    손님에게{" "}
                    <strong>
                      {blockValue(state.board.removed)} / {mission.problem?.b}
                    </strong>{" "}
                    건넸어
                  </span>
                  <div>
                    {mission.places
                      .filter((p) => state.board.removed[p] > 0)
                      .map((place) => (
                        <button
                          type="button"
                          key={place}
                          disabled={locked}
                          onClick={() => act({ type: "take-back", place })}
                          aria-label={`${BLOCK_NAMES[place]} 1개 돌려받기`}
                        >
                          ↩ {VALUES[place]} × {state.board.removed[place]}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {(mission.exchange || conversion) && (
                <button
                  type="button"
                  className={styles.exchange}
                  disabled={locked || !exchangeReady}
                  onClick={() => act({ type: "exchange" })}
                  aria-label={exchangeLabel}
                >
                  <span aria-hidden="true">⇄</span> {exchangeLabel}
                  <kbd>E</kbd>
                </button>
              )}

              <div
                className={`${styles.feedback} ${success ? styles.success : ""}`}
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                {state.paused ? (
                  "잠깐 쉬는 중 · 계속을 누르면 이어져."
                ) : success ? (
                  <>
                    ★ 발견!{" "}
                    {discoveryReady
                      ? mission.discovery
                      : "두리와 모아의 이야기를 들어 보자."}
                  </>
                ) : (
                  state.feedback ||
                  (mission.kind === "subtract"
                    ? "진열대 블록을 눌러 손님에게 건네줘."
                    : mission.exchange
                      ? "블록을 바꾸고 전체 값을 관찰해 봐."
                      : "아래 블록을 눌러 시작해 봐!")
                )}
              </div>
              {state.paused && (
                <div className={styles.pauseVeil}>
                  <span aria-hidden="true">Ⅱ</span>
                  <strong>이야기도 잠깐 쉬는 중</strong>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => act({ type: "pause" })}
                  >
                    이어서 놀기 <kbd>P</kbd>
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <footer className={styles.footer}>
        <div
          className={styles.progress}
          aria-label={`${stars}개 장면 완료, 전체 8개`}
        >
          {PLAY_MISSIONS.map((scene, i) => (
            <span
              key={scene.title}
              data-done={i < stars}
              data-current={!complete && i === state.round}
            />
          ))}
          <span>{Math.min(state.round + 1, 8)} / 8</span>
        </div>
        {!complete && (
          <div className={styles.tools}>
            <button
              type="button"
              disabled={state.paused || state.history.length === 0}
              onClick={() => act({ type: "undo" })}
            >
              ↶ 되돌리기 <kbd>U</kbd>
            </button>
            <button
              type="button"
              disabled={state.paused}
              onClick={() => act({ type: "reset" })}
            >
              다시 <kbd>R</kbd>
            </button>
          </div>
        )}
      </footer>
    </section>
  );
}

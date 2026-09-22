"use client";

import {
  Fragment,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import styles from "./ConceptTranscript.module.css";

export type ConversationMessage = {
  id: string;
  speaker: "두리" | "모아";
  text: string;
  scene?: { id: string; label: string };
  immediate?: boolean;
  kind?: "reaction";
};

type Props = {
  messages: readonly ConversationMessage[];
  paused: boolean;
  conversationKey: number;
  onMessageComplete: (id: string) => void;
};

type Entry = {
  key: string;
  message: ConversationMessage;
  characters: string[];
  visible: number;
  started: boolean;
  complete: boolean;
};
type Step = { key: string; kind: "start" | "reveal"; remaining: number };

const revision = ({ id, text }: ConversationMessage) =>
  JSON.stringify([id, text]);
const characterDelay = (character: string) =>
  /[.!?。！？…]/u.test(character)
    ? 150
    : /[,，:;、]/u.test(character)
      ? 85
      : 32;

function createEntry(message: ConversationMessage): Entry {
  // Code points keep Korean syllables and surrogate-pair characters intact.
  const characters = Array.from(message.text);
  return {
    key: revision(message),
    message,
    characters,
    visible: message.immediate ? characters.length : 0,
    started: !!message.immediate,
    complete: !!message.immediate,
  };
}

// One clock owns all bubbles. React only observes immutable snapshots; prop
// reconciliation and pause/resume never restart an unchanged message's clock.
class Playback {
  private entries: Entry[];
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private deadline = 0;
  private step: Step | undefined;
  private gap = 0;
  private running = false;
  private paused = false;
  private reducedMotion = false;
  private completed = new Set<string>();

  constructor(messages: readonly ConversationMessage[]) {
    this.entries = messages.map(createEntry);
    for (const entry of this.entries) {
      if (entry.complete) this.completed.add(entry.key);
    }
  }

  getSnapshot = () => this.entries;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  private publish() {
    for (const listener of this.listeners) listener();
  }
  private stopClock() {
    if (this.timer === undefined) return;
    clearTimeout(this.timer);
    this.timer = undefined;
    if (this.step)
      this.step.remaining = Math.max(0, this.deadline - Date.now());
  }
  connect = () => {
    this.running = true;
    this.pump();
    return () => {
      this.running = false;
      this.stopClock();
    };
  };

  sync(
    messages: readonly ConversationMessage[],
    paused: boolean,
    reduced: boolean,
  ) {
    const previous = new Map(this.entries.map((entry) => [entry.key, entry]));
    this.entries = messages.map((message) => {
      const entry = previous.get(revision(message));
      const next = entry ? { ...entry, message } : createEntry(message);
      if (message.immediate || this.completed.has(next.key)) {
        next.started = next.complete = true;
        next.visible = next.characters.length;
        this.completed.add(next.key);
      }
      return next;
    });
    this.paused = paused;
    this.reducedMotion = reduced;
    if (paused) this.stopClock();
    this.publish();
    this.pump();
  }

  finish = () => {
    this.stopClock();
    this.step = undefined;
    this.gap = 0;
    this.entries = this.entries.map((entry) => {
      this.completed.add(entry.key);
      return {
        ...entry,
        started: true,
        complete: true,
        visible: entry.characters.length,
      };
    });
    this.publish();
  };

  private pump() {
    if (!this.running || this.paused) return;
    if (this.reducedMotion) {
      if (this.entries.some((entry) => !entry.complete)) this.finish();
      else {
        this.stopClock();
        this.step = undefined;
      }
      return;
    }
    const pending = this.entries.find((entry) => !entry.complete);
    if (!pending || (this.step && this.step.key !== pending.key)) {
      this.stopClock();
      this.step = undefined;
    }
    if (!pending) return;
    if (!this.step) {
      if (!pending.started && this.gap > 0) {
        this.step = { key: pending.key, kind: "start", remaining: this.gap };
      } else {
        if (!pending.started) this.replace({ ...pending, started: true });
        this.step = {
          key: pending.key,
          kind: "reveal",
          remaining: pending.visible
            ? characterDelay(pending.characters[pending.visible - 1])
            : 350,
        };
      }
    }
    if (this.timer !== undefined) return;
    this.deadline = Date.now() + this.step.remaining;
    this.timer = setTimeout(this.tick, this.step.remaining);
  }

  private replace(entry: Entry) {
    this.entries = this.entries.map((current) =>
      current.key === entry.key ? entry : current,
    );
    this.publish();
  }
  private tick = () => {
    this.timer = undefined;
    const step = this.step;
    this.step = undefined;
    if (!this.running || this.paused || !step) return;
    const entry = this.entries.find((current) => current.key === step.key);
    if (!entry || entry.complete) return;
    if (step.kind === "start") {
      this.gap = 0;
      this.replace({ ...entry, started: true });
    } else {
      const visible = Math.min(entry.visible + 1, entry.characters.length);
      const complete = visible === entry.characters.length;
      if (complete) {
        this.completed.add(entry.key);
        this.gap = 300;
      }
      this.replace({ ...entry, visible, complete });
    }
    this.pump();
  };
}

const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotion(listener: () => void) {
  const media = window.matchMedia?.(motionQuery);
  media?.addEventListener("change", listener);
  return () => media?.removeEventListener("change", listener);
}
const motionSnapshot = () => window.matchMedia?.(motionQuery).matches ?? false;
const serverMotionSnapshot = () => false;

function Transcript({
  messages,
  paused,
  onMessageComplete,
}: Omit<Props, "conversationKey">) {
  const [playback] = useState(() => new Playback(messages));
  const entries = useSyncExternalStore(
    playback.subscribe,
    playback.getSnapshot,
    playback.getSnapshot,
  );
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    motionSnapshot,
    serverMotionSnapshot,
  );
  const notified = useRef(new Set<string>());
  const transcript = useRef<HTMLDivElement>(null);
  const followBottom = useRef(true);

  useLayoutEffect(() => {
    playback.sync(messages, paused, reducedMotion);
  }, [messages, paused, reducedMotion, playback]);
  useLayoutEffect(() => playback.connect(), [playback]);

  useLayoutEffect(() => {
    const current = new Set(messages.map(revision));
    for (const entry of entries) {
      if (
        !entry.complete ||
        !current.has(entry.key) ||
        notified.current.has(entry.key)
      )
        continue;
      notified.current.add(entry.key);
      onMessageComplete(entry.message.id);
    }
  }, [entries, messages, onMessageComplete]);

  useLayoutEffect(() => {
    const element = transcript.current;
    if (element && followBottom.current)
      element.scrollTop = element.scrollHeight;
  }, [entries]);

  const scenes = new Set<string>();
  const pending = entries.some((entry) => !entry.complete);
  const lastSpoken = entries.findLast(
    (entry) => entry.complete && !entry.message.immediate,
  );

  return (
    <div className={styles.root} data-paused={paused}>
      <div
        ref={transcript}
        className={styles.transcript}
        role="log"
        aria-label="이야기 기록"
        aria-live="off"
        tabIndex={0}
        onScroll={(event) => {
          const element = event.currentTarget;
          followBottom.current =
            element.scrollHeight - element.scrollTop - element.clientHeight <=
            24;
        }}
      >
        {entries.map((entry) => {
          if (!entry.started) return null;
          const { message } = entry;
          const showScene = message.scene && !scenes.has(message.scene.id);
          if (message.scene) scenes.add(message.scene.id);
          return (
            <Fragment
              key={message.kind === "reaction" ? message.id : entry.key}
            >
              {showScene ? (
                <div className={styles.sceneDivider}>
                  {message.scene?.label}
                </div>
              ) : null}
              <div
                className={`${styles.chatRow} ${message.speaker === "모아" ? styles.moa : ""}`}
                data-message-id={message.id}
                data-speaker={message.speaker}
              >
                <span className={styles.avatar} aria-hidden="true">
                  {message.speaker.slice(0, 1)}
                </span>
                <div>
                  <span className={styles.speaker}>{message.speaker}</span>
                  <p className={styles.bubble}>
                    {message.kind === "reaction" ? (
                      <span
                        key={message.text}
                        className={styles.reactionUpdate}
                      >
                        {message.text}
                      </span>
                    ) : !entry.complete && entry.visible === 0 ? (
                      <span
                        className={styles.typingDots}
                        aria-label={`${message.speaker} 생각 중`}
                      >
                        <span />
                        <span />
                        <span />
                      </span>
                    ) : (
                      entry.characters.slice(0, entry.visible).join("")
                    )}
                  </p>
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>
      <div className={styles.chatFoot} data-conversation-footer="true">
        <span>네가 움직이면 이야기가 이어져.</span>
        {pending ? (
          <button type="button" disabled={paused} onClick={playback.finish}>
            대화 바로 보기
          </button>
        ) : null}
        <span className={styles.live} aria-live="polite" aria-atomic="true">
          {lastSpoken
            ? `${lastSpoken.message.speaker}: ${lastSpoken.message.text}`
            : ""}
        </span>
      </div>
    </div>
  );
}

export default function ConceptTranscript({
  conversationKey,
  ...props
}: Props) {
  return <Transcript key={conversationKey} {...props} />;
}

"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import s from "./learning-motion.module.css";

/** This device preference is deliberately separate from learner records and lab saves. */
export const LEARNING_MOTION_KEY = "todays-math:learning-motion:v1";
const query = "(prefers-reduced-motion: reduce)";
const subscribers = new Set<() => void>();
let media: MediaQueryList | null = null;
let initialized = false;
let appReduced = false;

function readPreference() {
  try {
    appReduced = window.localStorage.getItem(LEARNING_MOTION_KEY) === "reduce";
  } catch {
    // Keep the in-memory setting when storage is unavailable.
  }
}

function initialize() {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;
  media =
    typeof window.matchMedia === "function" ? window.matchMedia(query) : null;
  readPreference();
}

function notify() {
  subscribers.forEach((subscriber) => subscriber());
}

function onStorage(event: StorageEvent) {
  if (event.key !== LEARNING_MOTION_KEY && event.key !== null) return;
  appReduced = event.key !== null && event.newValue === "reduce";
  notify();
}

function subscribe(subscriber: () => void) {
  initialize();
  if (subscribers.size === 0) {
    media =
      typeof window.matchMedia === "function" ? window.matchMedia(query) : null;
    readPreference();
    media?.addEventListener("change", notify);
    window.addEventListener("storage", onStorage);
  }
  subscribers.add(subscriber);
  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0) {
      media?.removeEventListener("change", notify);
      window.removeEventListener("storage", onStorage);
    }
  };
}

function snapshot() {
  initialize();
  return (appReduced ? 1 : 0) | (media?.matches ? 2 : 0);
}

function setAppReducedMotion(reduced: boolean) {
  initialize();
  appReduced = reduced;
  try {
    window.localStorage.setItem(
      LEARNING_MOTION_KEY,
      reduced ? "reduce" : "full",
    );
  } catch {
    // A blocked storage write must not prevent the current screen from changing.
  }
  notify();
}

export function useLearningMotion() {
  const value = useSyncExternalStore(subscribe, snapshot, () => 0);
  return {
    appReducedMotion: (value & 1) !== 0,
    osReducedMotion: (value & 2) !== 0,
    reduceMotion: value !== 0,
    setAppReducedMotion,
  };
}

/** Only the student mathematics subtree receives these tokens and this CSS boundary. */
export function LearningMotionScope({ children }: { children: ReactNode }) {
  const { reduceMotion } = useLearningMotion();
  return (
    <div
      className={s.scope}
      data-learning-motion={reduceMotion ? "reduce" : "full"}
    >
      {children}
    </div>
  );
}

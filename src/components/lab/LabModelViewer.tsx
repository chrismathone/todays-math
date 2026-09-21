"use client";

import type { ModelViewerElement } from "@google/model-viewer";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import styles from "./lab.module.css";

let modelViewerLoad: Promise<unknown> | undefined;

function loadModelViewer() {
  if (customElements.get("model-viewer")) return Promise.resolve();
  return (modelViewerLoad ??= import("@google/model-viewer").catch(
    (error: unknown) => {
      modelViewerLoad = undefined;
      throw error;
    },
  ));
}

type View = { id: string; label: string; orbit: string };

type Props = {
  src: string;
  animationName: string;
  alt: string;
  percent: number;
  onPercent: (value: number) => void;
  defaultOrbit: string;
  cameraTarget?: string;
  views?: View[];
  reducedMotion: boolean;
  poseLabel: string;
};

const LOAD_TIMEOUT_MS = 30000;

export function LabModelViewer({
  src,
  animationName,
  alt,
  percent,
  onPercent,
  defaultOrbit,
  cameraTarget = "0m 0m 0m",
  views = [],
  reducedMotion,
  poseLabel,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<ModelViewerElement | null>(null);
  const percentRef = useRef(percent);
  const reducedRef = useRef(reducedMotion);
  const onPercentRef = useRef(onPercent);
  // 최신 onPercent 를 seek 가 부르게 한다. 렌더 중 쓰기는 react-hooks/refs 가 막아 커밋 직후에 맞춘다.
  useLayoutEffect(() => {
    onPercentRef.current = onPercent;
  });
  const [attempt, setAttempt] = useState(0);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const hintId = useId();

  const seek = useCallback((value: number) => {
    const viewer = viewerRef.current;
    if (!viewer || !Number.isFinite(viewer.duration) || viewer.duration <= 0)
      return;
    if (!Number.isFinite(value)) return;
    const next = Math.min(100, Math.max(0, value));
    const end = viewer.duration - Math.min(0.001, viewer.duration / 1000);
    viewer.pause();
    viewer.currentTime = Math.min((next / 100) * viewer.duration, end);
    percentRef.current = next;
    onPercentRef.current(Math.round(next));
  }, []);

  useEffect(() => {
    reducedRef.current = reducedMotion;
    const viewer = viewerRef.current;
    if (viewer) viewer.interpolationDecay = reducedMotion ? 0 : 50;
  }, [reducedMotion]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let failed = false;
    let viewer: ModelViewerElement | null = null;
    const fail = () => {
      if (disposed || failed) return;
      failed = true;
      window.clearTimeout(timeout);
      viewerRef.current = null;
      viewer?.remove();
      setLoadState("error");
    };
    const onLoad = () => {
      if (disposed || failed || !viewer) return;
      if (
        !viewer.availableAnimations.includes(animationName) ||
        !Number.isFinite(viewer.duration) ||
        viewer.duration <= 0
      ) {
        fail();
        return;
      }
      window.clearTimeout(timeout);
      viewer.pause();
      viewer.cameraControls = true;
      viewerRef.current = viewer;
      seek(percentRef.current);
      viewer.jumpCameraToGoal();
      setLoadState("ready");
    };
    const timeout = window.setTimeout(fail, LOAD_TIMEOUT_MS);
    loadModelViewer()
      .then(() => {
        if (disposed || failed) return;
        viewer = document.createElement("model-viewer");
        viewer.className = styles.model;
        viewer.setAttribute("alt", alt);
        viewer.setAttribute("loading", "eager");
        viewer.setAttribute("reveal", "auto");
        viewer.setAttribute("interaction-prompt", "none");
        viewer.setAttribute("touch-action", "pan-y");
        viewer.setAttribute("shadow-intensity", "0");
        viewer.setAttribute("environment-image", "neutral");
        viewer.setAttribute("disable-pan", "");
        viewer.setAttribute("disable-tap", "");
        viewer.setAttribute("aria-describedby", hintId);
        viewer.animationName = animationName;
        viewer.animationCrossfadeDuration = 0;
        viewer.autoplay = false;
        viewer.cameraOrbit = defaultOrbit;
        viewer.cameraTarget = cameraTarget;
        viewer.fieldOfView = "30deg";
        viewer.interpolationDecay = reducedRef.current ? 0 : 50;
        viewer.addEventListener("load", onLoad);
        viewer.addEventListener("error", fail);
        viewer.setAttribute("src", attempt ? `${src}?retry=${attempt}` : src);
        mount.append(viewer);
      })
      .catch(() => fail());
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      viewerRef.current = null;
      viewer?.removeEventListener("load", onLoad);
      viewer?.removeEventListener("error", fail);
      viewer?.pause();
      viewer?.remove();
    };
  }, [
    alt,
    animationName,
    attempt,
    cameraTarget,
    defaultOrbit,
    hintId,
    seek,
    src,
  ]);

  const ready = loadState === "ready";
  const shown = Number.isFinite(percent) ? percent : 0;

  return (
    <div>
      <div className={styles.viewport} aria-busy={loadState === "loading"}>
        <div ref={mountRef} className={styles.modelMount} />
        {ready ? (
          <p className={styles.pose}>{poseLabel}</p>
        ) : (
          <div className={styles.loadMessage}>
            {loadState === "error" ? (
              <button
                type="button"
                className={styles.labBtnSecondary}
                onClick={() => {
                  setLoadState("loading");
                  setAttempt((n) => n + 1);
                }}
              >
                다시 불러오기
              </button>
            ) : (
              <span>모형을 준비하는 중입니다.</span>
            )}
          </div>
        )}
      </div>
      {views.length > 0 ? (
        <div className={styles.actions}>
          {views.map((view) => (
            <button
              key={view.id}
              type="button"
              className={styles.labBtnGhost}
              disabled={!ready}
              onClick={() => {
                const viewer = viewerRef.current;
                if (!viewer) return;
                viewer.cameraOrbit = view.orbit;
                void viewer.updateComplete.then(() =>
                  viewer.jumpCameraToGoal(),
                );
              }}
            >
              {view.label}
            </button>
          ))}
        </div>
      ) : null}
      <p id={hintId} className={styles.hintBox}>
        끌어서 돌려 볼 수 있습니다. 아래 손잡이로 접히거나 벌어지는 정도를
        바꿉니다.
      </p>
      <label className={styles.field}>
        <span>진행 {shown}%</span>
      </label>
      <input
        className={styles.range}
        type="range"
        min={0}
        max={100}
        step={reducedMotion ? 100 : 5}
        value={shown}
        disabled={!ready}
        aria-label="모형 진행"
        onChange={(e) => seek(Number(e.target.value))}
      />
    </div>
  );
}

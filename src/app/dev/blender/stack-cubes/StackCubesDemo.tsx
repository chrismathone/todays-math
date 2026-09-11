"use client";

import type { ModelViewerElement } from "@google/model-viewer";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";

import styles from "./stack-cubes.module.css";

const MODEL_URL = "/dev/blender-assets/stack-cubes/stack-cubes.glb";
const CAMERA_TARGET = "0m 0.018m 0m";
// glTF is Y-up: +Z is front, +X is right. At the top, theta 0 puts
// the physical blue front marker at the bottom of the screen.
const VIEWS = {
  iso: { label: "입체", orbit: "30deg 60deg 0.13m" },
  top: { label: "위", orbit: "0deg 0deg 0.13m" },
  front: { label: "앞", orbit: "0deg 90deg 0.13m" },
  right: { label: "오른쪽", orbit: "90deg 90deg 0.13m" },
} as const;
const ANIMATION_MS = 1000;
const LOAD_TIMEOUT_MS = 30000;

let modelViewerLoad: Promise<unknown> | undefined;

function loadModelViewer() {
  if (customElements.get("model-viewer")) return Promise.resolve();
  // Match the folding lesson's guard/cache: registration runs on the client
  // once, including Strict Mode remounts and navigation between the lessons.
  return (modelViewerLoad ??= import("@google/model-viewer").catch(
    (error: unknown) => {
      modelViewerLoad = undefined;
      throw error;
    },
  ));
}

type LoadState = "loading" | "ready" | "error";
type View = keyof typeof VIEWS;

export function StackCubesDemo() {
  const mountRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<ModelViewerElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const percentRef = useRef(0);
  const reducedMotionRef = useRef(false);
  const viewRequestRef = useRef(0);
  const [attempt, setAttempt] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [percent, setPercent] = useState(0);
  const [playing, setPlaying] = useState<0 | 100 | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [announcement, setAnnouncement] =
    useState("쌓기나무를 불러오는 중입니다.");
  const sliderId = useId();
  const hintId = useId();
  const answerId = useId();

  const stopPlayback = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    viewerRef.current?.pause();
    setPlaying(null);
  }, []);

  const seek = useCallback((value: number) => {
    const viewer = viewerRef.current;
    if (!viewer || !Number.isFinite(viewer.duration) || viewer.duration <= 0)
      return;
    const next = Math.min(100, Math.max(0, value));
    // Avoid the clip's loop boundary while showing the last authored pose.
    const end = viewer.duration - Math.min(0.001, viewer.duration / 1000);
    viewer.pause();
    viewer.currentTime = Math.min((next / 100) * viewer.duration, end);
    percentRef.current = next;
    setPercent(Math.round(next));
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let failed = false;
    let viewer: ModelViewerElement | null = null;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = media.matches;

    const fail = () => {
      if (disposed || failed) return;
      failed = true;
      window.clearTimeout(timeout);
      stopPlayback();
      viewerRef.current = null;
      viewer?.remove();
      setLoadState("error");
      setAnnouncement("쌓기나무를 불러오지 못했습니다. 다시 시도해 주세요.");
    };

    const onLoad = () => {
      if (disposed || failed || !viewer) return;
      if (
        viewer.availableAnimations.length !== 1 ||
        viewer.availableAnimations[0] !== "Separate" ||
        !Number.isFinite(viewer.duration) ||
        Math.abs(viewer.duration - 1) > 0.001
      ) {
        fail();
        return;
      }
      window.clearTimeout(timeout);
      viewer.pause();
      viewer.cameraControls = true;
      viewerRef.current = viewer;
      seek(0);
      viewer.jumpCameraToGoal();
      setLoadState("ready");
      setAnnouncement("쌓기나무가 준비되었습니다. 층을 벌려 살펴보세요.");
    };

    const onMotionChange = () => {
      reducedMotionRef.current = media.matches;
      if (viewer) viewer.interpolationDecay = media.matches ? 0 : 50;
      if (media.matches && viewerRef.current) {
        stopPlayback();
        setAnnouncement(
          `층 벌리기 ${Math.round(percentRef.current)}%에서 멈췄습니다.`,
        );
      }
    };
    const onVisibilityChange = () => {
      if (document.hidden && viewerRef.current) {
        stopPlayback();
        setAnnouncement(
          `층 벌리기 ${Math.round(percentRef.current)}%에서 멈췄습니다.`,
        );
      }
    };
    const timeout = window.setTimeout(fail, LOAD_TIMEOUT_MS);
    media.addEventListener("change", onMotionChange);
    document.addEventListener("visibilitychange", onVisibilityChange);

    // The model and its animation are authored in Blender; only load and seek
    // the GLB here. This import never runs during server rendering.
    loadModelViewer()
      .then(() => {
        if (disposed || failed) return;
        viewer = document.createElement("model-viewer");
        viewer.className = styles.model;
        viewer.setAttribute(
          "alt",
          "층을 벌려 살펴볼 수 있는 쌓기나무. 바닥의 파란 삼각형이 가리키는 쪽이 앞입니다.",
        );
        viewer.setAttribute("loading", "eager");
        viewer.setAttribute("reveal", "auto");
        viewer.setAttribute("interaction-prompt", "none");
        viewer.setAttribute("touch-action", "pan-y");
        viewer.setAttribute("shadow-intensity", "0");
        viewer.setAttribute("environment-image", "neutral");
        viewer.setAttribute("disable-pan", "");
        viewer.setAttribute("disable-tap", "");
        viewer.setAttribute("aria-describedby", hintId);
        viewer.animationName = "Separate";
        viewer.animationCrossfadeDuration = 0;
        viewer.autoplay = false;
        viewer.cameraOrbit = VIEWS.iso.orbit;
        viewer.cameraTarget = CAMERA_TARGET;
        // Absolute bounds preserve room above the closed model when separated.
        viewer.minCameraOrbit = "auto 0deg 0.07m";
        viewer.maxCameraOrbit = "auto 90deg 0.4m";
        viewer.fieldOfView = "30deg";
        viewer.interpolationDecay = media.matches ? 0 : 50;
        viewer.a11y = {
          left: "왼쪽에서 본 모습",
          right: "오른쪽에서 본 모습",
          front: "앞에서 본 모습",
          back: "뒤에서 본 모습",
          "upper-left": "왼쪽 위에서 본 모습",
          "upper-right": "오른쪽 위에서 본 모습",
          "upper-front": "앞쪽 위에서 본 모습",
          "upper-back": "뒤쪽 위에서 본 모습",
          "lower-left": "왼쪽 아래에서 본 모습",
          "lower-right": "오른쪽 아래에서 본 모습",
          "lower-front": "앞쪽 아래에서 본 모습",
          "lower-back": "뒤쪽 아래에서 본 모습",
          "interaction-prompt":
            "마우스, 터치 또는 방향키로 쌓기나무를 돌려 보세요.",
        };
        viewer.addEventListener("load", onLoad);
        viewer.addEventListener("error", fail);
        viewer.setAttribute(
          "src",
          attempt ? `${MODEL_URL}?retry=${attempt}` : MODEL_URL,
        );
        mount.append(viewer);
      })
      .catch((error: unknown) => {
        if (disposed || failed) return;
        console.warn(
          "Stacking-cubes lesson could not initialize its model viewer.",
          String(error),
        );
        fail();
      });

    return () => {
      disposed = true;
      viewRequestRef.current += 1;
      window.clearTimeout(timeout);
      media.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      viewerRef.current = null;
      viewer?.removeEventListener("load", onLoad);
      viewer?.removeEventListener("error", fail);
      viewer?.pause();
      viewer?.remove();
    };
  }, [attempt, hintId, seek, stopPlayback]);

  function animateTo(target: 0 | 100) {
    if (loadState !== "ready") return;
    stopPlayback();
    viewRequestRef.current += 1;
    const finished =
      target === 100 ? "층을 모두 벌렸습니다." : "쌓기나무를 다시 쌓았습니다.";
    if (reducedMotionRef.current) {
      seek(target);
      setAnnouncement(finished);
      return;
    }
    const from = percentRef.current;
    const duration = (ANIMATION_MS * Math.abs(target - from)) / 100;
    if (duration === 0) return;
    let startedAt: number | null = null;
    setPlaying(target);
    setAnnouncement(
      target === 100 ? "층을 벌리고 있습니다." : "다시 쌓고 있습니다.",
    );
    const tick = (now: number) => {
      startedAt ??= now;
      const elapsed = Math.min((now - startedAt) / duration, 1);
      seek(from + (target - from) * elapsed);
      if (elapsed < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        frameRef.current = null;
        setPlaying(null);
        setAnnouncement(finished);
      }
    };
    frameRef.current = requestAnimationFrame(tick);
  }

  function pause() {
    stopPlayback();
    viewRequestRef.current += 1;
    setAnnouncement(
      `층 벌리기 ${Math.round(percentRef.current)}%에서 멈췄습니다.`,
    );
  }

  async function setView(view: View) {
    const viewer = viewerRef.current;
    if (!viewer || loadState !== "ready") return;
    const request = ++viewRequestRef.current;
    if (view !== "iso") {
      stopPlayback();
      seek(0);
    }
    viewer.cameraTarget = CAMERA_TARGET;
    viewer.cameraOrbit = VIEWS[view].orbit;
    viewer.fieldOfView = "30deg";
    // Lit applies the camera properties asynchronously. Ignore an old request
    // after retry, unmount, or another control action.
    await viewer.updateComplete;
    if (viewerRef.current !== viewer || request !== viewRequestRef.current)
      return;
    if (reducedMotionRef.current) viewer.jumpCameraToGoal();
    setAnnouncement(
      view === "iso"
        ? "처음 입체 시점으로 돌아왔습니다."
        : `층을 다시 쌓고 ${VIEWS[view].label}에서 보고 있습니다. 층 벌리기를 0%로 되돌렸습니다.`,
    );
  }

  function retry() {
    stopPlayback();
    percentRef.current = 0;
    setPercent(0);
    setLoadState("loading");
    setAnnouncement("쌓기나무를 다시 불러오는 중입니다.");
    setAttempt((value) => value + 1);
  }

  const ready = loadState === "ready";

  return (
    <div className={styles.lesson}>
      <section
        className={styles.interactive}
        aria-label="쌓기나무 층 벌리기 실험"
      >
        <div className={styles.viewport} aria-busy={loadState === "loading"}>
          <div ref={mountRef} className={styles.modelMount} />
          {ready ? (
            <p className={styles.pose}>
              {playing === 100
                ? "층을 벌리는 중"
                : playing === 0
                  ? "다시 쌓는 중"
                  : percent === 0
                    ? "쌓은 상태"
                    : "층을 벌린 상태"}
            </p>
          ) : (
            <div className={styles.loadMessage}>
              <p>
                {loadState === "error"
                  ? "쌓기나무를 불러오지 못했어요."
                  : "쌓기나무를 준비하고 있어요."}
              </p>
              {loadState === "error" ? (
                <>
                  <span>연결 상태를 확인하고 다시 시도해 주세요.</span>
                  <Button variant="secondary" onClick={retry}>
                    다시 시도
                  </Button>
                </>
              ) : (
                <span>잠시만 기다려 주세요.</span>
              )}
            </div>
          )}
        </div>
        <div className={styles.viewTools}>
          <p id={hintId}>
            드래그하거나 방향키로 돌려 보세요. 입체를 누르면 처음 시점으로
            돌아와요.
          </p>
          <div
            className={styles.viewButtons}
            role="group"
            aria-label="입체 화면을 보는 방향"
          >
            {(Object.keys(VIEWS) as View[]).map((view) => (
              <Button
                key={view}
                variant="secondary"
                disabled={!ready}
                onClick={() => void setView(view)}
              >
                {VIEWS[view].label}
              </Button>
            ))}
          </div>
        </div>
        <p className={styles.viewHint}>
          위·앞·오른쪽을 누르면 층을 다시 쌓아서 보여 줘요.
        </p>
        <div className={styles.controls}>
          <div className={styles.playback}>
            <Button
              variant="ink"
              className={styles.playButton}
              disabled={!ready || (percent === 100 && playing === null)}
              onClick={() => animateTo(100)}
            >
              층 벌리기
            </Button>
            <Button
              variant="secondary"
              className={styles.playButton}
              disabled={!ready || (percent === 0 && playing === null)}
              onClick={() => animateTo(0)}
            >
              다시 쌓기
            </Button>
          </div>
          <div className={styles.scrubber}>
            <div className={styles.sliderHeading}>
              <label htmlFor={sliderId}>층 벌리기</label>
              <span className={styles.percent} aria-hidden="true">
                {percent}
                <span>%</span>
              </span>
            </div>
            <input
              id={sliderId}
              className={styles.range}
              type="range"
              min={0}
              max={100}
              step={1}
              value={percent}
              disabled={!ready}
              aria-valuetext={`${percent}% 벌림`}
              onPointerDown={pause}
              onKeyDown={(event) => {
                if (
                  [
                    "ArrowLeft",
                    "ArrowRight",
                    "ArrowUp",
                    "ArrowDown",
                    "Home",
                    "End",
                    "PageUp",
                    "PageDown",
                  ].includes(event.key)
                )
                  pause();
              }}
              onChange={(event) => {
                stopPlayback();
                viewRequestRef.current += 1;
                const value = Number(event.currentTarget.value);
                seek(value);
                setAnnouncement(`층 벌리기 ${value}%에서 멈췄습니다.`);
              }}
            />
            <div className={styles.rangeEnds} aria-hidden="true">
              <span>쌓은 상태</span>
              <span>층을 벌린 상태</span>
            </div>
          </div>
        </div>
        <p className={styles.controlHint}>
          막대를 움직이면 원하는 만큼 벌려서 멈춰 볼 수 있어요.
        </p>
        <p
          className={styles.srOnly}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {announcement}
        </p>
      </section>

      <aside className={styles.explanation} aria-labelledby="count-question">
        <h2 id="count-question">쌓기나무는 모두 몇 개일까요?</h2>
        <p>보이는 것만 세지 말고, 다른 쌓기나무 뒤에 가려진 것도 찾아보세요.</p>
        <p>층을 벌린 뒤 아래층부터 한 층씩 세어 보세요.</p>
        <div className={styles.frontNote}>
          <h3>앞은 어느 쪽일까요?</h3>
          <p>
            바닥의 <strong>파란 삼각형</strong>이 가리키는 쪽이{" "}
            <strong>앞</strong>이에요. 이 방향을 기준으로 위·앞·오른쪽 모양을
            비교해요.
          </p>
        </div>
        <div className={styles.answerControl}>
          <Button
            variant="secondary"
            disabled={!ready}
            aria-expanded={showAnswer}
            aria-controls={answerId}
            onClick={() => setShowAnswer((value) => !value)}
          >
            {showAnswer ? "정답 닫기" : "정답 보기"}
          </Button>
          <div id={answerId} hidden={!showAnswer} className={styles.answer}>
            {showAnswer ? (
              <>
                <strong>모두 12개예요.</strong>
                <p>1층 8개, 2층 3개, 3층 1개를 더해요.</p>
                <p>8 + 3 + 1 = 12</p>
              </>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}

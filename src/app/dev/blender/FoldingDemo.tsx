"use client";

import type { ModelViewerElement } from "@google/model-viewer";
import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";

import styles from "./blender.module.css";

const MODEL_URL = "/dev/blender-assets/cuboid-fold.glb";
const DEFAULT_ORBIT = "25deg 65deg 105%";
// The authored flat net is in XY, facing +Z, despite the GLB being Y-up.
const TOP_ORBIT = "0deg 90deg 105%";
const FOLD_TIME_MS = 6000;
const LOAD_TIMEOUT_MS = 30000;

let modelViewerLoad: Promise<unknown> | undefined;

function loadModelViewer() {
  if (customElements.get("model-viewer")) return Promise.resolve();
  // Share initialization across Strict Mode effects and concurrent mounts;
  // custom elements can only be registered once in a document.
  return (modelViewerLoad ??= import("@google/model-viewer").catch(
    (error: unknown) => {
      modelViewerLoad = undefined;
      throw error;
    },
  ));
}

type LoadState = "loading" | "ready" | "error";
type Direction = "fold" | "unfold";

export function FoldingDemo() {
  const mountRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<ModelViewerElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const percentRef = useRef(0);
  const reducedMotionRef = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [percent, setPercent] = useState(0);
  const [playing, setPlaying] = useState<Direction | null>(null);
  const [announcement, setAnnouncement] =
    useState("전개도를 불러오는 중입니다.");
  const sliderId = useId();
  const hintId = useId();

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
    // The exported clip loops at exactly duration. Keep its final pose just
    // inside the clip while presenting the completed fold as 100%.
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
      setAnnouncement("전개도를 불러오지 못했습니다. 다시 시도해 주세요.");
    };

    const onLoad = () => {
      if (disposed || failed || !viewer) return;
      if (
        !viewer.availableAnimations.includes("Fold") ||
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
      seek(0);
      viewer.jumpCameraToGoal();
      setLoadState("ready");
      setAnnouncement("전개도가 준비되었습니다. 접기 버튼으로 시작하세요.");
    };

    const onMotionChange = () => {
      reducedMotionRef.current = media.matches;
      if (viewer) viewer.interpolationDecay = media.matches ? 0 : 50;
      if (media.matches) {
        stopPlayback();
        setAnnouncement(
          `접힌 정도 ${Math.round(percentRef.current)}%에서 멈췄습니다.`,
        );
      }
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        stopPlayback();
        setAnnouncement(
          `접힌 정도 ${Math.round(percentRef.current)}%에서 멈췄습니다.`,
        );
      }
    };
    const timeout = window.setTimeout(fail, LOAD_TIMEOUT_MS);
    media.addEventListener("change", onMotionChange);
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Import only after this route's client component mounts. No CDN script,
    // root-layout import, or custom-element registration runs during SSR.
    loadModelViewer()
      .then(() => {
        if (disposed || failed) return;
        viewer = document.createElement("model-viewer");
        viewer.className = styles.model;
        viewer.setAttribute(
          "alt",
          "4 cm × 3 cm × 2 cm 직육면체의 접을 수 있는 전개도",
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
        viewer.animationName = "Fold";
        viewer.animationCrossfadeDuration = 0;
        viewer.autoplay = false;
        viewer.cameraOrbit = DEFAULT_ORBIT;
        viewer.cameraTarget = "0m 0m 0m";
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
            "마우스, 터치 또는 방향키로 도형을 돌려 보세요.",
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
          "Blender lesson could not initialize its model viewer.",
          String(error),
        );
        fail();
      });

    return () => {
      disposed = true;
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
    if (reducedMotionRef.current) {
      seek(target);
      setAnnouncement(
        target === 100
          ? "직육면체를 모두 접었습니다."
          : "전개도를 모두 펼쳤습니다.",
      );
      return;
    }

    const from = percentRef.current;
    const duration = (FOLD_TIME_MS * Math.abs(target - from)) / 100;
    if (duration === 0) return;
    let startedAt: number | null = null;
    setPlaying(target === 100 ? "fold" : "unfold");
    setAnnouncement(
      target === 100
        ? "직육면체를 접고 있습니다."
        : "전개도를 펼치고 있습니다.",
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
        setAnnouncement(
          target === 100
            ? "직육면체를 모두 접었습니다."
            : "전개도를 모두 펼쳤습니다.",
        );
      }
    };
    frameRef.current = requestAnimationFrame(tick);
  }

  function pause() {
    stopPlayback();
    setAnnouncement(
      `접힌 정도 ${Math.round(percentRef.current)}%에서 멈췄습니다.`,
    );
  }

  async function setView(top: boolean) {
    const viewer = viewerRef.current;
    if (!viewer || loadState !== "ready") return;
    if (top) {
      stopPlayback();
      seek(0);
    }
    viewer.cameraTarget = top ? "0m 0m -0.015m" : "0m 0m 0m";
    viewer.cameraOrbit = top ? TOP_ORBIT : DEFAULT_ORBIT;
    viewer.fieldOfView = "30deg";
    // Lit applies camera attributes asynchronously; jump after that update so
    // resetting a view also respects reduced motion.
    await viewer.updateComplete;
    if (viewerRef.current !== viewer) return;
    viewer.jumpCameraToGoal();
    setAnnouncement(
      top
        ? "전개도를 펼쳐 위에서 보고 있습니다."
        : "처음 시점으로 돌아왔습니다.",
    );
  }

  function retry() {
    stopPlayback();
    percentRef.current = 0;
    setPercent(0);
    setLoadState("loading");
    setAnnouncement("전개도를 다시 불러오는 중입니다.");
    setAttempt((value) => value + 1);
  }

  const ready = loadState === "ready";

  return (
    <section className={styles.demo} aria-label="전개도 접기 실험">
      <div className={styles.interactive}>
        <div className={styles.viewport} aria-busy={loadState === "loading"}>
          <div ref={mountRef} className={styles.modelMount} />
          {ready ? (
            <p className={styles.pose}>
              {playing === "fold"
                ? "접는 중"
                : playing === "unfold"
                  ? "펼치는 중"
                  : percent === 0
                    ? "펼친 전개도"
                    : percent === 100
                      ? "완성된 직육면체"
                      : "접는 과정"}
            </p>
          ) : (
            <div className={styles.loadMessage}>
              <p>
                {loadState === "error"
                  ? "전개도를 불러오지 못했어요."
                  : "전개도를 준비하고 있어요."}
              </p>
              {loadState === "error" ? (
                <>
                  <span>연결 상태를 확인한 뒤 다시 시도해 주세요.</span>
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
            드래그하거나 방향키로 돌려 보세요. 스크롤로 확대할 수 있어요.
          </p>
          <div className={styles.viewButtons}>
            <Button
              variant="ghost"
              disabled={!ready}
              onClick={() => void setView(false)}
            >
              시점 초기화
            </Button>
            <Button
              variant="ghost"
              disabled={!ready}
              onClick={() => void setView(true)}
            >
              전개도 위에서 보기
            </Button>
          </div>
        </div>

        <div className={styles.controls}>
          <div className={styles.playback}>
            <Button
              variant="ink"
              className={styles.playButton}
              disabled={!ready || (percent === 100 && !playing)}
              onClick={() => (playing === "fold" ? pause() : animateTo(100))}
            >
              <span aria-hidden="true">{playing === "fold" ? "Ⅱ" : "▶"}</span>
              {playing === "fold" ? "잠시 멈추기" : "접기"}
            </Button>
            <Button
              variant="secondary"
              className={styles.playButton}
              disabled={!ready || (percent === 0 && !playing)}
              onClick={() => (playing === "unfold" ? pause() : animateTo(0))}
            >
              {playing === "unfold" ? "잠시 멈추기" : "펼치기"}
            </Button>
          </div>

          <div className={styles.scrubber}>
            <div className={styles.sliderHeading}>
              <label htmlFor={sliderId}>접힌 정도</label>
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
              aria-valuetext={`${percent}% 접힘`}
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
                const value = Number(event.currentTarget.value);
                seek(value);
                setAnnouncement(`접힌 정도 ${value}%에서 멈췄습니다.`);
              }}
            />
            <div className={styles.rangeEnds} aria-hidden="true">
              <span>펼치기</span>
              <span>접기</span>
            </div>
          </div>
        </div>
        <p className={styles.controlHint}>
          막대를 움직이면 원하는 순간에 멈춰 볼 수 있어요.
        </p>
        <p
          className={styles.srOnly}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {announcement}
        </p>
      </div>
      <div className={styles.printExplanation}>
        <Image
          src="/dev/blender-assets/cuboid-numbered-net.svg"
          alt="파란 면 1과 6, 초록 면 2와 4, 노란 면 3과 5가 표시된 직육면체 전개도. 점선은 접는 모서리입니다."
          width={280}
          height={280}
          loading="eager"
          unoptimized
        />
        <p>
          직육면체의 전개도는 여섯 개의 직사각형으로 이루어져 있습니다. 점선을
          따라 접으면 같은 색의 두 면이 서로 마주 보는 직육면체가 됩니다.
        </p>
      </div>
    </section>
  );
}

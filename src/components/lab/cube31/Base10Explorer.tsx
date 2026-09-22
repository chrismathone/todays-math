"use client";

import { useId, useState } from "react";

import { LabModelViewer } from "../LabModelViewer";
import styles from "./Base10Explorer.module.css";

const VIEWS = [
  { id: "overview", label: "비스듬히 보기", orbit: "20deg 38deg 110%" },
  { id: "top", label: "위에서 세어 보기", orbit: "0deg 0deg 110%" },
  { id: "front", label: "앞에서 보기", orbit: "0deg 75deg 110%" },
];

/** Optional exploration: the arithmetic board works before this viewer loads. */
export default function Base10Explorer({
  reducedMotion = false,
  initialOpen = false,
}: {
  reducedMotion?: boolean;
  initialOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [percent, setPercent] = useState(0);
  const contentId = useId();
  const headingId = useId();
  const pose =
    percent === 0
      ? "낱개와 막대로 풀어 놓았어요"
      : percent === 100
        ? "10개씩 모아 묶음을 만들었어요"
        : "10개씩 모으는 중이에요. 전체 값은 같아요";

  return (
    <section className={styles.explorer} aria-labelledby={headingId}>
      <div className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>수 모형 관찰</p>
          <h3 id={headingId}>10개를 모으면 무엇이 될까요?</h3>
          <p>1이 10개면 10, 10이 10개면 100이에요.</p>
        </div>
        <button
          className={styles.toggle}
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "수 모형 닫기" : "수 모형 열기"}
        </button>
      </div>
      <div id={contentId} hidden={!open}>
        {open ? (
          <div className={styles.content}>
            <div className={styles.values}>
              <p>
                <span className={styles.one} aria-hidden="true" />
                <strong>왼쪽 · 10</strong>
                <span>낱개 10개 ↔ 십 모형 1개</span>
              </p>
              <p>
                <span className={styles.ten} aria-hidden="true" />
                <strong>오른쪽 · 100</strong>
                <span>십 모형 10개 ↔ 백 모형 1개</span>
              </p>
            </div>
            <LabModelViewer
              src="/lab/models/base10-exchange.glb"
              animationName="Base10Exchange"
              alt="왼쪽은 초록색 낱개 10개가 모여 십 모형이 되고, 오른쪽은 노란색 십 모형 10개가 모여 백 모형이 되는 수 모형"
              percent={percent}
              onPercent={setPercent}
              defaultOrbit="20deg 38deg 110%"
              cameraTarget="0m 0.01m 0m"
              views={VIEWS}
              reducedMotion={reducedMotion}
              poseLabel={pose}
            />
            <div className={styles.direction} aria-hidden="true">
              <span>← 풀어 놓기</span>
              <span>10개씩 묶기 →</span>
            </div>
            <p className={styles.explanation} aria-live="polite">
              {pose}. 묶거나 풀어도 왼쪽은 <strong>10</strong>, 오른쪽은{" "}
              <strong>100</strong>이에요.
            </p>
            <p className={styles.hint}>
              손잡이를 오른쪽으로 움직여 묶고, 왼쪽으로 움직여 다시 풀어 보세요.{" "}
              {reducedMotion
                ? "움직임 줄이기에서는 풀린 모습과 묶인 모습을 바로 바꿔 볼 수 있어요."
                : "키보드 방향키로도 움직일 수 있어요."}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

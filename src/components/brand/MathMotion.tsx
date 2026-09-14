import styles from "./MathMotion.module.css";

/** Playback starts only on request, so reduced-motion and slow connections stay still. */
export default function MathMotion() {
  return (
    <figure className={styles.motion}>
      <video
        controls
        loop
        muted
        playsInline
        preload="none"
        poster="/brand/math-motion-poster.webp"
        width={720}
        height={720}
        aria-label="수학 교구가 펼쳐지는 짧은 입체 영상"
      >
        <source src="/brand/math-motion.webm" type="video/webm" />
        <source src="/brand/math-motion.mp4" type="video/mp4" />
        <a href="/brand/math-motion.mp4">수학 교구 영상 보기</a>
      </video>
      <figcaption>
        <span>수학을 펼치는 순간</span>
        <span>재생해서 살펴보세요 ↗</span>
      </figcaption>
    </figure>
  );
}

import styles from "./LandingPage.module.css";

export function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h15m-6-6 6 6-6 6"}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Geometry({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 300 220"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M28 180H275M63 203V20" stroke="#b7c8c7" strokeWidth="1" />
      <circle cx="155" cy="112" r="77" fill="#d7ebe1" />
      <path
        d="m62 176 91-135 96 135H62Z"
        stroke="#3159df"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M153 41v135"
        stroke="#3159df"
        strokeWidth="1.5"
        strokeDasharray="5 6"
      />
      <path d="M153 161h15v15" stroke="#3159df" strokeWidth="1.5" />
      <path d="M62 176c13 0 25-7 32-19" stroke="#3159df" strokeWidth="1.5" />
      <g
        fill="#172b4d"
        fontFamily="Georgia, serif"
        fontSize="17"
        fontStyle="italic"
      >
        <text x="147" y="29">
          A
        </text>
        <text x="45" y="192">
          B
        </text>
        <text x="254" y="192">
          C
        </text>
        <text x="124" y="119">
          h
        </text>
      </g>
      <g fill="#3159df">
        <circle cx="153" cy="41" r="4" />
        <circle cx="62" cy="176" r="4" />
        <circle cx="249" cy="176" r="4" />
      </g>
    </svg>
  );
}

/** Original paper composition, also usable when no generated hero asset is supplied. */
export function DeskIllustration() {
  return (
    <div className={styles.deskIllustration} aria-hidden="true">
      <div className={styles.deskCircle} />
      <div className={styles.backPaper}>
        <span>생각을 잇는 수학</span>
        <span>∑</span>
      </div>
      <div className={styles.heroPaper}>
        <div className={styles.paperEyebrow}>
          오늘 수학 <span>LESSON 01</span>
        </div>
        <div className={styles.paperTitle}>
          닮음에서 찾은
          <br />
          새로운 시선
        </div>
        <div className={styles.paperRule} />
        <p className={styles.paperQuestion}>
          <b>01</b> 다음 삼각형의 넓이를 구하시오.
        </p>
        <Geometry className={styles.heroGeometry} />
        <div className={styles.answerLine}>
          나의 풀이 <span />
        </div>
        <div className={styles.answerLine}>
          <span />
        </div>
      </div>
      <div className={styles.deskRuler}>
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <span className={styles.deskStar}>✳</span>
      <div className={styles.deskNote}>
        좋은 문제에
        <br />
        <b>선생님의 생각을 더해요.</b>
      </div>
    </div>
  );
}

export function ImportIllustration() {
  return (
    <div className={`${styles.stepArt} ${styles.importArt}`} aria-hidden="true">
      <div className={styles.importSheet}>
        <span>수학 · 연습 문제</span>
        <i />
        <i />
        <strong>x² + 2x − 3 = 0</strong>
        <i />
        <i />
      </div>
      <div className={styles.cropArea}>
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className={styles.fileTag}>
        PDF <span>·</span> 이미지
      </div>
    </div>
  );
}

export function ReviewIllustration() {
  return (
    <div className={`${styles.stepArt} ${styles.reviewArt}`} aria-hidden="true">
      <div className={styles.reviewSheet}>
        <span className={styles.reviewLabel}>문항 검토</span>
        <div className={styles.equation}>
          x² + <span>2x</span> − 3 = 0
        </div>
        <div className={styles.reviewLine}>
          <span>수식</span>
          <b>직접 다듬기</b>
        </div>
        <div className={styles.reviewLine}>
          <span>도형</span>
          <b>확인하고 편집</b>
        </div>
      </div>
      <span className={styles.editPencil}>↗</span>
    </div>
  );
}

export function ComposeIllustration() {
  return (
    <div
      className={`${styles.stepArt} ${styles.composeArt}`}
      aria-hidden="true"
    >
      <div className={styles.finishedSheet}>
        <div>
          오늘의 학습지 <span>수학</span>
        </div>
        <div className={styles.miniQuestions}>
          <span>
            <b>01</b>
            <i />
            <i />
            <em>∠ABC</em>
          </span>
          <span>
            <b>02</b>
            <i />
            <i />
            <em>x² + 2x</em>
          </span>
          <span>
            <b>03</b>
            <i />
            <i />
          </span>
          <span>
            <b>04</b>
            <i />
            <i />
          </span>
        </div>
      </div>
      <div className={styles.readyTag}>
        수업에 맞게, 한 장으로 <Arrow />
      </div>
    </div>
  );
}

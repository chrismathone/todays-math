import type { ReactNode } from "react";
import styles from "./auth.module.css";

export function AuthExperience({ children }: { children: ReactNode }) {
  return (
    <div className={styles.experience}>
      <aside className={styles.editorial} aria-label="오늘 수학 작업실 소개">
        <div className={styles.editorialHeading}>
          <p className={styles.artEyebrow}>TODAY’S MATH · TEACHER’S WORKROOM</p>
          <h2>
            좋은 수업의 시작,
            <br />
            <span>선생님의 한 장.</span>
          </h2>
          <p>
            떠오른 아이디어가 수업이 되는 곳.
            <br />
            오늘도, 선생님만의 수학을 펼쳐 보세요.
          </p>
        </div>
        <div className={styles.art} aria-hidden="true">
          <svg viewBox="0 0 560 390" fill="none" focusable="false">
            <ellipse
              cx="290"
              cy="327"
              rx="217"
              ry="27"
              fill="#172b4d"
              opacity=".2"
            />
            <path d="M35 239h53M61 213v53" stroke="#efd57a" strokeWidth="9" />
            <circle cx="461" cy="91" r="57" fill="#efd57a" />
            <circle cx="461" cy="91" r="29" fill="#3159df" />
            <path d="m420 253 84-81 25 112z" fill="#d7ebe1" />
            <path d="m447 258 45-44 14 61z" fill="#3159df" />
            <g transform="translate(101 53) rotate(-9 145 125)">
              <rect
                x="13"
                y="22"
                width="266"
                height="284"
                rx="7"
                fill="#172b4d"
              />
              <rect
                x="6"
                y="11"
                width="266"
                height="284"
                rx="7"
                fill="#d7ebe1"
              />
              <rect width="266" height="284" rx="7" fill="#f7f5ef" />
              <path d="M27 33h122M27 46h73" stroke="#172b4d" strokeWidth="5" />
              <path d="M27 69h212" stroke="#172b4d" opacity=".25" />
              <circle cx="213" cy="38" r="16" fill="#efd57a" />
              <path d="M205 38h16M213 30v16" stroke="#172b4d" strokeWidth="3" />
              <path
                d="M35 107h81M35 119h54M35 181h77M35 193h60M35 236h153M35 248h125"
                stroke="#172b4d"
                opacity=".45"
                strokeWidth="3"
              />
              <path
                d="m163 191 35-84 38 84z"
                fill="#d7ebe1"
                stroke="#172b4d"
                strokeWidth="2"
              />
              <path d="M198 107v84" stroke="#172b4d" strokeDasharray="4 4" />
              <circle cx="163" cy="191" r="4" fill="#3159df" />
              <circle cx="198" cy="107" r="4" fill="#3159df" />
              <circle cx="236" cy="191" r="4" fill="#3159df" />
            </g>
            <g transform="translate(290 199) rotate(9 90 57)">
              <rect
                x="5"
                y="7"
                width="185"
                height="114"
                rx="6"
                fill="#172b4d"
                opacity=".35"
              />
              <rect width="185" height="114" rx="6" fill="#efd57a" />
              <path d="M22 23h53M22 35h83" stroke="#172b4d" strokeWidth="3" />
              <path
                d="M21 87h142M38 52v46M79 52v46M120 52v46M162 52v46"
                stroke="#172b4d"
                opacity=".18"
              />
              <path
                d="M31 85c36 0 24-37 63-20s40 11 65-14"
                stroke="#3159df"
                strokeWidth="4"
              />
              <circle cx="94" cy="65" r="5" fill="#3159df" />
              <circle cx="159" cy="51" r="5" fill="#3159df" />
            </g>
            <g transform="translate(53 327) rotate(-30)">
              <rect width="179" height="12" rx="3" fill="#efd57a" />
              <path d="m179 0 23 6-23 6z" fill="#f7f5ef" />
              <path d="m195 4 7 2-7 2z" fill="#172b4d" />
              <path d="M13 0v12" stroke="#172b4d" strokeWidth="5" />
            </g>
            <path
              d="m68 77 8-17 8 17 17 8-17 8-8 17-8-17-17-8z"
              fill="#d7ebe1"
            />
          </svg>
          <span className={styles.artNote}>생각을 모아, 수업 한 장.</span>
        </div>
        <div className={styles.editorialFooter}>
          <span>문제 선택</span>
          <i>→</i>
          <span>학습지 편집</span>
          <i>→</i>
          <span>수업 준비</span>
        </div>
      </aside>
      <section className={styles.formPanel}>{children}</section>
    </div>
  );
}

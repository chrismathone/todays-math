import type { ReactNode } from "react";

import { MathText } from "@/components/math/MathText";
import {
  SHEET_PART_LABELS,
  type SheetHeader,
} from "@/contracts/conceptBlank.contract";

import { SHEET_CODE_LINE_CAPACITY } from "./paginate";
import styles from "./paper.module.css";
import {
  blankTail,
  blankWidth,
  formatSheetDate,
  inkEm,
  splitSentence,
} from "./text";

/**
 * 개념 백지 지면 공통 조각 — 머리 · 간소 머리 · 발 · 수식 글 · 빈칸. 훅이 없다(서버 인쇄 페이지에서도 그린다).
 */

/**
 * 지면 글 한 조각 — `$...$` 이 있으면 제품 수식 경로(`MathText` — 시험지 · 문제은행과 같은 렌더러)로,
 * 없으면 글 그대로. 앞뒤 띄어쓰기는 `MathText` 밖에 둔다(마크다운이 조각 끝 공백을 지운다 — `ExplorerMath` 와 같은 까닭).
 */
export function PaperText({ text }: { text: string }) {
  if (!text.includes("$")) return <>{text}</>;
  const lead = /^\s*/.exec(text)![0];
  const trail = /\s*$/.exec(text.slice(lead.length))![0];
  return (
    <>
      {lead}
      <MathText text={text.slice(lead.length, text.length - trail.length)} />
      {trail}
    </>
  );
}

/** 학생이 채우는 밑줄 빈칸 — 길이는 핵심어의 보이는 폭에 비례(수식 핵심어는 마크업이 아니라 그려지는 폭). */
export function Blank({ answer, width }: { answer?: string; width?: number }) {
  return (
    <span
      aria-label="빈칸"
      className={styles.blank}
      data-cb-blank=""
      style={{ width: width ?? (answer ? blankWidth(answer) : 64) }}
    />
  );
}

/**
 * 학생지 — 핵심어 자리를 빈칸으로. 빈칸 뒤에 띄어쓰기 없이 붙은 조사 · 마침표(`blankTail`)는 빈칸과 한 줄에 묶는다 —
 * 빈칸이 줄 끝에 닿아도 «.» 이나 «를» 만 다음 줄로 떨어지지 않는다(쪽 나누기 어림 `sentenceAtoms` 도 같은 묶음으로 센다).
 */
export function BlankSentence({ sentence }: { sentence: string }) {
  const pieces = splitSentence(sentence);
  return (
    <>
      {pieces.map((piece, i) => {
        if (piece.kind === "text") {
          const tail =
            pieces[i - 1]?.kind === "key" ? blankTail(piece.text) : "";
          const rest = piece.text.slice(tail.length);
          return rest ? <PaperText key={i} text={rest} /> : null;
        }
        const next = pieces[i + 1];
        const tail = next?.kind === "text" ? blankTail(next.text) : "";
        return tail ? (
          <span className={styles.keep} data-cb-keep="" key={i}>
            <Blank answer={piece.text} />
            {tail}
          </span>
        ) : (
          <Blank answer={piece.text} key={i} />
        );
      })}
    </>
  );
}

/**
 * 채점표 — 핵심어를 굵게. 핵심어도 수식을 품을 수 있어(`{$\frac{\sqrt{3}}{2}$}`) 글 조각과 같은 수식 경로로 그린다 —
 * 수식은 둘레 글의 굵기를 물려받는다(`paper.module.css` `.page .katex`).
 */
export function KeySentence({ sentence }: { sentence: string }) {
  return (
    <>
      {splitSentence(sentence).map((piece, i) =>
        piece.kind === "key" ? (
          <b data-cb-keyword="" key={i}>
            <PaperText text={piece.text} />
          </b>
        ) : (
          <PaperText key={i} text={piece.text} />
        ),
      )}
    </>
  );
}

/** 형식별 영문 라벨 · 제목 앞말 · 목표 · 쓰는 법(우리 말 — 시안의 문구를 다듬었다). */
export const FORM_FACE = {
  recall: {
    label: "CONCEPT RECALL",
    prefix: "개념 백지",
    goal: "교재를 덮고, 이 단원에서 배운 뜻과 성질을 기억나는 대로 모두 적는다.",
  },
  term: {
    label: "CONCEPT RECALL",
    prefix: "개념 백지",
    goal: "용어를 보고 뜻을 문장으로 쓴다.",
  },
  cloze: {
    label: "CONCEPT RECALL",
    prefix: "개념 백지",
    goal: "뜻 문장에서 빠진 말을 채우고, 방금 쓴 뜻으로 까닭을 설명한다.",
  },
  map: {
    label: "CONCEPT MAP",
    prefix: "개념 지도",
    goal: "가운데서 뻗은 가지를 채워 단원 한 장을 스스로 완성한다.",
  },
  figure: {
    label: "FIGURE RECALL",
    prefix: "그림 보고 쓰기",
    goal: "그림의 빈 이름표를 채우고, 그림이 보여 주는 뜻과 성질을 문장으로 쓴다.",
  },
} as const satisfies Record<
  SheetHeader["form"],
  { label: string; prefix: string; goal: string }
>;

/** 지면 제목 — «개념 백지 · 합동과 대칭». 원장님이 쓴 제목에 앞말이 이미 있으면 겹쳐 쓰지 않는다. */
export function sheetTitle(header: SheetHeader): string {
  const prefix = FORM_FACE[header.form].prefix;
  return header.title.includes(prefix)
    ? header.title
    : `${prefix} · ${header.title}`;
}

/**
 * 제목 글씨 단계 — 긴 제목은 줄여 머리가 두 줄을 넘지 않게(쪽 나누기 어림이 머리 높이를 고정으로 본다).
 * 단계 이름만 준다 — 크기는 머리(`.title`) · 채점표 머리(`.keyHead h3`)가 제 CSS 로 정한다.
 */
export function titleSizeClass(title: string): string | undefined {
  const em = inkEm(title);
  if (em <= 19) return undefined;
  return em <= 23 ? styles.titleMid : styles.titleSmall;
}

const titleClass = (title: string) =>
  [styles.title, titleSizeClass(title)].filter(Boolean).join(" ");

/** 첫 장 머리(05 §8.5) — 오늘의수학 · 영문 라벨 · 제목 · 목표 | 학습일 · 이름/반 · 단원. */
export function SheetHead({
  header,
  label,
  goal,
}: {
  header: SheetHeader;
  label?: string;
  goal?: string;
}) {
  const face = FORM_FACE[header.form];
  const date = formatSheetDate(header.date);
  return (
    <header className={styles.head} data-cb-head="first">
      <div className={styles.headMain}>
        <div className={styles.brand}>오늘 수학</div>
        <div className={styles.kicker}>{label ?? face.label}</div>
        <h2 className={titleClass(sheetTitle(header))}>{sheetTitle(header)}</h2>
        <div className={styles.goal}>{goal ?? face.goal}</div>
      </div>
      <div className={styles.headSide}>
        <div className={styles.sideLabel}>학습일</div>
        <div className={styles.sideDate}>
          {date ?? <span className={styles.dateBlank} />}
        </div>
        <div className={styles.nameLine}>
          <b>이름</b>
          <span className={styles.nameBlank} />
          <span aria-hidden="true"> · </span>
          <b>반</b>
          <span className={styles.classBlank} />
        </div>
        <div className={styles.unit}>{header.unitLabel}</div>
      </div>
    </header>
  );
}

/** 이어지는 장의 간소 머리 — «오늘의수학 · 제목» + p. N. */
export function ContinuationHead({
  header,
  page,
  suffix,
}: {
  header: SheetHeader;
  page: number;
  suffix?: string;
}) {
  return (
    <header className={styles.miniHead} data-cb-head="next">
      <span>
        <b>오늘 수학</b> · {sheetTitle(header)}
        {suffix ? ` · ${suffix}` : ""}
      </span>
      <span className={styles.pageNo}>p. {page}</span>
    </header>
  );
}

/** 발 — 첫 장은 맞은 개수 칸 · 오늘의 메모 · p. N, 이어지는 장은 메모 줄만(쪽 번호는 간소 머리에). */
export function SheetFoot({ tally, page }: { tally?: string; page: number }) {
  return (
    <footer className={styles.foot} data-cb-foot="">
      {tally ? <span className={styles.tally}>{tally}</span> : null}
      <b className={styles.memo}>오늘의 메모</b>
      <span className={styles.dash} />
      {page === 1 ? <span>p. 1</span> : null}
    </footer>
  );
}

/** 코드의 글자 수(점 뺀 것). */
const codeSymbols = (code: string) => code.replace(/\./g, "").length;

/**
 * 지면 코드 줄(트랙 cb-code) — 학생지 · 채점표 모든 장의 맨 아래 «코드 · 쪽/전체쪽 · 학생지|채점표».
 * 사진 채점이 장을 찾는 열쇠다: 같은 코드 안에서 «쪽 · 몫»이 장 하나를 가리킨다(쪽은 몫마다 형식을 넘어 센다).
 * 코드는 지면을 가리킬 뿐 학생을 가리키지 않는다(`sheetCode.ts`). 정원을 넘으면 «코드 없음»(`data-cb-code=""`).
 */
export function SheetCodeLine({
  code,
  page,
  total,
  part,
}: {
  code: string;
  page: number;
  total: number;
  part: keyof typeof SHEET_PART_LABELS;
}) {
  const printed = codeSymbols(code) <= SHEET_CODE_LINE_CAPACITY;
  return (
    <div
      className={styles.codeLine}
      data-cb-code={printed ? code : ""}
      data-cb-code-page={page}
    >
      {printed ? <span className={styles.code}>{code}</span> : "코드 없음"} ·{" "}
      {page}/{total} · {SHEET_PART_LABELS[part]}
    </div>
  );
}

/** 쓰는 법 상자(금색 테두리). */
export function HowTo({ children }: { children: ReactNode }) {
  return <div className={styles.howto}>{children}</div>;
}

/**
 * 교과서 자료의 **책 · 자료 메타데이터**를 폴더 · 파일 이름에서 읽는다 (D-161, 2026-10-07).
 *
 * 원장님 2026-10-07: 「출판사 학년 학기 단원 유형 등 모든 곳에 메타데이터가 있어야 문제은행을 이용하기 용이함」.
 *
 *   G:\중등교과서\중1\천재교육 중학 수학1 (김동재) (22개정)-005-003\평가자료\… - 형성평가\중_수학1(김동재)_형성평가_1-1-1_1회_문제.hwp
 *                    └ 책 폴더: 출판사 · 저자                                └ 자료: 종류 · 단원 번호 · 회차
 *
 * ## 읽는 규칙은 «실제 이름»에서 왔다
 *
 * 출판사마다 이름 짓는 법이 다르다 — `1-1-1` · `Ⅰ_1_01` · `2_1` · `1단원` · `(2-3단원)` · `_2_`. 규칙을 머리로 짓지 않고
 * G드라이브의 이름(책 44권 · 자료 폴더 180여 개)을 늘어놓고 그 꼴을 받게 했다. 시험(`schoolTextbookSourceMeta.test.ts`)의
 * 예가 전부 실제 이름이다.
 *
 * ## 모르면 지어내지 않는다
 *
 * - 모르는 출판사는 **던진다** — 조용히 «기타»가 되면 그 책의 문항이 엉뚱한 책에 붙는다.
 * - 단원 번호 · 회차 · 학기는 이름에 없으면 `null` 이다. 책 이름 · 교육과정 · 쪽수의 숫자(`22개정` · `수학1` · `10쪽`)를
 *   단원 번호로 읽지 않는다.
 * - 자료 종류를 못 읽으면 `기타` 이고, 출판사가 부른 이름(`kindRaw`)에는 자료가 든 폴더 이름을 적는다.
 *
 * ⚠️ 여기의 단원 번호는 **교과서의** 번호다 — 우리 차시 번호와 다르다. 문항의 차시는 본문을 보고 따로 붙인다.
 */
import type {
  SourceBookInput,
  SourceMaterialInput,
  SourceMaterialKind,
} from "@/contracts/sourceMaterial.contract";

/** 책 폴더 이름의 머리 → 출판사의 정본 표기. 폴더에는 오타(`YMB`)와 다른 이름(`비상교과서` · `와이비엠`)이 섞여 있다. */
const PUBLISHERS: ReadonlyArray<readonly [RegExp, string]> = [
  [/^천재교육/, "천재교육"],
  [/^미래엔/, "미래엔"],
  [/^비상(?:교과서|교육)/, "비상교육"],
  [/^동아출판/, "동아출판"],
  [/^지학사/, "지학사"],
  [/^교학사/, "교학사"],
  [/^NE\s*능률/i, "NE능률"],
  [/^(?:YBM|YMB|와이비엠)/i, "YBM"],
];

/** 폴더의 과목 이름 → 우리 차시 목록의 학년 키(`Unit.grade`). */
const GRADE_KEY: Readonly<Record<string, string>> = {
  확률과통계: "확률과 통계",
};
/** 학년 키 → 책 제목. 고등은 과목 이름이 곧 책 제목이다. */
const TITLE_OF: Readonly<Record<string, string>> = {
  중1: "중학 수학1",
  중2: "중학 수학2",
  중3: "중학 수학3",
};

export function parseSourceBook(input: {
  bookFolder: string;
  grade: string;
  /** 교육과정 고시 연도 — G드라이브의 자료는 전부 2022 개정이다. */
  curriculum?: string;
}): SourceBookInput {
  const folder = input.bookFolder.trim();
  const publisher = PUBLISHERS.find(([pattern]) => pattern.test(folder))?.[1];
  if (!publisher) {
    throw new Error(
      `출판사를 모르는 책 폴더다: «${folder}» — PUBLISHERS 에 더할 것`,
    );
  }
  // 괄호 안의 한글 이름 — «(22개정)» 은 이름이 아니다
  const author =
    Array.from(folder.matchAll(/\(\s*([가-힣]{2,4})\s*\)/g))
      .map((match) => match[1]!)
      .find((name) => !name.includes("개정")) ?? null;
  const grade = GRADE_KEY[input.grade] ?? input.grade;
  const curriculum = input.curriculum ?? "2022";
  return {
    externalKey: `${curriculum}/${publisher}/${grade}/${author ?? "-"}`,
    kind: "school_textbook",
    publisher,
    author,
    title: TITLE_OF[grade] ?? grade,
    grade,
    curriculum,
  };
}

/**
 * 출판사가 부른 이름 → 우리 자료 종류. **앞에 있는 것이 이긴다** — 「쌍둥이 문제 Ⅱ-1-중단원 마무리」는 쌍둥이 문제이고
 * 「대단원 기출 모의고사」는 대단원 평가가 아니라 시험 대비다. 그래서 좁은 뜻(목적)이 넓은 뜻(범위)보다 앞에 선다.
 * 띄어쓰기는 있어도 없어도 받는다(`대단원평가` · `대단원 평가`).
 */
const KIND_PHRASES: ReadonlyArray<readonly [string, SourceMaterialKind]> = [
  ["쌍둥이 문제", "쌍둥이 문제"],
  ["쌍둥이", "쌍둥이 문제"],
  ["대단원 기출 모의고사", "시험 대비"],
  ["기출 모의고사", "시험 대비"],
  ["중간기말 대비 문제", "시험 대비"],
  ["중간기말 대비", "시험 대비"],
  ["중간 기말 대비", "시험 대비"],
  ["시험대비문제집", "시험 대비"],
  ["중간고사", "시험 대비"],
  ["기말고사", "시험 대비"],
  ["실전 테스트", "시험 대비"],
  ["대단원 서술형 평가", "서술형 평가"],
  ["서술형 평가", "서술형 평가"],
  ["서술형 문제", "서술형 평가"],
  ["수행 과제", "수행 과제"],
  ["진단 평가", "진단 평가"],
  ["준비 학습지", "진단 평가"],
  ["계산력 강화 문제", "기초 연산"],
  ["기초력 UP 문제", "기초 연산"],
  ["기초력 TEST", "기초 연산"],
  ["기초 연산", "기초 연산"],
  ["기초 다지기", "기초 연산"],
  ["연산 학습지", "기초 연산"],
  ["5분 TEST", "기초 연산"],
  ["소단원 형성 평가", "형성 평가"],
  ["형성 평가", "형성 평가"],
  ["중단원 최소 성취수준 평가", "수준별 문제"],
  ["최소성취수준 보충 문제", "수준별 문제"],
  ["중단원 수준별 문제", "수준별 문제"],
  ["소단원 수준별 문제", "수준별 문제"],
  ["수준별 문제", "수준별 문제"],
  ["대단원 도전 문제", "수준별 문제"],
  ["도전 문제", "수준별 문제"],
  ["실력 UP 문제", "수준별 문제"],
  // 동아 «해결해요 1_3 기본 · 발전» — 수준을 갈라 낸 문제집이다(수준은 파일 이름 끝의 «기본 · 발전»)
  ["해결해요", "수준별 문제"],
  ["보충[,_]? 심화 문제", "수준별 문제"],
  ["중단원 평가 문제", "중단원 평가"],
  ["중단원 평가", "중단원 평가"],
  ["중단원 마무리", "중단원 평가"],
  ["중단원 문제", "중단원 평가"],
  ["소단원 평가 문제", "소단원 평가"],
  ["소단원 확인 문제", "소단원 평가"],
  ["소단원 종합 문제", "소단원 평가"],
  ["소단원 평가", "소단원 평가"],
  ["소단원 학습지", "소단원 평가"],
  ["소단원 마무리", "소단원 평가"],
  ["소단원 확인하기", "소단원 평가"],
  ["소단원 문제", "소단원 평가"],
  ["대단원 평가 문제", "대단원 평가"],
  ["대단원 종합 문제", "대단원 평가"],
  ["대단원 마무리 문제", "대단원 평가"],
  ["대단원 마무리", "대단원 평가"],
  ["대단원 TEST", "대단원 평가"],
  ["대단원 평가", "대단원 평가"],
  ["단원 마무리", "대단원 평가"],
  ["단원 평가", "대단원 평가"],
  ["문제 NOTE", "수업 자료"],
  ["활동지", "수업 자료"],
  ["교과서", "수업 자료"],
  ["학습지", "수업 자료"],
];
const KIND_PATTERNS = KIND_PHRASES.map(
  ([phrase, kind]) =>
    [new RegExp(phrase.replace(/ /g, "\\s*"), "i"), kind] as const,
);

/** 단원 이름이 아닌 말 — 번호 뒤에 이런 말이 오면 그것은 자료의 이름이다. */
const NOT_A_UNIT_NAME =
  /평가|문제|학습지|마무리|테스트|TEST|과제|다지기|쌍둥이|연산|확인|종합|도전|교과서|활동지|NOTE|형성|진단|대비|고사|단원$/i;

const ROMAN = "ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ";
const toNumber = (token: string): number =>
  ROMAN.includes(token) ? ROMAN.indexOf(token) + 1 : Number(token);

/** 번호 앞에 오면 안 되는 글자(낱말 · 숫자의 일부) — 번호는 낱말의 머리에서 시작한다. */
const HEAD = "(?:^|[^0-9A-Za-z가-힣ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ])";
const N = `([${ROMAN}]|\\d{1,2})`;
const SEP = "\\s*[-_.]\\s*";
const THREE_LEVELS = new RegExp(
  `${HEAD}${N}${SEP}(\\d{1,2})${SEP}(\\d{1,2})(?!\\d)`,
);
const TWO_LEVELS = new RegExp(`${HEAD}${N}${SEP}(\\d{1,2})(?!\\d|${SEP}\\d)`);
/** `1단원` · `4_단원 평가` — 「소단원 · 중단원 · 대단원」의 단원이 아니라 숫자 바로 뒤의 단원 */
const CHAPTER_WORD = /(\d{1,2})\s*_?\s*단원/;
const ROMAN_ALONE = new RegExp(`${HEAD}([${ROMAN}])(?=[_.\\s)]|$)`);
/** `_2_방정식과부등식` — 밑줄 사이에 홀로 선 수. 파일 일련번호(`_01_YBM…`)가 앞에 있어 **마지막 것**을 쓴다 */
const BETWEEN_UNDERSCORES = /_(\d{1,2})(?=_)/g;

interface UnitNumbers {
  chapterNo: number | null;
  middleNo: number | null;
  sectionNo: number | null;
  /** 번호가 끝난 자리 — 그 뒤의 글이 단원 이름이다 */
  end: number | null;
}

function readUnitNumbers(scrubbed: string): UnitNumbers {
  const three = THREE_LEVELS.exec(scrubbed);
  if (three) {
    return {
      chapterNo: toNumber(three[1]!),
      middleNo: Number(three[2]),
      sectionNo: Number(three[3]),
      end: three.index + three[0].length,
    };
  }
  const two = TWO_LEVELS.exec(scrubbed);
  if (two) {
    return {
      chapterNo: toNumber(two[1]!),
      middleNo: Number(two[2]),
      sectionNo: null,
      end: two.index + two[0].length,
    };
  }
  const word = CHAPTER_WORD.exec(scrubbed);
  if (word) {
    return {
      chapterNo: Number(word[1]),
      middleNo: null,
      sectionNo: null,
      end: word.index + word[0].length,
    };
  }
  const roman = ROMAN_ALONE.exec(scrubbed);
  if (roman) {
    return {
      chapterNo: toNumber(roman[1]!),
      middleNo: null,
      sectionNo: null,
      end: roman.index + roman[0].length,
    };
  }
  const between = Array.from(scrubbed.matchAll(BETWEEN_UNDERSCORES)).pop();
  if (between) {
    return {
      chapterNo: Number(between[1]),
      middleNo: null,
      sectionNo: null,
      end: (between.index ?? 0) + between[0].length,
    };
  }
  return { chapterNo: null, middleNo: null, sectionNo: null, end: null };
}

/** 단원 번호가 아닌 숫자를 같은 길이의 빈칸으로 가린다 — 자리(index)가 어긋나지 않게. */
function scrub(title: string): string {
  const blank = (match: string) => " ".repeat(match.length);
  return title
    .replace(/\d{4}\s*학년도/g, blank)
    .replace(/\d{2}\s*개정/g, blank)
    .replace(/(?:공통수학|수학|미적분)\s*[ⅠⅡ12]/g, blank)
    .replace(/\(\s*\d+\s*-\s*\d+\s*회\s*\)/g, blank)
    .replace(/\d+\s*회/g, blank)
    .replace(/\d+\s*쪽/g, blank)
    .replace(/p\d+/gi, blank)
    .replace(/[12]\s*학기/g, blank)
    .replace(/\(\s*\d\s*\)/g, blank)
    .replace(/5\s*분/g, blank);
}

function readSequence(title: string): number | null {
  if (/\(\s*\d+\s*-\s*\d+\s*회\s*\)/.test(title)) return null; // «(1-5회)» — 여러 회가 한 파일에 있다
  const round = /(\d{1,2})\s*회/.exec(title);
  const bracket = /\(\s*(\d)\s*\)/.exec(title);
  const value = round ? Number(round[1]) : bracket ? Number(bracket[1]) : null;
  return value !== null && value >= 1 ? value : null;
}

export function parseSourceMaterial(input: {
  /** 원본 파일 경로 */
  path: string;
  /** 책 폴더 이름 — 그 아래가 자료의 폴더다 */
  bookFolder: string;
  /** 변환본의 이름(원본 경로의 sha1 앞 16자) */
  key: string;
}): SourceMaterialInput {
  const parts = input.path.split(/[\\/]/);
  const file = parts[parts.length - 1] ?? "";
  // 확장자가 두 번 붙은 파일이 있다(`….hwp.hwp`)
  const title = file.replace(/(?:\.hwpx?)+$/i, "").trim();
  const bookAt = parts.indexOf(input.bookFolder);
  const folders = parts.slice(bookAt + 1, -1);

  // 자료 종류 — 파일 이름에서 먼저, 없으면 자료가 든 폴더(안쪽부터)에서
  let kind: SourceMaterialKind = "기타";
  let kindRaw: string | null = null;
  for (const text of [title, ...folders.slice().reverse()]) {
    const hit = KIND_PATTERNS.map(
      ([pattern, value]) => [pattern.exec(text), value] as const,
    ).find(([match]) => match);
    if (hit) {
      kindRaw = hit[0]![0].replace(/\s+/g, " ").trim();
      kind = hit[1];
      break;
    }
  }
  kindRaw ??= (folders[folders.length - 1] ?? title).slice(0, 60);

  const scrubbed = scrub(title);
  const numbers = readUnitNumbers(scrubbed);
  let unitRaw: string | null = null;
  if (numbers.end !== null) {
    const name = /^[\s._]*([가-힣][가-힣A-Za-z0-9\s,·]*[가-힣])/
      .exec(scrubbed.slice(numbers.end))?.[1]
      ?.trim();
    if (name && !NOT_A_UNIT_NAME.test(name)) unitRaw = name.slice(0, 120);
  }

  const semester = /([12])\s*학기/.exec(title)?.[1];
  // «중간기말대비» 는 어느 쪽인지 말하지 않는다 — 둘 다 있으면 비운다
  const mid = title.includes("중간");
  const final = title.includes("기말");
  const level = /(?:^|[_\s])(기본|발전)$/.exec(title)?.[1] ?? null;

  return {
    externalKey: `tb-${input.key}`,
    kind,
    kindRaw,
    title: title.slice(0, 200),
    chapterNo: numbers.chapterNo,
    middleNo: numbers.middleNo,
    sectionNo: numbers.sectionNo,
    unitRaw,
    semester: semester ? (Number(semester) as 1 | 2) : null,
    round: mid && !final ? "중간" : final && !mid ? "기말" : null,
    levelRaw: level,
    sequence: readSequence(title),
    sourceFile: input.path.slice(0, 500),
  };
}

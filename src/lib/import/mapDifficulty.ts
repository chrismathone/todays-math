import type { Difficulty } from "@/contracts/common.contract";

/**
 * **바깥 자료의 난이도 표기를 우리 축으로 옮긴다** (D-106).
 *
 * ⚠️ 여기서 `"easy"`·`"mid"`·`"hard"`·`상/중/하` 는 **들어오는 글자**다 — 우리 값이
 *    아니다. 기출 시험지·RPM 교재·자작 시드가 저마다 쓰는 표기이고, 우리는 그것을
 *    읽기만 한다. 2026-08-25 에 우리 축이 4단(연산·기본·응용·심화)으로 바뀌었지만
 *    **입력 어휘는 그대로다.** 이 파일을 「옛 축이 남아 있다」고 읽고 지우지 마라.
 *
 * ## 왜 `연산` 이 안 나오나
 *
 * 바깥 자료는 「순수 계산」이라는 갈래를 **가른 적이 없다.** 상/중/하 세 칸과 배점밖에
 * 없는 자료에서 넷째 칸을 만들어 내면 그것은 측정이 아니라 지어냄이다. 그래서 이
 * 함수는 위 세 칸(기본·응용·심화)만 낸다 — 없는 것을 있다고 적지 않는다.
 * 「이 문항이 연산인가」는 발문을 보고 사람이 정하거나, 우리 엔진이 낼 때 스스로 안다.
 */

/** 자작 시드 1~10 → 기본/응용/심화 */
export function mapNumericDifficulty(value: number): Difficulty {
  if (value <= 3) return "기본";
  if (value <= 7) return "응용";
  return "심화하";
}

/** 배점 기반 휴리스틱 — 기출 문항의 difficulty 필드가 비어 있을 때. */
export function mapScoreToDifficulty(score: number | undefined): Difficulty {
  if (score === undefined) return "응용";
  if (score <= 3) return "기본";
  if (score >= 5) return "심화하";
  return "응용";
}

export function mapDifficultyLabel(
  raw: string | undefined,
  score?: number,
): Difficulty {
  const normalized = (raw ?? "").trim().toLowerCase();
  const first = normalized.split(/\s+/)[0] ?? "";
  if (
    first === "easy" ||
    first === "하" ||
    first === "low" ||
    first.startsWith("하")
  ) {
    return "기본";
  }
  if (
    first === "hard" ||
    first === "상" ||
    first === "high" ||
    first.startsWith("상")
  ) {
    return "심화하";
  }
  if (first === "mid" || first === "중" || first === "medium") {
    return "응용";
  }
  const asNumber = Number(raw);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    return mapNumericDifficulty(asNumber);
  }
  return mapScoreToDifficulty(score);
}

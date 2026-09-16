import type { ClassOwner } from "@/contracts/class.contract";
import { ownerTagText } from "@/lib/class/ownerLabel";

/**
 * **담당 딱지** — 반 이름 뒤 · 표의 «담당» 칸 (D-132 Hi-fi 3 «꼬리표» · 05 §8.11 표 그대로).
 *
 * 반 이름이 나오는 자리는 **전부 이 컴포넌트**를 쓴다 — 같은 뜻이 두 벌이면 한쪽만 고쳐진다.
 * 선택 상자(`<option>`)는 브라우저가 그려 딱지를 못 넣으므로 글자(`classOptionLabel`)를 쓴다.
 *
 *   장부 결   — 바탕 `--side` · 글자 `--ink` · 500 / 내 반은 먹색 바탕 · 흰 글자 · 700
 *   작업실 결 — 바탕 `#EEF1F5` · 글자 `#172B4D` / 내 반은 `#172B4D` 바탕 · 흰 글자 (오늘의 개념 판 · 작업실 개요)
 *   공통     — 11.5px · 줄높이 18px · 안쪽 1px 7px · 모서리 3px · 자간 0
 *
 * ⚠️ D-30: 딱지는 누르는 것이 아니다 — 손가락 커서·hover 를 두지 않는다. (메인 카드처럼 반을 고르는
 *    단추 **안에** 놓이면 커서는 그 단추의 것이다 — 누르면 실제로 그 반이 골라진다.)
 * ⚠️ CSS 모듈 화면에 둘 때: 모듈 규칙(층 밖)이 이 유틸리티(층 안)를 이긴다 — `.x > span` 같은
 *    규칙이 딱지 `<span>` 을 직접 겨누지 않게 둔다(`TeachingOverview` 의 `.count`).
 */
export type OwnerTagTone = "ledger" | "workroom";

const BASE =
  "inline-block shrink-0 whitespace-nowrap rounded-[3px] px-[7px] py-px text-[11.5px] leading-[18px] tracking-normal";

const TONE: Record<OwnerTagTone, { other: string; mine: string }> = {
  ledger: {
    other: "bg-side font-medium text-ink",
    mine: "bg-ink font-bold text-white",
  },
  workroom: {
    other: "bg-[#eef1f5] font-medium text-[#172b4d]",
    mine: "bg-[#172b4d] font-bold text-white",
  },
};

export function OwnerTag({
  owner,
  tone = "ledger",
  className,
}: {
  owner: ClassOwner;
  tone?: OwnerTagTone;
  /** 자리마다 다른 바깥 여백만 — 모양은 여기서 바꾸지 않는다 */
  className?: string;
}) {
  const look = owner.mine ? TONE[tone].mine : TONE[tone].other;
  return (
    <span
      data-owner-tag={owner.mine ? "mine" : "other"}
      className={`${BASE} ${look}${className ? ` ${className}` : ""}`}
    >
      {ownerTagText(owner)}
    </span>
  );
}

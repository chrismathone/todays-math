import { OwnerTag } from "@/components/ui/OwnerTag";
import type { ClassEntity } from "@/contracts/class.contract";
import type { UnitEntity } from "@/contracts/unit.contract";

import { adjacentUnitIds, unitSectionName } from "@/lib/main/unitLookup";

type Props = {
  classes: ClassEntity[];
  units: readonly Pick<UnitEntity, "id" | "section" | "orderIndex">[];
  selectedClassId: string;
  selectedUnitId: string | null;
  printedDays: number;
  unmodifiedRate: number;
  error: string | null;
  /** 화면에 보이는 차시(열람 위치)가 실제 기록된 진도와 달라 "진도 기록"이 의미 있는 상태인가. */
  canRecord: boolean;
  /**
   * 반 진도가 **없을 때**의 시작점 제안. null 이면 제안이 없거나 이미 진도가 있다.
   * 🔴 저장된 것이 아니다 — 그래서 화면이 「제안」이라고 **말해야** 한다.
   *    말하지 않으면 원장님이 기록된 진도로 읽고, 안 눌러도 된다고 생각한다.
   */
  suggestion: { unitId: string | null; agree: number; students: number } | null;
  onStep: (unitId: string) => void;
  onRecord: () => void;
};

/**
 * 차시이동 화살표 — 상자를 없애고 글자만 남긴다 (원장님 2026-08-26 「더 심플하게」).
 *
 * ⚠️ **누를 자리는 44px 를 그대로 유지한다.** 테두리는 장식이지만 `min-h-11 min-w-[44px]`
 *    는 손가락 표적이다 — 같이 지우면 화살표 글자 크기(약 14px)만 남아 못 누른다.
 * ⚠️ 비활성은 `opacity` 가 아니라 **색**으로 준다. 투명도는 그 요소의 **모든** 색 대비를
 *    한꺼번에 깎아서, 상자가 없어진 지금은 화살표가 배경에 묻힌다. 이 저장소가
 *    카드 흐림에서 이미 겪은 자리다(2026-08-18, 78% 만으로 4.5:1 아래로 내려갔다).
 */
const ARROW =
  "inline-flex min-h-11 min-w-[44px] items-center justify-center text-[17px] font-black text-ink hover:bg-side disabled:text-text-3 disabled:hover:bg-transparent";

export function ProgressPanel({
  classes,
  units,
  selectedClassId,
  selectedUnitId,
  printedDays,
  unmodifiedRate,
  error,
  canRecord,
  suggestion,
  onStep,
  onRecord,
}: Props) {
  const lesson = unitSectionName(selectedUnitId, units);
  const { prevId, nextId } = adjacentUnitIds(selectedUnitId, units);
  const picked = classes.find((c) => c.id === selectedClassId);

  // 배경이 원색 화이트가 된 뒤(2026-08-18) 회색 면이 큰 덩어리로 남아 겉돌았다
  // (원장님 지적 "여긴 여전히 회색톤인데"). 구역은 **3px 잉크 좌경계**가 이미 가르므로
  // 면은 물러난다 — 팔레트 「계기판」 설계 노트가 예고한 그 자리다.
  // 덤으로 패널 위 본문 대비가 5.11:1 → 6.21:1 로 올라간다.
  return (
    <aside className="w-[250px] shrink-0 border-l-[3px] border-ink bg-surface px-5 py-4">
      <h2 className="mb-2 border-t-[3px] border-ink pt-1.5 text-[10.5px] font-black tracking-[2.5px]">
        진도 입력
      </h2>
      <div className="text-[11.5px] leading-[2.1] text-[#4a4a48]">
        {/*
         * 반은 **왼쪽 목록에서 골라 온다** (원장님 확정 2026-08-26 — 「드롭다운으로 반
         * 선택을 없애고 클릭으로 원하는 반 먼저 액션」). 여기는 고른 결과를 **말하기만** 한다.
         *
         * ⚠️ 드롭다운을 없앴으니 이 이름이 **어느 반을 보고 있는지 말하는 유일한 자리**다.
         *    지우지 말 것 — 없으면 오른쪽 숫자들이 누구 것인지 알 수 없다.
         *    (완료된 반도 왼쪽에서 눌러 여기로 데려올 수 있다 — `DoneSummaryRow` 참조.)
         */}
        <span aria-label="선택한 반" className="block font-bold text-ink">
          {picked?.name ?? "—"}
          {/* 담당 — 서버가 실어 보낼 때만(관리자, D-132). 반 이름 바로 뒤 */}
          {picked?.owner ? (
            <OwnerTag owner={picked.owner} className="ml-1.5" />
          ) : null}
        </span>
        <span
          aria-label="현재 소단원"
          className={`mt-0.5 mb-2 block text-[13.5px] font-black ${
            lesson === "—" ? "text-faint" : "text-ink"
          }`}
        >
          {lesson}
        </span>
        <div className="mt-1 flex items-center gap-1">
          <button
            type="button"
            aria-label="이전 차시"
            disabled={!prevId}
            onClick={() => {
              if (prevId) onStep(prevId);
            }}
            className={`${ARROW} cursor-pointer disabled:cursor-not-allowed`}
          >
            &lt;
          </button>
          <span className="min-w-0 flex-1 text-center text-[10.5px] font-black tracking-[1.2px]">
            차시이동
          </span>
          <button
            type="button"
            aria-label="다음 차시"
            disabled={!nextId}
            onClick={() => {
              if (nextId) onStep(nextId);
            }}
            className={`${ARROW} cursor-pointer disabled:cursor-not-allowed`}
          >
            &gt;
          </button>
        </div>
        {suggestion?.unitId ? (
          <p className="mt-1 text-[11px] leading-[1.5] text-text-3">
            아직 반 진도가 없어{" "}
            <b className="text-ink">
              학생 {suggestion.students}명 중 {suggestion.agree}명
            </b>
            이 있는 차시를 보여 줍니다. 확인하고 아래 버튼으로 기록하십시오.
          </p>
        ) : null}
        {/* 차시이동 화살표는 "열람"만 한다(진도를 기록하지 않는다). 실제 진도 기록은 아래
            버튼으로 명시적으로 커밋한다 — 예전엔 화살표 클릭마다 진도가 쌓이는 버그가 있었다
            (원장 관찰, 2026-08-14). */}
        <button
          type="button"
          disabled={!canRecord}
          onClick={onRecord}
          className="mt-2 inline-flex min-h-11 w-full items-center justify-center bg-ink text-[12px] font-black text-canvas cursor-pointer disabled:cursor-not-allowed disabled:bg-side disabled:text-text-3"
        >
          이 차시로 진도 기록
        </button>
        {error ? <p className="mt-2 text-g-red-text">{error}</p> : null}
      </div>
      <h3 className="mt-5 mb-2 border-t-[3px] border-ink pt-1.5 text-[10.5px] font-black tracking-[2.5px]">
        이번 주
      </h3>
      <div className="flex gap-[18px]">
        <div>
          <div
            aria-label="이번 주 인쇄 일수"
            className="text-[26px] font-black leading-none tabular-nums text-g-blue"
          >
            {printedDays}
          </div>
          <div className="mt-1 text-[9.5px] font-extrabold tracking-[1.2px] text-faint">
            인쇄 일수
          </div>
        </div>
        <div>
          <div
            aria-label="이번 주 무수정 사용률"
            className="text-[26px] font-black leading-none tabular-nums text-g-blue"
          >
            {unmodifiedRate}
            <small className="text-[13px] font-extrabold text-faint">%</small>
          </div>
          <div className="mt-1 text-[9.5px] font-extrabold tracking-[1.2px] text-faint">
            무수정
          </div>
        </div>
      </div>
    </aside>
  );
}

/**
 * 오늘의 영어 2판 — 사용 권한 정책 (자료 개선 M0, docs/planning/english-material-upgrade-20261002.md §A-6 · §B).
 *
 * 규칙은 셋이다.
 *   1. 새로 들이는 자료의 처음 값은 `unknown` · 허락된 용도 없음.
 *   2. 어떤 용도든 `approved` **이고** 그 용도가 적혀 있을 때만 된다. `reference_only` 는 생성 입력 · 검색 색인 ·
 *      외부 모델 전송 · 배포의 허락이 아니다. 승인 하나로 전부 열리지 않는다.
 *   3. 요청이 보낸 권리 값은 믿지 않는다 — 들일 때 처음 값으로 되돌린다. 권리를 바꾸는 것은 소유 검사와 따로
 *      인가된 서버 명령(누가 · 언제 · 증빙을 남긴다)이고, 그 명령은 M1 에서 만든다.
 *
 * 🔴 M0 는 이 정책의 **계약과 시험**까지다. 지금 있는 영어 API 가 이 정책을 집행한다는 뜻이 아니다 —
 * 2판을 켜기 전에 서버의 모든 행위 경로(새 파생 생성 · 활성화 · 외부 전송 · 배포 출력)에 배선해야 한다.
 * 권한이 거둬져도 원문과 파생 세트를 지우거나 본문을 바꾸지 않는다 — 새 행위만 그때의 허락을 다시 본다.
 */
import type {
  EnglishV2Document,
  EnglishV2Rights,
  EnglishV2Use,
} from "@/contracts/englishV2.contract";

/** 새로 들이는 자료의 처음 값 */
export const ENGLISH_V2_INTAKE_RIGHTS: EnglishV2Rights = Object.freeze({
  rightsStatus: "unknown",
  allowedUses: [],
});

/** 이 용도가 지금 허락돼 있나 — `approved` 와 용도 둘 다 */
export function englishV2UseAllowed(
  rights: EnglishV2Rights,
  use: EnglishV2Use,
): boolean {
  return rights.rightsStatus === "approved" && rights.allowedUses.includes(use);
}

/**
 * 요청이 보낸 문서를 들일 때 — 권리 값을 처음 값으로 되돌린 복사본. 넣은 값은 고치지 않는다.
 * 출처 선언(`user_supplied`)은 그대로 둔다: 선언은 권리의 확인이 아니라 «누가 무슨 근거로 넣었나»의 기록이다.
 */
export function withIntakeRights(
  document: EnglishV2Document,
): EnglishV2Document {
  return {
    ...document,
    rights: { rightsStatus: "unknown", allowedUses: [] },
  };
}

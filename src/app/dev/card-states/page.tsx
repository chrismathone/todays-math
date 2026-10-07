import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { devPageVisible } from "@/lib/devPageAccess";
import { serializeProblem } from "@/lib/serializers";

import { CardStatesClient } from "./CardStatesClient";

/**
 * 문제 카드 **상태 표본** — UI-07 이 요구한 재확인 자료 (읽기 전용).
 *
 * ## 왜 필요한가
 *
 * 2026-09-07 디자인 리뷰의 UI-07 은 「주 행동과 관리 행동이 같은 무게로 보인다」인데,
 * 그 문서 자신이 **판단 전에 재확인하라**고 적었다 — 캡처가 «일반 문항» 하나뿐이라
 * **잠긴 문항 · 담김 · 처리 중** 상태를 본 적이 없다.
 *
 * 그 상태들은 실제로 버튼 구성을 바꾼다:
 *   · **승인·반려는 미승인 문항에만** 뜬다(`reviewStatus !== approved/rejected`).
 *     곧 승인된 문항의 카드에는 「담기 / 정답 및 해설 / 변형」 셋뿐이다.
 *   · **담김은 먹색 반전 + 글자 바뀜**(「✓ 담김」)이라 이미 뚜렷하다.
 *   · **잠긴 문항은 「담기」가 비활성**이고 사유가 **글자로** 옆에 붙는다(D-30 · 2026-09-07).
 *   · **처리 중(`busy`)** 이면 담기가 비활성이다.
 *
 * 그래서 「넷이 같은 무게」라는 관찰은 **미승인 문항**에서만 성립한다. 이 표본이
 * 그것을 눈으로 확인시켜 준다 — 결정은 그 다음이다.
 *
 * ⚠️ 읽기만 한다. 아무것도 안 바꾼다.
 */
export const dynamic = "force-dynamic";

export default async function CardStatesPage() {
  // 프록시가 `/dev/` 를 공개로 둔다 — production 에서는 **로그인한 원장에게만** 연다
  // (`src/lib/devPageAccess.ts`). 로그인 없는 요청은 DB 를 읽기 전에 여기서 끝난다.
  if (!(await devPageVisible({ directorOnly: true }))) notFound();

  /**
   * ⚠️ **필드 목록을 손으로 적지 않는다.** 처음에 `select` 를 손으로 썼다가 `choices`
   *    라는 없는 컬럼을 넣어 500 이 났다. 제품이 이미 `serializeProblem` 으로 계약
   *    모양을 만드니 **그것을 그대로 쓴다** — 목록이 두 벌이면 컬럼이 바뀐 날 갈린다.
   *
   * 세 부류를 **실데이터에서** 뽑는다. 지어낸 문항으로 그리면 길이·보기 수·그림이
   * 실제와 달라서, 「같은 무게로 보이나」라는 물음 자체가 다른 화면에서 답해진다.
   */
  const [approved, pending, locked] = await Promise.all([
    db.problem.findFirst({
      where: { reviewStatus: "approved", directUseAllowed: true },
      orderBy: { problemCode: "asc" },
    }),
    db.problem.findFirst({
      where: { reviewStatus: "pending" },
      orderBy: { problemCode: "asc" },
    }),
    db.problem.findFirst({
      where: { reviewStatus: "approved", directUseAllowed: false },
      orderBy: { problemCode: "asc" },
    }),
  ]);

  return (
    <CardStatesClient
      approved={approved ? serializeProblem(approved) : null}
      pending={pending ? serializeProblem(pending) : null}
      locked={locked ? serializeProblem(locked) : null}
    />
  );
}

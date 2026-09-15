import { notFound } from "next/navigation";
import { connection } from "next/server";

import { ConceptHifiClient } from "./ConceptHifiClient";

/**
 * «오늘의 개념» 원장님 화면 — **실제 작업실 껍데기 · 실제 컴포넌트 · 실제 교육과정 735차시**로
 * 그린 시안 확인 페이지(05 §8.9 시안 1안과 나란히 캡처하려고).
 *
 * 데이터는 `fixture.ts`(시안 1안의 반 12 · 강의 7편을 시드 전량 위에 제품과 같은 조립으로 지은 것)이고,
 * `/api/concept/**` 요청만 이 페이지 안에서 가로채 그 픽스처로 답한다 — **DB 를 읽지도 쓰지도 않는다**
 * (브리프 §1.4: 공유 DB 에 시험용 강의를 넣지 않는다).
 *
 *   ?stress=1  반 스물다섯(가장 긴 반 이름 · 진도 없는 반 · 마지막 차시 반)
 *   ?admin=0   관리자가 아닌 원장 계정(단추 대신 «관리자만 바꿀 수 있습니다»)
 *   ?views=0   학생 시청 기록 없음(빈 상태 문구)
 *   ?embed=1   유튜브 임베드를 켠다(가짜 영상 ID 라 기본은 끈다)
 *
 * 이웃 dev 페이지(`dev/basket-hifi` 등)와 **같은 가드**다 — 없으면 프로덕션에 프리렌더된다.
 */
export default async function ConceptHifiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_RENDER_QA !== "1"
  ) {
    notFound();
  }
  const params = await searchParams;
  const flag = (key: string) =>
    Array.isArray(params[key]) ? params[key][0] : params[key];
  return (
    <ConceptHifiClient
      options={{
        stress: flag("stress") === "1",
        canEdit: flag("admin") !== "0",
        views: flag("views") !== "0",
      }}
      embed={flag("embed") === "1"}
    />
  );
}

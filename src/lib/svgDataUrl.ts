/**
 * SVG 한 장 → `data:image/svg+xml;charset=utf-8,…`. SVG 데이터 주소를 짓는 곳은 이 함수 하나다
 * (`svgDataUrl.test.ts` 가 따로 짓는 자리를 센다).
 *
 * 🔴 `encodeURIComponent` 는 `( ) ' ! * ~` 를 그대로 둔다. 계정 저장(`privateCloudClient.externalize`)은 마크다운
 *    `![](…)`·CSS `url(…)` 문맥 때문에 주소를 첫 `)`·`'` 에서 끊어 읽는다 — 조판한 라벨의
 *    `transform="rotate(…) translate(…)"` 첫 `)` 에서 잘린 앞부분만 자산으로 올라가고 꼬리가 문자열에 남아,
 *    다시 열면 «blob 주소 + 꼬리» → `net::ERR_FILE_NOT_FOUND` 였다(원장님 운영 콘솔 2026-09-19).
 *    RFC 3986 의 예약 문자 `! ' ( ) *` 까지 인코딩한다(`~` 는 예약 문자가 아니고 끊는 자리도 아니다).
 */
export const svgDataUrl = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  )}`;

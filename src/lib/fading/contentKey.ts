import { normalizeChipText, type FadingTrap } from "./chips";
import { fadingConceptDigest, type FadingConcept } from "./concepts";
import { fnv1a } from "./random";

/**
 * 풀이 내용의 지문과 풀이의 토큰 — 은행의 문장이 고쳐진 뒤에 옛 화면의 요청을 알아보려고.
 *
 * 칩의 번호(`c1` …)는 «그 단계의 답 + 함정»을 씨앗으로 섞은 자리다(`chips.ts`). 은행의 문장이나 함정 표가 바뀌면 같은 번호가
 * 다른 칩이 되고, 서버가 옛 화면의 넣기를 다시 돌리면 409 없이 다른 틀림으로 적용될 수 있다(«아직 모르겠어요»).
 * 그래서 화면에 내려가는 풀이 번호는 저장된 번호가 아니라 **«저장 번호 + 그때의 내용 지문»에서 지은 토큰**이다(`view.ts`).
 * 서버는 지금 내용으로 같은 토큰을 지어 견주고(`actions.ts`), 다르면 409 — 화면은 상태를 다시 읽어 새 토큰으로 이어 간다.
 * 요청 · 응답의 꼴은 그대로다(토큰도 UUID 다). 은행을 부르지 않는다 — 화면과 서버가 같은 함수를 쓴다.
 */

const hex8 = (n: number) => n.toString(16).padStart(8, "0");

/** 내용 지문 — «개념 지문(8)-함정 지문(8)». 함정 표만 바뀌어도 칩 번호가 바뀌므로 함정까지 덮는다. */
export function fadingContentKey(
  concept: FadingConcept,
  traps: readonly FadingTrap[] = [],
): string {
  const trapText = traps.map((trap) => normalizeChipText(trap.text)).join("\n");
  return `${fadingConceptDigest(concept)}-${hex8(fnv1a(trapText))}`;
}

/**
 * 풀이의 토큰 — 저장 번호와 내용 지문에서 짓는 UUID(v8). 같은 둘이면 언제나 같고, 하나만 달라도 달라진다.
 * 저장 번호는 v4(`randomUUID`)라 토큰과 겹치지 않는다 — 토큰 이전의 화면이 보내는 저장 번호는 토큰으로 읽히지 않는다.
 * 비밀이 아니다(제 풀이의 번호다) — 내용이 바뀐 것을 알아보는 표지일 뿐이다.
 */
export function fadingSessionToken(
  sessionId: string,
  contentKey: string,
): string {
  const h = [0, 1, 2, 3]
    .map((i) => hex8(fnv1a(`${i}|${sessionId}|${contentKey}`)))
    .join("");
  const variant = ((parseInt(h[16]!, 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-8${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

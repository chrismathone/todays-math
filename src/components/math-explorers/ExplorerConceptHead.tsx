"use client";

import { conceptKind } from "@/lib/math-explorers/conceptKinds";
import { ExplorerMath } from "./ExplorerMath";
import c from "./concept-head.module.css";

/**
 * 갈래 딱지(정의 · 성질 · 공식 · 방법 · 법칙 · 정리 · 단위) — 원장님 2026-09-28 Hi-fi 4안(05 §8.19 · D-143).
 * 풀이 · 작업실 · 도감 카드 · 첫 장이 모두 이 하나를 쓴다(«모든 화면 일치»). 표에 없는 카드면 그리지 않는다.
 * 누르는 것이 아니다(D-30) — 글자(span)이고 화면 읽기에는 «대입법 · 방법»으로 읽힌다(글 흐름은 sr-only 가운뎃점,
 * 제목은 `conceptHeadingLabel` 의 이름표).
 */
export function ConceptKindTag({
  cardId,
  large = false,
}: {
  cardId: string;
  large?: boolean;
}) {
  const kind = conceptKind(cardId);
  if (!kind) return null;
  return (
    <>
      <span className="sr-only"> · </span>
      <span
        className={c.kindTag}
        data-size={large ? "title" : undefined}
        data-concept-kind={kind}
      >
        {kind}
      </span>
    </>
  );
}

/**
 * 제목(문장 조립 · 뜻 만나기 · 도감 카드)의 화면 읽기 이름 «대입법 · 방법». 글 흐름의 sr-only 가운뎃점은 앞뒤 빈칸이
 * 이름 계산에서 깎여 «대입법·방법»이 된다(절대 배치 상자의 끝 빈칸 — jsdom · 브라우저 모두). 제목은 제목 탐색으로
 * 따로 읽히므로 이름표로 못 박는다. 갈래가 없는 카드면 이름표 없이 글자 그대로.
 */
export function conceptHeadingLabel(cardId: string, name: string) {
  const kind = conceptKind(cardId);
  return kind ? `${name} · ${kind}` : undefined;
}

/**
 * 이름 줄 — 지금 머리 줄(12px 파란 이름) 자리에 이름 + 갈래 딱지, 오른쪽에 활동 이름.
 * `title` 이면 이름이 제목 크기의 h2(정의 조립 — 조작 안내 제목이 없다), 아니면 제목(카드 문장) 위의 줄(div).
 */
export function ConceptNameRow({
  cardId,
  name,
  side,
  title = false,
}: {
  cardId: string;
  name: string;
  side: string;
  title?: boolean;
}) {
  // 제목이 아닐 때는 p 가 아니라 div — 수식이 든 이름(y절편 · 삼각형의 SSS 합동 …)은 `MathText` 가 div 를 내어
  // p 안에 들어가면 태그 중첩(수화) 경고가 난다(실제 화면 실측 fit 에서 잡힘).
  const Name = title ? "h2" : "div";
  return (
    <div
      className={c.row}
      data-size={title ? "title" : undefined}
      data-concept-row=""
    >
      <Name
        className={c.name}
        aria-label={title ? conceptHeadingLabel(cardId, name) : undefined}
      >
        <span data-concept-name="">
          <ExplorerMath text={name} />
        </span>
        <ConceptKindTag cardId={cardId} large={title} />
      </Name>
      <span className={c.side}>{side}</span>
    </div>
  );
}

export const conceptHead = c;

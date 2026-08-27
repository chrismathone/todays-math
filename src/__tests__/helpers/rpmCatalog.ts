/**
 * RPM 유형 색인 정본 조회 — **「이 유형이 RPM 것인가, 우리가 지은 것인가」** 한 곳.
 *
 * 왜 한 곳인가: 2026-08-27 부터 갈래 넷이 130소단원을 10유형으로 올리면서 기존
 * 모듈에 **색인에 없는 «확장 유형»** 을 더한다. 그러면 「자기 모듈만 훑는다」로
 * 좁혀 둔 시험들이 다시 남의 유형을 자기 검산표에 들이대게 된다 — 실제로
 * `middleM2`·`middleM2Func`·`middleM2Geo` 세 파일에서 70건이 빨개졌다.
 * 몫을 「색인에 있는가」로 한 번 더 좁혀야 하는데, 그 판정을 세 파일이 각자
 * 적으면 **목록이 세 벌**이 된다(이 저장소가 여러 번 값을 치른 자리다).
 *
 * ⚠️ 색인은 **읽기만** 한다. 우리가 지은 유형을 색인에 적어 넣으면 이 판정이
 *    「우리가 적은 것과 우리가 등록한 것이 같은가」를 묻는 동어반복이 된다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

export type CatalogType = { minor: string; number: string; title: string };

type Catalog = Record<string, { types: CatalogType[] }>;

let cached: Catalog | null = null;

function catalog(): Catalog {
  if (cached === null) {
    cached = JSON.parse(
      readFileSync(
        path.resolve(process.cwd(), "scripts/rpm/rpm-type-catalog.json"),
        "utf-8",
      ),
    ) as Catalog;
  }
  return cached;
}

export type TypeRef = { rpmBook: string; rpmMinor: string; rpmType: string };

/** 그 책의 그 중단원에 있는 색인 유형 전부 — 없는 중단원이면 빈 배열. */
export function catalogTypesOfMinor(
  book: string,
  minor: string,
): CatalogType[] {
  return (catalog()[book]?.types ?? []).filter((t) => t.minor === minor);
}

/** 색인에 이 번호가 있으면 그 항목, 없으면 `undefined`. */
export function catalogHit(e: TypeRef): CatalogType | undefined {
  return catalogTypesOfMinor(e.rpmBook, e.rpmMinor).find(
    (t) => t.number === e.rpmType,
  );
}

/** RPM 색인에 있는 유형인가 — 시험이 자기 몫을 고를 때 쓴다. */
export function isCatalogType(e: TypeRef): boolean {
  return catalogHit(e) !== undefined;
}

/**
 * 그 중단원 색인 번호의 최댓값. 확장 유형은 이 값을 **넘어야** 한다 —
 * 번호대 안이면 확장이 아니라 오타이고, RPM 이 그 번호를 쓰는 날 겹친다.
 * 색인에 없는 중단원이면 `null`(그 자체가 결함이므로 부르는 쪽이 판단한다).
 */
export function catalogMaxNumber(book: string, minor: string): number | null {
  const types = catalogTypesOfMinor(book, minor);
  if (types.length === 0) return null;
  return Math.max(...types.map((t) => Number(t.number)));
}

/**
 * **확장 유형의 번호가 옳은가** — 그르면 까닭을, 옳으면 `null` 을 낸다.
 *
 * 지키려는 것은 하나다: **RPM 이 나중에 그 번호를 쓰는 날 겹치지 않는가.**
 * 그 목적을 채우는 꼴이 둘이고, 둘 다 받는다.
 *
 *   ⑴ **순수 숫자 · 색인 최댓값 초과** — `11`·`17` (갈래 B·C·D 가 쓴 꼴)
 *   ⑵ **색인 번호 + 영문 한 글자** — `12A`·`07A` (갈래 A 가 쓴 꼴)
 *
 * ⑵ 를 받는 까닭: **RPM 색인 번호는 숫자뿐**이라 글자가 붙은 번호는 영영 안
 * 겹친다. 목적으로 보면 ⑴ 보다 오히려 세다 — ⑴ 은 RPM 이 유형을 늘리면
 * 언젠가 따라잡히지만 ⑵ 는 그럴 수 없다. 그리고 ⑵ 는 「색인 12번 곁에 지은
 * 것」이라는 **뜻까지** 담는다.
 *
 * 🔴 종전에는 이 규칙이 세 시험 파일에 **따로** 적혀 있었고 셋 다 `Number()` 로만
 *    봤다. 그래서 `Number("12A") = NaN` 이 「번호대 안이다 — 오타로 보인다」로
 *    읽혔다(갈래 A 병합 실측). 규칙이 여러 벌이면 한쪽만 고쳐도 아무도 모른다 —
 *    그래서 **여기 한 곳**에 둔다.
 */
export function extensionNumberReason(e: TypeRef): string | null {
  const maxNo = catalogMaxNumber(e.rpmBook, e.rpmMinor);
  if (maxNo === null)
    return `색인에 없는 중단원이다: ${e.rpmBook}|${e.rpmMinor}`;

  const suffixed = /^(\d+)[A-Z]$/.exec(e.rpmType);
  if (suffixed) return null; // ⑵ 글자가 붙었다 — 색인 번호와 절대 안 겹친다

  const plain = /^\d+$/.test(e.rpmType) ? Number(e.rpmType) : null;
  if (plain === null)
    return `번호 꼴이 «숫자» 도 «숫자+영문 한 글자» 도 아니다: ${e.rpmType}`;
  if (plain <= maxNo)
    return `색인 번호대(최대 ${maxNo}) 안이다 — 확장이 아니라 오타로 보인다`;
  return null;
}

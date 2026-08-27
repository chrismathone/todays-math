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

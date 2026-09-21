/**
 * 수학 랩실 코드가 부르는 사이트 주소를 **전부** 뽑는 자 (트랙 53).
 *
 * 쓰는 곳 둘 — labStaticAddresses.test.ts(전부 `/lab` 아래인가 · 파일이 있는가)와
 * proxyLabGate.test.ts(그 파일들을 역할 일곱이 진짜 관문으로 받는가).
 *
 * 랩실 코드(src/components/lab · src/app/lab · src/lib/lab)의 문자열에서 `/` 로 시작하는 주소를 뽑는다.
 * 파일 주소만 보면 `const DIR = "/dev/x"` 처럼 확장자 없는 뿌리를 놓치므로 화면 링크까지 다 본다.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export const REPO_ROOT = path.resolve(import.meta.dirname, "../../..");
const LAB_CODE = ["src/components/lab", "src/app/lab", "src/lib/lab"];
const SOURCE = /\.(tsx?|css|json|m?js)$/;

/** 문자열 한 편에서 사이트 뿌리 주소를 모두 — 따옴표 셋과 따옴표 없는 CSS `url()`. */
export function rootAddresses(text: string): string[] {
  const patterns = [
    /"(\/[A-Za-z0-9_][^"\n]*)"/g,
    /'(\/[A-Za-z0-9_][^'\n]*)'/g,
    /`(\/[A-Za-z0-9_][^`\n]*)`/g,
    /url\(\s*(\/[A-Za-z0-9_][^)"'\s]*)\s*\)/g,
  ];
  return patterns.flatMap((re) => [...text.matchAll(re)].map((m) => m[1]));
}

function walk(dir: string): string[] {
  return readdirSync(path.join(REPO_ROOT, dir), {
    withFileTypes: true,
  }).flatMap((entry) => {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return walk(rel);
    return SOURCE.test(entry.name) ? [rel] : [];
  });
}

/** 랩실 코드 파일 전부(저장소 기준 경로). */
export function labCodeFiles(): string[] {
  return LAB_CODE.flatMap(walk);
}

/** 랩실 코드가 적은 사이트 주소 전부 — 어느 파일에서 나왔는지와 같이. */
export function labRootAddresses(): { file: string; address: string }[] {
  return labCodeFiles().flatMap((file) =>
    rootAddresses(readFileSync(path.join(REPO_ROOT, file), "utf8")).map(
      (address) => ({ file, address }),
    ),
  );
}

/** 마지막 조각에 확장자가 있으면 파일 주소다. 조립 주소(`${…}`)는 파일을 못 짚으니 뺀다. */
export function fileAddress(address: string): string | null {
  const bare = address.split(/[?#]/)[0];
  return !bare.includes("${") && /\.[a-z0-9]{2,5}$/i.test(bare) ? bare : null;
}

/** 랩실 코드가 부르는 파일 주소 — 겹침 없이. */
export function labFileAddresses(): string[] {
  return [
    ...new Set(
      labRootAddresses().flatMap(({ address }) => fileAddress(address) ?? []),
    ),
  ].sort();
}

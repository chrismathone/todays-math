/**
 * 변이 하네스용 표본 — 48유형을 고정 씨앗으로 찍어 한 줄씩 낸다.
 *
 * 하네스(`mutate-m2-numprob.sh`)가 **변이 전후 산출물이 실제로 달라졌는지**
 * 를 이걸로 본다. 파일이 바뀌어도 산출물이 같으면 «동작을 안 바꾸는 변이»이고,
 * 그때 시험이 초록인 것은 가드가 없다는 뜻이 아니다 (2026-08-21 교훈).
 *
 * 표본은 넓게 잡는다 — 씨앗 하나만 찍으면 그 씨앗이 안 밟는 가지의 변이가
 * 「산출물 그대로」로 잘못 찍힌다.
 */
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../src/lib/middle/generate";

const MINE = new Set(["유리수와 순환소수", "경우의 수", "확률"]);

for (const e of registeredTypes()) {
  if (!MINE.has(e.rpmMinor)) continue;
  for (let variant = 0; variant < 8; variant += 1) {
    let line: string;
    try {
      const p = generateMiddleProblem(e.key, 20260823, variant);
      line = [
        e.key,
        variant,
        p.content.replace(/\n/g, " ⏎ "),
        p.answer,
        JSON.stringify(p.facts),
        p.figureSpec ? JSON.stringify(p.figureSpec) : "-",
      ].join(" | ");
    } catch (err) {
      line = `${e.key} | ${variant} | THROW ${(err as Error).message}`;
    }
    console.log(line);
  }
}

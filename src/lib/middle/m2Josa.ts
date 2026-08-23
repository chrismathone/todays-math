/**
 * 수 뒤에 붙는 조사 — 한국어 수 읽기의 끝 글자 받침으로 가른다.
 *
 * 끝 자리가 2(이)·4(사)·5(오)·9(구)면 모음으로 끝나고, 0(십/백/천/만의 받침 포함)·
 * 1(일)·3(삼)·6(육)·7(칠)·8(팔)이면 받침으로 끝난다. 끝 자리가 0이면 마지막으로
 * 읽는 글자가 십·백·천·만이라 항상 받침이다. 음수는 절댓값과 같게 읽힌다.
 */
function vowelFinal(n: number): boolean {
  const d = Math.abs(n) % 10;
  return d === 2 || d === 4 || d === 5 || d === 9;
}

/** 목적격 조사: $2$를 · $3$을 */
export function eulReul(n: number): "을" | "를" {
  return vowelFinal(n) ? "를" : "을";
}

/** 접속 조사: $2$와 · $3$과 */
export function waGwa(n: number): "와" | "과" {
  return vowelFinal(n) ? "와" : "과";
}

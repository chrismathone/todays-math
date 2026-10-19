/**
 * 작업: 오늘의 영어 «사진에서 글 읽기» — **새로 짓지 않는다.** 이미 있는 `scripts/qa/english-read-bench/`
 * (사진 11장 · 기준 글 · 흠 채점 `score.mjs`)로 돌린다. 이 파일은 그 도구를 부르는 명령을 만들어 줄 뿐이다.
 *
 * 자료(학생 이름이 든 사진)는 저장소 밖에 있다 — 문서 25번 §13.9:
 * `D:\worktree-archive\todays-math-english-read-bench-20261006\`. 그 폴더가 없는 컴퓨터에서는 «자료 없음»으로 끝낸다.
 * 그 도구의 팔은 구독 CLI(claude · agy) 중심이다. 딥시크 flash 같은 API 팔을 더하려면 그 도구의 ARMS 에 한 줄을 더한다
 * (사진 읽기 지시문은 `dump-prompt.ts` 가 제품 것을 그대로 뽑는다).
 */
import { existsSync } from "node:fs";

export function englishReadCommand(photos: string | undefined, out: string, arms: string[]) {
  if (!photos || !existsSync(photos))
    return {
      available: false as const,
      reason: `사진 자료 폴더가 없습니다(${photos ?? "--photos 미지정"}). 문서 25번 §13.9 의 저장소 밖 자료가 필요합니다.`,
    };
  return {
    available: true as const,
    commands: [
      `node --import tsx scripts/qa/english-read-bench/dump-prompt.ts ${out}`,
      `node scripts/qa/english-read-bench/run.mjs --photos ${photos} --out ${out} --arms ${arms.join(",")}`,
      `node scripts/qa/english-read-bench/score.mjs ${out}`,
    ],
  };
}

import { createHash } from "node:crypto";
import path from "node:path";

/**
 * 중등 조합 판정기가 쓰는 **저장소 밖 자리**.
 *
 * 🔴 전에는 `C:/tmp/middle-combo/` 를 통째로 썼다. 그런데 이 저장소는 오르카
 *    다중 세션이 기본이라 워크트리가 넷씩 돌고, 넷이 **같은 파일 하나**를
 *    번갈아 덮었다. 실제로 그렇게 났다 —
 *
 *      입력 분모 불일치: 등록 920 / live 873 / census 920
 *
 *    자기 워크트리의 `registeredTypes()` 는 920 인데 말뭉치는 옆 워크트리가
 *    16:32 에 873 으로 다시 만들어 둔 것이었다. 판정기는 «내 코드가 틀렸다»고
 *    말하지만 실제로는 **남의 산출물을 보고 있었다.** 그리고 이 빨강은 관문을
 *    막으므로, 며칠만 이러면 다음 사람은 훅을 우회한다 —
 *    **늘 우는 가드는 꺼진다**(2026-08-20).
 *
 * 그래서 자리를 **워크트리마다 가른다.** 이름만으로는 못 가른다(워크트리 이름이
 * 겹칠 수 있다) — 절대 경로를 해시로 섞는다. 그래도 사람이 어느 자리인지
 * 알아볼 수 있게 앞에 폴더 이름을 붙인다.
 *
 * ⚠️ `process.cwd()` 를 쓴다. 이 스크립트들은 늘 저장소 뿌리에서 돈다
 *    (`run-tests.mjs` · `sweep-elem-probes.mjs` · npm 스크립트). 뿌리가 아닌
 *    자리에서 부르면 자리가 갈리므로, 그때는 `--corpus=` 로 명시할 것.
 */
export const COMBO_DIR = (() => {
  const root = process.cwd();
  const slug = path.basename(root).replace(/[^A-Za-z0-9._-]/g, "_") || "repo";
  const hash = createHash("sha1")
    .update(root.toLowerCase())
    .digest("hex")
    .slice(0, 8);
  return `C:/tmp/middle-combo/${slug}-${hash}`;
})();

export const COMBO_CORPUS = `${COMBO_DIR}/corpus.json`;
export const COMBO_VOCAB = `${COMBO_DIR}/solution-vocab2.json`;
export const COMBO_JSON = `${COMBO_DIR}/classifications2.json`;
export const COMBO_REPORT = `${COMBO_DIR}/classify-report2.md`;

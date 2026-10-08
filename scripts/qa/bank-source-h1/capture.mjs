/**
 * 문제은행 «출처 고르기» H1 실구현 캡처 — 시안(`/dev/bank-source-hifi` H1)과 나란히 견주는 PNG (D-161).
 *
 * 실제 화면(`/dev/unified#bank` — 작업실의 문제은행, 운영 `/#bank` 와 같은 `BankView`)을 띄우고
 * 목록 · 수 요청만 브라우저에서 가로채 **공유 DB 에서 센 수**(리드 시안 fixtures, 2026-10-08 오후 —
 * `counts-20261008.json`)로 채운다. DB · 로그인 없이 돈다(`/dev/*` 는 dev 에서 로그인 없이 열린다).
 *
 *   1) dev 서버:  AUTH_SECRET=임시 DATABASE_URL=postgresql://x:x@127.0.0.1:1/x npx next dev --webpack -p 3077
 *   2) 캡처:      node scripts/qa/bank-source-h1/capture.mjs <시안 캡처 폴더> <출력 폴더>
 *
 * 찍는 상태는 시안 캡처와 같다 — 학년 중1 · 학기 1학기 · 교과서 · 천재교육(김화경) · 대단원 평가 + 형성 평가.
 */
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const [mockDir, outDir] = process.argv.slice(2);
if (!mockDir || !outDir) {
  console.error("사용: node capture.mjs <시안 캡처 폴더> <출력 폴더>");
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });
const BASE = process.env.BANK_H1_BASE ?? "http://localhost:3077";
const counts = JSON.parse(
  readFileSync(path.join(here, "counts-20261008.json"), "utf8"),
);

/** 목록 행 — 시안 카드와 같은 두 문항(교과서 출처). 렌더는 실제 카드(`UnifiedProblem`)가 한다. */
const row = (id, grade, chapter, section, content, code) => ({
  id,
  content,
  answer: "1",
  solution: "",
  difficulty: "기본",
  problemCode: code,
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
  choiceFigureIndex: [],
  source: "school_textbook",
  reviewStatus: "approved",
  problemType: "계산",
  questionType: "short-answer",
  questionTypeRaw: "단답형",
  familyKey: null,
  originProblemId: null,
  grade,
  chapter,
  section,
  eligible: true,
  ineligibleReason: null,
});
const bank = {
  problems: [
    row(
      "00000000-0000-4000-8000-0000000000c1",
      "중2",
      "4. 일차함수",
      "일차함수의 그래프와 기울기",
      "세 점 $(-1,\\ 2)$, $(5,\\ -1)$, $(9,\\ a)$가 한 직선 위에 있을 때, $a$의 값을 구하시오.",
      "J20403-A14-001",
    ),
    row(
      "00000000-0000-4000-8000-0000000000c2",
      "중2",
      "3. 연립일차방정식",
      "미지수가 2개인 연립일차방정식",
      "$x,\\ y$가 자연수일 때, 일차방정식 $3x+2y=21$을 만족시키는 순서쌍 $(x,\\ y)$의 개수를 구하시오.",
      "J20301-A19-001",
    ),
  ],
  total: 179,
  page: 1,
  pageSize: 12,
  grades: counts.textbook.grades.map((grade) => ({ grade, count: 1 })),
  chapters: ["1. 소인수분해", "2. 정수와 유리수"],
  units: [],
};

async function stage(page) {
  await page.route(
    (url) => url.pathname === "/api/dev/unified/problems/sources",
    (route) => route.fulfill({ json: counts }),
  );
  await page.route(
    (url) => url.pathname === "/api/dev/unified/problems",
    (route) => route.fulfill({ json: bank }),
  );
  await page.goto(`${BASE}/dev/unified#bank`, { waitUntil: "networkidle" });
  // 서버가 그린 첫 목록은 DB 가 없어 오류다 — 다시 시도하면 가로챈 목록이 선다
  const retry = page.getByRole("button", { name: "다시 시도" });
  if (await retry.isVisible().catch(() => false)) await retry.click();
  await page.getByRole("heading", { name: /문제 목록/ }).waitFor();
  await page.getByRole("combobox", { name: "학년" }).selectOption("중1");
  await page.getByRole("combobox", { name: "학기" }).selectOption("1");
  await page.getByRole("button", { name: "상세 필터" }).click();
  await page.getByRole("button", { name: /^출처 고르기/ }).click();
  const dialog = page.getByRole("dialog", { name: "출처 고르기" });
  await dialog.getByRole("group", { name: "출처" }).waitFor();
  await dialog.getByRole("button", { name: /^교과서/ }).click();
  await dialog.getByRole("checkbox", { name: /천재교육 · 김화경/ }).check();
  for (const kind of ["대단원 평가", "형성 평가"])
    await dialog
      .getByRole("group", { name: "자료 종류" })
      .getByRole("checkbox", { name: new RegExp(`^${kind}`) })
      .check();
  // 체크하느라 창 안이 아래로 굴렀다 — 시안 캡처처럼 맨 위(출처 줄 · 과목)부터 보이게 되감는다
  await dialog.evaluate((node) => {
    for (const el of node.querySelectorAll("*"))
      if (el.scrollTop > 0) el.scrollTop = 0;
  });
  await page.waitForTimeout(300);
  return dialog;
}

async function shoot(width, height, name) {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const dialog = await stage(page);
  await page.screenshot({ path: path.join(outDir, `${name}-dialog.png`) });
  await dialog.getByRole("button", { name: "적용" }).click();
  await dialog.waitFor({ state: "detached" });
  await page.waitForTimeout(300);
  const filters = page
    .getByRole("group", { name: "검색과 필터" })
    .locator("xpath=..");
  await filters.scrollIntoViewIfNeeded();
  const box = await filters.boundingBox();
  await page.screenshot({
    path: path.join(outDir, `${name}-screen.png`),
    clip: {
      x: 0,
      y: Math.max(0, box.y - 8),
      width,
      height: Math.min(box.height + 340, height),
    },
    fullPage: true,
  });
  await browser.close();
}

/** 시안과 구현을 나란히 — 같은 높이로 맞춰 왼쪽 시안 · 오른쪽 구현. */
async function sideBySide(left, right, out, width) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height: 400 } });
  // 빈 문서(about:blank)는 file:// 그림을 못 싣는다 — data URL 로 넣는다
  const img = (file, label) =>
    `<figure><figcaption>${label}</figcaption><img src="data:image/png;base64,${readFileSync(file).toString("base64")}"></figure>`;
  await page.setContent(
    `<!doctype html><meta charset="utf-8"><style>
      body{margin:0;padding:16px;display:flex;gap:16px;align-items:flex-start;background:#eef1f6;font:14px system-ui}
      figure{margin:0;flex:1;min-width:0} img{width:100%;border:1px solid #c9d2e0;background:#fff}
      figcaption{font-weight:700;margin:0 0 6px}
    </style>${img(left, "시안 H1 (/dev/bank-source-hifi)")}${img(right, "구현 (/dev/unified#bank — 실제 BankView)")}`,
    { waitUntil: "load" },
  );
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
}

await shoot(1440, 1000, "pc");
await shoot(390, 844, "phone");
await sideBySide(
  path.join(mockDir, "H1-dialog-pc.png"),
  path.join(outDir, "pc-dialog.png"),
  path.join(outDir, "compare-dialog-pc.png"),
  2400,
);
await sideBySide(
  path.join(mockDir, "H1-screen.png"),
  path.join(outDir, "pc-screen.png"),
  path.join(outDir, "compare-screen-pc.png"),
  2400,
);
await sideBySide(
  path.join(mockDir, "H1-dialog-phone.png"),
  path.join(outDir, "phone-dialog.png"),
  path.join(outDir, "compare-dialog-phone.png"),
  880,
);
console.log("찍음:", outDir);

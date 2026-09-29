/**
 * 오늘의 영어 — 폰 폭(390) 가로 넘침 실측 + 데스크톱 고르기 단추 캡처 (D-148 shell 트랙, 2026-09-30).
 *
 *   DATABASE_URL=postgresql://x:x@127.0.0.1:9/x AUTH_SECRET=probe npx next dev -p 3117   (dev 서버 3117~3127 · 죽은 DATABASE_URL · 임시 AUTH_SECRET · /dev/unified)
 *   npx tsx scripts/qa/english-phone-width.ts [port=3117]
 *
 * 왜 이 스크립트인가: jsdom 은 배치를 모른다 — `scrollWidth` 가 늘 0 이라 시험 파일의 «넘침 없음» 단언은
 * 거짓 초록이다(교훈 «값이 맞으면 시험이 다 초록이다»). 그래서 개발 서버의 `/dev/unified`(development 전용 ·
 * 로그인 없음)에 영어 API 를 **인라인 픽스처**로 끼우고 Chromium(390×844 · DPR 2)으로 잰다.
 *
 * 🔴 `src/lib/english/**` · `src/components/english/**` · `src/mocks/handlers/english.ts` 를 **불러오지 않는다** —
 *    영어 울타리 ⑴ 은 `scripts/` 를 금지 뿌리로 두고, MSW 대역은 `makeCloze` 를 부르므로 사슬이 빨개진다.
 *    픽스처는 아래 자작 지문(마을 학생들의 나무 심기)으로 여기 인라인이다. 교재 원문을 붙이지 않는다.
 *
 * 산출물: `.qa-artifacts/english-phone-width/` (추적 안 함) — 장면별 전체 캡처 + 데스크톱 펼침·접힘 고르기 단추 캡처,
 * 표준 출력에 장면별 `doc/body scrollWidth` 와 오른쪽 경계를 넘는 요소, 딱지 «영»의 계산된 스타일, 접힌 목록의 자리.
 * 판정: 모든 장면의 `docScrollWidth === bodyScrollWidth === 390` 이고 넘는 요소가 0 이면 exit 0, 아니면 exit 1.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";

import { chromium, type Page, type Route } from "playwright";

const port = Number(process.argv[2] ?? 3117);
const base = `http://localhost:${port}`;
const out = path.resolve(process.cwd(), ".qa-artifacts/english-phone-width");

// ── 인라인 픽스처 (계약 english.contract.ts 모양 그대로 · 자작 지문) ───────────────────────────
const EXAM_A = "71000000-0000-4000-8000-000000000001";
const EXAM_B = "71000000-0000-4000-8000-000000000002";
const SET_DRAFT = "73000000-0000-4000-8000-000000000001";
const SET_DONE = "73000000-0000-4000-8000-000000000002";
const T0 = "2026-09-30T01:00:00.000Z";
const T1 = "2026-09-30T02:30:00.000Z";

const PASSAGE =
  "Every spring, the students of a small town plant trees along the river. " +
  "The project began ten years ago when a teacher noticed that the riverbank was losing its soil after heavy rain. " +
  "She asked her class to help, and the idea spread quickly to other schools. " +
  "Today the young forest protects the town from floods and gives shade to people who walk there in summer. " +
  "The students say the work is tiring, but they feel proud when they return years later and see how tall their trees have grown.";

const exams = [
  {
    id: EXAM_A,
    school: "침산중학교",
    grade: "중3",
    title: "2학기 중간고사",
    examDate: "2026-10-14",
    types: ["주제", "내용 일치", "어법", "서술형"],
    materialCount: 2,
    setCount: 2,
    reviewedCount: 1,
    createdAt: T0,
    updatedAt: T1,
  },
  {
    id: EXAM_B,
    school: "경명여자중학교",
    grade: "중2",
    title: "2학기 기말고사",
    examDate: null,
    types: [],
    materialCount: 0,
    setCount: 0,
    reviewedCount: 0,
    createdAt: T0,
    updatedAt: T0,
  },
];

const materials = [
  {
    id: "72000000-0000-4000-8000-000000000001",
    examId: EXAM_A,
    name: "2025-2 중간 기출.pdf",
    mimeType: "application/pdf",
    size: 421_888,
    hasFile: true,
    content: null,
    createdAt: T0,
  },
  {
    id: "72000000-0000-4000-8000-000000000002",
    examId: EXAM_A,
    name: "3과 외부지문 (텍스트)",
    mimeType: "text/plain",
    size: PASSAGE.length,
    hasFile: false,
    content: PASSAGE,
    createdAt: T1,
  },
];

const draftQuestions = [
  {
    type: "주제",
    prompt: "다음 글의 주제로 가장 적절한 것은?",
    options: [
      "강가에 나무를 심는 일의 어려움",
      "학생들의 나무 심기가 마을에 가져온 변화",
      "홍수를 막는 여러 가지 방법",
      "여름에 강가를 걷는 즐거움",
      "교사와 학생의 갈등",
    ],
    answer: "2",
    explanation:
      "학생들이 심은 나무가 자라 마을을 홍수에서 지키고 그늘을 준다는 변화가 글의 중심이다.",
    evidence:
      "Today the young forest protects the town from floods and gives shade to people who walk there in summer.",
  },
  {
    type: "내용 일치",
    prompt: "다음 글의 내용과 일치하는 것은?",
    options: [
      "나무 심기는 올해 처음 시작되었다.",
      "학생들은 여름마다 나무를 심는다.",
      "한 교사가 강둑의 흙이 쓸려 가는 것을 보고 일을 시작했다.",
      "다른 학교는 참여하지 않았다.",
      "학생들은 일이 쉽다고 말한다.",
    ],
    answer: "3",
    explanation:
      "폭우 뒤 강둑의 흙이 쓸려 가는 것을 본 교사가 시작했다고 했다.",
    evidence:
      "The project began ten years ago when a teacher noticed that the riverbank was losing its soil after heavy rain.",
  },
  {
    type: "서술형",
    prompt: "학생들이 자랑스러움을 느끼는 때를 우리말로 쓰시오.",
    options: [],
    answer: "몇 년 뒤 돌아와 자신들이 심은 나무가 얼마나 자랐는지 볼 때",
    explanation: "마지막 문장의 when 절을 우리말로 옮기면 정답으로 인정한다.",
    evidence:
      "they feel proud when they return years later and see how tall their trees have grown.",
  },
];

const clozeQuestions = [
  {
    type: "원문 복원",
    prompt:
      "원문에 쓰인 단어를 넣어 문장을 완성하시오.\nEvery spring, the ________ of a small town plant trees along the river.\n(첫 글자: s, 8글자)",
    options: [],
    answer: "students",
    explanation:
      "원문에 쓰인 단어는 students 입니다. 대소문자는 구별하지 않습니다.",
    evidence:
      "Every spring, the students of a small town plant trees along the river.",
  },
];

const sets = [
  {
    id: SET_DRAFT,
    examId: EXAM_A,
    title: "협력의 가치 · 외부지문 기본 훈련",
    status: "초안",
    source: "chatgpt",
    questionCount: draftQuestions.length,
    types: ["주제", "내용 일치", "서술형"],
    revision: 1,
    createdAt: T1,
    updatedAt: T1,
    passage: PASSAGE,
    questions: draftQuestions,
  },
  {
    id: SET_DONE,
    examId: EXAM_A,
    title: "원문 복원 연습",
    status: "검토 완료",
    source: "cloze",
    questionCount: clozeQuestions.length,
    types: ["원문 복원"],
    revision: 3,
    createdAt: T0,
    updatedAt: T0,
    passage: PASSAGE,
    questions: clozeQuestions,
  },
];

const summaryOf = (set: (typeof sets)[number]) => {
  const { passage: _passage, questions: _questions, ...summary } = set;
  void _passage;
  void _questions;
  return summary;
};

async function serveEnglish(route: Route) {
  const url = new URL(route.request().url());
  const method = route.request().method();
  const json = (data: unknown, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  const p = url.pathname;
  if (method === "GET" && p === "/api/english/exams")
    return json({ data: exams });
  let m = p.match(/^\/api\/english\/exams\/([^/]+)\/materials$/);
  if (method === "GET" && m)
    return json({ data: materials.filter((x) => x.examId === m![1]) });
  m = p.match(/^\/api\/english\/exams\/([^/]+)\/sets$/);
  if (method === "GET" && m)
    return json({
      data: sets.filter((x) => x.examId === m![1]).map(summaryOf),
    });
  m = p.match(/^\/api\/english\/sets\/([^/]+)$/);
  if (method === "GET" && m) {
    const set = sets.find((x) => x.id === m![1]);
    return set
      ? json({ data: set })
      : json(
          {
            error: {
              code: "NOT_FOUND",
              message: "문제 세트를 찾을 수 없습니다.",
            },
          },
          404,
        );
  }
  return json({ error: { code: "NOT_FOUND", message: "탐침 밖" } }, 404);
}

type Measure = {
  scene: string;
  innerWidth: number;
  docScrollWidth: number;
  bodyScrollWidth: number;
  overflowing: { tag: string; cls: string; right: number; text: string }[];
};

async function measure(page: Page, scene: string): Promise<Measure> {
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate((scene) => {
    const innerWidth = window.innerWidth;
    const overflowing: Measure["overflowing"] = [];
    for (const el of Array.from(
      document.querySelectorAll<HTMLElement>("body *"),
    )) {
      if (el.closest("[hidden]")) continue;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) continue;
      if (rect.right > innerWidth + 0.5)
        overflowing.push({
          tag: el.tagName.toLowerCase(),
          cls: String(el.className).slice(0, 60),
          right: Math.round(rect.right),
          text: (el.textContent ?? "").trim().slice(0, 30),
        });
    }
    return {
      scene,
      innerWidth,
      docScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      overflowing: overflowing.slice(0, 8),
    };
  }, scene);
}

const SCENES: {
  name: string;
  url: string;
  ready: string;
  before?: (page: Page) => Promise<void>;
}[] = [
  {
    name: "내신 대비",
    url: "/dev/unified#english",
    ready: "text=이번 시험 준비",
  },
  {
    name: "자료 추가 창",
    url: "/dev/unified#english",
    ready: "text=이번 시험 준비",
    before: async (p) => {
      await p.getByRole("button", { name: "자료 추가" }).click();
      await p.getByRole("tab", { name: "지문 직접 입력" }).click();
    },
  },
  {
    name: "새 시험 등록 창",
    url: "/dev/unified#english",
    ready: "text=이번 시험 준비",
    before: async (p) => {
      await p.getByRole("button", { name: "새 시험 등록" }).first().click();
      await p.getByRole("dialog", { name: "새 시험 등록" }).waitFor();
    },
  },
  {
    name: "보관함",
    url: "/dev/unified#english-library",
    ready: "text=원문 복원 연습",
  },
  {
    name: "만들기",
    url: "/dev/unified#english-maker",
    // 옆 메뉴의 숨은 «문제 만들기» 라벨이 아니라 본문 머리(뿌리가 그린다) — ai 가 자리표를 채워도 남는다
    ready: 'role=heading[name="문제 만들기"]',
  },
  {
    name: "편집",
    url: `/dev/unified?set=${SET_DRAFT}#english`,
    ready: "text=QUESTION 01",
  },
  {
    name: "인쇄 창",
    url: `/dev/unified?set=${SET_DRAFT}#english`,
    ready: "text=QUESTION 01",
    before: async (p) => {
      await p.getByRole("button", { name: "인쇄" }).click();
      await p.getByRole("dialog", { name: "인쇄" }).waitFor();
    },
  },
  {
    name: "제품 목록",
    url: "/dev/unified#english",
    ready: "text=이번 시험 준비",
    before: async (p) => {
      await p.getByRole("button", { name: /제품 고르기/ }).click();
      await p.getByRole("listbox", { name: "제품" }).waitFor();
    },
  },
];

async function main() {
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const results: Measure[] = [];

  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await phone.route("**/api/english/**", serveEnglish);
  const page = await phone.newPage();
  page.on("pageerror", (error) => console.log("pageerror", error.message));
  for (const scene of SCENES) {
    // 같은 문서 안 해시 이동은 앞 장면의 창을 남긴다 — 장면마다 빈 문서로 돌아갔다가 연다.
    await page.goto("about:blank");
    await page.goto(`${base}${scene.url}`, { waitUntil: "domcontentloaded" });
    await page.locator(scene.ready).first().waitFor({ timeout: 60_000 });
    if (scene.before) await scene.before(page);
    await page.waitForTimeout(300);
    const measured = await measure(page, scene.name);
    results.push(measured);
    console.log(
      `${measured.scene}(390): doc ${measured.docScrollWidth} · body ${measured.bodyScrollWidth} · 넘침 ${measured.overflowing.length}`,
    );
    for (const item of measured.overflowing) console.log("   ↳", item);
    await page.screenshot({
      path: path.join(
        out,
        `phone-${scene.name.replace(/[^\w가-힣]+/g, "-")}.png`,
      ),
      fullPage: true,
    });
  }
  await phone.close();

  // 데스크톱 — 펼침 240px · 접힘 72px 의 고르기 단추(시안 C)와 딱지 «영»
  const desk = await browser.newContext({
    viewport: { width: 1280, height: 860 },
  });
  await desk.route("**/api/english/**", serveEnglish);
  const d = await desk.newPage();
  await d.goto(`${base}/dev/unified#english`, {
    waitUntil: "domcontentloaded",
  });
  await d.locator("text=이번 시험 준비").first().waitFor({ timeout: 60_000 });
  await d.getByRole("button", { name: /제품 고르기/ }).click();
  await d.getByRole("listbox", { name: "제품" }).waitFor();
  await d.waitForTimeout(200);
  await d.screenshot({ path: path.join(out, "desk-expanded-picker.png") });
  await d.keyboard.press("Escape");
  await d.getByRole("button", { name: "왼쪽 메뉴 접기" }).click();
  await d.waitForTimeout(200);
  await d.screenshot({ path: path.join(out, "desk-collapsed.png") });
  await d.getByRole("button", { name: /제품 고르기/ }).click();
  await d.getByRole("listbox", { name: "제품" }).waitFor();
  await d.waitForTimeout(200);
  await d.screenshot({ path: path.join(out, "desk-collapsed-picker.png") });
  const badge = await d.getByTestId("product-badge").evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      display: s.display,
      fontSize: s.fontSize,
      fontWeight: s.fontWeight,
      background: s.backgroundColor,
      border: `${s.borderTopWidth} ${s.borderTopColor}`,
    };
  });
  const collapsedWidth = await d
    .locator("aside")
    .first()
    .evaluate((el) => el.getBoundingClientRect().width);
  const pickerBox = await d
    .getByRole("listbox", { name: "제품" })
    .evaluate((el) => {
      const r = el.getBoundingClientRect();
      return {
        left: Math.round(r.left),
        top: Math.round(r.top),
        width: Math.round(r.width),
      };
    });
  await desk.close();
  await browser.close();

  console.log(JSON.stringify({ badge, collapsedWidth, pickerBox }, null, 2));
  const bad = results.filter(
    (r) =>
      r.docScrollWidth !== r.innerWidth ||
      r.bodyScrollWidth !== r.innerWidth ||
      r.overflowing.length > 0,
  );
  console.log(
    bad.length
      ? `실패 ${bad.length}장면`
      : `통과 — 장면 ${results.length}, 넘침 0`,
  );
  process.exit(bad.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

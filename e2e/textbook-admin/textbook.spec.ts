import { expect, test, type Page } from "@playwright/test";

import {
  HARNESS,
  ids,
  installTextbookApi,
  type TextbookWorld,
} from "./fixtures";

/**
 * 교재 제작 화면의 실제 브라우저 확인 — 제품 컴포넌트와 제품 클라이언트를 그대로 띄우고,
 * `/api/textbook/**` 만 합성 서버(fixtures.ts)가 답한다. 실제 서버 · DB · 인증에는 닿지 않는다.
 * 학생 비노출 · 판본 해시 · 서버 409 는 여기서 재지 않는다(단위 · PGlite 시험이 잰다).
 */

async function start(page: Page) {
  const world = await installTextbookApi(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    // 일부러 낸 409 · 503 은 브라우저가 콘솔 오류로 적는다 — 그것은 뺀다
    if (
      message.type() === "error" &&
      !message.text().includes("Failed to load resource")
    )
      errors.push(message.text());
  });
  await page.goto(HARNESS);
  await page.getByRole("button", { name: "열기" }).click();
  return { world, errors };
}

async function openDetail(page: Page) {
  await page.getByRole("button", { name: "세부 편집" }).click();
  await expect(body(page)).toBeVisible();
}

const body = (page: Page) => page.getByRole("textbox", { name: "본문" });
const memo = (page: Page) =>
  page.getByRole("textbox", { name: "구획 정답 메모" });
const prompt = (page: Page) =>
  page.getByRole("group", { name: "저장하지 않은 수정" });
const status = (page: Page, text: string) =>
  page.getByRole("status").filter({ hasText: text });
const sectionSaves = (world: TextbookWorld) =>
  world.count("PUT", `/sections/${ids.sectionA}`);
const savedSection = (world: TextbookWorld) =>
  world.last("PUT", `/sections/${ids.sectionA}`)!.body!.section as Record<
    string,
    unknown
  >;

/** 새로고침 · 탭 닫기를 흉내 낸다 — 화면이 막으면 true */
const closing = (page: Page) =>
  page.evaluate(() => {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });

const clean = (world: TextbookWorld, errors: string[]) => {
  expect(world.unexpected).toEqual([]);
  expect(errors).toEqual([]);
};

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
});

test("구획 정답 메모 — 저장하고 새로 고쳐 다시 열어도 그대로이고, 비우면 칸 없이 저장된다", async ({
  page,
}) => {
  const { world, errors } = await start(page);
  await openDetail(page);
  await expect(memo(page)).toHaveValue("");
  await expect(page.getByText("PDF에 인쇄되지 않습니다.")).toBeVisible();

  await memo(page).fill("최대공약수는 6");
  await page.getByRole("button", { name: "이 구획 저장" }).click();
  await expect(status(page, "저장됨")).toBeVisible();
  expect(savedSection(world).teacherAnswer).toBe("최대공약수는 6");

  // 교사용 지면 — 메모는 지면 밖에 «인쇄되지 않음»과 함께 보인다. 학생용 지면에는 없다
  await page.getByRole("button", { name: "교사용" }).click();
  const note = page.getByRole("note", { name: "구획 정답 메모" });
  await expect(note).toContainText("PDF에 인쇄되지 않음");
  await expect(note).toContainText("최대공약수는 6");
  await expect(page.getByRole("region", { name: "지면" })).not.toContainText(
    "최대공약수는 6",
  );
  await page.getByRole("button", { name: "학생용" }).click();
  await expect(note).toHaveCount(0);
  await expect(page.getByText("최대공약수는 6")).toHaveCount(0);

  // 새로 고쳐 다시 연다 — 서버에서 읽은 값이다
  await page.reload();
  await page.getByRole("button", { name: "열기" }).click();
  await openDetail(page);
  await expect(memo(page)).toHaveValue("최대공약수는 6");

  // 비우고 저장하면 칸 자체를 보내지 않는다
  await memo(page).fill("");
  await page.getByRole("button", { name: "이 구획 저장" }).click();
  await expect.poll(() => sectionSaves(world)).toBe(2);
  expect(Object.hasOwn(savedSection(world), "teacherAnswer")).toBe(false);
  await page.reload();
  await page.getByRole("button", { name: "열기" }).click();
  await openDetail(page);
  await expect(memo(page)).toHaveValue("");
  clean(world, errors);
});

test("고쳤다가 원래 값으로 되돌리면 확인 없이 이동하고 닫기 경고도 풀린다", async ({
  page,
}) => {
  const { world, errors } = await start(page);
  await openDetail(page);
  expect(await closing(page)).toBe(false);

  await body(page).fill("고친 문장");
  expect(await closing(page)).toBe(true);
  // 실제 새로고침 — 브라우저가 기본 경고를 띄우고, 머무르면 원고가 남는다
  let asked = "";
  page.once("dialog", async (dialog) => {
    asked = dialog.type();
    await dialog.dismiss();
  });
  await page.evaluate(() => {
    window.location.reload();
  });
  await expect.poll(() => asked).toBe("beforeunload");
  await expect(body(page)).toHaveValue("고친 문장");

  await body(page).fill("저장된 문장");
  expect(await closing(page)).toBe(false);
  await page.getByRole("button", { name: "목록" }).click();
  await expect(page.getByRole("button", { name: "열기" })).toBeVisible();
  await expect(prompt(page)).toHaveCount(0);
  expect(sectionSaves(world)).toBe(0);
  clean(world, errors);
});

test("저장하지 않은 수정 — 계속 편집 · 버리고 이동 · 저장 후 이동이 구획 · 작업실 화면 · 링크에서 같게 움직인다", async ({
  page,
}) => {
  const { world, errors } = await start(page);
  await openDetail(page);
  const shell = page.locator(".harness");
  const other = page.getByRole("button", { name: "다른 화면" });

  // ① 완성 보기에서 다른 구획 — 묻고, 계속 편집이면 그대로다
  await body(page).fill("고친 문장");
  await page.getByRole("button", { name: "완성 교재 보기" }).click();
  // 구획은 «내용 고르기» 창에서 고른다(D-159) — 띠는 다른 구획을 읽지만 원고는 덮지 않는다.
  await page.getByRole("button", { name: "내용 고르기" }).click();
  await page
    .getByRole("dialog", { name: "내용 고르기" })
    .getByRole("button", { name: "연습", exact: true })
    .click();
  await expect(prompt(page)).toBeVisible();
  await expect(page.locator("[data-book-preview-where]")).toHaveText(
    "약수와 배수 › 도입",
  );
  await prompt(page).getByRole("button", { name: "계속 편집" }).click();
  await expect(prompt(page)).toHaveCount(0);
  await openDetail(page);
  await expect(body(page)).toHaveValue("고친 문장");

  // ② 작업실의 다른 화면으로 — 묻고, 계속 편집이면 화면도 입력도 그대로다
  await other.click();
  await expect(prompt(page)).toBeVisible();
  await expect(shell).toHaveAttribute("data-view", "textbook");
  await prompt(page).getByRole("button", { name: "계속 편집" }).click();
  await expect(shell).toHaveAttribute("data-view", "textbook");
  await expect(body(page)).toHaveValue("고친 문장");

  // ③ 버리고 이동 — 화면이 바뀌고, 돌아오면 원고가 저장된 값이다
  await other.click();
  await prompt(page).getByRole("button", { name: "버리고 이동" }).click();
  await expect(shell).toHaveAttribute("data-view", "other");
  await expect(page.getByRole("heading", { name: "다른 화면" })).toBeVisible();
  expect(sectionSaves(world)).toBe(0);
  await page.getByRole("button", { name: "교재 제작" }).click();
  await expect(body(page)).toHaveValue("저장된 문장");

  // ④ 저장 후 이동 — 저장이 끝난 뒤에 화면이 바뀐다
  await body(page).fill("저장할 문장");
  await other.click();
  await prompt(page).getByRole("button", { name: "저장 후 이동" }).click();
  await expect(shell).toHaveAttribute("data-view", "other");
  expect(sectionSaves(world)).toBe(1);
  expect(savedSection(world).blocks).toEqual([
    { blockId: "block-a1", kind: "text", markdown: "저장할 문장" },
  ]);
  await page.getByRole("button", { name: "교재 제작" }).click();
  await expect(body(page)).toHaveValue("저장할 문장");
  // 고친 것이 없으면 묻지 않고 바로 바뀐다
  await other.click();
  await expect(shell).toHaveAttribute("data-view", "other");
  await expect(prompt(page)).toHaveCount(0);
  await page.getByRole("button", { name: "교재 제작" }).click();

  // ⑤ 작업실 밖으로 나가는 링크 — 묻고, 버리기를 고르면 그 경로로 간다(모형 라우터가 받아 적는다)
  await body(page).fill("또 고친 문장");
  await page.getByRole("link", { name: "작업실 밖" }).click();
  await expect(prompt(page)).toBeVisible();
  expect(new URL(page.url()).search).toBe("");
  await prompt(page).getByRole("button", { name: "버리고 이동" }).click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-destination",
    "/e2e/textbook-admin/index.html?away=1",
  );
  expect(sectionSaves(world)).toBe(1);
  clean(world, errors);
});

test("주소의 # · 뒤로가기로 떠나려 할 때 — 붙잡고 주소를 되돌리며, 승인한 뒤에는 다시 붙잡지 않는다", async ({
  page,
}) => {
  const { world, errors } = await start(page);
  await openDetail(page);
  const shell = page.locator(".harness");
  const hash = () => new URL(page.url()).hash;
  const toOther = () =>
    page.evaluate(() => {
      window.location.hash = "other";
    });

  // 고친 채로 주소를 바꾼다 — 화면은 그대로고 주소는 교재로 되돌아온다
  await body(page).fill("고친 문장");
  await toOther();
  await expect(prompt(page)).toBeVisible();
  await expect(shell).toHaveAttribute("data-view", "textbook");
  expect(hash()).toBe("");
  await prompt(page).getByRole("button", { name: "계속 편집" }).click();
  await expect(body(page)).toHaveValue("고친 문장");
  expect(hash()).toBe("");

  // 버리고 이동 — 넘겨준 길이 주소를 되돌리고 같은 동기화를 다시 돌려 한 번 더 묻는다. 다시 붙잡히면 여기서 멈춘다
  await toOther();
  await prompt(page).getByRole("button", { name: "버리고 이동" }).click();
  await expect(shell).toHaveAttribute("data-view", "other");
  expect(hash()).toBe("#other");
  await expect(prompt(page)).toHaveCount(0);

  // 뒤로가기로 교재에 돌아와 다시 고치고, 앞으로 가기로 떠나려 한다
  await page.goBack();
  await expect(shell).toHaveAttribute("data-view", "textbook");
  await expect(body(page)).toHaveValue("저장된 문장");
  await body(page).fill("저장할 문장");
  await page.goForward();
  await expect(prompt(page)).toBeVisible();
  await expect(shell).toHaveAttribute("data-view", "textbook");
  expect(hash()).toBe("");

  // 저장 후 이동 — 저장이 끝난 직후 같은 이동을 다시 물어도 붙잡지 않는다
  await prompt(page).getByRole("button", { name: "저장 후 이동" }).click();
  await expect(shell).toHaveAttribute("data-view", "other");
  expect(hash()).toBe("#other");
  expect(sectionSaves(world)).toBe(1);
  await expect(
    status(page, "처리 중입니다. 끝난 뒤 다시 눌러 주세요."),
  ).toHaveCount(0);
  clean(world, errors);
});

test("저장이 도는 동안 — 거듭 눌러도 저장은 한 번이고 화면 전환은 붙잡힌다", async ({
  page,
}) => {
  const { world, errors } = await start(page);
  await openDetail(page);
  let release!: () => void;
  world.holdSectionSave = new Promise<void>((resolve) => {
    release = resolve;
  });
  await body(page).fill("고친 문장");
  await page.getByRole("button", { name: "목록" }).click();
  const go = prompt(page).getByRole("button", { name: "저장 후 이동" });
  await go.click();
  await expect(go).toBeDisabled();
  await expect(
    prompt(page).getByRole("button", { name: "버리고 이동" }),
  ).toBeDisabled();
  // 막힌 단추를 억지로 눌러도 요청이 늘지 않는다
  await go.click({ force: true });
  await expect.poll(() => sectionSaves(world)).toBe(1);

  // 저장 중에 작업실 화면을 바꾸려 하면 붙잡고 알린다
  await page.getByRole("button", { name: "다른 화면" }).click();
  await expect(page.locator(".harness")).toHaveAttribute(
    "data-view",
    "textbook",
  );
  await expect(
    status(page, "처리 중입니다. 끝난 뒤 다시 눌러 주세요."),
  ).toBeVisible();
  expect(await closing(page)).toBe(true);

  release();
  await expect(page.getByRole("button", { name: "열기" })).toBeVisible();
  expect(sectionSaves(world)).toBe(1);
  expect(await closing(page)).toBe(false);
  clean(world, errors);
});

test("발행 확정 뒤 판본 읽기가 실패하면 — 먼저 잠그고, 다시 시도는 읽기만 한다", async ({
  page,
}) => {
  const { world, errors } = await start(page);
  await openDetail(page);
  await page.getByRole("button", { name: "발행", exact: true }).click();
  await page.getByRole("button", { name: "예약" }).click();
  const finalize = page.getByRole("button", { name: "확정" });
  await expect(finalize).toBeEnabled();
  world.failEditionReads = 1;
  await finalize.click();

  const failed = page.getByRole("alert");
  await expect(failed).toContainText(
    "발행은 완료되었습니다. 최신 판본 상태를 불러오지 못했습니다.",
  );
  // 읽지 못했어도 이미 잠겼다
  await expect(
    page.getByText(
      "발행되었거나 보관된 교재입니다. 원고를 고치려면 새 초안을 만드세요.",
    ),
  ).toBeVisible();
  await expect(finalize).toBeDisabled();
  await page.getByRole("button", { name: "원고", exact: true }).click();
  await expect(body(page)).toBeDisabled();

  await failed.getByRole("button", { name: "판본 다시 불러오기" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(world.count("POST", "/publish/finalize")).toBe(1);
  await page.getByRole("button", { name: "완성 교재 보기" }).click();
  await expect(
    page.getByRole("link", { name: "학생용 PDF 내려받기" }),
  ).toBeVisible();
  clean(world, errors);
});

test("개념은 저장되고 구획 연결이 실패하면 — 그 상태를 남기고, 다시 시도는 연결만 한다", async ({
  page,
}) => {
  const { world, errors } = await start(page);
  await openDetail(page);
  await body(page).fill("고친 문장");
  await page.getByRole("textbox", { name: "개념 키" }).fill("gcd");
  await page.getByRole("textbox", { name: "개념 제목" }).fill("최대공약수");
  await page.getByRole("button", { name: "개념 원고 만들기" }).click();
  world.rejectSectionSaves = 1;
  await page.getByRole("button", { name: "개념 저장" }).click();

  const failure = page.getByRole("alert");
  await expect(failure).toContainText("개념 저장 완료 · 구획 연결 실패");
  await expect(failure).toContainText("다른 곳에서 구획을 고쳤습니다.");
  expect(world.count("PUT", "/concepts/gcd")).toBe(1);
  expect(sectionSaves(world)).toBe(1);
  // 연결 요청에는 저장하지 않은 문장을 싣지 않았다
  expect(savedSection(world).blocks).toEqual([
    { blockId: "block-a1", kind: "text", markdown: "저장된 문장" },
    expect.objectContaining({ kind: "concept", conceptKey: "gcd" }),
  ]);
  await expect(body(page)).toHaveValue("고친 문장");

  await failure.getByRole("button", { name: "구획 연결 다시 시도" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  // 개념은 다시 저장하지 않았다 — 구획에 잇기만 했다
  expect(world.count("PUT", "/concepts/gcd")).toBe(1);
  expect(sectionSaves(world)).toBe(2);
  await expect(body(page)).toHaveValue("고친 문장");

  // 남은 원고 수정을 저장하고 새로 고쳐 다시 열면 개념이 이 구획에 붙어 있다
  await page.getByRole("button", { name: "이 구획 저장" }).click();
  await expect.poll(() => sectionSaves(world)).toBe(3);
  await page.reload();
  await page.getByRole("button", { name: "열기" }).click();
  await openDetail(page);
  await expect(page.getByRole("group", { name: "개념 원고" })).toBeVisible();
  await expect(body(page)).toHaveValue("고친 문장");
  clean(world, errors);
});

test("완성 보기 — 교재 전체를 한 띠로 옆으로 넘겨 보고, 쪽을 누르면 크게 본다 · 내용 고르기로 옮겨 간다 (D-159)", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { world, errors } = await start(page);
  const preview = page.getByRole("region", { name: "미리보기", exact: true });
  const strip = preview.getByRole("region", { name: "교재 지면" });
  // 두 구획을 다 조판하면 안내 줄이 «조판 n/m 구획» 에서 «N쪽» 으로 바뀐다.
  await expect(preview.getByText(/넘겨 보고.*· \d+쪽$/)).toBeVisible();
  // 합성 교재의 첫 구획은 시작 면이 맞지 않아 조판되지 않는다 — 그 자리에는 까닭이 적히고, 누를 수 없다.
  const items = strip.locator("[data-strip-key]");
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText("홀수 1쪽에서 시작합니다");
  await expect(items.nth(0).getByRole("button")).toHaveCount(0);
  // 조판된 구획은 줄여 그린 A4(띠의 배율 0.46)다 — 비율은 그대로다.
  const papers = strip.locator(".tb-paper");
  await expect(papers).toHaveCount(1);
  const paper = await papers.first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { w: r.width, h: r.height };
  });
  expect(paper.w).toBeGreaterThan(350);
  expect(paper.w).toBeLessThan(380);
  expect(Math.abs(paper.h / paper.w - 297 / 210)).toBeLessThan(0.01);
  // 띠의 쪽은 옆으로 나란히, 같은 크기로 놓인다(조판하지 못한 자리도 한 쪽 크기다).
  const boxes = await items.evaluateAll((els) =>
    els.map((el) => {
      const r = el.firstElementChild!.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    }),
  );
  expect(boxes[1]!.x).toBeGreaterThan(boxes[0]!.x + boxes[0]!.w - 1);
  expect(Math.abs(boxes[1]!.y - boxes[0]!.y)).toBeLessThan(2);
  expect(Math.abs(boxes[1]!.w - boxes[0]!.w)).toBeLessThan(2);
  expect(Math.abs(boxes[1]!.h - boxes[0]!.h)).toBeLessThan(2);
  // 지면의 글이 줄여진 지면 안에 있다 — 지면만 줄고 글이 밖으로 새지 않는다.
  const inside = await strip.getByText("연습 구획의 글").evaluate((el) => {
    const sheet = el.closest(".tb-paper")!.getBoundingClientRect();
    const text = el.getBoundingClientRect();
    return (
      text.left >= sheet.left - 1 &&
      text.right <= sheet.right + 1 &&
      text.top >= sheet.top - 1 &&
      text.bottom <= sheet.bottom + 1
    );
  });
  expect(inside).toBe(true);
  // 쪽 사이의 이동은 넘김과 크게 보기뿐이다.
  for (const name of ["이전 쪽", "다음 쪽", "맞춤", "넓게"])
    await expect(
      preview.getByRole("button", { name, exact: true }),
    ).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("complete-preview-1440.png"),
    fullPage: true,
  });

  // 쪽을 누르면 크게 — Esc 로 닫으면 누른 쪽으로 초점이 돌아온다.
  const opener = preview.getByRole("button", { name: "연습 1쪽 확대" });
  await opener.click();
  const enlarged = page.getByRole("dialog", { name: "지면 확대 보기" });
  await expect(enlarged).toBeVisible();
  const big = (await enlarged.locator(".tb-paper").first().boundingBox())!;
  expect(big.width).toBeGreaterThan(paper.w * 1.5);
  await page.screenshot({
    path: testInfo.outputPath("complete-preview-enlarged.png"),
  });
  await page.keyboard.press("Escape");
  await expect(enlarged).toBeHidden();
  await expect(opener).toBeFocused();

  // 내용 고르기 — 창에서 고르면 닫히고 «지금» 이 그 구획이 된다.
  await preview.getByRole("button", { name: "내용 고르기" }).click();
  const picker = page.getByRole("dialog", { name: "내용 고르기" });
  await expect(picker).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("complete-preview-picker.png"),
  });
  await picker.getByRole("button", { name: "연습", exact: true }).click();
  await expect(picker).toBeHidden();
  await expect(preview.locator("[data-book-preview-where]")).toHaveText(
    "약수와 배수 › 연습",
  );
  clean(world, errors);
});

for (const width of [320, 390]) {
  test(`가로 넘침 없음 — ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 800 });
    const { world, errors } = await start(page);
    const overflow = () =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
    const shot = (name: string) =>
      page.screenshot({
        path: testInfo.outputPath(`${width}-${name}.png`),
        fullPage: true,
      });

    // 완성 보기
    await expect(page.getByRole("button", { name: "세부 편집" })).toBeVisible();
    expect(await overflow(), "완성 보기").toBeLessThanOrEqual(1);
    await shot("preview");

    // 세부 편집 — 원고 칸과 구획 정답 메모
    await openDetail(page);
    await memo(page).fill("최대공약수는 6");
    expect(await overflow(), "세부 편집").toBeLessThanOrEqual(1);
    await shot("manuscript");

    // 저장하지 않은 수정의 확인 칸
    await page.getByRole("button", { name: "목록" }).click();
    await expect(prompt(page)).toBeVisible();
    expect(await overflow(), "확인 칸").toBeLessThanOrEqual(1);
    await shot("prompt");
    await prompt(page).getByRole("button", { name: "계속 편집" }).click();

    // 배정 · 영상 칸
    await page.getByRole("button", { name: "배정", exact: true }).click();
    await expect(page.getByRole("region", { name: "배정" })).toBeVisible();
    expect(await overflow(), "배정").toBeLessThanOrEqual(1);
    await page.getByRole("button", { name: "영상", exact: true }).click();
    await expect(page.getByRole("region", { name: "영상" })).toBeVisible();
    expect(await overflow(), "영상").toBeLessThanOrEqual(1);
    await shot("video");

    // 목록과 가져오기 칸
    await page.getByRole("button", { name: "목록" }).click();
    await prompt(page).getByRole("button", { name: "버리고 이동" }).click();
    await page.getByRole("button", { name: "기존 원고 가져오기" }).click();
    await expect(page.getByRole("region", { name: "가져오기" })).toBeVisible();
    expect(await overflow(), "목록 · 가져오기").toBeLessThanOrEqual(1);
    await shot("list");
    clean(world, errors);
  });
}

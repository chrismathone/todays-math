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
  await page.getByRole("button", { name: "연습" }).click();
  await expect(prompt(page)).toBeVisible();
  expect(world.count("GET", `/sections/${ids.sectionB}`)).toBe(0);
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
    await expect(
      page.getByRole("button", { name: "세부 편집" }),
    ).toBeVisible();
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

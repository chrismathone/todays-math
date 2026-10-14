import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import ArithmeticWorkbench from "@/components/arithmetic/ArithmeticWorkbench";
import { PrivateCloudClient } from "@/components/unified/privateCloudClient";
import { buildArithmeticSheet } from "@/lib/arithmetic/sheet";
import {
  ARITHMETIC_ENGINE_VERSION,
  ARITHMETIC_CATALOG_VERSION,
} from "@/contracts/arithmetic.contract";
afterEach(() => {
  vi.restoreAllMocks();
});

it("keeps generated drafts when switching between grade and basic arithmetic", async () => {
  const dirty = vi.fn();
  render(<ArithmeticWorkbench preview canOutput onDirtyChange={dirty} />);
  const make = await screen.findByRole("button", { name: "연습지 만들기" });
  fireEvent.change(screen.getByRole("textbox", { name: "학습지 제목" }), {
    target: { value: "분수 연산 복습" },
  });
  fireEvent.click(make);
  await screen.findByText(/문항을 생성하고 정답을 확인했습니다/);
  const gradeQuestion = screen.getByRole("region", {
    name: "생성한 문항 검토",
  })?.textContent;
  fireEvent.click(
    screen.getByRole("button", { name: "기초 연산 · 세부 조건" }),
  );
  await screen.findByRole("button", { name: "연습지 만들기" });
  expect(screen.getByRole("textbox", { name: "학습지 제목" })).toHaveValue(
    "연산 기초 다지기",
  );
  expect(dirty).toHaveBeenLastCalledWith(true);
  fireEvent.click(screen.getByRole("button", { name: "학년별 연산" }));
  expect(screen.getByRole("textbox", { name: "학습지 제목" })).toHaveValue(
    "분수 연산 복습",
  );
  expect(
    screen.getByRole("region", { name: "생성한 문항 검토" })?.textContent,
  ).toBe(gradeQuestion);
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
});

it("automatically opens a v1 saved document in the basic editor and allows switching without a parent callback", async () => {
  const payload = buildArithmeticSheet({
    engineVersion: ARITHMETIC_ENGINE_VERSION,
    catalogVersion: ARITHMETIC_CATALOG_VERSION,
    seed: "legacy-router",
    rounds: [
      {
        skills: [
          {
            skillId: "times-table",
            constraints: { dans: [3], multiplier: { min: 1, max: 9 } },
            count: 4,
          },
        ],
      },
    ],
  });
  vi.spyOn(PrivateCloudClient.prototype, "get").mockResolvedValue({
    id: "old-sheet",
    kind: "arithmeticSheet",
    title: "곱셈구구 복습",
    revision: 1,
    problemCount: 4,
    createdAt: "2026-10-14",
    updatedAt: "2026-10-14",
    payload,
  });
  render(
    <ArithmeticWorkbench
      preview
      canOutput
      storageScope="teacher"
      initialDocumentId="old-sheet"
    />,
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "기초 연산 · 세부 조건" }),
    ).toHaveAttribute("aria-pressed", "true"),
  );
  await screen.findByText(/저장된 연산식과 정답을 그대로 열었습니다/);
  expect(screen.getByRole("textbox", { name: "학습지 제목" })).toHaveValue(
    "곱셈구구 복습",
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "학년별 연산" })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "학년별 연산" }));
  await screen.findByRole("combobox", { name: "학년" });
  expect(screen.getByRole("button", { name: "학년별 연산" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

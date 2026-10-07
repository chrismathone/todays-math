import { fireEvent, render, screen, within } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { server } from "@/mocks/server";
import {
  ENGLISH_MOCK_EXAMS,
  ENGLISH_MOCK_SETS,
} from "@/mocks/handlers/english";
import { englishViewMenu, isEnglishView } from "@/components/english/views";
import { bankUiItem } from "../fixtures/englishBankUi";
import { Harness, installDialogShim, makeLog } from "./EnglishStudio.harness";

const set = ENGLISH_MOCK_SETS[0]!;
const exam = ENGLISH_MOCK_EXAMS.find((exam) => exam.id === set.examId)!;
const item = bankUiItem(0, {
  setId: set.id,
  examId: set.examId,
  school: exam.school,
  grade: exam.grade,
  examTitle: exam.title,
  title: set.title,
  passage: set.passage,
  question: set.questions[0]!,
  status: set.status,
});
beforeEach(() => {
  localStorage.clear();
  installDialogShim();
  server.use(
    http.get("/api/english/questions", () =>
      HttpResponse.json({
        data: { items: [item], total: 1, page: 1, pageSize: 20 },
      }),
    ),
  );
});
describe("English bank workspace integration", () => {
  it("uses the existing library permission and persists the tray across menu switches", async () => {
    expect(isEnglishView("english-questions")).toBe(true);
    expect(englishViewMenu("english-questions")).toBe("english-library");
    render(
      <Harness
        initialView="english-questions"
        log={makeLog()}
        allowedMenus={["english-library"]}
      />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "이 문항 담기" }),
    );
    expect(screen.queryByRole("button", { name: "AI 문제 제작" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "보관함 메뉴" }));
    await screen.findByRole("heading", { name: "내 문제 세트" });
    fireEvent.click(screen.getByRole("button", { name: "시험지 메뉴" }));
    expect(
      within(
        screen.getByRole("complementary", { name: "담은 문제" }),
      ).getAllByRole("listitem"),
    ).toHaveLength(1);
  });
  it("opens a question from a different exam with that question's actual exam", async () => {
    localStorage.setItem(
      "today-english-exam",
      ENGLISH_MOCK_EXAMS.find((x) => x.id !== set.examId)!.id,
    );
    render(<Harness initialView="english-questions" log={makeLog()} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "원본 세트 편집 →" }),
    );
    expect(
      await screen.findByRole("textbox", { name: "세트 이름" }),
    ).toHaveValue(set.title);
    expect(localStorage.getItem("today-english-exam")).toBe(set.examId);
  });
  it("shows an empty bank even before the first exam is registered", async () => {
    server.use(
      http.get("/api/english/exams", () => HttpResponse.json({ data: [] })),
      http.get("/api/english/questions", () =>
        HttpResponse.json({
          data: { items: [], total: 0, page: 1, pageSize: 20 },
        }),
      ),
    );
    render(<Harness initialView="english-questions" log={makeLog()} />);
    expect(
      await screen.findByRole("heading", {
        name: "조건에 맞는 문항이 없습니다",
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "첫 시험을 등록해 주세요" }),
    ).toBeNull();
  });
});

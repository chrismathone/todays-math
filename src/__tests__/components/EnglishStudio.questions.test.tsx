import { fireEvent, render, screen, within } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  Element.prototype.scrollIntoView = vi.fn();
  server.use(
    http.get("/api/english/questions/scopes", () =>
      HttpResponse.json({
        data: {
          items: [
            {
              id: item.setId,
              label: item.title,
              group: item.grade,
              detail: item.examTitle,
              count: 1,
            },
          ],
          total: 1,
        },
      }),
    ),
    http.post("/api/english/questions/compose", () =>
      HttpResponse.json({ data: [item] }),
    ),
  );
});
async function compose() {
  // 1단계 «범위 고르기»는 화면에 펴져 있다 — 체크하면 바로 구성표에 들어간다(적용 단추 없음).
  await screen.findByRole("region", { name: "범위 고르기" });
  fireEvent.change(screen.getByLabelText("학년·과정"), {
    target: { value: "" },
  });
  fireEvent.click(
    screen.getByRole("checkbox", { name: new RegExp(item.title) }),
  );
  fireEvent.change(screen.getByLabelText(`${item.title} 구성 수`), {
    target: { value: "1" },
  });
  fireEvent.click(screen.getByRole("button", { name: "문항 검토 →" }));
  await screen.findByRole("button", { name: "원본 세트 열기" });
}
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
    await compose();
    expect(screen.queryByRole("button", { name: "AI 문제 제작" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "보관함 메뉴" }));
    await screen.findByRole("heading", { name: "내 문제 세트" });
    fireEvent.click(screen.getByRole("button", { name: "시험지 메뉴" }));
    expect(
      within(screen.getByRole("region", { name: "문항 검토" })).getByRole(
        "button",
        { name: "원본 세트 열기" },
      ),
    ).toBeVisible();
  });
  it("opens a question from a different exam with that question's actual exam", async () => {
    localStorage.setItem(
      "today-english-exam",
      ENGLISH_MOCK_EXAMS.find((x) => x.id !== set.examId)!.id,
    );
    render(<Harness initialView="english-questions" log={makeLog()} />);
    await compose();
    fireEvent.click(
      await screen.findByRole("button", { name: "원본 세트 열기" }),
    );
    expect(
      await screen.findByRole("textbox", { name: "세트 이름" }),
    ).toHaveValue(set.title);
    expect(localStorage.getItem("today-english-exam")).toBe(set.examId);
  });
  it("shows an empty bank even before the first exam is registered", async () => {
    server.use(
      http.get("/api/english/exams", () => HttpResponse.json({ data: [] })),
      http.get("/api/english/questions/scopes", () =>
        HttpResponse.json({
          data: { items: [], total: 0 },
        }),
      ),
    );
    render(<Harness initialView="english-questions" log={makeLog()} />);
    // 1단계 화면 그대로 — 구성표가 «고를 범위 없음»을 말한다.
    expect(
      await screen.findByText(
        "선택할 출제 범위가 없습니다. 등록된 자료를 확인해 주세요.",
      ),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "첫 시험을 등록해 주세요" }),
    ).toBeNull();
  });
});

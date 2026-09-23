import { http, HttpResponse } from "msw";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ExamDashboard } from "@/components/exam/ExamDashboard";
import { RoundDetail } from "@/components/exam/RoundDetail";
import {
  MOCK_DETAIL_JEONGHWA,
  MOCK_EXAM_ROUNDS,
  ROUND_JEONGHWA_ID,
} from "@/mocks/data/predictions";
import { server } from "@/mocks/server";

describe("teacher exam recovery", () => {
  it("retries the round list after a transient failure", async () => {
    let calls = 0;
    server.use(
      http.get("/api/exam/rounds", () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json({}, { status: 503 })
          : HttpResponse.json({ data: MOCK_EXAM_ROUNDS });
      }),
    );
    const user = userEvent.setup();
    render(<ExamDashboard />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "회차를 불러오지 못했습니다",
    );
    await user.click(screen.getByRole("button", { name: "다시 불러오기" }));
    expect(
      await screen.findByRole("heading", { name: "진행 중인 내신" }),
    ).toBeInTheDocument();
    expect(calls).toBe(2);
  });

  it("retries a failed round detail without losing the list route", async () => {
    let calls = 0;
    server.use(
      http.get(`/api/exam/rounds/${ROUND_JEONGHWA_ID}`, () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json({}, { status: 503 })
          : HttpResponse.json({ data: MOCK_DETAIL_JEONGHWA });
      }),
    );
    const user = userEvent.setup();
    render(<RoundDetail roundId={ROUND_JEONGHWA_ID} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "회차를 불러오지 못했습니다",
    );
    expect(screen.getByRole("link", { name: "회차 목록" })).toHaveAttribute(
      "href",
      "/exam",
    );
    await user.click(screen.getByRole("button", { name: "다시 불러오기" }));
    expect(
      await screen.findByRole("rowheader", { name: "이서준" }),
    ).toBeInTheDocument();
    expect(calls).toBe(2);
  });
});

/**
 * 문제은행 수동 등록 — **한글(HWP) 수식 문법으로 쳐도 된다** (트랙 8, 2026-09-19).
 *
 * 원장님 결정 B: 본문은 한글 문장과 수식이 섞여 있으므로 **`$…$` 구간 안만**,
 * 역슬래시가 없을 때 바꾼다. 칸을 떠날 때 바꾸고, 바꿨으면 조용한 한 줄로 알린다.
 * 칸을 안 떠나고 바로 제출해도(정답 칸에서 Enter) 같은 변환을 거친 글이 저장된다 —
 * 변환 결과에는 역슬래시가 생기므로 두 번 걸려도 그대로다.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProblemRegisterForm } from "@/components/problem/ProblemRegisterForm";
import type { UnitEntity } from "@/contracts/unit.contract";
import { createProblem } from "@/lib/problem/problemApi";

vi.mock("@/lib/problem/problemApi", () => ({ createProblem: vi.fn() }));

const UNITS: UnitEntity[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    grade: "중1",
    chapter: "수와 연산",
    section: "제곱근",
    orderIndex: 1,
  },
];

const NOTICE = "한글 수식을 변환했습니다";

function renderForm() {
  const user = userEvent.setup();
  render(
    <ProblemRegisterForm
      units={UNITS}
      defaultUnitId={UNITS[0]!.id}
      onCreated={vi.fn()}
      onError={vi.fn()}
    />,
  );
  const content = screen.getByLabelText("본문") as HTMLTextAreaElement;
  const answer = screen.getByLabelText("정답") as HTMLInputElement;
  return { user, content, answer };
}

beforeEach(() => {
  vi.mocked(createProblem).mockReset();
});

describe("[문제은행 등록] 한글 수식 입력", () => {
  it("본문 칸을 떠나면 $…$ 안의 한글 수식만 LaTeX 로 바뀌고 한 줄로 알린다", async () => {
    const { user, content } = renderForm();
    await user.click(content);
    await user.paste(
      "넓이가 $root2$ 인 정사각형의 한 변을 x over 라 할 때 $a over b$ 는?",
    );
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();

    await user.tab();

    expect(content.value).toBe(
      "넓이가 $\\sqrt{2}$ 인 정사각형의 한 변을 x over 라 할 때 $\\frac{a}{b}$ 는?",
    );
    expect(screen.getByRole("status")).toHaveTextContent(NOTICE);
  });

  it("이미 LaTeX 인 구간과 한글 낱말이 없는 구간은 그대로 두고 알리지도 않는다", async () => {
    const { user, content } = renderForm();
    const typed = "함수 $\\frac{1}{2}x^2$ 와 $f(x)=ax+b$ 에서 root2 는 글자다.";
    await user.click(content);
    await user.paste(typed);
    await user.tab();

    expect(content.value).toBe(typed);
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
  });

  it("정답 칸도 같은 규칙으로 바꾼다", async () => {
    const { user, answer } = renderForm();
    await user.click(answer);
    await user.paste("$1 over 2$");
    await user.tab();

    expect(answer.value).toBe("$\\frac{1}{2}$");
    expect(screen.getByRole("status")).toHaveTextContent(NOTICE);
  });

  it("칸을 떠나지 않고 제출해도 바뀐 글이 저장된다", async () => {
    vi.mocked(createProblem).mockResolvedValue({ data: {} } as Awaited<
      ReturnType<typeof createProblem>
    >);
    const { content, answer } = renderForm();
    fireEvent.change(content, { target: { value: "$30DEG$ 인 각" } });
    fireEvent.change(answer, { target: { value: "$root 3$" } });

    fireEvent.submit(screen.getByRole("form", { name: "등록" }));

    await waitFor(() => expect(createProblem).toHaveBeenCalledTimes(1));
    expect(vi.mocked(createProblem).mock.calls[0]![0]).toMatchObject({
      content: "$30^\\circ$ 인 각",
      answer: "$\\sqrt{3}$",
    });
  });

  it("중괄호 짝이 안 맞으면 같은 줄에 덧붙여 알린다", async () => {
    const { user, content } = renderForm();
    await user.click(content);
    await user.paste("$root {x+1$");
    await user.tab();

    expect(screen.getByRole("status")).toHaveTextContent(
      `${NOTICE} — 중괄호 짝이 맞지 않습니다`,
    );
  });
});

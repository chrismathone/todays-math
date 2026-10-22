/**
 * 도형 편집기 글자 칸 «수식» 탭 — **한글(HWP) 수식 문법으로 쳐도 된다** (트랙 8, 2026-09-19).
 *
 * 원장님 결정 B: 확정(Enter · 포커스 아웃) 때 `hwpToLatex` 로 바꾼다. 역슬래시가 있으면
 * 이미 TeX 이므로 그대로 둔다. «일반 글자» 탭은 건드리지 않는다.
 *
 * 🔴 특수문자 자판(트랙 3)의 수식 대응 명령(`\angle ` 등)은 역슬래시를 넣는다 — 그 값은
 *    변환하지 않는다. 자판으로 ∠ 를 넣은 뒤 이어 친 한컴 낱말(`30DEG`)도 그대로 남는다
 *    (한 칸 안에서 TeX 와 한컴 문법을 섞지 않는다는 규칙의 결과다).
 */
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { FigureLabelInput } from "@/components/unified/figure-editor/FigureLabelInput";
import {
  FIGURE_SYMBOL_GROUPS,
  figureSymbolInput,
} from "@/components/unified/figure-editor/figureSymbols";
import { hwpToLatex } from "@/lib/math/hwpEquation";

vi.mock("@/components/unified/figure-editor/FigureMathEditor", () => ({
  default: ({ value }: { value: string }) => <span aria-label="구조 수식 값">{value}</span>,
}));

function Harness({
  initial,
  onValue,
}: {
  initial: string;
  onValue: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const [group, setGroup] = useState("기하");
  return (
    <>
      <FigureLabelInput
        value={value}
        onChange={(next) => {
          setValue(next);
          onValue(next);
        }}
        idPrefix="라벨"
        symbolGroup={group}
        onSymbolGroup={setGroup}
      />
      <button type="button">다른 곳</button>
    </>
  );
}

function renderLabel(initial = "$$") {
  const onValue = vi.fn();
  const user = userEvent.setup();
  render(<Harness initial={initial} onValue={onValue} />);
  const last = () => onValue.mock.calls.at(-1)?.[0] as string | undefined;
  return { user, onValue, last };
}

describe("[도형 글자 칸] 수식 탭 — 한글 수식 입력", () => {
  it("구조 수식 탭으로 바꿔도 HWP 변환 경고를 유지한다", async () => {
    const { user } = renderLabel();
    await user.click(screen.getByLabelText("라벨 수식"));
    await user.paste("root{2");
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "수식편집기" }));
    await screen.findByLabelText("구조 수식 값");
    expect(screen.getByRole("status")).toHaveTextContent("중괄호 짝이 맞지 않습니다");
    await user.click(screen.getByRole("button", { name: "수식", exact: true }));
    expect(screen.getByRole("status")).toHaveTextContent("중괄호 짝이 맞지 않습니다");
  });
  it('keeps a conversion warning across an unchanged blur and Enter', async () => {
    const {user}=renderLabel();
    const field=screen.getByLabelText('라벨 수식');
    await user.click(field);await user.paste('root{2');await user.keyboard('{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('중괄호 짝이 맞지 않습니다');
    await user.click(screen.getByRole('button',{name:'다른 곳'}));
    expect(screen.getByRole('status')).toHaveTextContent('중괄호 짝이 맞지 않습니다');
    await user.click(field);await user.keyboard('{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('중괄호 짝이 맞지 않습니다');
  });

  it("Enter 로 확정하면 한글 수식이 TeX 로 바뀐다 — root2 → √2", async () => {
    const { user, last } = renderLabel();
    const field = screen.getByLabelText("라벨 수식");
    await user.click(field);
    await user.paste("root2");
    expect(last()).toBe("$root2$");

    await user.keyboard("{Enter}");

    expect(last()).toBe("$\\sqrt{2}$");
    expect(field).toHaveValue("\\sqrt{2}");
  });

  it("칸을 떠나도 바뀐다 — a over b → 분수", async () => {
    const { user, last } = renderLabel();
    await user.click(screen.getByLabelText("라벨 수식"));
    await user.paste("a over b");
    await user.click(screen.getByRole("button", { name: "다른 곳" }));

    expect(last()).toBe("$\\frac{a}{b}$");
  });

  it("역슬래시가 있으면 이미 TeX 다 — 확정해도 그대로", async () => {
    const { user, onValue } = renderLabel("$\\frac{1}{2}$");
    await user.click(screen.getByLabelText("라벨 수식"));
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "다른 곳" }));

    expect(onValue).not.toHaveBeenCalled();
  });

  it("한컴 낱말이 없으면 확정해도 부르지 않는다 — x^2 는 그대로", async () => {
    const { user, onValue } = renderLabel("$x^2$");
    await user.click(screen.getByLabelText("라벨 수식"));
    await user.keyboard("{Enter}");

    expect(onValue).not.toHaveBeenCalled();
  });

  it("«일반 글자» 탭은 바꾸지 않는다 — root2 는 글자다", async () => {
    const { user, last } = renderLabel("");
    const field = screen.getByLabelText("라벨");
    await user.click(field);
    await user.paste("root2");
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "다른 곳" }));

    expect(last()).toBe("root2");
  });

  it("한글 입력기 조합 중의 Enter 는 확정이 아니다", async () => {
    const { user, last } = renderLabel();
    const field = screen.getByLabelText("라벨 수식");
    await user.click(field);
    await user.paste("root2");
    fireEvent.keyDown(field, { key: "Enter", isComposing: true });

    expect(last()).toBe("$root2$");
  });

  it("🔴 자판의 ∠ 를 넣은 값은 역슬래시가 있어 변환하지 않는다 — 뒤에 친 30DEG 도 그대로", async () => {
    const { user, last } = renderLabel();
    const field = screen.getByLabelText("라벨 수식");
    await user.click(field);
    await user.click(screen.getByRole("button", { name: "∠" }));
    await user.type(field, "ABC=30DEG");
    await user.keyboard("{Enter}");

    expect(last()).toBe("$\\angle ABC=30DEG$");
  });
});

describe("[도형 글자 칸] 특수문자 자판이 넣는 값은 변환기가 건드리지 않는다", () => {
  it("모든 무리의 모든 문자 — 수식 탭 대응 명령을 넣은 값은 확정해도 그대로다", () => {
    const touched: string[] = [];
    for (const group of FIGURE_SYMBOL_GROUPS)
      for (const symbol of group.symbols) {
        const body = `A${figureSymbolInput(symbol, "math")}B`;
        const result = hwpToLatex(body);
        if (result.changed)
          touched.push(`${group.name} ${symbol}: ${body} → ${result.latex}`);
      }
    expect(touched).toEqual([]);
  });
});

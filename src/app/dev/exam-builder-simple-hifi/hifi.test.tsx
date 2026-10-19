import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SimpleHifi } from "./SimpleHifi";
import { BLOCKERS, FORMATS, TIERS, VARIANTS, questionsFor } from "./fixtures";

const frame = (id: string) =>
  document.querySelector<HTMLElement>(`[data-hifi-screen="${id}"]`)!;
const query = (element: HTMLElement) => within(element);
const status = (element: HTMLElement) =>
  element.querySelector<HTMLElement>("[data-output-status]")!;
const cards = (element: HTMLElement) => [
  ...element.querySelectorAll<HTMLElement>("[data-hifi-question]"),
];

describe("Wire A를 유지한 Hi-fi 네 안", () => {
  it("네 안·여덟 화면·실제 장면 링크와 같은 열 구조를 렌더한다", () => {
    const { container } = render(<SimpleHifi />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(container.querySelectorAll("[data-hifi-option]")).toHaveLength(4);
    expect(container.querySelectorAll("[data-hifi-screen]")).toHaveLength(12);
    for (const link of container.querySelectorAll<HTMLAnchorElement>(
      'a[href^="#"]',
    ))
      expect(document.getElementById(link.hash.slice(1))).not.toBeNull();
    for (const variant of VARIANTS) {
      const scope = frame(`${variant.id}-1`);
      const review = frame(`${variant.id}-2`);
      expect(
        scope.querySelector("[data-scope-layout]")?.children[0].tagName,
      ).toBe("SECTION");
      expect(
        scope.querySelector("[data-scope-layout]")?.children[1].tagName,
      ).toBe("ASIDE");
      expect(
        review.querySelector("[data-review-layout]")?.children[0].tagName,
      ).toBe("ASIDE");
      expect(
        review.querySelector("[data-review-layout]")?.children[1].tagName,
      ).toBe("DIV");
      expect(
        query(scope).getByRole("button", { name: "전체" }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        query(scope).getByRole("button", { name: "교과서만" }),
      ).toHaveAttribute("aria-pressed", "false");
      expect(scope).toHaveTextContent("전체 735범위");
      expect(scope.querySelector('[aria-current="step"]')).toHaveTextContent(
        "범위 설정",
      );
      expect(review.querySelector('[aria-current="step"]')).toHaveTextContent(
        "문항 검토",
      );
      expect(review.querySelectorAll("[data-output-status]")).toHaveLength(1);
      expect(scope).not.toHaveTextContent(/보유\s*[\d,]+문항|70,368|67,893/);
    }
    expect(container).not.toHaveTextContent("추천");
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("실제 34·40·50·36개 배열의 형식·난이도·범위 합과 객관식 먼저 차례가 맞는다", () => {
    render(<SimpleHifi />);
    expect(VARIANTS.map((variant) => questionsFor(variant).length)).toEqual([
      34, 40, 50, 36,
    ]);
    for (const variant of VARIANTS) {
      const questions = questionsFor(variant);
      expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
      expect(
        FORMATS.map(
          (format) => questions.filter((q) => q.format === format).length,
        ),
      ).toEqual(variant.formats);
      expect(
        TIERS.map((tier) => questions.filter((q) => q.tier === tier).length),
      ).toEqual(variant.tiers);
      expect(
        [0, 1, 2, 3].map(
          (index) =>
            questions.filter((q) => q.lesson.id === `1-1-${index + 1}`).length,
        ),
      ).toEqual(variant.rows);
      const order = questions.map((q) => FORMATS.indexOf(q.format));
      expect(order).toEqual([...order].sort());
      const statistics = query(frame(`${variant.id}-2`)).getByRole("region", {
        name: "담은 문항 통계",
      });
      expect(statistics).toHaveTextContent(`담은 문항${questions.length}문항`);
      expect(cards(frame(`${variant.id}-2`))).toHaveLength(6);
    }
  });

  it.each(VARIANTS)(
    "$id에서 다섯 차단과 진행 가능을 실제 문항 수와 함께 전환한다",
    (variant) => {
      render(<SimpleHifi />);
      const review = frame(`${variant.id}-2`);
      const control = query(review).getByRole("combobox", {
        name: `${variant.id} 막힘 안내 예`,
      });
      for (const blocker of BLOCKERS) {
        fireEvent.change(control, { target: { value: blocker.value } });
        const action = status(review);
        expect(action.dataset.outputStatus).toBe(
          blocker.value === "ready" ? "ready" : "blocked",
        );
        if (blocker.value === "ready") {
          expect(
            query(action).getByRole("link", { name: "다음: 양식 구성·출력" }),
          ).toHaveAttribute("href", "#hifi-output-note");
        } else {
          const next = query(action).getByRole("button", {
            name: "다음: 양식 구성·출력",
          });
          expect(next).toBeDisabled();
          const reason = document.getElementById(
            next.getAttribute("aria-describedby")!,
          )!;
          expect(action.contains(reason)).toBe(true);
          if (blocker.value === "checking")
            expect(reason).toHaveTextContent(
              "출력할 문항을 확인하는 중입니다.",
            );
          if (blocker.value === "empty") {
            expect(reason).toHaveTextContent("담은 문항이 없습니다.");
            expect(cards(review)).toHaveLength(0);
          }
          if (blocker.value === "permission")
            expect(reason).toHaveTextContent(
              "원장님에게 출력 권한을 요청해 주세요.",
            );
          if (blocker.value === "total")
            expect(reason).toHaveTextContent(
              `총 ${questionsFor(variant).length + 6}문항 지정 · 현재 ${questionsFor(variant).length}문항`,
            );
          if (blocker.value === "format") {
            expect(reason).toHaveTextContent(
              `단답형 ${variant.formats[1] + 2}문항 지정 · 현재 ${variant.formats[1]}문항`,
            );
            expect(reason).toHaveTextContent(
              `서술형 ${variant.formats[2] - 2}문항 지정 · 현재 ${variant.formats[2]}문항`,
            );
          }
        }
      }
      expect(
        query(frame(`${variant.id}-1`)).getByRole("combobox", {
          name: `${variant.id} 1단계 목록 상태`,
        }),
      ).toHaveValue("ready");
    },
  );

  it("여덟 목록의 대기·실패·재시도에서 제목과 선택을 유지하고 다른 화면 상태를 바꾸지 않는다", () => {
    render(<SimpleHifi />);
    for (const variant of VARIANTS)
      for (const step of [1, 2]) {
        const panel = frame(`${variant.id}-${step}`);
        const input = panel.querySelector<HTMLInputElement>(
          "[data-screen-title]",
        )!;
        fireEvent.change(input, {
          target: { value: "아주 긴 제목을 입력해도 선택은 유지됩니다" },
        });
        const control = query(panel).getByRole("combobox", {
          name: `${variant.id} ${step}단계 목록 상태`,
        });
        for (const value of ["loading", "error"]) {
          fireEvent.change(control, { target: { value } });
          const feedback = [
            ...panel.querySelectorAll<HTMLElement>(
              `[data-list-state="${value}"]`,
            ),
          ].find((element) => !element.closest("dialog"))!;
          expect(feedback).not.toBeNull();
          expect(feedback).toHaveTextContent("선택은 유지됩니다.");
          expect(input.value).toBe("아주 긴 제목을 입력해도 선택은 유지됩니다");
          if (value === "error") {
            expect(feedback).toHaveAttribute("role", "alert");
            fireEvent.click(
              query(feedback).getByRole("button", { name: "다시 불러오기" }),
            );
            expect(control).toHaveValue("ready");
          }
        }
        if (step === 1)
          expect(
            panel.querySelectorAll(
              '[data-selected-scopes] input[type="number"]',
            ),
          ).toHaveLength(4);
      }
    const review = frame("H2-2");
    fireEvent.change(
      query(review).getByRole("combobox", { name: "H2 2단계 목록 상태" }),
      { target: { value: "error" } },
    );
    expect(status(review).dataset.outputStatus).toBe("ready");
    expect(
      query(status(review)).getByRole("link", { name: "다음: 양식 구성·출력" }),
    ).toBeVisible();
    expect(frame("H1-1").querySelector("[data-list-state]")).toBeNull();
  });

  it("범위 체크는 즉시 구성표에 반영하고 교과서 필터·검색과 실패 뒤에도 남는다", () => {
    render(<SimpleHifi />);
    const scope = frame("H1-1");
    const list = query(scope).getByRole("region", { name: "H1 범위 목록" });
    const first = query(list).getAllByRole("checkbox")[0];
    fireEvent.click(first);
    expect(scope).toHaveTextContent("선택 3개");
    expect(
      scope.querySelectorAll('[data-selected-scopes] input[type="number"]'),
    ).toHaveLength(3);
    fireEvent.click(query(scope).getByRole("button", { name: "교과서만" }));
    expect(query(scope).getByRole("combobox", { name: "책" })).toBeVisible();
    fireEvent.change(
      query(scope).getByRole("searchbox", { name: "범위 검색" }),
      { target: { value: "없는 범위" } },
    );
    expect(scope).toHaveTextContent("조건에 맞는 범위가 없습니다.");
    expect(
      scope.querySelectorAll('[data-selected-scopes] input[type="number"]'),
    ).toHaveLength(3);
    fireEvent.click(
      query(scope).getByRole("button", { name: "검색 조건 풀기" }),
    );
    expect(
      query(
        query(scope).getByRole("region", { name: "H1 범위 목록" }),
      ).getAllByRole("checkbox")[0],
    ).not.toBeChecked();
  });

  it("정답·해설은 모든 문항에서 처음 접히고 명시적으로만 열린다", () => {
    render(<SimpleHifi />);
    for (const article of document.querySelectorAll<HTMLElement>(
      "[data-hifi-question]",
    ))
      expect(article.querySelector("details")).not.toHaveAttribute("open");
    const first = cards(frame("H1-2"))[0];
    const summary = query(first).getByText("정답·해설 보기");
    fireEvent.click(summary);
    expect(summary.closest("details")).toHaveAttribute("open");
  });

  it("구성 조건 창에서 0과 지정 없음을 구분하고 취소하면 현재 조건을 보존한다", () => {
    render(<SimpleHifi />);
    const scope = frame("H2-1");
    const opener = query(scope).getByRole("button", {
      name: "구성 조건",
    });
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog", {
      name: "구성 조건",
    });
    expect(dialog).toHaveAttribute("open");
    fireEvent.click(
      query(dialog).getByRole("button", { name: "직접 · 난이도별 수 펼치기" }),
    );
    fireEvent.change(query(dialog).getByRole("spinbutton", { name: "연산" }), {
      target: { value: "0" },
    });
    expect(query(dialog).getByRole("spinbutton", { name: "연산" })).toHaveValue(
      0,
    );
    expect(query(dialog).getByRole("spinbutton", { name: "기본" })).toHaveValue(
      null,
    );
    fireEvent.change(
      query(dialog).getByRole("spinbutton", {
        name: "총 문항 수",
      }),
      { target: { value: "60" } },
    );
    fireEvent.click(query(dialog).getByRole("button", { name: "취소" }));
    expect(dialog).not.toHaveAttribute("open");
    expect(opener).toHaveFocus();
    expect(
      query(scope).getByRole("spinbutton", { name: "총 문항 수" }),
    ).toHaveValue(40);
    expect(
      query(scope).getByRole("checkbox", { name: "최근 14일 출제 빼기" }),
    ).toBeChecked();
    fireEvent.click(opener);
    fireEvent.click(query(dialog).getByRole("button", { name: "4단계" }));
    expect(query(dialog).getByRole("spinbutton", { name: "연산" })).toHaveValue(
      0,
    );
    expect(query(dialog).getByRole("spinbutton", { name: "기본" })).toHaveValue(
      7,
    );
    fireEvent.click(query(dialog).getByRole("button", { name: "적용" }));
    expect(scope).toHaveTextContent("4단계");
  });

  it("저장 조건의 이름 변경·줄 안 삭제 확인·적용 뒤 한 줄을 보존한다", () => {
    render(<SimpleHifi />);
    const scope = frame("H2-1");
    fireEvent.click(
      query(scope).getByRole("button", { name: "저장한 조건 · 3" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "저장한 조건",
    });
    const first = dialog.querySelector("article")!;
    fireEvent.click(query(first).getByRole("button", { name: "이름 바꾸기" }));
    fireEvent.change(
      query(first).getByRole("textbox", { name: "새 조건 이름" }),
      { target: { value: "초3 확인 조건" } },
    );
    fireEvent.click(query(first).getByRole("button", { name: "이름 변경" }));
    expect(first).toHaveTextContent("초3 확인 조건");
    fireEvent.click(query(first).getByRole("button", { name: "삭제" }));
    expect(first).toHaveTextContent("‘초3 확인 조건’ 조건을 삭제할까요?");
    fireEvent.click(query(first).getByRole("button", { name: "취소" }));
    fireEvent.click(query(first).getByRole("button", { name: "적용" }));
    expect(scope).toHaveTextContent("출제 조건 · 초3 확인 조건 적용함");
    expect(dialog).not.toHaveAttribute("open");
  });

  it("조건 수의 음수·소수는 적용을 막고 0과 빈 칸은 구분한다", () => {
    render(<SimpleHifi />);
    fireEvent.click(
      query(frame("H2-1")).getByRole("button", {
        name: "구성 조건",
      }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "구성 조건",
    });
    const apply = query(dialog).getByRole("button", {
      name: "적용",
    });
    fireEvent.click(
      query(dialog).getByRole("button", { name: "직접 · 난이도별 수 펼치기" }),
    );
    const basic = query(dialog).getByRole("spinbutton", {
      name: "기본",
    });
    for (const value of ["-1", "0.5"]) {
      fireEvent.change(basic, { target: { value } });
      expect(apply).toBeDisabled();
      expect(dialog).toHaveTextContent("0~100의 정수로 입력해 주세요.");
    }
    fireEvent.change(basic, { target: { value: "0" } });
    expect(apply).toBeEnabled();
    const total = query(dialog).getByRole("spinbutton", {
      name: "총 문항 수",
    });
    fireEvent.change(total, { target: { value: "40.5" } });
    expect(apply).toBeDisabled();
    expect(dialog).toHaveTextContent(
      "총 문항 수는 1~100의 정수로 입력해 주세요.",
    );
  });

  it("형식별 막힘은 편집한 실제 지정값을 표시하고 0을 생략하지 않는다", () => {
    render(<SimpleHifi />);
    const review = frame("H3-2");
    fireEvent.click(
      query(status(review)).getByRole("button", {
        name: "구성 조건",
      }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "구성 조건",
    });
    fireEvent.click(query(dialog).getByText("형식별 수", { exact: true }));
    for (const format of FORMATS)
      fireEvent.change(
        query(dialog).getByRole("spinbutton", { name: format }),
        { target: { value: format === "단답형" ? "0" : "" } },
      );
    fireEvent.click(query(dialog).getByRole("button", { name: "적용" }));
    expect(status(review)).toHaveTextContent("단답형 0문항 지정 · 현재 18문항");
    expect(status(review)).not.toHaveTextContent("단답형 20문항 지정");
  });

  it("막힘을 고쳐 복구 버튼이 사라지면 상단 구성 조건 단추로 초점을 돌린다", () => {
    render(<SimpleHifi />);
    const review = frame("H1-2");
    fireEvent.click(
      query(status(review)).getByRole("button", { name: "구성 조건" }),
    );
    const dialog = screen.getByRole("dialog", { name: "구성 조건" });
    fireEvent.change(
      query(dialog).getByRole("spinbutton", { name: "총 문항 수" }),
      { target: { value: "34" } },
    );
    fireEvent.click(query(dialog).getByRole("button", { name: "적용" }));
    expect(status(review).dataset.outputStatus).toBe("ready");
    expect(document.getElementById("H1-review-condition")).toHaveFocus();
  });

  it("저장 조건을 삭제하고 새로 저장해도 서로 다른 항목을 함께 지우지 않는다", () => {
    render(<SimpleHifi />);
    fireEvent.click(
      query(frame("H2-1")).getByRole("button", { name: "저장한 조건 · 3" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "저장한 조건",
    });
    const save = (name: string) => {
      fireEvent.change(
        query(dialog).getByRole("textbox", { name: "현재 조건 이름" }),
        { target: { value: name } },
      );
      fireEvent.click(query(dialog).getByRole("button", { name: "조건 저장" }));
    };
    const remove = (name: string) => {
      const item = query(dialog)
        .getByText(name, { exact: true })
        .closest("article")!;
      fireEvent.click(query(item).getByRole("button", { name: "삭제" }));
      fireEvent.click(query(item).getAllByRole("button", { name: "삭제" })[1]);
    };
    save("새 조건 A");
    save("새 조건 B");
    remove("새 조건 A");
    save("새 조건 C");
    remove("새 조건 B");
    expect(query(dialog).getByText("새 조건 C", { exact: true })).toBeVisible();
  });

  it("교체는 후보 대조만으로 반영하지 않고 명시적 교체 후 같은 자리를 유지하며 되돌린다", () => {
    render(<SimpleHifi />);
    const review = frame("H2-2");
    const before = cards(review).map((card) => card.dataset.hifiQuestion);
    fireEvent.click(
      query(cards(review)[0]).getByRole("button", {
        name: "비슷한 문항으로 교체",
      }),
    );
    const dialog = screen.getByRole("dialog", { name: "01번 문항 교체" });
    expect(
      query(dialog).getByRole("button", { name: "같은 문항류" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      query(dialog).getByRole("button", { name: "같은 차시의 다른 문항" }),
    ).toBeVisible();
    fireEvent.click(query(dialog).getAllByRole("button", { name: "대조" })[0]);
    expect(cards(review).map((card) => card.dataset.hifiQuestion)).toEqual(
      before,
    );
    fireEvent.click(
      query(dialog).getByRole("button", { name: "이 문항으로 교체" }),
    );
    const after = cards(review).map((card) => card.dataset.hifiQuestion);
    expect(after[0]).not.toEqual(before[0]);
    expect(after.slice(1)).toEqual(before.slice(1));
    expect(
      query(cards(review)[0]).getByRole("button", {
        name: "비슷한 문항으로 교체",
      }),
    ).toHaveFocus();
    fireEvent.click(query(review).getByRole("button", { name: "되돌리기" }));
    expect(cards(review).map((card) => card.dataset.hifiQuestion)).toEqual(
      before,
    );
  });

  it("키보드로 순서를 바꿔도 담은 수와 다른 화면은 유지한다", () => {
    render(<SimpleHifi />);
    const review = frame("H2-2");
    const before = cards(review).map((card) => card.dataset.hifiQuestion);
    fireEvent.keyDown(
      query(review).getByRole("button", {
        name: "1번 문항 본문으로 이동, Alt와 방향키로 순서 변경",
      }),
      { key: "ArrowDown", altKey: true },
    );
    expect(cards(review).map((card) => card.dataset.hifiQuestion)).toEqual([
      before[1],
      before[0],
      ...before.slice(2),
    ]);
    expect(review).toHaveTextContent("담은 문항40문항");
    expect(cards(frame("H1-2"))[0].dataset.hifiQuestion).toBe(
      questionsFor(VARIANTS[0])[0].id,
    );
  });
});

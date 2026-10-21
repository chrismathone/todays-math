import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioFigureEditor from "@/components/unified/figure-editor";
import { SVG_NS } from "@/components/unified/figure-editor/figureSvgEditing";

/**
 * 글자 칸 특수문자 자판 — 원장님 2026-09-19 «자주 쓰이는 특수문자들은 기본적으로 몇 개 나열해 놓고 클릭해서 입력»
 * · «카테고리를 묶어서 선택하게 (모바일 키보드 자판처럼)». 입력칸 바로 아래, 무리 탭 + 문자 격자.
 */
vi.mock(
  "@/components/unified/figure-editor/figureTypeset",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/components/unified/figure-editor/figureTypeset")
      >();
    return { ...actual, typesetFigureSvg: async (source: string) => source };
  },
);

const crop = "data:image/png;base64,b3JpZ2luYWw=";
const figure = `<svg xmlns="${SVG_NS}" viewBox="0 0 480 360"><text x="100" y="100" font-size="18" data-mj="AB">AB</text><text x="200" y="100" font-size="18" data-mj="$x$">x</text></svg>`;
const identity = {
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: 0,
  f: 0,
  inverse() {
    return this;
  },
  multiply() {
    return this;
  },
};
class Point {
  constructor(
    public x = 0,
    public y = 0,
  ) {}
  matrixTransform() {
    return new Point(this.x, this.y);
  }
}
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("DOMPoint", Point);
  vi.stubGlobal("PointerEvent", MouseEvent);
  Object.defineProperty(SVGElement.prototype, "getScreenCTM", {
    configurable: true,
    value: () => identity,
  });
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value: () => ({ x: 20, y: 30, width: 60, height: 60 }),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const open = () =>
  render(
    <StudioFigureEditor
      image={crop}
      initialSvg={figure}
      index={0}
      onSave={vi.fn()}
      onClose={vi.fn()}
    />,
  );
const pickNumber = (n: number) =>
  fireEvent.click(document.querySelector(`[data-figure-list-number="${n}"]`)!);
const tabs = () =>
  within(screen.getByRole("group", { name: "선택한 도형 글자 특수문자 무리" }));
const keys = () =>
  within(screen.getByRole("group", { name: "선택한 도형 글자 특수문자" }));
const textInput = () =>
  screen.getByRole<HTMLInputElement>("textbox", { name: "선택한 도형 글자" });
const mathInput = () =>
  screen.getByRole<HTMLInputElement>("textbox", {
    name: "선택한 도형 글자 수식",
  });
const firstText = () =>
  document.querySelector("#figure-editor-canvas text")!.getAttribute("data-mj");

describe("특수문자 자판 — 무리 탭과 문자 격자", () => {
  it("글자를 고르면 입력칸 바로 아래에 자판이 있고, 처음 무리는 «기하»", () => {
    open();
    pickNumber(1);
    const input = textInput();
    const board = screen.getByRole("group", {
      name: "선택한 도형 글자 특수문자 무리",
    });
    // 입력칸 바로 다음 형제가 자판이다
    expect(input.nextElementSibling).toContainElement(board);
    expect(tabs().getByRole("button", { name: "기하" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(keys().getByRole("button", { name: "∠" })).toHaveAttribute(
      "type",
      "button",
    );
    expect(keys().queryByRole("button", { name: "π" })).toBeNull();
  });

  it("무리 탭을 누르면 격자가 그 무리 문자로 바뀐다", () => {
    open();
    pickNumber(1);
    fireEvent.click(tabs().getByRole("button", { name: "그리스" }));
    expect(tabs().getByRole("button", { name: "그리스" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(tabs().getByRole("button", { name: "기하" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(keys().getByRole("button", { name: "π" })).toBeInTheDocument();
    expect(keys().queryByRole("button", { name: "∠" })).toBeNull();
  });

  it("마지막으로 연 무리는 다른 글자를 골라도 기억한다", () => {
    open();
    pickNumber(1);
    fireEvent.click(tabs().getByRole("button", { name: "단위" }));
    pickNumber(2);
    expect(tabs().getByRole("button", { name: "단위" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("새 글자(글자 도구)의 입력칸에도 같은 자판이 있다", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "글자" }));
    expect(
      screen.getByRole("group", { name: "추가할 도형 글자 특수문자" }),
    ).toBeInTheDocument();
  });
});

describe("특수문자 자판 — 넣기", () => {
  it('places converted root2 on the canvas without Enter', async () => {
    open();
    await waitFor(() => expect(screen.getByLabelText('도형 편집 캔버스')).toHaveAttribute('aria-busy','false'));
    fireEvent.click(screen.getByRole('button',{name:'글자'}));
    fireEvent.click(within(screen.getByRole('group',{name:'추가할 도형 글자 종류'})).getByRole('button',{name:'수식'}));
    const input=screen.getByLabelText('추가할 도형 글자 수식');
    fireEvent.change(input,{target:{value:'root2'}});
    expect(input).toHaveValue('root2');
    const canvas=document.querySelector('#figure-editor-canvas svg')!;
    fireEvent.pointerDown(canvas,{button:0,clientX:320,clientY:220,pointerId:1,isPrimary:true});
    await waitFor(()=>expect(document.querySelectorAll('#figure-editor-canvas text')).toHaveLength(3));
    expect(document.querySelectorAll('#figure-editor-canvas text')[2]).toHaveAttribute('data-mj','$\\sqrt{2}$');
  });

  it("커서 자리에 넣고, 커서는 넣은 글자 뒤·입력칸에 초점", async () => {
    open();
    pickNumber(1);
    const input = textInput();
    input.focus();
    input.setSelectionRange(1, 1);
    fireEvent.click(keys().getByRole("button", { name: "∠" }));
    expect(textInput()).toHaveValue("A∠B");
    expect(firstText()).toBe("A∠B");
    await waitFor(() => expect(textInput().selectionStart).toBe(2));
    expect(document.activeElement).toBe(textInput());
  });

  it("골라 둔 글자가 있으면 바꾼다", () => {
    open();
    pickNumber(1);
    const input = textInput();
    input.focus();
    input.setSelectionRange(0, 1);
    fireEvent.click(keys().getByRole("button", { name: "°" }));
    expect(textInput()).toHaveValue("°B");
  });

  it("«수식»에서는 대응 명령을 넣는다 — ∠ → \\angle", async () => {
    open();
    pickNumber(2);
    const input = mathInput();
    input.focus();
    input.setSelectionRange(0, 0);
    fireEvent.click(keys().getByRole("button", { name: "∠" }));
    expect(mathInput()).toHaveValue("\\angle x");
    expect(
      document
        .querySelectorAll("#figure-editor-canvas text")[1]
        .getAttribute("data-mj"),
    ).toBe("$\\angle x$");
    await waitFor(() => expect(mathInput().selectionStart).toBe(7));
  });

  it("«수식»에서 { } 가 든 명령은 커서가 괄호 안에 선다 — √ → \\sqrt{}", async () => {
    open();
    pickNumber(2);
    const input = mathInput();
    input.focus();
    input.setSelectionRange(1, 1);
    fireEvent.click(tabs().getByRole("button", { name: "연산" }));
    fireEvent.click(keys().getByRole("button", { name: "√" }));
    expect(mathInput()).toHaveValue("x\\sqrt{}");
    await waitFor(() => expect(mathInput().selectionStart).toBe(7));
  });

  it("되돌리기가 넣은 글자를 되돌린다", () => {
    open();
    pickNumber(1);
    fireEvent.click(keys().getByRole("button", { name: "△" }));
    expect(firstText()).toBe("AB△");
    fireEvent.click(screen.getByRole("button", { name: /되돌리기/ }));
    expect(firstText()).toBe("AB");
    fireEvent.click(screen.getByRole("button", { name: /다시 실행/ }));
    expect(firstText()).toBe("AB△");
  });
});

import {act,fireEvent,render,screen} from "@testing-library/react";
import {expect,it,vi} from "vitest";

vi.mock("mathlive", () => {
  class Field extends HTMLElement {
    value = "";
    set menuItems(_value: unknown[]) {
      if (!this.isConnected) throw new Error("Mathfield not mounted");
    }
    getValue() { return this.value; }
    setValue(value: string) { this.value = value; }
    insert(value: string) { this.value += value.replaceAll("#?", "\\placeholder{}"); }
    executeCommand() {}
  }
  customElements.define("test-figure-math-field", Field);
  return {MathfieldElement: Field};
});
import FigureMathEditor from "@/components/unified/figure-editor/FigureMathEditor";

it("recreates a field with the same value when its label identity changes", () => {
  const onChange=vi.fn();
  const view=render(<FigureMathEditor value="x^2" idPrefix="첫 라벨" onChange={onChange}/>);
  expect((screen.getByLabelText("첫 라벨 수식편집기") as HTMLElement & {value:string}).value).toBe("x^2");
  view.rerender(<FigureMathEditor value="x^2" idPrefix="다음 라벨" onChange={onChange}/>);
  expect((screen.getByLabelText("다음 라벨 수식편집기") as HTMLElement & {value:string}).value).toBe("x^2");
  expect(onChange).not.toHaveBeenCalled();
});

it("retains editable slots in the field and removes placeholder commands from stored labels", () => {
  const onChange=vi.fn();render(<FigureMathEditor value="" idPrefix="라벨" onChange={onChange}/>);
  fireEvent.click(screen.getByRole("button",{name:"분수",exact:true}));
  expect(onChange).toHaveBeenLastCalledWith("\\frac{}{}");
  expect((screen.getByLabelText("라벨 수식편집기") as HTMLElement & {value:string}).value).toContain("\\placeholder{}");
});

it("flushes the last typed value before a canvas pointer event, without waiting for a delayed input", async () => {
  const onChange=vi.fn();const view=render(<FigureMathEditor value="x" idPrefix="라벨" onChange={onChange}/>);
  const field=screen.getByLabelText("라벨 수식편집기") as HTMLElement & {value:string};field.value="x+1";
  fireEvent.pointerDown(document.body);
  expect(onChange).toHaveBeenLastCalledWith("x+1");
  onChange.mockClear();
  fireEvent.keyDown(field,{key:"2"});view.unmount();
  await act(async()=>{});expect(onChange).not.toHaveBeenCalled();
});

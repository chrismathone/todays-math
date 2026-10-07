/**
 * 교재 제작 완성 보기의 «내용 고르기» 창을 다루는 시험 도우미(D-159).
 * 구획은 화면의 단추 벽이 아니라 이 창에서 고른다 — 대단원 → 소단원(→ 활동).
 */
import { fireEvent, screen, within } from "@testing-library/react";
import { afterAll, beforeAll } from "vitest";

/** jsdom 에는 모달 API 가 없다 — 창을 여는 시험 파일이 머리에서 한 번 부른다. 실제 초점 잠금은 브라우저 시험이 본다. */
export function installDialogPolyfill() {
  const names = ["showModal", "close"] as const;
  const originals = names.map((name) =>
    Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, name),
  );
  beforeAll(() => {
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute("open", "");
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute("open");
      },
    });
  });
  afterAll(() =>
    names.forEach((name, i) => {
      const original = originals[i];
      if (original)
        Object.defineProperty(HTMLDialogElement.prototype, name, original);
      else
        delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>)[
          name
        ];
    }),
  );
}

/** 완성 보기의 «내용 고르기» 단추 — 처리 중에는 잠긴다. */
export const contentPickerButton = () =>
  screen.getByRole("button", { name: "내용 고르기" });

/** «내용 고르기» 창에서 구획을 고른다. 대단원을 안 주면 지금 보는 구획의 대단원에서 고른다. */
export function pickContent(path: {
  unit?: string;
  group: string | RegExp;
  activity?: string;
}) {
  fireEvent.click(contentPickerButton());
  const dialog = screen.getByRole("dialog", { name: "내용 고르기" });
  const column = (name: string) => within(dialog).getByRole("group", { name });
  if (path.unit)
    fireEvent.click(
      within(column("대단원")).getByRole("button", { name: path.unit }),
    );
  fireEvent.click(
    within(column("소단원")).getByRole("button", { name: path.group }),
  );
  if (path.activity)
    fireEvent.click(
      within(column("활동")).getByRole("button", { name: path.activity }),
    );
}

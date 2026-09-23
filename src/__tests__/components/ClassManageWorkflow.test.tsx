import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ClassManage } from "@/components/class/ClassManage";
import type {
  ClassEntity,
  ProgressEntity,
  StudentEntity,
} from "@/contracts/class.contract";
import * as api from "@/lib/class/classApi";
import {
  CLASS_A_ID,
  CLASS_B_ID,
  MOCK_CLASS_A,
  MOCK_CLASS_B,
  MOCK_CURRENT_PROGRESS,
  MOCK_STUDENTS,
  MOCK_UNITS,
} from "@/mocks/data";

vi.mock("@/lib/class/classApi");
const mocked = vi.mocked(api);
const studentsA = MOCK_STUDENTS.filter((row) => row.classId === CLASS_A_ID);
const studentsB = MOCK_STUDENTS.filter((row) => row.classId === CLASS_B_ID);
const createdStudent = { ...studentsA[0]!, id: "new-student", name: "새학생" };
const createdClass = {
  ...MOCK_CLASS_A,
  id: "new-class",
  name: "새반",
  grade: "중3",
};
const nextProgress = {
  ...MOCK_CURRENT_PROGRESS.classA,
  unitId: MOCK_UNITS[1]!.id,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function studentSection() {
  return within(screen.getByRole("region", { name: "학생" }));
}
function progressSection() {
  return within(screen.getByRole("region", { name: "진도" }));
}
function classForm() {
  return within(screen.getByRole("form", { name: "반 추가" }));
}
function studentForm() {
  return within(screen.getByRole("form", { name: "학생 등록" }));
}

function renderManage(units = MOCK_UNITS) {
  const user = userEvent.setup();
  render(<ClassManage units={units} canManageRoster />);
  return user;
}

async function readyManage() {
  const user = renderManage();
  await screen.findByText("이서준");
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "다음 소단원" })).toBeEnabled(),
  );
  return user;
}

async function switchToB(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: MOCK_CLASS_B.name }));
  await screen.findByText("최수아");
  await waitFor(() =>
    expect(
      progressSection().getByRole("button", { name: "순환소수" }),
    ).toHaveAttribute("aria-current", "true"),
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  mocked.fetchClasses.mockResolvedValue([MOCK_CLASS_A, MOCK_CLASS_B]);
  mocked.fetchStudents.mockImplementation(async (id) =>
    id === CLASS_A_ID ? studentsA : id === CLASS_B_ID ? studentsB : [],
  );
  mocked.fetchProgress.mockImplementation(async (id) =>
    id === CLASS_A_ID
      ? MOCK_CURRENT_PROGRESS.classA
      : id === CLASS_B_ID
        ? MOCK_CURRENT_PROGRESS.classB
        : null,
  );
  mocked.createClass.mockResolvedValue(createdClass);
  mocked.createStudent.mockResolvedValue(createdStudent);
  mocked.recordProgress.mockResolvedValue(nextProgress);
  mocked.advanceProgress.mockResolvedValue(nextProgress);
});

describe("class management context and reads", () => {
  it("identifies the selected class in both sections and keeps data on repeated selection", async () => {
    const user = await readyManage();
    const identity = `${MOCK_CLASS_A.name} · ${MOCK_CLASS_A.grade}`;
    expect(studentSection().getByText(identity)).toBeInTheDocument();
    expect(progressSection().getByText(identity)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: MOCK_CLASS_A.name }));
    expect(screen.getByText("이서준")).toBeInTheDocument();
    expect(mocked.fetchStudents).toHaveBeenCalledTimes(1);
    await switchToB(user);
    expect(
      studentSection().getByText(
        `${MOCK_CLASS_B.name} · ${MOCK_CLASS_B.grade}`,
      ),
    ).toBeInTheDocument();
    expect(
      progressSection().getByText(
        `${MOCK_CLASS_B.name} · ${MOCK_CLASS_B.grade}`,
      ),
    ).toBeInTheDocument();
  });

  it("explains an empty class list and prevents progress writes without a class", async () => {
    mocked.fetchClasses.mockResolvedValue([]);
    const user = renderManage();
    expect(await screen.findByText(/등록된 반이 없습니다/)).toBeInTheDocument();
    expect(
      studentSection().getByText(/반을 추가하면 학생/),
    ).toBeInTheDocument();
    expect(
      progressSection().getByText(/반을 추가하면 진도/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("form", { name: "학생 등록" }),
    ).not.toBeInTheDocument();
    for (const button of progressSection().getAllByRole("button"))
      expect(button).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "다음 소단원" }));
    expect(mocked.advanceProgress).not.toHaveBeenCalled();
    expect(mocked.fetchStudents).not.toHaveBeenCalled();
  });

  it("distinguishes pending data from empty students and missing progress", async () => {
    const students = deferred<StudentEntity[]>();
    const progress = deferred<ProgressEntity | null>();
    mocked.fetchStudents.mockReturnValue(students.promise);
    mocked.fetchProgress.mockReturnValue(progress.promise);
    renderManage();
    expect(
      await screen.findByText("학생 목록을 불러오는 중…"),
    ).toBeInTheDocument();
    expect(screen.getByText("진도를 불러오는 중…")).toBeInTheDocument();
    expect(
      screen.queryByText(/등록된 학생이 없습니다/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/저장된 진도가 없습니다/),
    ).not.toBeInTheDocument();
    expect(studentForm().getByRole("textbox")).toBeDisabled();
    for (const button of progressSection().getAllByRole("button"))
      expect(button).toBeDisabled();
    await act(async () => {
      students.resolve([]);
      progress.resolve(null);
    });
    expect(screen.getByText(/등록된 학생이 없습니다/)).toBeInTheDocument();
    expect(screen.getByText(/저장된 진도가 없습니다/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음 소단원" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "순환소수" })).toBeEnabled();
  });

  it("recovers a class list failure without calling it empty", async () => {
    mocked.fetchClasses.mockRejectedValueOnce(new Error("offline"));
    const user = renderManage();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "반 목록을 불러오지 못했습니다.",
    );
    expect(screen.queryByText(/등록된 반이 없습니다/)).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "반 목록 다시 불러오기" }),
    );
    expect(await screen.findByText("이서준")).toBeInTheDocument();
  });

  it.each(["students", "progress"] as const)(
    "isolates %s read failures and supports retry",
    async (section) => {
      if (section === "students")
        mocked.fetchStudents.mockRejectedValueOnce(new Error("offline"));
      else mocked.fetchProgress.mockRejectedValueOnce(new Error("offline"));
      const user = renderManage();
      const message =
        section === "students"
          ? "학생 목록을 불러오지 못했습니다."
          : "진도를 불러오지 못했습니다.";
      expect(await screen.findByRole("alert")).toHaveTextContent(message);
      if (section === "students") {
        await waitFor(() =>
          expect(
            screen.getByRole("button", { name: "다음 소단원" }),
          ).toBeEnabled(),
        );
        expect(
          screen.queryByText(/등록된 학생이 없습니다/),
        ).not.toBeInTheDocument();
      } else {
        expect(await screen.findByText("이서준")).toBeInTheDocument();
        expect(
          screen.queryByText(/저장된 진도가 없습니다/),
        ).not.toBeInTheDocument();
      }
      await user.click(
        screen.getByRole("button", {
          name:
            section === "students"
              ? "학생 목록 다시 불러오기"
              : "진도 다시 불러오기",
        }),
      );
      await waitFor(() =>
        expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
      );
      expect(await screen.findByText("이서준")).toBeInTheDocument();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "다음 소단원" }),
        ).toBeEnabled(),
      );
    },
  );

  it("discards old reads even after returning to the original class", async () => {
    const oldStudents = deferred<StudentEntity[]>();
    const oldProgress = deferred<ProgressEntity | null>();
    mocked.fetchStudents.mockReturnValueOnce(oldStudents.promise);
    mocked.fetchProgress.mockReturnValueOnce(oldProgress.promise);
    const user = renderManage();
    await screen.findByText("학생 목록을 불러오는 중…");
    await waitFor(() =>
      expect(mocked.fetchProgress).toHaveBeenCalledWith(CLASS_A_ID),
    );
    await switchToB(user);
    await user.click(screen.getByRole("button", { name: MOCK_CLASS_A.name }));
    await screen.findByText("이서준");
    await act(async () => {
      oldStudents.resolve([{ ...createdStudent, name: "오래된학생" }]);
      oldProgress.resolve(nextProgress);
    });
    expect(screen.queryByText("오래된학생")).not.toBeInTheDocument();
    expect(screen.getByText("이서준")).toBeInTheDocument();
    expect(
      progressSection().getByRole("button", { name: MOCK_UNITS[3]!.section }),
    ).toHaveAttribute("aria-current", "true");
  });

  it("does not label an unknown saved unit as missing progress", async () => {
    mocked.fetchProgress.mockResolvedValue({
      ...nextProgress,
      unitId: "unlisted-unit",
    });
    renderManage([]);
    expect(
      await screen.findByText("저장된 단원을 확인할 수 없습니다"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("선택할 수 있는 단원이 없습니다."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음 소단원" })).toBeDisabled();
  });
});

describe("class and student creation", () => {
  it("retains class inputs on failure, blocks duplicate posts, then selects the successful class", async () => {
    const pending = deferred<ClassEntity>();
    mocked.createClass.mockReturnValueOnce(pending.promise);
    const user = await readyManage();
    await user.type(
      classForm().getByRole("textbox", { name: "반 이름" }),
      "새반",
    );
    await user.type(classForm().getByRole("textbox", { name: "학년" }), "중3");
    await user.click(classForm().getByRole("button", { name: "반 추가" }));
    expect(classForm().getByRole("status")).toHaveTextContent(
      "반을 추가하는 중…",
    );
    expect(
      classForm().getByRole("button", { name: "추가 중…" }),
    ).toBeDisabled();
    fireEvent.submit(screen.getByRole("form", { name: "반 추가" }));
    expect(mocked.createClass).toHaveBeenCalledTimes(1);
    await act(async () => pending.reject(new Error("offline")));
    expect(classForm().getByRole("alert")).toHaveTextContent(
      "반을 추가하지 못했습니다",
    );
    expect(classForm().getByRole("textbox", { name: "반 이름" })).toHaveValue(
      "새반",
    );
    expect(classForm().getByRole("textbox", { name: "학년" })).toHaveValue(
      "중3",
    );
    await user.click(classForm().getByRole("button", { name: "반 추가" }));
    expect(await screen.findByRole("button", { name: "새반" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(classForm().getByRole("textbox", { name: "반 이름" })).toHaveValue(
      "",
    );
    expect(classForm().getByRole("textbox", { name: "학년" })).toHaveValue("");
    expect(classForm().getByRole("status")).toHaveTextContent(
      "새반 반을 추가했습니다.",
    );
    expect(studentSection().getByText("새반 · 중3")).toBeInTheDocument();
  });

  it("does not override a newer class selection when class creation finishes", async () => {
    const pending = deferred<ClassEntity>();
    mocked.createClass.mockReturnValue(pending.promise);
    const user = await readyManage();
    await user.type(
      classForm().getByRole("textbox", { name: "반 이름" }),
      "새반",
    );
    await user.type(classForm().getByRole("textbox", { name: "학년" }), "중3");
    await user.click(classForm().getByRole("button", { name: "반 추가" }));
    await switchToB(user);
    await act(async () => pending.resolve(createdClass));
    expect(
      screen.getByRole("button", { name: MOCK_CLASS_B.name }),
    ).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "새반" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByText("최수아")).toBeInTheDocument();
  });

  it("retains a student name on failure, prevents duplicate posts, and clears it after success", async () => {
    const pending = deferred<StudentEntity>();
    mocked.createStudent.mockReturnValueOnce(pending.promise);
    const user = await readyManage();
    await user.type(studentForm().getByRole("textbox"), "새학생");
    await user.click(studentForm().getByRole("button"));
    expect(studentForm().getByRole("status")).toHaveTextContent(
      "학생을 등록하는 중…",
    );
    expect(studentForm().getByRole("textbox")).toBeDisabled();
    fireEvent.submit(screen.getByRole("form", { name: "학생 등록" }));
    expect(mocked.createStudent).toHaveBeenCalledTimes(1);
    await act(async () => pending.reject(new Error("offline")));
    expect(studentForm().getByRole("alert")).toHaveTextContent(
      "학생을 등록하지 못했습니다",
    );
    expect(studentForm().getByRole("textbox")).toHaveValue("새학생");
    await user.click(studentForm().getByRole("button"));
    expect(await studentSection().findByText("새학생")).toBeInTheDocument();
    expect(studentForm().getByRole("textbox")).toHaveValue("");
    expect(mocked.createStudent).toHaveBeenLastCalledWith(CLASS_A_ID, "새학생");
    expect(studentForm().queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each(["success", "failure"] as const)(
    "keeps late student %s and drafts with their class",
    async (outcome) => {
      const pending = deferred<StudentEntity>();
      mocked.createStudent.mockReturnValueOnce(pending.promise);
      const user = await readyManage();
      await user.type(studentForm().getByRole("textbox"), "새학생");
      await user.click(studentForm().getByRole("button"));
      await switchToB(user);
      await user.type(studentForm().getByRole("textbox"), "다른학생");
      await act(async () => {
        if (outcome === "success") pending.resolve(createdStudent);
        else pending.reject(new Error("offline"));
      });
      expect(studentForm().getByRole("textbox")).toHaveValue("다른학생");
      expect(screen.queryByText("새학생")).not.toBeInTheDocument();
      expect(studentForm().queryByRole("alert")).not.toBeInTheDocument();
      expect(studentForm().queryByRole("status")).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: MOCK_CLASS_A.name }));
      await screen.findByText("이서준");
      expect(studentForm().getByRole("textbox")).toHaveValue(
        outcome === "failure" ? "새학생" : "",
      );
    },
  );

  it("waits for an outstanding student post when returning to that class", async () => {
    const pending = deferred<StudentEntity>();
    mocked.createStudent.mockReturnValueOnce(pending.promise);
    const user = await readyManage();
    await user.type(studentForm().getByRole("textbox"), "새학생");
    await user.click(studentForm().getByRole("button"));
    await switchToB(user);
    await user.click(screen.getByRole("button", { name: MOCK_CLASS_A.name }));
    expect(studentForm().getByRole("button")).toBeDisabled();
    expect(screen.getByText("학생 목록을 불러오는 중…")).toBeInTheDocument();
    expect(
      mocked.fetchStudents.mock.calls.filter(([id]) => id === CLASS_A_ID),
    ).toHaveLength(1);
    fireEvent.submit(screen.getByRole("form", { name: "학생 등록" }));
    expect(mocked.createStudent).toHaveBeenCalledTimes(1);
    mocked.fetchStudents.mockResolvedValueOnce([...studentsA, createdStudent]);
    await act(async () => pending.resolve(createdStudent));
    expect(await studentSection().findByText("새학생")).toBeInTheDocument();
    expect(studentForm().getByRole("textbox")).toHaveValue("");
  });

  it("does not submit whitespace-only required values", async () => {
    const user = await readyManage();
    await user.type(
      classForm().getByRole("textbox", { name: "반 이름" }),
      "   ",
    );
    await user.type(classForm().getByRole("textbox", { name: "학년" }), "중2");
    await user.type(studentForm().getByRole("textbox"), "   ");
    expect(classForm().getByRole("button", { name: "반 추가" })).toBeDisabled();
    expect(studentForm().getByRole("button")).toBeDisabled();
    fireEvent.submit(screen.getByRole("form", { name: "반 추가" }));
    fireEvent.submit(screen.getByRole("form", { name: "학생 등록" }));
    expect(mocked.createClass).not.toHaveBeenCalled();
    expect(mocked.createStudent).not.toHaveBeenCalled();
  });
});

describe("progress saves", () => {
  it.each(["advance", "select"] as const)(
    "shows pending, failure and success for %s and prevents overlapping saves",
    async (method) => {
      const pending = deferred<ProgressEntity>();
      const save =
        method === "advance" ? mocked.advanceProgress : mocked.recordProgress;
      save.mockReturnValueOnce(pending.promise);
      const user = await readyManage();
      const label = method === "advance" ? "다음 소단원" : "순환소수";
      await user.click(screen.getByRole("button", { name: label }));
      expect(progressSection().getByRole("status")).toHaveTextContent(
        "진도를 저장하는 중…",
      );
      for (const button of progressSection().getAllByRole("button"))
        expect(button).toBeDisabled();
      await user.click(screen.getByRole("button", { name: label }));
      expect(save).toHaveBeenCalledTimes(1);
      await act(async () => pending.reject(new Error("offline")));
      expect(progressSection().getByRole("alert")).toHaveTextContent(
        /못했습니다/,
      );
      expect(
        screen.queryByText("다음 소단원이 없습니다"),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: MOCK_UNITS[3]!.section }),
      ).toHaveAttribute("aria-current", "true");
      await user.click(screen.getByRole("button", { name: label }));
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "순환소수" }),
        ).toHaveAttribute("aria-current", "true"),
      );
      expect(progressSection().getByRole("status")).toHaveTextContent(
        "진도를 저장했습니다.",
      );
      expect(progressSection().queryByRole("alert")).not.toBeInTheDocument();
    },
  );

  it.each([
    ["advance", "success"],
    ["advance", "failure"],
    ["select", "success"],
    ["select", "failure"],
  ] as const)(
    "ignores late %s %s for a different selected class",
    async (method, outcome) => {
      const pending = deferred<ProgressEntity>();
      const save =
        method === "advance" ? mocked.advanceProgress : mocked.recordProgress;
      save.mockReturnValueOnce(pending.promise);
      const user = await readyManage();
      await user.click(
        screen.getByRole("button", {
          name: method === "advance" ? "다음 소단원" : "순환소수",
        }),
      );
      await switchToB(user);
      await act(async () => {
        if (outcome === "success")
          pending.resolve({ ...nextProgress, unitId: MOCK_UNITS[2]!.id });
        else pending.reject(new Error("offline"));
      });
      expect(screen.getByRole("button", { name: "순환소수" })).toHaveAttribute(
        "aria-current",
        "true",
      );
      expect(progressSection().queryByRole("alert")).not.toBeInTheDocument();
      expect(progressSection().queryByRole("status")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "다음 소단원" })).toBeEnabled();
    },
  );

  it("waits for an outstanding progress save before reloading a reselected class", async () => {
    const pending = deferred<ProgressEntity>();
    mocked.advanceProgress.mockReturnValueOnce(pending.promise);
    const user = await readyManage();
    await user.click(screen.getByRole("button", { name: "다음 소단원" }));
    await switchToB(user);
    await user.click(screen.getByRole("button", { name: MOCK_CLASS_A.name }));
    expect(screen.getByText("진도를 불러오는 중…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음 소단원" })).toBeDisabled();
    expect(
      mocked.fetchProgress.mock.calls.filter(([id]) => id === CLASS_A_ID),
    ).toHaveLength(1);
    mocked.fetchProgress.mockResolvedValueOnce(nextProgress);
    await act(async () => pending.resolve(nextProgress));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "순환소수" })).toHaveAttribute(
        "aria-current",
        "true",
      ),
    );
    expect(screen.getByRole("button", { name: "다음 소단원" })).toBeEnabled();
  });
});

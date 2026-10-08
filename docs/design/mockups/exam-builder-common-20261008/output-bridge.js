// All concepts use the real WorksheetEditor on the development-only Next route.
// Only authored example questions cross this local, in-memory bridge.
(() => {
  const origin = "http://127.0.0.1:3179";
  let dialog,
    frame,
    loading,
    ready = false,
    draft,
    onBack,
    onClose,
    opener,
    timeout;
  let previousOverflow;

  function send(type, payload) {
    frame.contentWindow?.postMessage({ type, payload }, origin);
  }
  function close(payload) {
    if (!dialog.open) return;
    clearTimeout(timeout);
    const ids = new Set(draft.questions.map((q) => q.id));
    const returned =
      payload &&
      typeof payload.title === "string" &&
      payload.title.length <= 80 &&
      Array.isArray(payload.questionIds) &&
      payload.questionIds.every(
        (id) => typeof id === "string" && ids.has(id),
      ) &&
      new Set(payload.questionIds).size === payload.questionIds.length;
    dialog.close();
    document.documentElement.style.overflow = previousOverflow;
    if (returned) onBack?.(payload);
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    onClose?.(returned ? payload : undefined);
  }
  function requestClose() {
    if (ready) send("exam-concept:close");
    else close();
  }
  function create() {
    dialog = document.createElement("dialog");
    dialog.className = "exam-output-dialog";
    dialog.setAttribute("aria-label", "시험지 양식 구성");
    loading = document.createElement("div");
    loading.className = "exam-output-loading";
    const message = document.createElement("p");
    message.setAttribute("role", "status");
    message.textContent = "시험지 양식 구성 화면을 불러오고 있습니다…";
    const back = document.createElement("button");
    back.textContent = "문항 검토로 돌아가기";
    back.addEventListener("click", requestClose);
    loading.append(message, back);
    frame = document.createElement("iframe");
    frame.title = "공통 시험지 양식 구성";
    dialog.append(loading, frame);
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      requestClose();
    });
    document.body.append(dialog);
    window.addEventListener("message", (event) => {
      if (event.origin !== origin || event.source !== frame.contentWindow)
        return;
      if (event.data?.type === "exam-concept:ready") {
        ready = true;
        clearTimeout(timeout);
        loading.hidden = true;
        if (dialog.open) {
          send("exam-concept:open", draft);
          frame.focus();
        }
      } else if (event.data?.type === "exam-concept:back")
        close(event.data.payload);
    });
  }
  window.ExamOutput = {
    open(payload, callback, options = {}) {
      if (!payload.questions.length) return;
      draft = payload;
      onBack = callback;
      onClose = options.onClose;
      opener = document.activeElement;
      if (!dialog) create();
      previousOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";
      dialog.showModal();
      if (ready) {
        send("exam-concept:open", draft);
        frame.focus();
      } else {
        loading.querySelector("p").textContent =
          "시험지 양식 구성 화면을 불러오고 있습니다…";
        frame.src = origin + "/dev/exam-builder-output";
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          loading.querySelector("p").textContent =
            "양식 구성 화면에 연결되지 않았습니다. 로컬 미리보기 서버(3179)를 확인한 뒤 다시 열어 주세요.";
        }, 30000);
      }
    },
  };
})();

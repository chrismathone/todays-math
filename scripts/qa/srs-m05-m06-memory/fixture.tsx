import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { FadingSessionView } from "@/components/fading/FadingSessionView";
import { prepareMemory } from "./memory";
import s from "@/components/fading/fading.module.css";
import "katex/dist/katex.min.css";
import "@/app/globals.css";
import "./fixture.css";

const params = new URLSearchParams(location.search);
const fixture = await prepareMemory({
  step: params.get("step") === "4" ? 4 : params.get("step") === "3" ? 3 : 2,
  count: params.get("count") === "3" ? 3 : 4,
  cards: params.get("cards") !== "0",
  practice: params.get("practice") === "1",
  rating: params.get("rating") === "1",
});
function MemoryFixture() {
  const [state, setState] = useState(fixture.state);
  return (
    <div className={s.viewport} data-fading-viewport="true">
      <div
        className={`${s.root} ${s.scrollRoot}`}
        data-fading-root="true"
        data-session="true"
      >
        <main>
          <FadingSessionView
            student
            source={fixture.source}
            state={state}
            practice={fixture.practice}
            onState={(next) =>
              setState((previous) =>
                next.session
                  ? next
                  : {
                      ...next,
                      session: previous.session,
                      opened: previous.opened,
                    },
              )
            }
            onReconcile={setState}
            onExit={() => {}}
          />
        </main>
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<MemoryFixture />);

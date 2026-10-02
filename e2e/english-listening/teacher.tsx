import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ListeningTeacherWorkspace,
  type ListeningTeacherMaterial,
} from "@/components/english/listening/ListeningTeacherWorkspace";
import type { EnglishListeningDocument } from "@/contracts/englishListening.contract";
import { fixtureRequest } from "./client";
import "../../src/app/globals.css";
import "./frame.css";

type Selection = {
  document: EnglishListeningDocument;
  mediaUrlsByAssetId: Record<string, string>;
};

function TeacherHarness({
  materials,
}: {
  materials: ListeningTeacherMaterial[];
}) {
  const [selection, setSelection] = useState<Selection | null>(null);
  return (
    <>
      <div className="harness-bar">
        <strong>개발 검증용 · 저장/인증은 대역</strong>
        <a href="/student.html">학생 기기 검증</a>
        <a href="/student.html?audio=teacher_device">교실 방송 검증</a>
      </div>
      <p className="harness-note">
        재생 음원은 생성한 시험음입니다. 대본을 읽는 음성이 아닙니다.
      </p>
      <ListeningTeacherWorkspace
        materials={materials}
        selectedDocument={selection?.document ?? null}
        mediaUrlsByAssetId={selection?.mediaUrlsByAssetId ?? {}}
        onSelectMaterial={async (id, { signal }) => {
          const result = await fixtureRequest<Selection>(`teacher/${id}`);
          if (!signal.aborted) setSelection(result);
        }}
      />
    </>
  );
}

const materials = await fixtureRequest<ListeningTeacherMaterial[]>("teacher");
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TeacherHarness materials={materials} />
  </StrictMode>,
);

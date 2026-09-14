import type { StudioCrop } from "./studioHelpers";
import type { SchoolLevel } from "./types";

export interface StoredStudioSource {
  id: string;
  name: string;
  kind: "image" | "pdf" | "sample";
  pages: number;
  grade?: string;
  level?: SchoolLevel;
  gradeManual?: boolean;
}

export interface StudioSessionData {
  sources: StoredStudioSource[];
  crops: StudioCrop[];
  sourceId: string;
  pageNumber: number;
  activeCropId: string;
  inspectedPages: Record<string, string>;
  step: "upload" | "crop" | "review";
  grade: string;
  level: SchoolLevel;
}

interface Envelope {
  version: 1;
  revision: number;
  data: StudioSessionData;
}

const DB_NAME = "today-math-studio-v1";
const CONFLICT =
  "다른 창에서 자료 제작 작업이 변경되었습니다. 현재 작업을 확인한 뒤 새로고침해 주세요.";

/** 원본 Blob은 한 번만 저장하고 검수 상태는 별도로 갱신한다. */
export class StudioSessionStore {
  private revision = 0;
  private tail: Promise<unknown> = Promise.resolve();

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("session");
        request.result.createObjectStore("originals");
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () =>
        reject(
          new Error("다른 창의 자료 저장소를 닫은 뒤 다시 시도해 주세요."),
        );
      request.onsuccess = () => resolve(request.result);
    });
  }

  async load(): Promise<{
    data: StudioSessionData;
    originals: Map<string, Blob>;
  } | null> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["session", "originals"], "readonly");
      const request = tx.objectStore("session").get("active");
      let envelope: Envelope | undefined;
      let invalid = false;
      const originals = new Map<string, Blob>();
      request.onsuccess = () => {
        envelope = request.result as Envelope | undefined;
        if (!envelope) return;
        const data = envelope.data;
        if (
          envelope.version !== 1 ||
          !Number.isSafeInteger(envelope.revision) ||
          !data ||
          !Array.isArray(data.sources) ||
          !Array.isArray(data.crops) ||
          !["upload", "crop", "review"].includes(data.step) ||
          data.sources.some(
            (source) =>
              !source.id ||
              !source.name ||
              !["pdf", "image", "sample"].includes(source.kind),
          ) ||
          data.crops.some(
            (crop) =>
              !crop.id ||
              !crop.sourceId ||
              typeof crop.content !== "string" ||
              !crop.rect,
          )
        ) {
          invalid = true;
          tx.abort();
          return;
        }
        for (const source of data.sources) {
          if (source.kind === "sample") continue;
          const asset = tx.objectStore("originals").get(source.id);
          asset.onsuccess = () => {
            if (!(asset.result instanceof Blob)) {
              invalid = true;
              tx.abort();
            } else originals.set(source.id, asset.result);
          };
        }
      };
      tx.oncomplete = () => {
        db.close();
        this.revision = envelope?.revision ?? 0;
        resolve(envelope ? { data: envelope.data, originals } : null);
      };
      tx.onabort = tx.onerror = () => {
        db.close();
        reject(
          invalid
            ? new Error(
                "저장된 자료 제작 원본을 읽지 못했습니다. 기존 작업은 덮어쓰지 않았습니다.",
              )
            : tx.error,
        );
      };
    });
  }

  save(data: StudioSessionData, originals: Map<string, Blob>): Promise<void> {
    return this.write(data, originals);
  }

  clear(): Promise<void> {
    return this.write(null, new Map());
  }

  private write(
    data: StudioSessionData | null,
    originals: Map<string, Blob>,
  ): Promise<void> {
    // Reset is ordered after pending saves; a late earlier write cannot resurrect it.
    const pending = this.tail
      .catch(() => {})
      .then(async () => {
        const db = await this.open();
        return new Promise<void>((resolve, reject) => {
          const tx = db.transaction(["session", "originals"], "readwrite");
          const state = tx.objectStore("session");
          const assets = tx.objectStore("originals");
          const request = state.get("active");
          let conflict = false;
          let nextRevision = this.revision;
          request.onsuccess = () => {
            const previous = request.result as Envelope | undefined;
            if (
              data &&
              previous &&
              JSON.stringify(previous.data) === JSON.stringify(data)
            ) {
              nextRevision = previous.revision;
              return;
            }
            if ((previous?.revision ?? 0) !== this.revision) {
              conflict = true;
              tx.abort();
              return;
            }
            nextRevision = this.revision + 1;
            if (!data) {
              // Keep a revision tombstone so another tab cannot overwrite a reset.
              const empty: StudioSessionData = {
                sources: [],
                crops: [],
                sourceId: "",
                pageNumber: 1,
                activeCropId: "",
                inspectedPages: {},
                step: "upload",
                grade: "미지정",
                level: "secondary",
              };
              state.put(
                {
                  version: 1,
                  revision: nextRevision,
                  data: empty,
                } satisfies Envelope,
                "active",
              );
              assets.clear();
              return;
            }
            state.put(
              { version: 1, revision: nextRevision, data } satisfies Envelope,
              "active",
            );
            for (const [id, blob] of originals) {
              const existing = assets.getKey(id);
              existing.onsuccess = () => {
                if (existing.result === undefined) assets.put(blob, id);
              };
            }
            const liveIds = new Set(data.sources.map((source) => source.id));
            for (const source of previous?.data.sources ?? []) {
              if (!liveIds.has(source.id)) assets.delete(source.id);
            }
          };
          tx.oncomplete = () => {
            this.revision = nextRevision;
            db.close();
            resolve();
          };
          tx.onabort = tx.onerror = () => {
            db.close();
            reject(conflict ? new Error(CONFLICT) : tx.error);
          };
        });
      });
    this.tail = pending;
    return pending;
  }
}

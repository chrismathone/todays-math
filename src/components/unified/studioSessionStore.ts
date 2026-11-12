import type { StudioOrderedPage } from "./studioPageOrder";
import type { StudioCrop } from "./studioHelpers";
import type { SchoolLevel } from "./types";
import type { StudioAiPageJob } from "./useStudioAi";
import { PrivateStudioSessionStore } from "./privateStudioSessionStore";
import type { DocumentSharing } from "@/contracts/privateWorkspace.contract";

export interface StoredStudioSource {
  id: string;
  name: string;
  kind: "image" | "pdf" | "sample";
  pages: number;
  grade?: string;
  level?: SchoolLevel;
  gradeManual?: boolean;
  pageRotations?: Record<number, number>;
}

export interface StudioSessionData {
  sources: StoredStudioSource[];
  crops: StudioCrop[];
  sourceId: string;
  pageNumber: number;
  activeCropId: string;
  inspectedPages: Record<string, string>;
  step: "upload" | "order" | "crop" | "review";
  pageOrder?: StudioOrderedPage[];
  grade: string;
  level: SchoolLevel;
  completedPages?: StudioAiPageJob[];
}

interface Envelope {
  version: 1;
  revision: number;
  data: StudioSessionData;
}

export interface StudioSessionStoreOptions {
  autoResume?: boolean;
}

const DB_NAME = "today-math-studio-v1";
const CONFLICT =
  "다른 창에서 문제 추출 작업이 변경되었습니다. 현재 작업을 확인한 뒤 새로고침해 주세요.";

/** 원본 Blob은 한 번만 저장하고 검수 상태는 별도로 갱신한다. */
export class LocalStudioSessionStore {
  private readonly sessionKey: string;
  constructor(
    private readonly scope?: string,
    private readonly options: StudioSessionStoreOptions = {},
    private readonly selectedId?: string,
  ) {
    this.sessionKey =
      selectedId ??
      (options.autoResume === false
        ? `session-${crypto.randomUUID()}`
        : "active");
  }
  private revision = 0;
  private tail: Promise<unknown> = Promise.resolve();

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(
        this.scope ? `${DB_NAME}:${encodeURIComponent(this.scope)}` : DB_NAME,
        1,
      );
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
    if (this.options.autoResume === false && !this.selectedId) return null;
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["session", "originals"], "readonly");
      const request = tx.objectStore("session").get(this.sessionKey);
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
          !["upload", "order", "crop", "review"].includes(data.step) ||
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
                "저장된 문제 추출 원본을 읽지 못했습니다. 기존 작업은 덮어쓰지 않았습니다.",
              )
            : tx.error,
        );
      };
    });
  }

  save(data: StudioSessionData, originals: Map<string, Blob>): Promise<void> {
    if (
      this.options.autoResume === false &&
      !data.sources.length &&
      !data.crops.length
    )
      return Promise.resolve();
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
          const request = state.get(this.sessionKey);
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
                this.sessionKey,
              );
              if (this.sessionKey === "active") assets.clear();
              else
                for (const source of previous?.data.sources ?? [])
                  assets.delete(source.id);
              return;
            }
            state.put(
              { version: 1, revision: nextRevision, data } satisfies Envelope,
              this.sessionKey,
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

/** Unscoped developer previews keep their original IndexedDB-only semantics. */
export class StudioSessionStore {
  private readonly store: LocalStudioSessionStore | PrivateStudioSessionStore;
  constructor(
    scope?: string,
    documentId?: string,
    options: StudioSessionStoreOptions = {},
  ) {
    this.store = scope
      ? new PrivateStudioSessionStore(
          scope,
          documentId,
          () => new LocalStudioSessionStore(scope).load(),
          undefined,
          undefined,
          options,
        )
      : new LocalStudioSessionStore(undefined, options, documentId);
  }
  load() {
    return this.store.load();
  }
  save(
    data: StudioSessionData,
    originals: Map<string, Blob>,
    sharing?: DocumentSharing,
  ) {
    return this.store instanceof PrivateStudioSessionStore
      ? this.store.save(data, originals, sharing)
      : this.store.save(data, originals);
  }
  get visibility() {
    return this.store instanceof PrivateStudioSessionStore
      ? this.store.visibility
      : ("private" as const);
  }
  get sharedBranchId() {
    return this.store instanceof PrivateStudioSessionStore
      ? this.store.sharedBranchId
      : null;
  }
  clear() {
    return this.store.clear();
  }
  retain() {
    if (this.store instanceof PrivateStudioSessionStore) this.store.retain();
  }
  release() {
    if (this.store instanceof PrivateStudioSessionStore) this.store.release();
  }
  get documentId() {
    return this.store instanceof PrivateStudioSessionStore
      ? this.store.documentId
      : undefined;
  }
}

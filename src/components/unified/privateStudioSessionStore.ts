import type {
  StudioSessionData,
  StudioSessionStoreOptions,
} from "./studioSessionStore";
import type {
  DocumentSharing,
  DocumentVisibility,
} from "@/contracts/privateWorkspace.contract";
import {
  PrivateCloudClient,
  PrivateCloudError,
  privateDocumentId,
} from "./privateCloudClient";

type Session = { data: StudioSessionData; originals: Map<string, Blob> };
type Recovery = Session & {
  id: string;
  revision: number | null;
  pending: boolean;
  title: string;
  assets: Record<string, string>;
};
// Component replacement must not restore a pending cache while the departing
// instance is still acknowledging its save. This registry is confined to this
// JS realm; another tab/device must still pass the server's revision check.
const pendingSessionSaves = new Map<string, Set<Promise<void>>>();
export interface SessionRecovery {
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
}
export function sessionRecovery(scope: string): SessionRecovery {
  async function access<T>(
    key: string,
    value?: unknown,
  ): Promise<T | undefined> {
    if (typeof indexedDB === "undefined") return undefined;
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(
        `today-math-studio-cloud-v1:${encodeURIComponent(scope)}`,
        1,
      );
      request.onupgradeneeded = () =>
        request.result.createObjectStore("recovery");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () =>
        reject(new Error("자료 복구 저장소를 열지 못했습니다."));
    });
    return new Promise((resolve, reject) => {
      const tx = db.transaction(
        "recovery",
        value === undefined ? "readonly" : "readwrite",
      );
      const store = tx.objectStore("recovery");
      const request =
        value === undefined ? store.get(key) : store.put(value, key);
      tx.oncomplete = () => {
        db.close();
        resolve(request.result as T);
      };
      tx.onabort = tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  }
  return {
    get: access,
    put: async (key, value) => {
      await access(key, value);
    },
  };
}
export async function forgetPrivateExtraction(
  scope: string,
  id: string,
  recovery = sessionRecovery(scope),
) {
  const current = await recovery.get<{ id: string | null }>("current");
  await recovery.put(`deleted:${id}`, true);
  if (current?.id === id) await recovery.put("current", { id: null });
}
function validate(value: unknown): StudioSessionData {
  const data = value as StudioSessionData;
  if (
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
  )
    throw new Error(
      "저장된 자료 내용을 읽지 못했습니다. 기존 자료는 그대로 보관됩니다.",
    );
  return data;
}

/** Each extraction owns a document ID. Reset only changes the local current selection. */
export class PrivateStudioSessionStore {
  visibility: DocumentVisibility = "private";
  sharedBranchId: string | null = null;
  private id?: string;
  private revision: number | null = null;
  private title = "";
  private assets: Record<string, string> = {};
  private tail: Promise<unknown> = Promise.resolve();
  private loading?: Promise<Session | null>;
  private lastError: unknown;
  private conflictError?: PrivateCloudError;
  private lastSaved = "";
  private lifecycle = 0;
  private released = false;
  constructor(
    private readonly scope: string,
    private readonly selectedId?: string,
    private readonly legacy?: () => Promise<Session | null>,
    private readonly client = new PrivateCloudClient(scope),
    private readonly recovery = sessionRecovery(scope),
    private readonly options: StudioSessionStoreOptions = {},
  ) {}
  get documentId() {
    return this.id;
  }
  retain() {
    this.lifecycle++;
    this.released = false;
    this.client.retain();
  }
  release() {
    this.released = true;
    const lifecycle = this.lifecycle;
    void Promise.resolve(this.loading)
      .catch(() => {})
      .then(() => this.tail.catch(() => {}))
      .then(() =>
        setTimeout(() => {
          if (lifecycle === this.lifecycle) this.client.dispose();
        }, 0),
      );
  }
  load(): Promise<Session | null> {
    return (this.loading ??= this.restore().catch((cause) => {
      this.loading = undefined;
      throw cause;
    }));
  }
  private async restore(): Promise<Session | null> {
    // No selection means a new extraction. Leave current, cached originals,
    // pending revisions and legacy stores untouched until explicitly resumed.
    if (this.options.autoResume === false && !this.selectedId) return null;
    while (pendingSessionSaves.get(this.scope)?.size)
      await Promise.allSettled(pendingSessionSaves.get(this.scope)!);
    const current = await this.recovery.get<{ id: string | null }>("current");
    this.id = this.selectedId ?? current?.id ?? undefined;
    // Import only the account-scoped old extraction, once, preserving its original IDB data.
    if (
      !this.selectedId &&
      !current &&
      this.legacy &&
      typeof indexedDB !== "undefined"
    ) {
      const previous = await this.legacy();
      if (previous?.data.sources.length) {
        this.id = privateDocumentId();
        await this.save(previous.data, previous.originals);
        return previous;
      }
    }
    if (!this.id) {
      if (current?.id === null) return null;
      const latest = (await this.client.list("extraction"))[0];
      if (!latest) {
        if (!this.released) await this.recovery.put("current", { id: null });
        return null;
      }
      this.id = latest.id;
    }
    if (await this.recovery.get(`deleted:${this.id}`)) {
      if (this.selectedId)
        throw new Error(
          "삭제한 자료입니다. 내 시험지에서 다른 자료를 열어 주세요.",
        );
      this.id = undefined;
      return null;
    }
    const cached = await this.recovery.get<Recovery>(this.id);
    if (cached?.pending) {
      this.revision = cached.revision;
      this.title = cached.title;
      this.assets = cached.assets;
      // Autosave retries against the original revision; a changed server remains a conflict.
      return {
        data: await this.client.materialize(validate(cached.data)),
        originals: cached.originals,
      };
    }
    let document;
    try {
      document = await this.client.get(this.id);
    } catch (cause) {
      if (
        !this.selectedId &&
        cause instanceof PrivateCloudError &&
        cause.status === 404
      ) {
        if (!this.released) await this.recovery.put("current", { id: null });
        this.id = undefined;
        return null;
      }
      throw cause;
    }
    if (document.kind !== "extraction")
      throw new Error("추출한 자료 형식을 확인해 주세요.");
    const data = validate(document.payload.data);
    const assets = document.payload.assets as Record<string, string>;
    if (!assets || typeof assets !== "object" || Array.isArray(assets))
      throw new Error("원본 파일 목록을 읽지 못했습니다.");
    // Source originals and crop images are independent assets. Start both restore
    // paths together; PrivateCloudClient keeps network transfers bounded to 3.
    const [originalEntries, displayed] = await Promise.all([
      Promise.all(
        data.sources
          .filter((source) => source.kind !== "sample")
          .map(
            async (source) =>
              [
                source.id,
                await this.client.original(assets[source.id]),
              ] as const,
          ),
      ),
      this.client.materialize(data),
    ]);
    const originals = new Map(originalEntries);
    this.revision = document.revision;
    this.visibility = document.visibility ?? "private";
    this.sharedBranchId = document.sharedBranchId ?? null;
    this.title = document.title;
    this.assets = assets;
    this.lastSaved = JSON.stringify(displayed);
    if (!this.released) await this.recovery.put("current", { id: this.id });
    return { data: displayed, originals };
  }
  save(
    data: StudioSessionData,
    originals: Map<string, Blob>,
    sharing?: DocumentSharing,
  ): Promise<void> {
    if (!data.sources.length && !data.crops.length) return Promise.resolve();
    this.id ??= privateDocumentId();
    const id = this.id;
    const captured = structuredClone(data);
    const files = new Map(originals);
    const pending = this.tail
      .catch(() => {})
      .then(async () => {
        if (await this.recovery.get(`deleted:${id}`))
          throw new Error("삭제한 자료입니다. 새 자료로 시작해 주세요.");
        const signature = JSON.stringify(captured);
        if (signature === this.lastSaved && !this.lastError && !sharing) return;
        this.title ||= captured.sources[0]?.name || "추출한 자료";
        const portable = JSON.parse(
          this.client.recoveryText(JSON.stringify(captured)),
        ) as StudioSessionData;
        const cache: Recovery = {
          id,
          revision: this.revision,
          pending: true,
          title: this.title,
          assets: this.assets,
          data: portable,
          originals: files,
        };
        // Keep recoverable originals before sending any remote writes.
        await this.recovery.put(id, cache);
        if (!this.released) await this.recovery.put("current", { id });
        // Preserve subsequent edits and originals locally without retrying a
        // revision the server has already rejected.
        if (this.conflictError) throw this.conflictError;
        const assets: Record<string, string> = {};
        for (const source of captured.sources) {
          if (source.kind === "sample") continue;
          if (this.assets[source.id])
            assets[source.id] = this.assets[source.id];
          else {
            const blob = files.get(source.id);
            if (!blob)
              throw new Error(
                "원본 파일을 찾지 못했습니다. 자료를 다시 불러와 주세요.",
              );
            const url = await this.client.upload(blob, source.name);
            assets[source.id] = url.split("/").at(-1)!;
          }
        }
        const externalized = await this.client.externalize(captured);
        const saved = await this.client.save(
          id,
          "extraction",
          this.title,
          { data: externalized, assets },
          this.revision,
          sharing,
        );
        this.assets = assets;
        this.revision = saved.revision;
        this.visibility = saved.visibility ?? "private";
        this.sharedBranchId = saved.sharedBranchId ?? null;
        this.lastSaved = signature;
        this.lastError = null;
        // Cache portable URLs after acknowledgment; no expiring object URLs are needed to recover.
        await this.recovery.put(id, {
          ...cache,
          data: externalized,
          revision: saved.revision,
          assets,
          pending: false,
        });
      })
      .catch((cause) => {
        if (
          cause instanceof PrivateCloudError &&
          cause.status === 409 &&
          cause.code !== "BRANCH_CHANGED"
        )
          this.conflictError = cause;
        this.lastError = cause;
        throw cause;
      });
    this.tail = pending;
    const saves =
      pendingSessionSaves.get(this.scope) ?? new Set<Promise<void>>();
    saves.add(pending);
    pendingSessionSaves.set(this.scope, saves);
    void pending
      .finally(() => {
        saves.delete(pending);
        if (!saves.size) pendingSessionSaves.delete(this.scope);
      })
      .catch(() => {});
    return pending;
  }
  async clear(): Promise<void> {
    await this.tail;
    if (this.lastError) throw this.lastError;
    await this.recovery.put("current", { id: null });
    this.id = undefined;
    this.revision = null;
    this.visibility = "private";
    this.sharedBranchId = null;
    this.title = "";
    this.assets = {};
    this.lastSaved = "";
    this.loading = Promise.resolve(null);
  }
  get conflict() {
    return !!this.conflictError;
  }
}

import type {
  PrivateDocument,
  PrivateDocumentSummary,
} from "@/contracts/privateWorkspace.contract";

export class PrivateCloudError extends Error {
  constructor(
    message: string,
    readonly status = 0,
  ) {
    super(message);
  }
}
export const cloudError = (cause: unknown) =>
  cause instanceof Error
    ? cause.message
    : "자료를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
export const privateDocumentId = () => crypto.randomUUID();
const assetPath = (hash: string) => {
  if (!/^[a-f0-9]{64}$/.test(hash))
    throw new Error("저장된 파일 주소를 확인해 주세요.");
  return `/api/library/assets/${hash}`;
};
const documentPath = (id: string) => {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id))
    throw new Error("자료 주소를 확인해 주세요.");
  return `/api/library/documents/${id}`;
};
type AssetPool = {
  users: number;
  urls: Set<string>;
  portable: Map<string, string>;
};
const activeAssetPools = new Map<string, AssetPool>();

/** One immutable owner per client, including requests still queued after logout. */
export class PrivateCloudClient {
  private uploads = new Map<string, Promise<string>>();
  private conversions = new Map<string, Promise<string>>();
  private blobs = new WeakMap<Blob, Promise<string>>();
  private downloads = new Map<string, Promise<string>>();
  private portable = new Map<string, string>();
  private objectUrls = new Set<string>();
  private pool?: AssetPool;
  private activeTransfers = 0;
  private waitingTransfers: (() => void)[] = [];
  constructor(
    readonly scope: string,
    private readonly transport: typeof fetch = (...args) => fetch(...args),
  ) {
    if (!scope) throw new Error("로그인이 필요합니다.");
  }
  retain() {
    if (this.pool) return;
    const pool = activeAssetPools.get(this.scope) ?? {
      users: 0,
      urls: new Set<string>(),
      portable: new Map<string, string>(),
    };
    pool.users++;
    this.pool = pool;
    activeAssetPools.set(this.scope, pool);
  }
  dispose() {
    const pool = this.pool;
    this.pool = undefined;
    if (pool) {
      if (--pool.users === 0) {
        for (const url of pool.urls) URL.revokeObjectURL(url);
        activeAssetPools.delete(this.scope);
      }
    } else for (const url of this.objectUrls) URL.revokeObjectURL(url);
    this.objectUrls.clear();
    this.downloads.clear();
  }
  private async transfer<T>(work: () => Promise<T>): Promise<T> {
    if (this.activeTransfers >= 3)
      await new Promise<void>((resolve) => this.waitingTransfers.push(resolve));
    else this.activeTransfers++;
    try {
      return await work();
    } finally {
      const next = this.waitingTransfers.shift();
      if (next) next();
      else this.activeTransfers--;
    }
  }
  private async request(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    headers.set("x-workspace-owner", this.scope);
    let response: Response;
    try {
      response = await this.transport(path, {
        ...init,
        headers,
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      throw new PrivateCloudError(
        "연결을 확인한 뒤 다시 저장해 주세요. 아직 계정에 저장되지 않았습니다.",
      );
    }
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message =
        response.status === 409
          ? "다른 창이나 기기에서 자료가 변경되었습니다. 현재 작업을 보관한 뒤 내 시험지에서 다시 열어 주세요."
          : response.status === 401
            ? "로그인이 만료되었습니다. 다시 로그인한 뒤 저장해 주세요."
            : body?.error?.message ||
              "자료를 불러오거나 저장하지 못했습니다. 다시 시도해 주세요.";
      throw new PrivateCloudError(message, response.status);
    }
    return response;
  }
  async list(
    kind?: PrivateDocumentSummary["kind"],
  ): Promise<PrivateDocumentSummary[]> {
    const items: PrivateDocumentSummary[] = [];
    for (let page = 1; ; page++) {
      const response = await this.request(
        `/api/library/documents?page=${page}&pageSize=100${kind ? `&kind=${kind}` : ""}`,
      );
      const body = await response.json();
      if (!Array.isArray(body.data) || !Number.isInteger(body.meta?.total))
        throw new Error("자료 목록을 읽지 못했습니다.");
      items.push(...body.data);
      if (items.length >= body.meta.total) return items;
      if (!body.data.length)
        throw new Error("자료 목록이 변경되었습니다. 다시 불러와 주세요.");
    }
  }
  async get(id: string): Promise<PrivateDocument> {
    return (await (await this.request(documentPath(id))).json()).data;
  }
  async save(
    id: string,
    kind: PrivateDocumentSummary["kind"],
    title: string,
    payload: Record<string, unknown>,
    expectedRevision: number | null,
  ): Promise<PrivateDocument> {
    const body = JSON.stringify({
      kind,
      title: title.trim().slice(0, 200) || "제목 없는 자료",
      payload,
      expectedRevision,
    });
    if (new TextEncoder().encode(body).byteLength > 3_500_000)
      throw new Error("자료 내용이 너무 큽니다. 자료를 나누어 저장해 주세요.");
    const saved = (
      await (
        await this.request(documentPath(id), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body,
        })
      ).json()
    ).data;
    if (!saved || saved.id !== id || !Number.isInteger(saved.revision))
      throw new Error("자료 저장을 확인하지 못했습니다. 다시 시도해 주세요.");
    this.changed();
    return saved;
  }
  async rename(
    id: string,
    title: string,
    expectedRevision: number,
  ): Promise<PrivateDocument> {
    return (
      await (
        await this.request(documentPath(id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, expectedRevision }),
        })
      ).json()
    ).data;
  }
  async remove(id: string, revision: number) {
    await this.request(`${documentPath(id)}?revision=${revision}`, {
      method: "DELETE",
    });
  }
  private changed() {
    if (typeof window !== "undefined")
      window.dispatchEvent(
        new CustomEvent("private-library-change", { detail: this.scope }),
      );
  }
  /** Synchronous, portable recovery serialization for already-uploaded local images. */
  recoveryText(text: string): string {
    for (const [local, remote] of activeAssetPools.get(this.scope)?.portable ??
      [])
      text = text.split(local).join(remote);
    for (const [local, remote] of this.portable)
      text = text.split(local).join(remote);
    return text;
  }
  async original(hash: string): Promise<Blob> {
    return this.transfer(async () =>
      (await this.request(assetPath(hash))).blob(),
    );
  }
  upload(blob: Blob, name = "자료"): Promise<string> {
    const existing = this.blobs.get(blob);
    if (existing) return existing;
    const pending = (async () => {
      if (!blob.size || blob.size > 64 * 1024 * 1024)
        throw new Error("원본 파일은 64MB 이하로 올려 주세요.");
      const bytes = await blob.arrayBuffer();
      const hash = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
        (byte) => byte.toString(16).padStart(2, "0"),
      ).join("");
      let uploaded = this.uploads.get(hash);
      if (!uploaded) {
        uploaded = this.transfer(() => this.uploadChunks(hash, blob, name));
        this.uploads.set(hash, uploaded);
        void uploaded.catch(() => this.uploads.delete(hash));
      }
      return uploaded;
    })();
    this.blobs.set(blob, pending);
    void pending.catch(() => this.blobs.delete(blob));
    return pending;
  }
  private async uploadChunks(
    hash: string,
    blob: Blob,
    name: string,
  ): Promise<string> {
    let offset = 0;
    let stalls = 0;
    while (offset < blob.size) {
      const end = Math.min(offset + 1024 * 1024, blob.size);
      const response = await this.request(assetPath(hash), {
        method: "PUT",
        headers: {
          "Content-Type": blob.type || "application/pdf",
          "Content-Range": `bytes ${offset}-${end - 1}/${blob.size}`,
          "x-file-name": encodeURIComponent(name),
        },
        body: blob.slice(offset, end),
      });
      const { data } = await response.json();
      if (
        !Number.isSafeInteger(data?.offset) ||
        data.offset < 0 ||
        data.offset > blob.size ||
        (data.complete && data.offset !== blob.size)
      )
        throw new Error("파일 저장 응답을 확인하지 못했습니다.");
      if (data.complete) return assetPath(hash);
      if (data.offset === blob.size || (data.offset <= offset && ++stalls > 2))
        throw new Error("파일 전송이 멈췄습니다. 다시 저장해 주세요.");
      offset = data.offset;
    }
    throw new Error("파일 저장을 완료하지 못했습니다.");
  }
  private convert(url: string): Promise<string> {
    const portable =
      this.portable.get(url) ??
      activeAssetPools.get(this.scope)?.portable.get(url);
    if (portable) return Promise.resolve(portable);
    const cached = this.conversions.get(url);
    if (cached) return cached;
    // Only browser-local bytes are read here; never retrieve arbitrary external URLs.
    const pending = (async () => {
      let blob: Blob;
      if (url.startsWith("data:")) {
        const match =
          /^data:(image\/[\w.+-]+)(?:;charset=[\w-]+)?(;base64)?,([\s\S]*)$/i.exec(
            url,
          );
        if (!match) throw new Error("그림 파일을 읽지 못했습니다.");
        const decoded = match[2]
          ? atob(match[3])
          : decodeURIComponent(match[3]);
        blob = new Blob(
          [
            match[2]
              ? Uint8Array.from(decoded, (char) => char.charCodeAt(0))
              : decoded,
          ],
          { type: match[1] },
        );
      } else {
        const response = await this.transport(url);
        if (!response.ok)
          throw new Error("원본 그림을 다시 불러온 뒤 저장해 주세요.");
        blob = await response.blob();
      }
      const remote = await this.upload(blob, "문제 그림");
      this.portable.set(url, remote);
      activeAssetPools.get(this.scope)?.portable.set(url, remote);
      return remote;
    })();
    this.conversions.set(url, pending);
    void pending.catch(() => this.conversions.delete(url));
    return pending;
  }
  async externalize<T>(value: T): Promise<T> {
    return this.walk(value, async (text) => {
      const matches = [
        ...text.matchAll(
          /data:image\/[\w.+-]+(?:;charset=[\w-]+)?;base64,[A-Za-z0-9+/=]+|data:image\/[\w.+-]+(?:;charset=[\w-]+)?,[^\s"'<>)]*|blob:[^\s"'<>)]*/gi,
        ),
      ];
      for (const match of matches)
        text = text.replace(match[0], await this.convert(match[0]));
      return text;
    });
  }
  /** Private images are fetched with the owner fence, then rendered from local object URLs. */
  async materialize<T>(value: T): Promise<T> {
    return this.walk(value, async (text) => {
      for (const match of text.matchAll(
        /\/api\/library\/assets\/([a-f0-9]{64})\b/g,
      )) {
        let pending = this.downloads.get(match[0]);
        if (!pending) {
          pending = this.original(match[1]).then((blob) => {
            const url = URL.createObjectURL(blob);
            this.conversions.set(url, Promise.resolve(match[0]));
            this.portable.set(url, match[0]);
            this.objectUrls.add(url);
            const pool = activeAssetPools.get(this.scope);
            pool?.urls.add(url);
            pool?.portable.set(url, match[0]);
            return url;
          });
          this.downloads.set(match[0], pending);
          void pending.catch(() => this.downloads.delete(match[0]));
        }
        text = text.replace(match[0], await pending);
      }
      return text;
    });
  }
  private async walk<T>(
    value: T,
    convert: (text: string) => Promise<string>,
  ): Promise<T> {
    if (typeof value === "string") return (await convert(value)) as T;
    if (Array.isArray(value))
      return (await Promise.all(
        value.map((item) => this.walk(item, convert)),
      )) as T;
    if (value && typeof value === "object") {
      const pairs = await Promise.all(
        Object.entries(value).map(async ([key, item]) => [
          key,
          await this.walk(item, convert),
        ]),
      );
      return Object.fromEntries(pairs) as T;
    }
    return value;
  }
}

import type {
  PrivateDocument,
  PrivateDocumentSummary,
  DocumentSharing,
} from "@/contracts/privateWorkspace.contract";
import { svgDataUrl } from "@/lib/svgDataUrl";

export class PrivateCloudError extends Error {
  constructor(
    message: string,
    readonly status = 0,
    readonly code?: string,
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
/** JSONB may reorder object keys; array order and every value still have to match. */
function sameJson(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object")
    return false;
  if (Array.isArray(left) || Array.isArray(right))
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) => sameJson(item, right[index]))
    );
  const a = left as Record<string, unknown>;
  const b = right as Record<string, unknown>;
  return (
    Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every(
      (key) => Object.hasOwn(b, key) && sameJson(a[key], b[key]),
    )
  );
}
/** 내려받은 자산 — `truncated` 는 옛 저장이 잘라 올린 SVG 의 앞부분(온전한 자산이면 없다). */
type Download = { url: string; truncated?: string };

const IMAGE_URLS =
  /data:image\/[\w.+-]+(?:;charset=[\w-]+)?;base64,[A-Za-z0-9+/=]+|data:image\/[\w.+-]+(?:;charset=[\w-]+)?,[^\s"'<>)]*|blob:[^\s"'<>)]*/gi;
const ENCODED_SVG = /^data:image\/svg\+xml(?:;charset=[\w-]+)?,/i;
/** 인코딩된 `</svg>`(+ 인코딩된 공백) — 옛 SVG 주소가 끝날 수 있는 자리 */
const ENCODED_SVG_CLOSE = /%3C%2Fsvg%3E(?:%0A|%0D|%09|%20)*/gi;
/** 되살릴 수 없게 잘린 그림 자리 — 조용히 깨진 그림 대신 이 그림 하나로 드러낸다. */
const REDRAW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 72" width="360" height="72"><rect x="1" y="1" width="358" height="70" fill="#ffffff" stroke="#9aa5b8" stroke-dasharray="6 4"/><text x="180" y="42" text-anchor="middle" font-size="15" font-family="sans-serif" fill="#52617a">그림을 불러오지 못했습니다. 다시 그려 주세요.</text></svg>`;

const looksLikeSvg = (text: string) =>
  /^\s*(?:<\?xml[^>]*>\s*)?<svg\b/i.test(text);
/** 한 장으로 닫힌 SVG 인가 — 잘린 앞부분은 여기서 걸린다. */
function wholeSvg(text: string) {
  if (!looksLikeSvg(text)) return false;
  if (typeof DOMParser === "undefined")
    return /(?:<\/svg>|\/>)\s*$/i.test(text);
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  return (
    !doc.querySelector("parsererror") && doc.documentElement.localName === "svg"
  );
}

/**
 * 옛 SVG 데이터 주소 — `svgDataUrl` 이 `( ) '` 까지 인코딩하기 전에 지은 주소는 괄호·작은따옴표가 날것이다.
 * 첫 `)`·`'` 에서 끊으면 앞부분만 자산이 되고 꼬리가 문자열에 남는다(원장님 운영 콘솔 2026-09-19).
 * 거기서 멈췄으면 뒤로 이어 읽어 **디코드한 SVG 가 한 장으로 닫히는** 첫 `</svg>` 까지를 주소로 삼는다 —
 * 마크다운 `![](…)`·CSS `url(…)` 의 닫는 괄호는 그 뒤라 먹지 않는다. 닫히는 자리가 없으면 예전 그대로.
 */
function wholeImageUrl(text: string, index: number, matched: string) {
  const header = ENCODED_SVG.exec(matched)?.[0];
  if (!header || !/^[)']/.test(text.slice(index + matched.length)))
    return matched;
  const body = /^[^\s"<>]*/.exec(text.slice(index + header.length))![0];
  for (const close of body.matchAll(ENCODED_SVG_CLOSE)) {
    const end = close.index + close[0].length;
    if (end <= matched.length - header.length) continue;
    try {
      if (wholeSvg(decodeURIComponent(body.slice(0, end))))
        return header + body.slice(0, end);
    } catch {
      // 깨진 퍼센트 부호 — 다음 자리를 본다
    }
  }
  return matched;
}

/**
 * 이미 잘려 저장된 SVG 를 다시 열 때 — 옛 `externalize` 는 앞부분만 자산으로 올리고 꼬리
 * `)%20translate(…)…%3C%2Fsvg%3E` 를 문자열에 남겼다. 자산(디코드된 앞부분) + 디코드한 꼬리 = 원래 SVG 이므로
 * 이어 붙여 데이터 주소로 되돌린다(다음 저장 때 온전한 자산이 된다). 자산이 온전하면 뒤의 `)` 는 마크다운의
 * 닫는 괄호라 손대지 않는다. 이을 수 없으면 그 그림만 «다시 그려 주세요» 그림으로 바꾼다 — 문서는 열린다.
 */
function repairTruncatedSvg(prefix: string, after: string) {
  const run = /^[)'][^\s"<>]*/.exec(after)?.[0] ?? "";
  const closes = [...run.matchAll(ENCODED_SVG_CLOSE)].map(
    (close) => close.index + close[0].length,
  );
  for (const end of closes) {
    try {
      const svg = prefix + decodeURIComponent(run.slice(0, end));
      if (wholeSvg(svg)) return { url: svgDataUrl(svg), consumed: end };
    } catch {
      // 깨진 퍼센트 부호 — 다음 자리를 본다
    }
  }
  // 문자열 끝까지가 꼬리면(그림 칸 하나) 통째로, 아니면 마지막 `</svg>` 까지만 걷는다
  return {
    url: svgDataUrl(REDRAW_SVG),
    consumed: run.length === after.length ? run.length : (closes.at(-1) ?? 0),
  };
}

/** One immutable owner per client, including requests still queued after logout. */
export class PrivateCloudClient {
  private uploads = new Map<string, Promise<string>>();
  private conversions = new Map<string, Promise<string>>();
  private blobs = new WeakMap<Blob, Promise<string>>();
  private downloads = new Map<string, Promise<Download>>();
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
      if (
        body?.error?.code === "BRANCH_CHANGED" &&
        typeof window !== "undefined"
      )
        window.dispatchEvent(new Event("workspace-access-change"));
      const message =
        response.status === 409
          ? body?.error?.message ||
            "다른 창이나 기기에서 자료가 변경되었습니다. 현재 작업을 보관한 뒤 내 시험지에서 다시 열어 주세요."
          : response.status === 401
            ? "로그인이 만료되었습니다. 다시 로그인한 뒤 저장해 주세요."
            : body?.error?.message ||
              "자료를 불러오거나 저장하지 못했습니다. 다시 시도해 주세요.";
      throw new PrivateCloudError(message, response.status, body?.error?.code);
    }
    return response;
  }
  async list(
    kind?: PrivateDocumentSummary["kind"],
    mine = true,
  ): Promise<PrivateDocumentSummary[]> {
    const items: PrivateDocumentSummary[] = [];
    for (let page = 1; ; page++) {
      const response = await this.request(
        `/api/library/documents?page=${page}&pageSize=100${kind ? `&kind=${kind}` : ""}${mine ? "&mine=true" : ""}`,
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
  async get(id: string, ownerId?: string): Promise<PrivateDocument> {
    return (
      await (
        await this.request(
          `${documentPath(id)}${ownerId ? `?ownerId=${encodeURIComponent(ownerId)}` : ""}`,
        )
      ).json()
    ).data;
  }
  async copy(id: string, ownerId: string): Promise<PrivateDocument> {
    const response = await this.request(
      `${documentPath(id)}?ownerId=${encodeURIComponent(ownerId)}`,
      { method: "POST" },
    );
    const document = (await response.json()).data;
    this.changed();
    return document;
  }
  async save(
    id: string,
    kind: PrivateDocumentSummary["kind"],
    title: string,
    payload: Record<string, unknown>,
    expectedRevision: number | null,
    sharing?: DocumentSharing,
  ): Promise<PrivateDocument> {
    const body = JSON.stringify({
      kind,
      title: title.trim().slice(0, 200) || "제목 없는 자료",
      payload,
      expectedRevision,
      ...sharing,
    });
    if (new TextEncoder().encode(body).byteLength > 3_500_000)
      throw new Error("자료 내용이 너무 큽니다. 자료를 나누어 저장해 주세요.");
    let saved: PrivateDocument;
    try {
      saved = (
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
    } catch (cause) {
      if (cause instanceof PrivateCloudError && cause.code === "BRANCH_CHANGED")
        throw cause;
      if (
        cause instanceof PrivateCloudError &&
        cause.status > 0 &&
        cause.status !== 409 &&
        cause.status < 500
      )
        throw cause;
      // The PUT may have committed before its response was lost. Confirm only the
      // exact submitted content at the single expected successor revision; never
      // adopt a newer base and resend unsaved edits over another device's work.
      const current = await this.get(id).catch(() => undefined);
      const submitted = JSON.parse(body);
      if (
        !current ||
        current.id !== id ||
        current.kind !== kind ||
        current.revision !== (expectedRevision ?? 0) + 1 ||
        current.title !== submitted.title ||
        (sharing &&
          (current.visibility !== sharing.visibility ||
            current.sharedBranchId !== sharing.sharedBranchId)) ||
        !sameJson(current.payload, submitted.payload)
      )
        throw cause;
      saved = current;
    }
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
      let out = "";
      let at = 0;
      for (const match of text.matchAll(IMAGE_URLS)) {
        if (match.index < at) continue; // 앞의 옛 SVG 주소가 이어 읽은 자리
        const url = wholeImageUrl(text, match.index, match[0]);
        out += text.slice(at, match.index) + (await this.convert(url));
        at = match.index + url.length;
      }
      return out + text.slice(at);
    });
  }
  private download(path: string, hash: string): Promise<Download> {
    let pending = this.downloads.get(path);
    if (!pending) {
      pending = (
        path.includes("?")
          ? this.transfer(async () => (await this.request(path)).blob())
          : this.original(hash)
      ).then(async (blob) => {
        const url = URL.createObjectURL(blob);
        if (!path.includes("?")) {
          this.conversions.set(url, Promise.resolve(path));
          this.portable.set(url, path);
        }
        this.objectUrls.add(url);
        const pool = activeAssetPools.get(this.scope);
        pool?.urls.add(url);
        if (!path.includes("?")) pool?.portable.set(url, path);
        if (!/^image\/svg\+xml/i.test(blob.type)) return { url };
        const text = await blob.text();
        return looksLikeSvg(text) && !wholeSvg(text)
          ? { url, truncated: text }
          : { url };
      });
      this.downloads.set(path, pending);
      void pending.catch(() => this.downloads.delete(path));
    }
    return pending;
  }
  /** Private images are fetched with the owner fence, then rendered from local object URLs. */
  async materialize<T>(value: T): Promise<T> {
    return this.walk(value, async (text) => {
      let out = "";
      let at = 0;
      const matches = [
        ...text.matchAll(
          /\/api\/library\/assets\/([a-f0-9]{64})\b(?:\?ownerId=[A-Za-z0-9%_-]+&documentId=[A-Za-z0-9%_-]+)?/g,
        ),
      ];
      // Start independent images together, including several in one markdown
      // string. download() deduplicates paths; transfer() still caps reads at 3.
      // Apply replacements in source order so legacy SVG tail repair is intact.
      const downloads = await Promise.allSettled(
        matches.map((match) => this.download(match[0], match[1])),
      );
      for (const [index, match] of matches.entries()) {
        if (match.index < at) continue;
        const downloaded = downloads[index];
        if (downloaded.status === "rejected") throw downloaded.reason;
        const { url, truncated } = downloaded.value;
        const end = match.index + match[0].length;
        const repaired =
          truncated === undefined
            ? undefined
            : repairTruncatedSvg(truncated, text.slice(end));
        out += text.slice(at, match.index) + (repaired?.url ?? url);
        at = end + (repaired?.consumed ?? 0);
      }
      return out + text.slice(at);
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

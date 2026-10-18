// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  createExamReportStorageApi,
  readExamReportStorageConfig,
} from "@/lib/examReport/storage";
import { sha256 } from "@/lib/textbook/hash.server";
import { reportId, reportPdf } from "../helpers/examReportFeedFixture";

const config = {
  url: "https://abcdefghijklmnopqrst.supabase.co",
  serviceKey: "sb_secret_fixture",
};
const path = `${reportId(1)}/${reportId(2)}.pdf`;
const ref = { path, sha256: sha256(reportPdf), size: reportPdf.length };
function transport(publicBucket = false, bytes = reportPdf) {
  return vi.fn<typeof fetch>(async (url, init) => {
    if (String(url).includes("/bucket/"))
      return Response.json({ id: "exam-report-private", public: publicBucket });
    if (init?.method === "POST") return Response.json({ Key: path });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "content-type": "application/pdf",
        "content-length": String(bytes.length),
      },
    });
  });
}
describe("성적표 전용 비공개 PDF 저장소", () => {
  it("정해진 Supabase 주소와 서버 키만 쓰며, PDF를 덮어쓰지 않고 원격 바이트도 검산한다", async () => {
    const fetcher = transport();
    const api = createExamReportStorageApi(config, fetcher);
    await api.upload(path, reportPdf);
    expect(await api.read(ref)).toEqual(reportPdf);
    const post = fetcher.mock.calls.find(
      ([, init]) => init?.method === "POST",
    )!;
    expect(post[1]).toMatchObject({
      redirect: "error",
      cache: "no-store",
      headers: {
        apikey: "sb_secret_fixture",
        "x-upsert": "false",
        "content-type": "application/pdf",
      },
    });
    expect(String(post[0])).toContain(`/exam-report-private/${path}`);
  });
  it("공개 버킷·다른 경로·다른 바이트·크기 초과는 거절하고 삭제하지 않는다", async () => {
    await expect(
      createExamReportStorageApi(config, transport(true)).upload(
        path,
        reportPdf,
      ),
    ).rejects.toThrow();
    const fetcher = transport();
    const api = createExamReportStorageApi(config, fetcher);
    await expect(api.upload("../other.pdf", reportPdf)).rejects.toThrow();
    await expect(api.upload(path, new Uint8Array(4_000_001))).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
    await expect(
      createExamReportStorageApi(
        config,
        transport(false, new TextEncoder().encode("%PDF-other")),
      ).read(ref),
    ).rejects.toThrow();
    expect(
      fetcher.mock.calls.some(([, init]) => init?.method === "DELETE"),
    ).toBe(false);
  });
  it("브라우저 키·임의 주소·미설정은 통과시키지 않는다", () => {
    expect(readExamReportStorageConfig({})).toBeNull();
    expect(
      readExamReportStorageConfig({
        SUPABASE_URL: "https://example.com",
        SUPABASE_SECRET_KEY: config.serviceKey,
      }),
    ).toBeNull();
    expect(() =>
      createExamReportStorageApi({ ...config, serviceKey: "anon-key" }),
    ).toThrow();
  });
});

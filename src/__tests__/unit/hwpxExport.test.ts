// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildHwpxParts, HwpxPayloadSchema } from "@/lib/export/hwpxServer";

const payload = {
  title: "수식과 그림 시험지",
  pages: [
    {
      body: { x: 50, y: 100, w: 694, h: 920, columns: 2, gap: 26 },
      objects: [
        {
          type: "text",
          x: 50,
          y: 120,
          w: 100,
          h: 20,
          text: "다음을 계산하시오.",
          fontSize: 14,
        },
        {
          type: "equation",
          x: 155,
          y: 120,
          w: 60,
          h: 30,
          latex: "\\frac{1}{2}",
          fontSize: 14,
        },
        { type: "image", x: 420, y: 180, w: 100, h: 80, imageId: "image1" },
      ],
    },
  ],
};

describe("native HWPX export", () => {
  it("uses the real writer to retain editable Korean, native equations, images and columns", async () => {
    const parts = await buildHwpxParts(HwpxPayloadSchema.parse(payload));
    expect(parts.mimetype).toBe("application/hwp+zip");
    expect(parts["Contents/section0.xml"]).toContain("다음을 계산하시오.");
    expect(parts["Contents/section0.xml"]).toContain("hp:equation");
    expect(parts["Contents/section0.xml"]).toContain("over");
    expect(parts["Contents/section0.xml"]).toContain('colCount="2"');
    expect(parts["Contents/content.hpf"]).toContain("BinData/image1.png");
    expect(parts["Contents/content.hpf"]).toContain(payload.title);
  });

  it("creates one native section per measured page", async () => {
    const parts = await buildHwpxParts(
      HwpxPayloadSchema.parse({
        ...payload,
        pages: [...payload.pages, ...payload.pages],
      }),
    );
    expect(parts["Contents/section1.xml"]).toContain("hp:equation");
    expect(parts["Contents/header.xml"]).toContain('secCnt="2"');
  });

  it.each([
    { ...payload, pages: [] },
    {
      ...payload,
      pages: [{ objects: [{ ...payload.pages[0].objects[0], x: Infinity }] }],
    },
    {
      ...payload,
      pages: [
        {
          objects: [
            { ...payload.pages[0].objects[2], imageId: "../../secret" },
          ],
        },
      ],
    },
    {
      ...payload,
      pages: [
        {
          objects: [
            { ...payload.pages[0].objects[0], text: "x".repeat(16001) },
          ],
        },
      ],
    },
  ])(
    "rejects invalid or lossy payloads before spawning a writer",
    (invalid) => {
      expect(HwpxPayloadSchema.safeParse(invalid).success).toBe(false);
    },
  );

  it("does not start cancelled exports", async () => {
    await expect(
      buildHwpxParts(HwpxPayloadSchema.parse(payload), AbortSignal.abort()),
    ).rejects.toThrow(/취소/);
  });
});

// @vitest-environment node
import { expect, it } from "vitest";
import { PUBLISHER_PACKS } from "@/lib/commercialWorkbooks/publisherPacks";

it("keeps every publisher selection and import request identity unique as the collection grows", () => {
  const ids = PUBLISHER_PACKS.map((entry) => entry.id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  expect(duplicates).toEqual([]);
});

it("offers durable publisher links instead of an expired signed download", () => {
  for (const entry of PUBLISHER_PACKS) {
    for (const link of entry.links) {
      expect(link.href, entry.id).not.toMatch(
        /X-Amz-(?:Signature|Expires)=|[?&](?:Expires|Signature)=|[?&]link=dl2\.bookdata\./i,
      );
    }
  }
});

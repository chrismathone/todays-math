/**
 * 수학 랩실이 부르는 주소는 **전부 `/lab` 과 그 아래**다 (트랙 53, D-135 ⑼).
 *
 * 관문(src/proxy.ts)은 `/lab` 과 그 아래의 읽기를 **누구에게나** 연다 — 로그인 안 한 사람 · 원장 ·
 * 선생님 · 검수 · 승인 대기 · 학생 세션. 그 밖의 주소는 역할 규칙을 탄다. 그래서 랩실 화면이
 * `/lab` 밖의 파일을 부르면 **어떤 사람에게만** 조용히 안 그려진다.
 * 2026-09-21 에 실제로 그랬다: 모형 두 개가 `/dev/blender-assets/` 에 있어서 선생님·검수는 `/` 로,
 * 승인 대기는 `/approval-pending` 으로, 학생은 `/learn` 으로 되돌려졌다(트랙 52 가 진짜 관문으로 잼).
 * 원장과 로그인 안 한 창에서는 멀쩡해 보여 아무도 몰랐다.
 *
 * 🔴 고치는 길은 **파일을 `/lab` 아래로 두는 것**이지 관문을 넓히는 것이 아니다 —
 *    학생이 `/lab` 밖에서 얻는 것이 늘면 안 된다.
 *
 * 재는 법: 랩실 코드(src/components/lab · src/app/lab · src/lib/lab)의 문자열에서 사이트 뿌리 주소
 * (`/` 로 시작)를 **전부** 뽑는다. 파일 주소만 보면 `const DIR = "/dev/x"` 처럼 확장자 없는 뿌리를
 * 놓치므로 화면 링크까지 다 본다. 랩실 밖으로 나가는 화면 링크를 일부러 만들게 되면
 * 그 주소를 여기 따로 적어 허용하라(그 화면은 제 관문을 탄다).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "../../../..");
const LAB_CODE = ["src/components/lab", "src/app/lab", "src/lib/lab"];
const SOURCE = /\.(tsx?|css|json|m?js)$/;

/** 문자열 한 편에서 사이트 뿌리 주소를 모두 — 따옴표 셋과 따옴표 없는 CSS `url()`. */
function rootAddresses(text: string): string[] {
  const patterns = [
    /"(\/[A-Za-z0-9_][^"\n]*)"/g,
    /'(\/[A-Za-z0-9_][^'\n]*)'/g,
    /`(\/[A-Za-z0-9_][^`\n]*)`/g,
    /url\(\s*(\/[A-Za-z0-9_][^)"'\s]*)\s*\)/g,
  ];
  return patterns.flatMap((re) => [...text.matchAll(re)].map((m) => m[1]));
}

function walk(dir: string): string[] {
  return readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap(
    (entry) => {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) return walk(rel);
      return SOURCE.test(entry.name) ? [rel] : [];
    },
  );
}

const FILES = LAB_CODE.flatMap(walk);
const FOUND = FILES.flatMap((file) =>
  rootAddresses(readFileSync(path.join(ROOT, file), "utf8")).map((address) => ({
    file,
    address,
  })),
);

const inLab = (address: string) =>
  address === "/lab" || address.startsWith("/lab/");
/** 마지막 조각에 확장자가 있으면 파일 주소다. 조립 주소(`${…}`)는 파일을 못 짚으니 뺀다. */
const fileAddress = (address: string) => {
  const bare = address.split(/[?#]/)[0];
  return !bare.includes("${") && /\.[a-z0-9]{2,5}$/i.test(bare) ? bare : null;
};

/**
 * 랩실 모형은 `/dev/blender` 시연 화면 원본의 **복사본**이다 — 시연 화면(FoldingDemo·StackCubesDemo)이
 * 원본을 그대로 쓰므로 옮기지 않고 복사했다. 생성기(scripts/blender)를 다시 돌리면 원본만 바뀌니
 * 여기서 운다 — 랩실 쪽에도 복사하라. 둘을 일부러 갈라 놓게 되면 이 짝을 지운다.
 */
const LAB_MODEL_COPIES: Record<string, string> = {
  "/lab/models/cuboid-fold.glb": "public/dev/blender-assets/cuboid-fold.glb",
  "/lab/models/stack-cubes.glb":
    "public/dev/blender-assets/stack-cubes/stack-cubes.glb",
};

describe("랩실이 부르는 주소는 전부 /lab 아래 (관문이 누구에게나 여는 곳)", () => {
  it("🔴 랩실 코드의 사이트 주소 가운데 /lab 밖이 없다", () => {
    const outside = FOUND.filter(({ address }) => !inLab(address)).map(
      ({ file, address }) => `${file} → ${address}`,
    );
    expect(outside).toEqual([]);
  });

  it("그 가운데 파일 주소는 public 에 실제로 있다", () => {
    const missing = FOUND.flatMap(({ file, address }) => {
      const bare = fileAddress(address);
      return bare && !existsSync(path.join(ROOT, "public", bare))
        ? [`${file} → ${bare}`]
        : [];
    });
    expect(missing).toEqual([]);
  });

  it("랩실 모형은 /lab/models 에서 받고, 시연 원본과 바이트가 같다", () => {
    const used = new Set(FOUND.map(({ address }) => fileAddress(address)));
    for (const [address, original] of Object.entries(LAB_MODEL_COPIES)) {
      expect(used.has(address), `랩실 코드가 ${address} 를 부른다`).toBe(true);
      const copy = readFileSync(path.join(ROOT, "public", address));
      expect(
        copy.equals(readFileSync(path.join(ROOT, original))),
        `${address} = ${original}`,
      ).toBe(true);
    }
  });

  /** 자가 눈이 멀면 첫 시험이 «밖이 없다»로 초록이 된다 — 0 은 «없다»가 아니라 «못 셌다»일 수 있다. */
  it("자가 모든 적는 꼴을 본다 — 따옴표 셋·CSS url()·조립 주소", () => {
    const sample = [
      `<LabModelViewer src="/dev/a.glb" />`,
      `const B = '/dev/b.glb';`,
      "const C = `/dev/${name}.glb`;",
      `.x { background: url(/dev/c.png); }`,
      `.y { background: url("/dev/d.png"); }`,
      `const DIR = "/dev/blender-assets";`,
      // 주소가 아닌 것
      `const r = "a/b"; const s = "/"; x.replace(/\\s+/g, " "); const h = 1 / 2;`,
      `const u = "https://example.com/e.png";`,
    ].join("\n");
    expect(rootAddresses(sample).sort()).toEqual(
      [
        "/dev/a.glb",
        "/dev/b.glb",
        "/dev/${name}.glb",
        "/dev/c.png",
        "/dev/d.png",
        "/dev/blender-assets",
      ].sort(),
    );
    expect(FILES.length).toBeGreaterThan(30);
    expect(FILES).toContain("src/components/lab/SpaceStages.tsx");
    expect(FOUND.some(({ address }) => address === "/lab/teacher")).toBe(true);
  });
});

import type {
  ScanBox,
  ScanLayoutPage,
} from "@/contracts/conceptBlankScanIssued.contract";
import {
  scanRegistrationSchema,
  type ScanRegistration,
} from "@/contracts/conceptBlankScanPhoto.contract";

export type ScanPoint = { x: number; y: number };
export type ScanPixels = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};
export type ScanQrGeometry = { version: number; corners: ScanPoint[] };

export function projectScanPoint(
  h: readonly number[],
  p: ScanPoint,
): ScanPoint {
  const divisor = h[6] * p.x + h[7] * p.y + h[8];
  if (!Number.isFinite(divisor) || Math.abs(divisor) < 1e-10)
    return { x: NaN, y: NaN };
  return {
    x: (h[0] * p.x + h[1] * p.y + h[2]) / divisor,
    y: (h[3] * p.x + h[4] * p.y + h[5]) / divisor,
  };
}

/** Four non-collinear correspondences. Partial pivoting rejects singular/unstable fits. */
export function fitScanHomography(
  from: readonly ScanPoint[],
  to: readonly ScanPoint[],
): number[] | null {
  if (
    from.length !== 4 ||
    to.length !== 4 ||
    [...from, ...to].some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))
  )
    return null;
  const a = from.flatMap(({ x, y }, i) => {
    const { x: u, y: v } = to[i];
    return [
      [x, y, 1, 0, 0, 0, -u * x, -u * y, u],
      [0, 0, 0, x, y, 1, -v * x, -v * y, v],
    ];
  });
  for (let column = 0; column < 8; column++) {
    let pivot = column;
    for (let row = column + 1; row < 8; row++)
      if (Math.abs(a[row][column]) > Math.abs(a[pivot][column])) pivot = row;
    if (Math.abs(a[pivot][column]) < 1e-9) return null;
    [a[column], a[pivot]] = [a[pivot], a[column]];
    const scale = a[column][column];
    for (let j = column; j <= 8; j++) a[column][j] /= scale;
    for (let row = 0; row < 8; row++)
      if (row !== column) {
        const factor = a[row][column];
        for (let j = column; j <= 8; j++) a[row][j] -= factor * a[column][j];
      }
  }
  const h = [...a.map((row) => row[8]), 1];
  return h.every(Number.isFinite) ? h : null;
}

function boxPoints(box: ScanBox): ScanPoint[] {
  return [
    { x: box.x, y: box.y },
    { x: box.x + box.width, y: box.y },
    { x: box.x + box.width, y: box.y + box.height },
    { x: box.x, y: box.y + box.height },
  ];
}

/** Issued QR uses M correction and four quiet modules; jsQR corners exclude that margin. */
export function scanQrDataCorners(box: ScanBox, version: number): ScanPoint[] {
  if (!Number.isInteger(version) || version < 1 || version > 40)
    throw new RangeError("QR 판을 확인할 수 없습니다.");
  const modules = 17 + 4 * version,
    inset = 4 / (modules + 8);
  return boxPoints({
    x: box.x + box.width * inset,
    y: box.y + box.height * inset,
    width: box.width * (1 - 2 * inset),
    height: box.height * (1 - 2 * inset),
  });
}

const distance = (a: ScanPoint, b: ScanPoint) =>
  Math.hypot(a.x - b.x, a.y - b.y);
function localScale(h: number[], p: ScanPoint) {
  const center = projectScanPoint(h, p);
  return Math.min(
    distance(center, projectScanPoint(h, { x: p.x + 1, y: p.y })),
    distance(center, projectScanPoint(h, { x: p.x, y: p.y + 1 })),
  );
}

/** Version 1 marks are 3mm hollow squares, .6mm stroke, centred at the frozen locations. */
export function scanMarkerCandidates(
  image: ScanPixels,
  predicted: ScanPoint,
  scale: number,
): ScanPoint[] {
  if (
    !Number.isFinite(scale) ||
    scale < 1 ||
    scale > 40 ||
    !Number.isFinite(predicted.x + predicted.y)
  )
    return [];
  const radius = Math.min(800, Math.ceil(scale * 40));
  const left = Math.max(0, Math.floor(predicted.x - radius)),
    top = Math.max(0, Math.floor(predicted.y - radius));
  const right = Math.min(image.width, Math.ceil(predicted.x + radius)),
    bottom = Math.min(image.height, Math.ceil(predicted.y + radius));
  const w = right - left,
    h = bottom - top;
  if (w <= 0 || h <= 0) return [];
  const dark = new Uint8Array(w * h),
    queue = new Int32Array(w * h);
  const luminance = (x: number, y: number) => {
    const i = (y * image.width + x) * 4,
      alpha = image.data[i + 3] / 255;
    return (
      alpha *
        (image.data[i] * 0.2126 +
          image.data[i + 1] * 0.7152 +
          image.data[i + 2] * 0.0722) +
      (1 - alpha) * 255
    );
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      dark[y * w + x] = luminance(x + left, y + top) < 110 ? 1 : 0;
  const candidates: ScanPoint[] = [];
  for (let index = 0; index < dark.length; index++) {
    if (!dark[index]) continue;
    let take = 0,
      put = 1,
      minX = w,
      maxX = 0,
      minY = h,
      maxY = 0;
    queue[0] = index;
    dark[index] = 0;
    while (take < put) {
      const p = queue[take++],
        x = p % w,
        y = Math.floor(p / w);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      for (const n of [
        x > 0 ? p - 1 : -1,
        x < w - 1 ? p + 1 : -1,
        y > 0 ? p - w : -1,
        y < h - 1 ? p + w : -1,
      ]) {
        if (n >= 0 && dark[n]) {
          dark[n] = 0;
          queue[put++] = n;
        }
      }
    }
    const cw = maxX - minX + 1,
      ch = maxY - minY + 1,
      fill = put / (cw * ch);
    // Reject clipped components, text specks, solid blobs and grossly non-square candidates.
    if (
      minX === 0 ||
      minY === 0 ||
      maxX === w - 1 ||
      maxY === h - 1 ||
      cw < scale * 2.25 ||
      ch < scale * 2.25 ||
      cw > scale * 4.5 ||
      ch > scale * 4.5 ||
      cw / ch < 0.5 ||
      cw / ch > 2 ||
      fill < 0.25 ||
      fill > 0.88
    )
      continue;
    const point = { x: left + (minX + maxX) / 2, y: top + (minY + maxY) / 2 };
    if (luminance(Math.round(point.x), Math.round(point.y)) < 180) continue;
    candidates.push(point);
  }
  return candidates;
}

/** QR predicts the search only. Four separate marks fit the page; QR is the independent check. */
export function registerScanPhoto(
  image: ScanPixels,
  layout: ScanLayoutPage,
  qr: ScanQrGeometry,
): ScanRegistration {
  const uncertain = (reason: string): ScanRegistration => ({
    version: 1,
    status: "uncertain",
    reason,
  });
  if (
    !Number.isInteger(image.width) ||
    !Number.isInteger(image.height) ||
    image.width <= 0 ||
    image.height <= 0 ||
    image.width * image.height > 16_000_000 ||
    image.data.length !== image.width * image.height * 4
  )
    return uncertain("사진 크기를 확인할 수 없습니다. 다시 찍어 주세요.");
  const sourceQr = scanQrDataCorners(layout.qr, qr.version);
  // A projective fit to a small QR can explode far away from that QR. Use only an
  // affine search hint from its three near corners; the marks alone fit perspective.
  const [tl, tr, , bl] = qr.corners;
  if (!tl || !tr || !bl)
    return uncertain("QR의 위치를 확인할 수 없습니다. 다시 찍어 주세요.");
  const estimate = fitScanHomography(sourceQr, [
    tl,
    tr,
    { x: tr.x + bl.x - tl.x, y: tr.y + bl.y - tl.y },
    bl,
  ]);
  if (!estimate)
    return uncertain("QR의 위치를 확인할 수 없습니다. 다시 찍어 주세요.");
  const padding = localScale(estimate, { x: layout.qr.x, y: layout.qr.y }) * 2;
  const qrBounds = {
    left: Math.min(...qr.corners.map((p) => p.x)) - padding,
    right: Math.max(...qr.corners.map((p) => p.x)) + padding,
    top: Math.min(...qr.corners.map((p) => p.y)) - padding,
    bottom: Math.max(...qr.corners.map((p) => p.y)) + padding,
  };
  const found = layout.markers.map((m) =>
    scanMarkerCandidates(
      image,
      projectScanPoint(estimate, m),
      localScale(estimate, m),
    ).filter(
      (p) =>
        p.x < qrBounds.left ||
        p.x > qrBounds.right ||
        p.y < qrBounds.top ||
        p.y > qrBounds.bottom,
    ),
  );
  if (
    found.some((points) => points.length === 0) ||
    found.reduce((total, points) => total * points.length, 1) > 4096
  )
    return uncertain(
      "네 모서리 표식을 분명하게 맞추지 못했습니다. 쪽·문항 목록에서 확인해 주세요.",
    );
  const matches: ScanRegistration[] = [];
  const visit = (centres: ScanPoint[]) => {
    if (matches.length > 1) return;
    if (centres.length < 4) {
      for (const point of found[centres.length]) visit([...centres, point]);
      return;
    }
    const transform = fitScanHomography(layout.markers, centres);
    if (!transform) return;
    const qrErrorMm = Math.max(
      ...sourceQr.map(
        (p, i) =>
          distance(projectScanPoint(transform, p), qr.corners[i]) /
          localScale(transform, p),
      ),
    );
    // Design thresholds, not measured phone accuracy. Fail closed; never relax after retry.
    if (!Number.isFinite(qrErrorMm) || qrErrorMm > 1.25) return;
    const pageCorners = boxPoints({
      x: 0,
      y: 0,
      width: layout.width,
      height: layout.height,
    }).map((p) => projectScanPoint(transform, p));
    const slack = Math.min(image.width, image.height) * 0.01;
    if (
      pageCorners.some(
        (p) =>
          !Number.isFinite(p.x + p.y) ||
          p.x < -slack ||
          p.y < -slack ||
          p.x > image.width + slack ||
          p.y > image.height + slack,
      )
    )
      return;
    const slots = layout.slots.map((slot) => ({
      slotId: slot.slotId,
      points: boxPoints(slot.box).map((p) => {
        const q = projectScanPoint(transform, p);
        return { x: q.x / image.width, y: q.y / image.height };
      }),
    }));
    const result = scanRegistrationSchema.safeParse({
      version: 1,
      status: "matched",
      transform,
      qrErrorMm,
      slots,
    });
    if (result.success) matches.push(result.data);
  };
  visit([]);
  return matches.length === 1
    ? matches[0]
    : uncertain(
        "QR과 네 모서리의 위치를 하나로 확정하지 못했습니다. 번호 표시 없이 확인해 주세요.",
      );
}

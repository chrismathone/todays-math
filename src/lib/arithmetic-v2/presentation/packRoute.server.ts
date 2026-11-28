import "server-only";
import { hasPackFamily, isPackName } from "./packAssets";
import { readNodeArithmeticPack } from "./packAssets.node";

export function arithmeticPackResponse(request: Request) {
  const query = new URL(request.url).searchParams;
  const pack = query.get("pack") ?? "";
  const family = query.get("family") ?? "";
  if (!isPackName(pack) || !hasPackFamily(pack, family))
    return new Response(null, { status: 404 });
  return Response.json(
    { pack, family, data: readNodeArithmeticPack(pack, family) },
    {
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

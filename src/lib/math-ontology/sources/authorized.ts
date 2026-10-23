import type {
  MathOntologyAuthorizedSourceContext,
  MathOntologyAuthorizedSourcePort,
} from "@/contracts/mathOntologySource.contract";
import { mathOntologySourceDigestSchema } from "@/contracts/mathOntologySource.contract";
import { canonicalSourceJson, freezeSourceValue } from "./canonical";
/** Context binding, not an authorization implementation. Port owners must call existing auth/branch helpers. */
export async function readAuthorizedMathOntologySources<Row>(
  port: MathOntologyAuthorizedSourcePort<Row>,
  context: MathOntologyAuthorizedSourceContext,
  expectedWatermark: string,
) {
  mathOntologySourceDigestSchema.parse(context.contextHash);
  mathOntologySourceDigestSchema.parse(context.authorizationStamp);
  if (!context.opaqueSnapshotId || !context.asOf || !expectedWatermark)
    throw new Error("Missing authorized source snapshot/watermark");
  const expected = canonicalSourceJson(context),
    result = await port.read(
      freezeSourceValue({
        ...context,
        sourceWatermarks: { ...context.sourceWatermarks },
      }),
    );
  if (
    canonicalSourceJson(result.context) !== expected ||
    result.watermark !== expectedWatermark
  )
    throw new Error("Authorized source context or watermark changed");
  return freezeSourceValue({
    context: result.context,
    watermark: result.watermark,
    rows: [...result.rows],
  });
}

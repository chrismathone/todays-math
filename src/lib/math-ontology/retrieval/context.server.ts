import "server-only";
import { ontologyAuthorizationClockFields } from "../access/stamp";
import { ontologyActionReceiptSchema } from "@/contracts/mathOntologyAction.contract";
import { checkedCanonical } from "../actions/canonical";
import { currentOntologyObservations } from "../feedback/observations";
import { db } from "@/lib/db";
import type { OntologyActionActor } from "../actions/authorization";
import type { OntologyActionTarget } from "@/contracts/mathOntologyAction.contract";
import { authorizeOntologyOperationRequest } from "../actions/production.server";
import { readOntologyActorInTransaction } from "../actions/actor";
import { OntologyOperationError, requireOperation } from "../actions/errors";
import {
  authorizeMathOntologyNativeSourceRead,
  authorizeMathOntologySourceRead,
  readMathOntologyDatabaseSources,
} from "../sources/server";
import { readActiveOntologyRelease } from "../publish/store";
import { loadOntologyRuntime } from "../runtime/artifact";
import { canonicalOntologyJson, ontologyDigest } from "../compiler/canonical";
import {
  loadPackagedOntologyBase,
  packagedSourceSchema,
  readOntologyAsset,
  readPackagedOntologyArtifact,
} from "../runtime/base";
import { readNativeDefinitionEvidenceInTransaction } from "../sources/definitionEvidence";
import { joinRetainedOntologySources } from "./privateJoins";
import type { OntologyAssistSession } from "./assist";
export function ontologyCursorSecret() {
  const s = process.env.AUTH_SECRET || process.env.STUDIO_ENGINE_SECRET;
  requireOperation(s && s.length >= 32, "UNAVAILABLE");
  return s;
}
/** Bound to authenticated token, current source ownership, fixed observation asOf,
 * and a live clock after every await. No module-global active graph. */
export function createProductionOntologyContext(
  request: Request,
  actor: OntologyActionActor,
  target?: OntologyActionTarget,
) {
  const asOf = new Date();
  async function authorize() {
    const current = await authorizeOntologyOperationRequest(request);
    requireOperation(
      current.actor &&
        current.actor.id === actor.id &&
        current.actor.sessionVersion === actor.sessionVersion &&
        !current.response,
      "FORBIDDEN",
    );
    return db.$transaction(async (tx) => {
      await authorizeMathOntologyNativeSourceRead(tx, {
        actor,
        authorizationNow: () => new Date(),
      });
      const a = await readOntologyActorInTransaction(
        tx,
        actor,
        () => new Date(),
      );
      const scoped = target
        ? await authorizeMathOntologySourceRead(tx, {
            actor,
            target,
            graphVersion: "ontology:request-preflight",
            now: asOf,
            authorizationNow: () => new Date(),
          })
        : null;
      return ontologyDigest(
        canonicalOntologyJson({
          id: actor.id,
          sessionVersion: actor.sessionVersion,
          role: a.row.role,
          isAdmin: a.row.isAdmin,
          isSuperAdmin: a.row.isSuperAdmin,
          disabledMenus: a.row.disabledMenus,
          branchId: a.row.branchId,
          ...ontologyAuthorizationClockFields(a.branch, a.managed, a.binding),
          scope: scoped?.authorizationStamp ?? null,
        }),
      );
    });
  }
  async function open(withPrivate = true): Promise<OntologyAssistSession> {
    const stamp = await authorize();
    const release = await readActiveOntologyRelease("global");
    requireOperation(release, "UNAVAILABLE");
    const source = target
      ? await readMathOntologyDatabaseSources({
          actor,
          target,
          graphVersion: release.identity.graphVersion,
          now: asOf,
          authorizationNow: () => new Date(),
        })
      : undefined;
    const context = {
      allowedScopes: ["global"],
      contextHash: ontologyDigest(
        canonicalOntologyJson({
          stamp,
          source: source?.snapshotDigest ?? null,
          graphVersion: release.identity.graphVersion,
          generation: release.generation,
        }),
      ),
      cursorSecret: ontologyCursorSecret(),
    };
    const runtime = await loadOntologyRuntime(
      release.artifact,
      release.identity,
    );
    async function assertCurrent() {
      const latest = await authorize();
      if (latest !== stamp) throw new OntologyOperationError("STALE");
      if (target && source) {
        const last = await readMathOntologyDatabaseSources({
          actor,
          target,
          graphVersion: release!.identity.graphVersion,
          now: asOf,
          authorizationNow: () => new Date(),
        });
        if (last.snapshotDigest !== source.snapshotDigest)
          throw new OntologyOperationError("STALE");
      }
      const active = await readActiveOntologyRelease("global");
      if (
        !active ||
        active.generation !== release!.generation ||
        active.identity.graphVersion !== release!.identity.graphVersion
      )
        throw new OntologyOperationError("STALE");
    }
    async function readObservations(window: "retained" | "after-last-plan") {
      requireOperation(target && source, "FORBIDDEN");
      await assertCurrent();
      if (window === "retained") {
        const attempts = source.learning.firstAttempts,
          correct = attempts.filter(
            (a) => a.independentFirstAttempt && a.correct,
          ).length,
          incorrect = attempts.filter(
            (a) => a.independentFirstAttempt && !a.correct,
          ).length;
        return {
          available: true,
          window,
          counts: {
            retainedFirstAttempts: attempts.length,
            independentCorrect: correct,
            independentIncorrect: incorrect,
            excluded: attempts.length - correct - incorrect,
          },
        };
      }
      const result = await db.$transaction(async (tx) => {
        await authorizeMathOntologySourceRead(tx, {
          actor,
          target,
          graphVersion: release!.identity.graphVersion,
          now: asOf,
          authorizationNow: () => new Date(),
        });
        const receipt = await tx.ontologyReceipt.findFirst({
          where: {
            actorId: actor.id,
            createdAt: { lte: asOf },
            proposal: {
              studentId: target.studentId,
              classId: target.classId,
              branchId: target.branchId,
            },
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        });
        if (!receipt)
          return {
            available: false,
            window,
            counts: {
              retainedFirstAttempts: 0,
              independentCorrect: 0,
              independentIncorrect: 0,
              excluded: 0,
            },
          };
        const value = ontologyActionReceiptSchema.parse(
          checkedCanonical(receipt.resultCanonical, receipt.resultHash),
        );
        requireOperation(
          value.id === receipt.id && value.proposalId === receipt.proposalId,
          "BINDING_MISMATCH",
        );
        const observed = await currentOntologyObservations.resolve(
          tx,
          actor,
          target,
          "ontology:observation:assist",
          asOf,
          {
            committedAt: value.committedAt,
            minimumRevision: value.afterRevision,
            authorizationClock: () => new Date(),
          },
        );
        return { available: true, window, counts: observed.counts };
      });
      await assertCurrent();
      return result;
    }
    async function readDefinitions(entities: readonly string[]) {
      const manifest = packagedSourceSchema.safeParse(
        JSON.parse(release!.artifact.files.source),
      );
      if (!manifest.success) return [];
      const { base, sourceManifest } = loadPackagedOntologyBase(
        manifest.data.baseHash,
      );
      const index = JSON.parse(
        readPackagedOntologyArtifact(base, base.catalog).toString("utf8"),
      ) as {
        entries: { entity: string; namespace: string; nativeId: string }[];
      };
      const ids = index.entries
        .filter(
          (e) =>
            e.namespace === "bank-definition" && entities.includes(e.entity),
        )
        .slice(0, 6)
        .map((e) => e.nativeId);
      if (!ids.length) return [];
      const evidence = await db.$transaction((tx) =>
        readNativeDefinitionEvidenceInTransaction(
          tx,
          {
            actor,
            graphVersion: release!.identity.graphVersion,
            now: asOf,
            authorizationNow: () => new Date(),
          },
          ids,
          { manifest: sourceManifest, read: readOntologyAsset },
        ),
      );
      await assertCurrent();
      return evidence.packets.map((d) => ({
        entity: d.sourceVersionIri,
        text: d.definition,
      }));
    }
    const privateEvidence =
      source && withPrivate
        ? await joinRetainedOntologySources(runtime, source, context)
        : undefined;
    await assertCurrent();
    return {
      runtime,
      context,
      privateEvidence,
      assertCurrent,
      readDefinitions,
      readObservations,
    };
  }
  async function identities() {
    await authorize();
    const [user, student, group] = await Promise.all([
      db.user.findUnique({ where: { id: actor.id }, select: { name: true } }),
      target
        ? db.student.findUnique({
            where: { id: target.studentId },
            select: { name: true },
          })
        : null,
      target
        ? db.class.findUnique({
            where: { id: target.classId },
            select: { name: true },
          })
        : null,
    ]);
    await authorize();
    return [
      actor.id,
      user?.name,
      target?.studentId,
      target?.classId,
      target?.branchId,
      student?.name,
      group?.name,
    ].filter((s): s is string => typeof s === "string" && s.length > 0);
  }
  return { authorize, open, identities, asOf };
}

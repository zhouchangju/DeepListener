import {
  evaluateDatabaseReadiness,
  type ReadinessCheck,
  type ReadinessDependencies,
} from "@/lib/setup-readiness";

export interface DatabaseRouteReadiness {
  ok: boolean;
  check?: ReadinessCheck;
}

/**
 * Guard for pages whose first render reads learning data through Prisma.
 * Missing/read-only databases become a Setup destination instead of a
 * generic error/retry loop. Unknown errors are kept as a blocked state so the
 * normal data page is never rendered against an unsafe runtime.
 */
export async function getDatabaseRouteReadiness(
  overrides: Partial<ReadinessDependencies> = {},
): Promise<DatabaseRouteReadiness> {
  try {
    const check = await evaluateDatabaseReadiness(overrides);
    return check.status === "ready" ? { ok: true } : { ok: false, check };
  } catch {
    return {
      ok: false,
      check: {
        id: "database",
        status: "action",
        detailKey: "readiness.database.serverMissingDetail",
        fixKey: "readiness.database.serverMissingFix",
      },
    };
  }
}

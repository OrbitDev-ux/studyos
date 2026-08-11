import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { createPrismaImportRepository } from "@/features/problems/import/repository";
import {
  buildImportCompletedEvent,
  importProblems,
  ImportRequestError,
} from "@/features/problems/import/service";

/**
 * POST /api/problems/import — the OFFICIAL server-to-server ingestion endpoint
 * for the external problem generator (Claude Code). External generators never
 * touch the DB directly; they call this route, which authenticates a service
 * token, then runs the shared import service (validate → dedupe → store).
 *
 * SECURITY:
 *  - Bearer service token in `Authorization`, compared in constant time against
 *    PROBLEM_IMPORT_TOKEN. No Supabase service key / DB creds / JWT secret is ever
 *    exposed to the caller. Missing/invalid token → 401. Token unset → 503.
 *  - Oversized payloads are rejected (Content-Length cap + per-request problem cap
 *    in the service).
 */

// Imports write many rows; give the function room beyond the default.
export const maxDuration = 60;

// ~8 MB request cap (a 500-problem batch is well under this).
const MAX_BODY_BYTES = 8 * 1024 * 1024;

function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

export async function POST(request: NextRequest) {
  const expected = process.env.PROBLEM_IMPORT_TOKEN;
  if (!expected) {
    // Feature not configured — do NOT leak details; just say it's unavailable.
    return NextResponse.json({ error: "IMPORT_NOT_CONFIGURED" }, { status: 503 });
  }

  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!bearer || !tokenMatches(bearer, expected)) {
    return unauthorized();
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  try {
    const repo = createPrismaImportRepository();
    const result = await importProblems(body as Record<string, unknown>, repo);

    // Newly stored problems must appear in the live 문제은행 without a manual refresh.
    if (result.accepted > 0) revalidatePath("/study-bank");

    // Future Discord webhook / event bus hook — built, logged, NOT dispatched here.
    const event = buildImportCompletedEvent(result);
    console.info("[import] ProblemImportCompleted", JSON.stringify(event));

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ImportRequestError) {
      return NextResponse.json({ error: "BAD_REQUEST", message: err.message }, { status: 400 });
    }
    // Never leak internals (Prisma/Supabase errors) to the caller.
    console.error("[import] unexpected error:", err);
    return NextResponse.json({ error: "IMPORT_FAILED" }, { status: 500 });
  }
}

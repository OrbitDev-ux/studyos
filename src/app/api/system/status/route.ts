import { NextResponse } from "next/server";
import { getMaintenance } from "@/lib/maintenance";

// GET /api/system/status — public maintenance status.
// { "maintenance": boolean, "title": string, "message": string }
export async function GET() {
  const state = await getMaintenance();
  return NextResponse.json({
    maintenance: state.enabled,
    title: state.title ?? "",
    message: state.message ?? "",
  });
}

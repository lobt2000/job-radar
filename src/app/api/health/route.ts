import { NextResponse } from "next/server";
import { ensureDb } from "@/db/ensure";
import { countCompanies } from "@/lib/companies";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    ensureDb();
    return NextResponse.json({
      ok: true,
      companies: countCompanies(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

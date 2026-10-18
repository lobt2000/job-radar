import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/db/ensure";
import { paginate, parsePageParams } from "@/lib/pagination";
import { listCompaniesWiki } from "@/lib/vacancies";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  ensureDb();
  const { page, limit } = parsePageParams(req.nextUrl.searchParams);
  const all = listCompaniesWiki();
  const result = paginate(all, page, limit);
  return NextResponse.json({
    ...result,
    items: result.items.map((c) => ({
      ...c,
      lastScrapedAt: c.lastScrapedAt
        ? c.lastScrapedAt.toISOString()
        : null,
    })),
  });
}

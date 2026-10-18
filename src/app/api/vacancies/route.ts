import { NextRequest } from "next/server";
import { ensureDb } from "@/db/ensure";
import { jsonPage } from "@/lib/api";
import { listAllVacancies } from "@/lib/vacancies";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  ensureDb();
  return jsonPage(req, listAllVacancies());
}

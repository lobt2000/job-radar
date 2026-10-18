import { NextResponse } from "next/server";
import { getScrapeStatus, runRefresh } from "@/lib/scrape/runner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getScrapeStatus());
}

export async function POST() {
  const status = getScrapeStatus();
  if (status.status === "running") {
    return NextResponse.json(status);
  }

  // Fire and continue — client polls GET
  void runRefresh();
  return NextResponse.json({
    ...getScrapeStatus(),
    status: "running",
    message: "Refresh started",
  });
}

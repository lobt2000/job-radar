import { NextRequest, NextResponse } from "next/server";
import {
  paginate,
  parsePageParams,
  serializeVacancy,
} from "@/lib/pagination";

export function jsonPage<T extends { firstSeenAt?: Date | null }>(
  req: NextRequest,
  items: T[],
  opts?: { serializeDates?: boolean },
) {
  const { page, limit } = parsePageParams(req.nextUrl.searchParams);
  const result = paginate(items, page, limit);
  const payload = {
    ...result,
    items:
      opts?.serializeDates === false
        ? result.items
        : result.items.map((item) =>
            item && typeof item === "object" && "firstSeenAt" in item
              ? serializeVacancy(
                  item as T & { firstSeenAt: Date | null },
                )
              : item,
          ),
  };
  return NextResponse.json(payload);
}

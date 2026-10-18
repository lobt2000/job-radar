import fs from "node:fs";
import path from "node:path";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { cvDocuments } from "@/db/schema";
import { getProfileTokens, updateProfile } from "@/lib/vacancies";

const UPLOAD_DIR = path.join(process.cwd(), "data", "cv");

export type ParsedCv = {
  roles: string[];
  keywords: string[];
  cities: string[];
  englishLevel: string | null;
  experienceMin: number | null;
  summary: string;
};

/** Lightweight heuristic parse — v2 foundation (PDF/DOCX later). */
export function parseCvText(raw: string): ParsedCv {
  const text = raw.replace(/\r/g, "\n");
  const lower = text.toLowerCase();

  const techHints = [
    "javascript",
    "typescript",
    "react",
    "next.js",
    "nextjs",
    "node",
    "python",
    "java",
    "golang",
    "go",
    "rust",
    "aws",
    "docker",
    "kubernetes",
    "sql",
    "postgresql",
    "mongodb",
    "graphql",
    "css",
    "html",
    "vue",
    "angular",
  ];
  const keywords = techHints.filter((k) => lower.includes(k.replace(".", "")));

  const roleHints = [
    "frontend",
    "backend",
    "fullstack",
    "full-stack",
    "devops",
    "qa",
    "designer",
    "product manager",
    "mobile",
    "ios",
    "android",
  ];
  const roles = roleHints.filter((r) => lower.includes(r));

  const cityHints = [
    "київ",
    "kyiv",
    "kiev",
    "львів",
    "lviv",
    "харків",
    "kharkiv",
    "odesa",
    "одеса",
    "warsaw",
    "варшава",
    "remote",
  ];
  const cities = cityHints.filter((c) => lower.includes(c));

  let englishLevel: string | null = null;
  for (const lvl of ["c2", "c1", "b2", "b1", "upper-intermediate", "advanced", "intermediate"]) {
    if (lower.includes(lvl)) {
      englishLevel = lvl.toUpperCase().startsWith("B") || lvl.toUpperCase().startsWith("C")
        ? lvl.toUpperCase()
        : lvl;
      break;
    }
  }

  const yearsMatch = lower.match(/(\d+)\+?\s*(years?|рок|год)/);
  const experienceMin = yearsMatch ? Number(yearsMatch[1]) : null;

  const summary = text.slice(0, 400).replace(/\s+/g, " ").trim();

  return {
    roles: [...new Set(roles)],
    keywords: [...new Set(keywords)],
    cities: [...new Set(cities)],
    englishLevel,
    experienceMin:
      experienceMin != null && !Number.isNaN(experienceMin)
        ? experienceMin
        : null,
    summary,
  };
}

export function listCvDocuments() {
  return db
    .select()
    .from(cvDocuments)
    .orderBy(desc(cvDocuments.createdAt))
    .all();
}

export function getLatestReadyCv() {
  return db
    .select()
    .from(cvDocuments)
    .where(eq(cvDocuments.status, "ready"))
    .orderBy(desc(cvDocuments.createdAt))
    .limit(1)
    .get();
}

export function getCvDocument(id: number) {
  return db.select().from(cvDocuments).where(eq(cvDocuments.id, id)).get();
}

export async function saveUploadedCv(file: File): Promise<{ id: number }> {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const stamp = Date.now();
  const storagePath = path.join(UPLOAD_DIR, `${stamp}-${safeName}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(storagePath, buffer);

  const isText =
    file.type.startsWith("text/") ||
    safeName.endsWith(".txt") ||
    safeName.endsWith(".md");

  let rawText: string | null = null;
  let status: "uploaded" | "ready" | "error" = "uploaded";
  let parsedJson: string | null = null;
  let errorMessage: string | null = null;

  if (isText) {
    rawText = buffer.toString("utf8");
    const parsed = parseCvText(rawText);
    parsedJson = JSON.stringify(parsed);
    status = "ready";
  } else {
    errorMessage =
      "PDF/DOCX parsing comes next — upload a .txt export for now, or paste text.";
    status = "error";
  }

  const row = db
    .insert(cvDocuments)
    .values({
      fileName: file.name,
      mimeType: file.type || null,
      storagePath,
      rawText,
      parsedJson,
      status,
      errorMessage,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()
    .get();

  return { id: row.id };
}

export function applyParsedCvToProfile(parsed: ParsedCv): void {
  const current = getProfileTokens();
  updateProfile({
    roles: parsed.roles.length ? parsed.roles : current.roles,
    keywords: [...new Set([...current.keywords, ...parsed.keywords])],
    excludeKeywords: current.excludeKeywords,
    cities: parsed.cities.length ? parsed.cities : current.cities,
    englishLevel: parsed.englishLevel ?? current.englishLevel,
    experienceMin: parsed.experienceMin ?? current.experienceMin,
    preferRemote: parsed.cities.includes("remote") || current.preferRemote,
  });
}

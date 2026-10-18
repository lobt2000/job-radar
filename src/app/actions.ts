"use server";

import { revalidatePath } from "next/cache";
import { ensureDb } from "@/db/ensure";
import {
  applyParsedCvToProfile,
  getCvDocument,
  saveUploadedCv,
  type ParsedCv,
} from "@/lib/cv";
import { optionalNumber, optionalString, splitFormList } from "@/lib/form";
import {
  advanceNewWatermark,
  archiveApplication,
  markApplied,
  unmarkApplied,
  updateProfile,
} from "@/lib/vacancies";

ensureDb();

function revalidateBoard() {
  revalidatePath("/");
  revalidatePath("/new");
  revalidatePath("/applied");
  revalidatePath("/profile");
  revalidatePath("/cv");
}

export async function markAppliedAction(vacancyId: number) {
  markApplied(vacancyId);
  revalidateBoard();
}

export async function unmarkAppliedAction(vacancyId: number) {
  unmarkApplied(vacancyId);
  revalidateBoard();
}

export async function archiveAppliedAction(vacancyId: number) {
  archiveApplication(vacancyId);
  revalidatePath("/applied");
}

export async function markNewSeenAction() {
  advanceNewWatermark();
  revalidatePath("/");
  revalidatePath("/new");
}

export async function saveProfileAction(formData: FormData) {
  updateProfile({
    roles: splitFormList(formData.get("roles")),
    keywords: splitFormList(formData.get("keywords")),
    excludeKeywords: splitFormList(formData.get("excludeKeywords")),
    cities: splitFormList(formData.get("cities")),
    englishLevel: optionalString(formData.get("englishLevel")),
    experienceMin: optionalNumber(formData.get("experienceMin")),
    preferRemote: formData.get("preferRemote") === "on",
  });
  revalidateBoard();
}

export async function uploadCvAction(formData: FormData) {
  const file = formData.get("cv");
  if (!(file instanceof File) || file.size === 0) return;
  await saveUploadedCv(file);
  revalidatePath("/cv");
  revalidatePath("/profile");
}

export async function applyCvToProfileAction(docId: number) {
  const doc = getCvDocument(docId);
  if (!doc?.parsedJson) return;
  applyParsedCvToProfile(JSON.parse(doc.parsedJson) as ParsedCv);
  revalidateBoard();
}

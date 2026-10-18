"use server";

import { revalidatePath } from "next/cache";
import { ensureDb } from "@/db/ensure";
import {
  advanceNewWatermark,
  archiveApplication,
  markApplied,
  unmarkApplied,
  updateProfile,
} from "@/lib/vacancies";

ensureDb();

export async function markAppliedAction(vacancyId: number) {
  markApplied(vacancyId);
  revalidatePath("/");
  revalidatePath("/new");
  revalidatePath("/applied");
}

export async function unmarkAppliedAction(vacancyId: number) {
  unmarkApplied(vacancyId);
  revalidatePath("/");
  revalidatePath("/new");
  revalidatePath("/applied");
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
  const split = (key: string) =>
    String(formData.get(key) ?? "")
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

  updateProfile({
    roles: split("roles"),
    keywords: split("keywords"),
    excludeKeywords: split("excludeKeywords"),
  });
  revalidatePath("/");
  revalidatePath("/new");
  revalidatePath("/profile");
}

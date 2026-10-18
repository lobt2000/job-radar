/** Split comma/newline form fields into trimmed tokens. */
export function splitFormList(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function optionalNumber(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

export function optionalString(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "").trim();
  return raw || null;
}

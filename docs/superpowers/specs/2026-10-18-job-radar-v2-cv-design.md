# Job Radar v2 — CV Parse (draft)

## Goal

Upload a CV, extract structured profile signals, and use them to rank vacancies — with less manual Profile editing.

## v2.0 (shipped foundation)

- `cv_documents` table + upload UI at `/cv`
- `.txt` / `.md` heuristic parser (`parseCvText`)
- “Apply to matching profile” merges parsed roles/keywords/cities/English/years into Profile

## v2.1 (next)

- PDF text extraction (`pdf-parse` or similar)
- DOCX extraction
- Confirm/edit parsed fields before applying to profile
- Optional: score vacancies against CV text blob directly

## v2.2 (later)

- Embedding / LLM ranking against CV
- Cover-letter draft from vacancy + CV

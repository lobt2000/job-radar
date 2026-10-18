import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchesBoardFilters, scoreVacancy } from "./score";

const emptyExtra = {
  cities: [] as string[],
  englishLevel: null as string | null,
  experienceMin: null as number | null,
  preferRemote: false,
};

describe("scoreVacancy", () => {
  it("returns 0 when profile is empty", () => {
    assert.equal(
      scoreVacancy("Frontend Engineer", "React", {
        roles: [],
        keywords: [],
        excludeKeywords: [],
        ...emptyExtra,
      }),
      0,
    );
  });

  it("scores roles and keywords", () => {
    const score = scoreVacancy(
      "Senior Frontend Engineer",
      "React TypeScript remote",
      {
        roles: ["frontend"],
        keywords: ["react", "typescript"],
        excludeKeywords: [],
        ...emptyExtra,
      },
    );
    assert.equal(score, 5);
  });

  it("hides excluded vacancies", () => {
    assert.equal(
      scoreVacancy("Java Backend", "Spring", {
        roles: ["backend"],
        keywords: [],
        excludeKeywords: ["java"],
        ...emptyExtra,
      }),
      null,
    );
  });

  it("boosts remote preference", () => {
    const score = scoreVacancy("Engineer", "Remote TypeScript", {
      roles: [],
      keywords: ["typescript"],
      excludeKeywords: [],
      ...emptyExtra,
      preferRemote: true,
    });
    assert.ok(score != null && score >= 3);
  });
});

describe("matchesBoardFilters", () => {
  it("filters by query and remote", () => {
    assert.equal(
      matchesBoardFilters("React Dev", "remote Київ", "MacPaw", {
        q: "react",
        remote: true,
      }),
      true,
    );
    assert.equal(
      matchesBoardFilters("Java Dev", "office only", "Acme", {
        remote: true,
      }),
      false,
    );
  });
});

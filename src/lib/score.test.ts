import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scoreVacancy } from "./score";

describe("scoreVacancy", () => {
  it("returns 0 when profile is empty", () => {
    assert.equal(
      scoreVacancy("Frontend Engineer", "React", {
        roles: [],
        keywords: [],
        excludeKeywords: [],
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
      }),
      null,
    );
  });
});

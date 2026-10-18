import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCvText } from "./cv";

describe("parseCvText", () => {
  it("extracts stack and role hints", () => {
    const parsed = parseCvText(
      "Frontend developer with React, TypeScript, Next.js. Based in Kyiv. English B2. 5 years experience.",
    );
    assert.ok(parsed.roles.includes("frontend"));
    assert.ok(parsed.keywords.includes("react"));
    assert.ok(parsed.keywords.includes("typescript"));
    assert.ok(parsed.cities.some((c) => c.includes("kyiv")));
    assert.equal(parsed.experienceMin, 5);
  });
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  parseCareersCandidates,
  pickBestCareersUrl,
} from "./careers-discover";

const fixtures = path.join(process.cwd(), "src", "fixtures");

describe("careers discovery", () => {
  it("picks careers path over unrelated links", () => {
    const html = readFileSync(
      path.join(fixtures, "careers-homepage.fragment.html"),
      "utf8",
    );
    const best = pickBestCareersUrl(html, "https://example.com/");
    assert.ok(best);
    assert.match(best!, /careers|jobs/i);
    assert.doesNotMatch(best!, /linkedin/i);
  });

  it("scores multiple candidates", () => {
    const html = readFileSync(
      path.join(fixtures, "careers-homepage.fragment.html"),
      "utf8",
    );
    const list = parseCareersCandidates(html, "https://example.com/");
    assert.ok(list.length >= 2);
    assert.ok(list[0].score >= list[1].score);
  });
});

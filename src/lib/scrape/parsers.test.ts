import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  parseCompanyBlocks,
  parseCompanyWebsite,
} from "./dou-companies";
import { parseVacancyBlocks } from "./dou-vacancies";

const fixtures = path.join(process.cwd(), "src", "fixtures");

describe("DOU company parsers", () => {
  it("parses company list cards", () => {
    const html = readFileSync(
      path.join(fixtures, "companies-list.fragment.html"),
      "utf8",
    );
    const companies = parseCompanyBlocks(html);
    assert.equal(companies.length, 2);
    assert.equal(companies[0].slug, "ciklum");
    assert.equal(companies[0].name, "Ciklum");
    assert.equal(companies[0].douVacancyCount, 42);
    assert.match(companies[0].douVacanciesUrl, /ciklum\/vacancies/);
    assert.equal(companies[1].slug, "macpaw");
  });

  it("parses company website from profile page", () => {
    const html = readFileSync(
      path.join(fixtures, "company-page.fragment.html"),
      "utf8",
    );
    const site = parseCompanyWebsite(html);
    assert.ok(site);
    assert.match(site!, /ciklum\.com/i);
  });
});

describe("DOU vacancy parsers", () => {
  it("parses vacancy list cards", () => {
    const html = readFileSync(
      path.join(fixtures, "vacancies-list.fragment.html"),
      "utf8",
    );
    const vacancies = parseVacancyBlocks(html);
    assert.equal(vacancies.length, 2);
    assert.equal(vacancies[0].externalId, "373210");
    assert.match(vacancies[0].title, /Senior Go Engineer/);
    assert.ok(vacancies[0].shortDescription?.includes("Senior Go"));
  });
});

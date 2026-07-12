const assert = require("node:assert/strict");
const test = require("node:test");

const { matchTerms, validateTermbase } = require("../lib/termbase");

const baseEntry = {
  english: "threat area",
  zhCn: "威胁区",
  category: "rules-zone",
  status: "approved",
  source: "official-core-set",
  aliases: [],
  forbidden: [],
};

test("validateTermbase rejects duplicate approved English terms", () => {
  const issues = validateTermbase([
    baseEntry,
    { ...baseEntry, zhCn: "威胁区域" },
  ]);

  assert.deepEqual(issues, [
    {
      code: "duplicate-english",
      english: "threat area",
      zhCn: ["威胁区", "威胁区域"],
    },
  ]);
});

test("validateTermbase rejects duplicate approved Chinese terms", () => {
  const issues = validateTermbase([
    baseEntry,
    { ...baseEntry, english: "danger area" },
  ]);

  assert.deepEqual(issues, [
    {
      code: "duplicate-zh-cn",
      english: ["danger area", "threat area"],
      zhCn: "威胁区",
    },
  ]);
});

test("validateTermbase permits an explicit scoped exception", () => {
  const issues = validateTermbase([
    baseEntry,
    {
      ...baseEntry,
      english: "danger area",
      exception: { scope: "legacy-campaign-title", reason: "Published title" },
    },
  ]);

  assert.deepEqual(issues, []);
});

test("matchTerms uses longest English term first and exposes aliases", () => {
  const terms = [
    { ...baseEntry, english: "area", zhCn: "区域" },
    { ...baseEntry, aliases: ["威胁区域"] },
  ];

  assert.deepEqual(matchTerms("Move to the threat area.", terms), [
    {
      english: "threat area",
      zhCn: "威胁区",
      start: 12,
      end: 23,
      aliases: ["威胁区域"],
    },
  ]);
});

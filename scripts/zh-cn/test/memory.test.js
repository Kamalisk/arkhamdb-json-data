const assert = require("node:assert/strict");
const test = require("node:test");

const { lookupMemory, validateMemory } = require("../lib/memory");

const baseEntry = {
  english: "Draw 1 card.",
  zhCn: "抽取1张卡牌。",
  category: "rules-text",
  status: "approved",
  source: "01001",
};

test("validateMemory rejects conflicting approved exact-source translations", () => {
  const issues = validateMemory([
    baseEntry,
    { ...baseEntry, zhCn: "抽1张卡。", source: "01002" },
  ]);

  assert.deepEqual(issues, [
    {
      code: "duplicate-english",
      english: "Draw 1 card.",
      zhCn: ["抽1张卡。", "抽取1张卡牌。"],
    },
  ]);
});

test("lookupMemory returns only an approved exact-source match", () => {
  const entries = [
    baseEntry,
    { ...baseEntry, english: "Ignored.", status: "candidate" },
  ];

  assert.deepEqual(lookupMemory("Draw 1 card.", entries), baseEntry);
  assert.equal(lookupMemory("Ignored.", entries), undefined);
  assert.equal(lookupMemory("Draw 2 cards.", entries), undefined);
});

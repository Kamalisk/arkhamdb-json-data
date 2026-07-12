const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildCandidateReport,
  normalizeRuleLabel,
  selectConflictContexts,
} = require("../lib/candidates");

test("normalizeRuleLabel treats conclusion markup as formatting rather than terminology", () => {
  assert.equal(normalizeRuleLabel("(→R1)."), "→R1");
  assert.equal(normalizeRuleLabel("结局1"), "→结局1");
  assert.equal(normalizeRuleLabel("Additional Setup:"), "Additional Setup");
});

test("buildCandidateReport aggregates aligned traits and bold rule labels", () => {
  const report = buildCandidateReport([
    {
      code: "00001",
      english: {
        traits: "Item. Weapon.",
        text: "<b>Forced</b> - Do a thing.",
      },
      zhCn: {
        traits: "物品. 武器.",
        text: "<b>强制</b> - 做一件事。",
      },
    },
    {
      code: "00002",
      english: { traits: "Item. Tool.", text: "<b>Forced</b> - Do another thing." },
      zhCn: { traits: "物品. 工具.", text: "<b>强制</b> - 做另一件事。" },
    },
  ]);

  assert.deepEqual(report.candidates, [
    {
      english: "Forced",
      zhCn: "强制",
      category: "rule-label",
      occurrences: 2,
      examples: [
        { code: "00001", field: "text" },
        { code: "00002", field: "text" },
      ],
    },
    {
      english: "Item",
      zhCn: "物品",
      category: "trait",
      occurrences: 2,
      examples: [
        { code: "00001", field: "traits" },
        { code: "00002", field: "traits" },
      ],
    },
    {
      english: "Tool",
      zhCn: "工具",
      category: "trait",
      occurrences: 1,
      examples: [{ code: "00002", field: "traits" }],
    },
    {
      english: "Weapon",
      zhCn: "武器",
      category: "trait",
      occurrences: 1,
      examples: [{ code: "00001", field: "traits" }],
    },
  ]);
  assert.deepEqual(report.conflicts, []);
});

test("buildCandidateReport surfaces both directions of conflicting terms", () => {
  const report = buildCandidateReport([
    {
      code: "00001",
      english: { traits: "Item. Tool." },
      zhCn: { traits: "物品. 工具." },
    },
    {
      code: "00002",
      english: { traits: "Item. Device." },
      zhCn: { traits: "物品. 工具." },
    },
  ]);

  assert.deepEqual(report.conflicts, [
    {
      code: "one-zh-cn-many-english",
      english: ["Device", "Tool"],
      zhCn: "工具",
    },
  ]);
});

test("buildCandidateReport treats casing, simple plurals, and rule-label punctuation as the same English term", () => {
  const alignment = [
    {
      code: "1",
      english: { traits: "Circle. Mountain", text: "<b>Forced</b>" },
      zhCn: { traits: "阵法. 山脉", text: "<b>强制</b>" },
    },
    {
      code: "2",
      english: { traits: "circle. Mountains", text: "<b>Forced -</b>" },
      zhCn: { traits: "阵法. 山脉", text: "<b>强制</b>" },
    },
  ];

  assert.deepEqual(buildCandidateReport(alignment).conflicts, []);
});

test("buildCandidateReport excludes fields inherited from the Traditional Chinese source", () => {
  const report = buildCandidateReport(
    [
      {
        code: "00001",
        english: { traits: "Item. Tool." },
        zhCn: { traits: "物品. 工具." },
      },
    ],
    new Map([["00001", new Set(["traits"])]]),
  );

  assert.deepEqual(report, { candidates: [], conflicts: [] });
});

test("selectConflictContexts retains the full original field text for review", () => {
  const alignment = [
    {
      code: "00001",
      english: { traits: "Item. Tool." },
      zhCn: { traits: "物品. 工具." },
    },
    {
      code: "00002",
      english: { traits: "Item. Device." },
      zhCn: { traits: "物品. 工具." },
    },
  ];
  const report = buildCandidateReport(alignment);

  assert.deepEqual(selectConflictContexts(report, alignment), [
    {
      conflict: {
        code: "one-zh-cn-many-english",
        english: ["Device", "Tool"],
        zhCn: "工具",
      },
      examples: [
        {
          code: "00001",
          field: "traits",
          englishContext: "Item. Tool.",
          zhCnContext: "物品. 工具.",
        },
        {
          code: "00002",
          field: "traits",
          englishContext: "Item. Device.",
          zhCnContext: "物品. 工具.",
        },
      ],
    },
  ]);
});

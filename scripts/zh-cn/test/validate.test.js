const assert = require("node:assert/strict");
const test = require("node:test");

const { validateTranslations } = require("../lib/validate");

const terms = [
  {
    english: "Hunter",
    zhCn: "猎手",
    category: "trait",
    status: "approved",
    aliases: [],
    forbidden: ["猎人"],
  },
];

const memory = [
  {
    english: "Draw 1 card.",
    zhCn: "抽取1张卡牌。",
    category: "rules-text",
    status: "approved",
    source: "01001",
  },
];

test("validateTranslations reports protected-token and number mismatches", () => {
  const issues = validateTranslations(
    [
      {
        code: "00001",
        english: { text: "Test [willpower] (2)." },
        zhCn: { text: "检定[intellect](3)。" },
      },
    ],
    terms,
    memory,
  );

  assert.deepEqual(issues, [
    {
      code: "number-mismatch",
      cardCode: "00001",
      field: "text",
      englishNumbers: ["2"],
      zhCnNumbers: ["3"],
    },
    {
      code: "protected-token-mismatch",
      cardCode: "00001",
      field: "text",
      englishTokens: ["[willpower]"],
      zhCnTokens: ["[intellect]"],
    },
  ]);
});

test("validateTranslations permits reordered numbers and explicit Chinese counters", () => {
  const issues = validateTranslations(
    [
      {
        code: "00004",
        english: { text: "Gain 1 resource, then test [willpower] (2)." },
        zhCn: { text: "检定[willpower](2)，获得1资源并进行额外1次行动。" },
      },
    ],
    terms,
    memory,
  );

  assert.deepEqual(issues, []);
});

test("validateTranslations enforces approved trait terms and translation memory", () => {
  const issues = validateTranslations(
    [
      {
        code: "00002",
        english: { traits: "Monster. Hunter.", text: "Draw 1 card." },
        zhCn: { traits: "怪物. 猎人", text: "抽1张卡。" },
      },
    ],
    terms,
    memory,
  );

  assert.deepEqual(issues, [
    {
      code: "forbidden-term",
      cardCode: "00002",
      field: "traits",
      english: "Hunter",
      forbidden: "猎人",
    },
    {
      code: "memory-mismatch",
      cardCode: "00002",
      field: "text",
      english: "Draw 1 card.",
      expectedZhCn: "抽取1张卡牌。",
      actualZhCn: "抽1张卡。",
    },
    {
      code: "term-mismatch",
      cardCode: "00002",
      field: "traits",
      english: "Hunter",
      expectedZhCn: "猎手",
      actualZhCn: "怪物. 猎人",
    },
  ]);
});

test("validateTranslations can exclude fields inherited from Traditional Chinese", () => {
  const issues = validateTranslations(
    [
      {
        code: "00003",
        english: { traits: "Monster. Hunter." },
        zhCn: { traits: "怪物. 猎人" },
      },
    ],
    terms,
    memory,
    { inheritedFieldsByCode: new Map([["00003", new Set(["traits"]) ]]) },
  );

  assert.deepEqual(issues, []);
});

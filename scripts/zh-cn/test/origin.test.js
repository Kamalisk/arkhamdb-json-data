const assert = require("node:assert/strict");
const test = require("node:test");

const { classifyOrigins } = require("../lib/origin");

test("classifyOrigins identifies Chinese fields inherited unchanged from zh", () => {
  const report = classifyOrigins(
    [
      {
        code: "00001",
        english: { code: "00001", name: "First", text: "Draw a card." },
        zhCn: { code: "00001", name: "第一張", text: "抽取一張卡牌。" },
      },
      {
        code: "00002",
        english: { code: "00002", name: "Second", text: "Draw a card." },
        zhCn: { code: "00002", name: "第二张", text: "抽取1张卡牌。" },
      },
    ],
    new Map([
      ["00001", { code: "00001", name: "第一張", text: "抽取一張卡牌。" }],
      ["00002", { code: "00002", name: "第二張", text: "抽取一張卡牌。" }],
    ]),
  );

  assert.deepEqual(report, {
    cards: [
      {
        code: "00001",
        inheritedFields: ["name", "text"],
        translatedFields: [],
      },
      {
        code: "00002",
        inheritedFields: [],
        translatedFields: ["name", "text"],
      },
    ],
    inheritedFieldCount: 2,
    fullyInheritedCardCount: 1,
  });
});

test("classifyOrigins ignores empty and non-Chinese matching values", () => {
  const report = classifyOrigins(
    [
      {
        code: "00001",
        english: { code: "00001", name: "Name", text: "" },
        zhCn: { code: "00001", name: "XYZ", text: "" },
      },
    ],
    new Map([["00001", { code: "00001", name: "XYZ", text: "" }]]),
  );

  assert.equal(report.inheritedFieldCount, 0);
  assert.equal(report.fullyInheritedCardCount, 0);
});

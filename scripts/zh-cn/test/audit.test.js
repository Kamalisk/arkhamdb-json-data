const assert = require("node:assert/strict");
const test = require("node:test");

const { buildAudit, protectedTokens, renderMarkdown } = require("../lib/audit");

test("buildAudit reports coverage and translation quality issues", () => {
  const alignment = [
    {
      code: "00001",
      status: "translated",
      english: {
        code: "00001",
        pack_code: "core",
        name: "First",
        text: "[action] <b>Fight.</b> Gain 1 resource.",
        traits: "Item.",
      },
      zhCn: {
        code: "00001",
        name: "第一张",
        text: "[action] <b>战斗。</b>获得1个资源。",
      },
    },
    {
      code: "00002",
      status: "translated",
      english: {
        code: "00002",
        pack_code: "core",
        name: "Second",
        text: "[reaction] Draw 1 card.",
      },
      zhCn: {
        code: "00002",
        name: "Second",
        text: "抽取1张卡牌。",
      },
    },
    {
      code: "00003",
      status: "missing",
      english: { code: "00003", pack_code: "next", name: "Third" },
      zhCn: null,
    },
  ];

  const report = buildAudit(alignment);

  assert.deepEqual(report.summary, {
    englishCards: 3,
    translatedCards: 2,
    missingCards: 1,
    cardCoveragePercent: 66.7,
  });
  assert.deepEqual(report.missingCards, [
    { code: "00003", packCode: "next", name: "Third" },
  ]);
  assert.equal(report.fields.traits.missingOnTranslatedCards, 1);
  assert.deepEqual(report.identicalValues, [
    { code: "00002", field: "name", value: "Second" },
  ]);
  assert.deepEqual(report.protectedTokenMismatches, [
    {
      code: "00002",
      field: "text",
      englishTokens: ["[reaction]"],
      zhCnTokens: [],
    },
  ]);
});

test("renderMarkdown creates a stable pack summary", () => {
  const report = buildAudit([
    {
      code: "00002",
      status: "missing",
      english: { code: "00002", pack_code: "b", name: "B" },
      zhCn: null,
    },
    {
      code: "00001",
      status: "translated",
      english: { code: "00001", pack_code: "a", name: "A" },
      zhCn: { code: "00001", name: "甲" },
    },
  ]);

  const markdown = renderMarkdown(report);
  assert.match(markdown, /\| a \| 1 \| 1 \| 100\.0% \|/);
  assert.match(markdown, /\| b \| 1 \| 0 \| 0\.0% \|/);
  assert.ok(markdown.indexOf("| a |") < markdown.indexOf("| b |"));
});

test("protectedTokens ignores translated double-bracket references and normalizes fast", () => {
  assert.deepEqual(
    protectedTokens("[[Tome]] [fast] [action] <b>Ready</b>"),
    ["</b>", "<b>", "[action]", "[free]"],
  );
});

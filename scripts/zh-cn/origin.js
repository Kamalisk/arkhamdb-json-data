#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const { alignCorpora, loadCards } = require("./lib/corpus");
const { classifyOrigins } = require("./lib/origin");

function renderMarkdown(report) {
  const inheritedCards = report.cards.filter(({ inheritedFields }) => inheritedFields.length > 0);
  const partialCards = inheritedCards.filter(({ translatedFields }) => translatedFields.length > 0);
  const lines = [
    "# Simplified Chinese Translation Origin Audit",
    "",
    "A field is marked inherited when its `zh-cn` value exactly equals the corresponding `zh` value and contains Chinese text. This identifies source origin, not necessarily a remaining Traditional Chinese character.",
    "",
    `- Cards with one or more inherited fields: ${inheritedCards.length}`,
    `- Fully inherited cards: ${report.fullyInheritedCardCount}`,
    `- Partially inherited cards: ${partialCards.length}`,
    `- Inherited fields: ${report.inheritedFieldCount}`,
    "",
    "## Cards Requiring Review",
    "",
    "| Code | Inherited Fields | Locally Changed Fields |",
    "| --- | --- | --- |",
  ];

  for (const card of inheritedCards) {
    lines.push(
      `| ${card.code} | ${card.inheritedFields.join(", ")} | ${card.translatedFields.join(", ")} |`,
    );
  }
  return `${lines.join("\n")}\n`;
}

const root = path.resolve(__dirname, "../..");
const english = loadCards(path.join(root, "pack"));
const zhCn = loadCards(path.join(root, "translations/zh-cn/pack"));
const zh = loadCards(path.join(root, "translations/zh/pack"), {
  // `books.json` is an obsolete aggregate that conflicts with individual promo files.
  excludedRelativePaths: ["promo/books.json"],
});
const report = classifyOrigins(alignCorpora(english, zhCn), zh);
const reportDir = path.join(root, "reports/zh-cn");

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(
  path.join(reportDir, "origin-audit.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
fs.writeFileSync(path.join(reportDir, "origin-audit.md"), renderMarkdown(report));

console.log(
  `zh-cn inherited origin: ${report.fullyInheritedCardCount} full cards, ${report.inheritedFieldCount} fields`,
);

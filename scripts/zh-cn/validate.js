#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const { alignCorpora, loadCards } = require("./lib/corpus");
const { classifyOrigins } = require("./lib/origin");
const { validateTranslations } = require("./lib/validate");

function summarize(issues) {
  const counts = new Map();
  for (const issue of issues) counts.set(issue.code, (counts.get(issue.code) || 0) + 1);
  return [...counts]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([code, count]) => ({ code, count }));
}

function renderMarkdown(issues) {
  const lines = [
    "# Simplified Chinese Translation Validation",
    "",
    "This report excludes fields copied unchanged from `translations/zh`, which are tracked separately by the origin audit.",
    "",
    `Review findings: ${issues.length}`,
    "",
    "| Finding | Count |",
    "| --- | ---: |",
  ];

  for (const { code, count } of summarize(issues)) lines.push(`| ${code} | ${count} |`);
  return `${lines.join("\n")}\n`;
}

const root = path.resolve(__dirname, "../..");
const english = loadCards(path.join(root, "pack"));
const zhCn = loadCards(path.join(root, "translations/zh-cn/pack"));
const zh = loadCards(path.join(root, "translations/zh/pack"), {
  excludedRelativePaths: ["promo/books.json"],
});
const alignment = alignCorpora(english, zhCn);
const origin = classifyOrigins(alignment, zh);
const inheritedFieldsByCode = new Map(
  origin.cards.map(({ code, inheritedFields }) => [code, new Set(inheritedFields)]),
);
const { terms } = require(path.join(root, "translations/zh-cn/termbase.json"));
const { entries } = require(path.join(root, "translations/zh-cn/translation-memory.json"));
const issues = validateTranslations(alignment, terms, entries, { inheritedFieldsByCode });
const reportDir = path.join(root, "reports/zh-cn");

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(
  path.join(reportDir, "validation.json"),
  `${JSON.stringify({ summary: summarize(issues), issues }, null, 2)}\n`,
);
fs.writeFileSync(path.join(reportDir, "validation.md"), renderMarkdown(issues));

console.log(`zh-cn validation review findings: ${issues.length}`);

#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const { buildCandidateReport, selectConflictContexts } = require("./lib/candidates");
const { alignCorpora, loadCards } = require("./lib/corpus");
const { classifyOrigins } = require("./lib/origin");

function renderConflicts(report) {
  const lines = [
    "# Simplified Chinese Terminology Conflicts",
    "",
    `Candidate pairs: ${report.candidates.length}`,
    `Conflicts: ${report.conflicts.length}`,
    "",
  ];

  for (const conflict of report.conflicts) {
    if (conflict.code === "one-english-many-zh-cn") {
      lines.push(`- English \`${conflict.english}\` maps to: ${conflict.zhCn.join("; ")}`);
    } else {
      lines.push(`- Simplified Chinese \`${conflict.zhCn}\` maps to: ${conflict.english.join("; ")}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function renderConflictContexts(contexts) {
  const lines = [
    "# Simplified Chinese Terminology Conflict Context",
    "",
    "Each example preserves the original complete field value. Examples are limited to eight per conflict; use `term-candidates.json` for all card and field references.",
    "",
  ];

  for (const { conflict, examples } of contexts) {
    const title =
      conflict.code === "one-english-many-zh-cn"
        ? `English: ${conflict.english} -> ${conflict.zhCn.join(" / ")}`
        : `Simplified Chinese: ${conflict.zhCn} -> ${conflict.english.join(" / ")}`;
    lines.push(`## ${title}`, "");
    for (const example of examples) {
      lines.push(`### ${example.code} (${example.field})`, "", "**English**", "", "```text", example.englishContext, "```", "", "**zh-cn**", "", "```text", example.zhCnContext, "```", "");
    }
  }
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
const report = buildCandidateReport(alignment, inheritedFieldsByCode);
const contexts = selectConflictContexts(report, alignment);
const reportDir = path.join(root, "reports/zh-cn");

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(
  path.join(reportDir, "term-candidates.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
fs.writeFileSync(path.join(reportDir, "term-conflicts.md"), renderConflicts(report));
fs.writeFileSync(
  path.join(reportDir, "term-conflict-context.md"),
  renderConflictContexts(contexts),
);

console.log(
  `zh-cn terminology candidates: ${report.candidates.length}, conflicts: ${report.conflicts.length}`,
);

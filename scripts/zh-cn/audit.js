#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const { buildAudit, renderMarkdown } = require("./lib/audit");
const { alignCorpora, loadCards } = require("./lib/corpus");

const root = path.resolve(__dirname, "../..");
const english = loadCards(path.join(root, "pack"));
const zhCn = loadCards(path.join(root, "translations/zh-cn/pack"));
const report = buildAudit(alignCorpora(english, zhCn));
const reportDir = path.join(root, "reports/zh-cn");

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(
  path.join(reportDir, "coverage.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
fs.writeFileSync(path.join(reportDir, "coverage.md"), renderMarkdown(report));

console.log(
  `zh-cn coverage: ${report.summary.translatedCards}/${report.summary.englishCards} (${report.summary.cardCoveragePercent.toFixed(1)}%)`,
);

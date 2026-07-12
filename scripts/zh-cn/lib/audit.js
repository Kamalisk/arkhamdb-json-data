const TRANSLATABLE_FIELDS = [
  "name",
  "subname",
  "text",
  "back_name",
  "back_text",
  "traits",
  "back_traits",
  "flavor",
  "back_flavor",
  "customization_text",
];

const TEXT_FIELDS = new Set([
  "text",
  "back_text",
  "flavor",
  "back_flavor",
  "customization_text",
]);

function present(value) {
  return typeof value === "string" && value.trim() !== "";
}

function protectedTokens(value) {
  if (!present(value)) return [];
  return [...value.matchAll(/(?<!\[)\[[a-z0-9_]+\](?!\])|<\/?[a-z][^>]*>/g)]
    .map(([token]) => (token.toLowerCase() === "[fast]" ? "[free]" : token))
    .sort();
}

function buildAudit(alignment) {
  const translatedCards = alignment.filter(({ zhCn }) => zhCn).length;
  const summary = {
    englishCards: alignment.length,
    translatedCards,
    missingCards: alignment.length - translatedCards,
    cardCoveragePercent: Number(
      ((translatedCards / Math.max(alignment.length, 1)) * 100).toFixed(1),
    ),
  };
  const fields = Object.fromEntries(
    TRANSLATABLE_FIELDS.map((field) => [
      field,
      {
        englishValues: 0,
        translatedValues: 0,
        missingWithCard: 0,
        missingOnTranslatedCards: 0,
      },
    ]),
  );
  const packs = new Map();
  const missingCards = [];
  const identicalValues = [];
  const protectedTokenMismatches = [];

  for (const entry of alignment) {
    const packCode = entry.english.pack_code || "unknown";
    const pack = packs.get(packCode) || { englishCards: 0, translatedCards: 0 };
    pack.englishCards += 1;
    if (entry.zhCn) pack.translatedCards += 1;
    packs.set(packCode, pack);

    if (!entry.zhCn) {
      missingCards.push({
        code: entry.code,
        packCode,
        name: entry.english.name || "",
      });
    }

    for (const field of TRANSLATABLE_FIELDS) {
      const englishValue = entry.english[field];
      if (!present(englishValue)) continue;
      fields[field].englishValues += 1;

      if (!entry.zhCn) {
        fields[field].missingWithCard += 1;
        continue;
      }

      const chineseValue = entry.zhCn[field];
      if (!present(chineseValue)) {
        fields[field].missingOnTranslatedCards += 1;
        continue;
      }

      fields[field].translatedValues += 1;
      if (englishValue === chineseValue) {
        identicalValues.push({ code: entry.code, field, value: englishValue });
      }

      if (TEXT_FIELDS.has(field)) {
        const englishTokens = protectedTokens(englishValue);
        const zhCnTokens = protectedTokens(chineseValue);
        if (JSON.stringify(englishTokens) !== JSON.stringify(zhCnTokens)) {
          protectedTokenMismatches.push({
            code: entry.code,
            field,
            englishTokens,
            zhCnTokens,
          });
        }
      }
    }
  }

  const packCoverage = [...packs]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([packCode, counts]) => ({
      packCode,
      ...counts,
      coveragePercent: Number(
        ((counts.translatedCards / counts.englishCards) * 100).toFixed(1),
      ),
    }));

  return {
    summary,
    packCoverage,
    fields,
    missingCards,
    identicalValues,
    protectedTokenMismatches,
  };
}

function renderMarkdown(report) {
  const lines = [
    "# Simplified Chinese Card Data Audit",
    "",
    `English records: ${report.summary.englishCards}`,
    `Translated records: ${report.summary.translatedCards}`,
    `Missing records: ${report.summary.missingCards}`,
    `Coverage: ${report.summary.cardCoveragePercent.toFixed(1)}%`,
    "",
    "## Pack Coverage",
    "",
    "| Pack | English | Translated | Coverage |",
    "| --- | ---: | ---: | ---: |",
  ];

  for (const pack of report.packCoverage) {
    lines.push(
      `| ${pack.packCode} | ${pack.englishCards} | ${pack.translatedCards} | ${pack.coveragePercent.toFixed(1)}% |`,
    );
  }

  lines.push(
    "",
    "## Quality Signals",
    "",
    `- English-identical translated values: ${report.identicalValues.length}`,
    `- Protected-token mismatches: ${report.protectedTokenMismatches.length}`,
    "",
  );
  return `${lines.join("\n")}\n`;
}

module.exports = { buildAudit, protectedTokens, renderMarkdown };

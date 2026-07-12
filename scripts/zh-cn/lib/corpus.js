const fs = require("node:fs");
const path = require("node:path");

function jsonFiles(rootDir) {
  const result = [];

  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) result.push(...jsonFiles(entryPath));
    else if (entry.name.endsWith(".json")) result.push(entryPath);
  }

  return result.sort();
}

function loadCards(rootDir, { excludedRelativePaths = [] } = {}) {
  const cards = new Map();
  const excluded = new Set(excludedRelativePaths);

  for (const file of jsonFiles(rootDir)) {
    if (excluded.has(path.relative(rootDir, file))) continue;
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!Array.isArray(data)) continue;

    for (const card of data) {
      if (!card || typeof card.code !== "string") continue;

      const existing = cards.get(card.code);
      if (existing) {
        if (JSON.stringify(existing) === JSON.stringify(card)) continue;
        throw new Error(`Duplicate card code ${card.code} has conflicting data`);
      }
      cards.set(card.code, card);
    }
  }

  return new Map([...cards].sort(([left], [right]) => left.localeCompare(right)));
}

function alignCorpora(english, zhCn) {
  return [...english.keys()].sort().map((code) => {
    const translated = zhCn.get(code) || null;
    return {
      code,
      english: english.get(code),
      zhCn: translated,
      status: translated ? "translated" : "missing",
    };
  });
}

module.exports = { alignCorpora, loadCards };

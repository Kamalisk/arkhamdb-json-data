function activeEntries(entries) {
  return entries.filter((entry) => entry.status === "approved");
}

function sortedUnique(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function validateMemory(entries) {
  const issues = [];
  const englishToEntries = new Map();

  for (const entry of activeEntries(entries)) {
    const english = entry.english.trim();
    englishToEntries.set(english, [...(englishToEntries.get(english) || []), entry]);
  }

  for (const [english, matchingEntries] of englishToEntries) {
    const zhCn = sortedUnique(matchingEntries.map((entry) => entry.zhCn));
    if (zhCn.length > 1) issues.push({ code: "duplicate-english", english, zhCn });
  }

  return issues.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function lookupMemory(english, entries) {
  return activeEntries(entries).find((entry) => entry.english === english);
}

module.exports = { lookupMemory, validateMemory };

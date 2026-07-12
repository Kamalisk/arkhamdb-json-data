function activeTerms(entries) {
  return entries.filter((entry) => entry.status === "approved");
}

function sortedUnique(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function validateTermbase(entries) {
  const issues = [];
  const englishToTerms = new Map();
  const chineseToTerms = new Map();

  for (const term of activeTerms(entries)) {
    const english = term.english.trim().toLocaleLowerCase("en-US");
    const chinese = term.zhCn.trim();
    englishToTerms.set(english, [...(englishToTerms.get(english) || []), term]);
    chineseToTerms.set(chinese, [...(chineseToTerms.get(chinese) || []), term]);
  }

  for (const [english, terms] of englishToTerms) {
    const values = sortedUnique(terms.map((term) => term.zhCn));
    if (values.length > 1 && !terms.some((term) => term.exception)) {
      issues.push({ code: "duplicate-english", english, zhCn: values });
    }
  }

  for (const [zhCn, terms] of chineseToTerms) {
    const values = sortedUnique(terms.map((term) => term.english));
    if (values.length > 1 && !terms.some((term) => term.exception)) {
      issues.push({ code: "duplicate-zh-cn", english: values, zhCn });
    }
  }

  return issues.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function overlaps(candidate, selected) {
  return selected.some(
    (match) => candidate.start < match.end && match.start < candidate.end,
  );
}

function matchTerms(text, entries) {
  const candidates = [];
  const terms = activeTerms(entries)
    .slice()
    .sort((left, right) => right.english.length - left.english.length);

  for (const term of terms) {
    const expression = new RegExp(`\\b${escapeRegExp(term.english)}\\b`, "gi");
    for (const match of text.matchAll(expression)) {
      candidates.push({
        english: term.english,
        zhCn: term.zhCn,
        start: match.index,
        end: match.index + match[0].length,
        aliases: term.aliases || [],
      });
    }
  }

  const selected = [];
  for (const candidate of candidates.sort((left, right) => left.start - right.start || right.end - left.end)) {
    if (!overlaps(candidate, selected)) selected.push(candidate);
  }
  return selected.sort((left, right) => left.start - right.start);
}

module.exports = { matchTerms, validateTermbase };

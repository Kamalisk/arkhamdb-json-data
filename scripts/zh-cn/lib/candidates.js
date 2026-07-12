function splitTraits(value) {
  if (typeof value !== "string") return [];
  return value
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeRuleLabel(value) {
  const label = value
    .replace(/&rarr;/gi, "→")
    .replace(/\u00a0/g, " ")
    .trim();
  const conclusion = label.match(/→\s*(?:结局\s*)?(R?\d+)/i);
  if (conclusion) {
    const identifier = conclusion[1];
    return identifier.startsWith("R")
      ? `→${identifier.toUpperCase()}`
      : `→结局${identifier}`;
  }
  if (/^结局\s*\d+$/u.test(label)) return `→${label.replace(/\s/g, "")}`;
  return label.replace(/[.:：。]+$/u, "").trim();
}

function boldLabels(value) {
  if (typeof value !== "string") return [];
  return [...value.matchAll(/<b>([^<]+)<\/b>/gi)]
    .map(([, label]) => normalizeRuleLabel(label))
    .filter(Boolean);
}

function addCandidate(candidates, english, zhCn, category, example) {
  if (!english || !zhCn || english === zhCn) return;
  const key = `${category}\u0000${english}\u0000${zhCn}`;
  const candidate = candidates.get(key) || {
    english,
    zhCn,
    category,
    occurrences: 0,
    examples: [],
  };
  candidate.occurrences += 1;
  candidate.examples.push(example);
  candidates.set(key, candidate);
}

function pairedValues(english, zhCn, extractor, category, entry, candidates, field) {
  const englishValues = extractor(english);
  const chineseValues = extractor(zhCn);
  if (englishValues.length !== chineseValues.length) return;

  for (let index = 0; index < englishValues.length; index += 1) {
    addCandidate(
      candidates,
      englishValues[index],
      chineseValues[index],
      category,
      { code: entry.code, field },
    );
  }
}

function buildConflicts(candidates) {
  const englishToChinese = new Map();
  const chineseToEnglish = new Map();

  for (const candidate of candidates) {
    englishToChinese.set(candidate.english, [
      ...(englishToChinese.get(candidate.english) || []),
      candidate.zhCn,
    ]);
    chineseToEnglish.set(candidate.zhCn, [
      ...(chineseToEnglish.get(candidate.zhCn) || []),
      candidate.english,
    ]);
  }

  const conflicts = [];
  for (const [english, chinese] of englishToChinese) {
    const values = [...new Set(chinese)].sort();
    if (values.length > 1) {
      conflicts.push({ code: "one-english-many-zh-cn", english, zhCn: values });
    }
  }
  for (const [zhCn, english] of chineseToEnglish) {
    const values = [...new Set(english)].sort();
    if (values.length > 1) {
      conflicts.push({ code: "one-zh-cn-many-english", english: values, zhCn });
    }
  }
  return conflicts.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function buildCandidateReport(alignment, inheritedFieldsByCode = new Map()) {
  const candidates = new Map();

  for (const entry of alignment) {
    if (!entry.zhCn) continue;
    const inheritedFields = inheritedFieldsByCode.get(entry.code) || new Set();
    if (!inheritedFields.has("traits")) {
      pairedValues(
        entry.english.traits,
        entry.zhCn.traits,
        splitTraits,
        "trait",
        entry,
        candidates,
        "traits",
      );
    }
    for (const field of ["text", "back_text"]) {
      if (inheritedFields.has(field)) continue;
      pairedValues(
        entry.english[field],
        entry.zhCn[field],
        boldLabels,
        "rule-label",
        entry,
        candidates,
        field,
      );
    }
  }

  const result = [...candidates.values()]
    .map((candidate) => ({
      ...candidate,
      examples: candidate.examples.sort(
        (left, right) => left.code.localeCompare(right.code) || left.field.localeCompare(right.field),
      ),
    }))
    .sort(
      (left, right) =>
        left.english.localeCompare(right.english) ||
        left.zhCn.localeCompare(right.zhCn) ||
        left.category.localeCompare(right.category),
    );

  return { candidates: result, conflicts: buildConflicts(result) };
}

function candidateMatchesConflict(candidate, conflict) {
  if (conflict.code === "one-english-many-zh-cn") {
    return candidate.english === conflict.english && conflict.zhCn.includes(candidate.zhCn);
  }
  return candidate.zhCn === conflict.zhCn && conflict.english.includes(candidate.english);
}

function selectConflictContexts(report, alignment, maxExamples = 8) {
  const cardsByCode = new Map(alignment.map((entry) => [entry.code, entry]));

  return report.conflicts.map((conflict) => {
    const examples = [];
    const seen = new Set();
    const conflictingCandidates = report.candidates.filter((candidate) =>
      candidateMatchesConflict(candidate, conflict),
    );
    const candidateExamples = conflictingCandidates
      .flatMap((candidate) => candidate.examples)
      .sort(
        (left, right) =>
          left.code.localeCompare(right.code) || left.field.localeCompare(right.field),
      );

    // Reserve one context for each competing mapping so a frequent normal form
    // cannot hide a rare, potentially incorrect form.
    const representativeExamples = conflictingCandidates
      .map((candidate) => candidate.examples[0])
      .sort(
        (left, right) =>
          left.code.localeCompare(right.code) || left.field.localeCompare(right.field),
      );

    for (const example of [...representativeExamples, ...candidateExamples]) {
      const key = `${example.code}\u0000${example.field}`;
      if (seen.has(key) || examples.length >= maxExamples) continue;
      const card = cardsByCode.get(example.code);
      if (!card || !card.zhCn) continue;
      seen.add(key);
      examples.push({
        code: example.code,
        field: example.field,
        englishContext: card.english[example.field],
        zhCnContext: card.zhCn[example.field],
      });
    }
    return { conflict, examples };
  });
}

module.exports = { buildCandidateReport, normalizeRuleLabel, selectConflictContexts };

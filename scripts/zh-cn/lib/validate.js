const { protectedTokens } = require("./audit");
const { lookupMemory } = require("./memory");

const VALIDATED_FIELDS = [
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

const RULES_TEXT_FIELDS = new Set([
  "text",
  "back_text",
  "customization_text",
]);

function present(value) {
  return typeof value === "string" && value.trim() !== "";
}

function numbers(value) {
  return [...value.matchAll(/\d+(?:\.\d+)?/g)].map(([number]) => number);
}

function numbersIncluded(englishNumbers, zhCnNumbers) {
  const available = new Map();
  for (const number of zhCnNumbers) {
    available.set(number, (available.get(number) || 0) + 1);
  }
  for (const number of englishNumbers) {
    const count = available.get(number) || 0;
    if (count === 0) return false;
    available.set(number, count - 1);
  }
  return true;
}

function splitTraits(value) {
  return value
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);
}

function activeTraitTerms(terms) {
  return terms.filter((term) => term.status === "approved" && term.category === "trait");
}

function validateTraitTerms(issues, cardCode, field, english, zhCn, terms) {
  const englishTraits = new Set(splitTraits(english).map((trait) => trait.toLocaleLowerCase("en-US")));
  const zhCnTraits = new Set(splitTraits(zhCn));

  for (const term of activeTraitTerms(terms)) {
    if (!englishTraits.has(term.english.toLocaleLowerCase("en-US"))) continue;
    if (!zhCnTraits.has(term.zhCn)) {
      issues.push({
        code: "term-mismatch",
        cardCode,
        field,
        english: term.english,
        expectedZhCn: term.zhCn,
        actualZhCn: zhCn,
      });
    }
    for (const forbidden of term.forbidden || []) {
      if (!zhCnTraits.has(forbidden)) continue;
      issues.push({
        code: "forbidden-term",
        cardCode,
        field,
        english: term.english,
        forbidden,
      });
    }
  }
}

function validateTranslations(alignment, terms, memory, options = {}) {
  const issues = [];
  const inheritedFieldsByCode = options.inheritedFieldsByCode || new Map();

  for (const entry of alignment) {
    if (!entry.zhCn) continue;
    const inheritedFields = inheritedFieldsByCode.get(entry.code) || new Set();
    for (const field of VALIDATED_FIELDS) {
      if (inheritedFields.has(field)) continue;
      const english = entry.english[field];
      const zhCn = entry.zhCn[field];
      if (!present(english) || !present(zhCn)) continue;

      if (RULES_TEXT_FIELDS.has(field)) {
        const englishTokens = protectedTokens(english);
        const zhCnTokens = protectedTokens(zhCn);
        if (JSON.stringify(englishTokens) !== JSON.stringify(zhCnTokens)) {
          issues.push({
            code: "protected-token-mismatch",
            cardCode: entry.code,
            field,
            englishTokens,
            zhCnTokens,
          });
        }

        const englishNumbers = numbers(english);
        const zhCnNumbers = numbers(zhCn);
        if (!numbersIncluded(englishNumbers, zhCnNumbers)) {
          issues.push({
            code: "number-mismatch",
            cardCode: entry.code,
            field,
            englishNumbers,
            zhCnNumbers,
          });
        }
      }

      const memoryEntry = lookupMemory(english, memory);
      if (memoryEntry && zhCn !== memoryEntry.zhCn) {
        issues.push({
          code: "memory-mismatch",
          cardCode: entry.code,
          field,
          english,
          expectedZhCn: memoryEntry.zhCn,
          actualZhCn: zhCn,
        });
      }

      if (field === "traits" || field === "back_traits") {
        validateTraitTerms(issues, entry.code, field, english, zhCn, terms);
      }
    }
  }

  return issues.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

module.exports = { VALIDATED_FIELDS, validateTranslations };

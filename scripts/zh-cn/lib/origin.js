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

function hasChinese(value) {
  return typeof value === "string" && /[\u3400-\u9fff]/u.test(value);
}

function present(value) {
  return typeof value === "string" && value.trim() !== "";
}

function classifyOrigins(alignment, zh) {
  let inheritedFieldCount = 0;
  let fullyInheritedCardCount = 0;
  const cards = [];

  for (const entry of alignment) {
    if (!entry.zhCn) continue;
    const traditional = zh.get(entry.code);
    const inheritedFields = [];
    const translatedFields = [];

    for (const field of TRANSLATABLE_FIELDS) {
      const simplifiedValue = entry.zhCn[field];
      if (!present(simplifiedValue)) continue;

      if (traditional && simplifiedValue === traditional[field] && hasChinese(simplifiedValue)) {
        inheritedFields.push(field);
        inheritedFieldCount += 1;
      } else {
        translatedFields.push(field);
      }
    }

    if (inheritedFields.length > 0 && translatedFields.length === 0) {
      fullyInheritedCardCount += 1;
    }
    cards.push({ code: entry.code, inheritedFields, translatedFields });
  }

  return { cards, inheritedFieldCount, fullyInheritedCardCount };
}

module.exports = { classifyOrigins };

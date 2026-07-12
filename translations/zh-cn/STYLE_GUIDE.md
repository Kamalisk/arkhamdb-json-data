# Arkham Horror LCG Simplified Chinese Style Guide

## Scope

This guide governs `translations/zh-cn`. English `pack/` data defines rules
meaning and card structure; `translations/zh` is a research source only and
must not be copied without Simplified Chinese review.

## Terminology

- Use `termbase.json` for approved terminology.
- Reuse an exact approved entry in `translation-memory.json` when its English
  source text matches a field exactly.
- Do not introduce a second translation for an approved game term.
- Add a scoped exception only when one English spelling genuinely represents
  separate game concepts in separate contexts.
- `Circle` is an approved exception: the trait is `圆环`, while the named
  The Circle Undone scenario action is `阵法`.

## Rules Text

- Preserve every game symbol, tag, card reference, number, and variable:
  `[action]`, `[elder_sign]`, `[[Trait]]`, `<b>`, `<i>`, `X`, and `[per_investigator]`.
- Preserve the rules meaning of `may`, `must`, `cannot`, timing conditions,
  limits, targets, and replacement effects.
- Use the approved labels: `强制`, `显现`, `目标`, `调查`, and `躲避`.
- Translate conclusion references semantically as `结局N`. Formatting may
  follow the local card context, including `(→<b>结局N</b>)` and
  `<b>(→结局N)</b>`.

## Deckbuilding Text

Use these exact labels:

- `牌库卡牌张数`
- `牌库构建选项`
- `牌库构建需求`
- `额外冒险设置`

Use `第一日`、`第二日`、`第三日` for numbered campaign days.

## Typography And Names

- Use Simplified Chinese characters; do not leave Traditional Chinese forms in
  localized fields unless the character is shared by both scripts.
- Preserve card names and proper nouns through the termbase or an established
  card translation. Do not transliterate the same name differently elsewhere.
- Keep English words only when the English source intentionally displays them;
  untranslated card rules text is an error.
- Keep punctuation and spacing coherent with the surrounding localized card.

## Review Checklist

For every changed card, compare English and Simplified Chinese fields directly:

1. Card code, numeric values, symbols, tags, and markup match.
2. Labels and traits use approved terminology.
3. Timing, action type, test skill, and outcome have not changed.
4. The field contains no unintended English or Traditional Chinese residue.
5. Run the translation regression tests and regenerate the audit reports.
6. Run `npm run validate:zh-cn`; review findings are a queue, while inherited
   Traditional Chinese fields remain tracked by `npm run origin:zh-cn`.

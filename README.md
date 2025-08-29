ArkhamDB cards JSON data
=========

The goal of this repository is to store [ArkhamDB](https://Arkhamdb.com) card data in a format that can be easily updated by multiple people and their changes reviewed.

## Data schemas

JSON schema definitions of the different object types can be found in the `./schema` folder. A tool such as [JSON Schema Viewer](https://json-schema.app) can be used to visualize these schemas.

## JSON text editing tips

Full description of (very simple) JSON format can be found [here](http://www.json.org/), below there are a few tips most relevant to editing this repository.

#### Non-ASCII symbols

When symbols outside the regular [ASCII range](https://en.wikipedia.org/wiki/ASCII#ASCII_printable_code_chart) are needed, UTF-8 symbols come in play. These need to be escaped using `\u<4 letter hexcode>`.

To get the 4-letter hexcode of a UTF-8 symbol (or look up what a particular hexcode represents), you can use a UTF-8 converter, such as [this online tool](http://www.ltg.ed.ac.uk/~richard/utf-8.cgi).

#### Quotes and breaking text into multiple lines

To have text spanning multiple lines, use `\n` to separate them. To have quotes as part of the text, use `\"`.  For example, `"flavor": "\"Winter is Fghghghghfhgh.\"\n-Eddard Stark"` results in following flavor text:

> *"Winter is Fghghghghfhgh."*  
> *-Eddard Stark*

#### Arkham LCG Game Symbols

These can be used in a card's `text` section.

* `[reaction]`
* `[action]`
* `[free]`
* `[elder_sign]`
* `[skull]`
* `[cultist]`
* `[tablet]`
* `[elder_thing]`
* `[auto_fail]`
* `[curse]`
* `[bless]`
* `[willpower]`
* `[intellect]`
* `[combat]`
* `[agility]`
* `[wild]`
* `[mystic]`
* `[rogue]`
* `[seeker]`
* `[survivor]`
* `[guardian]`
* `[neutral]`
* `[health]`
* `[sanity]`
* `[per_investigator]`
* `[frost]`
* `[seal_a]`
* `[seal_b]`
* `[seal_c]`
* `[seal_d]`
* `[seal_e]`

#### Card tags

Some cards have a `tags` fields that is used to relate these cards to certain deckbuilding rules that are otherwise too hard to parse. When new content is released, `tags` need to be reflected on added cards.

The available tags are:
- `hh` => _Heals horror_, used for Carolyn Fern.
- `hd` => _Heals damage_, used for Vincent Lee.
- `pa` => _Parley_, used for Alessandra Zorzi.
- `se` => _Seals token_, used for ||Father Mateo.
- `fa` => _Firearm in card text_, used for Michael McGlen.

These tags have been used in the past but are unused right now:
- `st` => _Spell trait_, used to mark whether a card had bonded spells for Marie Lambeau, which is no longer relevant, but still part of the deckbuilding rules.

## Numerical values

Numerical values in the game can sometimes contain symbols such as `-` or `X`. Historically, consumers of this data expect these values to be `number | null`, so we have to use an enumeration to represent special characters. The following mappings are defined:
- `0` and higher: literal integers.
- `null`: `-`
- `X`: `-2`
- `*`: `-3`
- `?`: `-4`

#### Translations

To merge new changes in default language in all locales, run the CoffeeScript script `update_locales`.

Pre-requisites:
 * `node` and `npm` installed
 * `npm -g install coffee-script`

Usage: `coffee update_locales.coffee`

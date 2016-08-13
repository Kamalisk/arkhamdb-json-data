ArkhamDB cards JSON data
=========

The goal of this repository is to store [ArkhamDB](https://Arkhamdb.com) card data in a format that can be easily updated by multiple people and their changes reviewed.


#### Cycle schema

* **code** - identifier of the cycle. One single lowercase word. Examples: `"core"`, `"westeros"`, `"war"`.
* **name** - properly formatted name of the cycle. Examples: `"Core Set"`, `"Westeros Cycle"`, `"War of the Five Kings Cycle"`.
* **position** - number of the cycle, counting in chronological order. For packs released outside of normal constructed play cycles (such as draft packs), the special cycle with position `0` should be used. Examples: `1` for Core Set, `4` for War of the Five Kings Cycle.
* **size** - number of packs in the cycle. Examples: `1` for big boxes, `6` for regular chapter pack cycles.

#### Pack schema

* **code** - identifier of the pack. The acronym of the pack name, with matching case, except for Core Set. Examples: `"Core"` for Core Set, `"TKP"` for The King's Peace, `"WotN"` for Wolves of the North.
* **cycle_code** - identifier of the cycle the pack belongs to. Must refer to one of the values from cycles' `"code"`. Examples: `"core"` for Core Set, `"westeros"` for Westeros Cycle.
* **name** - properly formatted name of the pack. Examples: `"Core Set"`, `"Wolves of the North"`, `"The King's Peace"`.
* **position** - number of the pack within the cycle. Examples: `1` for Core Set, `1` for Taking the Black from Westeros Cycle, `3` for For Family Honor from War of the Five Kings Cycle.
* **released** - date when the pack was officially released by FFG. When in doubt, look at the date of the pack release news on FFG's news page. Format of the date is YYYY-MM-DD. May be `null` - this value is used when the date is unknown. Examples: `"2015-10-08"` for Core Set, `"2015-12-09"` for Taking the Black, `null` for unreleased previewed packs.
* **size** - number of different cards in the pack. May be `null` - this value is used when the pack is just an organizational entity, not a physical pack.  Examples: `120` for Core Set, `55` for most deluxe expansions, `20` for most chapter packs, `null` for assorted draft cards.

#### Card schema

* agility - Agility value of investigator or number of Agility icons for use in skill checks
* **code** - 5 digit card identifier. Consists of two zero-padded numbers: first two digits are the cycle position, last three are position of the card within the cycle (printed on the card).
* cost - Play cost of the card. Relevant for all cards except agendas and titles. May be `null` - this value is used when the card has a special, possibly variable, cost.
* **deck_limit**
* deck_options - Investigator only - Special string describing the card options for an investigator. e.g. "faction:guardian:0:5" 
* deck_requirements - Investigator only - Special string describing the card requirements for an investigator. e.g. "size:30" "card:01007" "random:subtype:basicweakness"
* **faction_code**
* flavor
* health - Health of Investigator or Ally Asset
* illustrator
* **is_unique**
* lore - Lore value of investigator or number of Lore icons for use in skill checks
* **name**
* octgn_id
* **pack_code**
* **position**
* **quantity**
* restrictions - Special string describing what decks this is restricted to e.g. investigaor:01001 will limit it to investigator with id 01001
* sanity - Sanity of Investigator or Ally Asset
* slot - Asset only - Which item slot it takes up, 1-Handed, 2-Handed, Amulet, Arcane, Ally
* strength - Strength value of investigator or number of Strength icons for use in skill checks
* subtype_code - Subtype of card, e.g. basicweakness or weakness.
* text
* traits
* **type_code** - Type of the card. Possible values: `"asset"`, `"event"`, `"skill"`, `"treachery"`, `"investigator"`
* wild - Number of wild icons for use in skill checks
* will - Will value of investigator or number of Will icons for use in skill checks

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
* `[lightning]`
* `[eldersign]`
* `[will]`
* `[lore]`
* `[strength]`
* `[agility]`
* `[health]`
* `[sanity]`

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../../..");

function card(relativePath, code) {
  const cards = JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
  return cards.find((entry) => entry.code === code);
}

function packJsonFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return packJsonFiles(file);
    return entry.isFile() && entry.name.endsWith(".json") ? [file] : [];
  });
}

test("Simplified Chinese entries retain every populated English text field", () => {
  const fields = [
    "name",
    "subname",
    "text",
    "traits",
    "flavor",
    "back_name",
    "back_subname",
    "back_text",
    "back_flavor",
  ];
  const missing = [];

  for (const sourcePath of packJsonFiles(path.join(root, "pack"))) {
    const relativePath = path.relative(path.join(root, "pack"), sourcePath);
    const translationPath = path.join(root, "translations/zh-cn/pack", relativePath);
    if (!fs.existsSync(translationPath)) continue;

    const sourceCards = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
    const translatedCards = JSON.parse(fs.readFileSync(translationPath, "utf8"));
    const translatedByCode = new Map(translatedCards.map((entry) => [String(entry.code), entry]));

    for (const sourceCard of sourceCards) {
      const translatedCard = translatedByCode.get(String(sourceCard.code));
      if (!translatedCard) continue;
      for (const field of fields) {
        if (sourceCard[field] && !translatedCard[field]) {
          missing.push(`${relativePath}:${sourceCard.code}.${field}`);
        }
      }
    }
  }

  assert.deepEqual(missing, []);
});

test("Dunwich scenario subtitles preserve their italic markup", () => {
  const museum = "translations/zh-cn/pack/dwl/tmm_encounter.json";
  assert.match(card(museum, "02123").text, /展厅\(<i>禁止入内<\/i>\)/);
  assert.match(card(museum, "02123").back_text, /展厅\(<i>禁止入内<\/i>\)/);
  assert.match(card(museum, "02124").text, /展厅\(<i>禁止入内<\/i>\)/);
  assert.match(card(museum, "02124").back_text, /展厅\(<i>禁止入内<\/i>\)/);
  assert.match(card(museum, "02125").text, /展厅<i>\(<\/i>禁止入内<i>\)<\/i>/);
  assert.match(
    card("translations/zh-cn/pack/dwl/wda_encounter.json", "02297").text,
    /非<i>哨兵山 <\/i>地点/,
  );
  assert.match(card("translations/zh-cn/pack/ptc/ptc.json", "03002").back_text, /黄衣之王<i>\(第一幕\)<\/i>/);
  assert.match(
    card("translations/zh-cn/pack/ptc/ptc_encounter.json", "03064").back_text,
    /<b>疯狂。<\/b> <i>名词。<\/i>/,
  );
});

test("11086 preserves the Evade instruction and its evasion-specific effect", () => {
  assert.equal(
    card("translations/zh-cn/pack/tdc/tdcp.json", "11086").text,
    "作为打出“接着！”的额外费用，从你手牌或游戏区域选择并弃掉一张占用至少1个手部槽位的[[道具]]支援。\n<b>躲避</b>。本次躲避你得到+X[agility]，其中X为所选支援的印刷费用。如果你成功躲避了非[[精英]]敌人且该支援是从你游戏区域弃掉的，该敌人在下一个补给阶段期间不重整。",
  );
});

test("11087 keeps its Investigate label consistent with its investigation effect", () => {
  assert.match(
    card("translations/zh-cn/pack/tdc/tdcp.json", "11087").text,
    /<b>调查<\/b>。本次调查/,
  );
});

test("90034 sends R1 to conclusion 1 while preserving the original bold markup", () => {
  assert.match(
    card("translations/zh-cn/pack/parallel/btb_encounter.json", "90034").back_text,
    /<b>\(→结局1\)<\/b>。$/,
  );
});

test("08010 uses the established Simplified Chinese trait for Warden", () => {
  assert.equal(
    card("translations/zh-cn/pack/eoe/eoep.json", "08010").traits,
    "天选. 监守",
  );
});

test("02179 distinguishes Forced from Revelation in the same card", () => {
  assert.match(
    card("translations/zh-cn/pack/dwl/tece_encounter.json", "02179").text,
    /<b>强制<\/b> - 如果无助的旅客离场：每位调查员受到1点恐惧。/,
  );
});

test("02165 translates Objective as 目标", () => {
  assert.match(
    card("translations/zh-cn/pack/dwl/tece_encounter.json", "02165").text,
    /^<b>目标<\/b> - 如果有调查员进入车头，立刻推进。$/,
  );
});

test("11110 uses 猎手 for the Hunter trait", () => {
  assert.equal(
    card("translations/zh-cn/pack/tdc/tdcp.json", "11110").traits,
    "盟友. 猎手. 旅人",
  );
});

test("10507 uses 载具 for the Vehicle trait", () => {
  assert.equal(
    card("translations/zh-cn/pack/fhv/fhvc.json", "10507").traits,
    "载具. 推车",
  );
});

test("11104 does not confuse Silver Twilight with 银幕", () => {
  assert.equal(
    card("translations/zh-cn/pack/tdc/tdcp.json", "11104").traits,
    "盟友. 赞助人. 银暮秘社",
  );
});

test("11024 uses the established Spirit trait translation", () => {
  assert.equal(
    card("translations/zh-cn/pack/tdc/tdcp.json", "11024").traits,
    "勇气. 果断",
  );
});

test("98014 uses 熟练 for the Developed trait", () => {
  assert.equal(
    card("translations/zh-cn/pack/promo/tdg.json", "98014").traits,
    "天性. 熟练",
  );
});

test("02166 translates Objective as 目标", () => {
  assert.match(
    card("translations/zh-cn/pack/dwl/tece_encounter.json", "02166").text,
    /^<b>目标<\/b> - 如果车头没有线索，立刻推进。$/,
  );
});

test("11059 uses 人脉 for the Connection trait", () => {
  assert.equal(
    card("translations/zh-cn/pack/tdc/tdcp.json", "11059").traits,
    "人脉. 违法",
  );
});

test("04052 does not leave Eztli in Traditional Chinese", () => {
  assert.equal(
    card("translations/zh-cn/pack/tfa/tfa_encounter.json", "04052").traits,
    "类人. 埃兹特里. 精英",
  );
});

test("01102 uses 银暮秘社 for Silver Twilight", () => {
  assert.equal(
    card("translations/zh-cn/pack/core/core.json", "01102").traits,
    "类人. 异教徒. 银暮秘社",
  );
});

test("07113 uses 诅咒萦绕 for the Cursed trait", () => {
  assert.equal(
    card("translations/zh-cn/pack/tic/itd.json", "07113").traits,
    "圣约. 诅咒萦绕",
  );
});

test("11017 uses the established deckbuilding headings", () => {
  const text = card("translations/zh-cn/pack/tdc/tdcp.json", "11017").back_text;
  assert.match(text, /<b>牌库卡牌张数：<\/b>35。/);
  assert.match(text, /<b>牌库构建需求<\/b>/);
  assert.match(text, /<b>额外冒险设置：<\/b>/);
});

test("10524 consistently names the numbered days with 日", () => {
  const text = card("translations/zh-cn/pack/fhv/fhvc.json", "10524").text;
  assert.match(text, /<b>第一日：<\/b>/);
  assert.match(text, /<b>第二日：<\/b>/);
  assert.match(text, /<b>第三日：<\/b>/);
});

test("90048 uses 艰苦 for the Hardship trait", () => {
  assert.equal(
    card("translations/zh-cn/pack/parallel/otr.json", "90048").traits,
    "艰苦",
  );
});

test("02122 uses the established clue-advance wording", () => {
  assert.match(
    card("translations/zh-cn/pack/dwl/tmm_encounter.json", "02122").back_text,
    /<b>如果你花费线索以推进场景：<\/b>/,
  );
});

test("99001 reuses the complete Marie Lambeau translation from 05006", () => {
  const promo = card("translations/zh-cn/pack/promo/promo.json", "99001");
  const original = card("translations/zh-cn/pack/tcu/tcu.json", "05006");
  for (const field of ["name", "subname", "text", "traits", "back_flavor", "back_text"]) {
    assert.equal(promo[field], original[field], field);
  }
});

test("deckbuilding headings use the established 牌库 terminology", () => {
  const deprecated = ["牌库卡片张数", "牌组卡牌张数", "牌组构建需求", "<b>牌库构建</b>"];
  const files = packJsonFiles(path.join(root, "translations/zh-cn/pack"));

  for (const file of files) {
    const contents = fs.readFileSync(file, "utf8");
    for (const term of deprecated) {
      assert.equal(
        contents.includes(term),
        false,
        `${path.relative(root, file)} still contains ${term}`,
      );
    }
  }
});

test("Obstacle is consistently translated as 障碍 in traits", () => {
  for (const [relativePath, code] of [
    ["translations/zh-cn/pack/dwl/dwl_encounter.json", "02102"],
    ["translations/zh-cn/pack/tic/lod_encounter.json", "07299"],
  ]) {
    assert.match(card(relativePath, code).traits, /障碍/);
  }
});

test("10558 translates its Cave and Lair traits", () => {
  assert.equal(
    card("translations/zh-cn/pack/fhv/fhvc.json", "10558").traits,
    "洞穴. 巢穴",
  );
});

test("Otherwise, read the following uses the established 下列 wording", () => {
  assert.match(
    card("translations/zh-cn/pack/tde/dsm_encounter.json", "06208").back_text,
    /<b>否则，阅读下列内容：<\/b>/,
  );
});

test("validator-discovered traits do not remain in English", () => {
  assert.equal(
    card("translations/zh-cn/pack/side/tmg_encounter.json", "71060").traits,
    "障碍",
  );
  assert.equal(
    card("translations/zh-cn/pack/side/blbe_encounter.json", "89012").traits,
    "载具",
  );
  assert.equal(
    card("translations/zh-cn/pack/parallel/aof.json", "90081").traits,
    "信徒. 监守",
  );
});

test("01069 preserves the horror penalty after a symbol is revealed", () => {
  assert.match(
    card("translations/zh-cn/pack/core/core.json", "01069").text,
    /本回合失去1个行动并受到1点恐惧。/,
  );
});

test("02171 requires one wild icon, not two", () => {
  assert.match(
    card("translations/zh-cn/pack/dwl/tece_encounter.json", "02171").text,
    /至少1个\[wild\]图标/,
  );
});

test("02251 applies its penalty to willpower", () => {
  assert.match(
    card("translations/zh-cn/pack/dwl/uau_encounter.json", "02251").text,
    /得到-1\[willpower\]/,
  );
});

test("04206 preserves both printed actions and the compass instructions", () => {
  const text = card("translations/zh-cn/pack/tfa/hote_encounter.json", "04206").text;
  assert.match(text, /<b>撤退<\/b>/);
  assert.match(text, /带有指南针/);
  assert.match(text, /顶的3张卡牌/);
  assert.match(text, /其余2张放在牌库顶/);
});

test("04220 and 04227 retain their Vengeance 2 values", () => {
  for (const code of ["04220", "04227"]) {
    assert.match(
      card("translations/zh-cn/pack/tfa/hote_encounter.json", code).text,
      /<b>复仇2<\/b>。/,
    );
  }
});

test("04325b removes Act 4a, not Act 1a", () => {
  assert.match(
    card("translations/zh-cn/pack/tfa/sha_encounter.json", "04325b").text,
    /场景4a——“修补裂痕”/,
  );
});

test("05191 starts with three supplies", () => {
  assert.match(
    card("translations/zh-cn/pack/tcu/fgg.json", "05191").text,
    /使用\(3补给\)/,
  );
});

test("06222 keeps its hide-among-the-ruins action", () => {
  const text = card("translations/zh-cn/pack/tde/dsm_encounter.json", "06222").text;
  assert.match(text, /检定\[intellect\]\(1\)或\[agility\]\(1\)/);
  assert.match(text, /每超过难度3点/);
  assert.match(text, /警报等级降低1级/);
});

test("07316 through 07318 retain Victory 2 on their reverse side", () => {
  for (const code of ["07316", "07317", "07318"]) {
    assert.match(
      card("translations/zh-cn/pack/tic/itm_encounter.json", code).back_text,
      /<b>胜利2<\/b>。/,
    );
  }
});

test("08677 preserves the printed [seal_d] token", () => {
  const text = card("translations/zh-cn/pack/eoe/eoec.json", "08677").text;
  assert.match(text, /\[seal_d\]/);
  assert.doesNotMatch(text, /\[seal_e\]/);
});

test("10091 uses the standard bold Parley label", () => {
  assert.match(
    card("translations/zh-cn/pack/fhv/fhvp.json", "10091").text,
    /<b>谈判<\/b>/,
  );
});

test("52023 and 52024 keep each side's original text", () => {
  const file = "translations/zh-cn/pack/return/rtptc_encounter.json";
  assert.match(card(file, "52023").text, /<b>猎物<\/b> - 线索最多。/);
  assert.match(card(file, "52023b").text, /受到1点恐惧/);
  assert.match(card(file, "52024").text, /检定\[intellect\]\(4\)/);
  assert.match(card(file, "52024b").text, /如果场上没有宴会宾客/);
});

test("52052 includes both Forced effects", () => {
  const text = card("translations/zh-cn/pack/return/rtptc_encounter.json", "52052").text;
  assert.match(text, /在你于颅骨之海结束回合后/);
  assert.match(text, /弃掉3张卡牌/);
  assert.match(text, /在颅骨之海揭示时/);
});

test("54032 uses the agility symbol without a typo", () => {
  const text = card("translations/zh-cn/pack/return/rttcu_encounter.json", "54032").text;
  assert.match(text, /\[agility\]/);
  assert.doesNotMatch(text, /\[agiility\]/);
});

test("90003 preserves the italic all-three reminder", () => {
  assert.match(
    card("translations/zh-cn/pack/parallel/rod.json", "90003").text,
    /<i>\(同时结算它们\)<\/i>/,
  );
});

test("02165 uses combat to endure the creature's heat", () => {
  assert.match(
    card("translations/zh-cn/pack/dwl/tece_encounter.json", "02165").back_text,
    /检定 \[combat\] \(3\)/,
  );
});

test("02172 has a single action cost", () => {
  assert.match(
    card("translations/zh-cn/pack/dwl/tece_encounter.json", "02172").text,
    /\n\[action\](?!\[action\])：获得3资源/,
  );
});

test("05115 preserves its action trigger", () => {
  assert.match(
    card("translations/zh-cn/pack/tcu/tsn.json", "05115").text,
    /\[action\]花费1子弹：<b>攻击<\/b>/,
  );
});

test("07036 is triggered by a bless token", () => {
  const text = card("translations/zh-cn/pack/tic/tic.json", "07036").text;
  assert.match(text, /揭示了\[bless\]标记/);
  assert.match(text, /<i>\(不要再揭示另一个标记/);
});

test("07156 uses a reaction trigger", () => {
  assert.match(
    card("translations/zh-cn/pack/tic/def.json", "07156").text,
    /^\[reaction\]双面神父入场后：/,
  );
});

test("08675 and 08678 preserve their seal identities", () => {
  assert.match(card("translations/zh-cn/pack/eoe/eoec.json", "08675").text, /\[seal_b\]/);
  assert.match(card("translations/zh-cn/pack/eoe/eoec.json", "08678").text, /\[seal_e\]/);
});

test("09539 uses the fast ability icon", () => {
  assert.match(
    card("translations/zh-cn/pack/tsk/tskc.json", "09539").text,
    /\[free\]在你回合期间：/,
  );
});

test("10606 preserves the willpower skill symbol", () => {
  assert.match(
    card("translations/zh-cn/pack/fhv/fhvc.json", "10606").back_text,
    /检定\[willpower\]\(X\)/,
  );
});

test("10634 uses Forced when the Barn is revealed", () => {
  assert.match(
    card("translations/zh-cn/pack/fhv/fhvc.json", "10634").text,
    /<b>强制<\/b> - 在谷仓揭示时：/,
  );
});

test("10697 keeps both skill choices well-formed", () => {
  assert.match(
    card("translations/zh-cn/pack/fhv/fhvc.json", "10697").text,
    /检定\[willpower\]或\[intellect\]\(3\)/,
  );
});

test("11049 keeps its reaction trigger", () => {
  assert.match(
    card("translations/zh-cn/pack/tdc/tdcp.json", "11049").text,
    /^\[reaction\]你技能检定成功后，/,
  );
});

test("return-to-dunwich texts preserve game symbols", () => {
  const naomi = card("translations/zh-cn/pack/return/rtdwl_encounter.json", "51052").text;
  assert.match(naomi, /\[intellect\]/);
  assert.match(naomi, /\[auto_fail\]/);
  assert.doesNotMatch(naomi, /intellent|atuo_fail/);
  assert.match(
    card("translations/zh-cn/pack/return/rtdwl_encounter.json", "51065").text,
    /或\[intellect\]\(3\)/,
  );
});

test("54036 spells the per-investigator token correctly", () => {
  assert.match(
    card("translations/zh-cn/pack/return/rttcu_encounter.json", "54036").text,
    /\[per_investigator\]/,
  );
});

test("parallel cards preserve their trigger icons", () => {
  assert.match(
    card("translations/zh-cn/pack/parallel/rod.json", "90002").text,
    /\[reaction\]当/,
  );
  assert.match(
    card("translations/zh-cn/pack/parallel/aon.json", "90009").text,
    /任意\[free\]窗口/,
  );
});

test("90045b spends clues equal to the Hideout's clue value", () => {
  const text = card("translations/zh-cn/pack/parallel/rtr_encounter.json", "90045b").text;
  assert.match(text, /共同花费等于其线索值数量的线索/);
  assert.match(text, /每个敌人和调查员移动到一个连接地点/);
});

test("04206b keeps its map-specific exploration action", () => {
  const text = card("translations/zh-cn/pack/tfa/hote_encounter.json", "04206b").text;
  assert.match(text, /带有地图/);
  assert.match(text, /顶的2张卡牌/);
  assert.match(text, /弃掉以此效果查看的每张诡计卡牌/);
});

test("09509 interrogates with willpower or intellect", () => {
  assert.match(
    card("translations/zh-cn/pack/tsk/tskc.json", "09509").text,
    /检定\[willpower\]或\[intellect\]\(5\)/,
  );
});

test("10628 preserves the resident-name placeholder", () => {
  assert.match(
    card("translations/zh-cn/pack/fhv/fhvc.json", "10628").back_text,
    /<i>\[name\]为调查员牺牲自己<\/i>/,
  );
});

test("parallel-symbol typo fixes preserve runtime tokens", () => {
  const ltr = "translations/zh-cn/pack/parallel/ltr_encounter.json";
  for (const code of ["90055", "90056", "90058"]) {
    const text = card(ltr, code).text || card(ltr, code).back_text;
    assert.doesNotMatch(text, /per_invesetigator/);
  }
  assert.match(card(ltr, "90055").text, /\[per_investigator\]/);
  assert.match(card(ltr, "90056").text, /\[per_investigator\]/);
  assert.match(card(ltr, "90058").text, /\[per_investigator\]/);
  assert.match(
    card("translations/zh-cn/pack/parallel/rop_encounter.json", "90070").text,
    /<b>强制<\/b> - 在你进入秘密通道后：/,
  );
  assert.match(
    card("translations/zh-cn/pack/parallel/hfa.json", "90078").back_text,
    /\[rogue\]/,
  );
});

test("Labyrinths of Lunacy act cards no longer retain English rules text", () => {
  const source = "translations/zh-cn/pack/side/lol_encounter.json";
  for (const code of ["70007", "70008", "70009", "70010", "70011", "70012", "70013", "70014", "70015"]) {
    const translated = card(source, code);
    assert.doesNotMatch(translated.text, /\b(?:Timed|advance|agenda|investigator|Chamber)\b/);
    assert.doesNotMatch(translated.back_text, /\b(?:investigator|Resolve|Setup|Chamber|Eixodolon)\b/);
  }
  assert.match(card(source, "70007").back_text, /\[per_investigator\]/);
  assert.match(card(source, "70011").back_text, /\(→结局1\)/);
  assert.match(card(source, "70013").back_text, /艾克索多隆的宠物/);
  assert.match(card(source, "70014").back_text, /\(→结局[234]\)/);
});

test("card references and repeated names use their printed Simplified Chinese names", () => {
  assert.doesNotMatch(card("translations/zh-cn/pack/core/core.json", "01099").text, /神经素乱/);
  assert.match(card("translations/zh-cn/pack/core/core.json", "01099").text, /神经紊乱/);
  assert.match(card("translations/zh-cn/pack/ptc/ptc.json", "03002").back_text, /缜密分析/);
});

test("Labyrinth locations use one Simplified Chinese name in every rule reference", () => {
  const source = "translations/zh-cn/pack/side/lol_encounter.json";
  for (const code of ["70016", "70017", "70018", "70019", "70020", "70021", "70022", "70023", "70024"]) {
    const translated = card(source, code);
    for (const field of ["name", "subname", "text", "traits", "back_flavor", "back_text"]) {
      if (translated[field]) assert.doesNotMatch(translated[field], /\b(?:Chamber|Prison|Distortion)\b/);
    }
  }
  assert.match(card(source, "70021").text, /悲伤密室或雨之密室/);
});

test("Labyrinth locations and paths use localized names and protected tokens", () => {
  const source = "translations/zh-cn/pack/side/lol_encounter.json";
  for (const code of ["70025", "70026", "70027", "70028", "70029", "70030", "70031", "70032"]) {
    const translated = card(source, code);
    assert.doesNotMatch(translated.name, /\b(?:Labyrinthine|Chamber|Warehouse)\b/);
  }
  assert.match(card(source, "70031").back_text, /\[per_investigator\]/);
  assert.match(card(source, "70027").text, /^\[action\]\[action\]：/);
});

test("Labyrinth story assets and encounters use the approved Simplified Chinese names", () => {
  const source = "translations/zh-cn/pack/side/lol_encounter.json";
  for (const code of ["70039", "70040", "70041", "70042", "70043", "70044", "70045", "70046", "70047", "70048", "70049", "70050", "70051", "70052", "70053", "70054", "70055", "70056", "70057", "70058", "70059", "70060", "70061"]) {
    assert.doesNotMatch(card(source, code).name, /\b(?:Eixodolon|Diagram|Effect|Pain|Mechanism|Gas|Victim|Guard)\b/);
  }
  assert.match(card(source, "70049").text, /\[per_investigator\]/);
  assert.match(card(source, "70051").text, /\[willpower\]或\[combat\]/);
  assert.match(card(source, "70056").text, /检定\[agility\]\(4\)/);
});

test("Labyrinth story cards retain their group-specific instructions in Simplified Chinese", () => {
  const source = "translations/zh-cn/pack/side/lol_encounter.json";
  for (const code of ["70033", "70034", "70035", "70036", "70037", "70038"]) {
    const translated = card(source, code);
    assert.doesNotMatch(translated.text, /\b(?:Revelation|Forced|Group|Act|Chamber)\b/);
    assert.doesNotMatch(translated.back_text, /\b(?:Group|Chamber|Diagram|investigator)\b/);
  }
  assert.match(card(source, "70034").text, /\[\[扭曲\]\]/);
  assert.match(card(source, "70035").text, /\[reaction\]在本轮结束时/);
  assert.match(card(source, "70038").text, /检定\[intellect\]\(2\)/);
});

test("Blob that ate everything locations use approved traits and keywords", () => {
  const source = "translations/zh-cn/pack/side/blbe_encounter.json";
  for (const code of ["89006", "89007", "89008", "89009"]) {
    assert.match(card(source, code).traits, /软泥污染/);
    assert.doesNotMatch(card(source, code).text, /\b(?:Forced|Investigate|Ooze|Manifold)\b/);
  }
  assert.match(card(source, "89007").text, /\[\[复体\]\]/);
  assert.match(card(source, "89009").text, /<b>软泥X<\/b>/);
});

test("replicating aberrations preserve their distinct triggers in Simplified Chinese", () => {
  const source = "translations/zh-cn/pack/side/blbe_encounter.json";
  for (const suffix of ["a", "b", "c", "d", "e", "f", "g", "h", "i"]) {
    const translated = card(source, `89010${suffix}`);
    assert.equal(translated.name, "复制畸变体");
    assert.match(translated.text, /<b>复制<\/b>/);
    assert.match(translated.text, /<b>软泥3。<\/b>/);
    assert.doesNotMatch(translated.text, /\b(?:Replicate|Hunter|Forced|Blob)\b/);
  }
  assert.match(card(source, "89010a").text, /恰好有1点剩余生命值的\[\[复体\]\]敌人/);
  assert.match(card(source, "89010h").text, /外星食物链/);
});

test("Blob scenario support cards keep their movement and research effects", () => {
  const source = "translations/zh-cn/pack/side/blbe_encounter.json";
  assert.match(card(source, "89012").text, /1\[per_investigator\]次行动/);
  assert.match(card(source, "89013").text, /朝装甲车移动1次/);
  assert.match(card(source, "89015").text, /脑盒附属在米戈科学家上/);
  assert.match(card(source, "89016").text, /检定\[intellect\]或\[agility\]\(6\)/);
  assert.match(card(source, "89018").text, /\[\[软泥\]\]敌人/);
});

test("Blob story cards preserve their two possible outcomes", () => {
  const source = "translations/zh-cn/pack/side/blbe_encounter.json";
  assert.match(card(source, "89011").back_text, /“护送失败”/);
  assert.match(card(source, "89011").back_text, /对个体代号8L-08造成5点伤害/);
  assert.match(card(source, "89014").back_text, /“大脑已夺回”/);
  assert.match(card(source, "89014").back_text, /获得1对策/);
  assert.match(card(source, "89017").back_text, /“米戈研究被阻止”/);
  assert.match(card(source, "89017").back_text, /\[\[米戈\]\]敌人生命值-2，躲避值-2/);
});

test("Blob story assets use Simplified Chinese typography and rules terms", () => {
  const source = "translations/zh-cn/pack/side/blbe_encounter.json";
  assert.match(card(source, "89019").text, /技能检定将要失败/);
  assert.doesNotMatch(card(source, "89019").text, /檢定|強制/);
  assert.match(card(source, "89020").text, /花费1充能：<b>躲避<\/b>/);
  assert.match(card(source, "89021").text, /横置\[\[生物\]\]或\[\[怪物\]\]敌人/);
});

test("Midwinter Gala opening acts use the shared Simplified Chinese terminology", () => {
  const source = "translations/zh-cn/pack/side/tmg_encounter.json";
  assert.match(card(source, "71001").text, /\[\[宾客\]\]支援/);
  assert.match(card(source, "71002").text, /\[\[灯笼会\]\]敌人/);
  assert.match(card(source, "71003").back_text, /无血者/);
  assert.match(card(source, "71004").back_text, /精神创伤/);
});

test("Midwinter Gala locations preserve their cross-group and treasure rules", () => {
  const source = "translations/zh-cn/pack/side/tmg_encounter.json";
  assert.match(card(source, "71005").back_text, /\[\[二楼\]\]地点/);
  assert.match(card(source, "71007").text, /1\[per_investigator\]资源/);
  assert.match(card(source, "71008").text, /检定\[willpower\]\(4\)/);
  assert.match(card(source, "71012").text, /使用\[agility\]进行本次攻击/);
  assert.match(card(source, "71013").text, /萨纳斯之宝/);
});

test("Midwinter Gala allies and rivals retain their printed combat logic", () => {
  const source = "translations/zh-cn/pack/side/tmg_encounter.json";
  assert.match(card(source, "71015").text, /2\[per_investigator\]个线索/);
  assert.match(card(source, "71015b").text, /1加1\[per_investigator\]个线索/);
  assert.match(card(source, "71016").text, /得到\+1\[combat\]/);
  assert.match(card(source, "71017").text, /遭遇牌库顶9张卡牌/);
  assert.match(card(source, "71018").text, /\[\[盟友\]\]或\[\[武器\]\]支援/);
  assert.match(card(source, "71020").text, /涌动。冷漠。猎手。/);
});

test("Miskatonic faction cards retain their clue and deck-search effects", () => {
  const source = "translations/zh-cn/pack/side/tmg_encounter.json";
  assert.match(card(source, "71021").text, /至少3\[per_investigator\]个线索/);
  assert.match(card(source, "71021b").text, /检定\[intellect\]\(3\)/);
  assert.match(card(source, "71023").text, /基础\[intellect\]值等于你手牌/);
  assert.match(card(source, "71024").text, /牌库顶9张卡牌/);
  assert.match(card(source, "71026").text, /困惑不能被取消/);
});

test("Syndicate faction cards preserve mysteries, antiquities, and resource limits", () => {
  const source = "translations/zh-cn/pack/side/tmg_encounter.json";
  assert.match(card(source, "71027").text, /1\[per_investigator\]个线索/);
  assert.match(card(source, "71027").text, /一张谜团/);
  assert.match(card(source, "71029").text, /作为古董/);
  assert.match(card(source, "71030").text, /每个地点放置1资源/);
  assert.match(card(source, "71031").text, /基础\[combat\]值等于你资源池/);
  assert.match(card(source, "71032").text, /失去4资源/);
});

test("Silver Twilight faction cards retain their wards, spell slots, and resources", () => {
  const source = "translations/zh-cn/pack/side/tmg_encounter.json";
  assert.match(card(source, "71033").text, /5\[per_investigator\]个线索/);
  assert.match(card(source, "71034").text, /额外法术槽位/);
  assert.match(card(source, "71035").text, /使用\(3预兆\)/);
  assert.match(card(source, "71036").text, /将你的\[willpower\]值加入/);
  assert.match(card(source, "71037").text, /使用\(4真相\)/);
  assert.match(card(source, "71038").text, /守护结界不能被取消/);
});

test("Kingsport faction cards retain their purification and commitment rules", () => {
  const source = "translations/zh-cn/pack/side/tmg_encounter.json";
  assert.match(card(source, "71039").text, /检定\[combat\]或\[agility\]\(3\)/);
  assert.match(card(source, "71040").text, /1\[per_investigator\]资源/);
  assert.match(card(source, "71041").text, /忽略每个非\[\[精英\]\]\[\[类人\]\]敌人/);
  assert.match(card(source, "71042").text, /命名一个\[\[特性\]\]/);
  assert.match(card(source, "71044").text, /你每项技能得到-2/);
});

test("Midwinter Gala finale and treacheries keep enemy, lantern, and faction effects", () => {
  const source = "translations/zh-cn/pack/side/tmg_encounter.json";
  assert.match(card(source, "71045").text, /3\[per_investigator\]点伤害/);
  assert.match(card(source, "71046b").text, /其上有4点伤害/);
  assert.match(card(source, "71049").text, /战斗值\+1和躲避值\+1/);
  assert.match(card(source, "71051").text, /\+2\[per_investigator\]生命值/);
  assert.match(card(source, "71052").text, /3点伤害和1个毁灭标记/);
  assert.match(card(source, "71061").text, /\[\[对手\]\]敌人/);
});

test("Labyrinth opening agendas retain their group draws and difficulty effects", () => {
  const source = "translations/zh-cn/pack/side/lol_encounter.json";
  assert.match(card(source, "70001").text, /<b>简单\/普通<\/b>/);
  assert.match(card(source, "70002").text, /\[\[场景1\]\]剧情卡牌/);
  assert.match(card(source, "70004").text, /\[\[场景2\]\]剧情卡牌/);
  assert.match(card(source, "70006").back_text, /\(→结局1\)/);
  assert.doesNotMatch(card(source, "70013").flavor, /\b(?:Chamber|Pet|gate)\b/);
});

test("Parallel Father Mateo cards retain their seal and bless rules", () => {
  const source = "translations/zh-cn/pack/parallel/aof.json";
  assert.match(card(source, "90081").text, /封印在你所在地点一位没有封印\[bless\]标记的调查员上/);
  assert.match(card(source, "90082").text, /封印\(\[elder_sign\]或至多3个\[bless\]\)/);
  assert.match(card(source, "90083").text, /仅限马泰奥神父/);
});

test("Parallel Jenny cards retain talent, ammunition, and Izzie rules", () => {
  const source = "translations/zh-cn/pack/parallel/pap.json";
  assert.match(card(source, "90084").text, /\[\[天赋\]\]支援/);
  assert.match(card(source, "90085").text, /使用\(X子弹\)/);
  assert.match(card(source, "90086").text, /\[action\]\[action\]：<b>调查<\/b>/);
});

test("remaining English-dominant official cards are translated without changing rules tokens", () => {
  assert.match(
    card("translations/zh-cn/pack/parallel/rop_encounter.json", "90066a").text,
    /\+1\[per_investigator\]毁灭阈值/,
  );
  assert.match(card("translations/zh-cn/pack/promo/promo.json", "99002").text, /玛丽·朗博牌库专用/);
  assert.match(card("translations/zh-cn/pack/promo/promo.json", "99003").text, /安息日男爵/);
  assert.doesNotMatch(card("translations/zh-cn/pack/tsk/tskc.json", "09703").flavor, /\b(?:expel|collapse|dimension|last chance)\b/i);
  assert.equal(card("translations/zh-cn/pack/tsk/tskp.json", "09014").flavor, "\"难以辨认的涂鸦\"");
});

test("Subject 5U-21 uses Simplified Chinese and preserves devour reference rules", () => {
  const source = "translations/zh-cn/pack/side/blbe.json";
  assert.match(card(source, "89001").back_text, /牌库构建需求/);
  assert.match(card(source, "89001").text, /\[elder_sign\]效果：\+2/);
  assert.match(card(source, "89002b").text, /饥肠辘辘下方/);
  assert.match(card(source, "89005b").text, /\[cultist\]：……在下一个调查阶段结束前/);
  assert.doesNotMatch(card(source, "89005").text, /\be直到\b/);
});

test("Blob scenario opening acts use Simplified Chinese and preserve multiplayer rules", () => {
  const source = "translations/zh-cn/pack/side/blob_encounter.json";
  assert.match(card(source, "85005").text, /总线索目标值/);
  assert.match(card(source, "85007").text, /两倍的伤害/);
  assert.match(card(source, "85008").back_text, /\[per_investigator\]个线索/);
  assert.match(card(source, "85009").back_text, /场景1a/);
  assert.equal(card(source, "85010").traits, "软泥污染");
});

test("Blob locations use Simplified Chinese names and preserve location-specific effects", () => {
  const source = "translations/zh-cn/pack/side/blob_encounter.json";
  assert.match(card(source, "85013").text, /\[\[米戈\]\]敌人/);
  assert.match(card(source, "85014").text, /至多X次连接/);
  assert.match(card(source, "85015").text, /横置\[\[复体\]\]敌人/);
  assert.match(card(source, "85017").text, /自动躲避/);
  assert.match(card(source, "85019").text, /\[skull\]或\[auto_fail\]/);
  assert.equal(card(source, "85020").traits, "软泥污染");
});

test("Blob Mi-Go stories preserve their outcome flags, locations, and story assets", () => {
  const source = "translations/zh-cn/pack/side/blob_encounter.json";
  assert.match(card(source, "85021").text, /记录“化学家获救”/);
  assert.match(card(source, "85022").text, /米戈收割者生成在真菌丘/);
  assert.match(card(source, "85023").back_text, /米戈工兵生命值\+2/);
  assert.match(card(source, "85024").text, /1\[per_investigator\]个不同\[\[软泥污染\]\]地点/);
  assert.match(card(source, "85025").text, /\[willpower\]或\[intellect\]\(3\)/);
});

test("Blob Mi-Go support and enemy cards use Simplified Chinese names and rules", () => {
  const source = "translations/zh-cn/pack/side/blob_encounter.json";
  assert.match(card(source, "85026").text, /解除陨石样本的附属/);
  assert.match(card(source, "85029").text, /\[\[障碍\]\]诡计/);
  assert.match(card(source, "85031").text, /使用\(3子弹\)/);
  assert.match(card(source, "85033").text, /真菌丘除外/);
  assert.match(card(source, "85037").text, /<b>\(→结局2\)<\/b>/);
});

test("Blob encounter set uses Simplified Chinese names, keywords, and danger effects", () => {
  const source = "translations/zh-cn/pack/side/blob_encounter.json";
  assert.match(card(source, "85039").text, /<b>软泥1。<\/b>/);
  assert.match(card(source, "85041").text, /横置并未交战/);
  assert.match(card(source, "85044").text, /规则第16-19页/);
  assert.match(card(source, "85049").text, /\[\[软泥污染\]\]地点/);
  assert.match(card(source, "85051").text, /\[\[复体\]\]敌人/);
  assert.match(card(source, "85052").text, /至少6资源/);
  assert.match(card(source, "85053").text, /附属到剩余生命值最低的\[\[复体\]\]敌人/);
});

test("Curse of the Rougarou opening acts preserve encounter-set and agenda rules", () => {
  const source = "translations/zh-cn/pack/side/cotr_encounter.json";
  assert.match(card(source, "81002").back_text, /推进至密谋2a后/);
  assert.match(card(source, "81003").back_text, /每张觅食混洗入遭遇牌库/);
  assert.match(card(source, "81004").back_text, /<b>\(→结局1\)<\/b>/);
  assert.match(card(source, "81005").text, /\[\[河口\]\]地点/);
  assert.match(card(source, "81005").back_text, /狼人诅咒遭遇组/);
});

test("Curse of the Rougarou acts and locations retain their Simplified Chinese rule effects", () => {
  const source = "translations/zh-cn/pack/side/cotr_encounter.json";
  assert.match(card(source, "81006").back_text, /4\[per_investigator\]个线索/);
  assert.match(card(source, "81007").text, /下一次技能检定的技能值\+2/);
  assert.match(card(source, "81010").text, /弃掉2张支援/);
  assert.match(card(source, "81014").text, /花费5资源/);
  assert.match(card(source, "81016").text, /古代束缚之石/);
  assert.doesNotMatch(card(source, "81018").text, /花費|點恐懼/);
});

test("Curse of the Rougarou support, enemy, and treachery cards preserve rules terms", () => {
  const source = "translations/zh-cn/pack/side/cotr_encounter.json";
  assert.match(card(source, "81020").text, /附属到你所在地点/);
  assert.match(card(source, "81025").text, /每个地点限1张/);
  assert.match(card(source, "81028").text, /1\[per_investigator\]点伤害/);
  assert.match(card(source, "81031").text, /剩余生命值最低的目标/);
  assert.match(card(source, "81033").text, /改为将那些线索放置在黑山羊幼崽宿主上/);
  assert.match(card(source, "81036").text, /附属到狼人/);
});

test("Carnevale opening agendas use Simplified Chinese and preserve sacrifice logic", () => {
  const source = "translations/zh-cn/pack/side/coh_encounter.json";
  assert.match(card(source, "82001").text, /无辜的狂欢者/);
  assert.match(card(source, "82002b").text, /猎手。反击。/);
  assert.match(card(source, "82003").back_text, /推进至密谋3a/);
  assert.match(card(source, "82004").back_text, /优先分配给无辜的狂欢者/);
});

test("Carnevale acts and Venice locations preserve boat, resource, and clockwise rules", () => {
  const source = "translations/zh-cn/pack/side/coh_encounter.json";
  assert.match(card(source, "82005").text, /1\[per_investigator\]个线索/);
  assert.match(card(source, "82006b").text, /从游戏中移除/);
  assert.match(card(source, "82007").text, /4\[per_investigator\]资源/);
  assert.match(card(source, "82008").text, /顺时针方向的地点连接/);
  assert.match(card(source, "82010").text, /\[fast\]：<b>移动<\/b>/);
});

test("Carnevale masked elites retain their Simplified Chinese identities and movement", () => {
  const source = "translations/zh-cn/pack/side/coh_encounter.json";
  assert.match(card(source, "82018").text, /伊丽莎白塔·马格罗/);
  assert.match(card(source, "82019").text, /基础\[combat\]/);
  assert.match(card(source, "82020").text, /还与其对面地点连接/);
});

test("Carnevale civilian and abbess cards preserve parley and location movement", () => {
  const source = "translations/zh-cn/pack/side/coh_encounter.json";
  assert.match(card(source, "82017b").text, /花费1个线索/);
  assert.match(card(source, "82021").text, /将其放到密谋牌库下方/);
  assert.match(card(source, "82022").text, /横置院长阿莱格里娅·迪·比亚塞/);
});

test("Carnevale late treacheries preserve civilian movement and hunter consequences", () => {
  const source = "translations/zh-cn/pack/side/coh_encounter.json";
  assert.match(card(source, "82035").text, /最远的、没有调查员的地点/);
  assert.match(card(source, "82036").text, /失去所有资源/);
  assert.match(card(source, "82037").text, /每名敌人的猎手关键词/);
});

test("Carnevale Venice locations and Don Lagorio preserve their printed connection rules", () => {
  const source = "translations/zh-cn/pack/side/coh_encounter.json";
  assert.match(card(source, "82012").text, /\[action\]\[action\]花费2资源/);
  assert.match(card(source, "82014").text, /逆时针方向地点的一名非\[\[精英\]\]敌人/);
  assert.match(card(source, "82017").text, /还与逆时针方向的地点连接/);
});

test("Nathaniel Cho cards use Simplified Chinese deckbuilding and Purifier terminology", () => {
  const source = "translations/zh-cn/pack/investigator/nat.json";
  assert.match(card(source, "60101").back_text, /牌库构建需求/);
  assert.equal(card(source, "60101").traits, "罪犯. 监守");
  assert.match(card(source, "60102").text, /纳撒尼尔·曹牌库专用/);
  assert.equal(card(source, "60107").subname, "净化者");
});

test("Nathaniel Cho early assets use Simplified Chinese and preserve combat reactions", () => {
  const source = "translations/zh-cn/pack/investigator/nat.json";
  assert.equal(card(source, "60104").name, "自我毁灭");
  assert.match(card(source, "60105").text, /横置拳击手套/);
  assert.match(card(source, "60106").text, /取消该次攻击造成的1点伤害或1点恐惧/);
});

test("Nathaniel Cho combat events preserve engagement and consecutive-fight effects", () => {
  const source = "translations/zh-cn/pack/investigator/nat.json";
  assert.match(card(source, "60114").text, /<b>交战<\/b>。<b>攻击<\/b>/);
  assert.match(card(source, "60116").text, /本次攻击造成\+1伤害/);
  assert.match(card(source, "60117").text, /可以再次攻击该敌人/);
});

test("Nathaniel Cho advanced events preserve fast windows, first-action damage, and deck search", () => {
  const source = "translations/zh-cn/pack/investigator/nat.json";
  assert.match(card(source, "60123").text, /任意\[fast\]时机/);
  assert.match(card(source, "60125").text, /不会引发趁乱攻击/);
  assert.match(card(source, "60127").text, /牌库顶9张卡牌/);
});

test("Nathaniel Cho level-five cards preserve automatic success and resource replenishment", () => {
  const source = "translations/zh-cn/pack/investigator/nat.json";
  assert.equal(card(source, "60128").subname, "净化者");
  assert.match(card(source, "60131").text, /每轮开始时补满这些资源/);
  assert.match(card(source, "60132").text, /自动成功并造成\+1伤害/);
});

test("Harvey Walters core cards preserve deckbuilding, card draw, and hand-based damage", () => {
  const source = "translations/zh-cn/pack/investigator/har.json";
  assert.match(card(source, "60201").back_text, /牌库构建需求/);
  assert.equal(card(source, "60201").traits, "密斯卡托尼克");
  assert.match(card(source, "60202").text, /哈维·沃尔特斯牌库专用/);
  assert.match(card(source, "60203").text, /手牌中每有3张卡牌/);
});

test("Harvey Walters assets preserve Tome slots and automatic enemy evasion", () => {
  const source = "translations/zh-cn/pack/investigator/har.json";
  assert.match(card(source, "60205").text, /额外1个手部槽位/);
  assert.equal(card(source, "60206").traits, "道具. 书籍");
  assert.match(card(source, "60207").text, /自动躲避该敌人/);
});

test("Harvey Walters level-zero assets preserve secrets, Tome traits, and fast abilities", () => {
  const source = "translations/zh-cn/pack/investigator/har.json";
  assert.match(card(source, "60208").text, /横置百科全书并花费1秘密/);
  assert.match(card(source, "60209").text, /进行一次\[intellect\]\(1\)检定/);
  assert.match(card(source, "60210").text, /记录\"你翻译了这本书。\"/);
  assert.match(card(source, "60211").text, /\[fast\]花费1资源/);
  assert.equal(card(source, "60213").subname, "珍本书籍猎手");
});

test("Harvey Walters events preserve their resource, hand, and intellect attack effects", () => {
  const source = "translations/zh-cn/pack/investigator/har.json";
  assert.equal(card(source, "60214").name, "燃烧午夜油");
  assert.match(card(source, "60216").text, /每有1张其它卡牌/);
  assert.match(card(source, "60217").text, /改为使用\[intellect\]/);
});

test("Harvey Walters upgraded cards preserve Tome, research, and hand-size effects", () => {
  const source = "translations/zh-cn/pack/investigator/har.json";
  assert.equal(card(source, "60222").name, "绝密地图集");
  assert.match(card(source, "60223").text, /横置惠顿·格林/);
  assert.match(card(source, "60225").text, /最多\+3伤害/);
  assert.match(card(source, "60229").text, /横置禁忌之书/);
  assert.match(card(source, "60231").text, /打出你手牌中的一张事件/);
  assert.match(card(source, "60233").text, /\[fast\]花费4秘密/);
});

test("Jacqueline Fine cards preserve chaos-token, spell, and evasion rules", () => {
  const source = "translations/zh-cn/pack/investigator/jac.json";
  assert.match(card(source, "60401").back_text, /牌库构建需求/);
  assert.match(card(source, "60404").text, /\[action\]\[action\]：弃掉虚无主义/);
  assert.match(card(source, "60406").text, /\"抽取混乱标记\"步骤/);
  assert.match(card(source, "60409").text, /<b>躲避<\/b>/);
  assert.match(card(source, "60420").text, /取消该效果，或额外结算一次该效果/);
  assert.match(card(source, "60428").text, /每轮开始时补满这些资源/);
});

test("Winifred Habbamock opening cards preserve commitment and firearm rules", () => {
  const source = "translations/zh-cn/pack/investigator/win.json";
  assert.match(card(source, "60301").back_text, /牌库构建需求/);
  assert.match(card(source, "60301").text, /每成功超过难度2点/);
  assert.match(card(source, "60304").text, /其它卡牌不能投入本次技能检定/);
  assert.match(card(source, "60305").text, /横置撬锁工具/);
  assert.match(card(source, "60306").text, /重整毛瑟C96手枪/);
});

test("Winifred Habbamock later cards preserve evade, firearm, and event effects", () => {
  const source = "translations/zh-cn/pack/investigator/win.json";
  assert.match(card(source, "60326").text, /横置幸运烟盒/);
  assert.match(card(source, "60327").text, /选择以下一项或两项/);
  assert.match(card(source, "60329").text, /改为使用\[agility\]/);
  assert.match(card(source, "60331").text, /重整贝雷塔M1918冲锋枪/);
  assert.match(card(source, "60332").text, /选择以下两项/);
});

test("Stella Clark opening cards preserve failure, difficulty, and key effects", () => {
  const source = "translations/zh-cn/pack/investigator/ste.json";
  assert.match(card(source, "60501").back_text, /牌库构建需求/);
  assert.match(card(source, "60503").text, /发起一次难度至少为4的技能检定/);
  assert.match(card(source, "60506").text, /横置格林童话/);
  assert.match(card(source, "60507").text, /隐蔽值-2/);
  assert.match(card(source, "60512").text, /不抽取混乱标记/);
});

test("Stella Clark later cards preserve exile, failure margins, and bonus effects", () => {
  const source = "translations/zh-cn/pack/investigator/ste.json";
  assert.match(card(source, "60520").text, /放逐它/);
  assert.match(card(source, "60524").text, /失败低于难度3点或更少/);
  assert.match(card(source, "60527").text, /横置奥恩奶奶/);
  assert.match(card(source, "60529").text, /或对受到攻击的敌人造成1点伤害/);
  assert.equal(card(source, "60531").traits, "才能. 诅咒萦绕");
});

test("Fortune and Folly opening cards preserve alert levels and conclusion markup", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88001").text, /X等同于你的警戒等级的一半/);
  assert.match(card(source, "88002").back_text, /<b>\(→结局1\)<\/b>/);
  assert.match(card(source, "88003").text, /一名准备状态的\[\[赌场\]\]敌人/);
});

test("Fortune and Folly early agendas preserve game-location, alert, and exit rules", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88004").back_text, /随机选择1张并结算其文字/);
  assert.match(card(source, "88006").text, /触发一个\[\[游戏\]\]地点/);
  assert.match(card(source, "88007").text, /如果有调查员控制时运泉源，推进/);
  assert.match(card(source, "88008").text, /<b>猎物<\/b> - 控制时运泉源的调查员/);
});

test("Fortune and Folly casino games preserve their card-count and result rules", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88009b").text, /查找遭遇牌库和弃牌堆/);
  assert.match(card(source, "88010").text, /弃掉遭遇牌库顶的5张卡牌/);
  assert.match(card(source, "88011").text, /声明一个颜色和一个大小/);
  assert.match(card(source, "88012").text, /大小总和大于18/);
  assert.equal(card(source, "88013").traits, "开放区域. 赌场. 游戏");
});

test("Fortune and Folly casino access locations preserve their task and movement rules", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88014b").text, /记住你\"赢得邪教的护身符\"/);
  assert.match(card(source, "88015b").text, /共同花费2\[per_investigator\]个线索/);
  assert.match(card(source, "88016").text, /混洗入遭遇牌库/);
  assert.equal(card(source, "88016").traits, "管制区域. 赌场");
});

test("Fortune and Folly restricted areas preserve their task, movement, and relic rules", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88017").text, /从遭遇牌库顶弃掉该数量的卡牌/);
  assert.match(card(source, "88020").text, /共同花费10\[per_investigator\]资源/);
  assert.match(card(source, "88021").text, /最多重调两次/);
  assert.match(card(source, "88022").text, /将其叠加到你的调查员卡牌上/);
});

test("Fortune and Folly role cards preserve their parley and alarm reduction conditions", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88028").text, /横置万人迷/);
  assert.match(card(source, "88028b").text, /一个连接地点的一名\[\[赌场\]\]敌人/);
  assert.match(card(source, "88029").text, /横置打手/);
  assert.equal(card(source, "88029b").traits, "角色. 熟练");
});

test("Fortune and Folly thief and grifter cards preserve patrol and icon changes", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88030").text, /横置神偷/);
  assert.match(card(source, "88030b").text, /至多2个地点外/);
  assert.match(card(source, "88031").text, /改变一个弃掉的游戏图标/);
  assert.match(card(source, "88031b").text, /至多2个弃掉的游戏图标/);
});

test("Fortune and Folly Isamara and cash cart preserve parley and enemy-control effects", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88032").text, /其中X等同于调查员中最高的警戒等级/);
  assert.match(card(source, "88032b").text, /自动躲避你所在地点的所有\[\[赌场\]\]敌人/);
  assert.match(card(source, "88033").text, /将现金推车从游戏中移除/);
});

test("Fortune and Folly Abarran and guards preserve patrol and alarm rules", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88034a").text, /立即推进密谋/);
  assert.match(card(source, "88034b").text, /如果花色为♦，阿巴兰攻击你/);
  assert.match(card(source, "88035a").text, /高注赌桌或守卫室/);
  assert.equal(card(source, "88035c").traits, "类人. 赌场");
});

test("Fortune and Folly casino personnel preserve ready-state and patrol triggers", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88036a").text, /额外花费一次行动/);
  assert.match(card(source, "88037a").text, /赌场交谊厅或监控室/);
  assert.match(card(source, "88037c").text, /巡逻\(逆时针\)/);
});

test("Fortune and Folly questioning treacheries preserve surge, movement, and aloof loss", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88038a").text, /麻烦的质问获得涌动/);
  assert.match(card(source, "88038b").text, /最近的一名非独特\[\[赌场\]\]敌人朝你移动一次/);
  assert.match(card(source, "88038d").text, /失去冷漠，直到本轮结束/);
});

test("Fortune and Folly arcane spotlights preserve attachment and round-end alarm effects", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88039a").text, /附属到最近的、未附属秘法聚光灯的地点/);
  assert.match(card(source, "88039b").text, /一轮结束时/);
  assert.equal(card(source, "88039c").traits, "巫术. 障碍");
});

test("Fortune and Folly greed treacheries preserve their choice and alarm difficulty", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88040a").text, /其中X等同于你警戒等级的一半/);
  assert.match(card(source, "88040b").text, /如果你失败，受到2点恐惧/);
  assert.equal(card(source, "88040c").traits, "诅咒");
});

test("Fortune and Folly suspicious looks preserve their agility choice and alarm damage", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88041a").text, /进行一次\[agility\]\(3\)检定/);
  assert.match(card(source, "88041b").text, /等同于你警戒等级一半的伤害/);
  assert.equal(card(source, "88041c").traits, "阴谋");
});

test("Fortune and Folly gambling addiction preserves its resource check and discard test", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88042a").text, /每位调查员限1张/);
  assert.match(card(source, "88042b").text, /如果本回合你未获得资源/);
  assert.match(card(source, "88042c").text, /弃掉赌博成瘾/);
});

test("Fortune and Folly Isamara and Wellspring assets preserve ready and shift effects", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88044").text, /选择不重整伊萨玛拉·奥多涅斯/);
  assert.match(card(source, "88044").text, /直到伊萨玛拉·奥多涅斯重整或离场/);
  assert.match(card(source, "88045").text, /选择其中一个结算，并忽略另一个混乱标记/);
  assert.match(card(source, "88045b").text, /<i>\(结算这两个\)<\/i>/);
  assert.equal(card(source, "88045b").traits, "不稳定");
});

test("Fortune and Folly cultist guards preserve suit-based damage prevention and bonus damage", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88046a").text, /如果其花色为♥，取消该伤害中的1点/);
  assert.match(card(source, "88046b").text, /巡逻\(顺时针\)/);
  assert.match(card(source, "88047a").text, /每有一张带♣花色的卡牌/);
  assert.equal(card(source, "88047b").traits, "类人. 赌场. 异教徒");
});

test("Fortune and Folly extradimensional enemies preserve repeated-action and facedown-spawn effects", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88048").text, /同一阶段连续执行同一种行动两次/);
  assert.match(card(source, "88049a").text, /将你牌库顶的1张卡牌面朝下放置入场/);
  assert.match(card(source, "88049b").text, /如果该敌人与你解除交战，弃掉它/);
});

test("Fortune and Folly extradimensional usurpers preserve their replacement spawn effect", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88050a").text, /未叠加遭遇卡牌的非独特\[\[赌场\]\]敌人/);
  assert.match(card(source, "88050b").text, /并使其获得涌动/);
});

test("Fortune and Folly extradimensional hypnosis preserves its move-cancel cost", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88051a").text, /作为你离开被附属地点的额外费用/);
  assert.match(card(source, "88051b").text, /取消移动效果/);
  assert.match(card(source, "88051c").text, /弃掉异空间催眠/);
});

test("Fortune and Folly alien grasp preserves its move-reduced end-of-turn damage", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88052a").text, /本回合你每移动一次，便减少1点该伤害/);
  assert.match(card(source, "88052b").text, /弃掉异界攫取/);
  assert.equal(card(source, "88052c").traits, "危险");
});

test("Fortune and Folly hunter hunger preserves its ally-or-agility choice", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88053a").text, /弃掉你控制的一张\[\[盟友\]\]支援/);
  assert.match(card(source, "88053b").text, /受到1点直接伤害和1点直接恐惧/);
});

test("Fortune and Folly turn agenda preserves its set-aside enemy and encounter-set shuffle", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88003").back_text, /生成到轮盘赌桌/);
  assert.match(card(source, "88003").back_text, /<i>无序计划<\/i>遭遇组混洗入遭遇牌库/);
});

test("Fortune and Folly access backs preserve team clue costs and vault prerequisites", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88019").back_text, /共同花费2\[per_investigator\]个线索/);
  assert.match(card(source, "88021").back_text, /至少4项任务/);
  assert.match(card(source, "88022").back_text, /共同花费4\[per_investigator\]个线索/);
});

test("Fortune and Folly task checklist preserves both-part task names and eliminated-clue handling", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88023").back_text, /至少完成4项任务才能打开金库大门/);
  assert.match(card(source, "88023").text, /说服伊萨玛拉参与劫案/);
  assert.match(card(source, "88023").text, /将该调查员的所有线索放到本剧情卡牌上/);
});

test("Fortune and Folly uniform story card preserves its attached-enemy attack and removal rules", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88024").text, /本次攻击只能对被叠加的敌人执行/);
  assert.match(card(source, "88024").text, /请记住你\"取得员工制服\"/);
  assert.match(card(source, "88024").text, /弃掉被叠加的敌人。从游戏中移除本剧情卡牌/);
});

test("Fortune and Folly misfortune stories preserve their flip-and-resolve instruction", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88025").text, /将本卡牌翻到背面，并结算另一面的文字/);
  assert.match(card(source, "88026").text, /伊萨玛拉警告过你/);
  assert.match(card(source, "88027").text, /劫案进行途中/);
});

test("Fortune and Folly destiny deck preserves the once-per-game draw and all listed outcomes", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88043").text, /从命运牌库移除，直到剧本结束/);
  assert.match(card(source, "88043b").text, /你可以在本回合进行额外3次行动/);
  assert.match(card(source, "88043b").text, /将其从游戏中移除/);
  assert.match(card(source, "88043b").text, /视为\[auto_fail\]/);
});

test("Fortune and Folly package story preserves patrol replacement and facedown asset recovery", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88024").back_text, /巡逻地点改为金库大门/);
  assert.match(card(source, "88024").back_text, /请记住你\"运送诱饵包裹\"/);
  assert.match(card(source, "88024").back_text, /在你的控制之下/);
});

test("Fortune and Folly blackout story preserves lighting penalties and both restoration choices", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88025").back_text, /作为触发本地点上能力的额外费用/);
  assert.match(card(source, "88025").back_text, /恢复公共区域的电力/);
  assert.match(card(source, "88025").back_text, /恢复员工区域的电力/);
});

test("Fortune and Folly accident story preserves all suit-specific action restrictions", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88026").back_text, /每回合只能执行一次移动行动/);
  assert.match(card(source, "88026").back_text, /每回合只能执行一次调查行动/);
  assert.match(card(source, "88026").back_text, /每回合只能执行一次攻击行动/);
  assert.match(card(source, "88026").back_text, /每回合只能执行一次启动行动/);
});

test("Fortune and Folly personal vendetta preserves its team cost and horror threshold", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88027").back_text, /共同花费1\[per_investigator\]个线索/);
  assert.match(card(source, "88027").back_text, /本剧情卡牌上有6点或更多恐惧/);
  assert.match(card(source, "88027").back_text, /每位调查员受到2点直接恐惧/);
});

test("Fortune and Folly relic recovery preserves both Abarran branches and agility test", () => {
  const source = "translations/zh-cn/pack/side/fof_encounter.json";
  assert.match(card(source, "88007").back_text, /如果阿巴兰·阿里戈里亚加仍在场/);
  assert.match(card(source, "88007").back_text, /移动到遗物室/);
  assert.match(card(source, "88007").back_text, /每位调查员必须进行一次\[agility\]\(3\)检定/);
});

test("Guardians of the Abyss opening chaos card preserves strength thresholds on both sides", () => {
  const source = "translations/zh-cn/pack/side/guardians_encounter.json";
  assert.match(card(source, "83001").text, /深渊之力的强度为3或更低/);
  assert.match(card(source, "83001").back_text, /深渊之力的强度\+1/);
  assert.match(card(source, "83001").back_text, /无视你的技能值所有正值修正/);
});

test("Guardians of the Abyss Jessie request preserves team spawning and Brotherhood removal", () => {
  const source = "translations/zh-cn/pack/side/guardians_encounter.json";
  assert.match(card(source, "83002").text, /共同花费1\[per_investigator\]个线索/);
  assert.match(card(source, "83002").back_text, /放到冒险辅助卡下方/);
  assert.match(card(source, "83002").back_text, /混洗入遭遇牌库/);
});

test("Guardians of the Abyss curse agenda preserves its strength reset and discard shuffle", () => {
  const source = "translations/zh-cn/pack/side/guardians_encounter.json";
  assert.match(card(source, "83003").text, /将深渊之力的强度设为1/);
  assert.match(card(source, "83003").back_text, /遭遇弃牌堆混洗入遭遇牌库/);
  assert.match(card(source, "83003").back_text, /深渊之力增强1点/);
});

test("Guardians of the Abyss shadow agenda preserves its two-strength reset and defeat outcome", () => {
  const source = "translations/zh-cn/pack/side/guardians_encounter.json";
  assert.match(card(source, "83004").text, /深渊之力的强度为0或1/);
  assert.match(card(source, "83004").text, /将深渊之力的强度设为2/);
  assert.match(card(source, "83004").back_text, /<i>\"被深渊吞没\"<\/i>/);
});

test("Guardians of the Abyss sleeping curse preserves evidence advance and exploration setup", () => {
  const source = "translations/zh-cn/pack/side/guardians_encounter.json";
  assert.match(card(source, "83005").text, /胜利牌区中有6张\[\[证据\]\]卡牌/);
  assert.match(card(source, "83005").back_text, /混洗入探索牌库/);
  assert.match(card(source, "83005").back_text, /每位调查员失去自己所有线索/);
});

test("Guardians of the Abyss desert agenda preserves exploration and dreamer marker setup", () => {
  const source = "translations/zh-cn/pack/side/guardians_encounter.json";
  assert.match(card(source, "83006").text, /线索不能放置在\[\[开罗\]\]地点/);
  assert.match(card(source, "83006").text, /抽取探索牌库顶的1张卡牌/);
  assert.match(card(source, "83006").back_text, /代表\"沉梦者\"/);
  assert.match(card(source, "83006").back_text, /位于开罗街道/);
});

test("Guardians of the Abyss judgment agenda preserves dreamer damage and two conclusions", () => {
  const source = "translations/zh-cn/pack/side/guardians_encounter.json";
  assert.match(card(source, "83007").text, /将一个沉梦者从你所在地点移动到奈斯上/);
  assert.match(card(source, "83007").back_text, /<b>\(→结局1\)<\/b>/);
  assert.match(card(source, "83007").back_text, /<b>\(→结局2\)<\/b>/);
});

test("Guardians of the Abyss Cairo streets and bazaar preserve clue and cost effects", () => {
  const source = "translations/zh-cn/pack/side/guardians_encounter.json";
  assert.match(card(source, "83008").text, /发现2个或更多线索后/);
  assert.match(card(source, "83008").text, /进行一次\[agility\]\(4\)检定/);
  assert.match(card(source, "83009").text, /每张\[\[道具\]\]支援费用减少1/);
  assert.equal(card(source, "83009").traits, "开罗");
});

test("Guardians of the Abyss museum and outskirts preserve their threshold and retreat rules", () => {
  const source = "translations/zh-cn/pack/side/guardians_encounter.json";
  assert.match(card(source, "83010").text, /未成功超过难度至少2点/);
  assert.match(card(source, "83010").text, /立即结束你的回合/);
  assert.match(card(source, "83011").text, /弃掉你手牌中的5张卡牌/);
  assert.match(card(source, "83011").text, /把沉梦者留在无法醒来的梦魇之中/);
});

test("Guardians of the Abyss temple and Nahs preserve aloof loss and dreamer damage cancellation", () => {
  const source = "translations/zh-cn/pack/side/guardians_encounter.json";
  assert.match(card(source, "83012").text, /每名谦恭教徒失去冷漠/);
  assert.match(card(source, "83013").text, /<i>\"被深渊吞没\"<\/i>/);
  assert.match(card(source, "83013").text, /取消奈斯将要受到的1点伤害/);
});

test("Guardians of the Abyss cultist and creature enemies preserve protection and strength thresholds", () => {
  const source = "translations/zh-cn/pack/side/guardians_encounter.json";
  assert.match(card(source, "83014").text, /不能被攻击，也不会受到伤害/);
  assert.match(card(source, "83014").text, /朝最近的\[\[兄弟会\]\]敌人移动一次/);
  assert.match(card(source, "83015").text, /强度为2或更低/);
  assert.match(card(source, "83015").text, /强度为5或更高/);
});

test("Guardians of the Abyss Night's Usurper chaos card preserves both difficulty sides", () => {
  const source = "translations/zh-cn/pack/side/guardians_encounter.json";
  assert.match(card(source, "83016").text, /强度为3或更低/);
  assert.match(card(source, "83016").text, /强度为4或更高/);
  assert.match(card(source, "83016").back_text, /强度\+1/);
  assert.match(card(source, "83016").back_text, /强度为5或更低/);
});

test("Guardians of the Abyss Brotherhood revenge preserves spawn order and ignored spawn text", () => {
  const source = "translations/zh-cn/pack/side/guardians_encounter.json";
  assert.match(card(source, "83017").back_text, /按玩家顺序/);
  assert.match(card(source, "83017").back_text, /距离探险营地最远的无人地点/);
  assert.match(card(source, "83017").back_text, /<i>\(无视这些敌人上的所有\"<b>生成<\/b>\"指示。\)<\/i>/);
});

test("Guardians of the Abyss dark agenda preserves parley prohibition and doom thresholds", () => {
  const source = "translations/zh-cn/pack/side/guardians_encounter.json";
  assert.match(card(source, "83018").text, /不能和\[\[兄弟会\]\]敌人<b>谈判<\/b>/);
  assert.match(card(source, "83018").text, /第4个或第8个毁灭标记/);
  assert.match(card(source, "83018").back_text, /<b>\(→结局1\)<\/b>/);
});

test("Guardians of the Abyss entrance search preserves exploration and horror-gate setup", () => {
  const source = "translations/zh-cn/pack/side/guardians_encounter.json";
  assert.match(card(source, "83019").text, /抽取探索牌库顶的一张卡牌/);
  assert.match(card(source, "83019").back_text, /异界之门混洗入探索牌库/);
});

test("Guardians of the Abyss entry agenda preserves dream-world replacement and Ankha reaction", () => {
  const source = "translations/zh-cn/pack/side/guardians_encounter.json";
  assert.match(card(source, "83020").text, /每位未被击败的调查员都位于异界之门/);
  assert.match(card(source, "83020").back_text, /将所有其它地点移出游戏/);
  assert.match(card(source, "83020").back_text, /骇人的夏塔克鸟和遭遇弃牌堆一起混洗入遭遇牌库/);
  assert.match(card(source, "83020").back_text, /横置伊扎法拉/);
});

test("Guardians of the Abyss Night's Usurper act preserves its advance requirements", () => {
  const source = "translations/zh-cn/pack/side/guardians_encounter.json";
  assert.match(card(source, "83021").text, /伊扎法拉已横置/);
  assert.match(card(source, "83021").back_text, /<b>\(→结局2\)<\/b>/);
  assert.match(card(source, "83021").back_text, /深渊之力必须为4或更低/);
  assert.match(card(source, "83021").back_text, /"解救了夜魇"、"警告了萨尔科曼德的居民"、"寻求了帮助"/);
});

test("Guardians of the Abyss Dreamlands locations preserve their conditional and choice effects", () => {
  const source = "translations/zh-cn/pack/side/guardians_encounter.json";
  assert.match(card(source, "83022a").text, /成功调查梦境之间后/);
  assert.match(card(source, "83022b").text, /恩格拉内克山下的隧道、通往萨尔科曼德的阶梯和迷雾洞穴/);
  assert.match(card(source, "83023b").text, /深渊之力减弱2点/);
  assert.match(card(source, "83023b").text, /深渊之力增强2点/);
  assert.match(card(source, "83024b").text, /控制放在一边的召来的夜魇支援/);
  assert.match(card(source, "83024b").text, /"处决了夜魇"/);
});

test("Guardians of the Abyss deeper Dreamlands locations preserve named outcomes and final gate", () => {
  const source = "translations/zh-cn/pack/side/guardians_encounter.json";
  assert.match(card(source, "83025b").text, /"警告了萨尔科曼德的居民"/);
  assert.match(card(source, "83025b").text, /"切断了一切退路"/);
  assert.match(card(source, "83026b").text, /"触怒了这片领域的主人"/);
  assert.match(card(source, "83027a").text, /猎手。反击。/);
  assert.match(card(source, "83027b").text, /<b>\(→结局3\)<\/b>/);
  assert.equal(card(source, "83028").name, "异界之门");
});

test("Guardians of the Abyss supporting enemies and evidence preserve their state and task references", () => {
  const source = "translations/zh-cn/pack/side/guardians_encounter.json";
  assert.match(card(source, "83029").text, /处于重整状态时/);
  assert.match(card(source, "83030").text, /黑法老的代言人获得猎手/);
  assert.match(card(source, "83031a").text, /合计至少具有4个\[willpower\]图标/);
  assert.match(card(source, "83031b").text, /"发现了一块古代石板"/);
  assert.match(card(source, "83031b").text, /将深渊之力减弱1点/);
});

test("Guardians of the Abyss Brotherhood evidence preserves its linked tasks and costs", () => {
  const source = "translations/zh-cn/pack/side/guardians_encounter.json";
  assert.match(card(source, "83032a").text, /处于重整状态的\[\[怪物\]\]敌人/);
  assert.match(card(source, "83032b").text, /"破坏了火车"/);
  assert.match(card(source, "83033a").text, /以此方式每受到1点恐惧，本次检定难度-2/);
  assert.match(card(source, "83033b").text, /"找到了一扇用血标记的门"/);
  assert.match(card(source, "83034a").text, /以此方式每花费1个资源，本次检定难度-1/);
  assert.match(card(source, "83034b").text, /"闯入一间废弃的神庙"/);
  assert.match(card(source, "83035a").text, /处于敌军阶段，改为伤害\+2、恐惧\+2/);
});

test("Guardians of the Abyss expedition, treachery, and ally cards preserve their core effects", () => {
  const source = "translations/zh-cn/pack/side/guardians_encounter.json";
  assert.match(card(source, "83037").text, /以随机顺序放回牌库顶/);
  assert.match(card(source, "83045").text, /"被深渊吞没"/);
  assert.match(card(source, "83051").text, /深渊之力减弱后：弃掉沉睡/);
  assert.match(card(source, "83054").text, /恰好低于难度3点，本轮不能打出卡牌/);
  assert.match(card(source, "83058").text, /<b>躲避<\/b>/);
});

test("Carnevale masks and lagoon enemies preserve their distinct skill and spawn effects", () => {
  const source = "translations/zh-cn/pack/side/coh_encounter.json";
  assert.match(card(source, "82023").text, /使用\[combat\]，而非指定技能/);
  assert.match(card(source, "82026").text, /下一张支援视为具有快速/);
  assert.match(card(source, "82027").text, /遭遇牌库和遭遇弃牌堆/);
  assert.match(card(source, "82028").text, /控制无辜的狂欢者最多的目标/);
});

test("Machinations Through Time's uneasy alliance preserves Edwin's negotiation and victory condition", () => {
  const source = "translations/zh-cn/pack/side/mtt_encounter.json";
  assert.match(card(source, "87035").back_text, /艾德温·贝内特位于你所在地点且处于准备状态/);
  assert.match(card(source, "87035").back_text, /如果你失败，将其横置/);
  assert.match(card(source, "87035").back_text, /\"托马斯和玛丽获得了诺贝尔奖。\"/);
  assert.match(card(source, "87035").back_text, /任意时代的场上都没有\[\[情节\]\]剧情卡牌/);
});

test("War of the Outer Gods opening cards preserve group thresholds and the seal conclusion", () => {
  const source = "translations/zh-cn/pack/side/wog_encounter.json";
  assert.match(card(source, "86001").text, /简单 \/ 普通/);
  assert.match(card(source, "86002").text, /全局毁灭阈值为每组6点/);
  assert.match(card(source, "86011").text, /场上没有\[\[异教徒\]\]敌人/);
  assert.match(card(source, "86012").back_text, /<b>\(→结局1\)<\/b>/);
});

test("War of the Outer Gods bosses preserve their global pools and swarm-card effects", () => {
  const source = "translations/zh-cn/pack/side/wog_encounter.json";
  assert.match(card(source, "86041").text, /全局生命值为8\[per_investigator\]/);
  assert.match(card(source, "86046").text, /每名红色敌人失去冷漠和交兵，并获得猎手/);
  assert.match(card(source, "86047").text, /正面朝下放在一名\[\[昆虫\]\]敌人下方，作为蜂拥卡牌/);
  assert.match(card(source, "86054").text, /从阿卡特之刃上移除至多3个资源/);
});

test("Murder at the Excelsior Hotel preserves police pressure and culprit objectives", () => {
  const source = "translations/zh-cn/pack/side/hotel_encounter.json";
  assert.match(card(source, "84009").text, /将其所在地点的1个线索移到阿卡姆警官上，并将其翻至毁灭面/);
  assert.match(card(source, "84023").text, /按玩家顺序/);
  assert.match(card(source, "84043").text, /复仇幽魂已横置且位于你所在地点/);
  assert.match(card(source, "84052").text, /本密谋上没有毁灭标记/);
});

test("The Drowned City reversible locations retain their translated back subtitles", () => {
  const source = "translations/zh-cn/pack/eoe/eoec.json";
  assert.equal(card(source, "08630").back_subname, "深渊入口");
  assert.equal(card(source, "08649").back_subname, "远古封印");
  assert.equal(card(source, "08686").back_subname, "出逃之路");
});

test("The Drowned City does not retain Traditional Chinese forms in card text", () => {
  const source = "translations/zh-cn/pack/eoe/eoec.json";
  for (const code of ["08531", "08553", "08571b", "08573b", "08577", "08630"]) {
    const entry = card(source, code);
    for (const value of Object.values(entry)) {
      if (typeof value === "string") assert.doesNotMatch(value, /[內紙爭橫決屜]/);
    }
  }
});

test("Simplified Chinese card data excludes identified Traditional Chinese residues", () => {
  const traditionalResidues = /服裝|塔羅|該卡|夜盜|圖標|图標|不計算在內|哈斯塔的領域|哈斯塔剩餘|已橫置|戲院中充滿了笑聲|守護|總算找到了|中獎了|無論死活|卡納瑪戈斯|等級0-2|內心|封印內|將该|漢克|異教徒|異界|出來|溫莎宮|未來|棄野猫|敘述|無知是福|會不惜|們卻|遭遇組/;
  for (const file of packJsonFiles(path.join(root, "translations/zh-cn/pack"))) {
    const cards = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const cardEntry of cards) {
      for (const value of Object.values(cardEntry)) {
        if (typeof value === "string") assert.doesNotMatch(value, traditionalResidues);
      }
    }
  }
});

test("11011 keeps its deckbuilding back text in Simplified Chinese", () => {
  const backText = card("translations/zh-cn/pack/tdc/tdcp.json", "11011").back_text;
  assert.match(backText, /<b>牌库卡牌张数<\/b>：30。/);
  assert.match(backText, /“提琴”盒、没收、1张随机基础弱点。/);
  assert.doesNotMatch(backText, /[組構級屬槍計隨]/);
});

test("Parallel cards preserve their English numeric rules", () => {
  const lily = card("translations/zh-cn/pack/parallel/ltr.json", "90049").back_text;
  assert.match(lily, /9张不同的\[\[盟友\]\]支援/);

  const path = card("translations/zh-cn/pack/parallel/rop_encounter.json", "90068").back_text;
  assert.match(path, /每张已揭示地点上放置1\[per_investigator\]个线索/);
  assert.doesNotMatch(path, /最多3张/);

  const agnes = card("translations/zh-cn/pack/parallel/bad_encounter.json", "90020").back_text;
  assert.match(agnes, /\[cultist\]：-3。/);
});

test("89005 lists only the chaos-token devour effects in its English source", () => {
  const source = "translations/zh-cn/pack/side/blbe.json";
  const text = card(source, "89005").text;
  assert.match(text, /<b>-5<\/b>：……你选择的手牌中3张卡牌。/);
  assert.doesNotMatch(text, /<b>-6<\/b>|\[auto_fail\]/);
  const reverse = card(source, "89005b");
  assert.ok(reverse);
  assert.match(reverse.text, /<b>-6<\/b>：……每位调查员手牌中的所有事件。/);
});

test("90030 reloads only when no clues remain at Roland's location", () => {
  const text = card("translations/zh-cn/pack/parallel/btb.json", "90030").text;
  assert.match(text, /且你所在地点没有线索，在本支援上放置1子弹。/);
});

test("Parallel Lola cards have Simplified Chinese coverage", () => {
  assert.ok(fs.existsSync(path.join(root, "translations/zh-cn/pack/parallel/enc.json")));
  assert.ok(fs.existsSync(path.join(root, "translations/zh-cn/pack/parallel/enc_encounter.json")));
});

test("70033b through 70038b have Simplified Chinese resolution cards", () => {
  const source = "translations/zh-cn/pack/side/lol_encounter.json";
  assert.ok(card(source, "70033b"));
  assert.ok(card(source, "70034b"));
  assert.ok(card(source, "70035b"));
  assert.ok(card(source, "70036b"));
  assert.ok(card(source, "70037b"));
  assert.ok(card(source, "70038b"));
});

test("Machinations Through Time back-side story cards have Simplified Chinese coverage", () => {
  const source = "translations/zh-cn/pack/side/mtt_encounter.json";
  for (const code of ["87006b", "87015b", "87024b", "87033b", "87034b", "87035b", "87038b", "87039b", "87042b"]) {
    assert.ok(card(source, code));
  }
});

test("War of the Outer Gods alternate enemy sides have Simplified Chinese coverage", () => {
  const source = "translations/zh-cn/pack/side/wog_encounter.json";
  for (const code of ["86038a", "86044a", "86049a"]) assert.ok(card(source, code));
});

test("Film Fatale has complete Simplified Chinese card coverage", () => {
  const source = "translations/zh-cn/pack/side/film_fatale_encounter.json";
  for (const code of ["72001", "72002", "72003", "72004", "72005", "72006", "72007", "72008", "72008b", "72009", "72010", "72011", "72012", "72013", "72014", "72015", "72016", "72017", "72018", "72019", "72020", "72021", "72022", "72023", "72024", "72025", "72026", "72027", "72028", "72029", "72030", "72031", "72032", "72032b", "72033", "72034", "72035", "72036", "72036b", "72037", "72038", "72039", "72040", "72041", "72042", "72043", "72044", "72044b", "72045", "72046", "72047", "72048", "72049", "72050", "72051", "72052", "72053", "72054", "72055", "72055b", "72056", "72057", "72058", "72059"]) assert.ok(card(source, code));
});

test("The Drowned City campaign has complete Simplified Chinese card coverage", () => {
  const source = JSON.parse(fs.readFileSync(path.join(root, "pack/tdc/tdcc.json"), "utf8"));
  const translated = JSON.parse(fs.readFileSync(path.join(root, "translations/zh-cn/pack/tdc/tdcc.json"), "utf8"));
  const translatedCodes = new Set(translated.map((entry) => String(entry.code)));

  for (const entry of source) assert.ok(translatedCodes.has(String(entry.code)), entry.code);
});

//merge data files from default English with each locale found in translations directory

const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const mkdirp = require('mkdirp');

const [bin, script, locale] = process.argv;

const i18nDir = path.join(__dirname, 'translations');
const things = ['cycles', 'encounters', 'factions', 'packs', 'types', 'subtypes', 'campaigns', 'scenarios'];

const stripProps = (json, props) => _.map(json, item => _.pick(item, props));

const loadThings = function(root) {
    const result = {};
    for (let thing of things) {
        const file = `${thing}.json`;
        const filepath = path.join(root, file);
        try {
            const json = JSON.parse(fs.readFileSync(filepath, 'UTF-8'));
            result[file] = stripProps(json, ["code", "name"]);
        } catch (error) {}
    }
    return result;
};


const loadCards = function(root) {
    const result = {};
    const localeRoot = path.join(root, 'pack');
    try {
        fs.mkdirSync(localeRoot);
    } catch (error3) {}
    const files = fs.readdirSync(localeRoot);
    for (let file of files) {
        var error, fileContents, json;
        if (file.endsWith('.DS_Store')) { continue; }

        const stat = fs.statSync(path.join(localeRoot, file));
        if (stat.isDirectory()) {
            const pack_files = fs.readdirSync(path.join(localeRoot, file));
            for (let pack_file of pack_files) {
                if (!pack_file.endsWith('.json')) { continue; }
                //console.log "Reading #{path.join(localeRoot, file, pack_file)}"
                fileContents = fs.readFileSync(path.join(localeRoot, file, pack_file), 'UTF-8');
                if (!!fileContents.trim()) {
                    try {
                        json = JSON.parse(fileContents);
                        json = json.filter(card => !!!card.duplicate_of);
                        result[`${path.join(file, pack_file)}`] = stripProps(json, ['code', 'flavor', 'name', 'subname', 'customization_text', 'customization_change', 'text', 'traits', 'back_name', 'back_flavor', 'back_text', 'slot']);
                    } catch (error1) {
                        error = error1;
                        console.error(`Failed to parse JSON for file: ${path.join(localeRoot, file)}`);
                        console.error(error);
                    }
                }
            }
        } else {
            //console.log "Reading regular #{path.join(localeRoot, file)}"
            fileContents = fs.readFileSync(path.join(localeRoot, file), 'UTF-8');
            if (!!fileContents.trim()) {
                try {
                    json = JSON.parse(fileContents);
                    result[file] = stripProps(json, ['code', 'flavor', 'name', 'subname', 'customization_text', 'customization_change', 'text', 'traits', 'back_name', 'back_flavor', 'back_text', 'slot']);
                } catch (error2) {
                    error = error2;
                    console.error(`Failed to parse JSON for file: ${path.join(localeRoot, file)}`);
                    console.error(error);
                }
            }
        }
    }
    return result;
};

const merge_data = function(defaultLocale, locale) {
    const result = {};
    for (let file of _.union(_.keys(defaultLocale), _.keys(locale))) {
        result[file] = _(_.merge({}, _.keyBy(defaultLocale[file] || {}, 'code'), _.keyBy(locale[file] || {}, 'code'))).values().sortBy('code').value();
    }
    return result;
};

const things_en = loadThings(__dirname);
const cards_en = loadCards(__dirname);

const codes = fs.readdirSync(i18nDir);
for (let code of codes) {
    if ((locale == null) || (code === locale)) {var file, target;
    
        console.log(`Updating locale '${code}'...`);
        const localeRoot = path.join(i18nDir, code);

        const l_things = loadThings(localeRoot);
        const l_cards = loadCards(localeRoot);

        const m_things = merge_data(things_en, l_things);
        const m_cards = merge_data(cards_en, l_cards);

        for (file of _.keys(m_things)) {
            target = path.join(localeRoot, file);
            mkdirp.sync(path.dirname(target));
            if (!_.isEqual(l_things[file], m_things[file])) {
                fs.writeFileSync(target, JSON.stringify(m_things[file], null, 4)+"\n");
                console.log(`Written ${target}`);
            }
        }

        for (file of _.keys(m_cards)) {
            target = path.join(localeRoot, 'pack', file);
            mkdirp.sync(path.dirname(target));
            if (!_.isEqual(l_cards[file], m_cards[file])) {
                fs.writeFileSync(target, JSON.stringify(m_cards[file], null, 4)+"\n");
                console.log(`Written ${target}`);
            }
        }
    }
}
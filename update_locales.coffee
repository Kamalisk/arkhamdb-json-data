#merge data files from default English with each locale found in translations directory

fs = require 'fs'
path = require 'path'
_ = require 'lodash'
mkdirp = require 'mkdirp'

[bin, script, locale] = process.argv

i18nDir = path.join __dirname, 'translations'
things = ['cycles', 'encounters', 'factions', 'packs', 'types', 'subtypes', 'campaigns', 'scenarios']

stripProps = (json, props) ->
    _.map json, (item) ->
        _.pick item, props

loadThings = (root) ->
    result = {}
    for thing in things
        file = "#{thing}.json"
        filepath = path.join(root, file)
        try
            json = JSON.parse fs.readFileSync(filepath, 'UTF-8')
            result[file] = stripProps json, ["code", "name"]
    result


loadCards = (root) ->
    result = {}
    localeRoot = path.join root, 'pack'
    try
        fs.mkdirSync(localeRoot)
    files = fs.readdirSync localeRoot
    for file in files
        stat = fs.statSync(path.join(localeRoot, file))
        if stat.isDirectory()
            pack_files = fs.readdirSync(path.join(localeRoot, file))
            for pack_file in pack_files
                #console.log "Reading #{path.join(localeRoot, file, pack_file)}"
                fileContents = fs.readFileSync(path.join(localeRoot, file, pack_file), 'UTF-8')
                if !!fileContents.trim()
                    json = JSON.parse fileContents
                    result["#{path.join(file, pack_file)}"] = stripProps json, ['code', 'flavor', 'name', 'subname', 'text', 'traits', 'back_name', 'back_flavor', 'back_text', 'slot']
        else
            #console.log "Reading regular #{path.join(localeRoot, file)}"
            fileContents = fs.readFileSync(path.join(localeRoot, file), 'UTF-8')
            if !!fileContents.trim()
                json = JSON.parse fileContents
                result[file] = stripProps json, ['code', 'flavor', 'name', 'subname', 'text', 'traits', 'back_name', 'back_flavor', 'back_text', 'slot']
    result

merge_data = (defaultLocale, locale) ->
    result = {}
    for file in _.union(_.keys(defaultLocale), _.keys(locale))
        result[file] = _(_.merge({}, _.keyBy(defaultLocale[file] or {}, 'code'), _.keyBy(locale[file] or {}, 'code'))).values().sortBy('code').value()
    result


things_en = loadThings __dirname
cards_en = loadCards __dirname

codes = fs.readdirSync i18nDir
for code in codes when not locale? or code is locale
    console.log "Updating locale '#{code}'..."
    localeRoot = path.join i18nDir, code

    l_things = loadThings localeRoot
    l_cards = loadCards localeRoot

    m_things = merge_data(things_en, l_things)
    m_cards = merge_data(cards_en, l_cards)

    for file in _.keys m_things
        target = path.join localeRoot, file
        mkdirp path.dirname target
        if !_.isEqual(l_things[file], m_things[file])
            fs.writeFileSync target, JSON.stringify(m_things[file], null, 4)+"\n"
            console.log "Written #{target}"
    
    for file in _.keys m_cards
        target = path.join localeRoot, 'pack', file
        mkdirp path.dirname target
        if !_.isEqual(l_cards[file], m_cards[file])
            fs.writeFileSync target, JSON.stringify(m_cards[file], null, 4)+"\n"
            console.log "Written #{target}"

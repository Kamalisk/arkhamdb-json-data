#!/usr/bin/env python

import argparse
import json
import jsonschema
import os
import sys
import re

PACK_DIR="pack"
SCHEMA_DIR="schema"
formatting_errors = 0
validation_errors = 0

def check_dir_access(path):
    if not os.path.isdir(path):
        sys.exit("%s is not a valid path" % path)
    elif os.access(path, os.R_OK):
        return
    else:
        sys.exit("%s is not a readable directory")

def check_file_access(path):
    if not os.path.isfile(path):
        return False;
    elif os.access(path, os.R_OK):
        return True
    else:
        return False

def check_json_schema(args, data, path):
    global validation_errors
    try:
        jsonschema.Draft4Validator.check_schema(data)
        return True
    except jsonschema.exceptions.SchemaError as e:
        verbose_print(args, "%s: Schema file is not valid Draft 4 JSON schema.\n" % path, 0)
        validation_errors += 1
        verbose_print(args, "%s\n" % e.message, 0)
        return False

def custom_card_check(args, card, pack_code, factions_data, types_data):
    "Performs more in-depth sanity checks than jsonschema validator is capable of. Assumes that the basic schema validation has already completed successfully."
    if card["pack_code"] != pack_code:
        raise jsonschema.ValidationError("Pack code '%s' of the card '%s' doesn't match the pack code '%s' of the file it appears in." % (card["pack_code"], card["code"], pack_code))
    if card["faction_code"] not in [f["code"] for f in factions_data]:
        raise jsonschema.ValidationError("Faction code '%s' of the pack '%s' doesn't match any valid faction code." % (card["faction_code"], card["code"]))
    if card["type_code"] not in [f["code"] for f in types_data]:
        raise jsonschema.ValidationError("Faction code '%s' of the pack '%s' doesn't match any valid type code." % (card["type_code"], card["code"]))
    
def custom_pack_check(args, pack, cycles_data):
   if pack["cycle_code"] not in [c["code"] for c in cycles_data]:
        raise jsonschema.ValidationError("Cycle code '%s' of the pack '%s' doesn't match any valid cycle code." % (pack["cycle_code"], pack["code"]))

def format_json(json_data):
    formatted_data = json.dumps(json_data, ensure_ascii=False, sort_keys=True, indent=4, separators=(',', ': '))
    formatted_data = formatted_data.replace(u"\u2018", "'").replace(u"\u2019", "'")
    formatted_data = formatted_data.replace(u"\u2212", "-").replace(u"\u2013", "-")
    formatted_data = formatted_data.replace("\\r\\n", "\\n").replace(" \\n", "\\n") 
    formatted_data = formatted_data.replace("    ", "\t")
    formatted_data += "\n"
    return formatted_data

def load_json_file(args, path):
    global formatting_errors
    global validation_errors
    try:
        with open(path, "rb") as data_file:
            bin_data = data_file.read()
        raw_data = bin_data.decode("utf-8")
        json_data = json.loads(raw_data)
    except ValueError as e:
        verbose_print(args, "%s: File is not valid JSON.\n" % path, 0)
        validation_errors += 1
        verbose_print(args, "%s\n" % e.message, 0)
        return None

    verbose_print(args, "%s: Checking JSON formatting...\n" % path, 1)
    formatted_raw_data = format_json(json_data)
   
    if "<sup>" in formatted_raw_data:
        verbose_print(args, "%s: File contains invalid content (<sup>)\n" % path, 0)
        validation_errors += 1
        return None
    
    if formatted_raw_data != raw_data:
        ##verbose_print(args, "%s: File is not correctly formatted JSON.\n" % path, 0)
        formatting_errors += 0
        if args.fix_formatting and len(formatted_raw_data) > 0:
            verbose_print(args, "%s: Fixing JSON formatting...\n" % path, 0)
            try:
                with open(path, "wb") as json_file:
                    bin_formatted_data = formatted_raw_data.encode("utf-8")
                    json_file.write(bin_formatted_data)
            except IOError as e:
                verbose_print(args, "%s: Cannot open file to write.\n" % path, 0)
                print(e)
    return json_data

def load_cycles(args):
    verbose_print(args, "Loading cycle index file...\n", 1)
    cycles_path = os.path.join(args.base_path, "cycles.json")
    cycles_data = load_json_file(args, cycles_path)

    if not validate_cycles(args, cycles_data):
        return None

    return cycles_data

def load_packs(args, cycles_data):
    verbose_print(args, "Loading pack index file...\n", 1)
    packs_path = os.path.join(args.base_path, "packs.json")
    packs_data = load_json_file(args, packs_path)

    if not validate_packs(args, packs_data, cycles_data):
        return None

    for p in packs_data:
        if p["cycle_code"] == "promotional":
            p["cycle_code"] = "promo"
        pack_filename = "{}.json".format(p["code"])
        pack_path = os.path.join(args.pack_path, p["cycle_code"], pack_filename)
        p['player'] = check_file_access(pack_path)
        pack_filename = "{}_encounter.json".format(p["code"])
        pack_path = os.path.join(args.pack_path, p["cycle_code"], pack_filename)
        p['encounter'] = check_file_access(pack_path)

    return packs_data

def load_factions(args):
    verbose_print(args, "Loading faction index file...\n", 1)
    factions_path = os.path.join(args.base_path, "factions.json")
    factions_data = load_json_file(args, factions_path)

    if not validate_factions(args, factions_data):
        return None

    return factions_data

def load_types(args):
    verbose_print(args, "Loading type index file...\n", 1)
    types_path = os.path.join(args.base_path, "types.json")
    types_data = load_json_file(args, types_path)

    if not validate_types(args, types_data):
        return None

    return types_data

def load_sides(args):
    verbose_print(args, "Loading side index file...\n", 1)
    sides_path = os.path.join(args.base_path, "sides.json")
    sides_data = load_json_file(args, sides_path)

    if not validate_sides(args, sides_data):
        return None

    return sides_data

def parse_commandline():
    argparser = argparse.ArgumentParser(description="Validate JSON in the netrunner cards repository.")
    argparser.add_argument("-f", "--fix_formatting", default=False, action="store_true", help="write suggested formatting changes to files")
    argparser.add_argument("-v", "--verbose", default=0, action="count", help="verbose mode")
    argparser.add_argument("-b", "--base_path", default=os.getcwd(), help="root directory of JSON repo (default: current directory)")
    argparser.add_argument("-p", "--pack_path", default=None, help=("pack directory of JSON repo (default: BASE_PATH/%s/)" % PACK_DIR))
    argparser.add_argument("-c", "--schema_path", default=None, help=("schema directory of JSON repo (default: BASE_PATH/%s/" % SCHEMA_DIR))
    args = argparser.parse_args()

    # Set all the necessary paths and check if they exist
    if getattr(args, "schema_path", None) is None:
        setattr(args, "schema_path", os.path.join(args.base_path,SCHEMA_DIR))
    if getattr(args, "pack_path", None) is None:
        setattr(args, "pack_path", os.path.join(args.base_path,PACK_DIR))
    check_dir_access(args.base_path)
    check_dir_access(args.schema_path)
    check_dir_access(args.pack_path)

    return args

def validate_card(args, card, card_schema, pack_code, factions_data, types_data):
    global validation_errors

    try:
        verbose_print(args, "Validating card %s... " % card["name"], 2)
        jsonschema.validate(card, card_schema)
        custom_card_check(args, card, pack_code, factions_data, types_data)
        verbose_print(args, "OK\n", 2)
    except jsonschema.ValidationError as e:
        verbose_print(args, "ERROR\n",2)
        verbose_print(args, "Validation error in card: (pack code: '%s' card code: '%s' title: '%s')\n" % (pack_code, card.get("code"), card.get("name")), 0)
        validation_errors += 1
        verbose_print(args, "%s\n" % e.message, 0)

def validate_cards(args, packs_data, factions_data, types_data):
    global validation_errors

    card_schema_path = os.path.join(args.schema_path, "card_schema.json")

    CARD_SCHEMA = load_json_file(args, card_schema_path)
    if not CARD_SCHEMA:
        return
    if not check_json_schema(args, CARD_SCHEMA, card_schema_path):
        return

    for p in packs_data:
        verbose_print(args, "Validating cards from %s...\n" % p["name"], 1)

        if (p['player']):
            verbose_print(args, "Validating player cards...\n", 1)
            pack_path = os.path.join(args.pack_path, p["cycle_code"], "{}.json".format(p["code"]))
            pack_data = load_json_file(args, pack_path)
            if pack_data:
                for card in pack_data:
                    validate_card(args, card, CARD_SCHEMA, p["code"], factions_data, types_data)
        if (p['encounter']):
            verbose_print(args, "Validating encounter cards...\n", 1)
            pack_path = os.path.join(args.pack_path, p["cycle_code"], "{}_encounter.json".format(p["code"]))
            pack_data = load_json_file(args, pack_path)
            if not pack_data:
                for card in pack_data:
                    validate_card(args, card, CARD_SCHEMA, p["code"], factions_data, types_data)

def validate_cycles(args, cycles_data):
    global validation_errors

    verbose_print(args, "Validating cycle index file...\n", 1)
    cycle_schema_path = os.path.join(args.schema_path, "cycle_schema.json")
    CYCLE_SCHEMA = load_json_file(args, cycle_schema_path)
    if not isinstance(cycles_data, list):
        verbose_print(args, "Insides of cycle index file are not a list!\n", 0)
        return False
    if not CYCLE_SCHEMA:
        return False
    if not check_json_schema(args, CYCLE_SCHEMA, cycle_schema_path):
        return False

    retval = True
    for c in cycles_data:
        try:
            verbose_print(args, "Validating cycle %s... " % c.get("name"), 2)
            jsonschema.validate(c, CYCLE_SCHEMA)
            verbose_print(args, "OK\n", 2)
        except jsonschema.ValidationError as e:
            verbose_print(args, "ERROR\n",2)
            verbose_print(args, "Validation error in cycle: (code: '%s' name: '%s')\n" % (c.get("code"), c.get("name")), 0)
            validation_errors += 1
            verbose_print(args, "%s\n" % e.message, 0)
            retval = False

    return retval

def validate_packs(args, packs_data, cycles_data):
    global validation_errors

    verbose_print(args, "Validating pack index file...\n", 1)
    pack_schema_path = os.path.join(args.schema_path, "pack_schema.json")
    PACK_SCHEMA = load_json_file(args, pack_schema_path)
    if not isinstance(packs_data, list):
        verbose_print(args, "Insides of pack index file are not a list!\n", 0)
        return False
    if not PACK_SCHEMA:
        return False
    if not check_json_schema(args, PACK_SCHEMA, pack_schema_path):
        return False

    retval = True
    for p in packs_data:
        try:
            verbose_print(args, "Validating pack %s... " % p.get("name"), 2)
            jsonschema.validate(p, PACK_SCHEMA)
            custom_pack_check(args, p, cycles_data)
            verbose_print(args, "OK\n", 2)
        except jsonschema.ValidationError as e:
            verbose_print(args, "ERROR\n",2)
            verbose_print(args, "Validation error in pack: (code: '%s' name: '%s')\n" % (p.get("code"), p.get("name")), 0)
            validation_errors += 1
            verbose_print(args, "%s\n" % e.message, 0)
            retval = False

    return retval

def validate_factions(args, factions_data):
    global validation_errors

    verbose_print(args, "Validating faction index file...\n", 1)
    faction_schema_path = os.path.join(args.schema_path, "faction_schema.json")
    FACTION_SCHEMA = load_json_file(args, faction_schema_path)
    if not isinstance(factions_data, list):
        verbose_print(args, "Insides of faction index file are not a list!\n", 0)
        return False
    if not FACTION_SCHEMA:
        return False
    if not check_json_schema(args, FACTION_SCHEMA, faction_schema_path):
        return False

    retval = True
    for c in factions_data:
        try:
            verbose_print(args, "Validating faction %s... " % c.get("name"), 2)
            jsonschema.validate(c, FACTION_SCHEMA)
            verbose_print(args, "OK\n", 2)
        except jsonschema.ValidationError as e:
            verbose_print(args, "ERROR\n",2)
            verbose_print(args, "Validation error in faction: (code: '%s' name: '%s')\n" % (c.get("code"), c.get("name")), 0)
            validation_errors += 1
            verbose_print(args, "%s\n" % e.message, 0)
            retval = False

    return retval

def validate_types(args, types_data):
    global validation_errors

    verbose_print(args, "Validating type index file...\n", 1)
    type_schema_path = os.path.join(args.schema_path, "type_schema.json")
    TYPE_SCHEMA = load_json_file(args, type_schema_path)
    if not isinstance(types_data, list):
        verbose_print(args, "Insides of type index file are not a list!\n", 0)
        return False
    if not TYPE_SCHEMA:
        return False
    if not check_json_schema(args, TYPE_SCHEMA, type_schema_path):
        return False

    retval = True
    for c in types_data:
        try:
            verbose_print(args, "Validating type %s... " % c.get("name"), 2)
            jsonschema.validate(c, TYPE_SCHEMA)
            verbose_print(args, "OK\n", 2)
        except jsonschema.ValidationError as e:
            verbose_print(args, "ERROR\n",2)
            verbose_print(args, "Validation error in type: (code: '%s' name: '%s')\n" % (c.get("code"), c.get("name")), 0)
            validation_errors += 1
            verbose_print(args, "%s\n" % e.message, 0)
            retval = False

    return retval

def validate_sides(args, sides_data):
    global validation_errors

    verbose_print(args, "Validating side index file...\n", 1)
    side_schema_path = os.path.join(args.schema_path, "side_schema.json")
    SIDE_SCHEMA = load_json_file(args, side_schema_path)
    if not isinstance(sides_data, list):
        verbose_print(args, "Insides of side index file are not a list!\n", 0)
        return False
    if not SIDE_SCHEMA:
        return False
    if not check_json_schema(args, SIDE_SCHEMA, side_schema_path):
        return False

    retval = True
    for c in sides_data:
        try:
            verbose_print(args, "Validating side %s... " % c.get("name"), 2)
            jsonschema.validate(c, SIDE_SCHEMA)
            verbose_print(args, "OK\n", 2)
        except jsonschema.ValidationError as e:
            verbose_print(args, "ERROR\n",2)
            verbose_print(args, "Validation error in side: (code: '%s' name: '%s')\n" % (c.get("code"), c.get("name")), 0)
            validation_errors += 1
            verbose_print(args, "%s\n" % e.message, 0)
            retval = False

    return retval

def check_translations_simple(args, base_translations_path, locale_name, base_file_name):
    file_name = "%s.%s.json" % (base_file_name, locale_name)
    verbose_print(args, "Loading file %s...\n" % file_name, 1)
    file_path = os.path.join(base_translations_path, locale_name, file_name)
    if check_file_access(file_path):
        load_json_file(args, file_path)

def check_translations_packs(args, base_translations_path, locale_name):
    packs_translations_path = os.path.join(base_translations_path, locale_name, 'pack')
    cycle_dirs = os.listdir(packs_translations_path)
    for cycle_dir in cycle_dirs:
        file_names = os.listdir(os.path.join(packs_translations_path, cycle_dir))
        for file_name in file_names:
            verbose_print(args, "Loading file %s...\n" % file_name, 1)
            file_path = os.path.join(packs_translations_path, cycle_dir, file_name)
            load_json_file(args, file_path)

def check_translations(args, base_translations_path, locale_name):
    verbose_print(args, "Loading Translations for %s...\n" % locale_name, 1)
    translations_path = os.path.join(base_translations_path, locale_name)
    check_translations_simple(args, base_translations_path, locale_name, 'cycles')
    check_translations_simple(args, base_translations_path, locale_name, 'factions')
    check_translations_simple(args, base_translations_path, locale_name, 'packs')
    check_translations_simple(args, base_translations_path, locale_name, 'types')
    check_translations_packs(args, base_translations_path, locale_name)

def check_all_translations(args):
    verbose_print(args, "Loading Translations...\n", 1)
    base_translations_path = os.path.join(args.base_path, "translations")
    translations_directories = os.listdir(base_translations_path)
    for locale_name in translations_directories:
        check_translations(args, base_translations_path, locale_name)

def check_mwl(args):
    verbose_print(args, "Loading MWL...\n", 1)
    mwl_path = os.path.join(args.base_path, "mwl.json")
    load_json_file(args, mwl_path)

def check_prebuilt(args):
    verbose_print(args, "Loading Prebuilts...\n", 1)
    mwl_path = os.path.join(args.base_path, "prebuilts.json")
    load_json_file(args, mwl_path)

def verbose_print(args, text, minimum_verbosity=0):
    if args.verbose >= minimum_verbosity:
        sys.stdout.write(text)

def main():
    # Initialize global counters for encountered validation errors
    global formatting_errors
    global validation_errors
    formatting_errors = 0
    validation_errors = 0

    args = parse_commandline()

    cycles = load_cycles(args)

    packs = load_packs(args, cycles)

    factions = load_factions(args)
    
    types = load_types(args)

    if packs and factions and types:
        validate_cards(args, packs, factions, types)
        check_all_translations(args)
    else:
        verbose_print(args, "Skipping card validation...\n", 0)

    sys.stdout.write("Found %s formatting and %s validation errors\n" % (formatting_errors, validation_errors))
    if formatting_errors == 0 and validation_errors == 0:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()

   

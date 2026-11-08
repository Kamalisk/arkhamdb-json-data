//@ts-check

import { join } from 'node:path'
import { readFile } from 'node:fs/promises'

import Ajv from 'ajv';

const ajv = new Ajv({ validateSchema: true, strict: true, allErrors: true })

const BASE_PATH = join(import.meta.dirname, '..')
const SCHEMA_DIR = join(BASE_PATH, 'schema');

/**
 * 
 * @param {string} schemaFilename 
 * 
 */
async function makeFindErrorsFunction(schemaFilename) {
    const schemaPath = join(SCHEMA_DIR, schemaFilename)
    const schemaString = await readFile(schemaPath, 'utf-8')
    const schema = JSON.parse(schemaString)

    /** @type {import("ajv").ValidateFunction<unknown>} */
    let validate;
    
    try{
        validate = ajv.compile(schema)
    }
    catch(error){
        console.error('Schema error for', schemaPath)
        // @ts-ignore
        console.error(error.message);
        console.error('The schema at', schemaPath, 'needs to be fixed before validation can continue');
        process.exit(1)
    }

    return function findErrors(/** @type {any} */ value) {
        const valid = validate(value);

        if (!valid) {
            return validate.errors
        }
    }
}


const [findCardErrors, findCycleErrors, findClassErrors, findPackErrors, findTypeErrors] = await Promise.all([
    makeFindErrorsFunction('card_schema.json'),
    makeFindErrorsFunction('cycle_schema.json'),
    makeFindErrorsFunction('faction_schema.json'),
    makeFindErrorsFunction('pack_schema.json'),
    makeFindErrorsFunction('type_schema.json'),
])



/**
 * This function is a wrapper around findCycleErrors because cycle_schema.json 
 * only validates single cycle objects
 * 
 * @param {Array<any>} cycles
 */
function validateCycles(cycles) {
    if (!Array.isArray(cycles)) {
        throw new TypeError(`cycles aren't an Array`)
    }

    for (const cycle of cycles) {
        const errors = findCycleErrors(cycle)

        if (errors) {
            console.error('Errors for cycle', cycle, errors)
        }
    }
}


/**
 * This function is a wrapper around findClassErrors because faction_schema.json 
 * only validates single class objects
 * 
 * @param {Array<any>} classes
 */
function validateClasses(classes) {
    if (!Array.isArray(classes)) {
        throw new TypeError(`classes aren't an Array`)
    }

    for (const oneClass of classes) {
        const errors = findClassErrors(oneClass)

        if (errors) {
            console.error('Errors for class', oneClass, errors)
        }
    }
}


/**
 * This function is a wrapper around findPackErrors because pack_schema.json 
 * only validates single pack objects
 * 
 * @param {Array<any>} packs
 */
function validatePacks(packs) {
    if (!Array.isArray(packs)) {
        throw new TypeError(`packs aren't an Array`)
    }

    for (const pack of packs) {
        const errors = findPackErrors(pack)

        if (errors) {
            console.error('Errors for pack', pack, errors)
        }
    }
}


/**
 * This function is a wrapper around findTypeErrors because type_schema.json 
 * only validates single type objects
 * 
 * @param {Array<any>} types
 */
function validateTypes(types) {
    if (!Array.isArray(types)) {
        throw new TypeError(`types aren't an Array`)
    }

    for (const type of types) {
        const errors = findTypeErrors(type)

        if (errors) {
            console.error('Errors for type', type, errors)
        }
    }
}


const [cycles, classes, packs, types] = await Promise.all(
    ['cycles.json', 'factions.json', 'packs.json', 'types.json']
    .map(async filename => {
        const str = await readFile(join(BASE_PATH, filename), 'utf-8')
        return JSON.parse(str)
    })
) 

validateCycles(cycles)
validateClasses(classes)
validatePacks(packs)
validateTypes(types)






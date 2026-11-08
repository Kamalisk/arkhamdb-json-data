//@ts-check

import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import {styleText} from 'node:util'

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
        console.error(styleText(['bold', 'red'], 'Error'), 'Schema error for', schemaPath)
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
 * @param {(arg0: any) => any} findErrorObject
 */
function makeFindErrorsArrayWrapper(findErrorObject){
    return function findArrayErrors(/** @type {any} */ objects) {
        if (!Array.isArray(objects)) {
            return [new Error(`objects aren't an Array`)]
        }

        /** @type {any[]} */
        let errors = []

        for (const context of objects) {
            const errs = findErrorObject(context)

            if (errs) {
                for(const err of errs){
                    Object.assign(err, {context})
                }

                errors = [
                    ...errors,
                    ...errs
                ]
            }
        }

        if(errors.length >= 1)
            return errors
        else
            return undefined
    }
}



/**
 * This function is a wrapper around findCycleErrors because cycle_schema.json 
 * only validates single cycle objects
 * 
 * @param {Array<any>} cycles
 */
const findCyclesErrors = makeFindErrorsArrayWrapper(findCycleErrors)


/**
 * This function is a wrapper around findClassErrors because faction_schema.json 
 * only validates single class objects
 * 
 * @param {Array<any>} classes
 */
const findClassesErrors = makeFindErrorsArrayWrapper(findClassErrors)


/**
 * This function is a wrapper around findPackErrors because pack_schema.json 
 * only validates single pack objects
 * 
 * @param {Array<any>} packs
 */
const findPacksErrors = makeFindErrorsArrayWrapper(findPackErrors)


/**
 * This function is a wrapper around findTypeErrors because type_schema.json 
 * only validates single type objects
 * 
 * @param {Array<any>} types
 */
const findTypesErrors = makeFindErrorsArrayWrapper(findTypeErrors)


const [cycles, classes, packs, types] = await Promise.all(
    ['cycles.json', 'factions.json', 'packs.json', 'types.json']
    .map(async filename => {
        const str = await readFile(join(BASE_PATH, filename), 'utf-8')
        return JSON.parse(str)
    })
)

const cyclesErrors = findCyclesErrors(cycles)
if(cyclesErrors){
    console.error(styleText(['bold', 'red'], 'Error'), 'cyclesErrors', cyclesErrors)
}

const classesErrors = findClassesErrors(classes)
if(classesErrors){
    console.error(styleText(['bold', 'red'], 'Error'), 'classesErrors', classesErrors)
}

const packsErrors = findPacksErrors(packs)
if(packsErrors){
    console.error(styleText(['bold', 'red'], 'Error'), 'packsErrors', packsErrors)
}

const typesErrors = findTypesErrors(types)
if(typesErrors){
    console.error(styleText(['bold', 'red'], 'Error'), 'typesErrors', typesErrors)
}

// Verify all pack.cycle_code match a cycle.code
const cycleCodes = new Set(cycles.map((/** @type {{ code: string; }} */ c) => c.code))
for(const pack of packs){
    if(!cycleCodes.has(pack.cycle_code)){
        console.error(styleText(['bold', 'red'], 'Error'), 'pack', pack, 'from packs.json has cycle_code', pack.cycle_code, 'which is not a valid cycle code')
        console.error('ℹ️  Valid cycle codes:', [...cycleCodes].join(' | '))
    }
}





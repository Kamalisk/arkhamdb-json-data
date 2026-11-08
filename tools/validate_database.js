//@ts-check

import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import {styleText} from 'node:util'

import Ajv from 'ajv';

const ajv = new Ajv({ validateSchema: true, strict: true, allErrors: true })

const BASE_PATH = join(import.meta.dirname, '..')

/**
 * Load JSON content with custom errors
 * 
 * @param {string} filepath
 */
async function loadJSONFile(filepath){
    const path = join(BASE_PATH, filepath)

    const schemaString = await readFile(path, 'utf-8') // let errors bubble up
    
    try{
        return JSON.parse(schemaString)
    }
    catch(error){
        // @ts-ignore
        error.message = `Content of file ${filepath} is not valid JSON (${error.message})`

        throw error
    }
}



/**
 * 
 * @param {string} schemaFilename 
 * 
 */
async function makeFindErrorsFunction(schemaFilename) {
    const schemaPath = join('schema', schemaFilename)

    /** @type {import("ajv").ValidateFunction<unknown>} */
    let validate;
    
    try{
        const schema = await loadJSONFile(schemaPath)     
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


/**
 * This function is a wrapper around findCardErrors because card_schema.json 
 * only validates single card objects
 * 
 * @param {Array<any>} types
 */
const findCardsErrors = makeFindErrorsArrayWrapper(findCardErrors)


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


function findErrorsInCards(cards){
    const errors = []

    for(const card of cards){
        if(Math.random() < 0.01){
            errors.push(new Error(`Error for card ${card.code}`))
        }
    }


    return errors
}


/**
 * All the file paths in the collection can be constructed from the packs.json
 * For each pack, there may be a file named
 * `pack_root/<pack.cycle_code>/<pack.code>.json` or
 * `pack_root/<pack.cycle_code>/<pack.code>_encounter.json`
 * 
 * 
 * @param {string} collectionRootDir 
 * @param {*} pack
 * @param {*} classes 
 * @param {*} types 
 * @returns {Promise<Error[]>}
 */
async function findErrorsInPackCards(collectionRootDir, pack, classes, types){
    /** @type {Awaited<ReturnType<findErrorsInPackCards>>} */
    const errorPs = []

    const {cycle_code, code} = pack

    const packFilename1 = join(collectionRootDir, cycle_code, `${code}.json`)
    const packFilename2 = join(collectionRootDir, cycle_code, `${code}_encounter.json`)

    Promise.allSettled([
        readFile(packFilename1, 'utf-8'),
        readFile(packFilename2, 'utf-8')
    ])
    .then(([result1, result2]) => {
        let packCards1
        let packCards2
        const enoents = []

        if(result1.status === 'rejected'){
            if(result1.reason.code === 'ENOENT'){
                // ignore this error since it may happen that the file does not exists
                enoents.push(result1.reason)
            }
            else{
                errorPs.push(result1.reason)
            }
        }
        else{
            packCards1 = JSON.parse(result1.value)
        }

        if(result2.status === 'rejected'){
            if(result2.reason.code === 'ENOENT'){
                // ignore this error since it may happen that the file does not exists
                enoents.push(result2.reason)
            }
            else{
                errorPs.push(result2.reason)
            }
        }
        else{
            packCards2 = JSON.parse(result2.value)
        }

        if(enoents.length === 2){
            // if both are ENOENT, it's an error
            errorPs.push(
                Object.assign(
                    new Error(`No file with cards related to pack ${cycle_code}/${code}`), 
                    {pack}
                )
            )
        }
        else{
            return [packCards1, packCards2]
        }


    })

    return errorPs
}



/**
 * All the file paths in the collection can be constructed from the packs.json
 * For each pack, there may be a file named
 * `pack_root/<pack.cycle_code>/<pack.code>.json` or
 * `pack_root/<pack.cycle_code>/<pack.code>_encounter.json`
 * 
 * 
 * @param {string} collectionRootDir 
 * @param {*} packs 
 * @param {*} classes 
 * @param {*} types 
 */
async function findErrorsInCollectionCards(collectionRootDir, packs, classes, types){
    const errorsPs = []

    for(const pack of packs){
        const {cycle_code, code} = pack;






    }

}

const collectionErrors = findErrorsInCollectionCards(BASE_PATH, packs, classes, types)

if(collectionErrors){
    console.error(styleText(['bold', 'red'], 'Collection errors'), 'at', BASE_PATH)
    console.error(collectionErrors)
        
}




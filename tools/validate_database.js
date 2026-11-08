//@ts-check

import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import {styleText} from 'node:util'

import Ajv from 'ajv';

const ajv = new Ajv({ validateSchema: true, strict: true, allErrors: true })

const BASE_PATH = join(import.meta.dirname, '..')

/** @type {Set<Error>} */
const validationErrors = new Set()

/** @type {Promise<any>[]} */
const operationsSynchronize = [];

const objectToFilepath = new WeakMap()

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


const [cyclesP, classesP, packsP, typesP] = ['cycles.json', 'factions.json', 'packs.json', 'types.json']
    .map(loadJSONFile)

operationsSynchronize.push(cyclesP
    .then(cycles => {
        const errs = findCyclesErrors(cycles)
        if(errs){
            errs.forEach(err => validationErrors.add(err))
        }
    })
    .catch(e => {
        e.message = `Error with cycles.json (${e.message})`
        validationErrors.add(e)
    }))

operationsSynchronize.push(classesP
    .then(classes => {
        const errs = findClassesErrors(classes)
        if(errs){
            errs.forEach(err => validationErrors.add(err))
        }
    })
    .catch(e => {
        e.message = `Error with factions.json (${e.message})`
        validationErrors.add(e)
    }))

operationsSynchronize.push(packsP
    .then(packs => {
        const errs = findPacksErrors(packs)
        if(errs){
            errs.forEach(err => validationErrors.add(err))
        }
    })
    .catch(e => {
        e.message = `Error with packs.json (${e.message})`
        validationErrors.add(e)
    }))

operationsSynchronize.push(typesP
    .then(types => {
        const errs = findTypesErrors(types)
        if(errs){
            errs.forEach(err => validationErrors.add(err))
        }
    })
    .catch(e => {
        e.message = `Error with types.json (${e.message})`
        validationErrors.add(e)
    }))

// Verify all pack.cycle_code match a cycle.code
operationsSynchronize.push(Promise.all([cyclesP, packsP])
.then(([cycles, packs]) => {
    const cycleCodes = new Set(cycles.map((/** @type {{ code: string; }} */ c) => c.code))
    for(const pack of packs){
        if(!cycleCodes.has(pack.cycle_code)){
            const e = new Error(
                `pack ${pack} from packs.json has cycle_code ${pack.cycle_code} which is not a valid cycle code\n`+
                `ℹ️ Valid cycle codes: ${[...cycleCodes].join(' | ')}`
            )

            validationErrors.add(e)
        }
    }
}))




/**
 * All the file paths in the collection can be constructed from the packs.json
 * For each pack, there may be a file named
 * `pack_root/<pack.cycle_code>/<pack.code>.json` or
 * `pack_root/<pack.cycle_code>/<pack.code>_encounter.json`
 * 
 * @param {*} pack
 * @param {*} classes 
 * @param {*} types 
 * @returns {Promise<Error[] | undefined>}
 */
async function findErrorsInPackCards(pack, classes, types){
    /** @type {Awaited<ReturnType<findErrorsInPackCards>>} */
    const errorPs = []

    const {cycle_code, code} = pack

    const packFilename1 = join('pack', cycle_code, `${code}.json`)
    const packFilename2 = join('pack', cycle_code, `${code}_encounter.json`)

    return Promise.allSettled([
        loadJSONFile(packFilename1),
        loadJSONFile(packFilename2)
    ])
    .then(([result1, result2]) => {
        let packCards1
        let packCards2
        const ENOENTs = []

        if(result1.status === 'rejected'){
            if(result1.reason.code === 'ENOENT'){
                // ignore this error since it may happen that the file does not exists
                ENOENTs.push(result1.reason)
            }
            else{
                errorPs.push(result1.reason)
            }
        }
        else{
            packCards1 = result1.value
            objectToFilepath.set(packCards1, packFilename1)
        }

        if(result2.status === 'rejected'){
            if(result2.reason.code === 'ENOENT'){
                // ignore this error since it may happen that the file does not exists
                ENOENTs.push(result2.reason)
            }
            else{
                errorPs.push(result2.reason)
            }
        }
        else{
            packCards2 = result2.value
            objectToFilepath.set(packCards2, packFilename2)
        }

        if(ENOENTs.length === 2){
            // if both are ENOENT, it's an error though
            errorPs.push(
                Object.assign(
                    new Error(`No file with cards related to pack ${cycle_code}/${code}`), 
                    {pack}
                )
            )
        }

        if(packCards1){
            const errs = findCardsErrors(packCards1) || []
            errs.forEach(err => errorPs.push(err))
        }

        if(packCards2){
            const errs = findCardsErrors(packCards2) || []
            errs.forEach(err => errorPs.push(err))
        }


        if(errorPs.length >= 1){
            return errorPs
        }
    })
}



/**
 * 
 * @param {*} packs 
 * @param {*} classes 
 * @param {*} types 
 * @returns {Promise<Error[] | undefined>}
 */
async function findErrorsInCollectionCards(packs, classes, types){
    /** @type {NonNullable<Awaited<ReturnType<findErrorsInCollectionCards>>>} */
    let errorsPs = []

    return Promise.all(packs.map(async (/** @type {{ reprint_type: any; }} */ pack) => {
        if(!pack.reprint_type){
            // don't try to find cards for reprint packs
            const errs = await findErrorsInPackCards(pack, classes, types)
            if(errs){
                errorsPs = errorsPs.concat(errs)
            }
        }
    }))
    .then(() => errorsPs.length >= 1 ? errorsPs : undefined)

}

operationsSynchronize.push(Promise.all([packsP, classesP, typesP])
.then(async ([packs, classes, types]) => {
    const collectionCardsErrors = await findErrorsInCollectionCards(packs, classes, types)
    if(collectionCardsErrors){
        collectionCardsErrors.forEach(err => validationErrors.add(err))
    }
}))


await Promise.all(operationsSynchronize)
.then(() => {
    if(validationErrors.size >= 1){
        for(const err of validationErrors){
            console.error( styleText(['bold', 'red'], 'Error'), err )
        }

        process.exit(1)
    }
    else{
        console.info( styleText(['green'], '✅ Database is valid!') )
    }
})



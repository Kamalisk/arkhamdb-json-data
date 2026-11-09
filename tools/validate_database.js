//@ts-check

/** @import {ValidateFunction, ErrorObject as AJVErrorObject} from 'ajv' */

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

    /** @type {ValidateFunction<unknown>} */
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


const [findCardSchemaErrors, findCycleSchemaErrors, findClassSchemaErrors, findPackSchemaErrors, findTypeSchemaErrors] = await Promise.all([
    makeFindErrorsFunction('card_schema.json'),
    makeFindErrorsFunction('cycle_schema.json'),
    makeFindErrorsFunction('faction_schema.json'),
    makeFindErrorsFunction('pack_schema.json'),
    makeFindErrorsFunction('type_schema.json'),
])

/**
 * 
 * @param {AJVErrorObject} ajvError 
 * @return {string}
 */
function makeAJVSchemaErrorMessage(ajvError){
    if(ajvError.keyword === 'required'){
        const propertyName = ajvError.params.missingProperty

        return `Missing required property '${propertyName}'`
    }

    if(ajvError.keyword === 'additionalProperties'){
        const additionalProperty = ajvError.params.additionalProperty

        return `Unexpected property '${additionalProperty}'`
    }

    return `${ajvError.message}\nkeyword: ${ajvError.keyword}\nparams: ${JSON.stringify(ajvError.params)}}`
}


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

        for (const object of objects) {
            const errs = findErrorObject(object)

            if (errs) {
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
const findCyclesSchemaErrors = makeFindErrorsArrayWrapper(findCycleSchemaErrors)


/**
 * This function is a wrapper around findClassErrors because faction_schema.json 
 * only validates single class objects
 * 
 * @param {Array<any>} classes
 */
const findClassesSchemaErrors = makeFindErrorsArrayWrapper(findClassSchemaErrors)


/**
 * This function is a wrapper around findPackErrors because pack_schema.json 
 * only validates single pack objects
 * 
 * @param {Array<any>} packs
 */
const findPacksSchemaErrors = makeFindErrorsArrayWrapper(findPackSchemaErrors)


/**
 * This function is a wrapper around findTypeErrors because type_schema.json 
 * only validates single type objects
 * 
 * @param {Array<any>} types
 */
const findTypesSchemaErrors = makeFindErrorsArrayWrapper(findTypeSchemaErrors)


/**
 * This function is a wrapper around findCardErrors because card_schema.json 
 * only validates single card objects
 * 
 * @param {Array<any>} types
 */
const findCardsSchemaErrors = makeFindErrorsArrayWrapper(findCardSchemaErrors)

/**
 * 
 * @param {any[]} cards 
 * @param {string} pack 
 * @param {Set<string>} classes 
 * @param {Set<string>} types 
 * @return {Error[] | undefined}
 */
function findCardsForeignKeyErrors(cards, pack, classes, types){
    /** @type {NonNullable<ReturnType<findCardsForeignKeyErrors>>} */
    const errors = []

    for(const card of cards){
        const {code, pack_code, faction_code, type_code} = card

        if(pack_code !== pack){
            errors.push(new Error(`Card ${code} pack_code is ${pack_code} and should be ${pack}`))
        }

        if(faction_code && !classes.has(faction_code)){
            errors.push(new Error(`Card ${code} has faction_code of ${faction_code} which is not a valid code listed in factions.json`))
        }

        if(type_code && !types.has(type_code)){
            errors.push(new Error(`Card ${code} has type_code of ${type_code} which is not a valid code listed in types.json`))
        }
    }

    if(errors.length >= 1){
        return errors
    }
}


const [cyclesP, classesP, packsP, typesP] = ['cycles.json', 'factions.json', 'packs.json', 'types.json']
    .map(loadJSONFile)

operationsSynchronize.push(cyclesP
    .then(cycles => {
        const errs = findCyclesSchemaErrors(cycles)
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
        const errs = findClassesSchemaErrors(classes)
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
        const errs = findPacksSchemaErrors(packs)
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
        const errs = findTypesSchemaErrors(types)
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
 * @param {Set<string>} classes 
 * @param {Set<string>} types 
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
            errorPs.push(new Error(`No file with cards related to pack ${cycle_code}/${code}`))
        }

        if(packCards1){
            const errs = findCardsSchemaErrors(packCards1) || []
            errs.forEach(err => errorPs.push(err))

            const errs2 = findCardsForeignKeyErrors(packCards1, pack.code, classes, types) || []
            errs2.forEach(err => errorPs.push(err))
        }

        if(packCards2){
            const errs = findCardsSchemaErrors(packCards2) || []
            errs.forEach(err => errorPs.push(err))

            const errs2 = findCardsForeignKeyErrors(packCards2, pack.code, classes, types) || []
            errs2.forEach(err => errorPs.push(err))
        }


        if(errorPs.length >= 1){
            return errorPs
        }
    })
}



/**
 * 
 * @param {*} packs 
 * @param {Set<string>} classes 
 * @param {Set<string>} types 
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

    const classCodes = new Set(classes.map((/** @type {{ code: any; }} */ c) => c.code))
    const typesCodes = new Set(types.map((/** @type {{ code: any; }} */ t) => t.code))

    const collectionCardsErrors = await findErrorsInCollectionCards(packs, classCodes, typesCodes)
    if(collectionCardsErrors){
        collectionCardsErrors.forEach(err => validationErrors.add(err))
    }
}))


await Promise.all(operationsSynchronize)
.then(() => {
    if(validationErrors.size >= 1){
        for(const error of validationErrors){
            // @ts-ignore
            const message = error.keyword ? // should be type guard isAJVErrorObject
                // @ts-ignore
                makeAJVSchemaErrorMessage(error) : 
                error.message


            console.error( styleText(['bold', 'red'], 'Error'), message )
        }

        process.exit(1)
    }
    else{
        console.info('✅ Database is valid!' )
    }
})



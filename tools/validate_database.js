//@ts-check

import {join} from 'node:path'
import {readFile} from 'node:fs/promises'

import Ajv from 'ajv';

const ajv = new Ajv({validateSchema: true, strict: true, allErrors: true})

const BASE_PATH = join(import.meta.dirname, '..')
const SCHEMA_DIR = join(BASE_PATH, 'schema');

/**
 * 
 * @param {string} schemaFilename 
 * 
 */
async function makeFindErrorsFunction(schemaFilename){
    const schemaString = await readFile(join(SCHEMA_DIR, schemaFilename), 'utf-8')
    const schema = JSON.parse(schemaString)

    const validate = ajv.compile(schema)

    const compilationErrors = ajv.errors;

    if(compilationErrors){
        console.error('compilationErrors for', schemaFilename, compilationErrors)
    }

    return function findErrors(/** @type {any} */ value){
        const valid = validate(value);

        if(!valid){
            return validate.errors
        }
    }
}


const findErrorsCycle = await makeFindErrorsFunction('cycle_schema.json')


/**
 * @param {Array<any>} cycles
 */
function validateCycles(cycles){
    if(!Array.isArray(cycles)){
        throw new TypeError(`cycles aren't an Array`)
    }

    for(const cycle of cycles){
        const errors = findErrorsCycle(cycle)

        if(errors){
            console.error('Errors for cycle', cycle, errors)
        }
    }


}


const cyclesString = await readFile(join(BASE_PATH, 'cycles.json'), 'utf-8')
const cycles = JSON.parse(cyclesString)



validateCycles(cycles)


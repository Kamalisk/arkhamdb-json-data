//@ts-check

import {join} from 'node:path'
import {readFile} from 'node:fs/promises'

import Ajv from 'ajv';

const ajv = new Ajv({validateSchema: true, strict: true, allErrors: true})

const BASE_PATH = join(import.meta.dirname, '..')
const SCHEMA_DIR = join(BASE_PATH, 'schema');

const cycleSchemaString = await readFile(join(SCHEMA_DIR, 'cycle_schema.json'), 'utf-8')
const cycleSchema = JSON.parse(cycleSchemaString)

const validateCycle = ajv.compile(cycleSchema)

const compilationErrors = ajv.errors;

console.log('cycles compilationErrors', compilationErrors)

function validateCycles(cycles){
    if(!Array.isArray(cycles)){
        throw new TypeError(`cycles aren't an Array`)
    }

    for(const cycle of cycles){
        const valid = validateCycle(cycle)

        if(!valid){
            console.error('Error for cycle', cycle, validateCycle.errors)
        }
    }


}


const cyclesString = await readFile(join(BASE_PATH, 'cycles.json'), 'utf-8')
const cycles = JSON.parse(cyclesString)



validateCycles(cycles)


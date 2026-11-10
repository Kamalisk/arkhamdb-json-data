import type { ValidateFunction, ErrorObject as AJVErrorObject } from "ajv";

import { join } from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { styleText } from "node:util";

import Ajv from "ajv/dist/2020.js";

function makeAJVSchemaErrorMessage(ajvError: AJVErrorObject): string {
    if (ajvError.keyword === "required") {
        const propertyName = ajvError.params.missingProperty;

        return `Missing required property '${propertyName}'`;
    }

    if (ajvError.keyword === "additionalProperties") {
        const additionalProperty = ajvError.params.additionalProperty;

        return `Unexpected property '${additionalProperty}'`;
    }

    return `${ajvError.message}\nkeyword: ${
        ajvError.keyword
    }\nparams: ${JSON.stringify(ajvError.params)}}`;
}

class ArkhamLCGDatabaseError extends Error {
    filepath: string;
    card_code: string | undefined;

    constructor({
        message,
        filepath,
        card_code,
        cause,
    }: {
        message: string;
        filepath: string;
        card_code?: string;
        cause?: any;
    }) {
        super(message);

        this.filepath = filepath;

        if (card_code) {
            this.card_code = card_code;
        }

        if (cause) {
            this.cause = cause;
        }
    }

    static fromAjvErrorObject(
        ajvErrorObject: AJVErrorObject,
        filepath: string,
        card_code?: string
    ) {
        return new ArkhamLCGDatabaseError({
            message: makeAJVSchemaErrorMessage(ajvErrorObject),
            filepath,
            card_code,
            cause: ajvErrorObject,
        });
    }

    toString() {
        const filePart = styleText("blue", `[${this.filepath}]`);
        const cardPart = this.card_code
            ? styleText("magenta", `[card ${this.card_code}]`)
            : "";

        return `❌ ${filePart}${cardPart} ${this.message}`;
    }
}

const ajv = new Ajv({ validateSchema: true, strict: true, allErrors: true });

const BASE_PATH = join(import.meta.dirname, "..");

const ARKHAM_LCG_FILE_DATABASE_BASE_PATH = join(import.meta.dirname, "..");
const translationDir = "translations";

const validationErrors: Set<Error> = new Set();

const operationsSynchronize: Promise<any>[] = [];

const objectToFilepath = new WeakMap();

/**
 * Load JSON content with custom errors
 */
async function loadJSONFile(filepath: string, basePath: string): Promise<any> {
    const path = join(basePath, filepath);

    try {
        const schemaString = await readFile(path, "utf-8"); // let errors bubble up
        return JSON.parse(schemaString);
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new ArkhamLCGDatabaseError({
                message: `Content of file is not valid JSON (${styleText(
                    "dim",
                    error.message
                )})`,
                filepath,
                cause: error,
            });
        }

        // @ts-expect-error TS is not up-to-date https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/isError
        if (error && error.code === "ENOENT") {
            throw new ArkhamLCGDatabaseError({
                // @ts-ignore
                message: `File '${styleText(
                    "greenBright",
                    filepath
                )}' does not exist`,
                filepath,
                // @ts-ignore
                cause: error,
            });
        }

        throw new ArkhamLCGDatabaseError({
            // @ts-ignore
            message: `Problem reading the file (${error.message})`,
            filepath,
            // @ts-ignore
            cause: error,
        });
    }
}

async function makeFindErrorsFunction(schemaFilename: string) {
    const schemaPath = join("schema", schemaFilename);

    let validate: ValidateFunction<unknown>;

    try {
        const schema = await loadJSONFile(
            schemaPath,
            ARKHAM_LCG_FILE_DATABASE_BASE_PATH
        );
        validate = ajv.compile(schema);
    } catch (error) {
        console.error(
            styleText(["bold", "red"], "Error"),
            "Schema error for",
            schemaPath
        );
        // @ts-ignore
        console.error(error.toString());
        console.error(
            "The schema at",
            schemaPath,
            "needs to be fixed before validation can continue"
        );
        process.exit(1);
    }

    return function findErrors(value: any) {
        const valid = validate(value);

        if (!valid) {
            return validate.errors;
        }
    };
}

const [
    findCardSchemaErrors,
    findCycleSchemaErrors,
    findClassSchemaErrors,
    findPackSchemaErrors,
    findTypeSchemaErrors,
    findGameSceneryTranslationsSchemaErrors,
] = await Promise.all([
    makeFindErrorsFunction("card_schema.json"),
    makeFindErrorsFunction("cycle_schema.json"),
    makeFindErrorsFunction("faction_schema.json"),
    makeFindErrorsFunction("pack_schema.json"),
    makeFindErrorsFunction("type_schema.json"),
    makeFindErrorsFunction("game_scenery_translation_schema.json"),
]);

function makeFindErrorsArrayWrapper(
    findErrorObject: Awaited<ReturnType<typeof makeFindErrorsFunction>>
) {
    return function findArrayErrors(objects: unknown, filepath: string) {
        if (!Array.isArray(objects)) {
            return [
                new ArkhamLCGDatabaseError({
                    message: `Objects are expected to be an Array and are not`,
                    filepath,
                }),
            ];
        }

        let errors: ArkhamLCGDatabaseError[] = [];

        for (const object of objects) {
            const errs = findErrorObject(object);

            if (errs) {
                errors = [
                    ...errors,
                    ...errs.map((err) =>
                        ArkhamLCGDatabaseError.fromAjvErrorObject(err, filepath)
                    ),
                ];
            }
        }

        if (errors.length >= 1) return errors;
        else return undefined;
    };
}

/**
 * This function is a wrapper around findCycleErrors because cycle_schema.json
 * only validates single cycle objects
 *
 * @param {Array<any>} cycles
 */
const findCyclesSchemaErrors = makeFindErrorsArrayWrapper(
    findCycleSchemaErrors
);

/**
 * This function is a wrapper around findClassErrors because faction_schema.json
 * only validates single class objects
 *
 * @param {Array<any>} classes
 */
const findClassesSchemaErrors = makeFindErrorsArrayWrapper(
    findClassSchemaErrors
);

/**
 * This function is a wrapper around findPackErrors because pack_schema.json
 * only validates single pack objects
 *
 * @param {Array<any>} packs
 */
const findPacksSchemaErrors = makeFindErrorsArrayWrapper(findPackSchemaErrors);

/**
 * This function is a wrapper around findTypeErrors because type_schema.json
 * only validates single type objects
 *
 * @param {Array<any>} types
 */
const findTypesSchemaErrors = makeFindErrorsArrayWrapper(findTypeSchemaErrors);

/**
 * This function is a wrapper around findCardErrors because card_schema.json
 * only validates single card objects
 *
 * @param {Array<any>} types
 */
const findCardsSchemaErrors = makeFindErrorsArrayWrapper(findCardSchemaErrors);

function findCardsForeignKeyErrors(
    cards: any[],
    pack: string,
    classes: Set<string>,
    types: Set<string>,
    cardsFilepath: string
): ArkhamLCGDatabaseError[] | undefined {
    const errors: NonNullable<ReturnType<typeof findCardsForeignKeyErrors>> =
        [];

    for (const card of cards) {
        const { code, pack_code, faction_code, type_code } = card;

        if (pack_code !== pack) {
            errors.push(
                new ArkhamLCGDatabaseError({
                    message: `pack_code is ${styleText(
                        "red",
                        pack_code
                    )} and should be ${styleText("green", pack)}`,
                    filepath: cardsFilepath,
                    card_code: code,
                })
            );
        }

        if (faction_code && !classes.has(faction_code)) {
            errors.push(
                new ArkhamLCGDatabaseError({
                    message: `Card has faction_code of ${styleText(
                        "red",
                        faction_code
                    )} which is not a valid code listed in factions.json`,
                    filepath: cardsFilepath,
                    card_code: code,
                })
            );
        }

        if (type_code && !types.has(type_code)) {
            errors.push(
                new ArkhamLCGDatabaseError({
                    message: `Card has type_code of ${styleText(
                        "red",
                        type_code
                    )} which is not a valid code listed in types.json`,
                    filepath: cardsFilepath,
                    card_code: code,
                })
            );
        }
    }

    if (errors.length >= 1) {
        return errors;
    }
}

const CYCLES_JSON = "cycles.json";
// classes file is called "factions" for legacy reason
const CLASSES_JSON = "factions.json";
const PACKS_JSON = "packs.json";
const TYPES_JSON = "types.json";

const [cyclesP, classesP, packsP, typesP] = [
    CYCLES_JSON,
    CLASSES_JSON,
    PACKS_JSON,
    TYPES_JSON,
].map((filename) => loadJSONFile(filename, ARKHAM_LCG_FILE_DATABASE_BASE_PATH));

operationsSynchronize.push(
    cyclesP
        .then((cycles) => {
            const errs = findCyclesSchemaErrors(cycles, "cycles.json");
            if (errs) {
                errs.forEach((err) => validationErrors.add(err));
            }
        })
        .catch((e) => {
            e.message = `Error with cycles.json (${e.message})`;
            validationErrors.add(e);
        })
);

operationsSynchronize.push(
    classesP
        .then((classes) => {
            const errs = findClassesSchemaErrors(classes, "factions.json");
            if (errs) {
                errs.forEach((err) => validationErrors.add(err));
            }
        })
        .catch((e) => {
            e.message = `Error with factions.json (${e.message})`;
            validationErrors.add(e);
        })
);

operationsSynchronize.push(
    packsP
        .then((packs) => {
            const errs = findPacksSchemaErrors(packs, "packs.json");
            if (errs) {
                errs.forEach((err) => validationErrors.add(err));
            }
        })
        .catch((e) => {
            e.message = `Error with packs.json (${e.message})`;
            validationErrors.add(e);
        })
);

operationsSynchronize.push(
    typesP
        .then((types) => {
            const errs = findTypesSchemaErrors(types, "types.json");
            if (errs) {
                errs.forEach((err) => validationErrors.add(err));
            }
        })
        .catch((e) => {
            e.message = `Error with types.json (${e.message})`;
            validationErrors.add(e);
        })
);

// Verify all pack.cycle_code match a cycle.code
const cycleForeignKeysInPacksP = Promise.all([cyclesP, packsP]).then(
    ([cycles, packs]) => {
        const cycleCodes = new Set(cycles.map((c: { code: string }) => c.code));
        const errors: ArkhamLCGDatabaseError[] = [];

        for (const pack of packs) {
            if (!cycleCodes.has(pack.cycle_code)) {
                const e = new ArkhamLCGDatabaseError({
                    message:
                        `Pack '${styleText(
                            "green",
                            pack.code
                        )}' has cycle_code '${styleText(
                            "green",
                            pack.cycle_code
                        )}' which is not a valid cycle code\n` +
                        `ℹ️  Valid cycle codes: ${[...cycleCodes].join(" | ")}`,
                    filepath: "packs.json",
                });

                errors.push(e);
            }
        }

        if (errors.length >= 1) {
            errors.forEach((err) => validationErrors.add(err));
            throw errors;
        }
    }
);

operationsSynchronize.push(cycleForeignKeysInPacksP);

/**
 * All the file paths in the collection can be constructed from the packs.json
 * For each pack, there may be a file named
 * `pack_root/<pack.cycle_code>/<pack.code>.json` or
 * `pack_root/<pack.cycle_code>/<pack.code>_encounter.json`
 */
async function findErrorsInPackCards(
    pack: any,
    classes: Set<string>,
    types: Set<string>,
    basePath: string
): Promise<Error[] | undefined> {
    const errorPs: Awaited<ReturnType<typeof findErrorsInPackCards>> = [];

    const { cycle_code, code } = pack;

    const packFilename1 = join("pack", cycle_code, `${code}.json`);
    const packFilename2 = join("pack", cycle_code, `${code}_encounter.json`);

    return Promise.allSettled([
        loadJSONFile(packFilename1, basePath),
        loadJSONFile(packFilename2, basePath),
    ]).then(([result1, result2]) => {
        let packCards1;
        let packCards2;
        const ENOENTs = [];

        if (result1.status === "rejected") {
            if (
                result1.reason.code === "ENOENT" ||
                result1.reason?.cause?.code === "ENOENT"
            ) {
                // ignore this error since it may happen that the file does not exists
                ENOENTs.push(result1.reason);
            } else {
                errorPs.push(result1.reason);
            }
        } else {
            packCards1 = result1.value;
            objectToFilepath.set(packCards1, packFilename1);
        }

        if (result2.status === "rejected") {
            if (
                result2.reason.code === "ENOENT" ||
                result2.reason?.cause?.code === "ENOENT"
            ) {
                // ignore this error since it may happen that the file does not exists
                ENOENTs.push(result2.reason);
            } else {
                errorPs.push(result2.reason);
            }
        } else {
            packCards2 = result2.value;
            objectToFilepath.set(packCards2, packFilename2);
        }

        if (ENOENTs.length === 2) {
            // if both are ENOENT, it's an error though
            errorPs.push(
                new ArkhamLCGDatabaseError({
                    message: `No file with cards related to pack ${styleText(
                        "green",
                        `${cycle_code}/${code}`
                    )}`,
                    filepath: `Pack ${cycle_code}/${code}`, // not exactly a filepath, but good enough
                })
            );
        }

        if (packCards1) {
            const errs = findCardsSchemaErrors(packCards1, packFilename1) || [];
            errs.forEach((err) => errorPs.push(err));

            const errs2 =
                findCardsForeignKeyErrors(
                    packCards1,
                    pack.code,
                    classes,
                    types,
                    packFilename1
                ) || [];
            errs2.forEach((err) => errorPs.push(err));
        }

        if (packCards2) {
            const errs = findCardsSchemaErrors(packCards2, packFilename2) || [];
            errs.forEach((err) => errorPs.push(err));

            const errs2 =
                findCardsForeignKeyErrors(
                    packCards2,
                    pack.code,
                    classes,
                    types,
                    packFilename2
                ) || [];
            errs2.forEach((err) => errorPs.push(err));
        }

        if (errorPs.length >= 1) {
            return errorPs;
        }
    });
}

async function findErrorsInCollectionCards(
    packs: any[],
    classes: Set<string>,
    types: Set<string>,
    basePath: string
): Promise<Error[] | undefined> {
    let errorsPs: NonNullable<
        Awaited<ReturnType<typeof findErrorsInCollectionCards>>
    > = [];

    return Promise.all(
        packs.map(async (pack: { reprint_type: string }) => {
            if (!pack.reprint_type) {
                // don't try to find cards for reprint packs
                const errs = await findErrorsInPackCards(
                    pack,
                    classes,
                    types,
                    basePath
                );
                if (errs) {
                    errorsPs = errorsPs.concat(errs);
                }
            }
        })
    ).then(() => (errorsPs.length >= 1 ? errorsPs : undefined));
}

operationsSynchronize.push(
    Promise.all([packsP, classesP, typesP, cycleForeignKeysInPacksP]).then(
        async ([packs, classes, types]) => {
            const classCodes: Set<string> = new Set(
                classes.map((c: { code: any }) => c.code)
            );
            const typesCodes: Set<string> = new Set(
                types.map((t: { code: any }) => t.code)
            );

            const collectionCardsErrors = await findErrorsInCollectionCards(
                packs,
                classCodes,
                typesCodes,
                ARKHAM_LCG_FILE_DATABASE_BASE_PATH
            );
            if (collectionCardsErrors) {
                collectionCardsErrors.forEach((err) =>
                    validationErrors.add(err)
                );
            }
        }
    )
);

await Promise.allSettled(operationsSynchronize).then(() => {
    if (validationErrors.size >= 1) {
        for (const error of validationErrors) {
            const message =
                error instanceof ArkhamLCGDatabaseError
                    ? error.toString()
                    : // @ts-ignore
                    error.keyword // should be type guard isAJVErrorObject
                    ? // @ts-ignore
                      makeAJVSchemaErrorMessage(error)
                    : //@ts-ignore
                      error.message;
        }
    }
});

operationsSynchronize.push(
    Promise.all([packsP, classesP, typesP, cycleForeignKeysInPacksP]).then(
        async ([packs, classes, types]) => {
            const classCodes: Set<string> = new Set(
                classes.map((c: { code: any }) => c.code)
            );
            const typesCodes: Set<string> = new Set(
                types.map((t: { code: any }) => t.code)
            );

            const collectionCardsErrors = await findErrorsInCollectionCards(
                packs,
                classCodes,
                typesCodes,
                ARKHAM_LCG_FILE_DATABASE_BASE_PATH
            );
            if (collectionCardsErrors) {
                collectionCardsErrors.forEach((err) =>
                    validationErrors.add(err)
                );
            }
        }
    )
);

function findGameSceneryTranslationsErrors(locale: string) {
    return Promise.all(
        [CYCLES_JSON, CLASSES_JSON, PACKS_JSON, TYPES_JSON].map((filename) => {
            const filepath = join(translationDir, locale, filename);

            return loadJSONFile(filepath, ARKHAM_LCG_FILE_DATABASE_BASE_PATH)
                .then((fileContent) => {
                    const errors =
                        findGameSceneryTranslationsSchemaErrors(fileContent);
                    if (errors) {
                        errors.forEach((err) =>
                            validationErrors.add(
                                ArkhamLCGDatabaseError.fromAjvErrorObject(
                                    err,
                                    filepath
                                )
                            )
                        );
                    }
                })
                .catch((e) => {
                    e.message = `Error with ${filepath} (${e.message})`;
                    validationErrors.add(e);
                });
        })
    );
}

function findErrorsInLocaleCollectionCards(locale: string) {}

const localesP = readdir(
    join(ARKHAM_LCG_FILE_DATABASE_BASE_PATH, translationDir)
);

operationsSynchronize.push(
    localesP.then((locales) => {
        return Promise.all(
            locales.map((locale) => {
                return Promise.all([
                    findGameSceneryTranslationsErrors(locale),
                    findErrorsInLocaleCollectionCards(locale),
                ]);
            })
        );
    })
);

await Promise.allSettled(operationsSynchronize).then(() => {
    if (validationErrors.size >= 1) {
        for (const error of validationErrors) {
            const message =
                error instanceof ArkhamLCGDatabaseError
                    ? error.toString()
                    : // @ts-ignore
                    error.keyword // should be type guard isAJVErrorObject
                    ? // @ts-ignore
                      makeAJVSchemaErrorMessage(error)
                    : //@ts-ignore
                      error.message;

            console.error(message);
        }

        process.exit(1);
    } else {
        console.info("✅ Database is valid!");
    }
});

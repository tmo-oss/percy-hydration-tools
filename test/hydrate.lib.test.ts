/**
 =========================================================================
 Copyright 2019 T-Mobile, USA

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 See the LICENSE file for additional language around disclaimer of warranties.

 Trademark Disclaimer: Neither the name of “T-Mobile, USA” nor the names of
 its contributors may be used to endorse or promote products derived from this
 software without specific prior written permission.
 ===========================================================================
 */

import * as chalk from "chalk";
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as config from "config";
import * as fs from "fs-extra";
import * as path from "path";
import {utils} from "../src/lib/common/index";
import {Hydrate} from "../src/lib/hydrate.lib";

chai.use(chaiAsPromised);
const assert = chai.assert;

const outputFolder = path.join(__dirname, "data/out/dist");
const inputFolder = path.join(__dirname, "data/apps");

const hydrate = new Hydrate(
    {
        DEFAULT_PERCY_CONFIG: config.get("DEFAULT_PERCY_CONFIG"),
        ENVIRONMENT_FILE_NAME: config.get("ENVIRONMENT_FILE_NAME"),
        LOG_LEVEL: config.get("LOG_LEVEL"),
        PERCY_CONFIG_FILE_NAME: config.get("PERCY_CONFIG_FILE_NAME"),
    },
    true
);


async function validateConfigFile(testName: string, testConfigFileName: string, environments: Array<string>) {

    const testFolder = `data/${testName}/`;

    const inputFile = path.join(
        __dirname, testFolder, `/${testConfigFileName}.yaml`
    );
    const outputFile = path.join(
        outputFolder,
        `/${testName}`
    );

    await assert.becomes(
        hydrate.hydrateFile(inputFile, undefined, undefined, outputFile), undefined);

    await assert.becomes(utils.findSubFolders(outputFile), environments);

    for (const env of environments) {

        const expectedJsonPath = path.join(
            __dirname,
            testFolder,
            "expectedResults",
            env,
            `${testConfigFileName}.json`
        );
        const expectedJson = await fs.readJson(expectedJsonPath);

        // Compare results to expected results
        const outputJson = path.join(outputFile, env, `${testConfigFileName}.json`);
        await assert.becomes(fs.pathExists(outputJson), true);
        const json = await fs.readJson(outputJson);

        expect(json).toEqual(expectedJson);
    }
}

describe("hydrate:", () => {

    describe("File:", () => {

        beforeEach(() => {
            fs.removeSync(outputFolder);
        });

        it("Should hydrate successfully", async () => {
            const testFolderName = "apps/client";
            const testConfigFileName = "app.config";

            const configEnvironments = ["dev", "local", "prod", "qat"];
            await validateConfigFile(testFolderName, testConfigFileName, configEnvironments);
        });

        it("Should dry-run hydrate successfully ", async () => {
            const inputFile = path.join(inputFolder, "client/app.config.yaml");

            // undefined args imply loading from default file locations, or throw an error if they do not exist
            // `environments` are loaded from inputFile local directory `environments.yaml`
            // `percyConfig` is loaded from inputFile local directory `.percyrc`, if this does not exist it will be replaced with the default config.
            // `outputFolder` when undefined there is no output written to files. Only a success/fail result on hydration.
            // -- This acts like a linter for the hydrated config file, or a "dry-run" hydration.

            // If anything fails in the hydration of this file then an error is thrown.
            await assert.becomes(hydrate.hydrateFile(inputFile, undefined, undefined, undefined), undefined);

            expect(fs.existsSync(outputFolder)).toBeFalsy();
        });

        it("with anchors and aliases", async () => {
            const testFolderName = "apps/client";
            const testConfigFileName = "app.config";
            const configEnvironments = ["dev", "local", "prod", "qat"];

            await validateConfigFile(testFolderName, testConfigFileName, configEnvironments);
        });

        it("With template environment to Ignore", async () => {

            const testFolderName = "appWithTemplateEnvToIgnore";
            const testConfigFileName = "app.config";

            const configEnvironments = ["dev", "local"];

            await validateConfigFile(testFolderName, testConfigFileName, configEnvironments);

        });

        it("Config with array", async () => {
            const testFolderName = "appWithArrayProperty";
            const testConfigFileName = "array.config";

            const configEnvironments = ["dev", "local", "prod", "qat"];

            await validateConfigFile(testFolderName, testConfigFileName, configEnvironments);
        });

        describe("including external files", () => {

            it("Config with include array", async () => {
                const testFolderName = "appWithIncludeProperty";
                const testConfigFileName = "includeArray.config";

                const configEnvironments = ["dev", "local", "prod", "qat"];

                await validateConfigFile(testFolderName, testConfigFileName, configEnvironments);
            });

            it("include local file", async () => {
                const testFolderName = "appWithIncludeProperty";
                const testConfigFileName = "includeFile.config";

                const configEnvironments = ["dev", "local", "prod", "qat"];

                await validateConfigFile(testFolderName, testConfigFileName, configEnvironments);
            });

            it.skip("include file from gitlab project path", async () => {
                const testFolderName = "appWithIncludeProperty";
                const testConfigFileName = "includeProject.config";

                const configEnvironments = ["dev", "local", "prod", "qat"];

                await validateConfigFile(testFolderName, testConfigFileName, configEnvironments);
            });

            it("include property from url", async () => {
                const testFolderName = "appWithIncludeProperty";
                const testConfigFileName = "includeURL.config";

                const configEnvironments = ["dev", "local", "prod", "qat"];

                await validateConfigFile(testFolderName, testConfigFileName, configEnvironments);
            });

        });

        it("Config with single template Extension", async () => {
            const testFolderName = "appWithTemplateExtension";
            const testConfigFileName = "single-extension.config";

            const configEnvironments = ["local"];

            await validateConfigFile(testFolderName, testConfigFileName, configEnvironments);
        });

        it("Config with double template Extension", async () => {
            const testFolderName = "appWithTemplateExtension";
            const testConfigFileName = "double-extension.config";

            const configEnvironments = ["local"];

            await validateConfigFile(testFolderName, testConfigFileName, configEnvironments);
        });

        it("Config with inherits env", async () => {
            const testFolderName = "appWithInheritsEnv";
            const testConfigFileName = "app.config";

            const configEnvironments = ["dev", "local"];

            await validateConfigFile(testFolderName, testConfigFileName, configEnvironments);
        });

        it("Config with variable", async () => {
            const testFolderName = "appWithVariable";
            const testConfigFileName = "app.config";

            const configEnvironments = ["dev", "local"];

            await validateConfigFile(testFolderName, testConfigFileName, configEnvironments);
        });

        it("Config with inherits variable", async () => {
            const testFolderName = "appWithInheritsVariable";
            const testConfigFileName = "app.config";

            const configEnvironments = ["dev", "local"];

            await validateConfigFile(testFolderName, testConfigFileName, configEnvironments);
        });

        it("Config with env variable", async () => {
            const testFolderName = "appWithEnvVariable";
            const testConfigFileName = "app.config";

            const configEnvironments = ["dev", "local"];

            await validateConfigFile(testFolderName, testConfigFileName, configEnvironments);
        });
    });

    describe("App:", () => {
        beforeEach(() => {
            fs.removeSync(outputFolder);
        });
        it("Success", async () => {
            const inputFile = path.join(inputFolder, "/client");
            const outputFile = path.join(outputFolder, "/client");
            await assert.becomes(hydrate.hydrateApp(inputFile, undefined, outputFile), undefined);
        });
        it("Success without output", async () => {
            const inputFile = path.join(inputFolder, "/client");
            await assert.becomes(hydrate.hydrateApp(inputFile, undefined, undefined), undefined);
            expect(fs.existsSync(outputFolder)).toBeFalsy();
        });
    });

    describe("All:", () => {
        beforeEach(() => {
            fs.removeSync(outputFolder);
        });
        it("Invalid input folder", async () => {
            await assert.isRejected(hydrate.hydrateAllApps("wrong-input", outputFolder), "ENOENT: no such file or directory, scandir");
        });
        it("Success", async () => {
            await assert.becomes(hydrate.hydrateAllApps(inputFolder, outputFolder), undefined);
        });
        it("Success without output", async () => {
            await assert.becomes(hydrate.hydrateAllApps(inputFolder, undefined), undefined);
            expect(fs.existsSync(outputFolder)).toBeFalsy();
        });
    });

    describe("Should fail hydration", () => {

        it(" When: No 'environments.yaml' file found", async () => {
            const inputFile = path.join(__dirname, "data/appWithInvalidConfig/appWithoutEnvironments");
            const outputFile = path.join(outputFolder, "/appWithInvalidConfig/appWithoutEnvironments");
            const envFileName: string = config.get("ENVIRONMENT_FILE_NAME");
            const envFilePath = path.join(inputFile, envFileName);

            await assert.isRejected(hydrate.hydrateApp(inputFile, undefined, outputFile), `Environment file '${envFilePath}' doesn't exist`);

        });

        describe("and Should throw error message When:", () => {

            it("Config missing 'default' node", async () => {
                const inputFile = path.join(
                    __dirname,
                    "data/appWithInvalidConfig/missing.default.node.yaml"
                );
                const outputFile = path.join(outputFolder, "/appWithInvalidConfig");
                try {
                    await hydrate.hydrateFile(inputFile, undefined, undefined, outputFile);
                    assert.fail("should throw error");
                } catch (e) {
                    const regExp = /requires property "default"/;
                    expect(e.messages[0]).toMatch(regExp);
                    console.info(chalk.bold("appWithInvalidConfig/") + chalk.green("missing.default.node.yaml"),chalk.red(" expected error message above"));

                }
            });

            it("Config Missing 'environments' node", async () => {
                const inputFile = path.join(
                    __dirname,
                    "data/appWithInvalidConfig/missing.environments.node.yaml"
                );
                const outputFile = path.join(outputFolder, "/appWithInvalidConfig");
                try {
                    await hydrate.hydrateFile(inputFile, undefined, undefined, outputFile);
                    assert.fail("should throw error");
                } catch (e) {
                    expect(e.messages[0]).toMatch(/requires property "environments"/);
                    console.info(chalk.bold("appWithInvalidConfig/") + chalk.green("missing.environments.node.yaml"),chalk.red(" expected error message above"));
                }
            });

            it("Environment contains inconsistent property type", async () => {
                const inputFile = path.join(
                    __dirname,
                    "data/appWithInvalidConfig/inconsistent.type.property.yaml"
                );
                const outputFile = path.join(
                    outputFolder,
                    "/appWithInvalidConfig"
                );
                try {
                    await hydrate.hydrateFile(inputFile, undefined, undefined, outputFile);
                    assert.fail("should throw error");
                } catch (e) {
                    expect(e.messages[0]).toEqual(
                        "env.qat: Type is different from default node for property server.host in this node"
                    );
                    console.info(chalk.bold("appWithInvalidConfig/") + chalk.green("inconsistent.type.property.yaml"),chalk.red(" expected error message above"));
                }
            });

            it("Config contains undefined variable", async () => {
                const inputFile = path.join(
                    __dirname,
                    "data/appWithInvalidConfig/undefined.variable.yaml"
                );
                const outputFile = path.join(outputFolder, "/appWithInvalidConfig");
                try {
                    await hydrate.hydrateFile(inputFile, undefined, undefined, outputFile);
                    assert.fail("should throw error");
                } catch (e) {
                    expect(e.messages[0]).toEqual("env.local: Cannot resolve variables for: undefined_variable");
                    console.info(chalk.bold("appWithInvalidConfig/") + chalk.green("undefined.variable.yaml"),chalk.red(" expected error message above"));
                }
            });

            it("Config contains undefined property", async () => {
                const inputFile = path.join(
                    __dirname,
                    "data/appWithInvalidConfig/undefined.property.yaml"
                );
                const outputFile = path.join(outputFolder, "/appWithInvalidConfig");
                try {
                    await hydrate.hydrateFile(inputFile, undefined, undefined, outputFile);
                    assert.fail("should throw error");
                } catch (e) {
                    expect(e.messages[0]).toEqual("env.dev: Cannot find property undefinedProperty in this node");
                    console.info(chalk.bold("appWithInvalidConfig/") + chalk.green("undefined.property.yaml"),chalk.red(" expected error message above"));
                }
            });


            it("Config contains cyclic environment inheritance", async () => {
                const inputFile = path.join(
                    __dirname,
                    "data/appWithInvalidConfig/cyclic.env.inherits.yaml"
                );
                const outputFile = path.join(outputFolder, "/appWithInvalidConfig");
                try {
                    await hydrate.hydrateFile(inputFile, undefined, undefined, outputFile);
                    assert.fail("should throw error");
                } catch (e) {
                    expect(e.messages[0]).toMatch(/Cyclic environment inheritance detected/);
                    console.info(chalk.bold("appWithInvalidConfig/") + chalk.green("cyclic.env.inherits.yaml"),":",chalk.red(" expected error message above"));
                }
            });

            it("Config contains cyclic token reference", async () => {
                const inputFile = path.join(
                    __dirname,
                    "data/appWithInvalidConfig/cyclic.token.reference.yaml"
                );
                const outputFile = path.join(
                    outputFolder,
                    "/appWithInvalidConfig"
                );
                try {
                    await hydrate.hydrateFile(inputFile, undefined, undefined, outputFile);
                    assert.fail("should throw error");
                } catch (e) {
                    expect(e.messages[0]).toMatch(/Cyclic variable reference detected/);
                    console.info(chalk.bold("appWithInvalidConfig/") + chalk.green("cyclic.token.reference.yaml"),chalk.red(" expected error message above"));
                }
            });

            it("Config contains token cyclic self reference", async () => {
                const inputFile = path.join(
                    __dirname,
                    "data/appWithInvalidConfig/self-reference.yaml"
                );
                const outputFile = path.join(
                    outputFolder,
                    "/appWithInvalidConfig"
                );
                try {
                    await hydrate.hydrateFile(inputFile, undefined, undefined, outputFile);
                    assert.fail("should throw error");
                } catch (e) {
                    expect(e.messages[0]).toMatch(/Loop variable reference/);
                    console.info(chalk.bold("appWithInvalidConfig/") + chalk.green("self-reference.yaml"),chalk.red(" expected error message above"));
                }
            });
        });

    });

});

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

import chalk from "chalk";
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as config from "config";
import * as fs from "fs-extra";
import * as path from "path";
import { utils } from "../src/lib/common/index";
import { Hydrate } from "../src/lib/hydrate.lib";

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
    // Compare results to expected results
    const outputJson = path.join(outputFile, env, `${testConfigFileName}.json`);

    await assert.becomes(fs.pathExists(outputJson), true);

    const json = await fs.readJson(outputJson);

    const expectedJsonPath = path.join(
        __dirname,
        testFolder,
        "expectedResults",
        env,
        `${testConfigFileName}.json`
    );
    const expectedJson = await fs.readJson(expectedJsonPath);

    expect(json).toEqual(expectedJson);
  }
}

describe("hydrate", () => {

  describe("File", () => {

    beforeEach(() => {
      fs.removeSync(outputFolder);
    });

    it("Success", async () => {
      const testFolderName = "apps/shop";
      const testConfigFileName = "app.config";

      const configEnvironments = ["dev", "local", "prod", "qat"];
      await validateConfigFile(testFolderName, testConfigFileName, configEnvironments);
    });

    it("Success without output", async () => {
      const inputFile = path.join(inputFolder, "shop/app.config.yaml");
      await assert.becomes(hydrate.hydrateFile(inputFile, undefined, undefined, undefined), undefined);
      expect(fs.existsSync(outputFolder)).toBeFalsy();
    });

    it("YAML with anchors and aliases", async () => {
      const testFolderName = "apps/shop";
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

    it("Config with include file", async () => {
      const testFolderName = "appWithIncludeProperty";
      const testConfigFileName = "includeFile.config";

      const configEnvironments = ["dev", "local", "prod", "qat"];

      await validateConfigFile(testFolderName, testConfigFileName, configEnvironments);
    });

    it("Config with include url", async () => {
      const testFolderName = "appWithIncludeProperty";
      const testConfigFileName = "includeURL.config";

      const configEnvironments = ["dev", "local", "prod", "qat"];

      await validateConfigFile(testFolderName, testConfigFileName, configEnvironments);
    });

    it("Config with include array", async () => {
      const testFolderName = "appWithIncludeProperty";
      const testConfigFileName = "includeArray.config";

      const configEnvironments = ["dev", "local", "prod", "qat"];

      await validateConfigFile(testFolderName, testConfigFileName, configEnvironments);
    });
  });

  describe("App", () => {
    beforeEach(() => {
      fs.removeSync(outputFolder);
    });
    it("Success", async () => {
      const inputFile = path.join(inputFolder, "/shop");
      const outputFile = path.join(outputFolder, "/shop");
      await assert.becomes(hydrate.hydrateApp(inputFile, undefined, outputFile), undefined);
    });
    it("Success without output", async () => {
      const inputFile = path.join(inputFolder, "/shop");
      await assert.becomes(hydrate.hydrateApp(inputFile, undefined, undefined), undefined);
      expect(fs.existsSync(outputFolder)).toBeFalsy();
    });
  });

  describe("All", () => {
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

  describe( "Crash Test Dummies", () => {

    beforeEach(() => {
      console.error(chalk.red("!!! Crash Test Dummy: Error is expected !!!"));
    });

    it("No environments file", async () => {
      const inputFile = path.join(__dirname, "data/appWithInvalidConfig/appWithoutEnvironments");
      const outputFile = path.join(outputFolder, "/appWithInvalidConfig/appWithoutEnvironments");
      const envFileName: string = config.get("ENVIRONMENT_FILE_NAME");
      const envFilePath = path.join(inputFile, envFileName);
      await assert.isRejected(hydrate.hydrateApp(inputFile, undefined, outputFile), `Environment file '${envFilePath}' doesn't exist`);
    });

    it("Missing 'default' node", async () => {
      const inputFile = path.join(
          __dirname,
          "data/appWithInvalidConfig/missing.default.node.yaml"
      );
      const outputFile = path.join(outputFolder, "/appWithInvalidConfig");
      try {
        await hydrate.hydrateFile(inputFile, undefined, undefined, outputFile);
        assert.fail("should throw error");
      } catch (e) {
        expect(e.messages[0]).toMatch(/requires property "default"/);
      }
    });

    it("Missing 'environments' node", async () => {
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
      }
    });

    it("Env Contains inconsistent type Property", async () => {
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
      }
    });

    it("Undefined variable", async () => {
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
      }
    });

    it("Undefined property", async () => {
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
      }
    });


    it("Cyclic Inherits", async () => {
      const inputFile = path.join(
          __dirname,
          "data/appWithInvalidConfig/cyclic.env.inherits.yaml"
      );
      const outputFile = path.join(outputFolder, "/appWithInvalidConfig");
      try {
        await hydrate.hydrateFile(inputFile, undefined, undefined, outputFile);
        assert.fail("should throw error");
      } catch (e) {
        expect(e.messages[0]).toMatch(/Cyclic env inherits detected/);
      }
    });

    it("Token Cyclic Reference", async () => {
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
      }
    });

    it("Token Cyclic Self Reference", async () => {
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
      }
    });

  });

});

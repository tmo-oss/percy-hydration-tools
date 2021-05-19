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

describe("hydrate", () => {
  describe("hydrateFile", () => {
    afterEach(() => {
      fs.removeSync(outputFolder);
    });
    it("Success", async () => {
      const inputFile = path.join(inputFolder, "shop/app.config.yaml");
      const outputFile = path.join(outputFolder, "/shop");
      await assert.becomes(hydrate.hydrateFile(inputFile, undefined, undefined, outputFile), undefined);
      const envs = ["dev", "local", "prod", "qat"];
      await assert.becomes(utils.findSubFolders(outputFile), envs);
      for (const env of envs) {
        // Compare results to expected results
        const outputJson = path.join(outputFile, env, "app.config.json");
        await assert.becomes(fs.pathExists(outputJson), true);
        const json = await fs.readJson(outputJson);
        const expectedJsonPath = path.join(
          __dirname,
          "data/expectedResults",
          env,
          "app.config.json"
        );
        const expectedJson = await fs.readJson(expectedJsonPath);
        assert.deepEqual(json, expectedJson);
      }
    });
    it("Success without output", async () => {
      const inputFile = path.join(inputFolder, "shop/app.config.yaml");
      await assert.becomes(hydrate.hydrateFile(inputFile, undefined, undefined, undefined), undefined);
      assert(!fs.existsSync(outputFolder));
    });
    it("YAML with anchors and aliases", async () => {
      const inputFile = path.join(inputFolder, "shop/app.config.yaml");
      const outputFile = path.join(outputFolder, "/shop");
      await assert.becomes(
        hydrate.hydrateFile(inputFile, undefined, undefined, outputFile), undefined);
      const envs = ["dev", "local", "prod", "qat"];
      await assert.becomes(utils.findSubFolders(outputFile), envs);
      for (const env of envs) {
        // Compare results to expected results
        const outputJson = path.join(outputFile, env, "app.config.json");
        await assert.becomes(fs.pathExists(outputJson), true);
        const json = await fs.readJson(outputJson);
        const expectedJsonPath = path.join(
          __dirname,
          "data/expectedResults",
          env,
          "app.config.json"
        );
        const expectedJson = await fs.readJson(expectedJsonPath);
        assert.deepEqual(json, expectedJson);
      }
    });

    it("No default block", async () => {
      const inputFile = path.join(
        __dirname,
        "data/appWithInvalidConfig/no.default.yaml"
      );
      const outputFile = path.join(outputFolder, "/appWithInvalidConfig");
      try {
        await hydrate.hydrateFile(inputFile, undefined, undefined, outputFile);
        assert.fail("should throw error");
      } catch (e) {
        assert.match(e.messages[0], /requires property "default"/);
      }
    });

    it("No environments block", async () => {
      const inputFile = path.join(
        __dirname,
        "data/appWithInvalidConfig/no.environments.yaml"
      );
      const outputFile = path.join(outputFolder, "/appWithInvalidConfig");
      try {
        await hydrate.hydrateFile(inputFile, undefined, undefined, outputFile);
        assert.fail("should throw error");
      } catch (e) {
        assert.match(e.messages[0], /requires property "environments"/);
      }
    });

    it("Env Contains New Property", async () => {
      const inputFile = path.join(
        __dirname,
        "data/appWithNewPropertyInEnvNode/app.config.yaml"
      );
      const outputFile = path.join(
        outputFolder,
        "/appWithNewPropertyInEnvNode"
      );
      try {
        await hydrate.hydrateFile(inputFile, undefined, undefined, outputFile);
        assert.fail("should throw error");
      } catch (e) {
        assert.equal(e.messages[0], "env.qat: Cannot find property envNewProperty in this node");
      }
    });

    it("Env Contains inconsistent type Property", async () => {
      const inputFile = path.join(
        __dirname,
        "data/appWithNewPropertyInEnvNode/type-test.config.yaml"
      );
      const outputFile = path.join(
        outputFolder,
        "/appWithNewPropertyInEnvNode"
      );
      try {
        await hydrate.hydrateFile(inputFile, undefined, undefined, outputFile);
        assert.fail("should throw error");
      } catch (e) {
        assert.equal(e.messages[0], "env.qat: Type is different from default node for property server.host in this node");
      }
    });

    it("Unresolvable variable", async () => {
      const inputFile = path.join(
        __dirname,
        "data/appWithInvalidConfig/invalid.variables.yaml"
      );
      const outputFile = path.join(outputFolder, "/appWithInvalidConfig");
      try {
        await hydrate.hydrateFile(inputFile, undefined, undefined, outputFile);
        assert.fail("should throw error");
      } catch (e) {
        assert.equal(e.messages[0], "env.local: Cannot resolve variables for: middlewareurl");
      }
    });

    it("Cyclic Inherits", async () => {
      const inputFile = path.join(
        __dirname,
        "data/appWithCyclicInherits/app.config.yaml"
      );
      const outputFile = path.join(outputFolder, "/appWithCyclicInherits");
      try {
        await hydrate.hydrateFile(inputFile, undefined, undefined, outputFile);
        assert.fail("should throw error");
      } catch (e) {
        assert.match(e.messages[0], /Cyclic env inherits detected/);
      }
    });

    it("Token Cyclic Reference", async () => {
      const inputFile = path.join(
        __dirname,
        "data/appWithTokenCyclicReference/app.config.yaml"
      );
      const outputFile = path.join(
        outputFolder,
        "/appWithTokenCyclicReference"
      );
      try {
        await hydrate.hydrateFile(inputFile, undefined, undefined, outputFile);
        assert.fail("should throw error");
      } catch (e) {
        assert.match(e.messages[0], /Cyclic variable reference detected/);
      }
    });

    it("Token Cyclic Self Reference", async () => {
      const inputFile = path.join(
        __dirname,
        "data/appWithTokenCyclicReference/self-reference.yaml"
      );
      const outputFile = path.join(
        outputFolder,
        "/appWithTokenCyclicReference"
      );
      try {
        await hydrate.hydrateFile(inputFile, undefined, undefined, outputFile);
        assert.fail("should throw error");
      } catch (e) {
        assert.match(e.messages[0], /Loop variable reference/);
      }
    });

    it("With VariableNamePrefix key", async () => {
      const inputFile = path.join(
        __dirname,
        "data/appWithVariableNamePrefixKey/app.config.yaml"
      );
      const outputFile = path.join(
        outputFolder,
        "/appWithVariableNamePrefixKey"
      );
      await assert.becomes(
        hydrate.hydrateFile(inputFile, undefined, undefined, outputFile), undefined);
      const envs = ["dev", "local", "prod", "qat"];
      await assert.becomes(utils.findSubFolders(outputFile), envs);
      for (const env of envs) {
        // Compare results to expected results
        const outputJson = path.join(outputFile, env, "app.config.json");
        await assert.becomes(fs.pathExists(outputJson), true);
        const json = await fs.readJson(outputJson);
        const expectedJsonPath = path.join(
          __dirname,
          "data/expectedResults",
          env,
          "app.config.json"
        );
        const expectedJson = await fs.readJson(expectedJsonPath);
        if (env === "qat") {
          expectedJson.apihost = `${expectedJson.apihost}/newvar`
        }
        assert.deepEqual(json, expectedJson);
      }
    });

    it("With Env to Ignore", async () => {
      const inputFile = path.join(
        __dirname,
        "data/appWithEnvToIgnore/app.config.yaml"
      );
      const outputFile = path.join(
        outputFolder,
        "/appWithEnvToIgnore"
      );
      await assert.becomes(
        hydrate.hydrateFile(inputFile, undefined, undefined, outputFile), undefined);
      const envs = ["dev", "local", "prod", "qat"];
      await assert.becomes(utils.findSubFolders(outputFile), envs);
      for (const env of envs) {
        // Compare results to expected results
        const outputJson = path.join(outputFile, env, "app.config.json");
        await assert.becomes(fs.pathExists(outputJson), true);
        const json = await fs.readJson(outputJson);
        const expectedJsonPath = path.join(
          __dirname,
          "data/expectedResults",
          env,
          "app.config.json"
        );
        const expectedJson = await fs.readJson(expectedJsonPath);
        assert.deepEqual(json, expectedJson);
      }
    });

    it("Config with array", async () => {
      const inputFile = path.join(
        __dirname,
        "data/appWithTokenCyclicReference/array.config.yaml"
      );
      const outputFile = path.join(
        outputFolder,
        "/appWithTokenCyclicReference"
      );
      await assert.becomes(
        hydrate.hydrateFile(inputFile, undefined, undefined, outputFile)
      , undefined);
      const envs = ["dev", "local", "prod", "qat"];
      await assert.becomes(utils.findSubFolders(outputFile), envs);
    });

    it("Config with include file", async () => {
      const inputFile = path.join(
        __dirname,
        "data/appWithIncludeProperty/includeFile.config.yaml"
      );
      const outputFile = path.join(
        outputFolder,
        "/appWithIncludeProperty"
      );
      await assert.becomes(
        hydrate.hydrateFile(inputFile, undefined, undefined, outputFile)
      , undefined);
      const envs = ["dev", "local", "prod", "qat"];
      await assert.becomes(utils.findSubFolders(outputFile), envs);
    });

    it("Config with include url", async () => {
      const inputFile = path.join(
        __dirname,
        "data/appWithIncludeProperty/includeURL.config.yaml"
      );
      const outputFile = path.join(
        outputFolder,
        "/appWithIncludeProperty"
      );
      await assert.becomes(
        hydrate.hydrateFile(inputFile, undefined, undefined, outputFile)
      , undefined);
      const envs = ["dev", "local", "prod", "qat"];
      await assert.becomes(utils.findSubFolders(outputFile), envs);
    });

    it("Config with include array", async () => {
      const inputFile = path.join(
        __dirname,
        "data/appWithIncludeProperty/includeArray.config.yaml"
      );
      const outputFile = path.join(
        outputFolder,
        "/appWithIncludeProperty"
      );
      await assert.becomes(
        hydrate.hydrateFile(inputFile, undefined, undefined, outputFile)
      , undefined);
      const envs = ["dev", "local", "prod", "qat"];
      await assert.becomes(utils.findSubFolders(outputFile), envs);
    });
  });

  describe("hydrateApp", () => {
    afterEach(() => {
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
      assert(!fs.existsSync(outputFolder));
    });
    it("No environments file", async () => {
      const inputFile = path.join(__dirname, "data/appWithoutEnvironments");
      const outputFile = path.join(outputFolder, "/appWithoutEnvironments");
      const envFileName: string = config.get("ENVIRONMENT_FILE_NAME");
      const envFilePath = path.join(inputFile, envFileName);
      await assert.isRejected(hydrate.hydrateApp(inputFile, undefined, outputFile), `Environment file '${envFilePath}' doesn't exist`);
    });
  });

  describe("hydrateAllApps", () => {
    afterEach(() => {
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
      assert(!fs.existsSync(outputFolder));
    });
  });
});

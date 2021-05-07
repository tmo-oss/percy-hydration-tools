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
import { CompareJson } from "../src/lib/compare-json.lib";

chai.use(chaiAsPromised);
const assert = chai.assert;

const compareJson = new CompareJson({});

describe("compare-json", () => {
  it("Non-existent files", async () => {
    await assert.isRejected(
      compareJson.compare("test/data/.percyrc", "wrong-file-name.json")
      , "ENOENT: no such file or directory, open");
    await assert.isRejected(
      compareJson.compare("wrong-file-name.json", "test/data/.percyrc")
      , "ENOENT: no such file or directory, open");
  });

  it("Same files", async () => {
    await assert.becomes(compareJson.compare("test/data/.percyrc", "test/data/.percyrc"), undefined);
  });

  it("Different files", async () => {
    await assert.becomes(
      compareJson.compare("test/data/.percyrc", "test/data/modified.percyrc"),
      {
        newField: [{ field: 0 }],
        variableNamePrefix: ["_", "?"],
        variableSuffix: ["}", 0, 0]
      });
  });
});

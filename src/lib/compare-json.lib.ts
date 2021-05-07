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

/**
 * compare-json library module
 */
import * as fs from "fs-extra";
import * as jsondiffpatch from "jsondiffpatch";

/**
 * The compare json options.
 */
export class CompareJson {
  private options: Record<string, unknown>;

  /**
   * the constructor.
   * @param options the options.
   */
  constructor(options: Record<string, unknown>) {
    this.options = options;
  }
  /**
   * Read and compare two given JSON files and produce a Delta object
   * @param firstJSONFilePath JSON file path
   * @param secondJSONFilePath JSON file path
   */
  public async compare(
    firstJSONFilePath: string,
    secondJSONFilePath: string
  ): Promise<jsondiffpatch.Delta | undefined> {
    const firstJSONFile = await fs.readJson(firstJSONFilePath);
    const secondJSONFile = await fs.readJson(secondJSONFilePath);
    return jsondiffpatch.diff(firstJSONFile, secondJSONFile);
  }
}

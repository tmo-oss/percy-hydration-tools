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
 * Utility functions
 */
import * as fs from "fs-extra";
import axios from "axios";
import { URL } from "url";
import * as yaml from "js-yaml";
import { Validator } from "jsonschema";
import * as _ from "lodash";
import * as path from "path";
import { IAppConfig, IPercyConfig } from "../interfaces";
import { getLogger } from "./index";

/**
 * Read and validate YAML config file
 * @param filePath the YAML file path
 * @param environments the environments
 * @param percyConfig the percy config
 */
export async function readAppConfigYAML(
  filePath: string,
  environments: string[],
  percyConfig: IPercyConfig,
  colorConsole?: boolean
): Promise<Record<string, unknown>> {
  const appConfig = await readYAML(filePath);
  const validatedAppConfig = validateAppConfig(appConfig, filePath);
  let envNodes;
  try {
    envNodes = mergeEnvNodes(validatedAppConfig, environments);
  } catch (e) {
    getLogger(colorConsole).error(`Error in process file: ${filePath}.`, e);
    throw new Error(`Error in process file: ${filePath}.\nCause: ${e.message}`);
  }
  const result = {};
  // Resolve variables of each environment
  _.each(envNodes, (envNode, environment) => {
    try {
      _.set(
        result,
        environment,
        resolveVariables(envNode as Record<string, unknown>, environment, percyConfig)
      );
    } catch (e) {
      getLogger(colorConsole).error(`Cannot resolve variables at (${filePath} env:${environment}).`, e);
      throw new Error(`Cannot resolve variables at (${filePath} env:${environment}).\nCause: ${e.message}`);
    }
  });
  return result;
}

/**
 * Read environment file
 * @param envFileFolderPath environment file path
 * @param configOptions the hydrate lib options.
 */
export async function loadEnvironmentsFile(
  envFileFolderPath: string,
  configOptions: Record<string, unknown>,
  colorConsole?: boolean
): Promise<string[]> {
  const envFileName: string = configOptions.ENVIRONMENT_FILE_NAME as string;
  const envFilePath = path.join(envFileFolderPath, envFileName);
  const isFileExists = await fs.pathExists(envFilePath);
  if (!isFileExists) {
    throw new Error(`Environment file '${envFilePath}' doesn't exist`);
  }
  const appConfig = await readYAML(envFilePath);
  const validatedAppConfig = validateAppConfig(
    appConfig,
    envFilePath,
    colorConsole
  );
  return Object.keys(validatedAppConfig.environments);
}

/**
 * Read yaml file and parse it
 * @param filepath filepath
 */
async function readYAML(filepath: string): Promise<IAppConfig> {
  const file = await fs.readFile(filepath, "utf8");
  const result = yaml.load(file) as IAppConfig
  await loadInclude(result.default)
  await loadInclude(result.environments)
  return result;
}

/**
 * Load include data
 * @param obj the include parent object
 */
async function loadInclude(obj: Record<string, unknown>): Promise<Record<string, unknown>> {
  for (const key in obj) {
    if (key === "include" && _.isArray(obj[key])) {
      for (const path of obj[key] as [string]) {
        const includeRecord = await readIncludeYAML(path);
        for (const iKey in includeRecord) {
          _.set(obj, iKey, includeRecord[iKey]);
        }
      }
      delete obj.include
    } else if (key === "include" && _.isString(obj[key])) {
      const includeRecord = await readIncludeYAML(obj[key] as string);
      for (const iKey in includeRecord) {
        _.set(obj, iKey, includeRecord[iKey]);
      }
      delete obj.include
    } else if (_.isObject(obj[key])) {
      await loadInclude(obj[key] as Record<string, unknown>);
    }
  }
  return obj;
}

/**
 * Read include yaml and parse it
 * @param path the include path
 */
async function readIncludeYAML(path: string): Promise<Record<string, unknown>> {
  if (isUrl(path)) {
    const res = await axios.get(path, { responseType: "text" });
    return yaml.load(res.data) as Record<string, unknown>;
  } else {
    const file = await fs.readFile(path, "utf8");
    return yaml.load(file) as Record<string, unknown>;
  }
}

/**
 * Check if a string is a valid URL
 * @param path the url
 * @returns whether the path is url
 */
function isUrl(path: string): boolean {
  try {
    new URL(path);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Resolve variable references of an object
 * @param envNode input object
 * @param percyConfig percy configuration
 * @param env the environment name
 */
function resolveVariables(
  envNode: Record<string, unknown>,
  env: string,
  percyConfig: IPercyConfig
): Record<string, unknown> {
  const tokens = resolveTokens(envNode, env, percyConfig);
  // substitute
  let result = substitute(envNode, tokens, percyConfig);

  // remove those starts with variableNamePrefix
  if (percyConfig.variableNamePrefix) {
    const validKeys = _.keys(result).filter(
      key => !key.startsWith(percyConfig.variableNamePrefix)
    );
    result = _.pick(result, validKeys);
  }
  return result;
}

/**
 * Tokens (which are top level properties of default config) can also be variable and reference each other.
 * This method resolves them.
 *
 * @param envNode the env node data
 * @param env the environment name
 * @param percyConfig the percy config
 * @returns the resolved tokens
 */
function resolveTokens(
  envNode: Record<string, unknown>,
  env: string,
  percyConfig: IPercyConfig
): Record<string, string> {
  const tokens: Record<string, string> = {};
  tokens[percyConfig.envVariableName] = env;
  _.each(envNode, (value, key) => {
    if (!_.isArray(value) && !_.isObject(value)) {
      tokens[key] = value as string;
    }
  });
  const result: Record<string, string> = _.cloneDeep(tokens);
  const referenceLinks: string[][] = [];
  while (true) {
    let referenceFound = false;
    _.each(result, (value, key) => {
      if (typeof value !== "string") {
        return;
      }
      let retValue = value;
      const regExp = createRegExp(percyConfig);
      while (true) {
        const regExpResult = regExp.exec(value);
        if (!regExpResult) {
          break;
        }
        const fullMatch = regExpResult[0];
        const tokenName = regExpResult[1];
        const tokenValue = result[tokenName];
        if (typeof tokenValue === "string") {
          if (createRegExp(percyConfig).exec(tokenValue)) {
            referenceFound = true;
            addTokenReference(referenceLinks, key, tokenName);
            continue;
          }
          retValue = retValue.replace(fullMatch, tokenValue);
        }
      }
      result[key] = retValue;
    });
    if (!referenceFound) {
      break;
    }
  }

  return result;
}

/**
 * Substitute the strings with token values.
 * @param {object} obj the object to be substitute.
 * @param {object} tokens the token.
 * @param {IPercyConfigInterface} percyConfig the percy config.
 * @returns {object} the substitute object.
 */
function substitute(
  obj: Record<string, unknown>,
  tokens: Record<string, string>,
  percyConfig: IPercyConfig
): Record<string, unknown> {
  _.each(obj, (value, key) => {
    if (_.isArray(value)) {
      _.set(obj, key, substituteArray(value, tokens, percyConfig));
    } else if (_.isObject(value)) {
      _.set(obj, key, substitute(value as Record<string, unknown>, tokens, percyConfig));
    } else if (_.isString(value)) {
      _.set(obj, key, substituteString(value, tokens, percyConfig));
    }
  });
  return obj;
}

/**
 * Substitute the array with token values of array type.
 * @param {array} items the array to be substitute.
 * @param {object} tokens the token.
 * @param {IPercyConfigInterface} percyConfig the percy config.
 * @returns {object} the substitute object.
 */
function substituteArray(
  items: (Record<string, unknown>[] | Record<string, unknown> | string)[],
  tokens: Record<string, string>,
  percyConfig: IPercyConfig
): (Record<string, unknown>[] | Record<string, unknown> | string)[] {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (_.isArray(item)) {
      items[i] = substituteArray(item, tokens, percyConfig) as Record<string, unknown>[];
    } else if (_.isObject(item)) {
      items[i] = substitute(item, tokens, percyConfig);
    } else if (_.isString(item)) {
      items[i] = substituteString(item, tokens, percyConfig);
    }
  }
  return items;
}

/**
 * Substitute the string with token values of array type.
 * @param {string} str the array to be substitute.
 * @param {object} tokens the token.
 * @param {IPercyConfigInterface} percyConfig the percy config.
 * @returns {object} the substitute object.
 */
function substituteString(
  str: string,
  tokens: Record<string, string>,
  percyConfig: IPercyConfig
): string {
  let retValue = str;
  const regExp = createRegExp(percyConfig);
  while (true) {
    const regExpResult = regExp.exec(str);
    if (!regExpResult) {
      break;
    }
    const fullMatch = regExpResult[0];
    const tokenName = regExpResult[1];
    const tokenValue = _.get(tokens, tokenName);
    if (tokenValue) {
      retValue = retValue.replace(fullMatch, tokenValue);
    } else {
      throw new Error(`Cannot resolve variables for: ${tokenName}`);
    }
  }
  return retValue;
}
/**
 * Escape reg exp.
 *
 * @param text the text might contain reg exp to escape
 * @returns escaped text
 */
function escapeRegExp(text: string) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

/**
 * Create regexp for variable reference based on percy config.
 *
 * @returns regexp for variable reference
 */
function createRegExp(percyConfig: IPercyConfig) {
  const prefix = percyConfig.variablePrefix;
  const suffix = percyConfig.variableSuffix;
  const regexPattern = `${escapeRegExp(prefix)}(.+?)${escapeRegExp(suffix)}`;
  return new RegExp(regexPattern, "g");
}

/**
 * When resolve token variable references, we collect them to detect loop reference.
 * @param referenceLinks the collected reference links
 * @param refFrom the reference from (left side)
 * @param refTo the reference to (right side)
 * @throws Error if loop reference detected
 */
function addTokenReference(
  referenceLinks: string[][],
  refFrom: string,
  refTo: string
) {
  if (refFrom === refTo) {
    throw new Error("Loop variable reference: " + [refFrom, refTo].join("->"));
  }
  let added = false;
  _.each(referenceLinks, referenceLink => {
    if (referenceLink[referenceLink.length - 1] !== refFrom) {
      return;
    }

    const idx = referenceLink.indexOf(refTo);
    if (idx > -1) {
      const cyclic = referenceLink.slice(idx);
      cyclic.push(refTo);
      throw new Error(
        "Cyclic variable reference detected: " + cyclic.join("->")
      );
    }
    referenceLink.push(refTo);
    added = true;
  });

  if (!added) {
    referenceLinks.push([refFrom, refTo]);
  }
}

/**
 * Merge environment specific data with default ones
 * @param appConfig app configuration object
 * @param environments environment list
 */
function mergeEnvNodes(
  appConfig: IAppConfig,
  environments: string[]
): Record<string, unknown> {
  const mergedEnvNodes: Record<string, unknown> = {};
  // calculate the env in inherits order
  const sortedEnv = sortEnvByInherits(environments, appConfig.environments);
  // Apply default values to each environment
  sortedEnv.forEach(e =>
    _.set(
      mergedEnvNodes,
      e,
      // Merge default values and environment specific values
      mergeEnvNode(mergedEnvNodes, e, appConfig)
    )
  );
  return mergedEnvNodes;
}

/**
 * Merge the properties from parents into the env node.
 *
 * @param mergedEnvNodes the merged env nodes
 * @param env the environment name
 * @param appConfig app configuration object
 */
function mergeEnvNode(
  mergedEnvNodes: unknown,
  env: string,
  appConfig: IAppConfig
) {
  const parentEnvNode = getParentEnvNode(mergedEnvNodes, env, appConfig);
  const currentEnvNode = _.get(appConfig.environments, env);

  const mergedEnvNode = _.cloneDeep(parentEnvNode);

  mergeProperties(mergedEnvNode, currentEnvNode as Record<string, unknown>, env, "");

  return mergedEnvNode;
}

/**
 * Merge properties
 *
 * @param {object} dest the destination object
 * @param {object} src the source object
 * @param {string} env the env.
 * @param {string} propertyName the property name.
 */
function mergeProperties(
  dest: Record<string, unknown>,
  src: Record<string, unknown>,
  env: string,
  propertyName: string
) {
  _.each(src, (value, key) => {
    // ignore inherits key
    if (key !== "inherits") {
      const name = propertyName ? `${propertyName}.${key}` : key;
      if (!_.has(dest, key)) {
        throw new Error(`Cannot find property: ${name} in env node: ${env}.`);
      }
      const valueInDest = _.get(dest, key);
      if (typeof valueInDest !== typeof value) {
        throw new Error(
          `Type is different from default node for property: ${name} in env node: ${env}.`
        );
      }

      if (_.isPlainObject(value) && _.isPlainObject(valueInDest)) {
        mergeProperties(valueInDest as Record<string, unknown>, value as Record<string, unknown>, env, name);
      } else {
        _.set(dest, key, value);
      }
    }
  });
}

/**
 * Gets a env's inherits's values.
 * @param {object} mergedEnvNodes the calculate env values.
 * @param {string} env the current env to calculate.
 * @param {object} appConfig the env config.
 * @returns {object} the inherited value.
 */
function getParentEnvNode(
  mergedEnvNodes: unknown,
  env: string,
  appConfig: IAppConfig
): Record<string, unknown> {
  const inherits = _.get(_.get(appConfig.environments, env), "inherits");
  if (inherits) {
    return _.get(mergedEnvNodes, inherits) as Record<string, unknown>;
  }
  // no inherits, return default node
  return appConfig.default;
}

/**
 * Sort the environments by inheritance order. No inherites comes first.
 * @param {string[]} environments the environments.
 * @param {object} envNodes the config of the env nodes.
 * @returns {string[]} the calculated order.
 */
function sortEnvByInherits(environments: string[], envNodes: Record<string, unknown>): string[] {
  const orderedEnv: string[] = [];
  for (const env of environments) {
    if (orderedEnv.indexOf(env) >= 0) {
      continue;
    }
    const stack: string[] = [];
    let current = env;
    while (true) {
      stack.push(current);
      const inherits = _.get(_.get(envNodes, current), "inherits");
      if (!inherits) {
        // leaf
        break;
      } else {
        if (stack.indexOf(inherits) >= 0) {
          stack.push(inherits);
          throw new Error(
            "Cyclic env inherits detected: " + stack.join(" -> ")
          );
        } else {
          current = inherits;
        }
      }
    }
    for (let i = stack.length - 1; i >= 0; i--) {
      orderedEnv.push(stack[i]);
    }
  }
  return orderedEnv;
}

/**
 * Validate app configuration file
 * @param appConfig app configuration object
 * @param configFilePath config file path for logging purposes (optional)
 */
function validateAppConfig(
  appConfig: IAppConfig,
  configFilePath?: string,
  colorConsole?: boolean
): IAppConfig {
  const schema = {
    id: "/AppConfig",
    properties: {
      default: {
        type: "object"
      },
      environments: {
        type: "object"
      }
    },
    required: ["default", "environments"],
    type: "object"
  };
  const v = new Validator();
  const result = v.validate(appConfig, schema);
  if (!result.valid) {
    result.errors.forEach(e =>
      getLogger(colorConsole).error(
        e.message + `${configFilePath ? ` (${configFilePath})` : ""}`
      )
    );
    throw new Error(
      `Invalid config file format ${
        configFilePath ? `(${configFilePath})` : ""
      }`
    );
  }
  return appConfig;
}

/**
 * Ensure environment folders exist in output folder
 * @param environments environment list
 * @param outputFolder output folder
 */
async function ensureEnvironmentFolders(
  environments: string[],
  outputFolder: string
): Promise<void> {
  for (const env of environments) {
    await fs.ensureDir(path.join(outputFolder, env));
  }
}

/**
 * Write results json files to output folder
 * @param envNode the resolved environment specific data
 * @param yamlFilePath file path of the input yaml file
 * @param outputFolder output folder
 * @param percyConfig the percy config
 */
export async function writeResult(
  envNode: Record<string, unknown>,
  yamlFilePath: string,
  outputFolder: string,
  percyConfig: IPercyConfig
): Promise<void> {
  const environments = Object.keys(envNode).filter(
        (env) => {
          if (percyConfig.envIgnorePrefix && percyConfig.envIgnoreSuffix) {
            return !env.startsWith(percyConfig.envIgnorePrefix) || !env.endsWith(percyConfig.envIgnoreSuffix);
          } else if (percyConfig.envIgnorePrefix) {
            return !env.startsWith(percyConfig.envIgnorePrefix);
          } else if (percyConfig.envIgnoreSuffix) {
            return !env.endsWith(percyConfig.envIgnoreSuffix);
          }
          return true;
        });
  await ensureEnvironmentFolders(environments, outputFolder);
  const filename = path.basename(yamlFilePath, ".yaml");
  await Promise.all(
    environments.map(async env => {
      const outputFilepath = path.join(outputFolder, env, `${filename}.json`);
      await fs.writeJSON(outputFilepath, _.get(envNode, env), { spaces: 2 });
    })
  );
}

/**
 * List all files with .yaml extension inside given folder
 * @param folderPath folder path
 */
export async function findYamlFiles(folderPath: string): Promise<string[]> {
  const files = await fs.readdir(folderPath);
  return files
    .filter(f => path.extname(f) === ".yaml")
    .map(f => path.join(folderPath, f));
}

/**
 * List all sub folders inside given folder
 * @param folderPath folder path
 */
export async function findSubFolders(folderPath: string): Promise<string[]> {
  const files = await fs.readdir(folderPath);
  const folders: string[] = [];
  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const stat = await fs.lstat(filePath);
    if (stat.isDirectory()) {
      folders.push(file);
    }
  }
  return folders;
}

/**
 * strips the ansi color from string
 * @param str the string to strip
 */
export function stripColor(str: string) : string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B[[(?);]{0,2}(;?\d)*./g, "");
}

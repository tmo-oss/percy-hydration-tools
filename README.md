## Percival Hydration and JSON Comparison Command Line Utilities

## Prerequisites

- Node.js 10.15.x
- Npm 6

## Installation

```
npm install percy-cake-hydration-tools
```

Or install commands globally

```
npm install -g percy-cake-hydration-tools
```

## Documentation

Documentations are auto generated and can be accessed from `docs` folder. In order to generate docs
again you can call `npm run docs` command.

## Usage In Command Line

### compare-json

Script for comparing two json files and outputting their differences to stdout

`compare-json <path/to/file.json> <path/to/file.json>`

```bash
# Example
compare-json test/data/.percyrc test/data/modified.percyrc

# To generate HTML report
compare-json test/data/.percyrc test/data/modified.percyrc --out ./test/data/out/diff.html

# to turn off/on the console color  pass --consoleColor false/true respectively
compare-json test/data/.percyrc test/data/modified.percyrc --colorConsole=false
```

### hydrate

Script for processing YAML configuration files and converting it to environment specific JSON
configuration

`hydrate < --root | --app | --file > <path/to/input> < --linter | --out <path/to/output>>` It
provides three options

- `--root` `-r` for processing all apps in a root directory
- `--app` `-a` for processing a single app directory
- `--file` `-f` for processing a single file You should specify one of these three options.

- `--linter` `-l` validate the yaml file but don't generate json file
- `--out` `-o` generate json file in the directory You should specify one of these two options.

```bash
# Examples

# Process all apps
hydrate -r test/data/apps --out test/data/out/dist

# Process single app
hydrate -a test/data/apps/shop --out test/data/out/dist/shop

# Process single file
hydrate -f test/data/apps/shop/app.config.yaml --out test/data/out/dist/shop

# to turn off/on the console color  pass --consoleColor false/true respectively
hydrate -r test/data/apps --out test/data/out/dist --colorConsole=false
```

**_NOTE:_** if you are not installing globally, used the scripts like below instead:

```
node_modules/.bin/hydrate -r test/data/apps --out test/data/out/dist
node_modules/.bin/compare-json test/data/.percyrc test/data/modified.percyrc --out ./test/data/out/diff.html
```

## Configuration

Main configuration file can be found at `config/default.js`

| Variable                           | Description                                                           |
|:-----------------------------------|:----------------------------------------------------------------------|
| PERCY_LOG_LEVEL                    |                                                                       |
| PERCY_ENVIRONMENT_FILE_NAME        | Name of the environment file (default value: `environments.yaml`)     |
| PERCY_CONFIG_FILE_NAME             | Name of the percy configuration file (default value: `.percyrc`)      |
| PERCY_ENV_VARIABLE_NAME            | The YAML environment variable name (default value: `env`)             |
| PERCY_DEFAULT_ENV_IGNORE_PREFIX    | The prefix of env not to generate the config files (no default value) |
| PERCY_DEFAULT_ENV_IGNORE_SUFFIX    | The suffix of env not to generate the config files (no default value) |
| PERCY_DEFAULT_VARIABLE_PREFIX      | The YAML variable substitute prefix (default value: `_{`)             |
| PERCY_DEFAULT_VARIABLE_SUFFIX      | The YAML variable substitute suffix (default value: `}_`)             |
| PERCY_DEFAULT_VARIABLE_NAME_PREFIX | The YAML variable name prefix (default value: `$`)                    |
| PERCY_CONSOLE_COLORS               | The flag whether to colorize the console output or not                |
| PERSONAL_ACCESS_TOKEN              | The personal access token to fetch gitlab or github project file      |


### Local Data runtime config

The app folder can contain optional `.percyrc` files, which provide repository-specific or
folder-specific configuration settings.  
The following properties are supported now:

| Property        | Description                         | Default Value |
|:----------------|:------------------------------------|:--------------|
| envVariableName | The YAML environment variable name  | `env`         |
| variablePrefix  | The YAML variable substitute prefix | `{{`          |
| variableSuffix  | The YAML variable substitute suffix | `}}`          |
| envIgnorePrefix | The prefix of env to ignore         | `_`           |
| envIgnoreSuffix | The suffix of env to ignore         | `_`           |

If it's in the `apps` folder, the configuration applies to all applications, and if it's in the
specific application folder, it only applies to the corresponding application. When provided, the
default properties from the `config/default.js` will be overridden.

Here is an example of `.percyrc` file:

```json
{
  "envVariableName": "env",
  "variablePrefix": "{{",
  "variableSuffix": "}}",
  "envIgnorePrefix": "_",
  "envIgnoreSuffix": "_"
}
```



#### Special Environment Name Reference

`envVariableName` is the setting for what string of characters to use when referencing the name of
the current config environment. With this special named variable you can insert the name of the
environment into any config property.

**config.yaml**

```yaml
default:
   apiHost: "https://${env}.domain.com/api"

environments:
   local:
   qat:
   prod:
     apiHost: "https://domain.com/api"
```

This will generate 3 separate configuration files :

**local.config.json**

```json
{
   "apiHost": "https://local.domain.com/api"
}
```

**qat.config.json**

```json
{
   "apiHost": "https://qat.domain.com/api"
}
```

**prod.config.json**

```json
{
   "apiHost": "https://domain.com/api"
}
```




#### Variable Delimiters

`variablePrefix` and `variableSuffix` define delimiters for variables. Variables are used to define
and insert common values across numerous properties. This helps to DRY your configurations by
extracting common values into a set of named symbols (variables) that can be used to insert the
value into expected configuration properties.

**config.yaml**

```yaml
default:

  variables:
    _middlewareurl: !!str "https://default.middleware.test.com"
    _dcphost: !!str "https://default.api.test.com"
    _api-path: !!str "/path/to/api"

  middlewareapipath: !!str "${_middlewareurl}/mw/api/path"
  apihost: !!str "http://txnext-gen.com${_api-path}"

  dcpendpoints: !!map
    dcpcart: !!str "${_dcphost}/api/cart"
    dcpupdate: !!str "${_dcphost}/api/update"
    dcprefund: !!str "${_dcphost}/api/refund"

environments:
  local:
  qat:
    variables:
      _dcphost: !!str "https://${env}.api.test.com"
  prod:
    variables:
      _dcphost: !!str "https://dcp.domain.com"
    apiHost: "https://domain.com/api"
```

This will generate 3 separate configuration files :

**local.config.json**

```json
{
  "middlewareapipath": "https://default.middleware.test.com/mw/api/path",
  "apihost": "http://txnext-gen.com/path/to/api",
  "dcpendpoints": {
    "dcpcart": "https://default.api.test.com/api/cart",
    "dcpupdate": "https://default.api.test.com/api/update",
    "dcprefund": "https://default.api.test.com/api/refund"
    }
}
```

**qat.config.json**

```json
{
  "middlewareapipath": "https://default.middleware.test.com/mw/api/path",
  "apihost": "http://txnext-gen.com/path/to/api",
  "dcpendpoints": {
    "dcpcart": "https://qat.api.test.com/api/cart",
    "dcpupdate": "https://qat.api.test.com/api/update",
    "dcprefund": "https://qat.api.test.com/api/refund"
    }
}
```

**prod.config.json**

```json
{
  "middlewareapipath": "https://default.middleware.test.com/mw/api/path",
  "apihost": "http://domain.com/api",
  "dcpendpoints": {
    "dcpcart": "https://dcp.domain.com/api/cart",
    "dcpupdate": "https://dcp.domain.com/api/update",
    "dcprefund": "https://dcp.domain.com/api/refund"
    }
}
```



#### Environment Template delimiters

`envIgnorePrefix` and `envIgnoreSuffix` define delimiters for _abstract_ environment definitions
that are intended to be inherited by a defined environment, this means that environments named with
these delimiters will not hydrate to a config file and will not be checked against the
`environments.yaml` file for existence.

This is a good way to collect common configuration overrides in a separate template that can be inherited across multiple environments that will add other specialized environment specific overrides.

The default delimiters are `_` and `_`, thus an _abstract_ environment template definition might be named `_basicQaSetting_`

**config.yaml**

```yaml
default:
  variables:
    _dcphost: !!str "https://default.api.test.com"
    _middlewareurl: !!str "https://default.middleware.test.com"

  apiHost: !!str "https://domain.com/api"
  middlewareapipath: !!str "${_middlewareurl}/mw/api/path"

  dcpendpoints: !!map
    dcpcart: !!str "${_dcphost}/api/cart"
    dcpupdate: !!str "${_dcphost}/api/update"
    dcprefund: !!str "${_dcphost}/api/refund"

environments:

  _basicQaSettings_: !!map
    apiHost: !!str "https://qat.domain.com/api"
    variables:
      _dcphost: !!str "https://qat.api.test.com"

  qa1: !!map
    inherits: !!str "_basicQaSettings_"

  qa2: !!map
    inherits: !!str "_basicQaSettings_"
    apiHost: !!str "https://qat2.kube.domain.com/api"

  uat: !!map
    inherits: !!str "_basicQaSettings_"
    variables:
      _middlewareurl: !!str "https://default.middleware.test.com"
      _dcphost: !!str "https://uat.api.test.com"
```

This will hydrate into 3 separate environment configuration files.

**qa1.config.json**

```json
{
  "apiHost":  "https://qat.domain.com/api",
  "middlewareapipath":  "https://default.middleware.test.com/mw/api/path",
  "dcpendpoints": {
    "dcpcart":  "https://qat.api.test.com/api/cart",
    "dcpupdate":  "https://qat.api.test.com/api/update",
    "dcprefund":  "https://qat.api.test.com/api/refund"
  }
}
```


**qa2.config.json**

```json
{
  "apiHost":  "https://qat2.kube.domain.com/api",
  "middlewareapipath":  "https://default.middleware.test.com/mw/api/path",
  "dcpendpoints": {
    "dcpcart":  "https://qat.api.test.com/api/cart",
    "dcpupdate":  "https://qat.api.test.com/api/update",
    "dcprefund":  "https://qat.api.test.com/api/refund"
  }
}
```


**uat.config.json**

```json
{
  "apiHost":  "https://qat.domain.com/api",
  "middlewareapipath":  "https://default.middleware.test.com/mw/api/path",
  "dcpendpoints": {
    "dcpcart":  "https://uat.api.test.com/api/cart",
    "dcpupdate":  "https://uat.api.test.com/api/update",
    "dcprefund":  "https://uat.api.test.com/api/refund"
  }
}
```



----


## YAML Config File Format

The yaml file should have the following structure:

```yaml
include:
  ...
templates:
  ...
default:
  variables:
    ...
  ...
environments:
  env1:
    variables:
      ...
    ...
  envX:
    ...
```

The `include` node can include local file or remote file in the git repo. The nodes from the
included files will be included as the template nodes (refer to the `templates` node below for more
details).

The `templates` node defines the template nodes, which can be extended by the other env or node.

The `default` node defines the default variables and properties for all environments. And its
`variables` child node defines all the variables that can be referenced in the properties.

The `environments` node defines all the environments, and they inherit the `default` environment by
default. In each environment, we can inherit the other environment, extend a template node, and
override or define new variables.

Here is an example of `app.config.yaml` file:

```yaml
include:  # the include files can be extended by env or any node in the current file.
  - local: '.default-config.yml'
  - project: 'project/veritas/tos/tos-config' # the gitlab project
    file: '/apps/shop/.templates.yaml'

templates:  # this is a dictionary of objects that can be extended from
   .local:
      variables:
         baseUrl: 'https://my.services.com'
   .services:
      products: ${baseUrl}/products
      accounts:  ${baseUrl}/accounts

default:  # This is the default template that all environments inherit from
   extends:
      - .shop.default. # this is the template that was loaded from the include file  '.default-config.yml'
   variables: # place the transitional variables under a common node.
      _sessionHost: "https://${env}.my-service.com"
   messages:
      - "some string"

environments:
   dev:
      variables:
         dev-local-var: "fortune"  # a new variable for dev environment
      messages:
         - "${dev-local-var} favors the bold"
         - "${dev-local-var} must be earned"
   qat:
      inherits: dev
      variables:
         _sessionHost: "https://qat1.services.com"  # override the variable in default environment

   local:
      extends:  # extend the .local and .services template nodes
         - .local
         - .services

```

## Installation

```bash
# Lint code
$ npm run lint

# Run unit tests with coverage, you should set PERSONAL_ACCESS_TOKEN to .env file, otherwise the include project test case will fail
$ npm run test
```

## Usage inside the lib

### compare-json

Script for comparing two json files and outputting their differences to stdout

`npm run compare-json <path/to/file.json> <path/to/file.json>`


```bash
# Example
$ npm run compare-json test/data/.percyrc test/data/modified.percyrc

# To generate HTML report
$ npm run compare-json test/data/.percyrc test/data/modified.percyrc -- --out ./test/data/out/diff.html

```

### hydrate

Script for processing YAML configuration files and converting it to environment specific JSON
configuration

`npm run hydrate -- < --root | --app | --file > <path/to/input> < --linter | --out
<path/to/output>>`

It provides three options

- `--root` `-r` for processing all apps in a root directory
- `--app` `-a` for processing a single app directory
- `--file` `-f` for processing a single file You should specify one of these three options.

- `--linter` `-l` validate the yaml file but don't generate json file
- `--out` `-o` generate json file in the directory You should specify one of these two options.

```bash
# Examples

# Process all apps
$ npm run hydrate -- -r test/data/apps --out test/data/out/dist

# Process single app
$ npm run hydrate -- -a test/data/apps/shop --out test/data/out/dist/shop

# Process single file
$ npm run hydrate -- -f test/data/apps/shop/app.config.yaml --out test/data/out/dist/shop

```

## Run with compiled JS (better performance)

You can compiled the ts files to js, by running:

```
$ npm run tsc
```

then run the js files using these script:

```bash
# hydrate Examples

# Process all apps
$ npm run hydrate.js -- -r test/data/apps --out test/data/out/dist

# Process single app
$ npm run hydrate.js -- -a test/data/apps/shop --out test/data/out/dist/shop

# Process single file
$ npm run hydrate.js -- -f test/data/apps/shop/app.config.yaml --out test/data/out/dist/shop

# compare-json Example
$ npm run compare-json.js test/data/.percyrc test/data/modified.percyrc

# To generate HTML report
$ npm run compare-json.js test/data/.percyrc test/data/modified.percyrc -- --out ./test/data/out/diff.html

```


module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  env: {
    node: true
  },
  plugins: [
    "@typescript-eslint"
  ],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  overrides: [
    {
      files: [
        "*.ts"
      ],
      parserOptions: {
        project: [
          "./tsconfig.json",
          "./tsconfig.spec.json"
        ],
        tsconfigRootDir: __dirname
      },
      rules: {
        "no-trailing-spaces": "error",
        "no-constant-condition": "off",
        "@typescript-eslint/quotes": [
          "error",
          "double",
          {
            allowTemplateLiterals: true
          }
        ]
      }
    }
  ]
}

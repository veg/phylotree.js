import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        _: "readonly",
        d3: "readonly",
        it: "readonly",
        describe: "readonly"
      }
    },
    rules: {
      "strict": ["warn", "never"],
      "no-unused-vars": ["warn", { "vars": "all", "args": "none" }],
      "no-self-assign": "warn",
      "no-constant-condition": "off",
      "no-unreachable": "warn",
      "no-debugger": "error",
      "no-console": "off",
      "no-undef": "warn",
      "no-useless-escape": "warn"
    }
  },
  {
    ignores: [
      "**/*.min.js",
      "dist/**",
      "node_modules/**",
      "rollup.config.mjs"
    ]
  }
];

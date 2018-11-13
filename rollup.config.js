import {terser} from "rollup-plugin-terser";
import node from "rollup-plugin-node-resolve";

import * as meta from "./package.json";

console.log(Object.assign({}, ...Object.keys(meta.dependencies || {}).filter(key => /^d3-/.test(key)).map(key => ({[key]: "d3"}))));

const config = {
  input: "src/index.js",
  external: Object.keys(meta.dependencies || {}),
  output: {
    file: `dist/${meta.name}.js`,
    name: "phylotree",
    format: "umd",
    indent: true,
    sourcemap: true,
    extend: true,
    globals: {d3:'d3', underscore:'_'}
  },
  plugins: [node()]
};

export default [
  config,
  {
    ...config,
    output: {
      ...config.output,
      file: `dist/${meta.name}.min.js`
    },
    plugins: [
      ...config.plugins,
      terser({
        output: {
          preamble: config.output.banner
        }
      })
    ]
  }
];

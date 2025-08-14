import {terser} from "rollup-plugin-terser";
import node from "rollup-plugin-node-resolve";
import copy from 'rollup-plugin-copy';

import * as meta from "./package.json";

const config = {
  input: "src/index.js",
  external: Object.keys(meta.dependencies || {}).filter(dep => dep !== 'd3'),
  output: {
    file: `dist/${meta.name}.js`,
    name: "phylotree",
    format: "umd",
    indent: true,
    sourcemap: true,
    extend: true,
    globals: {underscore:'_', lodash: '_$1', xml2js: 'xml2js'}
  },
  plugins: [
    node(), 
    copy({
      targets: [
        { src: 'phylotree.css', dest: 'dist/' },
        { src: 'index.html', dest: 'dist/' }
      ]
    })
  ]
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

import {terser} from "rollup-plugin-terser";
import {nodeResolve} from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import copy from 'rollup-plugin-copy';

import * as meta from "./package.json";

const config = {
  input: "src/index.js",
  external: Object.keys(meta.dependencies || {}).filter(dep => !['d3', 'fast-xml-parser'].includes(dep)),
  output: {
    file: `dist/${meta.name}.js`,
    name: "phylotree",
    format: "umd",
    indent: true,
    sourcemap: true,
    extend: true,
    globals: {underscore:'_', lodash: '_$1'}
  },
  plugins: [
    nodeResolve({
      browser: true,
      preferBuiltins: false,
      mainFields: ['browser', 'module', 'main']
    }), 
    commonjs({
      include: 'node_modules/**'
    }),
    copy({
      targets: [
        { src: 'phylotree.css', dest: 'dist/' },
        { src: 'src/render/styles/phylotree-menus.css', dest: 'dist/' },
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

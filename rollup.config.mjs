import terser from "@rollup/plugin-terser";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { copyFileSync, mkdirSync, readFileSync } from "fs";
import { basename } from "path";

const meta = JSON.parse(readFileSync("./package.json", "utf8"));

// Ship the stylesheets, demo page and type declarations next to the bundle.
function copyStatic(files, dest) {
  return {
    name: "copy-static",
    buildEnd() {
      mkdirSync(dest, { recursive: true });
      files.forEach(file => copyFileSync(file, `${dest}/${basename(file)}`));
    }
  };
}

const config = {
  input: "src/index.js",
  external: Object.keys(meta.dependencies || {}).filter(dep => !["d3", "fast-xml-parser"].includes(dep)),
  output: {
    file: `dist/${meta.name}.js`,
    name: "phylotree",
    format: "umd",
    indent: true,
    sourcemap: true,
    extend: true,
    globals: {underscore:'_'}
  },
  plugins: [
    nodeResolve({
      browser: true,
      preferBuiltins: false,
      mainFields: ['browser', 'module', 'main']
    }), 
    copyStatic([
      'phylotree.css',
      'src/render/styles/phylotree-menus.css',
      'index.html',
      'types/phylotree.d.ts'
    ], 'dist')
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

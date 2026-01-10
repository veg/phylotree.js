#!/usr/bin/env node

const fs = require("fs");
const phylotree = require("../dist/phylotree.js");
const { program } = require("commander");
const _ = require("underscore");

/*
 * Computes root-to-tip distance and fits linear regression
 * Please see the following notebook for more details
 * https://observablehq.com/@stevenweaver/computing-root-to-tip-distances-with-phylotree-js
 *
 * Usage:
 * root-to-tip -n test/data/MERS.txt
 *
 */

program.option(
    "-n --newick <newick>",
    "Input newick file"
  ).parse(process.argv);

const options = program.opts();

if (!options.newick){
  throw "ERROR: Newick file is required... exiting!";
}

// Assumes date formatted like 1984-09-20
let date_parser = function(tree, node) {
  var location = '';

  const default_regexp = /([0-9]{4})-?([0-9]{2})-?([0-9]{2})$/g;
  if (tree.isLeafNode(node)) {
    if ("name" in node.data) {
      location = default_regexp.exec(node.data.name);
      if (location) {
        return location[1] + location[2] + location[3];
      } else {
        const default_regexp = /([0-9]{4})-?([0-9]{2})$/g;
        location = default_regexp.exec(node.data.name);
        if (location) {
          return location[1] + location[2] + '1';
        }
      }
      
    }
  }
  return null;
}

fs.readFile(options.newick, (err, newick_data) => {
  const tree = new phylotree.phylotree(newick_data.toString());
  let computed_tree = phylotree.rootToTip(tree);
  let tree_with_dates = phylotree.extract_dates(computed_tree, _.partial(date_parser, computed_tree));

  // Filter just in case the date extractor did not always find a date from the header
  let fitted_slope = phylotree.fitRootToTip(tree_with_dates)
  fitted_slope.rootToTip = fitted_slope.root.rootToTip;
  console.log(fitted_slope);

});



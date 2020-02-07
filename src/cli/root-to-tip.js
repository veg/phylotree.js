#!/usr/bin/env node

const fs = require('fs');
const phylotree = require('../../build/phylotree.js');
const commander = require('commander');
const _ = require('underscore');

/*
 * Computes root-to-tip distance and fits linear regression
 * Please see the following notebook for more details
 * https://observablehq.com/@stevenweaver/computing-root-to-tip-distances-with-phylotree-js
 *
 * Usage:
 * root-to-tip -n test/data/MERS.txt
 *
 */

commander.option(
    '-n --newick <newick>',
    'Input newick file'
  ).parse(process.argv);


if (!commander.newick){
  throw 'ERROR: Newick file is required... exiting!';
}

// Assumes date formatted like 1984-09-20
let date_parser = function(tree, node) {
  var location = '';

  const default_regexp = /([0-9]{4})-?([0-9]{2})-?([0-9]{2})$/g;
  if (tree.is_leafnode(node)) {
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

fs.readFile(commander.newick, (err, newick_data) => {
  const tree = new phylotree.phylotree(newick_data.toString());
  let computed_tree = phylotree.root_to_tip(tree);
  let tree_with_dates = phylotree.extract_dates(computed_tree, _.partial(date_parser, computed_tree));

  // Filter just in case the date extractor did not always find a date from the header
  const mapped = _.map(tree_with_dates.get_tips(), d => {return _.pick(d.data, ["root_to_tip", "decimal_date_value", "date_value"])});
  let date_and_distances = _.filter(mapped, d => { return !_.isNull(d.decimal_date_value) })
  let fitted_slope = phylotree.fit_root_to_tip(tree_with_dates)
  fitted_slope.root_to_tip = fitted_slope.root.root_to_tip;
  console.log(fitted_slope);

});




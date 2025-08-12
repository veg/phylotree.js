#!/usr/bin/env node

const fs = require('fs');
const phylotree = require('../dist/phylotree.js');
const commander = require('commander');
const _ = require('underscore');

/*
 * phylotree reroot
 *
 * Usage:
 * phylotree reroot ./test/data/CD2-relax.new -n Horse 
 *
 */

commander
  .arguments("<newick>", "Input newick file")
  .requiredOption("-n --node <node>", "Node to reroot on")
.parse(process.argv);


if (!commander.args[0]){
  throw 'ERROR: Newick file is required... exiting!';
}

fs.readFile(commander.args[0], (err, newickData) => {
  const tree = new phylotree.phylotree(newickData.toString());
  const node = tree.getNodeByName(commander.node)
  if(_.isUndefined(node)) {
    throw new Error('Could not find node with name ' + commander.node)
  }
  tree.reroot(node);
  console.log(tree.getNewick());
});


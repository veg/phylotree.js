#!/usr/bin/env node

const fs = require('fs');
const phylotree = require('../dist/phylotree.js');
const commander = require('commander');
const _ = require('underscore');

/*
 * reroot
 *
 * Usage:
 * reroot -f test/data/CD2-relax.new -n Horse
 *
 */

commander
  .option('-f --newick <newick>', 'Input newick file')
  .option("-n --node <node>", "Node to reroot on")
.parse(process.argv);


if (!commander.newick){
  throw 'ERROR: Newick file is required... exiting!';
}

fs.readFile(commander.newick, (err, newickData) => {
  const tree = new phylotree.phylotree(newickData.toString());
  const node = tree.getNodeByName(commander.node)
  if(_.isUndefined(node)) {
    throw new Error('Could not find node with name ' + commander.node)
  }
  tree.reroot(node);
  console.log(tree.getNewick());
});


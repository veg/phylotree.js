#!/usr/bin/env node

const fs = require("fs"),
  phylotree = require("../dist/phylotree.js"),
  commander = require("commander"),
  _ = require("underscore");

commander
  .arguments("<newick>", "Input newick file")
  .requiredOption("-s --source <node>", "Source Node")
  .requiredOption("-t --target <node>", "Target Node")
  .usage("./test/data/CD2-relax.new  -s Cow -t Cat")
  .on("--help", function() {
    console.log("\nComputes the distance from the source tip to target tip. Does *not* include the length of the source tip.");
  })
  .parse(process.argv);

fs.readFile(commander.args[0], (err, newick_data) => {

  const tree = new phylotree.phylotree(newick_data.toString());
  phylotree.pairwise_distances(tree);

  // GET SOURCE NODE
  const sourceNode = tree.getNodeByName(commander.source)

  if(_.isUndefined(sourceNode)) {
    throw new Error('Could not find source node with name ' + commander.source)
  }

  // GET LEAF INDEX OF TARGET
  const targetNode = tree.getNodeByName(commander.target);
  const targetIndex = targetNode['cot_leaf_index'];

  const distance = sourceNode['cot_path_to_leaves_above'][targetIndex];
  console.log(distance);

});

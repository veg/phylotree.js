#!/usr/bin/env node

const fs = require("fs"),
  phylotree = require("../dist/phylotree.js"),
  { program } = require("commander"),
  _ = require("underscore");

program
  .arguments("<newick>", "Input newick file")
  .requiredOption("-s --source <node>", "Source Node")
  .requiredOption("-t --target <node>", "Target Node")
  .option("-i --include-source-length", "Include source node's length as part of distance")
  .usage("./test/data/CD2-relax.new  -s Cow -t Cat")
  .on("--help", function() {
    console.log("\nComputes the distance from the source tip to target tip. Does *not* include the length of the source tip by default.");
  })
  .parse(process.argv);

const options = program.opts();

fs.readFile(program.args[0], (err, newick_data) => {

  const tree = new phylotree.phylotree(newick_data.toString());
  phylotree.pairwise_distances(tree);

  // GET SOURCE NODE
  const sourceNode = tree.getNodeByName(options.source);

  if(_.isUndefined(sourceNode)) {
    throw new Error("Could not find source node with name " + options.source);
  }

  // GET LEAF INDEX OF TARGET
  const targetNode = tree.getNodeByName(options.target);

  if(_.isUndefined(targetNode)) {
    throw new Error("Could not find target node with name " + options.target);
  }


  const targetIndex = targetNode["cot_leaf_index"];

  let distance = sourceNode["cot_path_to_leaves_above"][targetIndex];

  // if include source tip length, add it
  if(options.includeSourceLength) {
    distance+=parseFloat(sourceNode.data.attribute);
  }

  console.log(distance);

});

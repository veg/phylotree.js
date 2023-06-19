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
  .on("--help", function () {
    console.log(
      "\nComputes the distance from the source tip to target tip. Does *not* include the length of the source tip by default."
    );
  })
  .parse(process.argv);

fs.readFile(commander.args[0], (err, newick_data) => {
  const tree = new phylotree.phylotree(newick_data.toString());

  const targetNode = tree.getNodeByName(commander.target);

  // GET SOURCE NODE
  const sourceNode = tree.getNodeByName(commander.source);

  if (_.isUndefined(sourceNode)) {
    throw new Error("Could not find source node with name " + commander.source);
  }

  if (_.isUndefined(targetNode)) {
    throw new Error("Could not find target node with name " + commander.target);
  }

  let mrca = tree.mrca([sourceNode, targetNode]);

  // Set all nodeLabel for all descendants of the MRCA
  let descendants = tree.selectAllDescendants(mrca, true, true);
  descendants.push(mrca);

  let annotator = function (node) {
    if (descendants.includes(node)) {
      return "{hi}";
    } else {
      return "";
    }
  };

  console.log(tree.getNewick(annotator));
});

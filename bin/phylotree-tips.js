#!/usr/bin/env node

const fs = require("fs");
const phylotree = require("../dist/phylotree.js");
const commander = require("commander");
const _ = require("underscore");

commander
  .arguments("<newick>", "Input newick file")
  .requiredOption(
    "-p --patterns <patterns>",
    "Comma-separated regex patterns for tagging"
  )
  .requiredOption(
    "-t --tags <tags>",
    "Comma-separated tags that correspond to each pattern"
  )
  .usage("./test/data/CD2-relax.new -p 'regex1,regex2' -t 'tag1,tag2'")
  .description("Tag branches in a Newick tree based on regex patterns.")
  .on("--help", function () {
    console.log(
      "\nThis command tags the branches in a Newick tree based on regex patterns and outputs the new tree."
    );
  })
  .parse(process.argv);

if (commander.patterns.split(",").length !== commander.tags.split(",").length) {
  throw new Error(
    "The number of patterns must match the number of corresponding tags."
  );
}

const patterns = commander.patterns.split(",");
const tags = commander.tags.split(",");

fs.readFile(commander.args[0], (err, newick_data) => {
  if (err) {
    throw new Error("Error reading the Newick file: " + err.message);
  }

  const tree = new phylotree.phylotree(newick_data.toString());

  // Function to apply tags based on patterns
  function applyTags(node) {
    for (let i = 0; i < patterns.length; i++) {
      // Use the regex pattern to check against the node's name
      if (new RegExp(patterns[i]).test(node.data.name)) {
        node.data.annotation =
          (node.data.annotation || "") + "{" + tags[i] + "}";
      }
    }
  }

  // Set default branch lengths if not already set
  if (!tree.hasBranchLengths()) {
    tree.setBranchLength(() => 1); // Set default branch length to 1
  }

  // Traverse the tree and tag nodes
  tree.traverse_and_compute(applyTags);

  // Output the new Newick string
  console.log(tree.getNewick());
});

#!/usr/bin/env node

const fs = require("fs");
const phylotree = require("../dist/phylotree.js");
const { program } = require("commander");
const _ = require("underscore");

// Parse command line arguments
program
  .arguments("<newick>", "Input newick file")
  .requiredOption(
    "-p --patterns <patterns>",
    "Comma-separated regex patterns for tagging",
  )
  .requiredOption(
    "-t --tags <tags>",
    "Comma-separated tags that correspond to each pattern",
  )
  .option("-r --reroot <node>", "Node to reroot on (optional)")
  .option("-i --invert", "Invert the selection", false)
  .option("-l --leaf-only", "Only label leaf nodes", false)
  .option(
    "-s --strategy <strategy>",
    "Strategy for labeling internal nodes: none, all, some, parsimony",
    "all",
  )
  .usage("./test/data/tree.nwk -p 'regex1,regex2' -t 'tag1,tag2'")
  .description(
    "Tag branches in a Newick tree based on regex patterns and labeling strategy",
  )
  .parse(process.argv);

const options = program.opts();

// Input validation
if (options.patterns.split(",").length !== options.tags.split(",").length) {
  throw new Error(
    "The number of patterns must match the number of corresponding tags.",
  );
}

// Parse patterns and tags
const patterns = options.patterns.split(",");
const tags = options.tags.split(",");

// Function to get annotations for Newick output
function annotator(node) {
  return node.data.annotation ? `{${node.data.annotation}}` : "";
}

// Main tagging function
fs.readFile(program.args[0], (err, newick_data) => {
  if (err) throw new Error("Error reading Newick file: " + err.message);

  // Parse tree
  const tree = new phylotree.phylotree(newick_data.toString());

  // Reroot if specified
  if (options.reroot) {
    const reroot_node = tree.getNodeByName(options.reroot);
    if (reroot_node) {
      tree.reroot(reroot_node);
    }
  }

  // Initial leaf node tagging
  function tagLeafNodes(node) {
    if (tree.isLeafNode(node)) {
      for (let i = 0; i < patterns.length; i++) {
        const matches = new RegExp(patterns[i]).test(node.data.name);
        if (options.invert ? !matches : matches) {
          node.data.annotation = tags[i];
          break;
        }
      }
    }
  }

  function applyStrategy() {
    switch (options.strategy) {
      case "none":
        // Only leaf nodes are tagged
        break;

      case "all":
        // Tag internal node if all descendants have the same non-empty tag
        tree.traverse_and_compute((node) => {
          if (!tree.isLeafNode(node)) {
            const descendantTags = _.uniq(
              node.descendants().map((d) => d.data.annotation), // Get all annotations, including empty ones
            ).filter((tag) => tag !== ""); // Filter out empty annotations

            if (descendantTags.length === 1) {
              node.data.annotation = descendantTags[0];
            }
          }
        });
        break;

      case "some":
        // Tag internal node if any descendants have a non-empty tag
        tree.traverse_and_compute((node) => {
          if (!tree.isLeafNode(node)) {
            const descendantTags = node
              .descendants()
              .map((d) => d.data.annotation) // Get all annotations
              .filter((tag) => tag !== ""); // Filter out empty annotations

            if (descendantTags.length > 0) {
              node.data.annotation = descendantTags[0];
            }
          }
        });
        break;

      case "parsimony":
        // Use maxParsimony to tag internal nodes
        tree.maxParsimony("annotation");
        break;
    }
  }

  // Apply tagging
  if (!options.leafOnly) {
    tree.traverse_and_compute(tagLeafNodes);
    applyStrategy();
  } else {
    tree.traverse_and_compute(tagLeafNodes);
  }

  // Output tagged tree
  console.log(tree.getNewick(annotator));
});

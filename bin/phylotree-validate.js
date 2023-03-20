#!/usr/bin/env node

const fs = require("fs"),
  phylotree = require("../dist/phylotree.js"),
  commander = require("commander"),
  _ = require("underscore");


commander
  .arguments("<newick>", "Input newick file")
  .on("--help", function() {
    console.log("");
    console.log("Examples:");
    console.log(
      'phylotree validate test/data/MERS.txt'
    );
  })
  .parse(process.argv);

fs.readFile(commander.args[0], (err, newickData) => {

  const tree = new phylotree.newickParser(newickData.toString());

  if(!tree.error) {
    console.log("Valid Newick string ");
  } else {
    console.warn("Newick string is not valid!")
    console.log(tree.error);

  }


});

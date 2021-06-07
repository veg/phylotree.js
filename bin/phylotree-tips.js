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
      'phylotree tips test/data/MERS.txt'
    );
  })
  .parse(process.argv);

fs.readFile(commander.args[0], (err, newickData) => {

  const tree = new phylotree.phylotree(newickData.toString());
  console.log('name', 'length', 'annotation')
  _.each(tree.getTips(), d => {
    console.log(d.data.name, d.data.attribute, d.data.annotation)
  })

});

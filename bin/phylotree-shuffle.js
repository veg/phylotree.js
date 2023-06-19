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
      'phylotree shuffle test/data/MERS.txt'
    );
  })
  .parse(process.argv);

fs.readFile(commander.args[0], (err, newickData) => {

  const tree = new phylotree.phylotree(newickData.toString());
  let tips = tree.getTips();

  // Get all the names and randomly assign them
  let names = _.map(tips, d => d.data.name);

  // Shuffle names
  let shuffledNames = _.shuffle(names);

  _.each(tips, (d,i) => d.data.name = shuffledNames[i])

  console.log(tree.getNewick());

});

#!/usr/bin/env node

const fs = require("fs"),
  phylotree = require("../dist/phylotree.js"),
  commander = require("commander"),
  _ = require("lodash");

commander
  .arguments("<fasta>", "Input fasta file")
  .usage("./test/data/CD2.fas")
  .on("--help", function() {
    console.log("\nConstructs neighbor-joining algorithm");
  })
  .parse(process.argv);


fs.readFile(commander.args[0], ( err, fastaData ) => {

	let fasta = phylotree.parseFasta(fastaData);
	let nodeList = _.keys(fasta);
	let distanceMatrix = phylotree.getDistanceMatrix(fasta);
	let distanceMatrixArr = _.values(distanceMatrix);

	let nj = phylotree.neighborJoining(distanceMatrixArr, _.keys(fasta).length, nodeList)
	console.log(nj.getNewick());

});


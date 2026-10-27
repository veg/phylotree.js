#!/usr/bin/env node

const fs = require("fs"),
  phylotree = require("../dist/phylotree.js"),
  { program } = require("commander");

program
  .arguments("<fasta>", "Input fasta file")
  .usage("./test/data/CD2.fas")
  .on("--help", function() {
    console.log("\nConstructs neighbor-joining algorithm");
  })
  .parse(process.argv);


fs.readFile(program.args[0], ( err, fastaData ) => {

  let fasta = phylotree.parseFasta(fastaData);
  let nodeList = Object.keys(fasta);
  let distanceMatrix = phylotree.getDistanceMatrix(fasta);
  let distanceMatrixArr = Object.values(distanceMatrix);

  let nj = phylotree.neighborJoining(distanceMatrixArr, Object.keys(fasta).length, nodeList);
  console.log(nj.getNewick());

});

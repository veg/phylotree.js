#!/usr/bin/env node

// This script outputs two files, an updated newick file and an edge list
// corresponding to infectors and infectees

const fs = require('fs');
const phylotree = require('../../build/phylotree.js');
const commander = require('commander');
const pd = require("pretty-data").pd;
const csvParse = require("d3").csvParse;
const _ = require('underscore');
const d3 = require("d3");

commander.option(
    '-n --nexus <nexus>',
    'Master NEXUS file'
  ).option(
    '-o --output <newick>',
    'Output Newick file with updated labels'
  ).option(
    '-e --edge-list <edge_list_fn>',
    'Edge list report destination'
  ).parse(process.argv);

if (!commander.nexus && !commander.output){
  throw 'Oops, no proper filenames supplied';
}

fs.readFile(commander.nexus, (err, nwk) => {

  let phylo = new phylotree.phylotree(String(nwk), { type: "master" });

  phylotree.annotateBeastNames(phylo.nodes);
  phylotree.annotateInfection(phylo.nodes);

  let edge_list = phylotree.getMasterEdgeList(phylo);
  edge_list = d3.csvFormat(edge_list, ["source", "target"]);

  // Forgive me father, for I have sinned
  fs.writeFileSync(commander.output, phylo.get_newick());
  fs.writeFileSync(commander.edgeList, edge_list);

});

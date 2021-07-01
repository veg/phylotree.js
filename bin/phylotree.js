#!/usr/bin/env node

const fs = require('fs');
const phylotree = require('../dist/phylotree.js');
const { program } = require('commander');

program
  .version('1.0.7')
  .command('tips', 'get tips from newick tree')
  .command('reroot', 'reroot newick tree based on node')
  .command('distance', 'find distance between two nodes')

program.parse(process.argv);

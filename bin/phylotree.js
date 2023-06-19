#!/usr/bin/env node

const fs = require('fs');
const phylotree = require('../dist/phylotree.js');
const { program } = require('commander');

program
  .version('1.2.3')
  .command('tips', 'get tips from newick tree')
  .command('validate', 'validate newick string')
  .command('reroot', 'reroot newick tree based on node')
  .command('distance', 'find distance between two nodes')
  .command('mrca', 'tag all descendants of mrca')

program.parse(process.argv);

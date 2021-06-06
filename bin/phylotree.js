#!/usr/bin/env node

const fs = require('fs');
const phylotree = require('../dist/phylotree.js');
const { program } = require('commander');

program
  .version('1.0.7')
  .command('tips', 'get tips from newick tree')

program.parse(process.argv);

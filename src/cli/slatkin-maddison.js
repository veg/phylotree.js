#!/usr/bin/env node

const fs = require('fs');
const phylotree = require('../../build/phylotree.js');
const commander = require('commander');
const pd = require("pretty-data").pd;

commander.option(
    '-n --newick <newick>',
    'Input newick file'
  ).option(
    '-i --iterations [iterations]',
    'Number of bootstrap iterations (default is 10000)',
    10000
  ).option(
    '-s --seed [seed]',
    'Seed for random number generator',
    1
  ).option(
    '-r --regex <regex> [otherRegexes...]',
    'Name,Regex pairs to match (comma delimited), i.e. Blood,BL[0-9]+'
  ).parse(process.argv);

const regexes = [commander.regex].concat(commander.args);

fs.readFile(commander.newick, (err, data) => {
  const tree = new phylotree.phylotree(data.toString()),
    result = phylotree.slatkin_maddison(tree, regexes, commander.iterations, commander.seed);
  process.stdout.write(pd.json(result));
});

#!/usr/bin/env node

const fs = require('fs');
const phylotree = require('../dist/phylotree.js');
const commander = require('commander');
const pd = require("pretty-data").pd;
const csvParse = require("d3").csvParse;
const _ = require('underscore');

const phylo_path = require.resolve('phylotree');
const path = require('path');

const http = require('http')
const port = 3000

commander.option(
    '-n --newick <newick>',
    'Input newick file'
  ).parse(process.argv);

if (!commander.newick){
  throw 'ERROR: Newick file is required... exiting!';
}

fs.readFile(commander.newick, (err, newick_data) => {
  const tree = new phylotree.phylotree(newick_data.toString());

  let url = 'http://localhost:3000';
  const index = fs.readFileSync(path.dirname(phylo_path) + '/' + 'index.html').toString();

  const requestHandler = (request, response) => {
    response.end(index)
  }

  const server = http.createServer(requestHandler)

  server.listen(port, (err) => {
    if (err) {
      return console.log('something bad happened', err)
    }

    var start = (process.platform == 'darwin'? 'open': process.platform == 'win32'? 'start': 'xdg-open');
    require('child_process').exec(start + ' ' + url);

  });

});

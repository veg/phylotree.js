#!/usr/bin/env node

const fs = require('fs');
const phylotree = require('../../build/phylotree.js');
const commander = require('commander');
const pd = require("pretty-data").pd;
const csvParse = require("d3").csvParse;
const _ = require('underscore');

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
    '-c --csv [csv]',
    'Path to CSV file containing leaf name/compartment associations'
  ).option(
    '-r --regex [regex] [otherRegexes...]',
    'Name,Regex pairs to match (comma delimited), i.e. Blood,BL[0-9]+'
  ).parse(process.argv);

if (!commander.csv && !commander.regex){
  throw 'ERROR: Either regex or CSV input is required... exiting!';
}

fs.readFile(commander.newick, (err, newick_data) => {
  const tree = new phylotree.phylotree(newick_data.toString());
  var compartments;

  function invoke_slatkin_maddison() {
    compartments.sort((a,b) => a.name < b.name ? -1 : 1);
    const result = phylotree.slatkin_maddison(
      tree, compartments, commander.iterations, commander.seed
    );
    process.stdout.write(pd.json(result));
  }

  var node_name_number = 1;
  function name_unamed_nodes(node) {
    if(!node.data.name) {
      node.data.name = "Node"+node_name_number;
      node_name_number++;
    }
  }

  if(commander.regex) {
    compartments = [commander.regex].concat(commander.args)
     .map(regex_str => {
        const split = regex_str.split(',');
        return {
          name: split[0],
          regex: new RegExp(split[1]),
          count: 0
        };
      });

    tree.traverse_and_compute(function(node) {
      compartments.forEach(c => {
        if(node.data.name.match(c.regex)) {
          node.data.trait = c.name;
          c.count++;
        }
      });
      name_unamed_nodes(node);
    });
    invoke_slatkin_maddison();
  } else {
    var node;
    tree.traverse_and_compute(name_unamed_nodes);
    fs.readFile(commander.csv, (err, csv_data) => {
      const compartment_data = csvParse(csv_data.toString());
      compartment_data.forEach(row => {
        node = tree.get_node_by_name(row.branch_name);
        node.data.trait = row.compartment;
      });
      compartments = _.toArray(_.groupBy(compartment_data, r=>r.compartment))
        .map(r=>{return {name: r[0].compartment, count:r.length}});
      invoke_slatkin_maddison();
    });
  }
});
